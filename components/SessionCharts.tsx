'use client';

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

const PHASE_LABELS: Record<string, string> = {
  diagnostic: 'Assess',
  explain:    'Learn',
  check:      'Check',
  recap:      'Recap',
  practice:   'Practice',
};

interface PhaseCountsChartProps {
  phaseCounts: Record<string, number>;
}

export function PhaseCountsChart({ phaseCounts }: PhaseCountsChartProps) {
  const phases = ['diagnostic', 'explain', 'check', 'recap', 'practice'];
  const data = phases.map((p) => ({
    phase: PHASE_LABELS[p] ?? p,
    messages: phaseCounts[p] ?? 0,
  }));

  const hasData = data.some((d) => d.messages > 0);
  if (!hasData) return null;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
        <PolarGrid stroke="#e5e5e5" />
        <PolarAngleAxis
          dataKey="phase"
          tick={{ fontSize: 11, fill: '#737373' }}
        />
        <Radar
          name="Messages"
          dataKey="messages"
          stroke="#171717"
          fill="#171717"
          fillOpacity={0.12}
          strokeWidth={1.5}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: '1px solid #e5e5e5',
            boxShadow: 'none',
          }}
          formatter={(v) => [`${String(v)} msg`, 'You asked']}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

interface ScoreGaugeProps {
  score: number;
}

export function ScoreGauge({ score }: ScoreGaugeProps) {
  const color =
    score >= 80 ? '#16a34a'
    : score >= 50 ? '#d97706'
    : '#dc2626';

  const label =
    score >= 80 ? 'Mastered'
    : score >= 50 ? 'In progress'
    : 'Needs review';

  return (
    <div className="flex flex-col items-center justify-center">
      <div
        className="relative flex h-28 w-28 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(${color} ${score * 3.6}deg, #f5f5f5 0deg)`,
        }}
      >
        <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-white">
          <span className="text-2xl font-bold text-neutral-900">{score}</span>
          <span className="text-[10px] text-neutral-400">/ 100</span>
        </div>
      </div>
      <span
        className="mt-2 rounded-full px-2.5 py-0.5 text-xs font-semibold"
        style={{ background: `${color}18`, color }}
      >
        {label}
      </span>
    </div>
  );
}
