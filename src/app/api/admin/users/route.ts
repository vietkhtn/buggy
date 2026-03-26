import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";

export const runtime = "nodejs";

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

const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  name: z.string().trim().min(2).max(120).optional().or(z.literal("")),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.isWorkspaceAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = createUserSchema.parse(await request.json());
    const tempPassword = randomBytes(16).toString("base64url");
    const passwordHash = await hashPassword(tempPassword);

    const user = await db.user.create({
      data: {
        email: body.email,
        name: body.name || undefined,
        password: passwordHash,
        mustChangePassword: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        isWorkspaceAdmin: true,
        mustChangePassword: true,
        createdAt: true,
        _count: { select: { projects: true } },
      },
    });

    return NextResponse.json({ user, tempPassword }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request payload.", issues: error.issues },
        { status: 400 }
      );
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }
    console.error("Create user API error", error);
    return NextResponse.json({ error: "Unable to create user." }, { status: 500 });
  }
}
