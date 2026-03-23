import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";

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
  const existingMembership = await db.projectMember.findFirst({
    where: { userId },
    include: { project: true },
    orderBy: { createdAt: "asc" },
  });

  if (existingMembership) {
    return existingMembership.project;
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });

  const name = defaultProjectName(user?.name);
  const slugBase = slugify(name) || "project";

  return db.project.create({
    data: {
      name,
      slug: `${slugBase}-${randomUUID().slice(0, 8)}`,
      members: {
        create: {
          userId,
          role: "ADMIN",
        },
      },
    },
  });
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
