import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ensureProjectForUser } from "@/lib/projects";
import { SettingsPanel } from "@/components/settings-panel";

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const project = await ensureProjectForUser(session.user.id);

  const apiKeys = await db.apiKey.findMany({
    where: { projectId: project.id },
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
          Manage API keys and integrations for this project.
        </p>
      </header>

      <SettingsPanel
        projectId={project.id}
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
