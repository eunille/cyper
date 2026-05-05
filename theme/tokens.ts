/**
 * Design tokens — single source of truth for CyberTutor AI's visual system.
 * Palette: white background · black primary · neutral grays · clean minimalist.
 * Import from here in all components and pages for consistency.
 */

// ── Buttons ──────────────────────────────────────────────────────────────────
export const btn = {
  primary:
    'inline-flex items-center justify-center rounded-xl bg-neutral-900 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-30',
  secondary:
    'inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white px-6 py-3.5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2',
  sm: 'inline-flex items-center justify-center rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-900 disabled:opacity-40',
  ghost:
    'inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-none',
} as const;

// ── Form ──────────────────────────────────────────────────────────────────────
export const input =
  'w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 transition-colors focus:border-neutral-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 disabled:opacity-50';

// ── Cards ─────────────────────────────────────────────────────────────────────
export const card = {
  base: 'rounded-2xl border border-neutral-200 bg-white',
  selected: 'rounded-2xl border-2 border-neutral-900 bg-white',
  interactive:
    'rounded-2xl border border-neutral-200 bg-white cursor-pointer transition-all hover:border-neutral-300 hover:shadow-sm',
} as const;

// ── Difficulty badges ─────────────────────────────────────────────────────────
export const difficulty = {
  beginner: 'rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700',
  intermediate: 'rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700',
  advanced: 'rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-600',
} as const;

// ── Section card ─────────────────────────────────────────────────────────────
export const sectionCard = 'rounded-2xl border border-neutral-100 bg-white p-5';

// ── Section label (uppercase heading inside cards) ────────────────────────────
export const sectionLabel = 'text-xs font-semibold uppercase tracking-wider text-neutral-400';

// ── Score level (Mastered / In Progress / Needs Review) ──────────────────────
export const scoreLevel = {
  mastered:   'bg-emerald-100 text-emerald-800',
  inProgress: 'bg-amber-100 text-amber-800',
  needsReview: 'bg-rose-100 text-rose-800',
} as const;

// ── Typography ────────────────────────────────────────────────────────────────
export const text = {
  h1: 'text-2xl font-bold text-neutral-900',
  h2: 'text-xl font-semibold text-neutral-900',
  body: 'text-sm text-neutral-700',
  muted: 'text-sm text-neutral-500',
  xs: 'text-xs text-neutral-400',
} as const;
