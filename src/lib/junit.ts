import { parseStringPromise } from "xml2js";
import { categoryForStatus } from "@/lib/failure-category";

type ResultStatus = "PASSED" | "FAILED" | "SKIPPED" | "ERROR";

type XmlNode = {
  $?: Record<string, string>;
  testsuite?: XmlNode | XmlNode[];
  testcase?: XmlNode | XmlNode[];
  failure?: Array<{ _: string; $?: Record<string, string> }> | { _: string; $?: Record<string, string> };
  error?: Array<{ _: string; $?: Record<string, string> }> | { _: string; $?: Record<string, string> };
  skipped?: unknown;
};

export type ParsedJUnitResult = {
  name: string;
  suite: string;
  status: ResultStatus;
  durationMs: number;
  failureMessage: string | null;
  stackTrace: string | null;
};

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function statusFromCase(testCase: XmlNode): ResultStatus {
  if (testCase.failure) return "FAILED";
  if (testCase.error) return "ERROR";
  if (testCase.skipped) return "SKIPPED";
  return "PASSED";
}

function readFailure(testCase: XmlNode): { message: string | null; stack: string | null } {
  const failure = toArray(testCase.failure)[0];
  const error = toArray(testCase.error)[0];
  const payload = failure ?? error;

  if (!payload) {
    return { message: null, stack: null };
  }

  return {
    message: payload.$?.message ?? null,
    stack: payload._?.trim() || null,
  };
}

function collectCases(node: XmlNode, suitePath: string[]): ParsedJUnitResult[] {
  const ownSuiteName = node.$?.name?.trim();
  const currentPath = ownSuiteName ? [...suitePath, ownSuiteName] : suitePath;
  const suiteName = currentPath.join(" > ") || "Root Suite";

  const directCases = toArray(node.testcase).map((testCase) => {
    const status = statusFromCase(testCase);
    const details = readFailure(testCase);
    const durationSec = Number(testCase.$?.time ?? 0);
    const testName = testCase.$?.name?.trim() || "Unnamed test";

    return {
      name: testName,
      suite: suiteName,
      status,
      durationMs: Math.round(durationSec * 1000),
      failureMessage: details.message,
      stackTrace: details.stack,
    };
  });

  const nested = toArray(node.testsuite).flatMap((child) => collectCases(child, currentPath));
  return [...directCases, ...nested];
}

export async function parseJUnitXml(xml: string): Promise<ParsedJUnitResult[]> {
  const parsed = (await parseStringPromise(xml, {
    explicitArray: false,
    mergeAttrs: false,
    trim: true,
  })) as { testsuites?: XmlNode | XmlNode[]; testsuite?: XmlNode | XmlNode[] };

  const suites = [
    ...toArray(parsed.testsuite),
    ...toArray(parsed.testsuites).flatMap((entry) => toArray(entry.testsuite)),
  ];

  return suites.flatMap((suite) => collectCases(suite, []));
}

export function summarizeStatuses(results: ParsedJUnitResult[]) {
  return results.reduce(
    (acc, result) => {
      if (result.status === "PASSED") acc.passed += 1;
      if (result.status === "FAILED") acc.failed += 1;
      if (result.status === "SKIPPED") acc.skipped += 1;
      if (result.status === "ERROR") acc.error += 1;
      return acc;
    },
    { passed: 0, failed: 0, skipped: 0, error: 0 }
  );
}

export function toCreateResultData(results: ParsedJUnitResult[]) {
  return results.map((result) => ({
    name: result.name,
    suite: result.suite,
    status: result.status,
    durationMs: result.durationMs,
    failureMessage: result.failureMessage,
    stackTrace: result.stackTrace,
    category: categoryForStatus(result.status, result.failureMessage, result.stackTrace),
  }));
}
