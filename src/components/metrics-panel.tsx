"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

type DefectDensityItem = { module: string; count: number };

type HistoryPoint = {
  date: string;
  testCoverage: number;
  ddp: number;
  escapedDefects: number;
  testingBugs: number;
};

type LatestReport = {
  requirementsCovered: number;
  totalRequirements: number;
  testingBugsFound: number;
  productionBugsFound: number;
  notes?: string;
  reportedAt: string;
};

type Metrics = {
  testCoverage: number | null;
  ddp: number | null;
  escapedDefects: number | null;
  defectLeakage: number | null;
  defectDensity: DefectDensityItem[];
  avgTimeToConfidenceMs: number | null;
};

type Props = {
  projectId: string;
  projectName: string;
  metrics: Metrics;
  history: HistoryPoint[];
  latestReport: LatestReport | null;
  testCaseCount: number;
};

// ─── PDF metric keys ──────────────────────────────────────────────────────────

const PDF_METRIC_OPTIONS = [
  { key: "testCoverage", label: "Test Coverage" },
  { key: "ddp", label: "Defect Detection Percentage (DDP)" },
  { key: "escapedDefects", label: "Escaped Defects" },
  { key: "defectLeakage", label: "Defect Leakage" },
  { key: "defectDensity", label: "Defect Density by Module" },
  { key: "timeToConfidence", label: "Time to Confidence" },
] as const;

type PdfMetricKey = (typeof PDF_METRIC_OPTIONS)[number]["key"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number | null, suffix = "%"): string {
  if (n === null) return "—";
  return `${n}${suffix}`;
}

function fmtMs(ms: number | null): string {
  if (ms === null) return "—";
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

// ─── Metric card ─────────────────────────────────────────────────────────────

function MetricCard({
  title,
  value,
  description,
  highlight,
}: {
  title: string;
  value: string;
  description: string;
  highlight?: "good" | "warn" | "bad" | null;
}) {
  const highlightClass =
    highlight === "good"
      ? "border-l-4 border-l-[var(--success)]"
      : highlight === "warn"
      ? "border-l-4 border-l-[var(--warning)]"
      : highlight === "bad"
      ? "border-l-4 border-l-destructive"
      : "";

  return (
    <div className={`rounded-xl border border-border bg-card p-5 ${highlightClass}`}>
      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{title}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MetricsPanel({
  projectId,
  projectName,
  metrics,
  history,
  latestReport,
  testCaseCount,
}: Props) {
  const router = useRouter();

  // ── Log report dialog ─────────────────────────────────────────────────────────
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [logging, setLogging] = useState(false);

  // ── PDF export dialog ─────────────────────────────────────────────────────────
  const [showPdfDialog, setShowPdfDialog] = useState(false);
  const [selectedPdfMetrics, setSelectedPdfMetrics] = useState<Set<PdfMetricKey>>(
    new Set(PDF_METRIC_OPTIONS.map((o) => o.key))
  );
  const [exportingPdf, setExportingPdf] = useState(false);

  // ─── Log new report ───────────────────────────────────────────────────────────

  async function logReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLogging(true);
    const formData = new FormData(event.currentTarget);
    const toastId = toast.loading("Saving report…");

    try {
      const response = await fetch("/api/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          requirementsCovered: Number(formData.get("requirementsCovered") ?? 0),
          totalRequirements: Number(formData.get("totalRequirements") ?? 0),
          testingBugsFound: Number(formData.get("testingBugsFound") ?? 0),
          productionBugsFound: Number(formData.get("productionBugsFound") ?? 0),
          notes: String(formData.get("notes") ?? "").trim() || undefined,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? "Failed to save report.", { id: toastId });
        return;
      }

      toast.success("Metrics report saved.", { id: toastId });
      setShowLogDialog(false);
      router.refresh();
    } catch {
      toast.error("Network error.", { id: toastId });
    } finally {
      setLogging(false);
    }
  }

  // ─── PDF export ───────────────────────────────────────────────────────────────

  async function exportPdf() {
    setExportingPdf(true);

    try {
      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      let y = 20;

      // Header
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Test Metrics Report", 20, y);
      y += 8;
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(`Project: ${projectName}`, 20, y);
      y += 6;
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, y);
      y += 10;
      doc.setTextColor(0);
      doc.setDrawColor(200);
      doc.line(20, y, pageW - 20, y);
      y += 8;

      // Test case count
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Total Test Cases: ${testCaseCount}`, 20, y);
      y += 10;

      // Latest report date
      if (latestReport) {
        doc.text(`Latest data as of: ${new Date(latestReport.reportedAt).toLocaleDateString()}`, 20, y);
        y += 10;
      }

      // Metric sections
      const include = (key: PdfMetricKey) => selectedPdfMetrics.has(key);

      const metricRows: string[][] = [];

      if (include("testCoverage")) {
        metricRows.push(["Test Coverage", fmt(metrics.testCoverage), "% of requirements covered by test cases"]);
      }
      if (include("ddp")) {
        metricRows.push(["Defect Detection Percentage (DDP)", fmt(metrics.ddp), "% of bugs caught during testing vs total"]);
      }
      if (include("escapedDefects")) {
        metricRows.push(["Escaped Defects", metrics.escapedDefects !== null ? String(metrics.escapedDefects) : "—", "Bugs found in production"]);
      }
      if (include("defectLeakage")) {
        metricRows.push(["Defect Leakage", metrics.defectLeakage !== null ? String(metrics.defectLeakage) : "—", "Bugs missed during testing, found in production"]);
      }
      if (include("timeToConfidence")) {
        metricRows.push(["Time to Confidence", fmtMs(metrics.avgTimeToConfidenceMs), "Avg time from run start to completion"]);
      }

      if (metricRows.length > 0) {
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.text("Key Metrics", 20, y);
        y += 6;

        autoTable(doc, {
          startY: y,
          head: [["Metric", "Value", "Description"]],
          body: metricRows,
          margin: { left: 20, right: 20 },
          styles: { fontSize: 10 },
          headStyles: { fillColor: [63, 63, 70] },
          columnStyles: { 1: { halign: "center", fontStyle: "bold" } },
          didDrawPage: (data) => { y = data.cursor?.y ?? y; },
        });

        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
      }

      // Defect density table
      if (include("defectDensity") && metrics.defectDensity.length > 0) {
        if (y > 240) { doc.addPage(); y = 20; }
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.text("Defect Density by Module", 20, y);
        y += 6;

        autoTable(doc, {
          startY: y,
          head: [["Module / Suite", "Failures"]],
          body: metrics.defectDensity.map((d) => [d.module, d.count]),
          margin: { left: 20, right: 20 },
          styles: { fontSize: 10 },
          headStyles: { fillColor: [63, 63, 70] },
        });

        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
      }

      // Historical trend table
      if (history.length > 0) {
        if (y > 220) { doc.addPage(); y = 20; }
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.text("Historical Trend", 20, y);
        y += 6;

        autoTable(doc, {
          startY: y,
          head: [["Date", "Coverage %", "DDP %", "Escaped Defects"]],
          body: history.map((h) => [
            new Date(h.date).toLocaleDateString(),
            h.testCoverage,
            h.ddp,
            h.escapedDefects,
          ]),
          margin: { left: 20, right: 20 },
          styles: { fontSize: 9 },
          headStyles: { fillColor: [63, 63, 70] },
        });
      }

      doc.save(`metrics-report-${projectName.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("PDF downloaded.");
      setShowPdfDialog(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF.");
    } finally {
      setExportingPdf(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  const coverageHighlight =
    metrics.testCoverage === null ? null : metrics.testCoverage >= 80 ? "good" : metrics.testCoverage >= 50 ? "warn" : "bad";
  const ddpHighlight =
    metrics.ddp === null ? null : metrics.ddp >= 80 ? "good" : metrics.ddp >= 50 ? "warn" : "bad";
  const escapedHighlight =
    metrics.escapedDefects === null ? null : metrics.escapedDefects === 0 ? "good" : metrics.escapedDefects <= 3 ? "warn" : "bad";

  return (
    <>
      {/* ── Log report dialog ── */}
      <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log metrics data</DialogTitle>
            <DialogDescription>
              Enter your current test coverage and defect figures. Data is saved per entry so you can track trends over time.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={logReport}>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="req-covered">Requirements covered</Label>
                  <p className="text-xs text-muted-foreground">How many requirements currently have passing tests? Example: 42.</p>
                  <Input
                    id="req-covered"
                    name="requirementsCovered"
                    type="number"
                    min={0}
                  defaultValue={latestReport?.requirementsCovered ?? 0}
                  required
                />
              </div>
                <div className="space-y-1">
                  <Label htmlFor="req-total">Total requirements</Label>
                  <p className="text-xs text-muted-foreground">What is the total requirement count in scope for this release? Example: 50.</p>
                  <Input
                    id="req-total"
                    name="totalRequirements"
                    type="number"
                  min={0}
                  defaultValue={latestReport?.totalRequirements ?? 0}
                  required
                />
              </div>
            </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="bugs-testing">Bugs found in testing</Label>
                  <p className="text-xs text-muted-foreground">How many issues were caught before release (this sprint/run)? Example: 7.</p>
                  <Input
                    id="bugs-testing"
                    name="testingBugsFound"
                    type="number"
                  min={0}
                  defaultValue={latestReport?.testingBugsFound ?? 0}
                  required
                />
              </div>
                <div className="space-y-1">
                  <Label htmlFor="bugs-prod">Bugs found in production</Label>
                  <p className="text-xs text-muted-foreground">How many escaped to prod in the same window? Example: 1.</p>
                  <Input
                    id="bugs-prod"
                    name="productionBugsFound"
                    type="number"
                  min={0}
                  defaultValue={latestReport?.productionBugsFound ?? 0}
                  required
                />
              </div>
            </div>
              <div className="space-y-1">
                <Label htmlFor="notes">Notes (optional)</Label>
                <p className="text-xs text-muted-foreground">What context explains this data? Example: &ldquo;Sprint 18 mobile release&rdquo;.</p>
                <textarea
                  id="notes"
                  name="notes"
                placeholder="e.g. Sprint 12 data"
                defaultValue={latestReport?.notes ?? ""}
                className="h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowLogDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={logging}>{logging ? "Saving…" : "Save report"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── PDF export dialog ── */}
      <Dialog open={showPdfDialog} onOpenChange={setShowPdfDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Export PDF report</DialogTitle>
            <DialogDescription>Choose which metrics to include.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {PDF_METRIC_OPTIONS.map((opt) => (
              <label key={opt.key} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={selectedPdfMetrics.has(opt.key)}
                  onChange={(e) => {
                    setSelectedPdfMetrics((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(opt.key);
                      else next.delete(opt.key);
                      return next;
                    });
                  }}
                />
                {opt.label}
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowPdfDialog(false)}>Cancel</Button>
            <Button disabled={exportingPdf || selectedPdfMetrics.size === 0} onClick={exportPdf}>
              {exportingPdf ? "Generating…" : "Export PDF"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Page header ── */}
      <header className="flex items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Quality</p>
          <h1 className="text-2xl font-semibold mt-0.5">Metrics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {latestReport
              ? `Last updated ${new Date(latestReport.reportedAt).toLocaleDateString()}`
              : "No data logged yet — add your first report."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPdfDialog(true)} disabled={!latestReport}>
            Export PDF
          </Button>
          <Button onClick={() => setShowLogDialog(true)}>Log data</Button>
        </div>
      </header>

      {/* ── Metric cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <MetricCard
          title="Test Coverage"
          value={fmt(metrics.testCoverage)}
          description="Requirements or code covered by test cases. Target: ≥ 80%."
          highlight={coverageHighlight}
        />
        <MetricCard
          title="Defect Detection % (DDP)"
          value={fmt(metrics.ddp)}
          description="Bugs found in testing ÷ total bugs. Higher is better."
          highlight={ddpHighlight}
        />
        <MetricCard
          title="Escaped Defects"
          value={metrics.escapedDefects !== null ? String(metrics.escapedDefects) : "—"}
          description="Bugs found in production. Lower indicates better test coverage."
          highlight={escapedHighlight}
        />
        <MetricCard
          title="Defect Leakage"
          value={metrics.defectLeakage !== null ? String(metrics.defectLeakage) : "—"}
          description="Production bugs missed during the testing phase."
          highlight={
            metrics.defectLeakage === null ? null : metrics.defectLeakage === 0 ? "good" : metrics.defectLeakage <= 3 ? "warn" : "bad"
          }
        />
        <MetricCard
          title="Time to Confidence"
          value={fmtMs(metrics.avgTimeToConfidenceMs)}
          description="Avg time from manual run start to completion. Lower is faster."
          highlight={
            metrics.avgTimeToConfidenceMs === null
              ? null
              : metrics.avgTimeToConfidenceMs < 30 * 60_000
              ? "good"
              : metrics.avgTimeToConfidenceMs < 120 * 60_000
              ? "warn"
              : "bad"
          }
        />
        <MetricCard
          title="Total Test Cases"
          value={String(testCaseCount)}
          description="Test cases in this project."
          highlight={null}
        />
      </div>

      {/* ── Defect density table ── */}
      {metrics.defectDensity.length > 0 && (
        <div className="mb-8">
          <h2 className="text-base font-semibold mb-3">Defect Density by Module</h2>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Module / Suite</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Failures</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {metrics.defectDensity.map((d) => (
                  <tr key={d.module} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">{d.module}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{d.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Historical trend ── */}
      {history.length > 1 && (
        <div>
          <h2 className="text-base font-semibold mb-3">Historical Trend</h2>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Date</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Coverage %</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">DDP %</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Escaped Defects</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {[...history].reverse().map((h, i) => (
                  <tr key={i} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">{new Date(h.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{h.testCoverage}%</td>
                    <td className="px-4 py-3 text-right tabular-nums">{h.ddp}%</td>
                    <td className="px-4 py-3 text-right tabular-nums">{h.escapedDefects}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!latestReport && (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center mt-8">
          <p className="text-sm font-medium">No metrics data yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Click &ldquo;Log data&rdquo; to enter your first report.
          </p>
          <Button className="mt-4" onClick={() => setShowLogDialog(true)}>Log data</Button>
        </div>
      )}
    </>
  );
}
