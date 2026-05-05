import { type NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/server/db';
import { getJwtFromCookieHeader, verifyJwt } from '@/lib/server/auth';
import { logAudit } from '@/lib/server/audit';
import { streamChat } from '@/lib/server/llm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  let statusCode = 500;
  let userId: string | undefined;
  let sessionId: string | undefined;

  try {
    const token = getJwtFromCookieHeader(request.headers.get('cookie'));
    if (!token) {
      statusCode = 401;
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const payload = await verifyJwt(token);
    userId = payload.userId;

    ({ id: sessionId } = await params);

    // ── Ownership check ───────────────────────────────────────────────────────
    const sessionRows = await query<{
      session_id: string;
      user_id: string;
      phase: string;
      persona_id: string;
      topic_id: string;
    }>(
      `SELECT session_id, user_id, phase, persona_id, topic_id FROM sessions WHERE session_id = $1`,
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

    // ── Idempotency: if messages already exist, skip ──────────────────────────
    const countRows = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM messages WHERE session_id = $1`,
      [sessionId],
    );
    if (parseInt(countRows[0]?.count ?? '0') > 0) {
      statusCode = 200;
      return NextResponse.json({ skipped: true }, { status: 200 });
    }

    // ── Fetch persona + topic ─────────────────────────────────────────────────
    const [personaRows, topicRows] = await Promise.all([
      query<{ name: string; role: string; tone: string; teaching_style: string }>(
        `SELECT name, role, tone, teaching_style FROM personas WHERE persona_id = $1`,
        [session.persona_id],
      ),
      query<{ name: string; difficulty: string; learning_objective: string }>(
        `SELECT name, difficulty, learning_objective FROM topics WHERE topic_id = $1`,
        [session.topic_id],
      ),
    ]);

    const persona = personaRows[0];
    const topic = topicRows[0];
    if (!persona || !topic) {
      statusCode = 500;
      return NextResponse.json({ error: 'Session data inconsistency' }, { status: 500 });
    }

    // ── Build greeting prompt ─────────────────────────────────────────────────
    const greetingPrompt = `You are ${persona.name}, a ${persona.role}. Tone: ${persona.tone}.
Greet in exactly 2 sentences: (1) introduce yourself by name and role and mention the topic "${topic.name}", (2) ask if the student is ready to start. No extra context, no teaching yet.`;

    const abortController = new AbortController();
    request.signal.addEventListener('abort', () => abortController.abort());

    let fullGreeting = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamChat(
            [
              { role: 'system', content: greetingPrompt },
              { role: 'user', content: 'Hello' },
            ],
            abortController.signal,
          )) {
            fullGreeting += chunk;
            controller.enqueue(new TextEncoder().encode(chunk));
          }
          controller.close();
        } catch {
          controller.error(new Error('LLM service error'));
        } finally {
          // Persist greeting as sequence 1
          if (fullGreeting.trim()) {
            try {
              await query(
                `INSERT INTO messages (session_id, role, content, sequence, phase_at_send, token_count)
                 VALUES ($1, 'assistant', $2, 1, $3, $4)`,
                [
                  sessionId,
                  fullGreeting.trim(),
                  session.phase,
                  Math.ceil(fullGreeting.length / 4),
                ],
              );
            } catch (dbErr) {
              console.error('[greet] Failed to persist greeting', dbErr);
            }
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
      },
    });
  } catch (err) {
    const isOllamaError = err instanceof Error && err.message.includes('Ollama');
    if (isOllamaError) {
      statusCode = 503;
      return NextResponse.json({ error: 'LLM service unavailable' }, { status: 503 });
    }
    console.error('[POST /api/sessions/[id]/greet]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await logAudit({
      userId: userId ?? null,
      sessionId: sessionId ?? null,
      endpoint: 'POST /api/sessions/[id]/greet',
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
      statusCode,
    });
  }
}
