const DEFAULT_ACCOUNTS = [
  // ASSETS
  { code: '1000', name: 'Bank Account',          type: 'asset',     subtype: 'current',     is_system: true },
  { code: '1100', name: 'Accounts Receivable',   type: 'asset',     subtype: 'current',     is_system: true },
  { code: '1200', name: 'Cash',                  type: 'asset',     subtype: 'current',     is_system: false },

  // LIABILITIES
  { code: '2000', name: 'Accounts Payable',      type: 'liability', subtype: 'current',     is_system: true },
  { code: '2100', name: 'VAT Payable',           type: 'liability', subtype: 'tax',         is_system: true },
  { code: '2200', name: 'CIS Payable',           type: 'liability', subtype: 'tax',         is_system: true },

  // EQUITY
  { code: '3000', name: 'Owner Equity',          type: 'equity',    subtype: null,          is_system: true },
  { code: '3100', name: 'Retained Earnings',     type: 'equity',    subtype: null,          is_system: true },

  // REVENUE
  { code: '4000', name: 'Sales Revenue',         type: 'revenue',   subtype: 'operating',   is_system: true },
  { code: '4100', name: 'Service Revenue',       type: 'revenue',   subtype: 'operating',   is_system: false },

  // EXPENSES
  { code: '5000', name: 'Cost of Goods Sold',       type: 'expense',   subtype: 'cogs',        is_system: false },
  { code: '5100', name: 'Subcontractor Labour',   type: 'expense',   subtype: 'cogs',        is_system: false },
  { code: '5200', name: 'Subcontractor Materials', type: 'expense',   subtype: 'cogs',        is_system: false },
  { code: '6000', name: 'Advertising',             type: 'expense',   subtype: 'operating',   is_system: false },
  { code: '6100', name: 'IT & Software',         type: 'expense',   subtype: 'operating',   is_system: false },
  { code: '6200', name: 'Office Supplies',       type: 'expense',   subtype: 'operating',   is_system: false },
  { code: '6300', name: 'Professional Services', type: 'expense',   subtype: 'operating',   is_system: false },
  { code: '6400', name: 'Travel',                type: 'expense',   subtype: 'operating',   is_system: false },
  { code: '6500', name: 'Utilities',             type: 'expense',   subtype: 'operating',   is_system: false },
  { code: '6600', name: 'Wages & Salaries',      type: 'expense',   subtype: 'operating',   is_system: false },
  { code: '6700', name: 'Bank Charges',          type: 'expense',   subtype: 'operating',   is_system: false },
  { code: '9000', name: 'Suspense Account',      type: 'asset',     subtype: 'control',     is_system: true },
];

export default DEFAULT_ACCOUNTS;

/**
 * Seeds the default chart of accounts for a new user.
 * Idempotent — safe to call multiple times (upserts on user_id + code).
 *
 * @param {string} userId - The authenticated user's ID
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseClient
 * @returns {Promise<Array>} The upserted account rows with generated UUIDs
 */
export async function seedAccountsForUser(userId, supabaseClient) {
  const rows = DEFAULT_ACCOUNTS.map(account => ({ ...account, user_id: userId }));

  const { data, error } = await supabaseClient
    .from('accounts')
    .upsert(rows, { onConflict: ['user_id', 'code'] })
    .select();

  if (error) throw error;
  return data;
}
