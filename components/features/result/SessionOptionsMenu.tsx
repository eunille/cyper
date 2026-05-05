'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SessionResult } from '@/types/session';

interface Props {
  session: Pick<SessionResult, 'sessionId' | 'topicId' | 'personaId'>;
}

export function SessionOptionsMenu({ session }: Props) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleRetry() {
    setBusy(true);
    setShowMenu(false);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personaId: session.personaId, topicId: session.topicId }),
      });
      if (!res.ok) throw new Error('Failed to create session');
      const json = await res.json() as { sessionId: string };
      router.push(`/learn/session/${json.sessionId}`);
    } catch {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this session and all its messages? This cannot be undone.')) return;
    setBusy(true);
    setShowMenu(false);
    try {
      await fetch(`/api/sessions/${session.sessionId}`, { method: 'DELETE' });
      router.push('/dashboard');
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className="relative ml-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => setShowMenu((v) => !v)}
        className="flex h-6 w-6 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-50"
        aria-label="More options"
      >
        {busy ? (
          <span className="h-3 w-3 animate-spin rounded-full border border-neutral-300 border-t-neutral-600" />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M3 10a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM8.5 10a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM15.5 8.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
          </svg>
        )}
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
          <div className="absolute left-0 top-8 z-20 min-w-[160px] rounded-xl border border-neutral-100 bg-white py-1 shadow-lg">
            <button
              type="button"
              onClick={() => void handleRetry()}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-neutral-700 transition-colors hover:bg-neutral-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 flex-shrink-0">
                <path fillRule="evenodd" d="M15.312 3.312a8 8 0 1 1-11.313 11.314l1.415-1.415a6 6 0 1 0 8.484-8.484V7a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1h4a1 1 0 1 1 0 2h-1.586Z" clipRule="evenodd" />
              </svg>
              Retry session
            </button>
            <div className="my-1 border-t border-neutral-100" />
            <button
              type="button"
              onClick={() => void handleDelete()}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-rose-600 transition-colors hover:bg-rose-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 flex-shrink-0">
                <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
              </svg>
              Delete session
            </button>
          </div>
        </>
      )}
    </div>
  );
}
