/**
 * Simple in-memory rate limiter for serverless (no external deps).
 * Note: In serverless, each cold start gets a fresh Map, so this is
 * best-effort. For production, use Upstash Redis.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * Check rate limit for a given key.
 * @returns null if allowed, or { retryAfter } in seconds if blocked.
 */
export function rateLimit(
  key: string,
  maxRequests: number = 5,
  windowMs: number = 60 * 60 * 1000 // 1 hour
): { retryAfter: number } | null {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (entry.count >= maxRequests) {
    return { retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count++;
  return null;
}
