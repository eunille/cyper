import { type NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/server/db';
import { getJwtFromCookieHeader, verifyJwt } from '@/lib/server/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const token = getJwtFromCookieHeader(request.headers.get('cookie'));
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const payload = await verifyJwt(token);
    const userId = payload.userId;
    const { id: sessionId } = await params;

    // ── Session data (IDOR-protected by user_id) ──────────────────────────────
    const sessionRows = await query<{
      session_id: string;
      user_id: string;
      topic_id: string;
      persona_id: string;
      persona_name: string;
      persona_role: string;
      topic_name: string;
      topic_category: string;
      topic_difficulty: string;
      started_at: string;
      ended_at: string | null;
      score: number | null;
      summary: string | null;
      gaps: string[] | null;
    }>(
      `SELECT s.session_id, s.user_id, s.topic_id, s.persona_id,
              p.name AS persona_name, p.role AS persona_role,
              t.name AS topic_name, t.category AS topic_category,
              t.difficulty AS topic_difficulty,
              s.started_at, s.ended_at, s.score, s.summary, s.gaps
       FROM sessions s
       JOIN personas p ON p.persona_id = s.persona_id
       JOIN topics   t ON t.topic_id   = s.topic_id
       WHERE s.session_id = $1`,
      [sessionId],
    );

    const session = sessionRows[0];
    if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (session.user_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // ── Messages ──────────────────────────────────────────────────────────────
    const messages = await query<{
      message_id: string;
      role: string;
      content: string;
      sequence: number;
      phase_at_send: string;
    }>(
      `SELECT message_id, role, content, sequence, phase_at_send
       FROM messages WHERE session_id = $1 ORDER BY sequence ASC`,
      [sessionId],
    );

    // ── Phase-level message counts (for chart) ────────────────────────────────
    const phaseCounts = messages.reduce<Record<string, number>>((acc, m) => {
      if (m.role === 'user') {
        acc[m.phase_at_send] = (acc[m.phase_at_send] ?? 0) + 1;
      }
      return acc;
    }, {});

    const durationMs =
      session.ended_at && session.started_at
        ? new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()
        : null;

    return NextResponse.json({
      session: {
        sessionId: session.session_id,
        topicId: session.topic_id,
        personaId: session.persona_id,
        personaName: session.persona_name,
        personaRole: session.persona_role,
        topicName: session.topic_name,
        topicCategory: session.topic_category,
        topicDifficulty: session.topic_difficulty,
        startedAt: session.started_at,
        endedAt: session.ended_at,
        score: session.score,
        summary: session.summary,
        gaps: session.gaps ?? [],
        durationMs,
        totalMessages: messages.length,
        userMessages: messages.filter((m) => m.role === 'user').length,
      },
      messages,
      phaseCounts,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
