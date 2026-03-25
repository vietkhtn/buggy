import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";

// Mock the db module and lru-cache before importing api-auth
vi.mock("@/lib/db", () => ({
  db: {
    apiKey: {
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { resolveApiKey, resolveBasicAuth } from "./api-auth";
import { db } from "./db";

const mockDb = db as unknown as {
  apiKey: { findMany: ReturnType<typeof vi.fn> };
  user: { findUnique: ReturnType<typeof vi.fn> };
};

describe("resolveApiKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null for empty string", async () => {
    const result = await resolveApiKey("");
    expect(result).toBeNull();
    expect(mockDb.apiKey.findMany).not.toHaveBeenCalled();
  });

  it("returns null when no candidates found by prefix", async () => {
    mockDb.apiKey.findMany.mockResolvedValue([]);
    const result = await resolveApiKey("abcd1234xyz");
    expect(result).toBeNull();
  });

  it("returns null when prefix matches but bcrypt fails", async () => {
    const keyHash = await bcrypt.hash("abcd1234correctkey", 4);
    mockDb.apiKey.findMany.mockResolvedValue([
      { id: "key1", keyPrefix: "abcd1234", keyHash, project: { id: "proj1" } },
    ]);
    const result = await resolveApiKey("abcd1234wrongkeyxyz");
    expect(result).toBeNull();
  });

  it("returns the matching key when bcrypt succeeds", async () => {
    const rawKey = "abcd1234" + "a".repeat(56);
    const keyHash = await bcrypt.hash(rawKey, 4);
    const candidate = { id: "key1", keyPrefix: "abcd1234", keyHash, project: { id: "proj1" } };
    mockDb.apiKey.findMany.mockResolvedValue([candidate]);

    const result = await resolveApiKey(rawKey);
    expect(result).toEqual(candidate);
  });

  it("returns cached result on second call (single DB call)", async () => {
    const rawKey = "cachetest" + "b".repeat(55);
    const keyHash = await bcrypt.hash(rawKey, 4);
    const candidate = { id: "key2", keyPrefix: "cachet", keyHash, project: { id: "proj2" } };
    mockDb.apiKey.findMany.mockResolvedValue([candidate]);

    await resolveApiKey(rawKey);
    await resolveApiKey(rawKey);

    // DB should only be called once due to LRU cache
    expect(mockDb.apiKey.findMany).toHaveBeenCalledTimes(1);
  });
});

describe("resolveBasicAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null for null header", async () => {
    const result = await resolveBasicAuth(null);
    expect(result).toBeNull();
  });

  it("returns null for missing 'Basic ' prefix", async () => {
    const result = await resolveBasicAuth("Bearer abc");
    expect(result).toBeNull();
  });

  it("returns null for invalid base64 (no colon)", async () => {
    const encoded = Buffer.from("nocolon").toString("base64");
    const result = await resolveBasicAuth(`Basic ${encoded}`);
    expect(result).toBeNull();
  });

  it("returns null when user not found", async () => {
    mockDb.user.findUnique.mockResolvedValue(null);
    const encoded = Buffer.from("unknown@example.com:password").toString("base64");
    const result = await resolveBasicAuth(`Basic ${encoded}`);
    expect(result).toBeNull();
  });

  it("returns null when password does not match", async () => {
    const passwordHash = await bcrypt.hash("correctpass", 4);
    mockDb.user.findUnique.mockResolvedValue({ id: "u1", email: "a@b.com", password: passwordHash });
    const encoded = Buffer.from("a@b.com:wrongpass").toString("base64");
    const result = await resolveBasicAuth(`Basic ${encoded}`);
    expect(result).toBeNull();
  });

  it("returns user when credentials are valid", async () => {
    const passwordHash = await bcrypt.hash("correctpass", 4);
    const user = { id: "u1", email: "a@b.com", password: passwordHash };
    mockDb.user.findUnique.mockResolvedValue(user);
    const encoded = Buffer.from("a@b.com:correctpass").toString("base64");
    const result = await resolveBasicAuth(`Basic ${encoded}`);
    expect(result).toEqual(user);
  });
});
