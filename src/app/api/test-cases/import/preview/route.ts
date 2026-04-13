import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { userHasProjectAccess } from "@/lib/projects";
import { autoCorrectJiraKey } from "@/lib/jira";
import { parseWorkbook } from "../route";

// ─── POST /api/test-cases/import/preview ──────────────────────────────────────
// Same multipart form as /import (file + projectId + mapping), but only parses
// the JIRA column and returns correction analysis without creating any records.

export interface JiraRowAnalysis {
  rowNumber: number;
  original: string;
  corrected: string | null;
  wasChanged: boolean;
}

export interface JiraAnalysis {
  needsReview: boolean;
  rows: JiraRowAnalysis[];
  willCorrect: number;
  willSkip: number;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const projectId = formData.get("projectId") as string | null;
  const mappingRaw = formData.get("mapping") as string | null;

  if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });
  if (!projectId) return NextResponse.json({ error: "projectId required." }, { status: 400 });

  if (!(await userHasProjectAccess(session.user.id, projectId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let mapping: Record<string, string> | null = null;
  if (mappingRaw) {
    try {
      mapping = JSON.parse(mappingRaw) as Record<string, string>;
    } catch {
      return NextResponse.json({ error: "Invalid mapping JSON." }, { status: 400 });
    }
  }

  // Determine which source column maps to "jira"
  const jiraSourceColumn = mapping?.jira ?? null;
  if (!jiraSourceColumn) {
    // No JIRA column mapped — nothing to review
    return NextResponse.json({
      jiraAnalysis: { needsReview: false, rows: [], willCorrect: 0, willSkip: 0 },
    });
  }

  let rawRows: Record<string, unknown>[];
  try {
    rawRows = await parseWorkbook(await file.arrayBuffer(), file.name);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unable to parse file." },
      { status: 400 }
    );
  }

  const analysisRows: JiraRowAnalysis[] = [];

  rawRows.forEach((row, idx) => {
    const rawValue = String(row[jiraSourceColumn] ?? "").trim();
    if (!rawValue) return; // empty cells are fine, skip

    const { corrected, wasChanged } = autoCorrectJiraKey(rawValue);

    // Only include rows that need attention (correctable or uncorrectable)
    if (!wasChanged && corrected !== null) return; // already valid
    if (corrected === null && !rawValue) return;   // empty (already filtered above)

    analysisRows.push({
      rowNumber: idx + 2, // +2 because idx is 0-based and row 1 is header
      original: rawValue,
      corrected,
      wasChanged,
    });
  });

  const willCorrect = analysisRows.filter((r) => r.wasChanged && r.corrected !== null).length;
  const willSkip = analysisRows.filter((r) => r.corrected === null).length;
  const needsReview = analysisRows.length > 0;

  return NextResponse.json({
    jiraAnalysis: { needsReview, rows: analysisRows, willCorrect, willSkip },
  });
}
