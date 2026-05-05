import { type NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/server/db';
import {
  verifyPassword,
  signJwt,
  buildSessionCookie,
  jwtExpiresInSeconds,
} from '@/lib/server/auth';
import { logAudit } from '@/lib/server/audit';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';

export async function POST(request: NextRequest): Promise<NextResponse> {
  let statusCode = 500;
  let userId: string | undefined;

  try {
    if (!checkRateLimit(getClientIp(request))) {
      statusCode = 429;
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 },
      );
    }

    const body: unknown = await request.json();
    if (typeof body !== 'object' || body === null) {
      statusCode = 400;
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { username, password } = body as Record<string, unknown>;

    if (typeof username !== 'string' || !username.trim()) {
      statusCode = 400;
      return NextResponse.json({ error: 'username is required' }, { status: 400 });
    }
    if (typeof password !== 'string' || !password) {
      statusCode = 400;
      return NextResponse.json({ error: 'password is required' }, { status: 400 });
    }

    // ── Fetch user ────────────────────────────────────────────────────────────
    const rows = await query<{
      user_id: string;
      username: string;
      password_hash: string;
      is_active: boolean;
    }>(
      `SELECT user_id, username, password_hash, is_active
       FROM users
       WHERE username = $1`,
      [username],
    );

    const user = rows[0];

    // Run bcrypt regardless of whether the user exists to prevent timing attacks.
    // DUMMY_HASH is a valid bcrypt hash; using an invalid string would short-circuit
    // compare() and leak username existence via timing.
    const DUMMY_HASH = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpCEJ9Gzi';
    const hashToVerify = user?.password_hash ?? DUMMY_HASH;
    const passwordValid = await verifyPassword(password, hashToVerify);

    // Same generic error for "not found" and "wrong password" — no user enumeration
    if (!user || !passwordValid || !user.is_active) {
      statusCode = 401;
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // ── Issue JWT ─────────────────────────────────────────────────────────────
    const token = await signJwt({ userId: user.user_id, username: user.username, isActive: true });
    userId = user.user_id;

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
    console.error('[login]', err instanceof Error ? err.message : 'Unknown error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await logAudit({
      userId: userId ?? null,
      endpoint: 'POST /api/auth/login',
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
      statusCode,
    });
  }
}
