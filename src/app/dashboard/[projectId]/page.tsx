import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { userHasProjectAccess } from "@/lib/projects";
import { calculateFlakiness, TestHistoryItem } from "@/lib/flaky-detection";
import { ResultStatus } from "@prisma/client";

function percent(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 100);
}

type MetricVariant = "default" | "success" | "danger" | "warning";

const VARIANT_CLASSES: Record<MetricVariant, string> = {
  default: "border-border",
  success: "border-l-4 border-l-[var(--success)]",
  danger: "border-l-4 border-l-destructive",
  warning: "border-l-4 border-l-[var(--warning)]",
};

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { projectId } = await params;

  if (
    !session.user.isWorkspaceAdmin &&
    !(await userHasProjectAccess(session.user.id, projectId))
  ) {
    notFound();
  }

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true },
  });

  if (!project) notFound();

  const [recentRuns, countsByStatus, testCaseCount] = await Promise.all([
    db.testRun.findMany({
      where: { projectId },
      orderBy: { startedAt: "desc" },
      take: 10,
      include: {
        _count: { select: { results: true } },
        results: { select: { status: true } },
      },
    }),
    db.testResult.groupBy({
      by: ["status"],
      where: { run: { projectId } },
      _count: { status: true },
    }),
    db.testCase.count({ where: { projectId } }),
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

  const latestRuns = await db.testRun.findMany({
    where: { projectId, source: "AUTOMATED" },
    orderBy: { startedAt: "desc" },
    take: 20,
    include: { results: { select: { name: true, status: true } } },
  });

  const testHistories = new Map<string, TestHistoryItem[]>();
  for (const run of latestRuns) {
    for (const result of run.results) {
      const history = testHistories.get(result.name) ?? [];
      history.push({ status: result.status as ResultStatus });
      testHistories.set(result.name, history);
    }
  }

  const flakyTests = [...testHistories.entries()]
    .map(([name, history]) => {
      const flakiness = calculateFlakiness(history);
      return {
        name,
        score: Math.round(flakiness.score * 100),
        failureRate: Math.round(flakiness.failureRate * 100),
        isFlaky: flakiness.isFlaky,
      };
    })
    .filter((item) => item.isFlaky)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const isEmpty = counts.total === 0 && testCaseCount === 0;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-6 py-8">
      <header>
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Overview</p>
        <h1 className="mt-0.5 text-2xl font-semibold">Dashboard</h1>
        {session.user.name && (
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back, {session.user.name.split(" ")[0]}.
          </p>
        )}
      </header>

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Test results
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard label="Total results" value={String(counts.total)} variant="default" />
          <MetricCard
            label="Pass rate"
            value={`${passRate}%`}
            variant={
              counts.total === 0
                ? "default"
                : passRate >= 80
                ? "success"
                : passRate >= 50
                ? "warning"
                : "danger"
            }
          />
          <MetricCard
            label="Passed"
            value={String(counts.passed)}
            variant={counts.passed > 0 ? "success" : "default"}
          />
          <MetricCard
            label="Failed"
            value={String(counts.failed)}
            variant={counts.failed > 0 ? "danger" : "default"}
          />
          <MetricCard
            label="Skipped + Error"
            value={String(counts.skipped + counts.error)}
            variant={counts.skipped + counts.error > 0 ? "warning" : "default"}
          />
        </div>
      </section>

      {isEmpty && (
        <section className="rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center">
          <p className="text-sm font-medium">No test data yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create test cases or import a JUnit run to get started.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Link
              href={`/dashboard/${projectId}/tests`}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              Manage tests
            </Link>
            <Link
              href={`/dashboard/${projectId}/settings`}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted"
            >
              Import JUnit run
            </Link>
          </div>
        </section>
      )}

      {(recentRuns.length > 0 || flakyTests.length > 0) && (
        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            History
          </h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-base font-semibold">Recent runs</h3>
              <div className="mt-4 space-y-2.5">
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
                    <div key={run.id} className="rounded-lg border border-border bg-background/50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-medium">{run.name}</p>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {new Date(run.startedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {run.source} · {run._count.results} tests
                        </span>
                        <span
                          className={`text-xs font-semibold ${
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
                {recentRuns.length === 0 && (
                  <p className="text-sm text-muted-foreground">No runs yet.</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-base font-semibold">Flaky tests</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Last 5 automated runs</p>
              <div className="mt-4 space-y-2">
                {flakyTests.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-3"
                  >
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <span className="ml-3 shrink-0 text-xs font-semibold text-[var(--warning)]">
                      {item.score}% fail
                    </span>
                  </div>
                ))}
                {flakyTests.length === 0 && (
                  <p className="text-sm text-muted-foreground">No flaky tests detected.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
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
