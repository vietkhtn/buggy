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

  const [testCases, activeManualRun, suites] = await Promise.all([
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
                title: true,
                priority: true,
                status: true,
                module: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  const mappedTestCases = (
    testCases as Array<{
      id: string;
      title: string;
      priority: string;
      module: { name: string } | null;
      status: string;
    }>
  ).map((tc) => ({
    id: tc.id,
    title: tc.title,
    priority: tc.priority,
    module: tc.module?.name ?? null,
    status: tc.status,
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

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <TestsPanel
        projectId={project.id}
        testCases={mappedTestCases}
        activeManualRun={mappedRun}
        suites={suites}
      />
    </main>
  );
}
