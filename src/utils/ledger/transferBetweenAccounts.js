import { supabase, supabaseReady } from '../../lib/supabase.js';

/**
 * Creates a manual journal entry that transfers value between two accounts.
 * Used for: bank → credit card payment (DR CC liability, CR bank asset).
 *
 * DR toAccountId   — reduces a liability (pays it off) or increases an asset
 * CR fromAccountId — reduces an asset (money leaves) or reduces a liability
 *
 * Both accounts are validated against auth.uid() via RLS before posting.
 *
 * @param {{
 *   fromAccountId: string,
 *   toAccountId:   string,
 *   amount:        number,
 *   date:          string,   // ISO 'YYYY-MM-DD'
 *   memo:          string,
 *   userId:        string,
 * }} opts
 * @returns {Promise<{ journalEntry: object|null, error: string|null }>}
 */
export async function transferBetweenAccounts({ fromAccountId, toAccountId, amount, date, memo, userId }) {
  if (!supabaseReady) return { journalEntry: null, error: 'Supabase not configured' };
  if (!fromAccountId || !toAccountId) return { journalEntry: null, error: 'Both accounts are required' };
  if (!Number.isFinite(amount) || amount <= 0) return { journalEntry: null, error: 'Amount must be greater than zero' };
  const rounded = Math.round(amount * 100) / 100;
  if (rounded <= 0) return { journalEntry: null, error: 'Amount must be at least 0.01 after rounding' };
  if (fromAccountId === toAccountId)  return { journalEntry: null, error: 'From and To accounts must differ' };

  try {
    // Validate ownership via RLS — this SELECT will return 0 rows if either
    // account doesn't belong to the authenticated user.
    const { data: owned, error: ownerErr } = await supabase
      .from('accounts')
      .select('id')
      .in('id', [fromAccountId, toAccountId]);

    if (ownerErr) throw ownerErr;
    if (!owned || owned.length < 2) {
      return { journalEntry: null, error: 'One or both accounts not found or not accessible' };
    }

    const description = memo?.trim() || 'Transfer between accounts';
    const sourceId = `transfer-${userId}-${Date.now()}`;

    const { data: entry, error: entryErr } = await supabase
      .from('journal_entries')
      .insert({
        user_id:     userId,
        date,
        description,
        source_type: 'manual',
        source_id:   sourceId,
      })
      .select()
      .single();

    if (entryErr) throw entryErr;

    const lines = [
      { journal_entry_id: entry.id, account_id: toAccountId,   debit: Number(rounded.toFixed(2)), credit: 0 },
      { journal_entry_id: entry.id, account_id: fromAccountId, debit: 0, credit: Number(rounded.toFixed(2)) },
    ];

    const { error: linesErr } = await supabase.from('journal_lines').insert(lines);
    if (linesErr) throw linesErr;

    return { journalEntry: entry, error: null };
  } catch (err) {
    return { journalEntry: null, error: err?.message ?? String(err) };
  }
}
