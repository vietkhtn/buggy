import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveApiKey } from "@/lib/api-auth";

const bodySchema = z.object({
  test_case_ids: z.array(z.string().min(1)).min(1),
});

async function fetchSuiteWithCases(suiteId: string) {
  return db.testSuite.findUnique({
    where: { id: suiteId },
    include: {
      cases: {
        orderBy: { order: "asc" },
        include: {
          testCase: {
            select: { id: true, displayId: true, title: true, priority: true, status: true },
          },
        },
      },
    },
  });
}

function formatSuiteWithCases(suite: NonNullable<Awaited<ReturnType<typeof fetchSuiteWithCases>>>) {
  return {
    id: suite.id,
    name: suite.name,
    description: suite.description,
    cases: suite.cases.map((c) => ({
      order: c.order,
      test_case: {
        id: c.testCase.id,
        display_id: c.testCase.displayId,
        title: c.testCase.title,
        priority: c.testCase.priority,
        status: c.testCase.status,
      },
    })),
    created_at: suite.createdAt,
  };
}

function bearerToken(request: Request) {
  const auth = request.headers.get("authorization");
  return auth?.startsWith("Bearer ") ? auth.slice(7).trim() : "";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = bearerToken(request);
  if (!token) return NextResponse.json({ error: "Missing Bearer API key." }, { status: 401 });

  const apiKey = await resolveApiKey(token);
  if (!apiKey) return NextResponse.json({ error: "Invalid API key." }, { status: 401 });

  if (apiKey.scope === "READ_ONLY") {
    return NextResponse.json({ error: "This API key is read-only." }, { status: 403 });
  }

  const { id } = await params;
  const suite = await db.testSuite.findFirst({ where: { id, projectId: apiKey.projectId } });
  if (!suite) return NextResponse.json({ error: "Test suite not found." }, { status: 404 });

  let payload: z.infer<typeof bodySchema>;
  try {
    payload = bodySchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request.", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to add test cases." }, { status: 500 });
  }

  // Cross-project ownership check
  const count = await db.testCase.count({
    where: { id: { in: payload.test_case_ids }, projectId: apiKey.projectId },
  });
  if (count !== payload.test_case_ids.length) {
    return NextResponse.json(
      { error: "One or more test case IDs do not belong to this project." },
      { status: 422 }
    );
  }

  const maxOrder = await db.testSuiteCase.aggregate({
    where: { suiteId: id },
    _max: { order: true },
  });
  const nextOrder = (maxOrder._max.order ?? -1) + 1;

  await db.testSuiteCase.createMany({
    data: payload.test_case_ids.map((tcId, i) => ({
      suiteId: id,
      testCaseId: tcId,
      order: nextOrder + i,
    })),
    skipDuplicates: true,
  });

  await db.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });

  const full = await fetchSuiteWithCases(id);
  return NextResponse.json({ test_suite: formatSuiteWithCases(full!) });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = bearerToken(request);
  if (!token) return NextResponse.json({ error: "Missing Bearer API key." }, { status: 401 });

  const apiKey = await resolveApiKey(token);
  if (!apiKey) return NextResponse.json({ error: "Invalid API key." }, { status: 401 });

  if (apiKey.scope === "READ_ONLY") {
    return NextResponse.json({ error: "This API key is read-only." }, { status: 403 });
  }

  const { id } = await params;
  const suite = await db.testSuite.findFirst({ where: { id, projectId: apiKey.projectId } });
  if (!suite) return NextResponse.json({ error: "Test suite not found." }, { status: 404 });

  let payload: z.infer<typeof bodySchema>;
  try {
    payload = bodySchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request.", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to remove test cases." }, { status: 500 });
  }

  await db.testSuiteCase.deleteMany({
    where: { suiteId: id, testCaseId: { in: payload.test_case_ids } },
  });

  await db.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });

  const full = await fetchSuiteWithCases(id);
  return NextResponse.json({ test_suite: formatSuiteWithCases(full!) });
}
