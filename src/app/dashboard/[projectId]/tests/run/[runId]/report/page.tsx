import { redirect } from "next/navigation";

export default async function RunReportRedirect({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  redirect(`/report/runs/${runId}`);
}
