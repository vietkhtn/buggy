import { hashPassword } from "@/lib/password";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getFeatureFlags } from "@/lib/feature-flags";

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(2).max(120).optional().or(z.literal("")),
});

export async function POST(request: Request) {
  const flags = await getFeatureFlags();
  if (!flags.openRegistration) {
    return NextResponse.json({ error: "Registration is not open." }, { status: 403 });
  }

  try {
    const body = registerSchema.parse(await request.json());
    const existing = await db.user.findUnique({ where: { email: body.email } });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(body.password);

    const user = await db.user.create({
      data: {
        email: body.email,
        name: body.name || undefined,
        password: passwordHash,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid registration payload.", issues: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "An account with this email already exists." },
          { status: 409 }
        );
      }

      if (error.code === "P2022") {
        return NextResponse.json(
          { error: "Database schema is out of date. Run 'npx prisma db push'." },
          { status: 500 }
        );
      }
    }

    console.error("Register API error", error);

    return NextResponse.json({ error: "Unable to register user." }, { status: 500 });
  }
}
