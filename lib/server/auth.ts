import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

const BCRYPT_COST = 12 as const;
const COOKIE_NAME = 'session';

// ── Startup validation ────────────────────────────────────────────────────────
const rawSecret = process.env.JWT_SECRET;
if (!rawSecret || rawSecret.length < 32) {
  throw new Error(
    'JWT_SECRET must be set and at least 32 characters long',
  );
}

const JWT_SECRET = new TextEncoder().encode(rawSecret);
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '15m';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface AuthPayload extends JWTPayload {
  userId: string;
  username: string;
  isActive: boolean;
}

// ── Password helpers ──────────────────────────────────────────────────────────
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ── JWT helpers ───────────────────────────────────────────────────────────────
export async function signJwt(payload: {
  userId: string;
  username: string;
  isActive: boolean;
}): Promise<string> {
  return new SignJWT({ userId: payload.userId, username: payload.username, isActive: payload.isActive })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(JWT_SECRET);
}

export async function verifyJwt(token: string): Promise<AuthPayload> {
  const { payload } = await jwtVerify(token, JWT_SECRET);
  return payload as AuthPayload;
}

// ── Cookie helpers ────────────────────────────────────────────────────────────
export function buildSessionCookie(token: string, maxAgeSeconds: number): string {
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

export function getJwtFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const [key, ...rest] = pair.trim().split('=');
    if (key?.trim() === COOKIE_NAME) {
      return rest.join('=').trim() || null;
    }
  }
  return null;
}

// ── Seconds helper ────────────────────────────────────────────────────────────
export function jwtExpiresInSeconds(): number {
  const raw = JWT_EXPIRES_IN;
  const match = raw.match(/^(\d+)([smhd])$/);
  if (!match) return 900; // default 15 min
  const value = parseInt(match[1]!, 10);
  const unit = match[2]!;
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return value * (multipliers[unit] ?? 60);
}
