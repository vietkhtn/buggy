import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveApiKey } from "@/lib/api-auth";

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(2000).optional(),
  test_case_ids: z.array(z.string().min(1)).default([]),
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

export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.startsWith("Bearer ")
    ? request.headers.get("authorization")!.slice(7).trim()
    : "";
  if (!token) return NextResponse.json({ error: "Missing Bearer API key." }, { status: 401 });

  const apiKey = await resolveApiKey(token);
  if (!apiKey) return NextResponse.json({ error: "Invalid API key." }, { status: 401 });

  const suites = await db.testSuite.findMany({
    where: { projectId: apiKey.projectId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { cases: true } } },
  });

  await db.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });

  return NextResponse.json({
    test_suites: suites.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      case_count: s._count.cases,
      created_at: s.createdAt,
    })),
    project_id: apiKey.projectId,
  });
}

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.startsWith("Bearer ")
    ? request.headers.get("authorization")!.slice(7).trim()
    : "";
  if (!token) return NextResponse.json({ error: "Missing Bearer API key." }, { status: 401 });

  const apiKey = await resolveApiKey(token);
  if (!apiKey) return NextResponse.json({ error: "Invalid API key." }, { status: 401 });

  if (apiKey.scope === "READ_ONLY") {
    return NextResponse.json({ error: "This API key is read-only." }, { status: 403 });
  }

  let payload: z.infer<typeof createSchema>;
  try {
    payload = createSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request.", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to create test suite." }, { status: 500 });
  }

  // Cross-project ownership check
  if (payload.test_case_ids.length > 0) {
    const count = await db.testCase.count({
      where: { id: { in: payload.test_case_ids }, projectId: apiKey.projectId },
    });
    if (count !== payload.test_case_ids.length) {
      return NextResponse.json(
        { error: "One or more test case IDs do not belong to this project." },
        { status: 422 }
      );
    }
  }

  try {
    const suite = await db.testSuite.create({
      data: {
        projectId: apiKey.projectId,
        name: payload.name,
        description: payload.description,
        cases: payload.test_case_ids.length > 0
          ? {
              createMany: {
                data: payload.test_case_ids.map((tcId, i) => ({
                  testCaseId: tcId,
                  order: i,
                })),
                skipDuplicates: true,
              },
            }
          : undefined,
      },
    });

    await db.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });

    const full = await fetchSuiteWithCases(suite.id);
    return NextResponse.json({ test_suite: formatSuiteWithCases(full!) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create test suite." }, { status: 500 });
  }
}
