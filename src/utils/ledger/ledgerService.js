import { supabase, supabaseReady } from '../../lib/supabase.js';

// ── Public helper ─────────────────────────────────────────────────────────────

/**
 * Finds an account by its code from the user's accounts array.
 * @param {Array} accounts
 * @param {string} code
 * @returns {object|null}
 */
export function findAccount(accounts, code) {
  return accounts.find(a => a.code === code) ?? null;
}

/**
 * Looks up an existing journal entry by its source document type and ID.
 * Used before reversing an entry when an invoice is re-saved.
 *
 * @param {string} sourceType  e.g. 'invoice', 'payment', 'expense'
 * @param {string} sourceId    the source document's id
 * @returns {Promise<{ id: string }|null>}
 */
export async function findEntryBySource(sourceType, sourceId) {
  if (!supabaseReady) return null;
  const { data } = await supabase
    .from('journal_entries')
    .select('id')
    .eq('source_type', sourceType)
    .eq('source_id', sourceId)
    .maybeSingle();
  return data ?? null;
}

// ── Category → ledger account code ───────────────────────────────────────────
// Maps EXPENSE_CATEGORIES names (from src/constants/index.js) to DEFAULT_ACCOUNTS codes.

const CATEGORY_CODE_MAP = {
  'Advertising':           '6000',
  'Automobile':            '6400',
  'Bank Charges':          '6700',
  'Client Entertainment':  '6300',
  'Equipment':             '5000',
  'Fuel':                  '6400',
  'Insurance':             '6300',
  'IT & Software':         '6100',
  'Meals & Subsistence':   '6400',
  'Office Supplies':       '6200',
  'Postage & Courier':     '6200',
  'Professional Services': '6300',
  'Rent & Rates':          '6500',
  'Repairs & Maintenance': '6500',
  'Stationery':            '6200',
  'Subcontractor Labour':    '5100',
  'Subcontractor Materials': '5200',
  'Subscriptions':         '6100',
  'Travel':                '6400',
  'Utilities':             '6500',
  'Wages & Salaries':      '6600',
  'Other':                 '9000',
  // Bill-specific categories
  'Cost of Goods':         '5000',
  'Subcontractor':         '5100',
  'Marketing':             '6000',
};

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Returns the existing journal entry id if one already exists for
 * the given (source_type, source_id) pair, or null if none exists.
 */
async function findExistingEntry(sourceType, sourceId) {
  const { data } = await supabase
    .from('journal_entries')
    .select('id')
    .eq('source_type', sourceType)
    .eq('source_id', sourceId)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Inserts a journal entry and its lines atomically (best-effort — Supabase
 * does not yet support client-side transactions, so lines are inserted after
 * the header; the balance trigger on journal_lines will reject unbalanced entries).
 *
 * @param {{
 *   userId: string,
 *   date: string,          // ISO date string 'YYYY-MM-DD'
 *   description: string,
 *   sourceType: string,
 *   sourceId: string,
 *   lines: Array<{ accountId: string, debit?: number, credit?: number, description?: string }>
 * }} opts
 */
async function insertEntry({ userId, date, description, sourceType, sourceId, lines }) {
  // Idempotency guard
  const existingId = await findExistingEntry(sourceType, sourceId);
  if (existingId) return { success: true, entryId: existingId, duplicate: true };

  const { data: entry, error: entryErr } = await supabase
    .from('journal_entries')
    .insert({ user_id: userId, date, description, source_type: sourceType, source_id: sourceId })
    .select('id')
    .single();

  if (entryErr) throw entryErr;

  const lineRows = lines.map(({ accountId, debit = 0, credit = 0, description: desc = null }) => ({
    journal_entry_id: entry.id,
    account_id: accountId,
    debit: Number(debit.toFixed(2)),
    credit: Number(credit.toFixed(2)),
    description: desc,
  }));

  const { error: linesErr } = await supabase.from('journal_lines').insert(lineRows);
  if (linesErr) throw linesErr;

  return { success: true, entryId: entry.id };
}

// ── Exported service functions ────────────────────────────────────────────────

/**
 * Posts a journal entry for a created or updated invoice.
 *
 * Debits:
 *   Accounts Receivable (1100)  ← invoice.total
 * Credits:
 *   Sales Revenue (4000)        ← invoice.subtotal  (net of discount + shipping)
 *   VAT Payable (2100)          ← sum of taxBreakdown amounts  (if any)
 *   CIS Payable (2200)          ← invoice.cisDeduction  (if any)
 *
 * @param {object} invoice
 * @param {Array}  accounts  - the user's accounts array (from seedAccountsForUser)
 * @param {string} userId
 * @returns {Promise<{ success: boolean, entryId?: string, error?: string }>}
 */
export async function postInvoiceEntry(invoice, accounts, userId, vatScheme = 'Standard', accountingBasis = 'Accrual') {
  if (!supabaseReady) return { success: false, error: 'Supabase not configured' };

  // Cash basis: no journal entry on invoice creation.
  // Revenue and VAT are recognised when payment is received.
  if (accountingBasis === 'Cash') {
    return { success: true, entryId: null, deferred: true };
  }

  try {
    const vatTotal     = (invoice.taxBreakdown || []).reduce((s, t) => s + Number(t.amount || 0), 0);
    const cisDeduction = Number(invoice.cisDeduction || 0);

    const arAccount  = findAccount(accounts, '1100');
    const revAccount = findAccount(accounts, '4000');
    const vatAccount = findAccount(accounts, '2100');
    const cisAccount = findAccount(accounts, '2200');

    if (!arAccount)  return { success: false, error: 'Account 1100 (Accounts Receivable) not found' };
    if (!revAccount) return { success: false, error: 'Account 4000 (Sales Revenue) not found' };

    const lines = [
      { accountId: arAccount.id,  debit: Number(invoice.total),    credit: 0 },
      { accountId: revAccount.id, debit: 0, credit: Number(invoice.subtotal) },
    ];

    // VAT posting depends on scheme:
    // Standard → recognise VAT now (on invoice)
    // Cash Accounting → defer VAT until payment (don't post here)
    // Flat Rate → don't post individual VAT (calculated on total turnover)
    const deferVAT = vatScheme === 'Cash Accounting' || vatScheme === 'Flat Rate Scheme';

    if (vatTotal > 0 && vatAccount && !deferVAT) {
      lines.push({ accountId: vatAccount.id, debit: 0, credit: vatTotal });
    }
    if (cisDeduction > 0 && cisAccount) {
      lines.push({ accountId: cisAccount.id, debit: 0, credit: cisDeduction });
    }

    return await insertEntry({
      userId,
      date: invoice.issue_date,
      description: `Invoice ${invoice.invoice_number} - ${invoice.customer?.name ?? ''}`,
      sourceType: 'invoice',
      sourceId: invoice.id,
      lines,
    });
  } catch (err) {
    return { success: false, error: err?.message ?? String(err) };
  }
}

/**
 * Posts a journal entry for a recorded payment.
 *
 * Debits:
 *   Bank Account (1000)         ← payment.amount
 * Credits:
 *   Accounts Receivable (1100)  ← payment.amount
 *
 * @param {object}      payment
 * @param {object|null} invoice  - the linked invoice (for the invoice number in description)
 * @param {Array}       accounts
 * @param {string}      userId
 * @returns {Promise<{ success: boolean, entryId?: string, error?: string }>}
 */
export async function postPaymentEntry(payment, invoice, accounts, userId, vatScheme = 'Standard', accountingBasis = 'Accrual') {
  if (!supabaseReady) return { success: false, error: 'Supabase not configured' };

  try {
    const bankAccount = findAccount(accounts, '1000');
    const vatAccount  = findAccount(accounts, '2100');

    if (!bankAccount) return { success: false, error: 'Account 1000 (Bank Account) not found' };

    // Cash basis: recognise full revenue + VAT at payment time (no AR involved)
    if (accountingBasis === 'Cash' && invoice) {
      const revAccount = findAccount(accounts, '4000');
      if (!revAccount) return { success: false, error: 'Account 4000 (Sales Revenue) not found' };

      const vatTotal = (invoice.taxBreakdown || []).reduce((s, t) => s + Number(t.amount || 0), 0);
      const netAmount = Number(invoice.subtotal || 0);

      const lines = [
        { accountId: bankAccount.id, debit: Number(payment.amount), credit: 0 },
        { accountId: revAccount.id, debit: 0, credit: netAmount },
      ];

      if (vatTotal > 0 && vatAccount) {
        lines.push({ accountId: vatAccount.id, debit: 0, credit: vatTotal });
      }

      return await insertEntry({
        userId,
        date: payment.date,
        description: `Cash receipt - ${invoice.invoice_number} - ${payment.customer_name ?? ''}`,
        sourceType: 'payment',
        sourceId: payment.id,
        lines,
      });
    }

    // Accrual basis: standard payment entry (Bank debit, AR credit)
    const arAccount = findAccount(accounts, '1100');
    if (!arAccount) return { success: false, error: 'Account 1100 (Accounts Receivable) not found' };

    const lines = [
      { accountId: bankAccount.id, debit: Number(payment.amount), credit: 0 },
      { accountId: arAccount.id,   debit: 0, credit: Number(payment.amount) },
    ];

    // Cash Accounting VAT scheme: recognise VAT only when payment is received
    if (vatScheme === 'Cash Accounting' && invoice) {
      const invoiceVAT = (invoice.taxBreakdown || []).reduce((s, t) => s + Number(t.amount || 0), 0);
      if (invoiceVAT > 0 && vatAccount) {
        lines.push({ accountId: vatAccount.id, debit: 0, credit: invoiceVAT });
      }
    }

    return await insertEntry({
      userId,
      date: payment.date,
      description: `Payment received - ${invoice?.invoice_number ?? ''} - ${payment.customer_name ?? ''}`,
      sourceType: 'payment',
      sourceId: payment.id,
      lines,
    });
  } catch (err) {
    return { success: false, error: err?.message ?? String(err) };
  }
}

/**
 * Posts a journal entry for a saved expense.
 * Input VAT on expenses is reclaimed by debiting VAT Payable (2100),
 * which reduces the liability.
 *
 * Debits:
 *   Expense account (mapped from category)  ← expense.amount  (net)
 *   VAT Payable (2100)                      ← expense.tax_amount  (input VAT reclaim, if any)
 * Credits:
 *   Accounts Payable (2000)                 ← expense.total  (net + VAT)
 *
 * @param {object} expense
 * @param {Array}  accounts
 * @param {string} userId
 * @returns {Promise<{ success: boolean, entryId?: string, error?: string }>}
 */
export async function postExpenseEntry(expense, accounts, userId) {
  if (!supabaseReady) return { success: false, error: 'Supabase not configured' };

  try {
    const expenseCode    = CATEGORY_CODE_MAP[expense.category] ?? '9000';
    const expenseAccount = findAccount(accounts, expenseCode);
    const vatAccount     = findAccount(accounts, '2100');
    const apAccount      = findAccount(accounts, '2000');

    if (!expenseAccount) return { success: false, error: `Account ${expenseCode} not found for category "${expense.category}"` };
    if (!apAccount)      return { success: false, error: 'Account 2000 (Accounts Payable) not found' };

    const isCisLabourExpense = expense.is_cis_expense === true && expense.category === 'Subcontractor Labour';
    const cisPayableAccount = isCisLabourExpense ? findAccount(accounts, '2200') : null;

    const cisRate = expense.cis_rate ?? 20;
    const cisAmount = isCisLabourExpense
      ? (expense.cis_deduction_amount ?? (Number(expense.amount) * cisRate / 100))
      : 0;

    const taxAmount = Number(expense.tax_amount || 0);
    const isDRC = expense.is_drc === true;
    const drcVat = Number(expense.drc_vat_amount || 0);

    const lines = [
      { accountId: expenseAccount.id, debit: Number(expense.amount), credit: 0 },
    ];

    if (isDRC && drcVat > 0 && vatAccount) {
      // DRC self-accounting: both entries on 2100 — net cash effect zero
      lines.push({ accountId: vatAccount.id, debit: drcVat, credit: 0, description: 'DRC Input VAT' });
      lines.push({ accountId: vatAccount.id, debit: 0, credit: drcVat, description: 'DRC Output VAT' });
    } else if (!isDRC && taxAmount > 0 && vatAccount) {
      lines.push({ accountId: vatAccount.id, debit: taxAmount, credit: 0 });
    }

    // AP: only the net amount (DRC) or net+VAT (standard)
    const apAmount = isDRC ? Number(expense.amount) : Number(expense.total);

    if (isCisLabourExpense && cisAmount > 0 && cisPayableAccount) {
      lines.push({ accountId: apAccount.id, debit: 0, credit: apAmount - cisAmount });
      lines.push({ accountId: cisPayableAccount.id, debit: 0, credit: cisAmount });
    } else {
      lines.push({ accountId: apAccount.id, debit: 0, credit: apAmount });
    }

    return await insertEntry({
      userId,
      date: expense.date,
      description: isDRC
        ? `Subcontractor DRC - ${expense.vendor ?? ''} - VAT self-accounted £${drcVat.toFixed(2)}`
        : isCisLabourExpense
          ? `Subcontractor - ${expense.vendor ?? ''} - CIS retained £${cisAmount.toFixed(2)}`
          : `Expense - ${expense.category ?? ''} - ${expense.vendor ?? ''}`,
      sourceType: 'expense',
      sourceId: expense.id,
      lines,
    });
  } catch (err) {
    return { success: false, error: err?.message ?? String(err) };
  }
}

/**
 * Posts a journal entry for a supplier bill (purchase invoice).
 *
 * Debits:
 *   Expense account (mapped from bill category)  ← bill.amount (net)
 *   VAT Payable (2100)                           ← bill.tax_amount (input VAT to reclaim)
 * Credits:
 *   Accounts Payable (2000)                      ← bill.total (net + VAT)
 *
 * @param {object} bill
 * @param {Array}  accounts
 * @param {string} userId
 * @returns {Promise<{ success: boolean, entryId?: string, error?: string }>}
 */
export async function postBillEntry(bill, accounts, userId) {
  if (!supabaseReady) return { success: false, error: 'Supabase not configured' };

  try {
    const expenseCode = CATEGORY_CODE_MAP[bill.category] ?? '9000';
    const expenseAccount = findAccount(accounts, expenseCode);
    const vatAccount = findAccount(accounts, '2100');
    const apAccount = findAccount(accounts, '2000');

    if (!expenseAccount) return { success: false, error: `Account ${expenseCode} not found for category "${bill.category}"` };
    if (!apAccount) return { success: false, error: 'Account 2000 (Accounts Payable) not found' };

    const lines = [
      { accountId: expenseAccount.id, debit: Number(bill.amount), credit: 0 },
    ];

    // Input VAT — debit VAT Payable to reduce the liability (reclaim)
    const inputVAT = Number(bill.tax_amount || 0);
    if (inputVAT > 0 && vatAccount) {
      lines.push({ accountId: vatAccount.id, debit: inputVAT, credit: 0 });
    }

    // Credit AP for the full amount (net + VAT)
    lines.push({ accountId: apAccount.id, debit: 0, credit: Number(bill.total) });

    return await insertEntry({
      userId,
      date: bill.bill_date,
      description: `Bill - ${bill.bill_number || ''} - ${bill.supplier_name ?? ''}`,
      sourceType: 'bill',
      sourceId: bill.id,
      lines,
    });
  } catch (err) {
    return { success: false, error: err?.message ?? String(err) };
  }
}

/**
 * Posts a journal entry for paying a supplier bill.
 *
 * Debits:
 *   Accounts Payable (2000)  ← payment amount
 * Credits:
 *   Bank Account (1000)      ← payment amount
 *
 * @param {object} bill
 * @param {number} paymentAmount
 * @param {Array}  accounts
 * @param {string} userId
 * @returns {Promise<{ success: boolean, entryId?: string, error?: string }>}
 */
export async function postBillPaymentEntry(bill, paymentAmount, accounts, userId) {
  if (!supabaseReady) return { success: false, error: 'Supabase not configured' };

  try {
    const apAccount = findAccount(accounts, '2000');
    const bankAccount = findAccount(accounts, '1000');

    if (!apAccount) return { success: false, error: 'Account 2000 (Accounts Payable) not found' };
    if (!bankAccount) return { success: false, error: 'Account 1000 (Bank Account) not found' };

    return await insertEntry({
      userId,
      date: new Date().toISOString().split('T')[0],
      description: `Bill payment - ${bill.bill_number || ''} - ${bill.supplier_name ?? ''}`,
      sourceType: 'bill_payment',
      sourceId: bill.id,
      lines: [
        { accountId: apAccount.id, debit: Number(paymentAmount), credit: 0 },
        { accountId: bankAccount.id, debit: 0, credit: Number(paymentAmount) },
      ],
    });
  } catch (err) {
    return { success: false, error: err?.message ?? String(err) };
  }
}

/**
 * Creates a reversing entry for an existing journal entry.
 * Every debit becomes a credit and vice versa.
 * Used when an invoice or payment is deleted or voided.
 * Idempotent — a second call for the same journalEntryId returns the existing reversal.
 *
 * @param {string} journalEntryId  - the id of the entry to reverse
 * @param {string} userId
 * @returns {Promise<{ success: boolean, entryId?: string, error?: string }>}
 */
export async function reverseEntry(journalEntryId, userId) {
  if (!supabaseReady) return { success: false, error: 'Supabase not configured' };

  try {
    // Idempotency: 'reversal' entries use the original entry id as source_id
    const existingId = await findExistingEntry('reversal', journalEntryId);
    if (existingId) return { success: true, entryId: existingId, duplicate: true };

    // Fetch the original header
    const { data: original, error: origErr } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('id', journalEntryId)
      .single();
    if (origErr) throw origErr;

    // Fetch the original lines
    const { data: originalLines, error: linesErr } = await supabase
      .from('journal_lines')
      .select('*')
      .eq('journal_entry_id', journalEntryId);
    if (linesErr) throw linesErr;

    // Insert the reversing entry header
    const { data: reversal, error: revErr } = await supabase
      .from('journal_entries')
      .insert({
        user_id:     userId,
        date:        new Date().toISOString().slice(0, 10),
        description: `Reversal of: ${original.description}`,
        source_type: 'reversal',
        source_id:   journalEntryId,
      })
      .select('id')
      .single();
    if (revErr) throw revErr;

    // Swap debit ↔ credit on every line
    const reversedLines = originalLines.map(l => ({
      journal_entry_id: reversal.id,
      account_id:       l.account_id,
      debit:            Number(l.credit),
      credit:           Number(l.debit),
      description:      l.description,
    }));

    const { error: revLinesErr } = await supabase.from('journal_lines').insert(reversedLines);
    if (revLinesErr) throw revLinesErr;

    return { success: true, entryId: reversal.id };
  } catch (err) {
    return { success: false, error: err?.message ?? String(err) };
  }
}
