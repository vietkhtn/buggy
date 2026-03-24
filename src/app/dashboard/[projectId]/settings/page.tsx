import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { userHasProjectAccess } from "@/lib/projects";
import { SettingsPanel } from "@/components/settings-panel";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { projectId } = await params;

  if (!(await userHasProjectAccess(session.user.id, projectId))) {
    notFound();
  }

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, description: true, testCasePrefix: true },
  });

  if (!project) notFound();

  const apiKeys = await db.apiKey.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      createdAt: true,
      lastUsedAt: true,
    },
  });

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-8">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Configuration</p>
        <h1 className="mt-0.5 text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage project details, API keys, and integrations.
        </p>
      </header>

      <SettingsPanel
        projectId={project.id}
        projectName={project.name}
        projectDescription={project.description ?? ""}
        testCasePrefix={project.testCasePrefix}
        apiKeys={
          apiKeys as Array<{
            id: string;
            name: string;
            keyPrefix: string;
            createdAt: Date;
            lastUsedAt: Date | null;
          }>
        }
      />
    </main>
  );
}
