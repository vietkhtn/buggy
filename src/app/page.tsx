import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Upload, CheckSquare, Activity, Key } from "lucide-react";

export default async function Home() {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-white/8 bg-slate-950/85 px-6 py-0 backdrop-blur-xl sm:px-10">
        <div className="flex h-14 items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-400 text-[11px] font-bold text-slate-950">
            B
          </span>
          <span className="text-sm font-semibold tracking-tight">Buggy</span>
        </div>
        <div className="flex items-center gap-6">
          <a
            href="https://github.com/pdnhan/buggy"
            className="hidden text-sm text-slate-400 transition hover:text-slate-100 sm:block"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <Link
            href="/login"
            className="rounded-lg border border-white/15 px-3.5 py-1.5 text-sm font-medium transition hover:border-white/35"
          >
            Sign in
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden px-6 py-24 text-center sm:py-32 sm:px-10">
        {/* Background radial blobs */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: [
              "radial-gradient(ellipse 60% 40% at 20% 10%, rgba(34,211,238,0.18) 0%, transparent 60%)",
              "radial-gradient(ellipse 50% 35% at 80% 5%,  rgba(16,185,129,0.14) 0%, transparent 55%)",
              "radial-gradient(ellipse 40% 30% at 50% 95%, rgba(234,179,8,0.10) 0%, transparent 50%)",
            ].join(","),
          }}
        />

        <div className="relative mx-auto max-w-3xl">
          {/* Badge */}
          <p className="mb-7 inline-flex items-center gap-1.5 rounded-full border border-cyan-300/25 bg-cyan-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-200">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            Open source test management
          </p>

          {/* Headline */}
          <h1 className="text-balance text-5xl font-bold tracking-tight text-slate-50 sm:text-6xl">
            Ship with{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              confidence
            </span>
            .<br />
            Not spreadsheets.
          </h1>

          {/* Subtext */}
          <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-slate-400 sm:text-lg">
            Unified manual and automated testing. Upload JUnit results from CI,
            execute manual test cases, and catch flaky tests before your users do.
          </p>

          {/* CTAs */}
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-lg bg-cyan-400 px-6 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Create free account
            </Link>
            <a
              href="https://github.com/pdnhan/buggy"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg border border-white/15 px-6 py-2.5 text-sm font-medium transition hover:border-white/35"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      <hr className="border-white/6 mx-6 sm:mx-10" />

      {/* ── FEATURES ── */}
      <section className="mx-auto max-w-5xl px-6 py-20 sm:px-10">
        <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          Everything in one place
        </p>
        <h2 className="mb-12 text-center text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
          Built for teams that ship fast
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Upload,
              title: "JUnit import",
              description:
                "Upload XML reports from GitHub Actions, GitLab CI, or Jenkins in seconds.",
            },
            {
              icon: CheckSquare,
              title: "Manual test runs",
              description:
                "Track PASS / FAIL / BLOCKED with expected vs. actual results and full history.",
            },
            {
              icon: Activity,
              title: "Flaky detection",
              description:
                "Automatically surface tests that flip between pass and fail across recent runs.",
            },
            {
              icon: Key,
              title: "CI/CD API",
              description:
                "Push results with a single API key. Full REST API for projects, suites, and runs.",
            },
          ].map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-xl border border-white/7 bg-white/3 p-5 transition hover:border-white/14 hover:bg-white/5"
            >
              <span className="mb-3.5 flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 bg-white/5">
                <Icon className="h-4 w-4 text-cyan-400" strokeWidth={1.5} />
              </span>
              <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <hr className="border-white/6 mx-6 sm:mx-10" />

      {/* ── API STRIP ── */}
      <section className="mx-auto max-w-4xl px-6 py-20 sm:px-10">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          {/* Left: copy */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
              Integrate in minutes,
              <br />
              not days.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              One API key. Push test results from any pipeline directly to
              Buggy. Pull structured reports without touching the UI.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                "GitHub Actions",
                "GitLab CI",
                "Jenkins",
                "CircleCI",
                "+ any HTTP client",
              ].map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-white/10 bg-white/3 px-2.5 py-1 text-xs text-slate-400"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Right: code block */}
          <div className="overflow-hidden rounded-xl border border-white/10 bg-black/35">
            {/* Terminal header */}
            <div className="flex items-center justify-between border-b border-white/6 bg-white/3 px-4 py-2.5">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/50" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/50" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-500/50" />
              </div>
              <span className="font-mono text-[11px] text-slate-600">
                push-results.sh
              </span>
            </div>
            {/* Code */}
            <pre className="overflow-x-auto p-4 font-mono text-[12px] leading-6 text-slate-400">
              <span className="text-slate-600">{`# Push JUnit results from CI\n`}</span>
              <span className="text-cyan-400">curl</span>
              {` -X POST https://your-instance/api/v1/runs \\\n`}
              {"  "}
              <span className="text-cyan-400">-H</span>
              {` `}
              <span className="text-emerald-400">{`"Authorization: Bearer itgr_abc123..."`}</span>
              {` \\\n`}
              {"  "}
              <span className="text-cyan-400">-F</span>
              {` `}
              <span className="text-emerald-400">{`"junit_xml=@test-results.xml"`}</span>
              {`\n\n`}
              <span className="text-slate-600">{`# Response\n`}</span>
              {`{ `}
              <span className="text-emerald-400">&quot;run_id&quot;</span>
              {`: `}
              <span className="text-emerald-400">&quot;clxyz...&quot;</span>
              {`, `}
              <span className="text-emerald-400">&quot;status&quot;</span>
              {`: `}
              <span className="text-emerald-400">&quot;COMPLETED&quot;</span>
              {`,\n  `}
              <span className="text-emerald-400">&quot;summary&quot;</span>
              {`: { `}
              <span className="text-emerald-400">&quot;passed&quot;</span>
              {`: `}
              <span className="text-cyan-400">47</span>
              {`, `}
              <span className="text-emerald-400">&quot;failed&quot;</span>
              {`: `}
              <span className="text-cyan-400">2</span>
              {` } }`}
            </pre>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/6 px-6 py-6 sm:px-10">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="flex h-4 w-4 items-center justify-center rounded bg-cyan-400 text-[8px] font-bold text-slate-950">
              B
            </span>
            Buggy &mdash; MIT License
          </div>
          <div className="flex gap-5">
            {[
              {
                label: "GitHub",
                href: "https://github.com/pdnhan/buggy",
              },
              { label: "Docs", href: "#" },
              { label: "API reference", href: "#" },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="text-xs text-slate-600 transition hover:text-slate-400"
                target={href.startsWith("http") ? "_blank" : undefined}
                rel={
                  href.startsWith("http") ? "noopener noreferrer" : undefined
                }
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
