import { FailureCategory } from "@prisma/client";

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
    patterns: ["status code", "api", "request failed", "response status"],
  },
  {
    category: "DATABASE",
    patterns: ["prisma", "database", "unique constraint", "sql", "postgres", "query failed"],
  },
  {
    category: "UI",
    patterns: ["locator", "playwright", "element", "click", "visible", "selector", "page closed"],
  },
];

export function categorizeFailure(message: string, stackTrace?: string): FailureCategory {
  const combined = `${message} ${stackTrace || ""}`.toLowerCase();

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
