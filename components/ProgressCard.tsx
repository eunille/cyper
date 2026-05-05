'use client';

interface Progress {
  topicName: string;
  category: string;
  attempts: number;
  bestScore: number | null;
  lastScore: number | null;
  mastered: boolean;
  lastStudied: string | null;
}

interface ProgressCardProps {
  progress: Progress;
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full rounded-full bg-neutral-900 transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function ProgressCard({ progress }: ProgressCardProps) {
  const lastStudiedDate = progress.lastStudied
    ? new Date(progress.lastStudied).toLocaleDateString()
    : null;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-neutral-900">{progress.topicName}</p>
          <p className="mt-0.5 text-xs text-neutral-400">{progress.category}</p>
        </div>
        {progress.mastered && (
          <span className="flex-shrink-0 rounded-full border border-neutral-900 px-2.5 py-0.5 text-xs font-semibold text-neutral-900">
            Mastered
          </span>
        )}
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-neutral-400">Best score</span>
          <span className="font-semibold text-neutral-900">
            {progress.bestScore !== null ? `${progress.bestScore}/100` : '–'}
          </span>
        </div>
        <ScoreBar score={progress.bestScore ?? 0} />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-neutral-400">
        <span>{progress.attempts} session{progress.attempts !== 1 ? 's' : ''}</span>
        {lastStudiedDate && <span>{lastStudiedDate}</span>}
      </div>
    </div>
  );
}
