import type { Prisma } from "@prisma/client";

const DEFAULT_PREFIX = "TC";

function normalizePrefix(prefix: string | null | undefined) {
  const cleaned = (prefix ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
  return cleaned || DEFAULT_PREFIX;
}

export function deriveTestCasePrefix(name: string | null | undefined) {
  if (!name) return DEFAULT_PREFIX;
  const initials = name
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("");
  return normalizePrefix(initials || DEFAULT_PREFIX);
}

export function formatTestCaseDisplayId(prefix: string | null | undefined, sequence: number) {
  const safePrefix = normalizePrefix(prefix);
  const seq = Math.max(1, sequence);
  return `${safePrefix}-${String(seq).padStart(4, "0")}`;
}

export async function reserveTestCaseDisplayIds(
  tx: Prisma.TransactionClient,
  projectId: string,
  count: number
) {
  if (count < 1) {
    throw new Error("count must be at least 1");
  }

  const project = await tx.project.update({
    where: { id: projectId },
    data: { testCaseCounter: { increment: count } },
    select: { testCaseCounter: true, testCasePrefix: true },
  });

  const lastSequence = project.testCaseCounter;
  const start = lastSequence - count + 1;
  const prefix = project.testCasePrefix;

  return Array.from({ length: count }, (_, idx) =>
    formatTestCaseDisplayId(prefix, start + idx)
  );
}

export function sanitizeTestCasePrefix(value: string) {
  return normalizePrefix(value);
}
