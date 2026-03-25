export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";

const changePasswordSchema = z.object({
  password: z.string().min(8).max(128),
});

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = changePasswordSchema.parse(await request.json());

    // Verify user still exists (guard against stale JWT)
    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: "Session invalid" }, { status: 401 });

    const passwordHash = await hashPassword(body.password);

    await db.user.update({
      where: { id: session.user.id },
      data: { password: passwordHash, mustChangePassword: false },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid password.", issues: error.issues },
        { status: 400 }
      );
    }
    console.error("Change password API error", error);
    return NextResponse.json({ error: "Unable to change password." }, { status: 500 });
  }
}
