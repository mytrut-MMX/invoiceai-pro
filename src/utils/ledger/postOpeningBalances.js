import { supabase, supabaseReady } from '../../lib/supabase.js';

/**
 * Posts opening balance journal entries for a set of accounts.
 *
 * Creates one journal entry with a line per non-zero balance, then a balancing
 * line to Retained Earnings (3100) for the net difference (representing prior-
 * period accumulated profit/loss when migrating to InvoiceSaga mid-year).
 *
 * Idempotent — uses a fixed `source_id` of `opening-{userId}`. A second call
 * for the same user returns the existing entry with `duplicate: true` instead
 * of inserting again.
 *
 * @param {{ accountId: string, balance: number, type: string }[]} balances
 * @param {Array} accounts - user's full accounts array (from fetchUserAccounts)
 * @param {string} userId
 * @param {string} date - opening date ISO string (YYYY-MM-DD)
 * @returns {Promise<{ success: boolean, entryId?: string, duplicate?: boolean, error?: string }>}
 */
export async function postOpeningBalances(balances, accounts, userId, date) {
  if (!supabaseReady) return { success: false, error: 'Supabase not configured' };

  const nonZero = (balances || []).filter(b => Math.abs(Number(b.balance) || 0) > 0.005);
  if (nonZero.length === 0) return { success: false, error: 'No non-zero balances to post' };

  const retainedEarnings = accounts.find(a => a.code === '3100');
  if (!retainedEarnings) return { success: false, error: 'Retained Earnings account (3100) not found' };

  const sourceId = `opening-${userId}`;

  // Idempotency check — return existing entry if already posted for this user
  const { data: existing } = await supabase
    .from('journal_entries')
    .select('id')
    .eq('source_type', 'opening_balance')
    .eq('source_id', sourceId)
    .limit(1);

  if (existing && existing.length > 0) {
    return { success: true, entryId: existing[0].id, duplicate: true };
  }

  const r2 = n => Math.round(n * 100) / 100;

  const lines = [];
  let totalDebits = 0;
  let totalCredits = 0;

  for (const { accountId, balance, type } of nonZero) {
    const normalDebit = type === 'asset' || type === 'expense';
    const amount = r2(Math.abs(Number(balance) || 0));
    const positive = Number(balance) > 0;
    const debitSide = positive ? normalDebit : !normalDebit;

    if (debitSide) {
      lines.push({ accountId, debit: amount, credit: 0, description: 'Opening balance' });
      totalDebits = r2(totalDebits + amount);
    } else {
      lines.push({ accountId, debit: 0, credit: amount, description: 'Opening balance' });
      totalCredits = r2(totalCredits + amount);
    }
  }

  const diff = r2(totalDebits - totalCredits);
  if (Math.abs(diff) > 0.005) {
    if (diff > 0) {
      lines.push({
        accountId: retainedEarnings.id,
        debit: 0,
        credit: Math.abs(diff),
        description: 'Opening balance — retained earnings (balancing)',
      });
    } else {
      lines.push({
        accountId: retainedEarnings.id,
        debit: Math.abs(diff),
        credit: 0,
        description: 'Opening balance — retained earnings (balancing)',
      });
    }
  }

  // Insert journal entry header
  const { data: entry, error: entryErr } = await supabase
    .from('journal_entries')
    .insert({
      user_id: userId,
      date,
      description: 'Opening balances',
      reference: `OPEN-${userId.slice(0, 8)}`,
      source_type: 'opening_balance',
      source_id: sourceId,
    })
    .select('id')
    .single();

  if (entryErr) return { success: false, error: entryErr.message || 'Failed to insert journal entry' };

  // Insert journal lines (manual rollback on failure)
  const lineRows = lines.map(({ accountId, debit, credit, description }) => ({
    journal_entry_id: entry.id,
    account_id: accountId,
    debit,
    credit,
    description,
  }));

  const { error: linesErr } = await supabase.from('journal_lines').insert(lineRows);
  if (linesErr) {
    await supabase.from('journal_entries').delete().eq('id', entry.id);
    return { success: false, error: `Failed to insert journal lines: ${linesErr.message}` };
  }

  return { success: true, entryId: entry.id };
}
