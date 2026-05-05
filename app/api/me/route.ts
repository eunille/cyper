import { type NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/server/db';
import { getJwtFromCookieHeader, verifyJwt } from '@/lib/server/auth';
import { logAudit } from '@/lib/server/audit';

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
      user_id: string;
      username: string;
      email: string;
      created_at: string;
      last_login: string | null;
    }>(
      `SELECT user_id, username, email, created_at, last_login
       FROM users
       WHERE user_id = $1 AND is_active = TRUE`,
      [userId],
    );

    if (!rows[0]) {
      statusCode = 404;
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    statusCode = 200;
    return NextResponse.json(rows[0], { status: 200 });
  } catch (err) {
    console.error('[GET /api/me]', err instanceof Error ? err.message : 'Unknown error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await logAudit({
      userId: userId ?? null,
      endpoint: 'GET /api/me',
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
      statusCode,
    });
  }
}
