/**
 * Skeleton loading components — reusable animated placeholders.
 * Use these while async data is loading to prevent layout shift.
 */

const pulse = 'animate-pulse rounded-lg bg-neutral-100';

// ── Primitive ──────────────────────────────────────────────────────────────────
export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`${pulse} ${className}`} />;
}

// ── Card skeleton ──────────────────────────────────────────────────────────────
export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-2xl border border-neutral-100 bg-white p-5 space-y-3">
      <SkeletonBlock className="h-3 w-24" />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock key={i} className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`} />
      ))}
    </div>
  );
}

// ── Stat card skeleton ─────────────────────────────────────────────────────────
export function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-neutral-100 bg-white p-5 space-y-2">
      <div className="flex items-center gap-4">
        <SkeletonBlock className="h-16 w-16 rounded-full" />
        <div className="grid flex-1 grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <SkeletonBlock className="h-4 w-10" />
              <SkeletonBlock className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Chart skeleton ─────────────────────────────────────────────────────────────
export function ChartSkeleton() {
  return (
    <div className="rounded-2xl border border-neutral-100 bg-white p-5 space-y-3">
      <SkeletonBlock className="h-3 w-32" />
      <SkeletonBlock className="h-40 w-full rounded-xl" />
    </div>
  );
}

// ── Transcript skeleton ────────────────────────────────────────────────────────
export function TranscriptSkeleton({ rows = 5 }: { rows?: number }) {
  const widths = ['w-3/4', 'w-1/2', 'w-4/5', 'w-2/3', 'w-3/5'];
  return (
    <div className="space-y-4 px-5 py-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={['flex gap-2.5', i % 2 === 0 ? 'justify-start' : 'justify-end'].join(' ')}
        >
          {i % 2 === 0 && <SkeletonBlock className="h-6 w-6 rounded-full flex-shrink-0" />}
          <SkeletonBlock className={`h-12 rounded-2xl ${widths[i % widths.length]}`} />
        </div>
      ))}
    </div>
  );
}

// ── Full result page skeleton ──────────────────────────────────────────────────
export function ResultPageSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header bar */}
      <div className="border-b border-neutral-100 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="h-8 w-28 rounded-xl" />
        </div>
      </div>
      {/* Topic header */}
      <div className="mx-auto max-w-7xl px-4 pt-8 pb-4 space-y-2">
        <SkeletonBlock className="h-3 w-20" />
        <SkeletonBlock className="h-7 w-56" />
        <SkeletonBlock className="h-4 w-40" />
      </div>
      {/* Two-column */}
      <div className="mx-auto flex max-w-7xl gap-6 px-4 pb-8 lg:flex-row flex-col">
        <div className="flex flex-col gap-5 lg:w-[420px] lg:flex-shrink-0">
          <StatCardSkeleton />
          <ChartSkeleton />
          <CardSkeleton lines={4} />
          <CardSkeleton lines={2} />
        </div>
        <div className="flex-1 rounded-2xl border border-neutral-100 bg-white overflow-hidden">
          <div className="border-b border-neutral-100 px-5 py-4">
            <SkeletonBlock className="h-4 w-28" />
          </div>
          <TranscriptSkeleton rows={6} />
        </div>
      </div>
    </div>
  );
}
