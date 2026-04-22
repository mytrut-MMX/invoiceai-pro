// POST /api/send-document — dispatcher.
//
// Consolidates the former /api/send-document and /api/send-selfbill
// endpoints under a single Vercel function (Hobby 12-function limit).
// Action is taken from the request body (defaulting to 'invoice' so all
// existing clients keep working without a body change):
//
//   action: 'invoice'  → handleSendInvoice  (client-built email + attachment)
//   action: 'selfbill' → handleSendSelfbill (server fetches PDF from bucket)
//
// Rate limit is per-action (preserving the pre-consolidation budgets):
//   invoice  → 5  req/min/IP, prefix 'send-document'
//   selfbill → 20 req/min/IP, prefix 'send-selfbill'
//
// This file owns: method check, body parse, action resolve, rate-limit
// headers, auth verification, env check. It never touches business logic —
// that lives in api/_lib/send-*-handler.js.

import { checkRateLimit } from './_lib/rate-limit.js';
import { parseBody } from './_lib/send-shared.js';
import { handleSendInvoice } from './_lib/send-invoice-handler.js';
import { handleSendSelfbill } from './_lib/send-selfbill-handler.js';

const ACTION_LIMITS = {
  invoice:  { limit: 5,  prefix: 'send-document' },
  selfbill: { limit: 20, prefix: 'send-selfbill' },
};

function getIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || 'unknown';
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const payload = parseBody(req.body);
    if (!payload) return res.status(400).json({ error: 'Invalid JSON request body' });

    // Default to 'invoice' so pre-consolidation callers (which never sent an
    // action) keep routing to handleSendInvoice unchanged.
    const action = payload.action || 'invoice';
    const cfg = ACTION_LIMITS[action];
    if (!cfg) {
      return res.status(400).json({ error: `Unknown action "${action}". Use 'invoice' or 'selfbill'.` });
    }

    // Per-action rate limit. Preserves the original per-endpoint budgets so
    // clients don't see a regression after the merge.
    const rl = checkRateLimit(`${cfg.prefix}:${getIp(req)}`, cfg.limit);
    res.setHeader('X-RateLimit-Limit', String(cfg.limit));
    res.setHeader('X-RateLimit-Remaining', String(rl.remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(rl.resetMs / 1000)));
    if (!rl.allowed) {
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(rl.resetMs / 1000),
      });
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) return res.status(500).json({ error: 'RESEND_API_KEY not configured' });

    // Auth is per-action: invoice path matches the pre-consolidation
    // /api/send-document which never required a Bearer token (and callers
    // like SendDocumentModal + sendCISStatement never send one). Self-bill
    // path enforces auth inside handleSendSelfbill — it reads bills + storage
    // scoped to user_id and must not be callable unauthenticated.
    const ctx = { payload, resendKey };

    if (action === 'selfbill') return await handleSendSelfbill(req, res, ctx);
    return await handleSendInvoice(req, res, ctx);
  } catch (err) {
    console.error('[send-document] Error:', err?.message || err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
