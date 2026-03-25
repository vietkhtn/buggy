import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { auth } from "@/auth";
import { ensureProjectForUser, getUserProjects } from "@/lib/projects";
import { LogoutButton } from "@/components/logout-button";
import { DashboardNotice } from "@/components/dashboard-notice";

export default async function ProjectsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Ensure the user has at least one project.
  // Returns null if the session user no longer exists in the DB (stale JWT).
  const ensured = await ensureProjectForUser(session.user.id);
  if (!ensured) {
    redirect("/login");
  }

  const projects = await getUserProjects(session.user.id);

  return (
    <div className="min-h-screen bg-background">
      <Suspense><DashboardNotice /></Suspense>
      {/* ── Top bar ── */}
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2">
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
            <span className="text-sm font-bold tracking-tight">Buggy</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Workspace</p>
            <h1 className="mt-0.5 text-2xl font-semibold">Projects</h1>
          </div>
          <Link
            href="/dashboard/new"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New project
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/${project.id}`}
              className="group flex flex-col rounded-xl border border-border bg-card p-5 transition hover:border-primary/50 hover:shadow-sm"
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                  {project.testCasePrefix.slice(0, 3)}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold group-hover:text-primary transition-colors">
                    {project.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{project.role}</p>
                </div>
              </div>
              {project.description && (
                <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                  {project.description}
                </p>
              )}
              <div className="mt-auto flex items-center gap-4 text-xs text-muted-foreground">
                <span>{project._count.testCases} test cases</span>
                <span>{project._count.members} {project._count.members === 1 ? "member" : "members"}</span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
