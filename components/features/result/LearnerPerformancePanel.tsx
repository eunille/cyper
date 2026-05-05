'use client';

import { useState } from 'react';
import { ScoreLevelBadge } from '@/components/ui/Badge';
import type { SessionResult } from '@/types/session';

type ScoreLevel = 'Mastered' | 'In Progress' | 'Needs Review';

interface PerformanceInsights {
  level: ScoreLevel;
  strengths: string[];
  improvements: string[];
  nextSteps: string[];
}

export function buildPerformanceInsights(
  session: Pick<SessionResult, 'score' | 'userMessages' | 'gaps' | 'topicName' | 'topicCategory' | 'topicDifficulty'>,
  phaseCounts: Record<string, number>,
): PerformanceInsights {
  const score = session.score ?? 0;
  const level: ScoreLevel = score >= 80 ? 'Mastered' : score >= 50 ? 'In Progress' : 'Needs Review';

  const strengths: string[] = [];
  const topPhase = Object.entries(phaseCounts).sort((a, b) => b[1] - a[1])[0];
  if (topPhase && topPhase[1] > 0) {
    const phaseLabel: Record<string, string> = {
      diagnostic: 'prior knowledge sharing',
      explain:    'concept exploration',
      check:      'comprehension checks',
      recap:      'summary and review',
      practice:   'hands-on practice',
    };
    strengths.push(`Strong engagement during ${phaseLabel[topPhase[0]] ?? topPhase[0]} phase`);
  }
  if (score >= 70) strengths.push('Solid understanding of core concepts demonstrated');
  if (session.userMessages >= 5) strengths.push('Actively participated throughout the session');
  if (session.gaps.length === 0 && score >= 80) strengths.push('No significant knowledge gaps identified');

  const improvements: string[] = [...session.gaps.slice(0, 4)];
  if (score < 50) improvements.unshift('Review foundational concepts before advancing');
  if (score >= 50 && score < 70) improvements.unshift('Revisit topics that triggered hints from the tutor');

  const nextSteps: string[] = [];
  if (level === 'Mastered') {
    nextSteps.push(`Explore an advanced topic in ${session.topicCategory}`);
    nextSteps.push('Challenge yourself with a harder difficulty session');
  } else if (level === 'In Progress') {
    nextSteps.push(`Retry "${session.topicName}" to push your score above 80`);
    nextSteps.push('Focus on the knowledge gaps listed below');
  } else {
    nextSteps.push(`Re-study "${session.topicName}" from the beginning`);
    nextSteps.push('Try a beginner-difficulty session to build confidence');
  }
  if (session.topicDifficulty !== 'advanced') {
    nextSteps.push('Move to intermediate or advanced difficulty once you master this');
  }

  return { level, strengths, improvements, nextSteps };
}

interface Props {
  session: Pick<SessionResult, 'score' | 'userMessages' | 'gaps' | 'topicName' | 'topicCategory' | 'topicDifficulty'>;
  phaseCounts: Record<string, number>;
}

export function LearnerPerformancePanel({ session, phaseCounts }: Props) {
  const [open, setOpen] = useState(false);
  const insights = buildPerformanceInsights(session, phaseCounts);

  return (
    <div className="rounded-2xl border border-neutral-100 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Learner performance
        </span>
        <div className="flex items-center gap-2">
          <ScoreLevelBadge level={insights.level} />
          <span className="text-[10px] text-neutral-400">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-neutral-100 px-5 pb-5 pt-4 space-y-4">
          <InsightSection
            label="Strengths"
            color="emerald"
            icon="✓"
            items={insights.strengths}
            emptyText="Complete a session to see strengths."
          />
          <InsightSection
            label="Needs improvement"
            color="amber"
            icon="△"
            items={insights.improvements}
            emptyText="No gaps identified — great work!"
          />
          <InsightSection
            label="Recommended next steps"
            color="neutral"
            icon="→"
            items={insights.nextSteps}
            emptyText=""
          />
        </div>
      )}
    </div>
  );
}

const BORDER_COLORS: Record<string, string> = {
  emerald: 'border-emerald-200',
  amber:   'border-amber-200',
  neutral: 'border-neutral-200',
};
const LABEL_COLORS: Record<string, string> = {
  emerald: 'text-emerald-600',
  amber:   'text-amber-600',
  neutral: 'text-neutral-500',
};

interface InsightSectionProps {
  label: string;
  color: string;
  icon: string;
  items: string[];
  emptyText: string;
}

function InsightSection({ label, color, icon, items, emptyText }: InsightSectionProps) {
  return (
    <div>
      <p className={`mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${LABEL_COLORS[color]}`}>
        <span>{icon}</span> {label}
      </p>
      {items.length > 0 ? (
        <ul className="space-y-1">
          {items.map((s) => (
            <li key={s} className={`text-[12px] leading-snug text-neutral-700 pl-3 border-l-2 ${BORDER_COLORS[color]}`}>
              {s}
            </li>
          ))}
        </ul>
      ) : emptyText ? (
        <p className="text-[12px] text-neutral-400 pl-3">{emptyText}</p>
      ) : null}
    </div>
  );
}
