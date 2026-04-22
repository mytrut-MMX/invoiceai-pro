// postSelfBilledEntry — balanced double-entry posting for self-billed invoices.
// Uses source_type='self_bill' (migration 043) so auditors can distinguish
// buyer-issued invoices from supplier-issued ones (HMRC VAT Notice 700/62).
// Shape: DR expense (or CIS 5100/5200 split) + DR VAT input or DR/CR RC contra
// + CR CIS payable + CR AP (net of CIS). reverseSelfBilledEntry posts the
// mirror under source_type='self_bill_void'.

import { supabase, supabaseReady } from '../../lib/supabase.js';
import { findAccount, findEntryBySource } from './ledgerService.js';
import { resolveExpenseAccount } from './postBillEntry.js';
import { SelfBillingError } from '../../lib/selfBilling/errors.js';

const r2 = (n) => Number((n || 0).toFixed(2));

export async function postSelfBilledEntry(bill, supplier, accounts, userId) {
  if (!supabaseReady) return { success: false, error: 'Supabase not configured' };

  const amount    = Number(bill?.amount || 0);
  const total     = Number(bill?.total || 0);
  const taxAmount = Number(bill?.tax_amount || 0);
  const labour    = Number(bill?.labour_amount || 0);
  const materials = Number(bill?.materials_amount || 0);
  const cis       = Number(bill?.cis_deduction || 0);
  const rcVat     = Number(bill?.reverse_charge_vat_amount || 0);

  if (total <= 0) return { success: false, error: 'Self-billed entry requires a positive total' };

  const bt       = bill?.bill_type || '';
  const isVatReg = supplier?.is_vat_registered === true;
  const isRc     = bt === 'reverse_charge' || bt === 'cis_reverse_charge';
  const isCis    = bt === 'cis' || bt === 'cis_reverse_charge' || cis > 0;

  // Idempotency — thrown (not returned) so callers can distinguish
  // "already posted" from transient failures.
  const existing = await findEntryBySource('self_bill', bill.id);
  if (existing) throw new SelfBillingError('DUPLICATE_LEDGER_ENTRY', { billId: bill.id });

  try {
    const apAccount = findAccount(accounts, '2000');
    if (!apAccount) return { success: false, error: 'Account 2000 (Accounts Payable) not found' };

    const needVat = (isVatReg && !isRc && taxAmount > 0) || (isRc && rcVat > 0);
    const vatAccount = needVat ? findAccount(accounts, '2100') : null;
    if (needVat && !vatAccount) return { success: false, error: 'Account 2100 (VAT) not found' };

    const cisAccount = (isCis && cis > 0) ? findAccount(accounts, '2200') : null;
    if (isCis && cis > 0 && !cisAccount) return { success: false, error: 'Account 2200 (CIS Payable) not found' };

    // CIS: prefer 5100/5200 split when present; else fall back to category expense.
    const labourAcct    = isCis && labour > 0 ? findAccount(accounts, '5100') : null;
    const materialsAcct = isCis && materials > 0 ? findAccount(accounts, '5200') : null;
    const canSplit = isCis && labourAcct && (materials === 0 || materialsAcct);

    const lines = [];
    if (canSplit) {
      if (labour > 0) lines.push({ a: labourAcct.id, d: r2(labour), c: 0, desc: 'Subcontractor labour (self-bill)' });
      if (materials > 0) lines.push({ a: materialsAcct.id, d: r2(materials), c: 0, desc: 'Subcontractor materials (self-bill)' });
    } else {
      const expAcct = resolveExpenseAccount(accounts, bill.category);
      if (!expAcct) return { success: false, error: `Expense account for "${bill.category || '(none)'}" not found` };
      const netDr = isCis ? r2(labour + materials) : r2(amount);
      lines.push({
        a: expAcct.id, d: netDr, c: 0,
        desc: `Self-bill ${bill.self_bill_invoice_number} — ${bill.category || 'expense'}`,
      });
    }

    if (isRc && rcVat > 0 && vatAccount) {
      lines.push({ a: vatAccount.id, d: r2(rcVat), c: 0, desc: 'RC input VAT (self-bill, self-accounted)' });
      lines.push({ a: vatAccount.id, d: 0, c: r2(rcVat), desc: 'RC output VAT (self-bill, self-accounted)' });
    } else if (isVatReg && !isRc && taxAmount > 0 && vatAccount) {
      lines.push({ a: vatAccount.id, d: r2(taxAmount), c: 0, desc: 'Input VAT recoverable (self-bill)' });
    }

    if (isCis && cis > 0 && cisAccount) {
      lines.push({
        a: cisAccount.id, d: 0, c: r2(cis),
        desc: `CIS withheld (${bill.cis_rate_at_posting || 'self-bill'})`,
      });
    }

    lines.push({
      a: apAccount.id, d: 0, c: r2(total - cis),
      desc: `Payable to ${supplier?.name || 'supplier'}${cis > 0 ? ' (net of CIS)' : ''}`,
    });

    const dr = lines.reduce((s, l) => s + l.d, 0);
    const cr = lines.reduce((s, l) => s + l.c, 0);
    if (Math.abs(dr - cr) >= 0.01) {
      return { success: false, error: `Unbalanced entry: debits ${dr.toFixed(2)} ≠ credits ${cr.toFixed(2)}` };
    }

    const supplierName = supplier?.name || bill.supplier_name || 'supplier';
    const description = `Self-billed invoice ${bill.self_bill_invoice_number} — ${supplierName}`;

    const { data: entry, error: entryErr } = await supabase
      .from('journal_entries')
      .insert({
        user_id: userId, date: bill.bill_date, description,
        reference: bill.self_bill_invoice_number,
        source_type: 'self_bill', source_id: bill.id,
      })
      .select('id').single();
    if (entryErr) throw entryErr;

    const rows = lines.map((l) => ({
      journal_entry_id: entry.id, account_id: l.a,
      debit: l.d, credit: l.c, description: l.desc,
    }));
    const { error: linesErr } = await supabase.from('journal_lines').insert(rows);
    if (linesErr) {
      await supabase.from('journal_entries').delete().eq('id', entry.id);
      return { success: false, error: `Failed to insert journal lines: ${linesErr.message}` };
    }

    return { success: true, journalEntryId: entry.id };
  } catch (err) {
    return { success: false, error: err?.message ?? String(err) };
  }
}

export async function reverseSelfBilledEntry(billId, userId) {
  if (!supabaseReady) return { success: false, error: 'Supabase not configured' };

  try {
    const active = await findEntryBySource('self_bill', billId);
    if (!active) return { success: false, error: 'No active self-billed entry to reverse' };

    // Void idempotency — source_id is the original entry id.
    const { data: existingVoids } = await supabase
      .from('journal_entries').select('id')
      .eq('source_type', 'self_bill_void').eq('source_id', active.id);
    if (existingVoids && existingVoids.length > 0) {
      return { success: true, journalEntryId: existingVoids[0].id, duplicate: true };
    }

    const { data: origHeader, error: hErr } = await supabase
      .from('journal_entries').select('*').eq('id', active.id).single();
    if (hErr) throw hErr;

    const { data: origLines, error: lErr } = await supabase
      .from('journal_lines').select('*').eq('journal_entry_id', active.id);
    if (lErr) throw lErr;

    const { data: voidEntry, error: vErr } = await supabase
      .from('journal_entries')
      .insert({
        user_id: userId, date: new Date().toISOString().slice(0, 10),
        description: `Void of: ${origHeader?.description || 'self-bill'}`,
        source_type: 'self_bill_void', source_id: active.id,
      })
      .select('id').single();
    if (vErr) throw vErr;

    const reversed = (origLines || []).map((l) => ({
      journal_entry_id: voidEntry.id, account_id: l.account_id,
      debit: Number(l.credit || 0), credit: Number(l.debit || 0),
      description: l.description,
    }));
    if (reversed.length > 0) {
      const { error: rlErr } = await supabase.from('journal_lines').insert(reversed);
      if (rlErr) throw rlErr;
    }

    return { success: true, journalEntryId: voidEntry.id };
  } catch (err) {
    return { success: false, error: err?.message ?? String(err) };
  }
}