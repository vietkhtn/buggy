import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { LRUCache } from "lru-cache";
import type { ApiKey, ApiKeyScope, Project, User } from "@prisma/client";
import { db } from "./db";

export type ApiKeyWithProject = ApiKey & { project: Project };

// In-process LRU cache for resolved API keys (per-process, not shared across replicas).
// TTL 60s avoids repeated bcrypt on hot paths. Revoked keys remain valid up to 60s.
const keyCache = new LRUCache<string, ApiKeyWithProject>({
  max: 500,
  ttl: 60_000,
});

export async function resolveApiKey(rawKey: string): Promise<ApiKeyWithProject | null> {
  if (!rawKey) return null;

  const cached = keyCache.get(rawKey);
  if (cached) return cached;

  const keyPrefix = rawKey.slice(0, 8);
  if (!keyPrefix) return null;

  const candidates = await db.apiKey.findMany({
    where: { keyPrefix },
    include: { project: true },
  });

  for (const candidate of candidates) {
    const valid = await bcrypt.compare(rawKey, candidate.keyHash);
    if (valid) {
      keyCache.set(rawKey, candidate);
      return candidate;
    }
  }

  return null;
}

export async function resolveBasicAuth(authHeader: string | null): Promise<User | null> {
  if (!authHeader?.startsWith("Basic ")) return null;

  let decoded: string;
  try {
    decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf8");
  } catch {
    return null;
  }

  const colonIdx = decoded.indexOf(":");
  if (colonIdx === -1) return null;

  const email = decoded.slice(0, colonIdx).trim().toLowerCase();
  const password = decoded.slice(colonIdx + 1);

  if (!email || !password) return null;

  const user = await db.user.findUnique({ where: { email } });
  if (!user?.password) return null;

  const valid = await bcrypt.compare(password, user.password);
  return valid ? user : null;
}

export function generateApiKey(): { rawKey: string; keyPrefix: string } {
  const rawKey = randomBytes(32).toString("hex");
  return { rawKey, keyPrefix: rawKey.slice(0, 8) };
}

export async function hashApiKey(rawKey: string): Promise<string> {
  return bcrypt.hash(rawKey, 10);
}

export function scopeCheck(scope: ApiKeyScope) {
  return scope === "READ_ONLY";
}
