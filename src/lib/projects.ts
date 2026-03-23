import { randomUUID } from "node:crypto";
import { db } from "./db";
import { deriveTestCasePrefix } from "./test-case-ids";

function defaultProjectName(userName: string | null | undefined) {
  if (!userName?.trim()) return "My Project";
  return `${userName.split(" ")[0]}'s Project`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

export async function ensureProjectForUser(userId: string) {
  try {
    // First, check if user already has a project membership
    const existingMembership = await db.projectMember.findFirst({
      where: { userId },
      include: { project: true },
      orderBy: { createdAt: "asc" },
    });

    if (existingMembership) {
      return existingMembership.project;
    }

    // Verify user exists before proceeding
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    // If user doesn't exist, throw a descriptive error
    if (!user) {
      throw new Error(`User not found for ID: ${userId}. Cannot create project.`);
    }

    // Create default project for user
    const name = defaultProjectName(user.name);
    const slugBase = slugify(name) || "project";
    const prefix = deriveTestCasePrefix(name);

    return await db.project.create({
      data: {
        name,
        slug: `${slugBase}-${randomUUID().slice(0, 8)}`,
        testCasePrefix: prefix,
        members: {
          create: {
            userId: user.id, // Use verified user ID
            role: "ADMIN",
          },
        },
      },
    });
  } catch (error) {
    // Log error details for debugging
    console.error("Error in ensureProjectForUser:", {
      userId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    // Re-throw to let calling code handle it appropriately
    throw error;
  }
}

export async function userHasProjectAccess(userId: string, projectId: string) {
  const member = await db.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
  });

  return Boolean(member);
}
