export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { path, token, method, data } = req.body;
    const response = await fetch(`https://api.github.com${path}`, {
      method: method || 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      ...(data ? { body: JSON.stringify(data) } : {})
    });
    const result = await response.json();
    res.status(response.status).json(result);
  } catch(e: any) {
    res.status(500).json({ error: e.message });
  }
}
