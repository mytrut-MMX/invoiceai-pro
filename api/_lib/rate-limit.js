// api/lib/rate-limit.js
// In-memory rate limiter for Vercel serverless.
// NOTE: Each Vercel instance has its own memory — this is best-effort,
// not distributed. For production scale, replace with Upstash Redis.

const rateMap = new Map();
const DEFAULT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const CLEANUP_INTERVAL = 10 * 60 * 1000; // cleanup every 10 min

// Periodic cleanup of expired entries
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateMap) {
    if (now - entry.start > DEFAULT_WINDOW_MS * 2) rateMap.delete(key);
  }
}, CLEANUP_INTERVAL);

/**
 * @param {string} key — user ID, IP, or composite
 * @param {number} limit — max requests per window
 * @param {number} [windowMs] — window in ms (default 1 hour)
 * @returns {{ allowed: boolean, remaining: number, resetMs: number }}
 */
export function checkRateLimit(key, limit, windowMs = DEFAULT_WINDOW_MS) {
  const now = Date.now();
  let entry = rateMap.get(key);

  if (!entry || now - entry.start > windowMs) {
    entry = { count: 1, start: now };
    rateMap.set(key, entry);
    return { allowed: true, remaining: limit - 1, resetMs: windowMs };
  }

  entry.count++;
  const remaining = Math.max(0, limit - entry.count);
  const resetMs = windowMs - (now - entry.start);

  return { allowed: entry.count <= limit, remaining, resetMs };
}
