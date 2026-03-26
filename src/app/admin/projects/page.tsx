import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AdminProjectsClient } from "./projects-client";

export default async function AdminProjectsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!session.user.isWorkspaceAdmin) redirect("/dashboard");

  const projects = await db.project.findMany({
    select: {
      id: true,
      name: true,
      createdAt: true,
      _count: {
        select: { testRuns: true, members: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return <AdminProjectsClient initialProjects={projects} />;
}
