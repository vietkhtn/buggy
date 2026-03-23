import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ensureProjectForUser, userHasProjectAccess } from "@/lib/projects";

const createKeySchema = z.object({
  projectId: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(120),
});

function generateApiKey() {
  const raw = randomBytes(24).toString("hex");
  return `buggy_${raw}`;
}

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const requestedProjectId = searchParams.get("projectId");
  const project = requestedProjectId
    ? { id: requestedProjectId }
    : await ensureProjectForUser(session.user.id);

  if (!(await userHasProjectAccess(session.user.id, project.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const apiKeys = await db.apiKey.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
    },
  });

  return NextResponse.json({ apiKeys, projectId: project.id });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = createKeySchema.parse(await request.json());
    const project = payload.projectId
      ? { id: payload.projectId }
      : await ensureProjectForUser(session.user.id);

    if (!(await userHasProjectAccess(session.user.id, project.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rawKey = generateApiKey();
    const keyHash = await bcrypt.hash(rawKey, 12);
    const keyPrefix = rawKey.slice(0, 8);

    await db.apiKey.create({
      data: {
        projectId: project.id,
        userId: session.user.id,
        name: payload.name,
        keyHash,
        keyPrefix,
      },
    });

    return NextResponse.json({ key: rawKey, keyPrefix }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid API key payload.", issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Unable to create API key." }, { status: 500 });
  }
}
