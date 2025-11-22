import clsx from 'clsx';

type StatusState = 'healthy' | 'stale' | 'gap_detected';

type Props = {
  state: StatusState;
  label?: string;
  'data-testid'?: string;
};

const COLOR_MAP: Record<StatusState, string> = {
  healthy: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  stale: 'bg-amber-100 text-amber-800 ring-amber-200',
  gap_detected: 'bg-rose-100 text-rose-800 ring-rose-200',
};

export function StatusBadge({ state, label, 'data-testid': testId }: Props) {
  const text = label ?? state.replace('_', ' ');
  return (
    <span
      data-testid={testId}
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset capitalize',
        COLOR_MAP[state],
      )}
    >
      <span className="inline-block h-2 w-2 rounded-full bg-current opacity-75" />
      {text}
    </span>
  );
}

export function VendorBadge({ state }: { state?: 'up' | 'degraded' | 'down' | 'rate_limited' }) {
  if (!state) return null;

  const label =
    state === 'rate_limited' || state === 'down'
      ? 'Unavailable / Rate-limited'
      : state === 'degraded'
        ? 'Degraded'
        : 'Available';

  const color =
    state === 'down' || state === 'rate_limited'
      ? 'bg-rose-100 text-rose-800 ring-rose-200'
      : state === 'degraded'
        ? 'bg-amber-100 text-amber-800 ring-amber-200'
        : 'bg-emerald-100 text-emerald-800 ring-emerald-200';

  return (
    <span
      data-testid="vendor-badge"
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset',
        color,
      )}
    >
      <span className="inline-block h-2 w-2 rounded-full bg-current opacity-75" />
      {label}
    </span>
  );
}

export function AlertBadge({ status, lagMinutes }: { status?: 'open' | 'cleared'; lagMinutes?: number | null }) {
  if (!status || status !== 'open') return null;

  const label = typeof lagMinutes === 'number' ? `${lagMinutes}m lag` : 'Open alert';

  return (
    <span
      data-testid="alert-badge"
      className={clsx(
        'inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800 ring-1 ring-inset ring-rose-200',
      )}
    >
      <span className="inline-block h-2 w-2 rounded-full bg-current opacity-75" />
      {label}
    </span>
  );
}
