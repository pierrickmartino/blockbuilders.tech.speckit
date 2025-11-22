import { Button } from '@/components/design-system/Button';

interface Props {
  onlyStale: boolean;
  onToggleOnlyStale: () => void;
  onRefresh: () => void;
  refreshing?: boolean;
  lastUpdated?: Date;
  refreshIntervalMs?: number;
}

export function FilterBar({ onlyStale, onToggleOnlyStale, onRefresh, refreshing, lastUpdated, refreshIntervalMs }: Props) {
  const intervalSeconds = refreshIntervalMs ? Math.round(refreshIntervalMs / 1000) : 30;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-800">
          <input
            type="checkbox"
            checked={onlyStale}
            onChange={onToggleOnlyStale}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            data-testid="stale-filter-toggle"
          />
          Show only stale assets
        </label>
        <p className="text-xs text-slate-500">Auto-refresh every {intervalSeconds}s</p>
        {lastUpdated ? (
          <p className="text-xs text-slate-500" data-testid="last-updated">
            Updated {lastUpdated.toLocaleTimeString()}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={onRefresh}
          disabled={refreshing}
          data-testid="refresh-button"
        >
          <span aria-hidden className="mr-2 inline-block">↻</span>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>
    </div>
  );
}
