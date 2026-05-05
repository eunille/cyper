import { type NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/server/db';
import { getJwtFromCookieHeader, verifyJwt } from '@/lib/server/auth';
import { logAudit } from '@/lib/server/audit';
import { streamChat } from '@/lib/server/llm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/sessions/[id]/handoff
// Streams a handoff greeting from the new tutor after a persona switch.
// Called immediately after PATCH /persona.
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

    // Ownership + phase check
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
    if (session.phase === 'ended') {
      statusCode = 400;
      return NextResponse.json({ error: 'Session has ended' }, { status: 400 });
    }

    // Fetch persona + topic
    const [personaRows, topicRows] = await Promise.all([
      query<{ name: string; role: string; tone: string; teaching_style: string }>(
        `SELECT name, role, tone, teaching_style FROM personas WHERE persona_id = $1`,
        [session.persona_id],
      ),
      query<{ name: string }>(
        `SELECT name FROM topics WHERE topic_id = $1`,
        [session.topic_id],
      ),
    ]);

    const persona = personaRows[0];
    const topic = topicRows[0];
    if (!persona || !topic) {
      statusCode = 500;
      return NextResponse.json({ error: 'Session data inconsistency' }, { status: 500 });
    }

    // Fetch recent conversation summary (last 6 messages for context)
    const recentMessages = await query<{ role: string; content: string }>(
      `SELECT role, content FROM messages
       WHERE session_id = $1
       ORDER BY sequence DESC LIMIT 6`,
      [sessionId],
    );
    const conversationContext = recentMessages
      .reverse()
      .map((m) => `${m.role === 'user' ? 'Student' : 'Previous tutor'}: ${m.content.slice(0, 200)}`)
      .join('\n');

    const handoffPrompt = `You are ${persona.name}, a ${persona.role}. Tone: ${persona.tone}.
The student has just switched to you mid-session on the topic "${topic.name}".
Here is the recent conversation context:
${conversationContext || '(no prior messages)'}

In 2-3 sentences: (1) greet the student by introducing yourself as the new tutor, (2) briefly acknowledge what was discussed, (3) offer to continue from where they left off. Be warm but concise. Do not repeat all prior content.`;

    const abortController = new AbortController();
    request.signal.addEventListener('abort', () => abortController.abort());

    let fullContent = '';
    const nextSequence = await query<{ seq: string }>(
      `SELECT COALESCE(MAX(sequence), 0) + 1 AS seq FROM messages WHERE session_id = $1`,
      [sessionId],
    );
    const sequence = parseInt(nextSequence[0]?.seq ?? '1');

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamChat(
            [
              { role: 'system', content: handoffPrompt },
              { role: 'user', content: 'Hello' },
            ],
            abortController.signal,
          )) {
            fullContent += chunk;
            controller.enqueue(new TextEncoder().encode(chunk));
          }
          controller.close();
        } catch {
          controller.error(new Error('LLM service error'));
        } finally {
          if (fullContent.trim()) {
            try {
              await query(
                `INSERT INTO messages (session_id, role, content, sequence, phase_at_send, token_count)
                 VALUES ($1, 'assistant', $2, $3, $4, $5)`,
                [sessionId, fullContent.trim(), sequence, session.phase, Math.ceil(fullContent.length / 4)],
              );
            } catch (dbErr) {
              console.error('[handoff] Failed to persist message', dbErr);
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
    console.error('[POST /api/sessions/[id]/handoff]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Internal server error' }, { status: statusCode });
  } finally {
    await logAudit({
      userId: userId ?? null,
      sessionId: sessionId ?? null,
      endpoint: 'POST /api/sessions/[id]/handoff',
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
      statusCode,
    });
  }
}
