'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopicChip } from '@/components/TopicChip';

type Difficulty = 'beginner' | 'intermediate' | 'advanced';

interface Topic {
  topicId: string;
  name: string;
  category: string;
  difficulty: Difficulty;
}

interface TopicsPageClientProps {
  topics: Topic[];
}

const ALL = 'All';

export function TopicsPageClient({ topics }: TopicsPageClientProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>(ALL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = [ALL, ...Array.from(new Set(topics.map((t) => t.category)))];
  const visible = filter === ALL ? topics : topics.filter((t) => t.category === filter);

  async function handleStart() {
    const personaId = sessionStorage.getItem('personaId');
    if (!selected || !personaId) {
      setError('Please go back and select a tutor first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personaId, topicId: selected }),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? 'Failed to start session');
        return;
      }
      const { sessionId } = data as { sessionId: string };
      router.push(`/learn/session/${sessionId}`);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Step header */}
      <header className="sticky top-0 z-10 border-b border-neutral-100 bg-white px-4 py-3">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
              aria-label="Back"
            >
              ←
            </button>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
              <div className="h-full w-full rounded-full bg-neutral-900 transition-all" />
            </div>
            <span className="flex-shrink-0 text-xs font-medium text-neutral-400">2 / 2</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-lg px-4 py-8 pb-28">
        <h1 className="mb-1 text-2xl font-bold text-neutral-900">Choose a topic</h1>
        <p className="mb-6 text-sm text-neutral-500">
          Select a topic to study. Your tutor will guide you through it step by step.
        </p>

        {/* Category filter */}
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => { setFilter(cat); setSelected(null); }}
              className={[
                'flex-shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors',
                filter === cat
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300',
              ].join(' ')}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Topic list */}
        <div className="space-y-2">
          {visible.map((t) => (
            <TopicChip
              key={t.topicId}
              topic={t}
              selected={selected === t.topicId}
              onSelect={() => setSelected(t.topicId)}
            />
          ))}
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}
      </main>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-neutral-100 bg-white px-4 py-4">
        <div className="mx-auto max-w-lg">
          <button
            type="button"
            disabled={!selected || loading}
            onClick={handleStart}
            className="w-full rounded-xl bg-neutral-900 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {loading ? 'Starting…' : 'Start learning'}
          </button>
        </div>
      </div>
    </div>
  );
}
