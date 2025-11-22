type Props = {
  start?: string | null;
  end?: string | null;
};

const formatter = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

export function CoverageRange({ start, end }: Props) {
  return (
    <div className="flex flex-col text-sm text-slate-700">
      <span className="font-medium">{formatter(start)}</span>
      <span className="text-xs text-slate-500">to {formatter(end)}</span>
    </div>
  );
}
