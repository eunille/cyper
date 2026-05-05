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

    // IDOR check — ensure the session belongs to the requesting user
    const ownerRows = await query<{ user_id: string }>(
      `SELECT user_id FROM sessions WHERE session_id = $1`,
      [sessionId],
    );
    if (!ownerRows[0]) {
      statusCode = 404;
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (ownerRows[0].user_id !== userId) {
      statusCode = 403;
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const messages = await query<{
      message_id: string;
      role: 'user' | 'assistant';
      content: string;
      sequence: number;
    }>(
      `SELECT message_id, role, content, sequence
       FROM messages
       WHERE session_id = $1
       ORDER BY sequence ASC`,
      [sessionId],
    );

    statusCode = 200;
    return NextResponse.json(messages, { status: 200 });
  } catch (err) {
    console.error('[GET /api/sessions/[id]/messages]', err instanceof Error ? err.message : 'Unknown error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await logAudit({
      userId: userId ?? null,
      endpoint: 'GET /api/sessions/[id]/messages',
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
      statusCode,
    });
  }
}
