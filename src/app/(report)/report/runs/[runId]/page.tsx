import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { userHasProjectAccess } from "@/lib/projects";
import { RunReport } from "@/components/run-report";

export default async function RunReportPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { runId } = await params;

  const run = await db.testRun.findUnique({
    where: { id: runId },
    include: {
      project: { select: { name: true } },
      results: {
        orderBy: { createdAt: "asc" },
        include: {
          testCase: {
            select: {
              displayId: true,
              title: true,
              description: true,
              preconditions: true,
              expectedResult: true,
              priority: true,
              module: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!run || run.source !== "MANUAL") redirect("/dashboard");
  if (!(await userHasProjectAccess(session.user.id, run.projectId))) redirect("/dashboard");

  const serialized = {
    id: run.id,
    name: run.name,
    status: run.status,
    startedAt: run.startedAt.toISOString(),
    completedAt: run.completedAt?.toISOString() ?? null,
    projectName: run.project.name,
    results: run.results.map((r) => ({
      id: r.id,
      name: r.name,
      status: r.status,
      notes: r.notes,
      testCase: r.testCase
        ? {
            displayId: r.testCase.displayId,
            title: r.testCase.title,
            description: r.testCase.description,
            preconditions: r.testCase.preconditions,
            expectedResult: r.testCase.expectedResult,
            priority: r.testCase.priority,
            module: r.testCase.module,
          }
        : null,
    })),
  };

  return (
    <main>
      <RunReport run={serialized} backUrl={`/dashboard/${run.projectId}/tests`} />
    </main>
  );
}
