import { type NextRequest, NextResponse } from 'next/server';
import { getJwtFromCookieHeader, verifyJwt, clearSessionCookie } from '@/lib/server/auth';
import { logAudit } from '@/lib/server/audit';

export async function POST(request: NextRequest): Promise<NextResponse> {
  let statusCode = 500;
  let userId: string | undefined;

  try {
    const cookieHeader = request.headers.get('cookie');
    const token = getJwtFromCookieHeader(cookieHeader);

    if (!token) {
      statusCode = 401;
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyJwt(token);
    userId = payload.userId;

    const response = NextResponse.json({ message: 'Logged out' }, { status: 200 });
    response.headers.set('Set-Cookie', clearSessionCookie());
    statusCode = 200;
    return response;
  } catch {
    // Expired/invalid token — clear the cookie anyway
    const response = NextResponse.json({ message: 'Logged out' }, { status: 200 });
    response.headers.set('Set-Cookie', clearSessionCookie());
    statusCode = 200;
    return response;
  } finally {
    await logAudit({
      userId: userId ?? null,
      endpoint: 'POST /api/auth/logout',
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
      statusCode,
    });
  }
}
