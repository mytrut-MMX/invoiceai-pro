import { supabase, supabaseReady } from '../../lib/supabase.js';
import { findAccount } from './ledgerService.js';

/**
 * Posts a balanced double-entry journal for a bill, dispatching on bill_type.
 *
 * Supported bill_type values (migration 026):
 *
 * ── 'standard' ─ No CIS, no DRC (plain supplier bill).
 *   DR <expense account from category>  = bill.amount (net)
 *   DR 2100 VAT Payable                 = bill.tax_amount (if > 0)
 *   CR 2000 Accounts Payable            = bill.total
 *
 * ── 'cis' ─ CIS subcontractor, supplier still charges VAT on invoice.
 *   DR 5100 Subcontractor Labour       = bill.labour_amount (if > 0)
 *   DR 5200 Subcontractor Materials    = bill.materials_amount (if > 0)
 *   DR 2100 VAT Payable                = bill.tax_amount (if > 0)
 *   CR 2200 CIS Payable                = bill.cis_deduction (if > 0)
 *   CR 2000 Accounts Payable           = bill.total - bill.cis_deduction
 *   Validates: labour_amount + materials_amount + tax_amount ≈ bill.total.
 *
 * ── 'reverse_charge' ─ Domestic Reverse Charge VAT, no CIS. Supplier charges
 *   zero VAT; buyer self-accounts for input and output VAT at the same rate.
 *   Two distinct lines on 2100 (not netted) for VAT-return visibility.
 *   DR <expense account from category>  = bill.amount
 *   DR 2100 VAT Payable                 = bill.reverse_charge_vat_amount (input)
 *   CR 2100 VAT Payable                 = bill.reverse_charge_vat_amount (output)
 *   CR 2000 Accounts Payable            = bill.total
 *
 * ── 'cis_reverse_charge' ─ CIS subcontractor + DRC (most common for CIS subs
 *   that are VAT-registered since 1 Mar 2021).
 *   DR 5100 Subcontractor Labour       = bill.labour_amount
 *   DR 5200 Subcontractor Materials    = bill.materials_amount (if > 0)
 *   DR 2100 VAT Payable                = bill.reverse_charge_vat_amount (input)
 *   CR 2100 VAT Payable                = bill.reverse_charge_vat_amount (output)
 *   CR 2200 CIS Payable                = bill.cis_deduction
 *   CR 2000 Accounts Payable           = bill.total - bill.cis_deduction
 *   Validates: labour_amount + materials_amount ≈ bill.total.
 *
 * The CIS deduction, labour/materials split, and reverse_charge_vat_amount must
 * already be computed on the bill row by upstream callers (the bill form or a
 * dedicated helper). This function only posts what's on the row.
 *
 * The entry is idempotent — a second call for the same bill returns the
 * existing journal entry without inserting a duplicate.
 *
 * @param {{
 *   id: string,
 *   bill_date: string,
 *   bill_number: string,
 *   supplier_id: string|null,
 *   supplier_name?: string|null,
 *   total: number,
 *   amount: number,
 *   tax_amount: number,
 *   tax_rate: number,
 *   labour_amount: number,
 *   materials_amount: number,
 *   cis_deduction: number,
 *   cis_rate_at_posting: string|null,
 *   cis_verification_at_posting: string|null,
 *   reverse_charge_applied: boolean,
 *   reverse_charge_vat_amount: number,
 *   bill_type: 'standard'|'cis'|'reverse_charge'|'cis_reverse_charge',
 *   description?: string|null,
 *   category?: string|null,
 *   status?: string,
 * }} bill
 * @param {{ id: string, name: string }|null} supplier - Supplier row or null. Used for
 *   the description string only. Falls back to bill.supplier_name when null.
 * @param {Array} accounts - chart of accounts from fetchUserAccounts()
 * @param {string} userId  - auth.users.id stored on journal_entries.user_id
 * @returns {Promise<{ success: boolean, journalEntryId?: string, error?: string }>}
 */
export async function postBillEntry(bill, supplier, accounts, userId) {
  if (!supabaseReady) return { success: false, error: 'Supabase not configured' };

  try {
    const billType = bill.bill_type;
    const VALID_TYPES = ['standard', 'cis', 'reverse_charge', 'cis_reverse_charge'];
    if (!VALID_TYPES.includes(billType)) {
      return {
        success: false,
        error: `Invalid bill_type "${billType}". Expected one of: ${VALID_TYPES.join(', ')}`,
      };
    }

    const amount    = Number(bill.amount || 0);
    const total     = Number(bill.total || 0);
    const taxAmount = Number(bill.tax_amount || 0);
    const labour    = Number(bill.labour_amount || 0);
    const materials = Number(bill.materials_amount || 0);
    const cis       = Number(bill.cis_deduction || 0);
    const rcVat     = Number(bill.reverse_charge_vat_amount || 0);

    const isCis = billType === 'cis' || billType === 'cis_reverse_charge';
    const isDrc = billType === 'reverse_charge' || billType === 'cis_reverse_charge';

    const r2 = n => Number(n.toFixed(2));

    // ── Per-type amount validation ────────────────────────────────────────────

    if (billType === 'cis') {
      const expected = labour + materials + taxAmount;
      if (Math.abs(expected - total) >= 0.01) {
        return {
          success: false,
          error: `CIS bill totals inconsistent: labour (${labour.toFixed(2)}) + materials (${materials.toFixed(2)}) + tax (${taxAmount.toFixed(2)}) = ${expected.toFixed(2)} ≠ total ${total.toFixed(2)}`,
        };
      }
    }
    if (billType === 'cis_reverse_charge') {
      const expected = labour + materials;
      if (Math.abs(expected - total) >= 0.01) {
        return {
          success: false,
          error: `CIS+DRC bill totals inconsistent: labour (${labour.toFixed(2)}) + materials (${materials.toFixed(2)}) = ${expected.toFixed(2)} ≠ total ${total.toFixed(2)} (DRC means supplier charged zero VAT)`,
        };
      }
    }

    // ── Resolve accounts (only the ones this bill_type needs) ─────────────────

    const apAccount = findAccount(accounts, '2000');
    if (!apAccount) return { success: false, error: 'Account 2000 (Accounts Payable) not found' };

    let vatAccount = null;
    if (taxAmount > 0 || isDrc) {
      vatAccount = findAccount(accounts, '2100');
      if (!vatAccount) return { success: false, error: 'Account 2100 (VAT Payable) not found' };
    }

    let cisAccount = null;
    if (isCis && cis > 0) {
      cisAccount = findAccount(accounts, '2200');
      if (!cisAccount) return { success: false, error: 'Account 2200 (CIS Payable) not found' };
    }

    let labourAccount = null;
    if (isCis && labour > 0) {
      labourAccount = findAccount(accounts, '5100');
      if (!labourAccount) return { success: false, error: 'Account 5100 (Subcontractor Labour) not found' };
    }

    let materialsAccount = null;
    if (isCis && materials > 0) {
      materialsAccount = findAccount(accounts, '5200');
      if (!materialsAccount) return { success: false, error: 'Account 5200 (Subcontractor Materials) not found' };
    }

    let expenseAccount = null;
    if (!isCis) {
      expenseAccount = resolveExpenseAccount(accounts, bill.category);
      if (!expenseAccount) {
        return {
          success: false,
          error: `Expense account for category "${bill.category || '(none)'}" not found (fallback 6200 Office Supplies also missing)`,
        };
      }
    }

    // ── Build journal lines ───────────────────────────────────────────────────

    const lines = [];

    if (billType === 'standard') {
      if (amount > 0) {
        lines.push({
          accountId: expenseAccount.id,
          debit: r2(amount),
          credit: 0,
          description: `Bill ${bill.bill_number} — ${bill.category || 'expense'}`,
        });
      }
      if (taxAmount > 0) {
        lines.push({
          accountId: vatAccount.id,
          debit: r2(taxAmount),
          credit: 0,
          description: 'Input VAT recoverable',
        });
      }
      lines.push({
        accountId: apAccount.id,
        debit: 0,
        credit: r2(total),
        description: `Payable to ${supplier?.name || bill.supplier_name || 'supplier'}`,
      });
    }

    if (billType === 'cis') {
      if (labour > 0) {
        lines.push({
          accountId: labourAccount.id,
          debit: r2(labour),
          credit: 0,
          description: 'Subcontractor labour',
        });
      }
      if (materials > 0) {
        lines.push({
          accountId: materialsAccount.id,
          debit: r2(materials),
          credit: 0,
          description: 'Subcontractor materials',
        });
      }
      if (taxAmount > 0) {
        lines.push({
          accountId: vatAccount.id,
          debit: r2(taxAmount),
          credit: 0,
          description: 'Input VAT recoverable',
        });
      }
      if (cis > 0) {
        lines.push({
          accountId: cisAccount.id,
          debit: 0,
          credit: r2(cis),
          description: `CIS deduction withheld (${bill.cis_rate_at_posting || 'unknown rate'})`,
        });
      }
      lines.push({
        accountId: apAccount.id,
        debit: 0,
        credit: r2(total - cis),
        description: `Payable to ${supplier?.name || bill.supplier_name || 'supplier'} (net of CIS)`,
      });
    }

    if (billType === 'reverse_charge') {
      if (amount > 0) {
        lines.push({
          accountId: expenseAccount.id,
          debit: r2(amount),
          credit: 0,
          description: `Bill ${bill.bill_number} — ${bill.category || 'expense'} (DRC)`,
        });
      }
      if (rcVat > 0) {
        lines.push({
          accountId: vatAccount.id,
          debit: r2(rcVat),
          credit: 0,
          description: 'Reverse charge — input VAT (self-accounted, recoverable)',
        });
        lines.push({
          accountId: vatAccount.id,
          debit: 0,
          credit: r2(rcVat),
          description: 'Reverse charge — output VAT (self-accounted, payable to HMRC)',
        });
      }
      lines.push({
        accountId: apAccount.id,
        debit: 0,
        credit: r2(total),
        description: `Payable to ${supplier?.name || bill.supplier_name || 'supplier'}`,
      });
    }

    if (billType === 'cis_reverse_charge') {
      if (labour > 0) {
        lines.push({
          accountId: labourAccount.id,
          debit: r2(labour),
          credit: 0,
          description: 'Subcontractor labour (DRC)',
        });
      }
      if (materials > 0) {
        lines.push({
          accountId: materialsAccount.id,
          debit: r2(materials),
          credit: 0,
          description: 'Subcontractor materials (DRC)',
        });
      }
      if (rcVat > 0) {
        lines.push({
          accountId: vatAccount.id,
          debit: r2(rcVat),
          credit: 0,
          description: 'Reverse charge — input VAT (self-accounted, recoverable)',
        });
        lines.push({
          accountId: vatAccount.id,
          debit: 0,
          credit: r2(rcVat),
          description: 'Reverse charge — output VAT (self-accounted, payable to HMRC)',
        });
      }
      if (cis > 0) {
        lines.push({
          accountId: cisAccount.id,
          debit: 0,
          credit: r2(cis),
          description: `CIS deduction withheld (${bill.cis_rate_at_posting || 'unknown rate'})`,
        });
      }
      lines.push({
        accountId: apAccount.id,
        debit: 0,
        credit: r2(total - cis),
        description: `Payable to ${supplier?.name || bill.supplier_name || 'supplier'} (net of CIS)`,
      });
    }

    // ── Balance validation ────────────────────────────────────────────────────

    const totalDebits  = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredits = lines.reduce((s, l) => s + l.credit, 0);
    if (Math.abs(totalDebits - totalCredits) >= 0.01) {
      return {
        success: false,
        error: `Journal entry is unbalanced: debits ${totalDebits.toFixed(2)} ≠ credits ${totalCredits.toFixed(2)}`,
      };
    }

    // ── Idempotency guard ─────────────────────────────────────────────────────

    const { data: existing } = await supabase
      .from('journal_entries')
      .select('id')
      .eq('source_type', 'bill')
      .eq('source_id', bill.id)
      .maybeSingle();

    if (existing?.id) {
      return { success: true, journalEntryId: existing.id };
    }

    // ── Insert journal entry header ───────────────────────────────────────────

    const supplierLabel = supplier?.name || bill.supplier_name || 'supplier';
    let description = `Bill ${bill.bill_number} from ${supplierLabel}`;
    if (isCis && cis > 0) description += ` — CIS £${cis.toFixed(2)}`;
    if (isDrc && rcVat > 0) description += ` — DRC VAT £${rcVat.toFixed(2)}`;

    const reference = `BILL-${bill.id.slice(0, 8)}`;

    const { data: entry, error: entryErr } = await supabase
      .from('journal_entries')
      .insert({
        user_id: userId,
        date: bill.bill_date,
        description,
        reference,
        source_type: 'bill',
        source_id: bill.id,
      })
      .select('id')
      .single();

    if (entryErr) throw entryErr;

    // ── Insert journal lines (manual rollback on failure) ─────────────────────

    const lineRows = lines.map(({ accountId, debit, credit, description: desc }) => ({
      journal_entry_id: entry.id,
      account_id: accountId,
      debit,
      credit,
      description: desc,
    }));

    const { error: linesErr } = await supabase.from('journal_lines').insert(lineRows);
    if (linesErr) {
      // Manual rollback — remove the orphaned header.
      await supabase.from('journal_entries').delete().eq('id', entry.id);
      return { success: false, error: `Failed to insert journal lines: ${linesErr.message}` };
    }

    return { success: true, journalEntryId: entry.id };
  } catch (err) {
    return { success: false, error: err?.message ?? String(err) };
  }
}

/**
 * Maps a bill's free-text category to an expense account code.
 * Falls back to 6200 Office Supplies when the category is unknown or missing.
 *
 * Exported so callers (e.g. the bill form preview) can surface the resolved
 * account to the user before posting.
 *
 * @param {Array} accounts - chart of accounts from fetchUserAccounts()
 * @param {string|null|undefined} category - bill.category free-text value
 * @returns {object|null} account row, or null if 6200 also missing
 */
export function resolveExpenseAccount(accounts, category) {
  const map = {
    'Rent & Rates':            '6100',
    'Office Supplies':         '6200',
    'Professional Services':   '6300',
    'Marketing & Advertising': '6400',
    'Travel':                  '6500',
    'IT & Software':           '6600',
    'Utilities':               '6700',
    'Bank Charges':            '6800',
  };
  const code = map[category] || '6200';
  return findAccount(accounts, code);
}
