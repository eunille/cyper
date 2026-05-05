import { type NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/server/db';
import { getJwtFromCookieHeader, verifyJwt } from '@/lib/server/auth';
import { logAudit } from '@/lib/server/audit';
import { streamChat } from '@/lib/server/llm';
import { sanitize } from '@/lib/server/data-sanitizer';
import {
  buildSystemPrompt,
  buildMessageHistory,
  type Persona,
  type Topic,
  type DbMessage,
} from '@/lib/server/prompt-builder';

const MAX_CONTENT_LENGTH = 4000;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  let statusCode = 500;
  let userId: string | undefined;
  let sessionId: string | undefined;
  let userMessageId: string | undefined;

  try {
    const token = getJwtFromCookieHeader(request.headers.get('cookie'));
    if (!token) {
      statusCode = 401;
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const payload = await verifyJwt(token);
    userId = payload.userId;

    ({ id: sessionId } = await params);

    // ── Validate body ─────────────────────────────────────────────────────────
    const body: unknown = await request.json();
    if (typeof body !== 'object' || body === null) {
      statusCode = 400;
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const { content } = body as Record<string, unknown>;
    if (typeof content !== 'string' || !content.trim()) {
      statusCode = 400;
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      statusCode = 400;
      return NextResponse.json({ error: `content must be ≤ ${MAX_CONTENT_LENGTH} characters` }, { status: 400 });
    }

    // ── Ownership + phase check ───────────────────────────────────────────────
    const sessionRows = await query<{
      session_id: string;
      user_id: string;
      phase: string;
      persona_id: string;
      topic_id: string;
    }>(
      `SELECT session_id, user_id, phase, persona_id, topic_id
       FROM sessions WHERE session_id = $1`,
      [sessionId],
    );

    const session = sessionRows[0];
    if (!session) {
      statusCode = 404;
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (session.user_id !== userId) {
      statusCode = 403;
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (session.phase === 'ended') {
      statusCode = 400;
      return NextResponse.json({ error: 'Session has ended' }, { status: 400 });
    }

    // ── Fetch persona + topic ─────────────────────────────────────────────────
    const [personaRows, topicRows] = await Promise.all([
      query<Persona & { persona_id: string; system_prompt_template: string; teaching_style: string; }>(
        `SELECT persona_id, name, role, specialization, teaching_style, tone, system_prompt_template
         FROM personas WHERE persona_id = $1`,
        [session.persona_id],
      ),
      query<Topic & { topic_id: string; learning_objective: string; }>(
        `SELECT topic_id, name, category, difficulty, learning_objective
         FROM topics WHERE topic_id = $1`,
        [session.topic_id],
      ),
    ]);

    const persona = personaRows[0];
    const topic = topicRows[0];
    if (!persona || !topic) {
      statusCode = 500;
      return NextResponse.json({ error: 'Session data inconsistency' }, { status: 500 });
    }

    // ── Fetch message history ─────────────────────────────────────────────────
    const historyRows = await query<DbMessage & { sequence: number }>(
      `SELECT role, content, sequence FROM messages
       WHERE session_id = $1 ORDER BY sequence ASC`,
      [sessionId],
    );

    // ── Insert user message ───────────────────────────────────────────────────
    const nextSeq = (historyRows[historyRows.length - 1]?.sequence ?? 0) + 1;
    const userMsgRows = await query<{ message_id: string }>(
      `INSERT INTO messages (session_id, role, content, sequence, phase_at_send)
       VALUES ($1, 'user', $2, $3, $4) RETURNING message_id`,
      [sessionId, content.trim(), nextSeq, session.phase],
    );
    userMessageId = userMsgRows[0]?.message_id;

    // ── Sanitize before sending to external LLM (data-minimization policy) ───
    // User message is stored as-is in DB; only the sanitized copy reaches Groq.
    const sanitizedContent = sanitize(content.trim());
    const sanitizedHistory = historyRows.map((m) => ({
      ...m,
      content: m.role === 'user' ? sanitize(m.content) : m.content,
    }));

    // ── Build prompt ──────────────────────────────────────────────────────────
    const systemPrompt = buildSystemPrompt(
      {
        personaId: persona.persona_id,
        name: persona.name,
        role: persona.role,
        specialization: persona.specialization,
        teachingStyle: persona.teaching_style,
        tone: persona.tone,
        systemPromptTemplate: persona.system_prompt_template,
      },
      {
        topicId: topic.topic_id,
        name: topic.name,
        category: topic.category,
        difficulty: topic.difficulty as 'beginner' | 'intermediate' | 'advanced',
        learningObjective: topic.learning_objective,
      },
    );

    const ollamaMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...buildMessageHistory(sanitizedHistory),
      { role: 'user' as const, content: sanitizedContent },
    ];

    // ── Stream response ───────────────────────────────────────────────────────
    const abortController = new AbortController();
    request.signal.addEventListener('abort', () => abortController.abort());

    let fullResponse = '';
    const assistantSeq = nextSeq + 1;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamChat(ollamaMessages, abortController.signal)) {
            fullResponse += chunk;
            controller.enqueue(new TextEncoder().encode(chunk));
          }
          controller.close();
        } catch {
          // Do not surface Ollama internals
          controller.error(new Error('LLM service error'));
        } finally {
          // Persist assistant message — always runs even on stream error
          try {
            const tokenCount = Math.ceil(fullResponse.length / 4);
            await query(
              `INSERT INTO messages (session_id, role, content, sequence, phase_at_send, token_count)
               VALUES ($1, 'assistant', $2, $3, $4, $5)`,
              [sessionId, fullResponse, assistantSeq, session.phase, tokenCount],
            );

            // Check for session-end sentinel
            const sentinelMatch = fullResponse.match(
              /\{"score":\s*\d+,\s*"summary":\s*"[^"]*"[^}]*\}/,
            );
            if (sentinelMatch) {
              try {
                const sentinel = JSON.parse(sentinelMatch[0]) as {
                  score: number;
                  summary: string;
                };
                const score = Math.max(0, Math.min(100, Math.round(sentinel.score)));
                const gaps: string[] = Array.isArray(
                  (sentinel as unknown as Record<string, unknown>).gaps,
                )
                  ? ((sentinel as unknown as Record<string, unknown>).gaps as unknown[])
                      .filter((g): g is string => typeof g === 'string')
                      .slice(0, 10)
                  : [];
                await query(
                  `UPDATE sessions SET phase = 'ended', ended_at = NOW(), score = $1, summary = $2, gaps = $3
                   WHERE session_id = $4`,
                  [score, sentinel.summary, gaps, sessionId],
                );
                await query(
                  `INSERT INTO user_progress (user_id, topic_id, attempts, best_score, last_score, mastered, last_studied)
                   VALUES ($1, $2, 1, $3, $3, $4, NOW())
                   ON CONFLICT (user_id, topic_id) DO UPDATE SET
                     attempts     = user_progress.attempts + 1,
                     last_score   = EXCLUDED.last_score,
                     best_score   = GREATEST(user_progress.best_score, EXCLUDED.best_score),
                     mastered     = EXCLUDED.best_score >= 80 OR user_progress.mastered,
                     last_studied = NOW()`,
                  [userId, session.topic_id, score, score >= 80],
                );
              } catch {
                // Sentinel parse failure is non-fatal; session can be ended via /end
              }
            } else {
              // ── Advance phase based on conversation depth ─────────────────
              // Count assistant messages already in DB (greet = seq 1, so subtract 1)
              const prevAssistantCount = historyRows.filter((m) => m.role === 'assistant').length;
              // prevAssistantCount already includes greet; this new message adds 1
              const nonGreetAssistant = prevAssistantCount; // after insert
              const nextPhase =
                nonGreetAssistant <= 1 ? 'diagnostic'
                : nonGreetAssistant <= 3 ? 'explain'
                : nonGreetAssistant <= 5 ? 'check'
                : nonGreetAssistant === 6 ? 'recap'
                : 'practice';
              if (nextPhase !== session.phase) {
                await query(
                  `UPDATE sessions SET phase = $1 WHERE session_id = $2 AND phase != 'ended'`,
                  [nextPhase, sessionId],
                );
              }
            }
          } catch (dbErr) {
            console.error('[chat] Failed to persist assistant message', dbErr);
          }
        }
      },
      cancel() {
        abortController.abort();
      },
    });

    statusCode = 200;
    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Session-Id': sessionId!,
      },
    });
  } catch (err) {
    // If user message was already inserted but stream never started, delete orphan
    if (userMessageId) {
      await query(`DELETE FROM messages WHERE message_id = $1`, [userMessageId]).catch(() => {});
    }
    const isOllamaError =
      err instanceof Error && err.message.includes('Ollama');
    if (isOllamaError) {
      statusCode = 503;
      return NextResponse.json({ error: 'LLM service unavailable' }, { status: 503 });
    }
    console.error('[POST /api/sessions/[id]/chat]', err instanceof Error ? err.message : 'Unknown error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await logAudit({
      userId: userId ?? null,
      sessionId: sessionId ?? null,
      endpoint: 'POST /api/sessions/[id]/chat',
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
      statusCode,
    });
  }
}
