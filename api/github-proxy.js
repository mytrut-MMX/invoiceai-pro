// SEC-004: Restrict CORS to allowed origin only (not wildcard)
const ALLOWED_METHODS = ['GET', 'POST'];
// SEC-003: Whitelist of permitted GitHub API path prefixes
const ALLOWED_PATH_PREFIXES = [
  '/repos/',
  '/user',
  '/gists',
  '/search/repositories',
  '/search/code',
];

export default async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://invoicesaga.com';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body;
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const { path, method, data, token } = body;

  // SEC-003: Validate path is a string starting with /
  if (!path || typeof path !== 'string' || !path.startsWith('/')) {
    return res.status(400).json({ error: 'Invalid path' });
  }

  // SEC-003: Enforce path whitelist
  const pathAllowed = ALLOWED_PATH_PREFIXES.some(prefix => path.startsWith(prefix));
  if (!pathAllowed) {
    return res.status(403).json({ error: 'Path not permitted' });
  }

  // SEC-003: Validate HTTP method
  const httpMethod = (method || 'GET').toUpperCase();
  if (!ALLOWED_METHODS.includes(httpMethod)) {
    return res.status(405).json({ error: 'Method not permitted' });
  }

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Token required' });
  }

  try {
    const response = await fetch(`https://api.github.com${path}`, {
      method: httpMethod,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      ...(data ? { body: JSON.stringify(data) } : {})
    });
    const text = await response.text();
    let result;
    try { result = JSON.parse(text); } catch { result = { message: text }; }
    res.status(response.status).json(result);
  } catch {
    // SEC-015: Do not expose internal error details
    res.status(500).json({ error: 'Internal server error' });
  }
}
