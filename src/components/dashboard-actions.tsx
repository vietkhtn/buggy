"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type TestCaseItem = {
  id: string;
  title: string;
};

type ManualResult = {
  id: string;
  name: string;
  status: "PASSED" | "FAILED" | "SKIPPED" | "ERROR" | "BLOCKED";
};

type ManualRun = {
  id: string;
  name: string;
  status: string;
  results: ManualResult[];
};

type Props = {
  projectId: string;
  testCases: TestCaseItem[];
  activeManualRun: ManualRun | null;
};

const STATUS_STYLES: Record<"PASSED" | "FAILED" | "BLOCKED", string> = {
  PASSED:
    "border-[var(--success)] bg-[oklch(from_var(--success)_l_c_h_/_0.10)] text-[var(--success)] font-semibold",
  FAILED:
    "border-destructive bg-[oklch(from_var(--destructive)_l_c_h_/_0.10)] text-destructive font-semibold",
  BLOCKED:
    "border-[var(--warning)] bg-[oklch(from_var(--warning)_l_c_h_/_0.10)] text-[var(--warning-foreground)] font-semibold",
};

const STATUS_SELECTED_STYLES: Record<"PASSED" | "FAILED" | "BLOCKED", string> = {
  PASSED: "bg-[var(--success)] text-[var(--success-foreground)] border-[var(--success)]",
  FAILED: "bg-destructive text-destructive-foreground border-destructive",
  BLOCKED: "bg-[var(--warning)] text-[var(--warning-foreground)] border-[var(--warning)]",
};

export function DashboardActions({ projectId, testCases, activeManualRun }: Props) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [creatingCase, setCreatingCase] = useState(false);
  const [creatingRun, setCreatingRun] = useState(false);
  const [creatingKey, setCreatingKey] = useState(false);
  const [updatingResultId, setUpdatingResultId] = useState<string | null>(null);
  const [selectedCases, setSelectedCases] = useState<string[]>([]);
  const [caseSearch, setCaseSearch] = useState("");

  const hasSelectedCases = useMemo(() => selectedCases.length > 0, [selectedCases]);

  // Filter test cases by search query for the manual execution selector.
  // Works efficiently for up to 10 000 test cases via a single .filter() pass.
  const filteredCases = useMemo(() => {
    if (!caseSearch.trim()) return testCases;
    const q = caseSearch.toLowerCase();
    return testCases.filter((tc) => tc.title.toLowerCase().includes(q));
  }, [testCases, caseSearch]);

  // ─── Upload JUnit XML ─────────────────────────────────────────────────────
  async function uploadJUnit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Cache the form ref before any awaits — currentTarget becomes null after the
    // synchronous event handler frame completes.
    const form = event.currentTarget;
    setUploading(true);

    const formData = new FormData(form);
    formData.set("projectId", projectId);

    const toastId = toast.loading("Importing JUnit XML…");

    try {
      const response = await fetch("/api/runs/junit", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        toast.error(payload.error ?? "JUnit upload failed.", { id: toastId });
        return;
      }

      toast.success("Run imported successfully.", { id: toastId });
      form.reset();
      router.refresh();
    } catch {
      toast.error("Network error — could not upload file.", { id: toastId });
    } finally {
      setUploading(false);
    }
  }

  // ─── Create Manual Test Case ──────────────────────────────────────────────
  async function createTestCase(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Capture the form reference before any awaits (fixes the null currentTarget bug).
    const form = event.currentTarget;
    setCreatingCase(true);

    const formData = new FormData(form);
    const payload = {
      projectId,
      title: String(formData.get("title") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim() || undefined,
      preconditions: String(formData.get("preconditions") ?? "").trim() || undefined,
      moduleName: String(formData.get("module") ?? "").trim() || undefined,
      tags: String(formData.get("tags") ?? "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
      priority: String(formData.get("priority") ?? "MEDIUM"),
      status: String(formData.get("status") ?? "ACTIVE"),
      steps: [
        {
          action: String(formData.get("action") ?? "").trim(),
          expectedResult: String(formData.get("expected") ?? "").trim(),
        },
      ],
    };

    const toastId = toast.loading("Saving test case…");

    try {
      const response = await fetch("/api/test-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? "Unable to create test case.", { id: toastId });
        return;
      }

      toast.success("Test case created.", { id: toastId });
      form.reset();
      router.refresh();
    } catch {
      toast.error("Network error — test case not saved.", { id: toastId });
    } finally {
      setCreatingCase(false);
    }
  }

  // ─── Create Manual Run ────────────────────────────────────────────────────
  async function createManualRun() {
    if (!hasSelectedCases) return;

    setCreatingRun(true);
    const toastId = toast.loading("Starting manual run…");

    try {
      const response = await fetch("/api/manual-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          name: `Manual Run ${new Date().toLocaleString()}`,
          testCaseIds: selectedCases,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? "Unable to create manual run.", { id: toastId });
        return;
      }

      toast.success("Manual run started.", { id: toastId });
      setSelectedCases([]);
      router.refresh();
    } catch {
      toast.error("Network error — run not started.", { id: toastId });
    } finally {
      setCreatingRun(false);
    }
  }

  // ─── Update Manual Result ─────────────────────────────────────────────────
  async function updateManualResult(resultId: string, status: "PASSED" | "FAILED" | "BLOCKED") {
    if (!activeManualRun) return;
    setUpdatingResultId(resultId);

    try {
      const response = await fetch(
        `/api/manual-runs/${activeManualRun.id}/results/${resultId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? "Unable to update result.");
        return;
      }

      router.refresh();
    } catch {
      toast.error("Network error — result not updated.");
    } finally {
      setUpdatingResultId(null);
    }
  }

  // ─── Create API Key ───────────────────────────────────────────────────────
  async function createApiKey(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Capture the form reference before any awaits.
    const form = event.currentTarget;
    setCreatingKey(true);

    const formData = new FormData(form);
    const name = String(formData.get("apiKeyName") ?? "").trim();
    const toastId = toast.loading("Generating API key…");

    try {
      const response = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, name }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? "Unable to create API key.", { id: toastId });
        return;
      }

      const payload = (await response.json()) as { key: string };
      toast.success(
        `API key created. Copy it now — it will not be shown again:\n${payload.key}`,
        { id: toastId, duration: 20_000 }
      );
      form.reset();
      router.refresh();
    } catch {
      toast.error("Network error — API key not generated.", { id: toastId });
    } finally {
      setCreatingKey(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* ── Upload JUnit XML ── */}
      <Card>
        <CardHeader className="pb-2">
          <h2 className="text-base font-semibold">Upload JUnit XML</h2>
          <p className="text-xs text-muted-foreground">Import automated test runs (max 50 MB).</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={uploadJUnit}>
            <div className="space-y-1">
              <Label htmlFor="junit-name">Run name</Label>
              <Input id="junit-name" name="name" type="text" placeholder="e.g. Nightly Build #42" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="junit-file">JUnit XML file</Label>
              <Input
                id="junit-file"
                name="file"
                type="file"
                required
                accept=".xml,text/xml,application/xml"
              />
            </div>
            <Button type="submit" disabled={uploading} className="w-full">
              {uploading ? "Uploading…" : "Import run"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ── Create Manual Test Case ── */}
      <Card>
        <CardHeader className="pb-2">
          <h2 className="text-base font-semibold">Create Manual Test Case</h2>
          <p className="text-xs text-muted-foreground">Add a new test case to this project.</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={createTestCase}>
            <div className="space-y-1">
              <Label htmlFor="tc-title">Title *</Label>
              <Input id="tc-title" name="title" type="text" required placeholder="e.g. User can log in" maxLength={200} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="tc-module">Module</Label>
                <Input id="tc-module" name="module" type="text" placeholder="e.g. Auth" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tc-tags">Tags</Label>
                <Input id="tc-tags" name="tags" type="text" placeholder="smoke, regression" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="tc-priority">Priority</Label>
                <select
                  id="tc-priority"
                  name="priority"
                  defaultValue="MEDIUM"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="tc-status">Status</Label>
                <select
                  id="tc-status"
                  name="status"
                  defaultValue="ACTIVE"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="DRAFT">Draft</option>
                  <option value="DEPRECATED">Deprecated</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="tc-preconditions">Preconditions</Label>
              <textarea
                id="tc-preconditions"
                name="preconditions"
                placeholder="e.g. User must be registered"
                className="h-14 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tc-action">Step action *</Label>
              <textarea
                id="tc-action"
                name="action"
                required
                placeholder="e.g. Navigate to /login and submit valid credentials"
                className="h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tc-expected">Expected result *</Label>
              <textarea
                id="tc-expected"
                name="expected"
                required
                placeholder="e.g. User is redirected to /dashboard"
                className="h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <Button type="submit" disabled={creatingCase} className="w-full">
              {creatingCase ? "Saving…" : "Create test case"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ── Manual Execution ── */}
      <Card>
        <CardHeader className="pb-2">
          <h2 className="text-base font-semibold">Manual Execution</h2>
          <p className="text-xs text-muted-foreground">
            Select test cases and launch a run.{" "}
            {testCases.length > 0 && (
              <span className="font-medium">{testCases.length} case{testCases.length !== 1 ? "s" : ""} available.</span>
            )}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Search — handles up to 10 000 test cases via client-side filter */}
          {testCases.length > 0 && (
            <Input
              type="search"
              placeholder="Search test cases…"
              value={caseSearch}
              onChange={(e) => setCaseSearch(e.target.value)}
            />
          )}

          <div className="relative max-h-48 overflow-auto rounded-md border border-border pr-1">
            {/* Fade hint indicating more content below */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-card to-transparent" />
            <div className="space-y-1 p-2">
              {filteredCases.map((testCase) => {
                const selected = selectedCases.includes(testCase.id);
                return (
                  <label
                    key={testCase.id}
                    className="flex cursor-pointer items-center gap-2 rounded-sm px-1 py-1 text-sm hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      className="accent-[var(--info)]"
                      checked={selected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCases((cur) => [...cur, testCase.id]);
                        } else {
                          setSelectedCases((cur) => cur.filter((id) => id !== testCase.id));
                        }
                      }}
                    />
                    <span className="truncate">{testCase.title}</span>
                  </label>
                );
              })}
              {filteredCases.length === 0 && (
                <p className="px-1 py-2 text-sm text-muted-foreground">
                  {testCases.length === 0
                    ? "Create test cases first."
                    : "No test cases match your search."}
                </p>
              )}
            </div>
          </div>

          {selectedCases.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {selectedCases.length} case{selectedCases.length !== 1 ? "s" : ""} selected
            </p>
          )}

          <Button
            type="button"
            disabled={!hasSelectedCases || creatingRun}
            onClick={createManualRun}
            className="w-full"
          >
            {creatingRun ? "Creating run…" : "Start manual run"}
          </Button>

          {/* ── Active Run Results ── */}
          {activeManualRun && (
            <div className="mt-2 space-y-2 border-t border-border pt-4">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Active run: {activeManualRun.name}
              </p>
              {activeManualRun.results.map((result) => (
                <div key={result.id} className="rounded-lg border border-border p-3">
                  <p className="text-sm font-medium">{result.name}</p>
                  <div className="mt-2 flex gap-2">
                    {(["PASSED", "FAILED", "BLOCKED"] as const).map((status) => {
                      const isSelected = result.status === status;
                      return (
                        <button
                          key={status}
                          type="button"
                          disabled={updatingResultId === result.id}
                          onClick={() => updateManualResult(result.id, status)}
                          className={`rounded-md border px-2 py-1 text-xs transition-colors disabled:opacity-60 ${
                            isSelected
                              ? STATUS_SELECTED_STYLES[status]
                              : STATUS_STYLES[status]
                          }`}
                        >
                          {status}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── CI API Key ── */}
      <Card>
        <CardHeader className="pb-2">
          <h2 className="text-base font-semibold">CI / CD API Key</h2>
          <p className="text-xs text-muted-foreground">
            Use with <code className="rounded bg-muted px-1 text-xs">POST /api/v1/runs</code>.
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={createApiKey}>
            <div className="space-y-1">
              <Label htmlFor="api-key-name">Key name</Label>
              <Input
                id="api-key-name"
                type="text"
                name="apiKeyName"
                required
                placeholder="e.g. GitHub Actions"
              />
            </div>
            <Button type="submit" disabled={creatingKey} className="w-full">
              {creatingKey ? "Generating…" : "Generate API key"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
