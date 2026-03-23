type FailureCategory = "UI" | "API" | "TIMEOUT" | "ASSERTION" | "NETWORK" | "DATABASE" | "UNKNOWN";
type ResultStatus = "PASSED" | "FAILED" | "SKIPPED" | "ERROR" | "BLOCKED";

export function categorizeFailure(
  message: string | null | undefined,
  stackTrace: string | null | undefined
): FailureCategory {
  const text = `${message ?? ""} ${stackTrace ?? ""}`.toLowerCase();

  if (!text.trim()) return "UNKNOWN";
  if (text.includes("timeout") || text.includes("timed out")) return "TIMEOUT";
  if (text.includes("assert") || text.includes("expect(")) return "ASSERTION";
  if (text.includes("fetch") || text.includes("api") || text.includes("http")) return "API";
  if (text.includes("network") || text.includes("econn") || text.includes("dns")) return "NETWORK";
  if (text.includes("sql") || text.includes("database") || text.includes("db")) return "DATABASE";
  if (text.includes("element") || text.includes("selector") || text.includes("dom") || text.includes("ui")) {
    return "UI";
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
