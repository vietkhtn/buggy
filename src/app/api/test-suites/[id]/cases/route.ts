import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { userHasProjectAccess } from "@/lib/projects";

async function fetchSuiteWithCases(suiteId: string) {
  return db.testSuite.findUnique({
    where: { id: suiteId },
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
              displayId: true,
              jiraKey: true,
              module: { select: { name: true } },
            },
          },
        },
      },
    },
  });
}

async function getSuiteWithAccess(userId: string, suiteId: string) {
  const suite = await db.testSuite.findUnique({ where: { id: suiteId } });
  if (!suite) return null;
  if (!(await userHasProjectAccess(userId, suite.projectId))) return null;
  return suite;
}

// ─── POST /api/test-suites/[id]/cases — add test cases to suite ──────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const suite = await getSuiteWithAccess(session.user.id, id);
  if (!suite) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { testCaseIds } = z
    .object({ testCaseIds: z.array(z.string()).min(1) })
    .parse(await request.json());

  const maxOrder = await db.testSuiteCase.aggregate({
    where: { suiteId: id },
    _max: { order: true },
  });
  const nextOrder = (maxOrder._max.order ?? -1) + 1;

  await db.testSuiteCase.createMany({
    data: testCaseIds.map((tcId, i) => ({
      suiteId: id,
      testCaseId: tcId,
      order: nextOrder + i,
      addedById: session.user.id,
    })),
    skipDuplicates: true,
  });

  const suiteWithCases = await fetchSuiteWithCases(id);
  return NextResponse.json({ success: true, suite: suiteWithCases });
}

// ─── DELETE /api/test-suites/[id]/cases — remove test cases from suite ───────

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const suite = await getSuiteWithAccess(session.user.id, id);
  if (!suite) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { testCaseIds } = z
    .object({ testCaseIds: z.array(z.string()).min(1) })
    .parse(await request.json());

  await db.testSuiteCase.deleteMany({
    where: { suiteId: id, testCaseId: { in: testCaseIds } },
  });

  const suiteWithCases = await fetchSuiteWithCases(id);
  return NextResponse.json({ success: true, suite: suiteWithCases });
}
