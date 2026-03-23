import { describe, it, expect } from "vitest";
import { calculateFlakiness, TestHistoryItem } from "./flaky-detection";
import { ResultStatus } from "@prisma/client";

describe("calculateFlakiness", () => {
  it("returns 0 flakiness for all passed tests", () => {
    const history: TestHistoryItem[] = [
      { status: "PASSED" as ResultStatus },
      { status: "PASSED" as ResultStatus },
      { status: "PASSED" as ResultStatus },
    ];
    const result = calculateFlakiness(history);
    expect(result.isFlaky).toBe(false);
    expect(result.score).toBe(0);
    expect(result.failureRate).toBe(0);
  });

  it("returns 0 flakiness for all failed tests", () => {
    const history: TestHistoryItem[] = [
      { status: "FAILED" as ResultStatus },
      { status: "FAILED" as ResultStatus },
      { status: "FAILED" as ResultStatus },
    ];
    const result = calculateFlakiness(history);
    expect(result.isFlaky).toBe(false);
    expect(result.score).toBe(0);
    expect(result.failureRate).toBe(1);
  });

  it("returns high flakiness for alternating pass/fail", () => {
    const history: TestHistoryItem[] = [
      { status: "PASSED" as ResultStatus },
      { status: "FAILED" as ResultStatus },
      { status: "PASSED" as ResultStatus },
      { status: "FAILED" as ResultStatus },
    ];
    const result = calculateFlakiness(history);
    expect(result.isFlaky).toBe(true);
    expect(result.score).toBeGreaterThan(0.5);
    expect(result.failureRate).toBe(0.5);
  });

  it("returns flakiness for mixed pass/error", () => {
    const history: TestHistoryItem[] = [
      { status: "PASSED" as ResultStatus },
      { status: "ERROR" as ResultStatus },
      { status: "PASSED" as ResultStatus },
    ];
    const result = calculateFlakiness(history);
    expect(result.isFlaky).toBe(true);
    expect(result.score).toBeGreaterThan(0);
  });

  it("handles empty history", () => {
    const history: TestHistoryItem[] = [];
    const result = calculateFlakiness(history);
    expect(result.isFlaky).toBe(false);
    expect(result.score).toBe(0);
    expect(result.failureRate).toBe(0);
  });

  it("handles single item history", () => {
    const history: TestHistoryItem[] = [{ status: "PASSED" as ResultStatus }];
    const result = calculateFlakiness(history);
    expect(result.isFlaky).toBe(false);
    expect(result.score).toBe(0);
  });

  it("ignores SKIPPED and BLOCKED statuses for flakiness calculation", () => {
    const history: TestHistoryItem[] = [
      { status: "PASSED" as ResultStatus },
      { status: "SKIPPED" as ResultStatus },
      { status: "PASSED" as ResultStatus },
    ];
    const result = calculateFlakiness(history);
    expect(result.isFlaky).toBe(false);
    expect(result.score).toBe(0);
  });
});
