"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function deriveInitials(name: string) {
  return name
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 6) || "TC";
}

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [initials, setInitials] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewInitials = initials || deriveInitials(name) || "TC";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          initials: initials.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Unable to create project.");
        return;
      }

      const { project } = await response.json() as { project: { id: string } };
      router.push(`/dashboard/${project.id}`);
    } catch {
      setError("Network error — project not created.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Projects
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-6 py-10">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">New</p>
          <h1 className="mt-0.5 text-2xl font-semibold">Create project</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A project groups your test cases, suites, and runs together.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Preview badge */}
          <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
              {previewInitials.slice(0, 3)}
            </div>
            <div>
              <p className="font-semibold">{name || "Project name"}</p>
              <p className="text-xs text-muted-foreground">
                Test case IDs: <code className="rounded bg-muted px-1">{previewInitials}-0001</code>
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="name">Project name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mobile App, Backend API"
              required
              maxLength={80}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this project covers…"
              maxLength={500}
              rows={3}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="initials">Initials / test case prefix</Label>
            <Input
              id="initials"
              value={initials}
              onChange={(e) => setInitials(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
              placeholder={deriveInitials(name) || "TC"}
              maxLength={6}
            />
            <p className="text-xs text-muted-foreground">
              2–6 alphanumeric characters. Leave blank to auto-derive from the project name.
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3">
            <Button type="submit" disabled={submitting || !name.trim()}>
              {submitting ? "Creating…" : "Create project"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
