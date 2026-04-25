import { checkRateLimit } from './rate-limit.js';

function extractUserId(req) {
  const auth = req.headers['authorization'] || '';
  if (!auth.startsWith('Bearer ')) return null;
  try {
    const payload = auth.split('.')[1];
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return decoded.sub || null;
  } catch { return null; }
}

function getIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || 'unknown';
}

/**
 * Wraps a handler with rate limiting.
 * Keyed by user ID (from unverified JWT payload) when present, else IP.
 * @param {Function} handler — the original Vercel handler
 * @param {{ limit?: number, prefix?: string }} opts
 */
export function withRateLimit(handler, { limit = 600, prefix = 'api' } = {}) {
  return async (req, res) => {
    const userId = extractUserId(req);
    const key = userId ? `${prefix}:user:${userId}` : `${prefix}:ip:${getIp(req)}`;
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
