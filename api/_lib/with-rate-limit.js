import { checkRateLimit } from './rate-limit.js';

function getIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || 'unknown';
}

/**
 * Wraps a handler with rate limiting.
 * Keyed by IP only — unverified JWTs must not influence rate-limit keys.
 * @param {Function} handler — the original Vercel handler
 * @param {{ limit?: number, prefix?: string }} opts
 */
export function withRateLimit(handler, { limit = 600, prefix = 'api' } = {}) {
  return async (req, res) => {
    const ip = getIp(req);
    const key = `${prefix}:ip:${ip}`;
    const result = checkRateLimit(key, limit);

    res.setHeader('X-RateLimit-Limit', String(limit));
    res.setHeader('X-RateLimit-Remaining', String(result.remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(result.resetMs / 1000)));

    if (!result.allowed) {
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(result.resetMs / 1000)
      });
    }

    return handler(req, res);
  };
}
