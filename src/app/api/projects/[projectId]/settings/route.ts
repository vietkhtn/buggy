import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { userHasProjectAccess } from "@/lib/projects";
import { sanitizeTestCasePrefix } from "@/lib/test-case-ids";

const updateSchema = z.object({
  testCasePrefix: z
    .string()
    .trim()
    .min(2)
    .max(6)
    .regex(/^[A-Z0-9]+$/i, { message: "Prefix must be alphanumeric." }),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;

  if (!(await userHasProjectAccess(session.user.id, projectId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const payload = updateSchema.parse(await request.json());
    const normalized = sanitizeTestCasePrefix(payload.testCasePrefix);

    const project = await db.project.update({
      where: { id: projectId },
      data: { testCasePrefix: normalized },
      select: { id: true, testCasePrefix: true },
    });

    return NextResponse.json({ project });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload.", issues: error.issues }, { status: 400 });
    }
    console.error("[PATCH /api/projects/[id]/settings]", error);
    return NextResponse.json({ error: "Unable to update settings." }, { status: 500 });
  }
}
