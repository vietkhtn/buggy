import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-6 py-16 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.2),transparent_35%),radial-gradient(circle_at_75%_0%,rgba(16,185,129,0.24),transparent_30%),radial-gradient(circle_at_50%_90%,rgba(234,179,8,0.16),transparent_30%)]" />
      <main className="relative z-10 w-full max-w-4xl rounded-3xl border border-white/10 bg-slate-900/70 p-10 shadow-2xl backdrop-blur-xl sm:p-14">
        <p className="mb-4 inline-flex items-center rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.15em] text-cyan-200">
          Buggy Test Management
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
          Keep manual and automated testing in one place.
        </h1>
        <p className="mt-5 max-w-2xl text-base text-slate-300 sm:text-lg">
          Upload JUnit runs, execute manual test cases, detect flaky tests, and generate clear reports for stakeholders without spreadsheets.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-xl bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Create account
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl border border-slate-500/60 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-300"
          >
            Sign in
          </Link>
        </div>
      </main>
    </div>
  );
}
