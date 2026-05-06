'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MessageBubble } from '@/components/MessageBubble';
import { PhaseIndicator } from '@/components/PhaseIndicator';
import { ChatInput } from '@/components/ChatInput';
import { MCQCard } from '@/components/MCQCard';
import { SessionExpiredModal } from '@/components/SessionExpiredModal';
import { PageSpinner } from '@/components/ui/Spinner';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { useSession } from '@/hooks/useSession';

const READY_REPLIES = ["Yes, I'm ready!", "Let's go!", 'Tell me more first'] as const;
const CHAT_REPLIES = ["I'm not sure", 'Explain more', 'Show me options'] as const;

interface Persona {
  persona_id: string;
  name: string;
  role: string;
  specialization: string;
}

export default function SessionPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id;
  const router = useRouter();
  const { meta, messages, sending, greeting, ending, changingTutor, greeted, sessionExpired, error, handleSend, handleEndSession, handleChangeTutor, handleMcqAnswer, setError } = useSession(sessionId);
  const bottomRef = useRef<HTMLDivElement>(null);

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore — cookie gets cleared server-side
    }
    router.push('/auth');
  }, [router]);

  const [showTutorModal, setShowTutorModal] = useState(false);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loadingPersonas, setLoadingPersonas] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openTutorModal = useCallback(async () => {
    setShowTutorModal(true);
    if (personas.length > 0) return;
    setLoadingPersonas(true);
    try {
      const res = await fetch('/api/personas');
      if (res.ok) {
        const data = await res.json() as { personas: Persona[] };
        setPersonas(data.personas);
      }
    } finally {
      setLoadingPersonas(false);
    }
  }, [personas.length]);

  const selectTutor = useCallback(async (p: Persona) => {
    setShowTutorModal(false);
    await handleChangeTutor(p.persona_id);
  }, [handleChangeTutor]);

  if (!meta) return <PageSpinner />;

  const isDisabled = sending || greeting || changingTutor || meta.phase === 'ended';
  const activeQuickReplies = !greeted || messages.length <= 2 ? READY_REPLIES : CHAT_REPLIES;

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Session expired modal — shown on any 401 response */}
      {sessionExpired && <SessionExpiredModal onLogout={handleLogout} />}
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
              {meta.phase !== 'ended' && (
                <button
                  type="button"
                  disabled={changingTutor}
                  onClick={openTutorModal}
                  className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-500 transition-colors hover:bg-neutral-50 disabled:opacity-40"
                >
                  {changingTutor ? 'Switching…' : 'Change tutor'}
                </button>
              )}
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
              <div key={m.id}>
                <MessageBubble
                  role={m.role}
                  content={m.content}
                  streaming={m.streaming}
                  isSystemNote={m.id.startsWith('switch-')}
                />
                {/* MCQ card — only shown on non-streaming assistant messages */}
                {m.role === 'assistant' && m.mcq && !m.streaming && meta?.phase !== 'ended' && (
                  <div className="ml-10 mt-2">
                    <MCQCard
                      messageId={m.id}
                      mcq={m.mcq}
                      answeredWith={m.mcqAnsweredWith}
                      onAnswer={handleMcqAnswer}
                    />
                  </div>
                )}
              </div>
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
              placeholder={greeting ? 'Your tutor is thinking…' : changingTutor ? 'Switching tutor…' : 'Message your tutor…'}
            />
          )}
        </div>
      </div>

      {/* ── Change Tutor Modal ─────────────────────────────────────────────── */}
      {showTutorModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
          onClick={() => setShowTutorModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-neutral-100 bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-neutral-900">Choose a tutor</p>
              <button
                type="button"
                onClick={() => setShowTutorModal(false)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {loadingPersonas ? (
              <p className="py-8 text-center text-sm text-neutral-400">Loading tutors…</p>
            ) : (
              <ul className="space-y-2">
                {personas.map((p) => {
                  const isCurrent = p.name === meta.personaName;
                  return (
                    <li key={p.persona_id}>
                      <button
                        type="button"
                        disabled={isCurrent}
                        onClick={() => selectTutor(p)}
                        className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                          isCurrent
                            ? 'border-neutral-900 bg-neutral-50 opacity-60 cursor-not-allowed'
                            : 'border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">
                            {p.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-neutral-900">{p.name}</p>
                            <p className="text-xs text-neutral-400">{p.role}</p>
                          </div>
                          {isCurrent && (
                            <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                              Current
                            </span>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

