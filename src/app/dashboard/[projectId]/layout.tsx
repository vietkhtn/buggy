import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { userHasProjectAccess } from "@/lib/projects";
import { DashboardNav } from "@/components/dashboard-nav";
import { CopyProjectId } from "@/components/copy-project-id";
import { LogoutButton } from "@/components/logout-button";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
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
    select: { id: true, name: true, testCasePrefix: true },
  });

  if (!project) notFound();

  return (
    <div className="flex min-h-screen">
      {/* ── Sidebar ── */}
      <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar">
        {/* Brand */}
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

          {/* Project badge */}
          <Link
            href="/dashboard"
            className="group flex items-center gap-2.5 rounded-lg px-1 py-1 transition hover:bg-sidebar-accent/50"
            title="All projects"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-xs font-bold text-primary">
              {project.testCasePrefix.slice(0, 3)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-sidebar-foreground" title={project.name}>
                {project.name}
              </p>
            </div>
            <svg
              className="ml-auto h-3.5 w-3.5 shrink-0 text-sidebar-foreground/30 group-hover:text-sidebar-foreground/60 transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
            </svg>
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 py-3">
          <DashboardNav projectId={project.id} />
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
