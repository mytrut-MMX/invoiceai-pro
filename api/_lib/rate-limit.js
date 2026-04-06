// api/lib/rate-limit.js
// In-memory rate limiter for Vercel serverless.
// NOTE: Each Vercel instance has its own memory — this is best-effort,
// not distributed. For production scale, replace with Upstash Redis.

const rateMap = new Map();
const WINDOW_MS = 60 * 1000; // 1 minute window
const CLEANUP_INTERVAL = 5 * 60 * 1000; // cleanup every 5 min

// Periodic cleanup of expired entries
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateMap) {
    if (now - entry.start > WINDOW_MS * 2) rateMap.delete(key);
  }
}, CLEANUP_INTERVAL);

/**
 * @param {string} key — usually IP + endpoint
 * @param {number} limit — max requests per window
 * @returns {{ allowed: boolean, remaining: number, resetMs: number }}
 */
export function checkRateLimit(key, limit) {
  const now = Date.now();
  let entry = rateMap.get(key);

  if (!entry || now - entry.start > WINDOW_MS) {
    entry = { count: 1, start: now };
    rateMap.set(key, entry);
    return { allowed: true, remaining: limit - 1, resetMs: WINDOW_MS };
  }

  entry.count++;
  const remaining = Math.max(0, limit - entry.count);
  const resetMs = WINDOW_MS - (now - entry.start);

  return { allowed: entry.count <= limit, remaining, resetMs };
}
