import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardActions } from "@/components/dashboard-actions";
import { LogoutButton } from "@/components/logout-button";
import { CopyProjectId } from "@/components/copy-project-id";
import { db } from "@/lib/db";
import { ensureProjectForUser } from "@/lib/projects";

function percent(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 100);
}

// Semantic colour for each metric card:
// pass-rate → green, failed → red, skipped+error → amber, others → neutral
type MetricVariant = "default" | "success" | "danger" | "warning";

const VARIANT_CLASSES: Record<MetricVariant, string> = {
  default: "border-border",
  success: "border-l-4 border-l-[var(--success)]",
  danger: "border-l-4 border-l-destructive",
  warning: "border-l-4 border-l-[var(--warning)]",
};

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const project = await ensureProjectForUser(session.user.id);

  // Fetch up to 10 000 test cases so the client-side search in DashboardActions
  // can filter the full set without additional round-trips.
  const [testCases, recentRuns, countsByStatus, flakyCandidates, apiKeys, activeManualRun] =
    await Promise.all([
      db.testCase.findMany({
        where: { projectId: project.id },
        orderBy: { createdAt: "desc" },
        take: 10_000,
        select: {
          id: true,
          title: true,
          priority: true,
          module: { select: { name: true } },
          status: true,
        },
      }),
      db.testRun.findMany({
        where: { projectId: project.id },
        orderBy: { startedAt: "desc" },
        take: 10,
        include: {
          _count: { select: { results: true } },
          results: { select: { status: true } },
        },
      }),
      db.testResult.groupBy({
        by: ["status"],
        where: { run: { projectId: project.id } },
        _count: { status: true },
      }),
      db.testRun.findMany({
        where: { projectId: project.id, source: "AUTOMATED" },
        orderBy: { startedAt: "desc" },
        take: 5,
        include: { results: { select: { name: true, status: true } } },
      }),
      db.apiKey.findMany({
        where: { projectId: project.id },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, keyPrefix: true, createdAt: true, lastUsedAt: true },
      }),
      db.testRun.findFirst({
        where: {
          projectId: project.id,
          source: "MANUAL",
          status: "IN_PROGRESS",
        },
        orderBy: { startedAt: "desc" },
        include: {
          results: {
            select: { id: true, name: true, status: true },
            orderBy: { createdAt: "asc" },
          },
        },
      }),
    ]);

  const counts = { total: 0, passed: 0, failed: 0, skipped: 0, error: 0 };

  for (const item of countsByStatus as Array<{
    status: string;
    _count: { status: number };
  }>) {
    const value = item._count.status;
    counts.total += value;
    if (item.status === "PASSED") counts.passed += value;
    if (item.status === "FAILED") counts.failed += value;
    if (item.status === "SKIPPED") counts.skipped += value;
    if (item.status === "ERROR") counts.error += value;
  }

  const passRate = percent(counts.passed, counts.total);

  const latestFiveMap = new Map<string, { passed: number; failed: number; total: number }>();
  for (const run of flakyCandidates as Array<{
    results: Array<{ name: string; status: string }>;
  }>) {
    for (const result of run.results) {
      const current = latestFiveMap.get(result.name) ?? { passed: 0, failed: 0, total: 0 };
      current.total += 1;
      if (result.status === "PASSED") current.passed += 1;
      if (result.status === "FAILED" || result.status === "ERROR") current.failed += 1;
      latestFiveMap.set(result.name, current);
    }
  }

  const flakyTests = [...latestFiveMap.entries()]
    .map(([name, stats]) => ({
      name,
      score: stats.total > 0 ? Math.round((stats.failed / stats.total) * 100) : 0,
      isFlaky: stats.passed > 0 && stats.failed > 0,
    }))
    .filter((item) => item.isFlaky)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 px-6 py-8">
      {/* ── Header ── */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Project</p>
          <h1 className="text-3xl font-semibold">{project.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back, {session.user.name ?? session.user.email}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CopyProjectId projectId={project.id} />
          <LogoutButton />
        </div>
      </header>

      {/* ── Overview ── */}
      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard label="Total results" value={String(counts.total)} variant="default" />
          <MetricCard
            label="Pass rate"
            value={`${passRate}%`}
            variant={passRate >= 80 ? "success" : passRate >= 50 ? "warning" : "danger"}
          />
          <MetricCard label="Passed" value={String(counts.passed)} variant="success" />
          <MetricCard label="Failed" value={String(counts.failed)} variant={counts.failed > 0 ? "danger" : "default"} />
          <MetricCard
            label="Skipped + Error"
            value={String(counts.skipped + counts.error)}
            variant={counts.skipped + counts.error > 0 ? "warning" : "default"}
          />
        </div>
      </section>

      {/* ── Empty state for first-time users ── */}
      {counts.total === 0 && testCases.length === 0 && (
        <section className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
          <p className="text-sm font-medium">No test results yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a JUnit run or create a manual test case to get started.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <a href="#upload-junit" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90">
              Upload JUnit run
            </a>
            <a href="#create-test-case" className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted">
              Create test case
            </a>
          </div>
        </section>
      )}

      {/* ── Actions ── */}
      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Actions
        </h2>
        <DashboardActions
          projectId={project.id}
          testCases={(
            testCases as Array<{
              id: string;
              title: string;
              priority: string;
              module: { name: string } | null;
            }>
          ).map((tc) => ({
            id: tc.id,
            title: tc.title,
            priority: tc.priority,
            module: tc.module?.name ?? null,
          }))}
          apiKeys={(
            apiKeys as Array<{
              id: string;
              name: string;
              keyPrefix: string;
              createdAt: Date;
              lastUsedAt: Date | null;
            }>
          )}
          activeManualRun={
            activeManualRun
              ? {
                  id: activeManualRun.id,
                  name: activeManualRun.name,
                  status: activeManualRun.status,
                  results: activeManualRun.results,
                }
              : null
          }
        />
      </section>

      {/* ── History ── */}
      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
          History
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-lg font-semibold">Recent runs</h3>
            <div className="mt-4 space-y-3">
              {(
                recentRuns as Array<{
                  id: string;
                  name: string;
                  source: string;
                  startedAt: Date;
                  _count: { results: number };
                  results: Array<{ status: string }>;
                }>
              ).map((run) => {
                const total = run.results.length;
                const passed = run.results.filter((r) => r.status === "PASSED").length;
                const rate = percent(passed, total);

                return (
                  <div key={run.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">{run.name}</p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(run.startedAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        {run.source} · {run._count.results} tests
                      </p>
                      <span
                        className={`text-xs font-medium ${
                          rate >= 80
                            ? "text-[var(--success)]"
                            : rate >= 50
                            ? "text-[var(--warning)]"
                            : "text-destructive"
                        }`}
                      >
                        {rate}% pass
                      </span>
                    </div>
                  </div>
                );
              })}
              {!recentRuns.length ? (
                <p className="text-sm text-muted-foreground">No runs yet.</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-lg font-semibold">Flaky tests (last 5 automated runs)</h3>
            <div className="mt-4 space-y-2">
              {flakyTests.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <p className="text-sm font-medium">{item.name}</p>
                  <span className="text-xs font-medium text-[var(--warning)]">
                    {item.score}% fail rate
                  </span>
                </div>
              ))}
              {!flakyTests.length ? (
                <p className="text-sm text-muted-foreground">No flaky tests detected yet.</p>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function MetricCard({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: string;
  variant?: MetricVariant;
}) {
  return (
    <div className={`rounded-xl border bg-card p-4 ${VARIANT_CLASSES[variant]}`}>
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
