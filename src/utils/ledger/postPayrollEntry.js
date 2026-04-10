import { supabase, supabaseReady } from '../../lib/supabase.js';
import { findAccount } from './ledgerService.js';

/**
 * Posts a balanced double-entry journal for a payroll run.
 *
 * Debits (expense side):
 *   6000 Wages & Salaries ← total_gross
 *   6000 Wages & Salaries ← total_ni_employer   (employer NI is a staff cost)
 *   6000 Wages & Salaries ← total_pension_employer (employer pension is a staff cost)
 *
 * Credits (liability + bank side):
 *   2300 PAYE/NIC Liability ← total_tax + total_ni_employee + total_ni_employer
 *   2300 PAYE/NIC Liability ← total_student_loan
 *   2350 Pension Liability  ← total_pension_employee + total_pension_employer
 *     (falls back to 2300 if 2350 does not exist)
 *   2310 Net Wages Payable  ← total_net
 *     (cleared to bank when payment is recorded via recordPayrollPayment)
 *
 * The entry is idempotent — a second call for the same payroll run returns
 * the existing journal entry without inserting a duplicate.
 *
 * @param {{
 *   id: string,
 *   period_start: string,
 *   period_end: string,
 *   pay_date: string,
 *   total_gross: number,
 *   total_tax: number,
 *   total_ni_employee: number,
 *   total_ni_employer: number,
 *   total_pension_employee: number,
 *   total_pension_employer: number,
 *   total_student_loan: number,
 *   total_net: number,
 * }} payrollRun
 * @param {Array} payslips - payslip records (used for line-level descriptions)
 * @param {Array} accounts - chart of accounts from fetchUserAccounts()
 * @param {string} userId  - auth.users.id
 * @param {number} [eaAbsorbed=0] - Employment Allowance absorbed against employer NI
 *   for this run. Reduces both the 6000 Wages & Salaries debit line AND the 2300
 *   PAYE/NIC Liability credit line by the same amount. Journal stays balanced.
 *   Must be <= payrollRun.total_ni_employer. Caller is responsible for consuming
 *   EA via consumeEA() BEFORE calling this function.
 * @returns {Promise<{ success: boolean, journalEntryId?: string, error?: string }>}
 */
export async function postPayrollEntry(payrollRun, payslips, accounts, userId, eaAbsorbed = 0) {
  if (!supabaseReady) return { success: false, error: 'Supabase not configured' };

  try {
    const gross           = Number(payrollRun.total_gross || 0);
    const tax             = Number(payrollRun.total_tax || 0);
    const niEmployee      = Number(payrollRun.total_ni_employee || 0);
    const niEmployer      = Number(payrollRun.total_ni_employer || 0);

    // Employment Allowance absorption: clamp to [0, niEmployer] for safety.
    // Caller (submitPayrollRun) is responsible for calling consumeEA() first and
    // passing the actual absorbed amount. We clamp here as defensive double-check
    // to guarantee we never debit a negative value or absorb more than niEmployer.
    const eaClamped = Math.max(0, Math.min(Number(eaAbsorbed || 0), niEmployer));
    const niEmployerNet = niEmployer - eaClamped;

    const pensionEmployee = Number(payrollRun.total_pension_employee || 0);
    const pensionEmployer = Number(payrollRun.total_pension_employer || 0);
    const studentLoan     = Number(payrollRun.total_student_loan || 0);
    const netPay          = Number(payrollRun.total_net || 0);

    // ── Resolve accounts ──────────────────────────────────────────────────────

    const wagesAccount           = findAccount(accounts, '6000');
    const payeAccount            = findAccount(accounts, '2300');
    const pensionAccount         = findAccount(accounts, '2350') || findAccount(accounts, '2300');
    const netWagesPayableAccount = findAccount(accounts, '2310');

    if (!wagesAccount)           return { success: false, error: 'Account 6000 (Wages & Salaries) not found' };
    if (!payeAccount)            return { success: false, error: 'Account 2300 (PAYE/NIC Liability) not found' };
    if (!netWagesPayableAccount) return { success: false, error: 'Account 2310 (Net Wages Payable) not found. Run the payroll accounts migration.' };

    // ── Build journal lines ───────────────────────────────────────────────────

    const r2 = n => Number(n.toFixed(2));

    const lines = [];

    // Debits: employer costs
    if (gross > 0) {
      lines.push({
        accountId: wagesAccount.id,
        debit: r2(gross),
        credit: 0,
        description: 'Gross wages and salaries',
      });
    }
    if (niEmployerNet > 0) {
      lines.push({
        accountId: wagesAccount.id,
        debit: r2(niEmployerNet),
        credit: 0,
        description: eaClamped > 0
          ? `Employer's National Insurance (net of Employment Allowance £${r2(eaClamped).toFixed(2)})`
          : "Employer's National Insurance",
      });
    }
    if (pensionEmployer > 0) {
      lines.push({
        accountId: wagesAccount.id,
        debit: r2(pensionEmployer),
        credit: 0,
        description: "Employer's pension contribution",
      });
    }

    // Credits: PAYE/NIC liability
    // Uses niEmployerNet (not niEmployer) so that EA-absorbed employer NI is
    // NOT pushed to HMRC liability. Tax + employee NI are always owed in full.
    const payeLiability = tax + niEmployee + niEmployerNet;
    if (payeLiability > 0) {
      lines.push({
        accountId: payeAccount.id,
        debit: 0,
        credit: r2(payeLiability),
        description: eaClamped > 0
          ? `PAYE income tax + employee NIC + employer NIC (net of EA £${r2(eaClamped).toFixed(2)})`
          : 'PAYE income tax + employee NIC + employer NIC',
      });
    }
    if (studentLoan > 0) {
      lines.push({
        accountId: payeAccount.id,
        debit: 0,
        credit: r2(studentLoan),
        description: 'Student loan deductions',
      });
    }

    // Credits: pension liability
    const pensionLiability = pensionEmployee + pensionEmployer;
    if (pensionLiability > 0) {
      lines.push({
        accountId: pensionAccount.id,
        debit: 0,
        credit: r2(pensionLiability),
        description: 'Employee + employer pension contributions',
      });
    }

    // Credits: net pay to Net Wages Payable (liability cleared when payment is recorded)
    if (netPay > 0) {
      lines.push({
        accountId: netWagesPayableAccount.id,
        debit: 0,
        credit: r2(netPay),
        description: `Net wages payable — ${payslips.length} employee${payslips.length !== 1 ? 's' : ''}`,
      });
    }

    // ── Balance validation ────────────────────────────────────────────────────

    const totalDebits  = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredits = lines.reduce((s, l) => s + l.credit, 0);

    // Allow for floating-point: difference must be < 0.01
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
      .eq('source_type', 'payroll')
      .eq('source_id', payrollRun.id)
      .maybeSingle();

    if (existing?.id) {
      return { success: true, journalEntryId: existing.id };
    }

    // ── Insert journal entry header ───────────────────────────────────────────

    const reference = `PAYROLL-${payrollRun.id.slice(0, 8)}`;

    const { data: entry, error: entryErr } = await supabase
      .from('journal_entries')
      .insert({
        user_id: userId,
        date: payrollRun.pay_date,
        description: `Payroll for period ${payrollRun.period_start} to ${payrollRun.period_end}`,
        reference,
        source_type: 'payroll',
        source_id: payrollRun.id,
      })
      .select('id')
      .single();

    if (entryErr) throw entryErr;

    // ── Insert journal lines ──────────────────────────────────────────────────

    const lineRows = lines.map(({ accountId, debit, credit, description: desc }) => ({
      journal_entry_id: entry.id,
      account_id: accountId,
      debit,
      credit,
      description: desc,
    }));

    const { error: linesErr } = await supabase.from('journal_lines').insert(lineRows);
    if (linesErr) throw linesErr;

    return { success: true, journalEntryId: entry.id };
  } catch (err) {
    return { success: false, error: err?.message ?? String(err) };
  }
}
