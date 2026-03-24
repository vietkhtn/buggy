import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveBasicAuth, generateApiKey, hashApiKey } from "@/lib/api-auth";
import { createProject } from "@/lib/projects";

const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional(),
  initials: z.string().trim().min(2).max(6).optional(),
});

export async function POST(request: Request) {
  const user = await resolveBasicAuth(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });

  let payload: z.infer<typeof createProjectSchema>;
  try {
    payload = createProjectSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request.", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to create project." }, { status: 500 });
  }

  try {
    const { rawKey, keyPrefix } = generateApiKey();
    const keyHash = await hashApiKey(rawKey);

    const project = await db.$transaction(async (tx) => {
      const proj = await createProject(user.id, payload, tx);
      await tx.apiKey.create({
        data: {
          projectId: proj.id,
          userId: user.id,
          name: "default",
          keyHash,
          keyPrefix,
          scope: "READ_WRITE",
        },
      });
      return proj;
    });

    return NextResponse.json(
      {
        project: {
          id: project.id,
          name: project.name,
          slug: project.slug,
          test_case_prefix: project.testCasePrefix,
        },
        api_key: rawKey,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Unable to create project." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const user = await resolveBasicAuth(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });

  const memberships = await db.projectMember.findMany({
    where: { userId: user.id },
    include: { project: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    projects: memberships.map((m) => ({
      id: m.project.id,
      name: m.project.name,
      slug: m.project.slug,
      test_case_prefix: m.project.testCasePrefix,
      created_at: m.project.createdAt,
    })),
  });
}
