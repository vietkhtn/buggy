"use client";

import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportResult = {
  id: string;
  name: string;
  status: string;
  notes: string | null;
  testCase: {
    displayId: string;
    title: string;
    description: string | null;
    preconditions: string | null;
    priority: string;
    module: { name: string } | null;
  } | null;
};

type ReportRun = {
  id: string;
  name: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  results: ReportResult[];
};

const STATUS_LABEL: Record<string, string> = {
  PASSED: "Passed",
  FAILED: "Failed",
  SKIPPED: "Skipped",
  BLOCKED: "Not tested",
  ERROR: "Error",
};

const STATUS_COLOR: Record<string, string> = {
  PASSED: "text-[var(--success)]",
  FAILED: "text-destructive",
  SKIPPED: "text-muted-foreground",
  BLOCKED: "text-muted-foreground",
  ERROR: "text-destructive",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function RunReport({ run }: { run: ReportRun }) {
  const passed = run.results.filter((r) => r.status === "PASSED").length;
  const failed = run.results.filter((r) => r.status === "FAILED").length;
  const skipped = run.results.filter((r) => r.status === "SKIPPED" || r.status === "BLOCKED").length;
  const total = run.results.length;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

  const completedDate = run.completedAt
    ? new Date(run.completedAt).toLocaleString()
    : new Date(run.startedAt).toLocaleString();

  const failedResults = run.results.filter((r) => r.status === "FAILED");

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; color: black; }
          .print-break { page-break-inside: avoid; }
        }
      `}</style>

      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* ── Toolbar (hidden in print) ── */}
        <div className="no-print mb-6 flex items-center justify-between gap-4">
          <a
            href="/dashboard/tests"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Tests
          </a>
          <Button onClick={() => window.print()}>
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Export PDF
          </Button>
        </div>

        {/* ── Report header ── */}
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Test run report</p>
          <h1 className="mt-1 text-3xl font-bold">{run.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{completedDate}</p>
        </div>

        {/* ── Summary stats ── */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total", value: total, color: "text-foreground" },
            { label: "Passed", value: passed, color: "text-[var(--success)]" },
            { label: "Failed", value: failed, color: "text-destructive" },
            { label: "Skipped", value: skipped, color: "text-muted-foreground" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-5 text-center print-break">
              <p className={`text-4xl font-bold tabular-nums ${color}`}>{value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Pass rate bar ── */}
        {total > 0 && (
          <div className="mb-8 rounded-xl border border-border bg-card p-5">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground font-medium">Pass rate</span>
              <span className="font-bold">{passRate}%</span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden flex">
              <div
                className="h-full bg-[var(--success)] transition-all"
                style={{ width: `${(passed / total) * 100}%` }}
              />
              <div
                className="h-full bg-destructive transition-all"
                style={{ width: `${(failed / total) * 100}%` }}
              />
            </div>
            <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
                Passed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-destructive" />
                Failed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                Skipped / Not tested
              </span>
            </div>
          </div>
        )}

        {/* ── Failed cases (highlighted section) ── */}
        {failedResults.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-destructive">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Failed Tests ({failedResults.length})
            </h2>
            <div className="space-y-3">
              {failedResults.map((result) => (
                <div
                  key={result.id}
                  className="print-break rounded-xl border border-destructive/50 bg-destructive/5 p-5"
                >
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-xs font-semibold text-muted-foreground">
                      {result.testCase?.displayId ?? "—"}
                    </span>
                    {result.testCase?.module && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                        {result.testCase.module.name}
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-base">{result.testCase?.title ?? result.name}</p>
                  {result.testCase?.description && (
                    <div className="mt-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                        Test steps
                      </p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {result.testCase.description}
                      </p>
                    </div>
                  )}
                  {result.notes && (
                    <div className="mt-3 rounded-lg bg-destructive/10 px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-widest text-destructive mb-1.5">
                        Actual result
                      </p>
                      <p className="text-sm leading-relaxed">{result.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── All results table ── */}
        <div>
          <h2 className="mb-4 text-lg font-bold">All Test Cases</h2>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Actual result
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {run.results.map((result) => (
                  <tr
                    key={result.id}
                    className={result.status === "FAILED" ? "bg-destructive/5" : ""}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {result.testCase?.displayId ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {result.testCase?.title ?? result.name}
                    </td>
                    <td className={`px-4 py-3 text-xs font-bold ${STATUS_COLOR[result.status] ?? "text-muted-foreground"}`}>
                      {STATUS_LABEL[result.status] ?? result.status}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {result.notes ?? <span className="text-muted-foreground/40">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
