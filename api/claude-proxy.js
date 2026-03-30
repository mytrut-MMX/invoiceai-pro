/**
 * Claude AI proxy — forwards validated requests to the Anthropic Messages API.
 * Only whitelisted models are accepted; request fields are strictly validated
 * and unknown fields are dropped before forwarding.
 */

const ALLOWED_MODELS = [
  'claude-sonnet-4-6',
  'claude-haiku-4-5-20251001',
  'claude-opus-4-6',
  'claude-sonnet-4-20250514',
  'claude-3-5-haiku-20241022',
];
const DEFAULT_MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS_LIMIT = 8192;

export default async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://invoicesaga.com';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  res.setHeader('Cache-Control', 'no-store');

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'AI service not configured' });
  }

  const raw = req.body || {};

  if (!Array.isArray(raw.messages) || raw.messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  // Only forward whitelisted fields
  const body = {
    model: ALLOWED_MODELS.includes(raw.model) ? raw.model : DEFAULT_MODEL,
    max_tokens: Math.min(Math.max(Number(raw.max_tokens) || 1024, 256), MAX_TOKENS_LIMIT),
    messages: raw.messages,
  };
  if (raw.system && typeof raw.system === 'string') {
    body.system = raw.system.slice(0, 8000); // cap system prompt length
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}
