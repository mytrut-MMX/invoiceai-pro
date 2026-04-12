import { supabase, supabaseReady } from '../../lib/supabase.js';
import { findAccount } from './ledgerService.js';

/**
 * Posts a balanced double-entry journal for a bank payment of a supplier bill.
 *
 * Purpose: clears a portion (or all) of a bill's Accounts Payable liability
 * against a bank/asset account when the supplier is paid.
 *
 *   DR 2000 Accounts Payable   = paymentAmount
 *   CR <bank account (asset)>  = paymentAmount
 *
 * Supports full and partial payments. Callers are responsible for not exceeding
 * the outstanding AP balance for the bill; this function posts what it receives.
 *
 * For CIS bills, the caller should pass `paymentAmount = bill.total - bill.cis_deduction`
 * (the CIS-withheld portion is a separate liability owed to HMRC on the CIS300
 * monthly statement, NOT to the supplier). This function does not enforce that
 * — it posts what the caller sends.
 *
 * Idempotency key: `${bill.id}:${paidDate}:${amount.toFixed(2)}`. Two identical
 * payments on the same date for the same amount collapse to one journal entry
 * (the most common accidental-double-click scenario). A bill can therefore have
 * multiple distinct partial payments, as long as their (date, amount) tuples
 * differ.
 *
 * Payment details are NOT written to the bill row here (no status/paid_amount/
 * paid_date update); that's orchestration logic for a separate step.
 *
 * @param {{
 *   id: string,
 *   bill_number?: string|null,
 *   supplier_name?: string|null,
 *   supplier_id?: string|null,
 *   total?: number,
 *   paid_amount?: number,
 *   cis_deduction?: number,
 *   bill_type?: string,
 * }} bill
 * @param {{
 *   paidDate: string,
 *   bankAccountId: string,
 *   paymentMethod: 'BACS'|'Faster Payments'|'CHAPS'|'Cheque'|'Cash'|'Other',
 *   paymentAmount: number,
 *   reference?: string,
 * }} paymentDetails
 * @param {Array} accounts - chart of accounts from fetchUserAccounts()
 * @param {string} userId  - auth.users.id stored on journal_entries.user_id
 * @returns {Promise<{ success: boolean, journalEntryId?: string, error?: string }>}
 */
export async function postBillPaymentEntry(bill, paymentDetails, accounts, userId) {
  if (!supabaseReady) return { success: false, error: 'Supabase not configured' };

  // ── Input validation ────────────────────────────────────────────────────────
  if (!bill?.id) return { success: false, error: 'bill.id is required' };
  if (!paymentDetails?.paidDate) return { success: false, error: 'paidDate is required' };
  if (!paymentDetails?.bankAccountId) return { success: false, error: 'bankAccountId is required' };
  if (!paymentDetails?.paymentMethod) return { success: false, error: 'paymentMethod is required' };

  const VALID_METHODS = ['BACS', 'Faster Payments', 'CHAPS', 'Cheque', 'Cash', 'Other'];
  if (!VALID_METHODS.includes(paymentDetails.paymentMethod)) {
    return {
      success: false,
      error: `Invalid payment method '${paymentDetails.paymentMethod}'. Must be one of: ${VALID_METHODS.join(', ')}`,
    };
  }

  if (!Number.isFinite(paymentDetails.paymentAmount) || paymentDetails.paymentAmount <= 0) {
    return { success: false, error: 'paymentAmount must be a positive number' };
  }

  try {
    const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;
    const amount = round2(Number(paymentDetails.paymentAmount));

    // ── Resolve accounts ──────────────────────────────────────────────────────
    const apAccount = findAccount(accounts, '2000');
    if (!apAccount) return { success: false, error: 'Account 2000 (Accounts Payable) not found' };

    const bankAccount = accounts.find(a => a.id === paymentDetails.bankAccountId);
    if (!bankAccount) return { success: false, error: 'Bank account not found in your chart of accounts' };
    if (bankAccount.type !== 'asset') return { success: false, error: 'Selected account is not an asset account' };

    // ── Idempotency guard ─────────────────────────────────────────────────────
    const idempotencyKey = `${bill.id}:${paymentDetails.paidDate}:${amount.toFixed(2)}`;

    const { data: existing } = await supabase
      .from('journal_entries')
      .select('id')
      .eq('source_type', 'bill_payment')
      .eq('source_id', idempotencyKey)
      .maybeSingle();

    if (existing?.id) {
      return { success: true, journalEntryId: existing.id };
    }

    // ── Build journal lines ───────────────────────────────────────────────────
    const supplierLabel = bill.supplier_name || 'supplier';
    const refSuffix = paymentDetails.reference ? ` (${paymentDetails.reference})` : '';
    const billLabel = bill.bill_number || bill.id.slice(0, 8);

    const lines = [
      {
        account_id: apAccount.id,
        debit: amount,
        credit: 0,
        description: `Clear AP — bill ${billLabel} to ${supplierLabel}${refSuffix}`,
      },
      {
        account_id: bankAccount.id,
        debit: 0,
        credit: amount,
        description: `Payment via ${paymentDetails.paymentMethod} — ${supplierLabel}${refSuffix}`,
      },
    ];

    // ── Balance validation ────────────────────────────────────────────────────
    const totalDebits  = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredits = lines.reduce((s, l) => s + l.credit, 0);
    if (Math.abs(totalDebits - totalCredits) >= 0.01) {
      return {
        success: false,
        error: `Journal unbalanced: debits ${totalDebits.toFixed(2)} ≠ credits ${totalCredits.toFixed(2)}`,
      };
    }

    // ── Insert journal entry header ───────────────────────────────────────────
    const description = `Payment of bill ${billLabel} to ${supplierLabel} — £${amount.toFixed(2)} via ${paymentDetails.paymentMethod}`;
    const reference = `BILLPAY-${bill.id.slice(0, 8)}-${paymentDetails.paidDate}`;

    const { data: entry, error: entryErr } = await supabase
      .from('journal_entries')
      .insert({
        user_id: userId,
        date: paymentDetails.paidDate,
        description,
        reference,
        source_type: 'bill_payment',
        source_id: idempotencyKey,
      })
      .select('id')
      .single();

    if (entryErr) throw entryErr;

    // ── Insert journal lines (manual rollback on failure) ─────────────────────
    const lineRows = lines.map(l => ({
      journal_entry_id: entry.id,
      account_id: l.account_id,
      debit: l.debit,
      credit: l.credit,
      description: l.description,
    }));

    const { error: linesErr } = await supabase.from('journal_lines').insert(lineRows);
    if (linesErr) {
      await supabase.from('journal_entries').delete().eq('id', entry.id);
      return { success: false, error: `Failed to insert journal lines: ${linesErr.message}` };
    }

    return { success: true, journalEntryId: entry.id };
  } catch (err) {
    return { success: false, error: err?.message ?? String(err) };
  }
}
