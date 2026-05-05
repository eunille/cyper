'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PhaseCountsChart } from '@/components/SessionCharts';
import { SessionOptionsMenu } from '@/components/features/result/SessionOptionsMenu';
import { ScoreStatsCard } from '@/components/features/result/ScoreStatsCard';
import { LearnerPerformancePanel } from '@/components/features/result/LearnerPerformancePanel';
import { TranscriptPanel } from '@/components/features/result/TranscriptPanel';
import { DifficultyBadge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { ResultPageSkeleton } from '@/theme/skeletons';
import type { ResultData } from '@/types/session';

export default function SessionResultPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/sessions/${params.id}/result`);
        if (!res.ok) { router.push('/dashboard'); return; }
        setData(await res.json() as ResultData);
      } catch {
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [params.id, router]);

  if (loading) return <ResultPageSkeleton />;
  if (!data) return null;

  const { session, messages, phaseCounts } = data;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-neutral-100 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-neutral-900"
          >
            ← Dashboard
          </Link>
          <Link
            href="/learn"
            className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-700"
          >
            New session →
          </Link>
        </div>
      </header>

      {/* Full-width topic header */}
      <div className="mx-auto max-w-7xl px-4 pt-8 pb-4">
        <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
          {session.topicCategory}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-neutral-900">{session.topicName}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-sm text-neutral-500">with {session.personaName}</span>
          <span className="text-neutral-300">·</span>
          <DifficultyBadge level={session.topicDifficulty} />
          {session.endedAt && (
            <>
              <span className="text-neutral-300">·</span>
              <span className="text-xs text-neutral-400">
                {new Date(session.endedAt).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })}
              </span>
            </>
          )}
          <SessionOptionsMenu session={session} />
        </div>
      </div>

      {/* Two-column layout */}
      <div className="mx-auto flex max-w-7xl gap-6 px-4 pb-8 lg:flex-row flex-col">

        {/* LEFT — analytics */}
        <div className="flex flex-col gap-5 lg:w-[420px] lg:flex-shrink-0">
          <ScoreStatsCard session={session} />

          <SectionCard title="Engagement by phase">
            <PhaseCountsChart phaseCounts={phaseCounts} />
          </SectionCard>

          {session.summary && (
            <SectionCard title="Session summary">
              <p className="text-sm leading-relaxed text-neutral-700">{session.summary}</p>
            </SectionCard>
          )}

          {session.gaps.length > 0 && (
            <SectionCard title="Knowledge gaps to review">
              <ul className="space-y-2">
                {session.gaps.map((gap) => (
                  <li key={gap} className="flex items-start gap-2 text-sm text-neutral-700">
                    <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-[9px] font-bold text-amber-700">
                      !
                    </span>
                    {gap}
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          <LearnerPerformancePanel session={session} phaseCounts={phaseCounts} />
        </div>

        {/* RIGHT — transcript */}
        <TranscriptPanel messages={messages} />

      </div>
    </div>
  );
}
