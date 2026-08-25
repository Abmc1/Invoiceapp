import "server-only";

/**
 * Simple in-memory sliding-window rate limiter for authentication-adjacent
 * actions (login, password changes).
 *
 * This is sufficient for a single-instance deployment (the typical setup for
 * a small private business application). If MotivAction ever scales to
 * multiple server instances, swap this for a shared store (e.g. Redis /
 * Upstash) behind the same `checkRateLimit` interface.
 */

const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_MAX_ATTEMPTS = 8;

const attempts = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

export function checkRateLimit(
  key: string,
  options?: { maxAttempts?: number; windowMs?: number }
): RateLimitResult {
  const maxAttempts = options?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const windowMs = options?.windowMs ?? DEFAULT_WINDOW_MS;

  const now = Date.now();
  const windowStart = now - windowMs;

  const existing = (attempts.get(key) ?? []).filter((t) => t > windowStart);

  if (existing.length >= maxAttempts) {
    const retryAfterSeconds = Math.ceil((existing[0] + windowMs - now) / 1000);
    attempts.set(key, existing);
    return { allowed: false, retryAfterSeconds };
  }

  existing.push(now);
  attempts.set(key, existing);
  return { allowed: true };
}

export function resetRateLimit(key: string): void {
  attempts.delete(key);
}

/**
 * Best-effort client IP from standard proxy headers (Vercel, most reverse
 * proxies set `x-forwarded-for`). Falls back to a constant so requests with
 * no such header still share a (coarser) rate limit bucket instead of
 * bypassing rate limiting entirely.
 */
export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
