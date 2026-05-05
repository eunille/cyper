import { type NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/server/db';
import { hashPassword } from '@/lib/server/auth';
import { logAudit } from '@/lib/server/audit';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,50}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest): Promise<NextResponse> {
  let statusCode = 500;
  let userId: string | undefined;

  try {
    if (!checkRateLimit(getClientIp(request))) {
      statusCode = 429;
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429 },
      );
    }

    const body: unknown = await request.json();
    if (typeof body !== 'object' || body === null) {
      statusCode = 400;
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { username, email, password } = body as Record<string, unknown>;

    // ── Input validation ─────────────────────────────────────────────────────
    if (typeof username !== 'string' || !USERNAME_RE.test(username)) {
      statusCode = 400;
      return NextResponse.json(
        { error: 'username must be 3–50 characters, letters, numbers, underscores only' },
        { status: 400 },
      );
    }
    if (typeof email !== 'string' || !EMAIL_RE.test(email) || email.length > 255) {
      statusCode = 400;
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      statusCode = 400;
      return NextResponse.json(
        { error: 'password must be 8–128 characters' },
        { status: 400 },
      );
    }

    // ── Duplicate check ──────────────────────────────────────────────────────
    const existing = await query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM users WHERE username = $1 OR email = $2`,
      [username, email],
    );
    if (parseInt(existing[0]?.count ?? '0', 10) > 0) {
      statusCode = 409;
      return NextResponse.json(
        { error: 'Username or email already in use' },
        { status: 409 },
      );
    }

    // ── Create user ──────────────────────────────────────────────────────────
    const passwordHash = await hashPassword(password);
    const rows = await query<{ user_id: string; username: string }>(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING user_id, username`,
      [username, email, passwordHash],
    );

    const user = rows[0]!;
    userId = user.user_id;
    statusCode = 201;
    return NextResponse.json(
      { userId: user.user_id, username: user.username },
      { status: 201 },
    );
  } catch (err) {
    console.error('[register]', err instanceof Error ? err.message : 'Unknown error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await logAudit({
      userId: userId ?? null,
      endpoint: 'POST /api/auth/register',
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
      statusCode,
    });
  }
}
