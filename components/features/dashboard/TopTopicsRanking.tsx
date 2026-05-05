export interface TopicRankEntry {
  topic: string;
  count: number;
  bestScore: number | null;
  lastScore: number | null;
}

interface Props {
  data: TopicRankEntry[];
}

export function TopTopicsRanking({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-neutral-400">No sessions yet.</p>
    );
  }

  return (
    <div className="divide-y divide-neutral-50">
      {data.map((entry, i) => {
        const trend =
          entry.lastScore !== null && entry.bestScore !== null
            ? entry.lastScore >= entry.bestScore * 0.9
              ? 'up'
              : 'down'
            : null;

        return (
          <div
            key={entry.topic}
            className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
          >
            <span className="w-5 flex-shrink-0 text-xs font-bold text-neutral-300">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-neutral-900">
                {entry.topic}
              </p>
              <p className="text-xs text-neutral-400">
                {entry.count} session{entry.count !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex-shrink-0 text-right">
              {entry.bestScore !== null ? (
                <>
                  <p className="text-sm font-semibold text-neutral-900">
                    {entry.bestScore}
                  </p>
                  <p className="text-[10px] text-neutral-400">best</p>
                </>
              ) : (
                <p className="text-sm text-neutral-300">—</p>
              )}
            </div>
            {trend !== null && (
              <span
                className={`flex-shrink-0 text-sm ${
                  trend === 'up' ? 'text-neutral-900' : 'text-neutral-400'
                }`}
              >
                {trend === 'up' ? '↑' : '↓'}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
