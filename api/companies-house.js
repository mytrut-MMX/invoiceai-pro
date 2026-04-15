/**
 * Companies House API proxy.
 *
 * Server-side only — the Companies House API key lives in
 * process.env.COMPANIES_HOUSE_API_KEY and is never exposed to the client.
 *
 * Endpoint: GET /api/companies-house?crn=12345678
 * Returns: {
 *   success: true,
 *   companyName, companyStatus,
 *   accountingReferenceDate: { day, month } | null,
 *   nextAccounts: { period_start_on, period_end_on, due_on } | null,
 *   lastAccounts: { made_up_to } | null
 * }
 * On error: { success: false, error: string }
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { crn } = req.query;
  if (!crn || !/^[A-Z0-9]{6,10}$/i.test(crn)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid CRN format',
    });
  }

  const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
  if (!apiKey) {
    console.error('[companies-house] COMPANIES_HOUSE_API_KEY not set');
    return res.status(500).json({
      success: false,
      error: 'Server configuration error',
    });
  }

  // Companies House uses HTTP Basic Auth: API key as username, empty password.
  const authHeader = 'Basic ' + Buffer.from(apiKey + ':').toString('base64');

  try {
    const chRes = await fetch(
      `https://api.company-information.service.gov.uk/company/${crn.toUpperCase()}`,
      { headers: { Authorization: authHeader } },
    );

    if (chRes.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Company not found',
      });
    }
    if (chRes.status === 429) {
      return res.status(429).json({
        success: false,
        error: 'Companies House rate limit hit; try again in a few minutes',
      });
    }
    if (!chRes.ok) {
      return res.status(chRes.status).json({
        success: false,
        error: `Companies House API error (${chRes.status})`,
      });
    }

    const data = await chRes.json();

    return res.status(200).json({
      success: true,
      companyName: data.company_name || null,
      companyStatus: data.company_status || null,
      accountingReferenceDate: data.accounts?.accounting_reference_date || null,
      nextAccounts: data.accounts?.next_accounts || null,
      lastAccounts: data.accounts?.last_accounts || null,
    });
  } catch (err) {
    console.error('[companies-house] fetch failed:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to reach Companies House API',
    });
  }
}
