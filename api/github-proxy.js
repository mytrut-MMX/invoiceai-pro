export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body;
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = JSON.parse(Buffer.concat(chunks).toString());
  } catch(e) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const { path, method, data, token } = body;

  try {
    const response = await fetch(`https://api.github.com${path}`, {
      method: method || 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      ...(data ? { body: JSON.stringify(data) } : {})
    });
    const text = await response.text();
    let result;
    try { result = JSON.parse(text); } catch(e) { result = { message: text }; }
    res.status(response.status).json(result);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
