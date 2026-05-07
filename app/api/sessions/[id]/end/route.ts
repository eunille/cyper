import { type NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/server/db';
import { getJwtFromCookieHeader, verifyJwt } from '@/lib/server/auth';
import { logAudit } from '@/lib/server/audit';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
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

    const sessionRows = await query<{ session_id: string; user_id: string; phase: string }>(
      `SELECT session_id, user_id, phase FROM sessions WHERE session_id = $1`,
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
      statusCode = 200;
      return NextResponse.json({ message: 'Session already ended' }, { status: 200 });
    }

    // Optional manual score/summary from request body
    let score: number | null = null;
    let summary: string | null = null;
    try {
      const body = await request.json() as Record<string, unknown>;
      if (typeof body.score === 'number') {
        score = Math.max(0, Math.min(100, Math.round(body.score)));
      }
      if (typeof body.summary === 'string' && body.summary.trim()) {
        summary = body.summary.trim().slice(0, 1000);
      }
    } catch {
      // Body is optional — ignore parse errors
    }

    const rows = await query<{ session_id: string; phase: string; ended_at: string; score: number | null; summary: string | null; topic_id: string }>(
      `UPDATE sessions
       SET phase = 'ended', ended_at = NOW(), score = COALESCE($1, score), summary = COALESCE($2, summary)
       WHERE session_id = $3
       RETURNING session_id, phase, ended_at, score, summary, topic_id`,
      [score, summary, sessionId],
    );

    const ended = rows[0];
    if (ended) {
      const finalScore = ended.score ?? 0;
      await query(
        `INSERT INTO user_progress (user_id, topic_id, attempts, best_score, last_score, mastered, last_studied)
         VALUES ($1, $2, 1, $3, $3, $4, NOW())
         ON CONFLICT (user_id, topic_id) DO UPDATE SET
           attempts     = user_progress.attempts + 1,
           last_score   = EXCLUDED.last_score,
           best_score   = GREATEST(user_progress.best_score, EXCLUDED.best_score),
           mastered     = EXCLUDED.best_score >= 80 OR user_progress.mastered,
           last_studied = NOW()`,
        [userId, ended.topic_id, finalScore, finalScore >= 80],
      );
    }

    statusCode = 200;
    return NextResponse.json(ended, { status: 200 });
  } catch (err) {
    console.error('[PATCH /api/sessions/[id]/end]', err instanceof Error ? err.message : 'Unknown error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await logAudit({
      userId: userId ?? null,
      sessionId: sessionId ?? null,
      endpoint: 'PATCH /api/sessions/[id]/end',
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
      statusCode,
    });
  }
}
