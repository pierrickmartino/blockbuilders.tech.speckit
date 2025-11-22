import { StatusDashboard } from './StatusDashboard';
import { fetchRemediation, fetchStatusSummary } from '@/lib/status-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function StatusPage() {
  const [summary, remediation] = await Promise.all([
    fetchStatusSummary(),
    fetchRemediation(),
  ]);

  return (
    <StatusDashboard
      initialAssets={summary.assets}
      initialRemediation={remediation.items}
    />
  );
}
