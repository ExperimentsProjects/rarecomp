/**
 * Lightweight in-memory rate limiter for abuse protection.
 * Works on serverless (per-instance) and stops the most common attacks:
 * brute-force logins, review spam, order floods, and upload abuse.
 */

type Bucket = { count: number; resetAt: number };
const globalForLimit = globalThis as typeof globalThis & { __epLimit?: Map<string, Bucket>; __epLimitSweeper?: boolean };
const buckets = globalForLimit.__epLimit ?? new Map<string, Bucket>();
globalForLimit.__epLimit = buckets;

export type RateLimitResult = { ok: boolean; remaining: number; retryAfterSeconds: number };

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }

  bucket.count += 1;

  if (bucket.count > limit) {
    return { ok: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }

  return { ok: true, remaining: limit - bucket.count, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
}

/** Identify the caller by IP + optional identity for per-user throttling. */
export function clientKey(req: Request, scope: string, identity?: string) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  return `${scope}:${identity ? identity.toLowerCase() : ''}:${ip}`;
}

/** Basic hygiene sweep — drops old buckets so memory can't grow unbounded. */
if (typeof setInterval !== 'undefined' && !globalForLimit.__epLimitSweeper) {
  globalForLimit.__epLimitSweeper = true;
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) if (now > bucket.resetAt) buckets.delete(key);
  }, 60_000).unref?.();
}
