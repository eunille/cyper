import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query } from './db';

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;

export function generateOtpCode(): string {
  // Cryptographically random 6-digit code
  const buf = crypto.randomBytes(4);
  const num = buf.readUInt32BE(0) % 1_000_000;
  return num.toString().padStart(OTP_LENGTH, '0');
}

export async function createOtp(userId: string): Promise<string> {
  // Invalidate any unused OTPs for this user before creating a new one
  await query(
    `UPDATE otp_codes SET used_at = now()
     WHERE user_id = $1 AND used_at IS NULL AND expires_at > now()`,
    [userId],
  );

  const code = generateOtpCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await query(
    `INSERT INTO otp_codes (user_id, code_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, codeHash, expiresAt.toISOString()],
  );

  return code;
}

export interface VerifyOtpResult {
  success: boolean;
  userId?: string;
  error?: 'not_found' | 'expired' | 'already_used' | 'invalid' | 'locked';
}

export async function verifyOtp(userId: string, code: string): Promise<VerifyOtpResult> {
  // Fetch the latest unused, non-expired OTP for this user
  const rows = await query<{
    otp_id: string;
    code_hash: string;
    expires_at: string;
    used_at: string | null;
    attempts: number;
  }>(
    `SELECT otp_id, code_hash, expires_at, used_at, attempts
     FROM otp_codes
     WHERE user_id = $1 AND expires_at > now()
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId],
  );

  const row = rows[0];

  if (!row) return { success: false, error: 'not_found' };
  if (row.used_at) return { success: false, error: 'already_used' };
  if (row.attempts >= MAX_ATTEMPTS) return { success: false, error: 'locked' };

  const match = await bcrypt.compare(code, row.code_hash);

  if (!match) {
    // Increment attempts
    await query(
      `UPDATE otp_codes SET attempts = attempts + 1 WHERE otp_id = $1`,
      [row.otp_id],
    );
    const remaining = MAX_ATTEMPTS - row.attempts - 1;
    if (remaining <= 0) return { success: false, error: 'locked' };
    return { success: false, error: 'invalid' };
  }

  // Mark as used
  await query(
    `UPDATE otp_codes SET used_at = now() WHERE otp_id = $1`,
    [row.otp_id],
  );

  return { success: true, userId };
}

export const OTP_EXPIRY_MINUTES_EXPORT = OTP_EXPIRY_MINUTES;
