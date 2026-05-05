'use client';

type Phase = 'diagnostic' | 'explain' | 'check' | 'recap' | 'practice' | 'ended';

interface Beat {
  key: Phase;
  label: string;
}

const BEATS: Beat[] = [
  { key: 'diagnostic', label: 'Assess' },
  { key: 'explain',    label: 'Learn'  },
  { key: 'check',      label: 'Check'  },
  { key: 'recap',      label: 'Recap'  },
  { key: 'practice',   label: 'Practice' },
];

const BEAT_INDEX: Record<Phase, number> = {
  diagnostic: 0,
  explain:    1,
  check:      2,
  recap:      3,
  practice:   4,
  ended:      5,
};

interface PhaseIndicatorProps {
  phase: Phase;
}

export function PhaseIndicator({ phase }: PhaseIndicatorProps) {
  const current = BEAT_INDEX[phase];
  const total = BEATS.length;
  const isEnded = phase === 'ended';

  // Fraction of the bar to fill (complete = fully filled)
  const progressPct = isEnded ? 100 : (current / total) * 100;

  const activeLabel = isEnded ? 'Complete' : BEATS[current]?.label ?? '';

  return (
    <div className="flex items-center gap-3" aria-label={`Session progress: ${activeLabel}`}>
      {/* Progress bar */}
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
        <div
          className="h-full rounded-full bg-neutral-900 transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Label */}
      <span className="flex-shrink-0 text-xs font-medium tabular-nums text-neutral-400">
        {isEnded ? (
          <span className="text-neutral-900">✓ Done</span>
        ) : (
          <>
            <span className="text-neutral-900">{activeLabel}</span>
            {' '}
            <span>· {current + 1}/{total}</span>
          </>
        )}
      </span>
    </div>
  );
}
