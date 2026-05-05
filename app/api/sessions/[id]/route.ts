import { type NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/server/db';
import { getJwtFromCookieHeader, verifyJwt } from '@/lib/server/auth';
import { logAudit } from '@/lib/server/audit';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  let statusCode = 500;
  let userId: string | undefined;

  try {
    const token = getJwtFromCookieHeader(request.headers.get('cookie'));
    if (!token) {
      statusCode = 401;
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const payload = await verifyJwt(token);
    userId = payload.userId;

    const { id: sessionId } = await params;

    const rows = await query<{
      session_id: string;
      user_id: string;
      persona_id: string;
      persona_name: string;
      persona_role: string;
      topic_id: string;
      topic_name: string;
      topic_category: string;
      topic_difficulty: string;
      started_at: string;
      ended_at: string | null;
      phase: string;
      score: number | null;
      summary: string | null;
    }>(
      `SELECT s.session_id, s.user_id,
              p.persona_id, p.name AS persona_name, p.role AS persona_role,
              t.topic_id, t.name AS topic_name, t.category AS topic_category,
              t.difficulty AS topic_difficulty,
              s.started_at, s.ended_at, s.phase, s.score, s.summary
       FROM sessions s
       JOIN personas p ON p.persona_id = s.persona_id
       JOIN topics   t ON t.topic_id   = s.topic_id
       WHERE s.session_id = $1 AND s.user_id = $2`,
      [sessionId, userId],
    );

    if (!rows[0]) {
      statusCode = 404;
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    statusCode = 200;
    return NextResponse.json(rows[0], { status: 200 });
  } catch (err) {
    console.error('[GET /api/sessions/[id]]', err instanceof Error ? err.message : 'Unknown error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await logAudit({
      userId: userId ?? null,
      endpoint: 'GET /api/sessions/[id]',
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
      statusCode,
    });
  }
}

// ── DELETE /api/sessions/:id — delete session + messages ─────────────────────
export async function DELETE(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  let statusCode = 500;
  let userId: string | undefined;

  try {
    const token = getJwtFromCookieHeader(request.headers.get('cookie'));
    if (!token) {
      statusCode = 401;
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyJwt(token);
    userId = payload.userId;
    const { id: sessionId } = await params;

    // IDOR — verify ownership before deleting
    const rows = await query<{ user_id: string }>(
      `SELECT user_id FROM sessions WHERE session_id = $1`,
      [sessionId],
    );
    if (!rows[0]) {
      statusCode = 404;
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (rows[0].user_id !== userId) {
      statusCode = 403;
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await query(`DELETE FROM messages WHERE session_id = $1`, [sessionId]);
    await query(`DELETE FROM sessions WHERE session_id = $1`, [sessionId]);

    statusCode = 200;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/sessions/[id]]', err instanceof Error ? err.message : 'Unknown error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await logAudit({
      userId: userId ?? null,
      endpoint: 'DELETE /api/sessions/[id]',
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
      statusCode,
    });
  }
}
