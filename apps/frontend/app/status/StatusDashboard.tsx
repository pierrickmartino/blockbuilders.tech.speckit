'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/design-system/Button';
import { CoverageRange, FilterBar, StatusBadge, VendorBadge } from '@/components/status';
import type { AssetStatus, RemediationEntry } from '@/lib/status-client';
import { fetchRemediation, fetchStatusSummary } from '@/lib/status-client';
import { cn } from '@/lib/cn';

const REFRESH_INTERVAL_MS = Number(process.env.NEXT_PUBLIC_STATUS_REFRESH_MS ?? 30_000);

interface StatusDashboardProps {
  initialAssets: AssetStatus[];
  initialRemediation: RemediationEntry[];
}

export function StatusDashboard({ initialAssets, initialRemediation }: StatusDashboardProps) {
  const [assets, setAssets] = useState<AssetStatus[]>(initialAssets);
  const [remediation, setRemediation] = useState<RemediationEntry[]>(initialRemediation);
  const [onlyStale, setOnlyStale] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(new Date());

  const refresh = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!opts.silent) setLoading(true);
      setError(null);
      try {
        const summary = await fetchStatusSummary({ onlyStale });
        setAssets(summary.assets);
        setLastUpdated(new Date());
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to refresh status';
        setError(message);
      } finally {
        if (!opts.silent) setLoading(false);
      }
    },
    [onlyStale],
  );

  useEffect(() => {
    refresh();
  }, [onlyStale, refresh]);

  useEffect(() => {
    const timer = setInterval(() => refresh({ silent: true }), REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const staleCount = useMemo(() => assets.filter((a) => a.status !== 'healthy').length, [assets]);

  const exportRemediation = useCallback(async () => {
    const data = await fetchRemediation();
    setRemediation(data.items);
    const blob = new Blob([JSON.stringify(data.items, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'remediation.json';
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">OHLCV coverage</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold text-slate-900">Status & Freshness</h1>
          <VendorBadge state={assets.find((a) => a.vendor_status)?.vendor_status} />
          {staleCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
              <span aria-hidden className="inline-block text-lg leading-none">⚠️</span> {staleCount} stale
            </span>
          ) : null}
        </div>
        <p className="max-w-3xl text-sm text-slate-600">
          Coverage windows, freshness, and vendor availability for the 10 configured assets. Auto-refreshes every
          30s; export remediation entries for audits.
        </p>
      </header>

      <FilterBar
        onlyStale={onlyStale}
        onToggleOnlyStale={() => setOnlyStale((prev) => !prev)}
        onRefresh={() => refresh()}
        refreshing={loading}
        lastUpdated={lastUpdated ?? undefined}
        refreshIntervalMs={REFRESH_INTERVAL_MS}
      />

      {error ? (
        <div className="flex items-center gap-3 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800">
          <span aria-hidden className="text-lg">ℹ️</span>
          <p className="text-sm" data-testid="error-message">{error}</p>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" data-testid="status-table">
        <table className="min-w-full divide-y divide-slate-200">
          <caption className="sr-only">Asset coverage and freshness</caption>
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                Asset
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                Interval
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                Coverage
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                Latest
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                Freshness (m)
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                Vendor
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {assets.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500">
                  No assets matched the current filter.
                </td>
              </tr>
            ) : (
              assets.map((asset) => (
                <tr
                  key={`${asset.asset}-${asset.interval}`}
                  data-testid="status-row"
                  className={cn(
                    'transition-colors',
                    asset.status !== 'healthy' ? 'bg-amber-50/60' : undefined,
                  )}
                >
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900">{asset.asset}</td>
                  <td className="px-4 py-3 text-sm uppercase text-slate-700">{asset.interval}</td>
                  <td className="px-4 py-3">
                    <CoverageRange start={asset.coverage_start} end={asset.coverage_end} />
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {asset.latest_timestamp ? new Date(asset.latest_timestamp).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {asset.freshness_minutes?.toFixed(1) ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge state={asset.status} />
                  </td>
                  <td className="px-4 py-3">
                    <VendorBadge state={asset.vendor_status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Remediation export</h2>
            <p className="text-xs text-slate-600">Download the latest remediation log entries as JSON.</p>
          </div>
          <Button size="sm" onClick={exportRemediation} data-testid="export-remediation">
            <span aria-hidden className="mr-2 inline-block">⬇️</span>
            Export JSON ({remediation.length})
          </Button>
        </div>
      </section>
    </div>
  );
}
