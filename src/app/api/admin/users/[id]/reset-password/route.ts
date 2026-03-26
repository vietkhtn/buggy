export const runtime = "nodejs";

import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.isWorkspaceAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  if (id === session.user.id) {
    return NextResponse.json(
      { error: "Cannot reset your own password via this endpoint." },
      { status: 400 }
    );
  }

  const target = await db.user.findUnique({ where: { id }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const tempPassword = randomBytes(16).toString("base64url");
  const passwordHash = await hashPassword(tempPassword);

  await db.$transaction([
    db.user.update({
      where: { id },
      data: { password: passwordHash, mustChangePassword: true },
    }),
    db.auditLog.create({
      data: { actorId: session.user.id, action: "password_reset", targetId: id },
    }),
  ]);

  return NextResponse.json({ tempPassword });
}
