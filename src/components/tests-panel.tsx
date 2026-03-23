"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

type TestCaseItem = {
  id: string;
  title: string;
  priority: string;
  module: string | null;
  status: string;
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

const CASE_STATUS_DOT: Record<string, string> = {
  ACTIVE: "bg-[var(--success)]",
  DRAFT: "bg-muted-foreground",
  DEPRECATED: "bg-[var(--warning)]",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function TestsPanel({ projectId, testCases, activeManualRun }: Props) {
  const router = useRouter();

  // Dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Create test case form
  const [creatingCase, setCreatingCase] = useState(false);
  const [steps, setSteps] = useState([{ action: "", expectedResult: "" }]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // All cases search
  const [caseSearch, setCaseSearch] = useState("");

  // Manual run
  const [selectedCases, setSelectedCases] = useState<string[]>([]);
  const [runCaseSearch, setRunCaseSearch] = useState("");
  const [runName, setRunName] = useState(`Manual Run ${new Date().toLocaleDateString()}`);
  const [creatingRun, setCreatingRun] = useState(false);
  const [completingRun, setCompletingRun] = useState(false);
  const [updatingResultId, setUpdatingResultId] = useState<string | null>(null);

  const filteredCases = useMemo(() => {
    if (!caseSearch.trim()) return testCases;
    const q = caseSearch.toLowerCase();
    return testCases.filter(
      (tc) => tc.title.toLowerCase().includes(q) || (tc.module ?? "").toLowerCase().includes(q)
    );
  }, [testCases, caseSearch]);

  const filteredRunCases = useMemo(() => {
    if (!runCaseSearch.trim()) return testCases;
    const q = runCaseSearch.toLowerCase();
    return testCases.filter(
      (tc) => tc.title.toLowerCase().includes(q) || (tc.module ?? "").toLowerCase().includes(q)
    );
  }, [testCases, runCaseSearch]);

  const pendingResults = useMemo(
    () => activeManualRun?.results.filter((r) => r.status === "BLOCKED") ?? [],
    [activeManualRun]
  );

  function resetCreateForm() {
    setSteps([{ action: "", expectedResult: "" }]);
    setShowAdvanced(false);
  }

  // ─── Create test case ───────────────────────────────────────────────────────

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
      resetCreateForm();
      setShowCreateDialog(false);
      router.refresh();
    } catch {
      toast.error("Network error — test case not saved.", { id: toastId });
    } finally {
      setCreatingCase(false);
    }
  }

  // ─── Manual run ─────────────────────────────────────────────────────────────

  async function createManualRun() {
    if (!selectedCases.length) return;
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

  async function completeManualRun() {
    if (!activeManualRun) return;
    setCompletingRun(true);

    try {
      const response = await fetch(`/api/manual-runs/${activeManualRun.id}`, { method: "PATCH" });

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

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Create test case dialog */}
      <Dialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) resetCreateForm();
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New test case</DialogTitle>
            <DialogDescription>Add a new test case to this project.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={createTestCase}>
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

            {/* Advanced toggle */}
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

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  resetCreateForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creatingCase}>
                {creatingCase ? "Saving…" : "Create test case"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Page header */}
      <header className="flex items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Test suite</p>
          <h1 className="text-2xl font-semibold mt-0.5">Test Cases</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {testCases.length === 0
              ? "No test cases yet — create your first one."
              : `${testCases.length} case${testCases.length !== 1 ? "s" : ""} in this project.`}
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New test case
        </Button>
      </header>

      {/* Tabs */}
      <Tabs defaultValue="cases">
        <TabsList className="mb-6">
          <TabsTrigger value="cases">
            All cases
            {testCases.length > 0 && (
              <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">
                {testCases.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="run">
            Manual run
            {activeManualRun && (
              <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-[var(--warning)]" aria-label="Active run" />
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── All cases tab ── */}
        <TabsContent value="cases">
          <div className="space-y-4">
            <Input
              type="search"
              placeholder="Search by title or module…"
              value={caseSearch}
              onChange={(e) => setCaseSearch(e.target.value)}
              className="max-w-sm"
            />

            {filteredCases.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center">
                {testCases.length === 0 ? (
                  <>
                    <p className="text-sm font-medium">No test cases yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Create your first test case to get started.
                    </p>
                    <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
                      New test case
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No test cases match your search.</p>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                        Title
                      </th>
                      <th className="hidden px-4 py-2.5 text-left text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground sm:table-cell">
                        Module
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                        Priority
                      </th>
                      <th className="hidden px-4 py-2.5 text-left text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground md:table-cell">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {filteredCases.map((tc) => (
                      <tr key={tc.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{tc.title}</td>
                        <td className="hidden px-4 py-3 sm:table-cell">
                          {tc.module ? (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                              {tc.module}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={PRIORITY_VARIANT[tc.priority] ?? "outline"}
                            className="text-xs"
                          >
                            {tc.priority}
                          </Badge>
                        </td>
                        <td className="hidden px-4 py-3 md:table-cell">
                          <span className="flex items-center gap-1.5">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${CASE_STATUS_DOT[tc.status] ?? "bg-muted-foreground"}`}
                            />
                            <span className="text-xs capitalize text-muted-foreground">
                              {tc.status.toLowerCase()}
                            </span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Manual run tab ── */}
        <TabsContent value="run">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Case selector + run controls */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold">Select test cases</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {testCases.length > 0
                    ? `${testCases.length} available`
                    : "No test cases yet — create some first."}
                </p>
              </div>

              {testCases.length > 0 && (
                <Input
                  type="search"
                  placeholder="Search…"
                  value={runCaseSearch}
                  onChange={(e) => setRunCaseSearch(e.target.value)}
                />
              )}

              <div className="relative max-h-56 overflow-auto rounded-lg border border-border">
                <div className="space-y-0.5 p-2">
                  {filteredRunCases.map((testCase) => {
                    const selected = selectedCases.includes(testCase.id);
                    return (
                      <label
                        key={testCase.id}
                        className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                      >
                        <input
                          type="checkbox"
                          className="accent-primary"
                          checked={selected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCases((cur) => [...cur, testCase.id]);
                            } else {
                              setSelectedCases((cur) =>
                                cur.filter((id) => id !== testCase.id)
                              );
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
                            className="px-1 py-0 text-xs"
                          >
                            {testCase.priority}
                          </Badge>
                        </span>
                      </label>
                    );
                  })}
                  {filteredRunCases.length === 0 && (
                    <p className="px-2 py-3 text-sm text-muted-foreground">
                      {testCases.length === 0 ? "No test cases yet." : "No matches."}
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
                disabled={!selectedCases.length || creatingRun}
                onClick={createManualRun}
                className="w-full"
              >
                {creatingRun ? "Creating run…" : "Start manual run"}
              </Button>
            </div>

            {/* Active run results */}
            <div>
              {activeManualRun ? (
                <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        Active run
                      </p>
                      <p className="mt-0.5 font-semibold">{activeManualRun.name}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {pendingResults.length > 0 && (
                        <button
                          type="button"
                          onClick={passAllRemaining}
                          className="rounded-md border border-[var(--success)] px-2 py-1 text-xs text-[var(--success)] transition hover:bg-[var(--success)] hover:text-[var(--success-foreground)]"
                        >
                          Pass all
                        </button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={completingRun}
                        onClick={completeManualRun}
                      >
                        {completingRun ? "Completing…" : "Complete"}
                      </Button>
                    </div>
                  </div>

                  <div className="max-h-96 space-y-2 overflow-auto">
                    {activeManualRun.results.map((result) => (
                      <div
                        key={result.id}
                        className="rounded-lg border border-border bg-background p-3"
                      >
                        <p className="mb-2 text-sm font-medium">{result.name}</p>
                        <div className="flex gap-2">
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
                </div>
              ) : (
                <div className="flex h-full min-h-48 items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">No active run</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Select cases and start a run to see results here.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
