import { type NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/server/db';
import { getJwtFromCookieHeader, verifyJwt } from '@/lib/server/auth';
import { logAudit } from '@/lib/server/audit';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── POST /api/sessions — create a new session ─────────────────────────────────
export async function POST(request: NextRequest): Promise<NextResponse> {
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

    const body: unknown = await request.json();
    if (typeof body !== 'object' || body === null) {
      statusCode = 400;
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const { personaId, topicId } = body as Record<string, unknown>;

    if (typeof personaId !== 'string' || !UUID_RE.test(personaId)) {
      statusCode = 400;
      return NextResponse.json({ error: 'Invalid personaId' }, { status: 400 });
    }
    if (typeof topicId !== 'string' || !UUID_RE.test(topicId)) {
      statusCode = 400;
      return NextResponse.json({ error: 'Invalid topicId' }, { status: 400 });
    }

    // Verify persona and topic exist
    const [personaRows, topicRows] = await Promise.all([
      query<{ persona_id: string }>(`SELECT persona_id FROM personas WHERE persona_id = $1`, [personaId]),
      query<{ topic_id: string }>(`SELECT topic_id FROM topics WHERE topic_id = $1`, [topicId]),
    ]);

    if (!personaRows[0]) {
      statusCode = 404;
      return NextResponse.json({ error: 'Persona not found' }, { status: 404 });
    }
    if (!topicRows[0]) {
      statusCode = 404;
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    const rows = await query<{ session_id: string }>(
      `INSERT INTO sessions (user_id, persona_id, topic_id) VALUES ($1, $2, $3) RETURNING session_id`,
      [userId, personaId, topicId],
    );

    statusCode = 201;
    return NextResponse.json({ sessionId: rows[0]!.session_id }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/sessions]', err instanceof Error ? err.message : 'Unknown error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await logAudit({
      userId: userId ?? null,
      endpoint: 'POST /api/sessions',
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
      statusCode,
    });
  }
}

// ── GET /api/sessions — list user's sessions ──────────────────────────────────
export async function GET(request: NextRequest): Promise<NextResponse> {
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

    const rows = await query<{
      session_id: string;
      persona_name: string;
      topic_name: string;
      started_at: string;
      ended_at: string | null;
      phase: string;
      score: number | null;
      summary: string | null;
    }>(
      `SELECT s.session_id, p.name AS persona_name, t.name AS topic_name,
              s.started_at, s.ended_at, s.phase, s.score, s.summary
       FROM sessions s
       JOIN personas p ON p.persona_id = s.persona_id
       JOIN topics   t ON t.topic_id   = s.topic_id
       WHERE s.user_id = $1
       ORDER BY s.started_at DESC`,
      [userId],
    );

    statusCode = 200;
    return NextResponse.json(rows, { status: 200 });
  } catch (err) {
    console.error('[GET /api/sessions]', err instanceof Error ? err.message : 'Unknown error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await logAudit({
      userId: userId ?? null,
      endpoint: 'GET /api/sessions',
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
      statusCode,
    });
  }
}
