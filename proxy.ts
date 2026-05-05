import { type NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'session';
const AUTH_REDIRECT = '/auth';

// Edge Runtime — must not import lib/db.ts (pg is Node.js only)

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const rawSecret = process.env.JWT_SECRET;
  if (!rawSecret || rawSecret.length < 32) {
    // Misconfigured server — redirect to auth as a safe fallback
    return NextResponse.redirect(new URL(AUTH_REDIRECT, request.url));
  }

  const secret = new TextEncoder().encode(rawSecret);
  const token = request.cookies.get(COOKIE_NAME)?.value ?? null;

  if (!token) {
    return NextResponse.redirect(new URL(AUTH_REDIRECT, request.url));
  }

  try {
    const { payload } = await jwtVerify(token, secret);
    // Reject tokens that don't explicitly carry isActive=true.
    // This also covers old/malformed tokens that lack the field.
    if (payload.isActive !== true) {
      const response = NextResponse.redirect(new URL(AUTH_REDIRECT, request.url));
      response.cookies.delete(COOKIE_NAME);
      return response;
    }
    return NextResponse.next();
  } catch {
    // Invalid or expired token
    const response = NextResponse.redirect(new URL(AUTH_REDIRECT, request.url));
    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: ['/learn/:path*', '/dashboard/:path*'],
};
