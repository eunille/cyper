'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Phase = 'diagnostic' | 'explain' | 'check' | 'recap' | 'practice' | 'ended';

export interface McqData {
  q: string;
  opts: { A: string; B: string; C: string; D: string };
  correct: 'A' | 'B' | 'C' | 'D';
}

export interface SessionMeta {
  sessionId: string;
  personaName: string;
  topicName: string;
  phase: Phase;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
  mcq?: McqData;
  mcqAnsweredWith?: string;
}

// ── MCQ JSON extractor ────────────────────────────────────────────────────────
// Finds the first complete {"mcq":{...}} block in a string and returns it parsed.
// Uses brace-counting so it handles options that contain quotes or commas.
function extractMcq(text: string): McqData | undefined {
  const marker = '"mcq":';
  const start = text.indexOf(marker);
  if (start === -1) return undefined;
  // Find the opening brace of the outer object
  const outerBrace = text.lastIndexOf('{', start);
  if (outerBrace === -1) return undefined;
  let depth = 0;
  let end = -1;
  for (let i = outerBrace; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end === -1) return undefined;
  try {
    const parsed = JSON.parse(text.slice(outerBrace, end + 1)) as { mcq: McqData };
    const { q, opts, correct } = parsed.mcq;
    if (
      typeof q === 'string' &&
      typeof opts === 'object' && opts !== null &&
      typeof opts.A === 'string' && typeof opts.B === 'string' &&
      typeof opts.C === 'string' && typeof opts.D === 'string' &&
      ['A', 'B', 'C', 'D'].includes(correct)
    ) {
      return { q, opts, correct };
    }
  } catch {
    // Malformed JSON — ignore
  }
  return undefined;
}

// Strips ALL sentinel JSON blocks from display text using brace-counting.
// Handles: {"mcq":{...}}, {"advance_phase":"..."}, {"score":...}
function stripSentinels(text: string): string {
  const SENTINELS = ['"mcq":', '"advance_phase":', '"score":'];
  let result = text;
  let changed = true;
  while (changed) {
    changed = false;
    for (const marker of SENTINELS) {
      const idx = result.indexOf(marker);
      if (idx === -1) continue;
      // Find the enclosing opening brace
      const open = result.lastIndexOf('{', idx);
      if (open === -1) continue;
      // Walk forward with brace depth to find the matching close
      let depth = 0;
      let close = -1;
      for (let i = open; i < result.length; i++) {
        if (result[i] === '{') depth++;
        else if (result[i] === '}') {
          depth--;
          if (depth === 0) { close = i; break; }
        }
      }
      if (close === -1) continue;
      result = (result.slice(0, open) + result.slice(close + 1)).replace(/\n{3,}/g, '\n\n');
      changed = true;
      break; // re-scan from the top after each removal
    }
  }
  return result.trim();
}

interface UseSessionReturn {
  meta: SessionMeta | null;
  messages: ChatMessage[];
  sending: boolean;
  greeting: boolean;
  ending: boolean;
  greeted: boolean;
  changingTutor: boolean;
  sessionExpired: boolean;
  error: string | null;
  handleMcqAnswer: (messageId: string, key: string, optionText: string) => Promise<void>;
  handleSend: (content: string) => Promise<void>;
  handleEndSession: () => Promise<void>;
  handleChangeTutor: (personaId: string) => Promise<void>;
  setError: (e: string | null) => void;
}

export function useSession(sessionId: string): UseSessionReturn {
  const router = useRouter();
  const [meta, setMeta] = useState<SessionMeta | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [greeted, setGreeted] = useState(false);
  const [greeting, setGreeting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [changingTutor, setChangingTutor] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const greetCalledRef = useRef(false);

  // ── 401 handler — set once, never cleared ────────────────────────────────
  const handle401 = useCallback(() => {
    setSessionExpired(true);
  }, []);

  // ── Abort on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  // ── Load session metadata + message history ───────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [metaRes, msgsRes] = await Promise.all([
          fetch(`/api/sessions/${sessionId}`),
          fetch(`/api/sessions/${sessionId}/messages`),
        ]);
        if (metaRes.status === 401) { handle401(); return; }
        if (msgsRes.status === 401) { handle401(); return; }
        if (!metaRes.ok) { router.push('/learn'); return; }
        const raw = await metaRes.json() as {
          session_id: string; persona_name: string; topic_name: string; phase: Phase;
        };
        if (cancelled) return;
        setMeta({
          sessionId: raw.session_id,
          personaName: raw.persona_name,
          topicName: raw.topic_name,
          phase: raw.phase,
        });
        if (msgsRes.ok) {
          const history = await msgsRes.json() as Array<{
            message_id: string; role: 'user' | 'assistant'; content: string;
          }>;
          if (!cancelled) {
            if (history.length > 0) {
              setMessages(history.map((m) => ({
                id: m.message_id,
                role: m.role,
                content: m.role === 'assistant' ? stripSentinels(m.content) : m.content,
                mcq: m.role === 'assistant' ? extractMcq(m.content) : undefined,
              })));
              setGreeted(true);
            }
          }
        }
      } catch {
        if (!cancelled) router.push('/learn');
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [sessionId, router]);

  // ── Auto-greet on first load when no messages ─────────────────────────────
  useEffect(() => {
    if (!meta || greeted || greeting || greetCalledRef.current) return;
    greetCalledRef.current = true;

    async function runGreet() {
      setGreeting(true);
      const greetId = crypto.randomUUID();
      setMessages([{ id: greetId, role: 'assistant', content: '', streaming: true }]);
      try {
        const res = await fetch(`/api/sessions/${sessionId}/greet`, { method: 'POST' });
        if (res.status === 401) { handle401(); return; }
        if (res.ok && res.headers.get('Content-Type')?.includes('application/json')) {
          const data = await res.json() as { skipped?: boolean };
          if (data.skipped) { setMessages([]); setGreeted(true); return; }
        }
        if (!res.ok) throw new Error('Greeting failed');
        if (!res.body) throw new Error('No response body');
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let rawGreet = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          rawGreet += decoder.decode(value, { stream: true });
          const display = stripSentinels(rawGreet);
          setMessages((prev) => prev.map((m) => m.id === greetId ? { ...m, content: display } : m));
        }
        setMessages((prev) => prev.map((m) => m.id === greetId ? { ...m, streaming: false, content: stripSentinels(rawGreet) } : m));
        setGreeted(true);
      } catch {
        setMessages([]);
        setGreeted(true);
      } finally {
        setGreeting(false);
      }
    }
    void runGreet();
  }, [meta, greeted, greeting, sessionId, handle401]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(async (content: string) => {
    if (sending || meta?.phase === 'ended') return;
    const userMsgId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: userMsgId, role: 'user', content }]);
    setSending(true);
    setError(null);

    const asstMsgId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: asstMsgId, role: 'assistant', content: '', streaming: true }]);
    abortRef.current = new AbortController();

    try {
      const res = await fetch(`/api/sessions/${sessionId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
        signal: abortRef.current.signal,
      });
      if (res.status === 401) { handle401(); return; }
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? 'Chat failed');
      }
      if (!res.body) throw new Error('No response body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      // rawContent accumulates the unstripped LLM output so we can extract
      // MCQ/sentinel JSON after streaming while displaying clean text live.
      let rawContent = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        rawContent += decoder.decode(value, { stream: true });
        const displayContent = stripSentinels(rawContent);
        setMessages((prev) =>
          prev.map((m) => m.id === asstMsgId ? { ...m, content: displayContent } : m),
        );
      }
      // Stream complete — extract MCQ from raw, finalize display
      const mcq = extractMcq(rawContent);
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== asstMsgId) return m;
          return mcq
            ? { ...m, streaming: false, mcq, content: stripSentinels(rawContent) }
            : { ...m, streaming: false, content: stripSentinels(rawContent) };
        }),
      );
      const metaRes = await fetch(`/api/sessions/${sessionId}`);
      if (metaRes.ok) {
        const updated = await metaRes.json() as { phase: Phase };
        setMeta((prev) => prev ? { ...prev, phase: updated.phase } : prev);
        // Auto-redirect to results when session ends
        if (updated.phase === 'ended') {
          setTimeout(() => router.push(`/dashboard/session/${sessionId}`), 1500);
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setMessages((prev) => prev.filter((m) => m.id !== asstMsgId));
    } finally {
      setSending(false);
    }
  }, [sending, meta?.phase, sessionId, handle401]);

  // ── Change tutor mid-session ─────────────────────────────────────────────
  const handleChangeTutor = useCallback(async (personaId: string) => {
    if (changingTutor || meta?.phase === 'ended') return;
    setChangingTutor(true);
    try {
      // 1. Switch persona in DB
      const res = await fetch(`/api/sessions/${sessionId}/persona`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personaId }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? 'Failed to change tutor');
      }
      const result = await res.json() as { personaName: string };
      setMeta((prev) => prev ? { ...prev, personaName: result.personaName } : prev);

      // 2. Insert divider notification
      setMessages((prev) => [
        ...prev,
        {
          id: `switch-${Date.now()}`,
          role: 'assistant' as const,
          content: `— Tutor switched to ${result.personaName} —`,
          streaming: false,
        },
      ]);

      // 3. Stream handoff greeting from new tutor
      const asstMsgId = `handoff-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: asstMsgId, role: 'assistant' as const, content: '', streaming: true },
      ]);

      const handoffRes = await fetch(`/api/sessions/${sessionId}/handoff`, { method: 'POST' });
      if (!handoffRes.ok || !handoffRes.body) {
        setMessages((prev) => prev.filter((m) => m.id !== asstMsgId));
      } else {
        const reader = handoffRes.body.getReader();
        const decoder = new TextDecoder();
        let rawHandoff = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          rawHandoff += decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((m) =>
              m.id === asstMsgId
                ? { ...m, content: stripSentinels(rawHandoff) }
                : m,
            ),
          );
        }
        setMessages((prev) =>
          prev.map((m) => (m.id === asstMsgId ? { ...m, streaming: false, content: stripSentinels(rawHandoff) } : m)),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change tutor');
    } finally {
      setChangingTutor(false);
    }
  }, [changingTutor, meta, sessionId]);

  // ── MCQ answer ────────────────────────────────────────────────────────────
  // Lock the MCQ card visually, then send the chosen option as a chat message.
  const handleMcqAnswer = useCallback(async (messageId: string, key: string, optionText: string) => {
    // Mark the MCQ as answered so the card locks immediately
    setMessages((prev) =>
      prev.map((m) => m.id === messageId ? { ...m, mcqAnsweredWith: key } : m),
    );
    // Send the answer as a normal user message so LLM can respond with "why?"
    await handleSend(`${key}: ${optionText}`);
  }, [handleSend]);

  // ── End session ───────────────────────────────────────────────────────────
  const handleEndSession = useCallback(async () => {
    if (ending || meta?.phase === 'ended') return;
    setEnding(true);
    try {
      await fetch(`/api/sessions/${sessionId}/end`, { method: 'PATCH' });
      setMeta((prev) => prev ? { ...prev, phase: 'ended' } : prev);
    } catch {
      // non-fatal
    } finally {
      setEnding(false);
    }
  }, [ending, meta, sessionId]);

  return { meta, messages, sending, greeting, ending, changingTutor, greeted, sessionExpired, error, handleSend, handleEndSession, handleChangeTutor, handleMcqAnswer, setError };
}
