export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { userIsProjectAdmin } from "@/lib/projects";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;

  if (!(await userIsProjectAdmin(session.user.id, projectId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const raw = await db.projectMember.findMany({
    where: { projectId },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  const members = raw.map((m) => ({
    userId: m.userId,
    name: m.user.name,
    email: m.user.email,
    role: m.role,
    createdAt: m.createdAt,
  }));

  return NextResponse.json({ members });
}

const addMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;

  if (!(await userIsProjectAdmin(session.user.id, projectId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = addMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const { userId, role } = parsed.data;

  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const existing = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (existing) {
    return NextResponse.json({ error: "already_a_member" }, { status: 409 });
  }

  await db.$transaction([
    db.projectMember.create({ data: { projectId, userId, role } }),
    db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "member_add",
        targetId: userId,
        metadata: { projectId, role },
      },
    }),
  ]);

  return NextResponse.json({ ok: true }, { status: 201 });
}
