'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Phase = 'diagnostic' | 'explain' | 'check' | 'recap' | 'practice' | 'ended';

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
}

interface UseSessionReturn {
  meta: SessionMeta | null;
  messages: ChatMessage[];
  sending: boolean;
  greeting: boolean;
  ending: boolean;
  greeted: boolean;
  error: string | null;
  handleSend: (content: string) => Promise<void>;
  handleEndSession: () => Promise<void>;
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
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const greetCalledRef = useRef(false);

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
              setMessages(history.map((m) => ({ id: m.message_id, role: m.role, content: m.content })));
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
        if (res.ok && res.headers.get('Content-Type')?.includes('application/json')) {
          const data = await res.json() as { skipped?: boolean };
          if (data.skipped) { setMessages([]); setGreeted(true); return; }
        }
        if (!res.ok) throw new Error('Greeting failed');
        if (!res.body) throw new Error('No response body');
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          setMessages((prev) => prev.map((m) => m.id === greetId ? { ...m, content: m.content + chunk } : m));
        }
        setMessages((prev) => prev.map((m) => m.id === greetId ? { ...m, streaming: false } : m));
        setGreeted(true);
      } catch {
        setMessages([]);
        setGreeted(true);
      } finally {
        setGreeting(false);
      }
    }
    void runGreet();
  }, [meta, greeted, greeting, sessionId]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(async (content: string) => {
    if (sending) return;
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
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? 'Chat failed');
      }
      if (!res.body) throw new Error('No response body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setMessages((prev) =>
          prev.map((m) => m.id === asstMsgId ? { ...m, content: m.content + decoder.decode(value, { stream: true }) } : m),
        );
      }
      setMessages((prev) => prev.map((m) => m.id === asstMsgId ? { ...m, streaming: false } : m));
      const metaRes = await fetch(`/api/sessions/${sessionId}`);
      if (metaRes.ok) {
        const updated = await metaRes.json() as { phase: Phase };
        setMeta((prev) => prev ? { ...prev, phase: updated.phase } : prev);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setMessages((prev) => prev.filter((m) => m.id !== asstMsgId));
    } finally {
      setSending(false);
    }
  }, [sending, sessionId]);

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

  return { meta, messages, sending, greeting, ending, greeted, error, handleSend, handleEndSession, setError };
}
