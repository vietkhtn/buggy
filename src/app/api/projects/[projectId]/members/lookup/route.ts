export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { userIsProjectAdmin } from "@/lib/projects";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;

  if (!(await userIsProjectAdmin(session.user.id, projectId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const email = (searchParams.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "email query param required" }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true },
  });

  if (user) {
    return NextResponse.json({ found: true, user });
  }

  const settings = await db.workspaceSettings.findFirst();
  return NextResponse.json({ found: false, openRegistration: settings?.openRegistration ?? false });
}
