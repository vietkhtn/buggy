import { ResultStatus } from "@prisma/client";

export interface TestHistoryItem {
  status: ResultStatus;
}

export interface FlakinessResult {
  isFlaky: boolean;
  score: number; // 0 to 1, where 1 is most flaky
  failureRate: number; // 0 to 1
}

const SUCCESS_STATUSES: ResultStatus[] = ["PASSED"];
const FAILURE_STATUSES: ResultStatus[] = ["FAILED", "ERROR"];

function isSuccess(status: ResultStatus): boolean {
  return SUCCESS_STATUSES.includes(status);
}

function isFailure(status: ResultStatus): boolean {
  return FAILURE_STATUSES.includes(status);
}

/**
 * Calculates flakiness based on the last N runs.
 * A test is considered flaky if it has both PASSED and (FAILED or ERROR) statuses in its recent history.
 * Score is calculated as the ratio of status changes to total possible changes.
 */
export function calculateFlakiness(history: TestHistoryItem[]): FlakinessResult {
  const relevantHistory = history.filter((item) => isSuccess(item.status) || isFailure(item.status));

  if (relevantHistory.length === 0) {
    return { isFlaky: false, score: 0, failureRate: 0 };
  }

  const hasPassed = relevantHistory.some((item) => isSuccess(item.status));
  const hasFailed = relevantHistory.some((item) => isFailure(item.status));

  const failureCount = relevantHistory.filter((item) => isFailure(item.status)).length;
  const failureRate = failureCount / relevantHistory.length;

  // Calculate instability (how often it flips between success and failure)
  let changes = 0;
  for (let i = 1; i < relevantHistory.length; i++) {
    if (isSuccess(relevantHistory[i - 1].status) !== isSuccess(relevantHistory[i].status)) {
      changes++;
    }
  }

  const maxPossibleChanges = Math.max(1, relevantHistory.length - 1);
  const instabilityScore = changes / maxPossibleChanges;

  return {
    isFlaky: hasPassed && hasFailed,
    score: instabilityScore,
    failureRate,
  };
}
