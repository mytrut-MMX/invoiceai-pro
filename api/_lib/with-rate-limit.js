import { checkRateLimit } from './rate-limit.js';

/**
 * Wraps a handler with rate limiting.
 * @param {Function} handler — the original Vercel handler
 * @param {{ limit?: number, prefix?: string }} opts
 */
export function withRateLimit(handler, { limit = 60, prefix = 'api' } = {}) {
  return async (req, res) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
             || req.headers['x-real-ip']
             || 'unknown';
    const key = `${prefix}:${ip}`;
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
