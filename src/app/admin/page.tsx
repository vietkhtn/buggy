import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AdminUsersClient } from "./users-client";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!session.user.isWorkspaceAdmin) redirect("/dashboard");

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

  return (
    <AdminUsersClient
      initialUsers={users}
      currentUserId={session.user.id}
    />
  );
}
