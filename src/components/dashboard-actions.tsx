"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// ─── Types ───────────────────────────────────────────────────────────────────

type TestCaseItem = {
  id: string;
  title: string;
  priority: string;
  module: string | null;
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

type ApiKeyItem = {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
};

type Props = {
  projectId: string;
  testCases: TestCaseItem[];
  activeManualRun: ManualRun | null;
  apiKeys: ApiKeyItem[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

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

const PRIORITY_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  CRITICAL: "destructive",
  HIGH: "default",
  MEDIUM: "secondary",
  LOW: "outline",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardActions({ projectId, testCases, activeManualRun, apiKeys }: Props) {
  const router = useRouter();

  // Upload JUnit
  const [uploading, setUploading] = useState(false);

  // Create test case
  const [creatingCase, setCreatingCase] = useState(false);
  const [steps, setSteps] = useState([{ action: "", expectedResult: "" }]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Manual execution
  const [creatingRun, setCreatingRun] = useState(false);
  const [completingRun, setCompletingRun] = useState(false);
  const [updatingResultId, setUpdatingResultId] = useState<string | null>(null);
  const [selectedCases, setSelectedCases] = useState<string[]>([]);
  const [caseSearch, setCaseSearch] = useState("");
  const [runName, setRunName] = useState(`Manual Run ${new Date().toLocaleDateString()}`);

  // API key
  const [creatingKey, setCreatingKey] = useState(false);
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [keyConfirmed, setKeyConfirmed] = useState(false);

  const hasSelectedCases = useMemo(() => selectedCases.length > 0, [selectedCases]);

  const filteredCases = useMemo(() => {
    if (!caseSearch.trim()) return testCases;
    const q = caseSearch.toLowerCase();
    return testCases.filter(
      (tc) =>
        tc.title.toLowerCase().includes(q) ||
        (tc.module ?? "").toLowerCase().includes(q)
    );
  }, [testCases, caseSearch]);

  const pendingResults = useMemo(
    () => activeManualRun?.results.filter((r) => r.status === "BLOCKED") ?? [],
    [activeManualRun]
  );

  // ─── Upload JUnit XML ──────────────────────────────────────────────────────
  async function uploadJUnit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setUploading(true);

    const formData = new FormData(form);

    // Client-side file size guard (50 MB)
    const file = formData.get("file") as File | null;
    if (file && file.size > 50 * 1024 * 1024) {
      toast.error("File exceeds the 50 MB limit. Please split the XML and retry.");
      setUploading(false);
      return;
    }

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

  // ─── Create Manual Test Case ───────────────────────────────────────────────
  async function createTestCase(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      steps: steps.filter((s) => s.action.trim()),
    };

    if (!payload.steps.length) {
      toast.error("Add at least one step with an action.");
      setCreatingCase(false);
      return;
    }

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
      setSteps([{ action: "", expectedResult: "" }]);
      setShowAdvanced(false);
      router.refresh();
    } catch {
      toast.error("Network error — test case not saved.", { id: toastId });
    } finally {
      setCreatingCase(false);
    }
  }

  // ─── Create Manual Run ─────────────────────────────────────────────────────
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
          name: runName || `Manual Run ${new Date().toLocaleString()}`,
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

  // ─── Complete Manual Run ───────────────────────────────────────────────────
  async function completeManualRun() {
    if (!activeManualRun) return;
    setCompletingRun(true);

    try {
      const response = await fetch(`/api/manual-runs/${activeManualRun.id}`, {
        method: "PATCH",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? "Unable to complete run.");
        return;
      }

      toast.success("Run marked as complete.");
      router.refresh();
    } catch {
      toast.error("Network error — run not completed.");
    } finally {
      setCompletingRun(false);
    }
  }

  // ─── Update Manual Result ──────────────────────────────────────────────────
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

  // ─── Bulk pass all remaining (BLOCKED) results ─────────────────────────────
  async function passAllRemaining() {
    if (!activeManualRun || !pendingResults.length) return;

    const toastId = toast.loading(`Passing ${pendingResults.length} remaining…`);
    try {
      await Promise.all(
        pendingResults.map((r) =>
          fetch(`/api/manual-runs/${activeManualRun.id}/results/${r.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "PASSED" }),
          })
        )
      );
      toast.success("All remaining marked as passed.", { id: toastId });
      router.refresh();
    } catch {
      toast.error("Network error — some results may not have updated.", { id: toastId });
    }
  }

  // ─── Create API Key ────────────────────────────────────────────────────────
  async function createApiKey(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      toast.dismiss(toastId);
      setNewApiKey(payload.key);
      setKeyConfirmed(false);
      form.reset();
      router.refresh();
    } catch {
      toast.error("Network error — API key not generated.", { id: toastId });
    } finally {
      setCreatingKey(false);
    }
  }

  // ─── Revoke API Key ────────────────────────────────────────────────────────
  async function revokeApiKey(keyId: string) {
    setRevokingKeyId(keyId);

    try {
      const response = await fetch(`/api/api-keys/${keyId}`, { method: "DELETE" });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? "Unable to revoke key.");
        return;
      }

      toast.success("API key revoked.");
      router.refresh();
    } catch {
      toast.error("Network error — key not revoked.");
    } finally {
      setRevokingKeyId(null);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* API Key reveal modal */}
      <ApiKeyModal
        apiKey={newApiKey}
        confirmed={keyConfirmed}
        onConfirm={() => setKeyConfirmed(true)}
        onClose={() => setNewApiKey(null)}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Upload JUnit XML ── */}
        <Card id="upload-junit">
          <CardHeader className="pb-2">
            <h2 className="text-base font-semibold">Upload JUnit XML</h2>
            <p className="text-xs text-muted-foreground">Import automated test runs (max 50 MB).</p>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={uploadJUnit}>
              <div className="space-y-1">
                <Label htmlFor="junit-name">Run name</Label>
                <Input
                  id="junit-name"
                  name="name"
                  type="text"
                  defaultValue={`Run ${new Date().toLocaleDateString()}`}
                  placeholder="e.g. Nightly Build #42"
                />
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
        <Card id="create-test-case">
          <CardHeader className="pb-2">
            <h2 className="text-base font-semibold">Create Manual Test Case</h2>
            <p className="text-xs text-muted-foreground">Add a new test case to this project.</p>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={createTestCase}>
              <div className="space-y-1">
                <Label htmlFor="tc-title">Title *</Label>
                <Input
                  id="tc-title"
                  name="title"
                  type="text"
                  required
                  placeholder="e.g. User can log in"
                  maxLength={200}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="tc-module">Module</Label>
                  <Input id="tc-module" name="module" type="text" placeholder="e.g. Auth" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tc-description">Description</Label>
                  <Input
                    id="tc-description"
                    name="description"
                    type="text"
                    placeholder="Brief description"
                  />
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-2">
                <Label>Steps *</Label>
                {steps.map((step, index) => (
                  <div key={index} className="rounded-md border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        Step {index + 1}
                      </span>
                      {steps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setSteps((prev) => prev.filter((_, i) => i !== index))}
                          className="text-xs text-destructive hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <textarea
                      required
                      value={step.action}
                      onChange={(e) =>
                        setSteps((prev) =>
                          prev.map((s, i) => (i === index ? { ...s, action: e.target.value } : s))
                        )
                      }
                      placeholder="Action: e.g. Navigate to /login and submit valid credentials"
                      className="h-14 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <textarea
                      value={step.expectedResult}
                      onChange={(e) =>
                        setSteps((prev) =>
                          prev.map((s, i) =>
                            i === index ? { ...s, expectedResult: e.target.value } : s
                          )
                        )
                      }
                      placeholder="Expected result: e.g. User is redirected to /dashboard"
                      className="h-14 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setSteps((prev) => [...prev, { action: "", expectedResult: "" }])}
                  className="text-xs text-primary hover:underline"
                >
                  + Add another step
                </button>
              </div>

              {/* Advanced options toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
                >
                  {showAdvanced ? "Hide advanced options" : "Advanced options"}
                </button>
              </div>

              {showAdvanced && (
                <div className="space-y-3">
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
                    <Label htmlFor="tc-tags">Tags</Label>
                    <Input id="tc-tags" name="tags" type="text" placeholder="smoke, regression" />
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
                </div>
              )}

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
                <span className="font-medium">
                  {testCases.length} case{testCases.length !== 1 ? "s" : ""} available.
                </span>
              )}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {testCases.length > 0 && (
              <Input
                type="search"
                placeholder="Search by title or module…"
                value={caseSearch}
                onChange={(e) => setCaseSearch(e.target.value)}
              />
            )}

            <div className="relative max-h-48 overflow-auto rounded-md border border-border pr-1">
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
                      <span className="flex-1 truncate">{testCase.title}</span>
                      <span className="flex shrink-0 items-center gap-1">
                        {testCase.module && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                            {testCase.module}
                          </span>
                        )}
                        <Badge
                          variant={PRIORITY_VARIANT[testCase.priority] ?? "outline"}
                          className="text-xs px-1 py-0"
                        >
                          {testCase.priority}
                        </Badge>
                      </span>
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

            <div className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="run-name">Run name</Label>
                <Input
                  id="run-name"
                  type="text"
                  value={runName}
                  onChange={(e) => setRunName(e.target.value)}
                  placeholder="e.g. Sprint 12 smoke test"
                />
              </div>
              <Button
                type="button"
                disabled={!hasSelectedCases || creatingRun}
                onClick={createManualRun}
                className="w-full"
              >
                {creatingRun ? "Creating run…" : "Start manual run"}
              </Button>
            </div>

            {/* ── Active Run Results ── */}
            {activeManualRun && (
              <div className="mt-2 space-y-3 rounded-lg border border-border bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Active run: {activeManualRun.name}
                  </p>
                  <div className="flex gap-2">
                    {pendingResults.length > 0 && (
                      <button
                        type="button"
                        onClick={passAllRemaining}
                        className="rounded-md border border-[var(--success)] px-2 py-1 text-xs text-[var(--success)] transition hover:bg-[var(--success)] hover:text-[var(--success-foreground)]"
                      >
                        Pass all remaining
                      </button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={completingRun}
                      onClick={completeManualRun}
                    >
                      {completingRun ? "Completing…" : "Mark as complete"}
                    </Button>
                  </div>
                </div>
                {activeManualRun.results.map((result) => (
                  <div key={result.id} className="rounded-lg border border-border bg-card p-3">
                    <p className="text-sm font-medium">{result.name}</p>
                    <div className="mt-2 flex gap-2">
                      {(["PASSED", "FAILED", "BLOCKED"] as const).map((status) => {
                        const isSelected = result.status === status;
                        const label =
                          status === "BLOCKED" ? (
                            <span title="Blocked: the test cannot be executed due to an external dependency or blocker.">
                              BLOCKED
                            </span>
                          ) : (
                            status
                          );
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
                            {label}
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

        {/* ── CI / CD API Key ── */}
        <Card>
          <CardHeader className="pb-2">
            <h2 className="text-base font-semibold">CI / CD API Key</h2>
            <p className="text-xs text-muted-foreground">
              Use with{" "}
              <code className="rounded bg-muted px-1 text-xs">POST /api/v1/runs</code>.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
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

            {/* Existing keys */}
            {apiKeys.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Active keys
                </p>
                {apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{key.name}</p>
                      <p className="text-xs text-muted-foreground">
                        <code>{key.keyPrefix}…</code>
                        {" · "}
                        Created {new Date(key.createdAt).toLocaleDateString()}
                        {key.lastUsedAt && (
                          <> · Last used {new Date(key.lastUsedAt).toLocaleDateString()}</>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={revokingKeyId === key.id}
                      onClick={() => revokeApiKey(key.id)}
                      className="ml-3 shrink-0 rounded-md border border-destructive px-2 py-1 text-xs text-destructive transition hover:bg-destructive hover:text-destructive-foreground disabled:opacity-60"
                    >
                      {revokingKeyId === key.id ? "Revoking…" : "Revoke"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// ─── API Key Reveal Modal ─────────────────────────────────────────────────────

function ApiKeyModal({
  apiKey,
  confirmed,
  onConfirm,
  onClose,
}: {
  apiKey: string | null;
  confirmed: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copyKey() {
    if (!apiKey) return;
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={!!apiKey} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>API key generated</DialogTitle>
          <DialogDescription>
            Copy this key now. It will not be shown again — if lost, you must revoke and
            regenerate it.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-border bg-muted p-3">
          <code className="break-all text-sm">{apiKey}</code>
        </div>
        <button
          type="button"
          onClick={copyKey}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted"
        >
          {copied ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
              </svg>
              Copy to clipboard
            </>
          )}
        </button>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => e.target.checked && onConfirm()}
            className="accent-primary"
          />
          I have saved this key in a safe place
        </label>
        <Button onClick={onClose} disabled={!confirmed} className="w-full">
          Done
        </Button>
      </DialogContent>
    </Dialog>
  );
}
