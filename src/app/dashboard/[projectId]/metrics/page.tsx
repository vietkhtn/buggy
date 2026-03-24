import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { userHasProjectAccess } from "@/lib/projects";
import { MetricsPanel } from "@/components/metrics-panel";
import { calculateFlakiness, TestHistoryItem } from "@/lib/flaky-detection";
import { ResultStatus } from "@prisma/client";

export default async function MetricsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { projectId } = await params;

  if (!(await userHasProjectAccess(session.user.id, projectId))) {
    notFound();
  }

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true },
  });

  if (!project) notFound();

  const reports = await db.defectReport.findMany({
    where: { projectId },
    orderBy: { reportedAt: "desc" },
    take: 10,
  });

  const latest = reports[0] ?? null;

  const testCoverage =
    latest && latest.totalRequirements > 0
      ? Math.round((latest.requirementsCovered / latest.totalRequirements) * 100 * 10) / 10
      : null;

  const totalBugs = latest ? latest.testingBugsFound + latest.productionBugsFound : 0;
  const ddp =
    totalBugs > 0 && latest
      ? Math.round((latest.testingBugsFound / totalBugs) * 100 * 10) / 10
      : null;

  const escapedDefects = latest?.productionBugsFound ?? null;
  const defectLeakage = escapedDefects;

  const failedResults = await db.testResult.findMany({
    where: { run: { projectId }, status: { in: ["FAILED", "ERROR"] } },
    select: { suite: true },
  });

  const densityMap: Record<string, number> = {};
  for (const r of failedResults) {
    const key = r.suite ?? "No module";
    densityMap[key] = (densityMap[key] ?? 0) + 1;
  }
  const defectDensity = Object.entries(densityMap)
    .map(([module, count]) => ({ module, count }))
    .sort((a, b) => b.count - a.count);

  const completedRuns = await db.testRun.findMany({
    where: {
      projectId,
      status: "COMPLETED",
      source: "MANUAL",
      completedAt: { not: null },
    },
    select: { startedAt: true, completedAt: true },
  });

  const avgTimeToConfidenceMs =
    completedRuns.length > 0
      ? completedRuns.reduce(
          (sum, r) => sum + (r.completedAt!.getTime() - r.startedAt.getTime()),
          0
        ) / completedRuns.length
      : null;

  const history = [...reports].reverse().map((r) => ({
    date: r.reportedAt.toISOString(),
    testCoverage:
      r.totalRequirements > 0
        ? Math.round((r.requirementsCovered / r.totalRequirements) * 100 * 10) / 10
        : 0,
    ddp:
      r.testingBugsFound + r.productionBugsFound > 0
        ? Math.round(
            (r.testingBugsFound / (r.testingBugsFound + r.productionBugsFound)) * 100 * 10
          ) / 10
        : 0,
    escapedDefects: r.productionBugsFound,
    testingBugs: r.testingBugsFound,
  }));

  const automatedRuns = await db.testRun.findMany({
    where: { projectId, source: "AUTOMATED" },
    orderBy: { startedAt: "desc" },
    take: 20,
    include: { results: { select: { name: true, status: true } } },
  });

  const testHistories = new Map<string, TestHistoryItem[]>();
  for (const run of automatedRuns) {
    for (const result of run.results) {
      const history = testHistories.get(result.name) ?? [];
      history.push({ status: result.status as ResultStatus });
      testHistories.set(result.name, history);
    }
  }

  const allFlaky = [...testHistories.entries()]
    .map(([name, history]) => {
      const flakiness = calculateFlakiness(history);
      return {
        name,
        score: Math.round(flakiness.score * 100),
        failureRate: Math.round(flakiness.failureRate * 100),
        isFlaky: flakiness.isFlaky,
      };
    })
    .filter((f) => f.isFlaky)
    .sort((a, b) => b.score - a.score);

  const flakinessIndex =
    allFlaky.length > 0
      ? Math.round((allFlaky.reduce((sum, f) => sum + f.score, 0) / allFlaky.length) * 10) / 10
      : 0;

  const testCaseCount = await db.testCase.count({ where: { projectId } });

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <MetricsPanel
        projectId={project.id}
        projectName={project.name}
        metrics={{
          testCoverage,
          ddp,
          escapedDefects,
          defectLeakage,
          defectDensity,
          avgTimeToConfidenceMs,
          flakinessIndex,
          topFlakyTests: allFlaky.slice(0, 5),
        }}
        history={history}
        latestReport={
          latest
            ? {
                requirementsCovered: latest.requirementsCovered,
                totalRequirements: latest.totalRequirements,
                testingBugsFound: latest.testingBugsFound,
                productionBugsFound: latest.productionBugsFound,
                notes: latest.notes ?? undefined,
                reportedAt: latest.reportedAt.toISOString(),
              }
            : null
        }
        testCaseCount={testCaseCount}
      />
    </main>
  );
}
