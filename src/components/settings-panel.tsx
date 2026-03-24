"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

type ApiKeyItem = {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
};

type Props = {
  projectId: string;
  projectName: string;
  projectDescription: string;
  testCasePrefix: string;
  apiKeys: ApiKeyItem[];
};

// ─── Component ────────────────────────────────────────────────────────────────

export function SettingsPanel({ projectId, projectName, projectDescription, apiKeys, testCasePrefix }: Props) {
  const router = useRouter();

  const [creatingKey, setCreatingKey] = useState(false);
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [keyConfirmed, setKeyConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [prefix, setPrefix] = useState(testCasePrefix);
  const [updatingPrefix, setUpdatingPrefix] = useState(false);
  const [prefixError, setPrefixError] = useState<string | null>(null);
  const [name, setName] = useState(projectName);
  const [description, setDescription] = useState(projectDescription);
  const [updatingProject, setUpdatingProject] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);

  // ─── Create API key ─────────────────────────────────────────────────────────

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
      setCopied(false);
      form.reset();
      router.refresh();
    } catch {
      toast.error("Network error — API key not generated.", { id: toastId });
    } finally {
      setCreatingKey(false);
    }
  }

  // ─── Revoke API key ─────────────────────────────────────────────────────────

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

  // ─── Upload JUnit XML ───────────────────────────────────────────────────────

  async function uploadJUnit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setUploading(true);

    const formData = new FormData(form);
    const file = formData.get("file") as File | null;
    if (file && file.size > 50 * 1024 * 1024) {
      toast.error("File exceeds the 50 MB limit. Please split the XML and retry.");
      setUploading(false);
      return;
    }

    formData.set("projectId", projectId);
    const toastId = toast.loading("Importing JUnit XML…");

    try {
      const response = await fetch("/api/runs/junit", { method: "POST", body: formData });

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

  async function copyKey() {
    if (!newApiKey) return;
    await navigator.clipboard.writeText(newApiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function previewIdValue(value: string) {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "TC";
    return `${cleaned}-0007`;
  }

  async function updatePrefix(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUpdatingPrefix(true);
    setPrefixError(null);

    const nextValue = prefix.trim().toUpperCase();
    const cleaned = nextValue.replace(/[^A-Z0-9]/g, "").slice(0, 6);
    setPrefix(cleaned);

    try {
      const response = await fetch(`/api/projects/${projectId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testCasePrefix: cleaned }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setPrefixError(body.error ?? "Unable to update prefix.");
        return;
      }

      toast.success("Test case prefix updated.");
      router.refresh();
    } catch {
      setPrefixError("Network error — prefix not saved.");
    } finally {
      setUpdatingPrefix(false);
    }
  }

  async function updateProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUpdatingProject(true);
    setProjectError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setProjectError(body.error ?? "Unable to update project.");
        return;
      }

      toast.success("Project updated.");
      router.refresh();
    } catch {
      setProjectError("Network error — changes not saved.");
    } finally {
      setUpdatingProject(false);
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* API key reveal modal */}
      <Dialog
        open={!!newApiKey}
        onOpenChange={(open) => {
          if (!open) setNewApiKey(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>API key generated</DialogTitle>
            <DialogDescription>
              Copy this key now — it will not be shown again. If lost, you must revoke and
              regenerate it.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-border bg-muted p-3">
            <code className="break-all text-sm">{newApiKey}</code>
          </div>
          <button
            type="button"
            onClick={copyKey}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted"
          >
            {copied ? (
              <>
                <svg className="h-4 w-4 text-[var(--success)]" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
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
              checked={keyConfirmed}
              onChange={(e) => e.target.checked && setKeyConfirmed(true)}
              className="accent-primary"
            />
            I have saved this key in a safe place
          </label>
          <Button onClick={() => setNewApiKey(null)} disabled={!keyConfirmed} className="w-full">
            Done
          </Button>
        </DialogContent>
      </Dialog>

      <div className="space-y-8">
        {/* ── Project Info ── */}
        <Card>
          <CardHeader className="pb-3">
            <h2 className="text-base font-semibold">Project details</h2>
            <p className="text-sm text-muted-foreground">
              Update the project name and description.
            </p>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-3" onSubmit={updateProject}>
              <div className="space-y-1">
                <Label htmlFor="project-name">Name</Label>
                <Input
                  id="project-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="project-description">Description</Label>
                <Textarea
                  id="project-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Brief description of what this project covers…"
                />
              </div>
              {projectError && <p className="text-xs text-destructive">{projectError}</p>}
              <div>
                <Button type="submit" disabled={updatingProject} size="sm">
                  {updatingProject ? "Saving…" : "Save"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* ── Test Case ID Prefix ── */}
        <Card>
          <CardHeader className="pb-3">
            <h2 className="text-base font-semibold">Test Case IDs</h2>
            <p className="text-sm text-muted-foreground">
              Control the prefix used when auto-generating IDs (e.g. BUG-0007).
            </p>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-3" onSubmit={updatePrefix}>
              <div className="space-y-1">
                <Label htmlFor="tc-prefix">Prefix</Label>
                <Input
                  id="tc-prefix"
                  value={prefix}
                  onChange={(event) => setPrefix(event.target.value.toUpperCase())}
                  maxLength={6}
                  minLength={2}
                  required
                  aria-describedby="tc-prefix-help"
                />
                <p id="tc-prefix-help" className="text-xs text-muted-foreground">
                  Letters/numbers only. Example ID: <code className="rounded bg-muted px-1">{previewIdValue(prefix)}</code>
                </p>
                {prefixError && <p className="text-xs text-destructive">{prefixError}</p>}
              </div>
              <div>
                <Button type="submit" disabled={updatingPrefix} size="sm">
                  {updatingPrefix ? "Saving…" : "Save prefix"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* ── API Keys ── */}
        <Card>
          <CardHeader className="pb-3">
            <h2 className="text-base font-semibold">API Keys</h2>
            <p className="text-sm text-muted-foreground">
              Authenticate CI/CD pipelines with{" "}
              <code className="rounded bg-muted px-1 text-xs">POST /api/v1/runs</code>.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <form className="flex items-end gap-3" onSubmit={createApiKey}>
              <div className="flex-1 space-y-1">
                <Label htmlFor="api-key-name">Key name</Label>
                <Input
                  id="api-key-name"
                  type="text"
                  name="apiKeyName"
                  required
                  placeholder="e.g. GitHub Actions"
                />
              </div>
              <Button type="submit" disabled={creatingKey}>
                {creatingKey ? "Generating…" : "Generate key"}
              </Button>
            </form>

            {apiKeys.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Active keys
                </p>
                <div className="overflow-hidden rounded-lg border border-border">
                  {apiKeys.map((key, idx) => (
                    <div
                      key={key.id}
                      className={`flex items-center justify-between p-3 ${
                        idx > 0 ? "border-t border-border" : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{key.name}</p>
                        <p className="text-xs text-muted-foreground">
                          <code className="font-mono">{key.keyPrefix}…</code>
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
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No API keys yet.</p>
            )}
          </CardContent>
        </Card>

        {/* ── JUnit Import (secondary) ── */}
        <div className="rounded-xl border border-dashed border-border p-5">
          <div className="mb-4">
            <h3 className="text-sm font-medium">Import JUnit XML</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Manually upload an automated test run from a JUnit XML file (max 50 MB).
            </p>
          </div>
          <form className="flex flex-wrap items-end gap-3" onSubmit={uploadJUnit}>
            <div className="min-w-36 flex-1 space-y-1">
              <Label htmlFor="junit-name" className="text-xs">
                Run name
              </Label>
              <Input
                id="junit-name"
                name="name"
                type="text"
                defaultValue={`Run ${new Date().toLocaleDateString()}`}
                placeholder="e.g. Nightly Build #42"
                className="h-8 text-sm"
              />
            </div>
            <div className="min-w-48 flex-1 space-y-1">
              <Label htmlFor="junit-file" className="text-xs">
                XML file
              </Label>
              <Input
                id="junit-file"
                name="file"
                type="file"
                required
                accept=".xml,text/xml,application/xml"
                className="h-8 text-sm"
              />
            </div>
            <Button type="submit" disabled={uploading} variant="outline" size="sm">
              {uploading ? "Importing…" : "Import"}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
