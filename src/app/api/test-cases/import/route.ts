import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ensureProjectForUser, userHasProjectAccess } from "@/lib/projects";
import { reserveTestCaseDisplayIds } from "@/lib/test-case-ids";
import * as XLSX from "xlsx";

// ─── POST /api/test-cases/import ──────────────────────────────────────────────
// Accepts multipart/form-data with:
//   file      – .xlsx, .xls, or .csv
//   projectId – optional, uses default project when omitted
//
// Expected columns (case-insensitive, order flexible):
//   title (required), description, module, priority, status, tags,
//   preconditions, jira (optional reference key)

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const requestedProjectId = formData.get("projectId") as string | null;

  if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });

  const project = requestedProjectId
    ? { id: requestedProjectId }
    : await ensureProjectForUser(session.user.id);

  if (!(await userHasProjectAccess(session.user.id, project.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  if (rows.length === 0) {
    return NextResponse.json({ error: "File contains no data rows." }, { status: 400 });
  }

  // Normalise header keys to lowercase without spaces
  const normalised = rows.map((row) => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      out[k.toLowerCase().replace(/\s+/g, "")] = String(v ?? "").trim();
    }
    return out;
  });

  const valid = normalised.filter((r) => r.title);
  if (valid.length === 0) {
    return NextResponse.json({ error: "No rows with a 'title' column found." }, { status: 400 });
  }

  const PRIORITY_VALUES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
  type Priority = (typeof PRIORITY_VALUES)[number];
  const STATUS_VALUES = ["DRAFT", "ACTIVE", "DEPRECATED"] as const;
  type Status = (typeof STATUS_VALUES)[number];

  function toPriority(v: string): Priority {
    const u = v.toUpperCase() as Priority;
    return PRIORITY_VALUES.includes(u) ? u : "MEDIUM";
  }
  function toStatus(v: string): Status {
    const u = v.toUpperCase() as Status;
    return STATUS_VALUES.includes(u) ? u : "DRAFT";
  }

  // Module cache to avoid N+1 upserts
  const moduleCache = new Map<string, string>();
  async function getModuleId(tx: typeof db, name: string): Promise<string | null> {
    if (!name) return null;
    if (moduleCache.has(name)) return moduleCache.get(name)!;
    const mod = await tx.module.upsert({
      where: { projectId_name: { projectId: project.id, name } },
      update: {},
      create: { projectId: project.id, name },
    });
    moduleCache.set(name, mod.id);
    return mod.id;
  }

  function normalizeJiraKey(raw: string | undefined) {
    if (!raw) return null;
    const upper = raw.toUpperCase();
    if (!upper) return null;
    return /^[A-Z][A-Z0-9]+-\d+$/.test(upper) ? upper : null;
  }

  const created: string[] = [];
  const errors: { row: number; error: string }[] = [];

  for (let i = 0; i < valid.length; i++) {
    const row = valid[i];
    try {
      await db.$transaction(async (tx) => {
        const moduleId = await getModuleId(tx, row.module ?? "");
        const tags = (row.tags ?? "")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
        const jiraKey = normalizeJiraKey(row.jira ?? row.jirakey ?? row.reference);

        const [displayId] = await reserveTestCaseDisplayIds(tx, project.id, 1);

        const tc = await tx.testCase.create({
          data: {
            projectId: project.id,
            moduleId,
            displayId,
            jiraKey,
            title: row.title,
            description: row.description || undefined,
            preconditions: row.preconditions || undefined,
            priority: toPriority(row.priority ?? ""),
            status: toStatus(row.status ?? ""),
            tags,
          },
          select: { id: true },
        });
        created.push(tc.id);
      });
    } catch (err) {
      errors.push({ row: i + 2, error: String(err) });
    }
  }

  return NextResponse.json({ created: created.length, errors }, { status: 201 });
}
