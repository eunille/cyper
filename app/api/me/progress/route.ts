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
      topic_id: string;
      topic_name: string;
      category: string;
      difficulty: string;
      attempts: number;
      best_score: number | null;
      last_score: number | null;
      mastered: boolean;
      last_studied: string | null;
    }>(
      `SELECT t.topic_id, t.name AS topic_name, t.category, t.difficulty,
              up.attempts, up.best_score, up.last_score, up.mastered, up.last_studied
       FROM user_progress up
       JOIN topics t ON t.topic_id = up.topic_id
       WHERE up.user_id = $1
       ORDER BY up.last_studied DESC NULLS LAST`,
      [userId],
    );

    statusCode = 200;
    return NextResponse.json(rows, { status: 200 });
  } catch (err) {
    console.error('[GET /api/me/progress]', err instanceof Error ? err.message : 'Unknown error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await logAudit({
      userId: userId ?? null,
      endpoint: 'GET /api/me/progress',
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
      statusCode,
    });
  }
}
