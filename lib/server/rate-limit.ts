/**
 * Simple in-memory rate limiter for Next.js API routes.
 * Uses a sliding window of request timestamps per key.
 *
 * IMPORTANT: This is suitable only for single-instance deployments.
 * For multi-instance or serverless deployments, replace `store` with
 * a shared store (e.g. Redis, Upstash) and remove the in-process Map.
 *
 * Cleanup is performed lazily on every request (no background interval),
 * which is safe for serverless environments where setInterval is unreliable.
 */

interface WindowEntry {
  timestamps: number[];
}

const store = new Map<string, WindowEntry>();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 5;

/**
 * Returns true if the caller is within rate limit, false if they have exceeded it.
 * Pass the client IP as `key` (or any stable identifier).
 */
export function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  const entry = store.get(key) ?? { timestamps: [] };
  // Lazy cleanup: prune stale timestamps on every call
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= MAX_REQUESTS) {
    store.set(key, entry);
    return false;
  }

  entry.timestamps.push(now);
  store.set(key, entry);
  return true;
}

/** Extract client IP from a Next.js Request, falling back to a safe default. */
export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}
