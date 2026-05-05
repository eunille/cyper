import { type NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/server/db';
import { getJwtFromCookieHeader, verifyJwt } from '@/lib/server/auth';
import { logAudit } from '@/lib/server/audit';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/sessions/[id]/persona — swap tutor mid-session
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

    const body: unknown = await request.json();
    if (typeof body !== 'object' || body === null) {
      statusCode = 400;
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const { personaId } = body as Record<string, unknown>;
    if (typeof personaId !== 'string' || !UUID_RE.test(personaId)) {
      statusCode = 400;
      return NextResponse.json({ error: 'Invalid personaId' }, { status: 400 });
    }

    // Ownership + phase check
    const sessionRows = await query<{ user_id: string; phase: string }>(
      `SELECT user_id, phase FROM sessions WHERE session_id = $1`,
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

    // Verify new persona exists
    const personaRows = await query<{ persona_id: string; name: string; role: string }>(
      `SELECT persona_id, name, role FROM personas WHERE persona_id = $1`,
      [personaId],
    );
    if (!personaRows[0]) {
      statusCode = 404;
      return NextResponse.json({ error: 'Persona not found' }, { status: 404 });
    }

    // Update session's persona
    await query(
      `UPDATE sessions SET persona_id = $1 WHERE session_id = $2`,
      [personaId, sessionId],
    );

    await logAudit({ userId, sessionId, endpoint: 'PATCH /api/sessions/[id]/persona', statusCode: 200 });

    statusCode = 200;
    return NextResponse.json({
      personaId: personaRows[0].persona_id,
      personaName: personaRows[0].name,
      personaRole: personaRows[0].role,
    });
  } catch (err) {
    await logAudit({ userId, endpoint: 'PATCH /api/sessions/[id]/persona', statusCode });
    return NextResponse.json({ error: 'Internal server error' }, { status: statusCode });
  }
}
