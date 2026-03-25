"use client";

import { useActionState } from "react";
import { setupAction } from "./actions";

const BuggyLogo = () => (
  <div className="mb-8 flex items-center gap-2">
    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground">
      <svg
        className="h-4 w-4 text-background"
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
);

export default function SetupPage() {
  const [state, action, isPending] = useActionState(setupAction, null);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-6 py-12">
      <BuggyLogo />

      <div className="flex gap-8">
        {/* Step tracker */}
        <ol className="hidden shrink-0 flex-col gap-4 pt-1 sm:flex" style={{ width: 180 }}>
          <li className="flex items-center gap-2 text-sm font-medium text-foreground">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-xs text-background">
              1
            </span>
            Create account
          </li>
          <li className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-xs">
              2
            </span>
            Configure workspace
          </li>
        </ol>

        {/* Form */}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold">Set up your Buggy workspace</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your admin account. No one else can register until this is
            complete.{" "}
            {/* Upgrade note for existing deployments */}
            If your workspace already has users, the first person to complete
            this form becomes workspace admin.
          </p>

          {state?.error && (
            <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </div>
          )}

          <form action={action} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium" htmlFor="name">
                Full name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                disabled={isPending}
                aria-describedby={state?.errors?.name ? "name-error" : undefined}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 disabled:opacity-60"
              />
              {state?.errors?.name && (
                <p id="name-error" className="mt-1 text-sm text-destructive">
                  {state.errors.name[0]}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                disabled={isPending}
                aria-describedby={state?.errors?.email ? "email-error" : undefined}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 disabled:opacity-60"
              />
              {state?.errors?.email && (
                <p id="email-error" className="mt-1 text-sm text-destructive">
                  {state.errors.email[0]}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                disabled={isPending}
                aria-describedby={state?.errors?.password ? "password-error" : undefined}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 disabled:opacity-60"
              />
              <p className="mt-1 text-xs text-muted-foreground">Minimum 8 characters</p>
              {state?.errors?.password && (
                <p id="password-error" className="mt-1 text-sm text-destructive">
                  {state.errors.password[0]}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending}
              aria-busy={isPending}
              className="w-full rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Creating account…" : "Create admin account"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
