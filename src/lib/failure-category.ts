import { FailureCategory, ResultStatus } from "@prisma/client";

/**
 * Categorizes a failure based on the error message and stack trace.
 * Uses heuristics to identify the most likely category.
 */
interface CategoryPattern {
  category: FailureCategory;
  patterns: (string | RegExp)[];
}

const CATEGORY_PATTERNS: CategoryPattern[] = [
  {
    category: "ASSERTION",
    patterns: ["expected", "to equal", "to be", "assertion", /expect\(.*\)\.to/],
  },
  {
    category: "TIMEOUT",
    patterns: ["timed out", "timeout"],
  },
  {
    category: "NETWORK",
    patterns: ["econnrefused", "network", "fetch failed", "connection refused", "dns"],
  },
  {
    category: "API",
    patterns: ["status code", "api", "request failed", "response status", "http"],
  },
  {
    category: "DATABASE",
    patterns: ["prisma", "database", "unique constraint", "sql", "postgres", "query failed", "db"],
  },
  {
    category: "UI",
    patterns: ["locator", "playwright", "element", "click", "visible", "selector", "page closed", "dom", "ui"],
  },
];

export function categorizeFailure(
  message: string | null | undefined,
  stackTrace: string | null | undefined
): FailureCategory {
  const combined = `${message ?? ""} ${stackTrace ?? ""}`.toLowerCase();

  if (!combined.trim()) return "UNKNOWN";

  for (const { category, patterns } of CATEGORY_PATTERNS) {
    for (const pattern of patterns) {
      if (typeof pattern === "string") {
        if (combined.includes(pattern.toLowerCase())) {
          return category;
        }
      } else if (pattern.test(combined)) {
        return category;
      }
    }
  }

  return "UNKNOWN";
}

export function categoryForStatus(
  status: ResultStatus,
  message?: string | null,
  stackTrace?: string | null
): FailureCategory | null {
  if (status === "PASSED" || status === "SKIPPED") {
    return null;
  }

  return categorizeFailure(message, stackTrace);
}
