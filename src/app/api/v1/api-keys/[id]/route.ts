import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveBasicAuth } from "@/lib/api-auth";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveBasicAuth(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });

  const { id } = await params;

  // Find the key, verify user is a member of the key's project
  const apiKey = await db.apiKey.findFirst({
    where: {
      id,
      project: {
        members: { some: { userId: user.id } },
      },
    },
  });

  // Return 404 whether key doesn't exist or user doesn't have access (avoid leaking existence)
  if (!apiKey) return NextResponse.json({ error: "API key not found." }, { status: 404 });

  await db.apiKey.delete({ where: { id } });

  return NextResponse.json({ deleted: true });
}
