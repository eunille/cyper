import { type NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/server/db';
import {
  verifyPassword,
} from '@/lib/server/auth';
import { logAudit } from '@/lib/server/audit';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';
import { createOtp, OTP_EXPIRY_MINUTES_EXPORT } from '@/lib/server/otp';
import { sendOtpEmail } from '@/lib/server/mailer';

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
      email: string;
      password_hash: string;
      is_active: boolean;
    }>(
      `SELECT user_id, username, email, password_hash, is_active
       FROM users
       WHERE username = $1`,
      [username],
    );

    const user = rows[0];

    // Constant-time comparison to prevent user enumeration via timing
    const DUMMY_HASH = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpCEJ9Gzi';
    const hashToVerify = user?.password_hash ?? DUMMY_HASH;
    const passwordValid = await verifyPassword(password, hashToVerify);

    if (!user || !passwordValid || !user.is_active) {
      statusCode = 401;
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // ── Generate + send OTP (MFA step) ────────────────────────────────────────
    userId = user.user_id;
    const code = await createOtp(user.user_id);
    await sendOtpEmail(user.email, code, OTP_EXPIRY_MINUTES_EXPORT);

    // Mask email for display: a***@domain.com
    const [localPart, domain] = user.email.split('@');
    const maskedEmail = `${localPart!.charAt(0)}***@${domain}`;

    statusCode = 200;
    return NextResponse.json(
      {
        status: 'otp_sent',
        userId: user.user_id,
        maskedEmail,
        expiresMinutes: OTP_EXPIRY_MINUTES_EXPORT,
      },
      { status: 200 },
    );
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
