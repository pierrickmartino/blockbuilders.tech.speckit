import { StatusDashboard } from './StatusDashboard';
import { fetchLatestRun, fetchRemediation, fetchStatusSummary } from '@/lib/status-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function StatusPage() {
  const [summary, remediation, latestRun] = await Promise.all([
    fetchStatusSummary(),
    fetchRemediation(),
    fetchLatestRun().catch(() => null),
  ]);

  return (
    <StatusDashboard
      initialAssets={summary.assets}
      initialRemediation={remediation.items}
      latestRun={latestRun ?? undefined}
    />
  );
}
