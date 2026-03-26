export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { userIsProjectAdmin } from "@/lib/projects";

const patchSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; userId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, userId } = await params;

  if (!(await userIsProjectAdmin(session.user.id, projectId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const { role: newRole } = parsed.data;

  const target = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { role: true },
  });
  if (!target) return NextResponse.json({ error: "Member not found." }, { status: 404 });

  // Guard: cannot demote the last project admin
  if (target.role === "ADMIN" && newRole !== "ADMIN") {
    const otherAdminCount = await db.projectMember.count({
      where: { projectId, role: "ADMIN", userId: { not: userId } },
    });
    if (otherAdminCount === 0) {
      return NextResponse.json(
        { error: "Cannot demote the last project admin." },
        { status: 400 }
      );
    }
  }

  await db.$transaction([
    db.projectMember.update({
      where: { projectId_userId: { projectId, userId } },
      data: { role: newRole },
    }),
    db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "member_role_change",
        targetId: userId,
        metadata: { projectId, previousRole: target.role, newRole },
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; userId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, userId } = await params;

  if (!(await userIsProjectAdmin(session.user.id, projectId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const target = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { role: true },
  });
  if (!target) return NextResponse.json({ error: "Member not found." }, { status: 404 });

  // Guard: cannot remove self if last project admin
  if (userId === session.user.id && target.role === "ADMIN") {
    const otherAdminCount = await db.projectMember.count({
      where: { projectId, role: "ADMIN", userId: { not: userId } },
    });
    if (otherAdminCount === 0) {
      return NextResponse.json(
        { error: "Cannot remove the last project admin." },
        { status: 400 }
      );
    }
  }

  await db.$transaction([
    db.apiKey.deleteMany({ where: { projectId, userId } }),
    db.projectMember.delete({
      where: { projectId_userId: { projectId, userId } },
    }),
    db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "member_remove",
        targetId: userId,
        metadata: { projectId },
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
