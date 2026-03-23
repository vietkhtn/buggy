"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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

export function DashboardActions({ projectId, testCases, activeManualRun }: Props) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [creatingCase, setCreatingCase] = useState(false);
  const [creatingRun, setCreatingRun] = useState(false);
  const [creatingKey, setCreatingKey] = useState(false);
  const [updatingResultId, setUpdatingResultId] = useState<string | null>(null);
  const [selectedCases, setSelectedCases] = useState<string[]>([]);

  const hasSelectedCases = useMemo(() => selectedCases.length > 0, [selectedCases]);

  async function uploadJUnit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploading(true);

    const formData = new FormData(event.currentTarget);
    formData.set("projectId", projectId);

    const response = await fetch("/api/runs/junit", {
      method: "POST",
      body: formData,
    });

    setUploading(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      window.alert(payload.error ?? "JUnit upload failed.");
      return;
    }

    event.currentTarget.reset();
    router.refresh();
  }

  async function createTestCase(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatingCase(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      projectId,
      title: String(formData.get("title") ?? "").trim(),
      moduleName: String(formData.get("module") ?? "").trim() || undefined,
      tags: String(formData.get("tags") ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      steps: [
        {
          action: String(formData.get("action") ?? "").trim(),
          expectedResult: String(formData.get("expected") ?? "").trim(),
        },
      ],
      status: "ACTIVE",
      priority: "MEDIUM",
    };

    const response = await fetch("/api/test-cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setCreatingCase(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      window.alert(body.error ?? "Unable to create test case.");
      return;
    }

    event.currentTarget.reset();
    router.refresh();
  }

  async function createManualRun() {
    if (!hasSelectedCases) return;

    setCreatingRun(true);

    const response = await fetch("/api/manual-runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        name: `Manual Run ${new Date().toLocaleString()}`,
        testCaseIds: selectedCases,
      }),
    });

    setCreatingRun(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      window.alert(body.error ?? "Unable to create manual run.");
      return;
    }

    setSelectedCases([]);
    router.refresh();
  }

  async function updateManualResult(resultId: string, status: "PASSED" | "FAILED" | "BLOCKED") {
    if (!activeManualRun) return;
    setUpdatingResultId(resultId);

    const response = await fetch(
      `/api/manual-runs/${activeManualRun.id}/results/${resultId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }
    );

    setUpdatingResultId(null);

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      window.alert(body.error ?? "Unable to update result.");
      return;
    }

    router.refresh();
  }

  async function createApiKey(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatingKey(true);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("apiKeyName") ?? "").trim();

    const response = await fetch("/api/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, name }),
    });

    setCreatingKey(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      window.alert(body.error ?? "Unable to create API key.");
      return;
    }

    const payload = (await response.json()) as { key: string };
    window.alert(`Copy this API key now. It will not be shown again:\n\n${payload.key}`);
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Upload JUnit XML</h2>
        <p className="mt-1 text-xs text-muted-foreground">Import automated test runs (max 50MB).</p>
        <form className="mt-4 space-y-3" onSubmit={uploadJUnit}>
          <input
            name="name"
            type="text"
            placeholder="Run name"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            name="file"
            type="file"
            required
            accept=".xml,text/xml,application/xml"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={uploading}
            className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {uploading ? "Uploading..." : "Import run"}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Create Manual Test Case</h2>
        <form className="mt-4 space-y-3" onSubmit={createTestCase}>
          <input
            name="title"
            type="text"
            required
            placeholder="Title"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            name="module"
            type="text"
            placeholder="Module"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            name="tags"
            type="text"
            placeholder="Tags (comma separated)"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <textarea
            name="action"
            required
            placeholder="Step action"
            className="h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <textarea
            name="expected"
            required
            placeholder="Expected result"
            className="h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={creatingCase}
            className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {creatingCase ? "Saving..." : "Create test case"}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Manual Execution</h2>
        <p className="mt-1 text-xs text-muted-foreground">Select active test cases and launch an execution run.</p>
        <div className="mt-3 max-h-40 space-y-2 overflow-auto pr-1">
          {testCases.map((testCase) => {
            const selected = selectedCases.includes(testCase.id);

            return (
              <label key={testCase.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(event) => {
                    if (event.target.checked) {
                      setSelectedCases((current) => [...current, testCase.id]);
                    } else {
                      setSelectedCases((current) => current.filter((id) => id !== testCase.id));
                    }
                  }}
                />
                <span>{testCase.title}</span>
              </label>
            );
          })}
          {!testCases.length ? <p className="text-sm text-muted-foreground">Create test cases first.</p> : null}
        </div>

        <button
          type="button"
          disabled={!hasSelectedCases || creatingRun}
          onClick={createManualRun}
          className="mt-3 w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {creatingRun ? "Creating run..." : "Start manual run"}
        </button>

        {activeManualRun ? (
          <div className="mt-4 space-y-2 border-t border-border pt-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Active run: {activeManualRun.name}
            </p>
            {activeManualRun.results.map((result) => (
              <div key={result.id} className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium">{result.name}</p>
                <div className="mt-2 flex gap-2">
                  {(["PASSED", "FAILED", "BLOCKED"] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={updatingResultId === result.id}
                      onClick={() => updateManualResult(result.id, status)}
                      className={`rounded-md border px-2 py-1 text-xs ${
                        result.status === status ? "border-foreground" : "border-border"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold">CI API key</h2>
        <p className="mt-1 text-xs text-muted-foreground">Use this key with `POST /api/v1/runs`.</p>
        <form className="mt-4 space-y-3" onSubmit={createApiKey}>
          <input
            type="text"
            name="apiKeyName"
            required
            placeholder="Key name (e.g. GitHub Actions)"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={creatingKey}
            className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {creatingKey ? "Generating..." : "Generate API key"}
          </button>
        </form>
      </section>
    </div>
  );
}
