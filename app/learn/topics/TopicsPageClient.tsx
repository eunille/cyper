'use client';

import { useState, useMemo } from 'react';
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

const DIFF_ORDER: Difficulty[] = ['beginner', 'intermediate', 'advanced'];

export function TopicsPageClient({ topics }: TopicsPageClientProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>(ALL);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = useMemo(
    () => [ALL, ...Array.from(new Set(topics.map((t) => t.category))).sort()],
    [topics],
  );

  const counts = useMemo(() => {
    const map: Record<string, number> = { [ALL]: topics.length };
    for (const t of topics) map[t.category] = (map[t.category] ?? 0) + 1;
    return map;
  }, [topics]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return topics.filter((t) => {
      if (filter !== ALL && t.category !== filter) return false;
      if (q && !t.name.toLowerCase().includes(q) && !t.category.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [topics, filter, search]);

  // Group by category only when showing All and no active search
  const grouped = useMemo(() => {
    if (filter !== ALL || search.trim()) return null;
    const map = new Map<string, Topic[]>();
    for (const t of visible) {
      const arr = map.get(t.category) ?? [];
      arr.push(t);
      map.set(t.category, arr);
    }
    return map;
  }, [filter, search, visible]);

  const selectedTopic = useMemo(() => topics.find((t) => t.topicId === selected), [topics, selected]);

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
      <header className="sticky top-0 z-10 border-b border-neutral-100 bg-white/95 px-4 py-3 backdrop-blur-sm">
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
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
              <div className="h-full w-full rounded-full bg-neutral-900" />
            </div>
            <span className="flex-shrink-0 text-xs font-medium tabular-nums text-neutral-400">2 / 2</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-lg px-4 pb-36 pt-7">
        {/* Heading */}
        <h1 className="mb-0.5 text-2xl font-bold tracking-tight text-neutral-900">Choose a topic</h1>
        <p className="mb-6 text-sm text-neutral-500">
          Your tutor will guide you through it step by step.
        </p>

        {/* Search */}
        <div className="relative mb-4">
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-neutral-400">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 6.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0ZM9.33 10.04a5 5 0 1 1 .71-.71l3.18 3.18a.5.5 0 1 1-.71.71L9.33 10.04Z" fill="currentColor" />
            </svg>
          </span>
          <input
            type="search"
            placeholder="Search topics…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelected(null); }}
            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2.5 pl-10 pr-4 text-sm text-neutral-900 placeholder-neutral-400 transition-colors focus:border-neutral-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute inset-y-0 right-3 flex items-center text-neutral-400 hover:text-neutral-700"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {/* Category filter */}
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => { setFilter(cat); setSelected(null); setSearch(''); }}
              className={[
                'flex-shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors',
                filter === cat
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400',
              ].join(' ')}
            >
              {cat}
              <span className={[
                'ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                filter === cat ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-500',
              ].join(' ')}>
                {counts[cat] ?? 0}
              </span>
            </button>
          ))}
        </div>

        {/* Topic list — grouped when viewing All with no search */}
        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <span className="text-3xl">🔍</span>
            <p className="text-sm font-medium text-neutral-500">No topics match &ldquo;{search}&rdquo;</p>
            <button type="button" onClick={() => setSearch('')} className="text-xs text-neutral-400 underline underline-offset-2 hover:text-neutral-700">
              Clear search
            </button>
          </div>
        ) : grouped ? (
          <div className="space-y-6">
            {Array.from(grouped.entries()).map(([cat, items]) => (
              <section key={cat}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">{cat}</p>
                <div className="space-y-2">
                  {items
                    .slice()
                    .sort((a, b) => DIFF_ORDER.indexOf(a.difficulty) - DIFF_ORDER.indexOf(b.difficulty))
                    .map((t) => (
                      <TopicChip
                        key={t.topicId}
                        topic={t}
                        selected={selected === t.topicId}
                        onSelect={() => setSelected(t.topicId)}
                      />
                    ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
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
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}
      </main>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-neutral-100 bg-white/95 px-4 pb-6 pt-3 backdrop-blur-sm">
        <div className="mx-auto max-w-lg">
          {selectedTopic && (
            <div className="mb-2.5 flex items-center gap-2 rounded-xl border border-neutral-100 bg-neutral-50 px-3.5 py-2">
              <div className="h-1.5 w-1.5 rounded-full bg-neutral-900" />
              <p className="min-w-0 flex-1 truncate text-xs font-medium text-neutral-700">{selectedTopic.name}</p>
              <span className="flex-shrink-0 text-xs text-neutral-400">{selectedTopic.category}</span>
            </div>
          )}
          <button
            type="button"
            disabled={!selected || loading}
            onClick={handleStart}
            className="w-full rounded-xl bg-neutral-900 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {loading ? 'Starting…' : selected ? 'Start learning →' : 'Select a topic to begin'}
          </button>
        </div>
      </div>
    </div>
  );
}
