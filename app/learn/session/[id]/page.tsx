'use client';

import { useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { MessageBubble } from '@/components/MessageBubble';
import { PhaseIndicator } from '@/components/PhaseIndicator';
import { ChatInput } from '@/components/ChatInput';
import { PageSpinner } from '@/components/ui/Spinner';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { useSession } from '@/hooks/useSession';

const READY_REPLIES = ["Yes, I'm ready!", "Let's go!", 'Tell me more first'] as const;
const CHAT_REPLIES = ["I'm stuck", 'Explain more', 'Give me a hint'] as const;

export default function SessionPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id;
  const { meta, messages, sending, greeting, ending, greeted, error, handleSend, handleEndSession, setError } = useSession(sessionId);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!meta) return <PageSpinner />;

  const isDisabled = sending || greeting || meta.phase === 'ended';
  const activeQuickReplies = !greeted || messages.length <= 2 ? READY_REPLIES : CHAT_REPLIES;

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="z-10 border-b border-neutral-100 bg-white px-4 py-3">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Tutor avatar */}
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">
                {meta.personaName.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight text-neutral-900">
                  {meta.personaName}
                </p>
                <p className="text-xs text-neutral-400">{meta.topicName}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {meta.phase === 'ended' ? (
                <span className="rounded-full border border-neutral-900 px-3 py-1 text-xs font-semibold text-neutral-900">
                  Complete
                </span>
              ) : (
                <button
                  type="button"
                  disabled={ending}
                  onClick={handleEndSession}
                  className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-500 transition-colors hover:bg-neutral-50 disabled:opacity-40"
                >
                  {ending ? 'Ending…' : 'End session'}
                </button>
              )}
              <a
                href="/dashboard"
                className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-500 transition-colors hover:bg-neutral-50"
              >
                Dashboard
              </a>
            </div>
          </div>

          {/* Beat / phase progress */}
          <div className="mt-3">
            <PhaseIndicator phase={meta.phase} />
          </div>

          {/* Privacy notice — data minimization disclosure */}
          <p className="mt-1.5 text-center text-[10px] text-neutral-400">
            Messages are processed by an AI provider. Personal data is stripped before transmission.
          </p>
        </div>
      </header>

      {/* ── Messages ───────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {messages.length === 0 && !greeting && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 text-xl font-bold text-white">
                {meta.personaName.charAt(0)}
              </div>
              <p className="text-base font-semibold text-neutral-900">{meta.personaName}</p>
              <p className="mt-1 text-sm text-neutral-400">Starting your session on {meta.topicName}…</p>
            </div>
          )}

          <div className="space-y-6">
            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                role={m.role}
                content={m.content}
                streaming={m.streaming}
              />
            ))}
          </div>

          {error && (
            <ErrorBanner
              message={error}
              onDismiss={() => setError(null)}
              className="mt-4"
            />
          )}

          {/* Scroll anchor */}
          <div ref={bottomRef} className="h-4" />
        </div>
      </main>

      {/* ── Input area ─────────────────────────────────────────────────────── */}
      <div className="bg-white">
        {/* Gradient fade above input */}
        <div className="pointer-events-none h-8 bg-gradient-to-t from-white to-transparent" style={{ marginTop: '-2rem' }} />
        <div className="mx-auto max-w-3xl">
          {meta.phase === 'ended' ? (
            <div className="px-4 pb-6 pt-2 text-center">
              <p className="mb-3 text-sm text-neutral-400">This session has ended.</p>
              <a
                href="/dashboard"
                className="inline-block rounded-xl bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-700"
              >
                Back to dashboard
              </a>
            </div>
          ) : (
            <ChatInput
              onSend={handleSend}
              disabled={isDisabled}
              quickReplies={activeQuickReplies}
              placeholder={greeting ? 'Your tutor is thinking…' : 'Message your tutor…'}
            />
          )}
        </div>
      </div>
    </div>
  );
}
