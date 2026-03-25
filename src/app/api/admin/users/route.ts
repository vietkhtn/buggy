import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.isWorkspaceAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      isWorkspaceAdmin: true,
      createdAt: true,
      _count: { select: { projects: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(users);
}
