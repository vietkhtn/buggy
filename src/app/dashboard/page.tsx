import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardActions } from "@/components/dashboard-actions";
import { LogoutButton } from "@/components/logout-button";
import { db } from "@/lib/db";
import { ensureProjectForUser } from "@/lib/projects";

function percent(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 100);
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const project = await ensureProjectForUser(session.user.id);

  const [testCases, recentRuns, countsByStatus, flakyCandidates, activeManualRun] = await Promise.all([
    db.testCase.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, title: true, module: { select: { name: true } }, status: true },
    }),
    db.testRun.findMany({
      where: { projectId: project.id },
      orderBy: { startedAt: "desc" },
      take: 10,
      include: {
        _count: { select: { results: true } },
        results: {
          select: { status: true },
        },
      },
    }),
    db.testResult.groupBy({
      by: ["status"],
      where: {
        run: {
          projectId: project.id,
        },
      },
      _count: {
        status: true,
      },
    }),
    db.testRun.findMany({
      where: {
        projectId: project.id,
        source: "AUTOMATED",
      },
      orderBy: { startedAt: "desc" },
      take: 5,
      include: {
        results: {
          select: { name: true, status: true },
        },
      },
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
          select: {
            id: true,
            name: true,
            status: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
  ]);

  const counts = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    error: 0,
  };

  for (const item of countsByStatus as Array<{ status: string; _count: { status: number } }>) {
    const value = item._count.status;
    counts.total += value;

    if (item.status === "PASSED") counts.passed += value;
    if (item.status === "FAILED") counts.failed += value;
    if (item.status === "SKIPPED") counts.skipped += value;
    if (item.status === "ERROR") counts.error += value;
  }

  const latestFiveMap = new Map<string, { passed: number; failed: number; total: number }>();
  for (const run of flakyCandidates as Array<{ results: Array<{ name: string; status: string }> }>) {
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
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Project</p>
          <h1 className="text-3xl font-semibold">{project.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Welcome back, {session.user.name ?? session.user.email}.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/" className="rounded-lg border border-border px-3 py-2 text-sm font-medium">
            Home
          </Link>
          <LogoutButton />
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Total results" value={String(counts.total)} />
        <MetricCard label="Pass rate" value={`${percent(counts.passed, counts.total)}%`} />
        <MetricCard label="Passed" value={String(counts.passed)} />
        <MetricCard label="Failed" value={String(counts.failed)} />
        <MetricCard label="Skipped + Error" value={String(counts.skipped + counts.error)} />
      </section>

      <DashboardActions
        projectId={project.id}
        testCases={(testCases as Array<{ id: string; title: string }>).map((testCase) => ({ id: testCase.id, title: testCase.title }))}
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

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Recent runs</h2>
          <div className="mt-4 space-y-3">
            {(recentRuns as Array<{
              id: string;
              name: string;
              source: string;
              startedAt: Date;
              _count: { results: number };
              results: Array<{ status: string }>;
            }>).map((run) => {
              const total = run.results.length;
              const passed = run.results.filter((result: { status: string }) => result.status === "PASSED").length;

              return (
                <div key={run.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{run.name}</p>
                    <span className="text-xs text-muted-foreground">{new Date(run.startedAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {run.source} · {run._count.results} tests · pass rate {percent(passed, total)}%
                  </p>
                </div>
              );
            })}
            {!recentRuns.length ? <p className="text-sm text-muted-foreground">No runs yet.</p> : null}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Flaky tests (last 5 automated runs)</h2>
          <div className="mt-4 space-y-2">
            {flakyTests.map((item) => (
              <div key={item.name} className="flex items-center justify-between rounded-lg border border-border p-3">
                <p className="text-sm font-medium">{item.name}</p>
                <span className="text-xs text-muted-foreground">{item.score}% fail rate</span>
              </div>
            ))}
            {!flakyTests.length ? (
              <p className="text-sm text-muted-foreground">No flaky tests detected yet.</p>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
