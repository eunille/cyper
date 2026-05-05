import { ScoreGauge } from '@/components/SessionCharts';
import { sectionCard } from '@/theme/tokens';
import type { SessionResult } from '@/types/session';

function formatDuration(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

interface Props {
  session: Pick<SessionResult, 'score' | 'durationMs' | 'userMessages' | 'totalMessages' | 'gaps'>;
}

export function ScoreStatsCard({ session }: Props) {
  const stats = [
    { label: 'Duration',        value: session.durationMs ? formatDuration(session.durationMs) : '—' },
    { label: 'Your messages',   value: session.userMessages },
    { label: 'Total exchanges', value: session.totalMessages },
    { label: 'Gaps identified', value: session.gaps.length },
  ];

  return (
    <div className={sectionCard}>
      <div className="flex items-center gap-6">
        {session.score !== null ? (
          <ScoreGauge score={session.score} />
        ) : (
          <div className="text-sm text-neutral-400">No score</div>
        )}
        <div className="grid flex-1 grid-cols-2 gap-3">
          {stats.map(({ label, value }) => (
            <div key={label}>
              <p className="text-base font-bold text-neutral-900">{value}</p>
              <p className="text-[11px] text-neutral-400">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
