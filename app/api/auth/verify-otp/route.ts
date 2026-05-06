import { type NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/server/db';
import {
  signJwt,
  buildSessionCookie,
  jwtExpiresInSeconds,
} from '@/lib/server/auth';
import { logAudit } from '@/lib/server/audit';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';
import { verifyOtp } from '@/lib/server/otp';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODE_RE = /^\d{6}$/;

export async function POST(request: NextRequest): Promise<NextResponse> {
  let statusCode = 500;
  let userId: string | undefined;

  try {
    if (!checkRateLimit(getClientIp(request))) {
      statusCode = 429;
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429 },
      );
    }

    const body: unknown = await request.json();
    if (typeof body !== 'object' || body === null) {
      statusCode = 400;
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { userId: rawUserId, code } = body as Record<string, unknown>;

    if (typeof rawUserId !== 'string' || !UUID_RE.test(rawUserId)) {
      statusCode = 400;
      return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
    }
    if (typeof code !== 'string' || !CODE_RE.test(code)) {
      statusCode = 400;
      return NextResponse.json({ error: 'Code must be a 6-digit number' }, { status: 400 });
    }

    // ── Verify OTP ─────────────────────────────────────────────────────────────
    const result = await verifyOtp(rawUserId, code);

    if (!result.success) {
      statusCode = 401;
      const messages: Record<string, string> = {
        not_found: 'Code not found or expired. Please request a new one.',
        expired: 'Code has expired. Please request a new one.',
        already_used: 'Code has already been used. Please request a new one.',
        invalid: 'Incorrect code. Please try again.',
        locked: 'Too many incorrect attempts. Please request a new code.',
      };
      return NextResponse.json(
        { error: messages[result.error ?? 'invalid'] ?? 'Invalid code' },
        { status: 401 },
      );
    }

    // ── Fetch user + issue JWT ─────────────────────────────────────────────────
    const rows = await query<{ user_id: string; username: string; is_active: boolean }>(
      `SELECT user_id, username, is_active FROM users WHERE user_id = $1`,
      [rawUserId],
    );

    const user = rows[0];
    if (!user || !user.is_active) {
      statusCode = 401;
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    userId = user.user_id;
    const token = await signJwt({ userId: user.user_id, username: user.username, isActive: true });
    await query(`UPDATE users SET last_login = NOW() WHERE user_id = $1`, [user.user_id]);

    const maxAge = jwtExpiresInSeconds();
    const cookieHeader = buildSessionCookie(token, maxAge);

    statusCode = 200;
    const response = NextResponse.json(
      { userId: user.user_id, username: user.username },
      { status: 200 },
    );
    response.headers.set('Set-Cookie', cookieHeader);
    return response;
  } catch (err) {
    console.error('[verify-otp]', err instanceof Error ? err.message : 'Unknown error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await logAudit({
      userId: userId ?? null,
      endpoint: 'POST /api/auth/verify-otp',
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
      statusCode,
    });
  }
}
