import { difficulty, scoreLevel } from '@/theme/tokens';

// ── Difficulty badge ────────────────────────────────────────────────────────────
interface DifficultyBadgeProps {
  level: string;
}

export function DifficultyBadge({ level }: DifficultyBadgeProps) {
  const cls =
    difficulty[level as keyof typeof difficulty] ??
    'rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-500';
  return <span className={`${cls} capitalize`}>{level}</span>;
}

// ── Score level badge ───────────────────────────────────────────────────────────
type ScoreLevel = 'Mastered' | 'In Progress' | 'Needs Review';

interface ScoreLevelBadgeProps {
  level: ScoreLevel;
}

const LEVEL_CLASSES: Record<ScoreLevel, string> = {
  'Mastered':     scoreLevel.mastered,
  'In Progress':  scoreLevel.inProgress,
  'Needs Review': scoreLevel.needsReview,
};

export function ScoreLevelBadge({ level }: ScoreLevelBadgeProps) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${LEVEL_CLASSES[level]}`}>
      {level}
    </span>
  );
}

// ── Category badge ──────────────────────────────────────────────────────────────
interface CategoryBadgeProps {
  category: string;
}

export function CategoryBadge({ category }: CategoryBadgeProps) {
  return (
    <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600 capitalize">
      {category}
    </span>
  );
}
