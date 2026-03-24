import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { userHasProjectAccess } from "@/lib/projects";
import { ActiveRunPanel } from "@/components/active-run-panel";

export default async function ActiveRunPage({
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
      results: {
        orderBy: { createdAt: "asc" },
        include: {
          testCase: {
            select: {
              id: true,
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

  if (!run || run.source !== "MANUAL") redirect("/dashboard/tests");
  if (!(await userHasProjectAccess(session.user.id, run.projectId))) redirect("/dashboard/tests");
  if (run.status === "COMPLETED") redirect(`/dashboard/tests/run/${runId}/report`);

  const serialized = {
    id: run.id,
    name: run.name,
    status: run.status,
    startedAt: run.startedAt.toISOString(),
    results: run.results.map((r) => ({
      id: r.id,
      name: r.name,
      status: r.status as "PASSED" | "FAILED" | "SKIPPED" | "ERROR" | "BLOCKED",
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
      <ActiveRunPanel run={serialized} />
    </main>
  );
}
