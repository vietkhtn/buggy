import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ensureProjectForUser, userHasProjectAccess } from "@/lib/projects";

const createReportSchema = z.object({
  projectId: z.string().min(1).optional(),
  requirementsCovered: z.number().int().min(0),
  totalRequirements: z.number().int().min(0),
  testingBugsFound: z.number().int().min(0),
  productionBugsFound: z.number().int().min(0),
  notes: z.string().max(2000).optional(),
});

// ─── GET /api/metrics ─────────────────────────────────────────────────────────
// Returns computed metrics for a project, combining TestResult data with
// the latest manual DefectReport entry.

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const requestedProjectId = searchParams.get("projectId");

  const project = requestedProjectId
    ? { id: requestedProjectId }
    : await ensureProjectForUser(session.user.id);

  if (!(await userHasProjectAccess(session.user.id, project.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Defect reports (manual inputs) ──────────────────────────────────────────
  const reports = await db.defectReport.findMany({
    where: { projectId: project.id },
    orderBy: { reportedAt: "desc" },
    take: 10,
  });

  const latest = reports[0] ?? null;

  // ── Test coverage ────────────────────────────────────────────────────────────
  const testCoverage =
    latest && latest.totalRequirements > 0
      ? (latest.requirementsCovered / latest.totalRequirements) * 100
      : null;

  // ── DDP — Defect Detection Percentage ───────────────────────────────────────
  const totalBugs = latest
    ? latest.testingBugsFound + latest.productionBugsFound
    : 0;
  const ddp = totalBugs > 0 && latest ? (latest.testingBugsFound / totalBugs) * 100 : null;

  // ── Escaped defects & defect leakage ────────────────────────────────────────
  const escapedDefects = latest?.productionBugsFound ?? null;
  const defectLeakage = escapedDefects; // same metric, different framing

  // ── Defect density per module (from TestResult failures) ────────────────────
  const failedResults = await db.testResult.findMany({
    where: { run: { projectId: project.id }, status: { in: ["FAILED", "ERROR"] } },
    select: { suite: true },
  });

  const densityMap: Record<string, number> = {};
  for (const r of failedResults) {
    const key = r.suite ?? "No module";
    densityMap[key] = (densityMap[key] ?? 0) + 1;
  }
  const defectDensity = Object.entries(densityMap).map(([module, count]) => ({ module, count }));

  // ── Time to confidence: average duration of completed manual runs ─────────────
  const completedRuns = await db.testRun.findMany({
    where: { projectId: project.id, status: "COMPLETED", source: "MANUAL", completedAt: { not: null } },
    select: { startedAt: true, completedAt: true },
  });

  const avgTimeToConfidenceMs =
    completedRuns.length > 0
      ? completedRuns.reduce(
          (sum, r) => sum + (r.completedAt!.getTime() - r.startedAt.getTime()),
          0
        ) / completedRuns.length
      : null;

  // ── Historical series for sparklines ────────────────────────────────────────
  const history = reports.reverse().map((r) => ({
    date: r.reportedAt.toISOString(),
    testCoverage:
      r.totalRequirements > 0 ? (r.requirementsCovered / r.totalRequirements) * 100 : 0,
    ddp:
      r.testingBugsFound + r.productionBugsFound > 0
        ? (r.testingBugsFound / (r.testingBugsFound + r.productionBugsFound)) * 100
        : 0,
    escapedDefects: r.productionBugsFound,
    testingBugs: r.testingBugsFound,
  }));

  return NextResponse.json({
    projectId: project.id,
    testCoverage,
    ddp,
    escapedDefects,
    defectLeakage,
    defectDensity,
    avgTimeToConfidenceMs,
    latestReport: latest,
    history,
  });
}

// ─── POST /api/metrics — log a new defect report ─────────────────────────────

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const payload = createReportSchema.parse(await request.json());
    const project = payload.projectId
      ? { id: payload.projectId }
      : await ensureProjectForUser(session.user.id);

    if (!(await userHasProjectAccess(session.user.id, project.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const report = await db.defectReport.create({
      data: {
        projectId: project.id,
        requirementsCovered: payload.requirementsCovered,
        totalRequirements: payload.totalRequirements,
        testingBugsFound: payload.testingBugsFound,
        productionBugsFound: payload.productionBugsFound,
        notes: payload.notes,
      },
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload.", issues: error.issues }, { status: 400 });
    }
    console.error("[POST /api/metrics]", error);
    return NextResponse.json({ error: "Unable to save report." }, { status: 500 });
  }
}
