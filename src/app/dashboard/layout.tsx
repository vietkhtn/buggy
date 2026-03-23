import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ensureProjectForUser } from "@/lib/projects";
import { DashboardNav } from "@/components/dashboard-nav";
import { CopyProjectId } from "@/components/copy-project-id";
import { LogoutButton } from "@/components/logout-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const project = await ensureProjectForUser(session.user.id);

  return (
    <div className="flex min-h-screen">
      {/* ── Sidebar ── */}
      <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar">
        {/* Brand + project */}
        <div className="border-b border-sidebar-border px-4 py-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary">
              <svg
                className="h-3.5 w-3.5 text-primary-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <span className="text-sm font-bold tracking-tight text-sidebar-foreground">
              Buggy
            </span>
          </div>
          <p className="mb-0.5 text-[10px] font-medium uppercase tracking-widest text-sidebar-foreground/40">
            Project
          </p>
          <p
            className="truncate text-sm font-medium text-sidebar-foreground"
            title={project.name}
          >
            {project.name}
          </p>
        </div>

        {/* Navigation */}
        <div className="flex-1 py-3">
          <DashboardNav />
        </div>

        {/* Footer actions */}
        <div className="flex flex-col gap-2 border-t border-sidebar-border px-3 py-4">
          <CopyProjectId projectId={project.id} />
          <LogoutButton />
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="min-w-0 flex-1">
        {children}
      </div>
    </div>
  );
}
