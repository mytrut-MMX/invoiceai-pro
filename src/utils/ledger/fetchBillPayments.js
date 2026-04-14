import { supabase, supabaseReady } from '../../lib/supabase.js';

/**
 * Fetches the payment history for a single bill.
 *
 * Reads from `journal_entries` where source_type='bill_payment' and
 * source_id starts with `{billId}:`. The source_id encodes the bill id,
 * payment date and amount (`{billId}:{YYYY-MM-DD}:{amount.toFixed(2)}`)
 * per postBillPaymentEntry's idempotency key.
 *
 * For each payment, we look up any `reversal` entries whose source_id equals
 * the payment entry's id — that tells us which payments have been reversed.
 *
 * Method is parsed from the entry description (format ends with `... via X`).
 * Amount is parsed from the source_id (split(':')[2]) so we don't need to
 * re-read journal_lines.
 *
 * @param {string} billId
 * @returns {Promise<Array<{
 *   id: string,
 *   date: string,
 *   amount: number,
 *   method: string|null,
 *   reference: string|null,
 *   description: string|null,
 *   reversed: boolean,
 *   reversalId?: string,
 * }>>}
 *   Sorted by `date` descending.
 */
export async function fetchBillPayments(billId) {
  if (!supabaseReady || !billId) return [];

  const { data: payments, error } = await supabase
    .from('journal_entries')
    .select('id, date, description, reference, source_id')
    .eq('source_type', 'bill_payment')
    .like('source_id', `${billId}:%`);

  if (error || !payments || payments.length === 0) return [];

  const paymentIds = payments.map(p => p.id);
  const { data: reversals } = await supabase
    .from('journal_entries')
    .select('id, source_id')
    .eq('source_type', 'reversal')
    .in('source_id', paymentIds);

  const reversalByPayment = new Map();
  (reversals || []).forEach(r => reversalByPayment.set(r.source_id, r.id));

  const rows = payments.map(p => {
    const parts = (p.source_id || '').split(':');
    const amount = Number(parts[2]) || 0;
    const desc = p.description || '';
    const viaIdx = desc.lastIndexOf(' via ');
    const method = viaIdx >= 0 ? desc.slice(viaIdx + 5).trim() : null;
    const reversalId = reversalByPayment.get(p.id);
    return {
      id: p.id,
      date: p.date,
      amount,
      method,
      reference: p.reference || null,
      description: p.description || null,
      reversed: !!reversalId,
      ...(reversalId ? { reversalId } : {}),
    };
  });

  rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return rows;
}
