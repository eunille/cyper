import { type NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/server/db';
import { getJwtFromCookieHeader, verifyJwt } from '@/lib/server/auth';

// GET /api/personas — list all available tutor personas
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const token = getJwtFromCookieHeader(request.headers.get('cookie'));
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    await verifyJwt(token);

    const rows = await query<{ persona_id: string; name: string; role: string; specialization: string }>(
      `SELECT persona_id, name, role, specialization FROM personas ORDER BY name`,
    );

    return NextResponse.json({ personas: rows });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
