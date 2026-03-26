import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const patchSchema = z.object({
  isWorkspaceAdmin: z.boolean(),
});

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.isWorkspaceAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  if (id === session.user.id) {
    return NextResponse.json({ error: "Cannot remove yourself." }, { status: 400 });
  }

  const target = await db.user.findUnique({ where: { id }, select: { isWorkspaceAdmin: true } });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

  if (target.isWorkspaceAdmin) {
    const adminCount = await db.user.count({ where: { isWorkspaceAdmin: true } });
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Cannot remove the last workspace admin." },
        { status: 400 }
      );
    }
  }

  await db.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.isWorkspaceAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const target = await db.user.findUnique({ where: { id }, select: { isWorkspaceAdmin: true } });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

  // Guard: cannot demote the last workspace admin
  if (!parsed.data.isWorkspaceAdmin && target.isWorkspaceAdmin) {
    const adminCount = await db.user.count({ where: { isWorkspaceAdmin: true } });
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Cannot demote the last workspace admin." },
        { status: 400 }
      );
    }
  }

  const updated = await db.user.update({
    where: { id },
    data: { isWorkspaceAdmin: parsed.data.isWorkspaceAdmin },
    select: { id: true, isWorkspaceAdmin: true },
  });

  return NextResponse.json(updated);
}
