import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ensureProjectForUser, userHasProjectAccess } from "@/lib/projects";

const stepSchema = z.object({
  action: z.string().trim().min(1),
  expectedResult: z.string().trim().min(1),
});

const createTestCaseSchema = z.object({
  projectId: z.string().min(1).optional(),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(10_000).optional(),
  preconditions: z.string().max(10_000).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  moduleName: z.string().trim().min(1).max(120).optional(),
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  status: z.enum(["DRAFT", "ACTIVE", "DEPRECATED"]).default("DRAFT"),
  steps: z.array(stepSchema).min(1),
});

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const requestedProjectId = searchParams.get("projectId");
  const project = requestedProjectId
    ? { id: requestedProjectId }
    : await ensureProjectForUser(session.user.id);

  if (!(await userHasProjectAccess(session.user.id, project.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const testCases = await db.testCase.findMany({
    where: { projectId: project.id },
    include: {
      module: true,
      steps: {
        orderBy: { stepNumber: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ testCases, projectId: project.id });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = createTestCaseSchema.parse(await request.json());
    const project = payload.projectId
      ? { id: payload.projectId }
      : await ensureProjectForUser(session.user.id);

    if (!(await userHasProjectAccess(session.user.id, project.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const moduleRecord = payload.moduleName
      ? await db.module.upsert({
          where: {
            projectId_name: {
              projectId: project.id,
              name: payload.moduleName,
            },
          },
          update: {},
          create: {
            projectId: project.id,
            name: payload.moduleName,
          },
        })
      : null;

    const testCase = await db.testCase.create({
      data: {
        projectId: project.id,
        moduleId: moduleRecord?.id,
        title: payload.title,
        description: payload.description,
        preconditions: payload.preconditions,
        tags: payload.tags,
        priority: payload.priority,
        status: payload.status,
        steps: {
          create: payload.steps.map((step, index) => ({
            stepNumber: index + 1,
            action: step.action,
            expectedResult: step.expectedResult,
          })),
        },
      },
      include: {
        steps: {
          orderBy: { stepNumber: "asc" },
        },
        module: true,
      },
    });

    return NextResponse.json({ testCase }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid test case payload.", issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Unable to create test case." }, { status: 500 });
  }
}
