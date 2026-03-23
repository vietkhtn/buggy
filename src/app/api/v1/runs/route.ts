import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { categoryForStatus } from "@/lib/failure-category";

type ResultStatus = "PASSED" | "FAILED" | "SKIPPED" | "ERROR";

const payloadSchema = z.object({
  name: z.string().trim().min(1).max(200),
  project_id: z.string().min(1),
  results: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(300),
        suite: z.string().trim().max(300).optional(),
        status: z.enum(["passed", "failed", "skipped", "error"]),
        duration_ms: z.number().int().nonnegative().optional(),
        failure_message: z.string().max(20_000).optional(),
        stack_trace: z.string().max(100_000).optional(),
        metadata: z.record(z.string(), z.any()).optional(),
      })
    )
    .min(1),
});

function mapStatus(status: "passed" | "failed" | "skipped" | "error") {
  if (status === "passed") return "PASSED" as ResultStatus;
  if (status === "failed") return "FAILED" as ResultStatus;
  if (status === "skipped") return "SKIPPED" as ResultStatus;
  return "ERROR" as ResultStatus;
}

async function resolveApiKey(rawKey: string) {
  const keyPrefix = rawKey.slice(0, 8);
  if (!keyPrefix) return null;

  const candidates = await db.apiKey.findMany({
    where: { keyPrefix },
    include: { project: true },
  });

  for (const candidate of candidates) {
    const valid = await bcrypt.compare(rawKey, candidate.keyHash);
    if (valid) {
      return candidate;
    }
  }

  return null;
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";

  if (!token) {
    return NextResponse.json({ error: "Missing Bearer API key." }, { status: 401 });
  }

  const apiKey = await resolveApiKey(token);
  if (!apiKey) {
    return NextResponse.json({ error: "Invalid API key." }, { status: 401 });
  }

  try {
    const payload = payloadSchema.parse(await request.json());

    if (payload.project_id !== apiKey.projectId) {
      return NextResponse.json(
        { error: "API key does not have access to this project." },
        { status: 403 }
      );
    }

    const run = await db.testRun.create({
      data: {
        projectId: payload.project_id,
        createdById: apiKey.userId,
        name: payload.name,
        source: "AUTOMATED",
        status: "COMPLETED",
        completedAt: new Date(),
        results: {
          create: payload.results.map((result) => {
            const mapped = mapStatus(result.status);
            return {
              name: result.name,
              suite: result.suite,
              status: mapped,
              durationMs: result.duration_ms,
              failureMessage: result.failure_message,
              stackTrace: result.stack_trace,
              metadata: result.metadata,
              category: categoryForStatus(mapped, result.failure_message, result.stack_trace),
            };
          }),
        },
      },
      include: {
        _count: {
          select: { results: true },
        },
      },
    });

    await db.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return NextResponse.json(
      {
        run_id: run.id,
        name: run.name,
        imported_results: run._count.results,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid payload.", issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Unable to ingest test run." }, { status: 500 });
  }
}
