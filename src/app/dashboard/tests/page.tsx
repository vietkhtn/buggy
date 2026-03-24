import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ensureProjectForUser } from "@/lib/projects";
import { TestsPanel } from "@/components/tests-panel";

export default async function TestsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const project = await ensureProjectForUser(session.user.id);

  const [testCases, activeManualRun, suites, completedRunsRaw] = await Promise.all([
    db.testCase.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "desc" },
      take: 10_000,
      select: {
        id: true,
        displayId: true,
        title: true,
        priority: true,
        module: { select: { name: true } },
        status: true,
        description: true,
        preconditions: true,
        tags: true,
        jiraKey: true,
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
          select: { id: true, name: true, status: true },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    db.testSuite.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "desc" },
      include: {
        cases: {
          orderBy: { order: "asc" },
          include: {
            testCase: {
              select: {
                id: true,
                displayId: true,
                title: true,
                priority: true,
                status: true,
                jiraKey: true,
                module: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
    db.testRun.findMany({
      where: { projectId: project.id, source: "MANUAL", status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      take: 20,
      include: { results: { select: { status: true } } },
    }),
  ]);

  const mappedTestCases = (
    testCases as Array<{
      id: string;
      displayId: string;
      title: string;
      priority: string;
      module: { name: string } | null;
      status: string;
      description: string | null;
      preconditions: string | null;
      tags: string[];
      jiraKey: string | null;
    }>
  ).map((tc) => ({
    id: tc.id,
    displayId: tc.displayId,
    title: tc.title,
    priority: tc.priority,
    module: tc.module?.name ?? null,
    status: tc.status,
    description: tc.description,
    preconditions: tc.preconditions,
    tags: tc.tags,
    jiraKey: tc.jiraKey,
  }));

  const mappedRun = activeManualRun
    ? {
        id: activeManualRun.id,
        name: activeManualRun.name,
        status: activeManualRun.status,
        results: activeManualRun.results as Array<{
          id: string;
          name: string;
          status: "PASSED" | "FAILED" | "SKIPPED" | "ERROR" | "BLOCKED";
        }>,
      }
    : null;

  const completedRuns = completedRunsRaw.map((run) => ({
    id: run.id,
    name: run.name,
    completedAt: run.completedAt?.toISOString() ?? null,
    startedAt: run.startedAt.toISOString(),
    passed: run.results.filter((r) => r.status === "PASSED").length,
    failed: run.results.filter((r) => r.status === "FAILED").length,
    skipped: run.results.filter((r) => r.status === "SKIPPED" || r.status === "BLOCKED").length,
    total: run.results.length,
  }));

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <TestsPanel
        projectId={project.id}
        testCasePrefix={project.testCasePrefix}
        testCases={mappedTestCases}
        activeManualRun={mappedRun}
        suites={suites}
        completedRuns={completedRuns}
      />
    </main>
  );
}
