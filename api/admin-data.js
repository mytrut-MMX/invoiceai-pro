export default async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://invoicesaga.com';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { password } = req.query;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || !password || password !== adminPassword) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(503).json({ error: 'Supabase not configured on server' });
  }

  const headers = {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  };

  try {
    const [profilesRes, contactRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/profiles?select=*&order=created_at.desc`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/contact_submissions?select=*&order=created_at.desc`, { headers }),
    ]);

    const profiles = profilesRes.ok ? await profilesRes.json() : [];
    const contactSubmissions = contactRes.ok ? await contactRes.json() : [];

    res.status(200).json({ profiles, contactSubmissions });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
