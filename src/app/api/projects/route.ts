import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getUserProjects, createProject } from "@/lib/projects";

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional(),
  initials: z
    .string()
    .trim()
    .min(2)
    .max(6)
    .regex(/^[A-Z0-9]+$/i, { message: "Initials must be alphanumeric." })
    .optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await getUserProjects(session.user.id);
  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const payload = createSchema.parse(await request.json());
    const project = await createProject(session.user.id, payload);
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload.", issues: error.issues }, { status: 400 });
    }
    console.error("[POST /api/projects]", error);
    return NextResponse.json({ error: "Unable to create project." }, { status: 500 });
  }
}
