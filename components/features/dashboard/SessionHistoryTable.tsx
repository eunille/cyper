'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface SessionRow {
  id: string;
  session_id: string;
  persona_name: string;
  topic_name: string;
  started_at: string;
  score: number | null;
}

interface Props {
  sessions: SessionRow[];
}

function monogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

function TutorAvatar({ name }: { name: string }) {
  return (
    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-[10px] font-semibold text-neutral-700">
      {monogram(name)}
    </span>
  );
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-sm text-neutral-300">—</span>;
  const colour =
    score >= 80
      ? 'bg-neutral-900 text-white'
      : score >= 60
        ? 'bg-neutral-200 text-neutral-700'
        : 'bg-neutral-100 text-neutral-500';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colour}`}>
      {score}
    </span>
  );
}

export function SessionHistoryTable({ sessions }: Props) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (sessions.length === 0) return null;

  const filtered = query.trim()
    ? sessions.filter(
        (s) =>
          s.topic_name.toLowerCase().includes(query.toLowerCase()) ||
          s.persona_name.toLowerCase().includes(query.toLowerCase()),
      )
    : sessions;

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((s) => selected.has(s.session_id));

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach((s) => next.delete(s.session_id));
      } else {
        filtered.forEach((s) => next.add(s.session_id));
      }
      return next;
    });
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleDeleteSelected() {
    if (!confirm(`Delete ${selected.size} session${selected.size !== 1 ? 's' : ''}? This cannot be undone.`)) return;
    startTransition(async () => {
      await Promise.all(
        [...selected].map((id) =>
          fetch(`/api/sessions/${id}`, { method: 'DELETE' }),
        ),
      );
      setSelected(new Set());
      router.refresh();
    });
  }

  function handleRowClick(sessionId: string) {
    router.push(`/dashboard/session/${sessionId}`);
  }

  return (
    <section className="mt-6">
      {/* Toolbar */}
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <svg
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search sessions…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white py-1.5 pl-8 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
          />
        </div>
        {query && (
          <button
            onClick={() => setQuery('')}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50"
          >
            Clear
          </button>
        )}
        {selected.size > 0 && (
          <button
            onClick={handleDeleteSelected}
            disabled={isPending}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            {isPending ? 'Deleting…' : `Delete ${selected.size} selected`}
          </button>
        )}
        <span className="ml-auto text-xs text-neutral-400">
          {filtered.length} of {sessions.length}
        </span>
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-2xl border border-neutral-100 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-100 bg-neutral-50">
            <tr>
              {/* Select-all checkbox */}
              <th className="w-10 px-4 py-2.5">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 cursor-pointer rounded border-neutral-300 accent-neutral-900"
                  aria-label="Select all"
                />
              </th>
              <th className="py-2.5 pr-6 text-left text-sm font-medium text-neutral-500">
                Date &amp; Time ↓
              </th>
              <th className="py-2.5 pr-6 text-left text-sm font-medium text-neutral-500">
                Topic
              </th>
              <th className="py-2.5 pr-6 text-left text-sm font-medium text-neutral-500">
                Tutor
              </th>
              <th className="py-2.5 text-right pr-4 text-sm font-medium text-neutral-500">
                Score
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-neutral-400">
                  No sessions match &ldquo;{query}&rdquo;
                </td>
              </tr>
            ) : (
              filtered.map((s) => {
                const isChecked = selected.has(s.session_id);
                return (
                  <tr
                    key={s.session_id}
                    className={`transition-colors ${isChecked ? 'bg-neutral-50' : 'hover:bg-neutral-50'}`}
                  >
                    {/* Checkbox cell — stops row navigation */}
                    <td
                      className="w-10 px-4 py-3"
                      onClick={(e) => { e.stopPropagation(); toggleOne(s.session_id); }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleOne(s.session_id)}
                        className="h-4 w-4 cursor-pointer rounded border-neutral-300 accent-neutral-900"
                        aria-label={`Select ${s.topic_name}`}
                      />
                    </td>
                    <td
                      className="cursor-pointer py-3 pr-6 text-sm text-neutral-500"
                      onClick={() => handleRowClick(s.session_id)}
                    >
                      {new Date(s.started_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </td>
                    <td
                      className="cursor-pointer py-3 pr-6 font-medium text-neutral-900"
                      onClick={() => handleRowClick(s.session_id)}
                    >
                      {s.topic_name}
                    </td>
                    <td
                      className="cursor-pointer py-3 pr-6"
                      onClick={() => handleRowClick(s.session_id)}
                    >
                      <div className="flex items-center gap-2">
                        <TutorAvatar name={s.persona_name} />
                        <span className="text-neutral-700">{s.persona_name}</span>
                      </div>
                    </td>
                    <td
                      className="cursor-pointer py-3 pr-4 text-right"
                      onClick={() => handleRowClick(s.session_id)}
                    >
                      <ScoreBadge score={s.score} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
