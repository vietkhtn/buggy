import { redirect } from "next/navigation";

// Redirect old report URL to the new sidebar-free report page.
export default async function RunReportRedirect({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  redirect(`/report/runs/${runId}`);
}
