import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { userHasProjectAccess } from "@/lib/projects";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { runId } = await params;

  const run = await db.testRun.findUnique({
    where: { id: runId },
    select: { projectId: true, status: true },
  });

  if (!run) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  if (!(await userHasProjectAccess(session.user.id, run.projectId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await db.testRun.update({
    where: { id: runId },
    data: { status: "COMPLETED", completedAt: new Date() },
    select: { id: true, status: true, completedAt: true },
  });

  return NextResponse.json(updated);
}
