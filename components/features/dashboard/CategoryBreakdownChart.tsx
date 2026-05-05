export interface CategoryEntry {
  category: string;
  sessions: number;
  mastered: number;
}

interface Props {
  data: CategoryEntry[];
}

export function CategoryBreakdownChart({ data }: Props) {
  const max = Math.max(...data.map((d) => d.sessions), 1);

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-neutral-400">No progress yet.</p>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((entry) => (
        <div key={entry.category}>
          <div className="mb-1 flex items-center justify-between">
            <span className="max-w-[55%] truncate text-sm font-medium text-neutral-900">
              {entry.category}
            </span>
            <span className="text-xs text-neutral-400">
              {entry.sessions} attempt{entry.sessions !== 1 ? 's' : ''}
              {entry.mastered > 0 ? ` · ${entry.mastered} mastered` : ''}
            </span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-neutral-900 transition-all"
              style={{ width: `${Math.min((entry.sessions / max) * 100, 80)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
