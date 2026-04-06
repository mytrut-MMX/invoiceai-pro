import { supabase, supabaseReady } from '../../lib/supabase.js';
import { calculatePayslip } from './payeCalculator.js';
import { fetchUserAccounts } from '../ledger/fetchUserAccounts.js';
import { postPayrollEntry } from '../ledger/postPayrollEntry.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Derive UK tax year string from a date.
 * UK tax year runs 6 April to 5 April.
 * e.g. 2026-08-15 → '2026-27', 2027-03-01 → '2026-27'
 *
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {string} e.g. '2026-27'
 */
function deriveTaxYear(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const startYear = (month > 4 || (month === 4 && day >= 6)) ? year : year - 1;
  return `${startYear}-${String(startYear + 1).slice(2)}`;
}

/**
 * Derive the tax month (1-12) from a date.
 * Month 1 = April (6th to 5th of next month).
 *
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {number} 1-12
 */
function deriveTaxMonth(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const month = d.getMonth() + 1; // 1-12
  const day = d.getDate();
  // On or after 6th: this calendar month's tax month
  // Before 6th: previous calendar month's tax month
  const calMonth = day >= 6 ? month : (month === 1 ? 12 : month - 1);
  // April=1, May=2, ..., March=12
  return calMonth >= 4 ? calMonth - 3 : calMonth + 9;
}

/**
 * Derive the tax week (1-52) from a date for weekly payroll.
 *
 * @param {string} dateStr - YYYY-MM-DD
 * @param {string} taxYear - e.g. '2026-27'
 * @returns {number} 1-52
 */
function deriveTaxWeek(dateStr, taxYear) {
  const startYear = parseInt(taxYear.split('-')[0], 10);
  const taxYearStart = new Date(`${startYear}-04-06T00:00:00`);
  const d = new Date(dateStr + 'T00:00:00');
  const diffMs = d - taxYearStart;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.min(52, Math.max(1, Math.floor(diffDays / 7) + 1));
}

/**
 * Compute gross pay for one period from the employee's salary config.
 *
 * @param {{ salary_type: string, salary_amount: number, pay_frequency: string }} emp
 * @returns {number}
 */
function computeGrossPay(emp) {
  const amount = Number(emp.salary_amount || 0);
  if (emp.salary_type === 'annual') {
    const divisor = emp.pay_frequency === 'weekly' ? 52
                  : emp.pay_frequency === 'fortnightly' ? 26
                  : 12;
    return round2(amount / divisor);
  }
  // Hourly — default to standard hours if none specified
  // For hourly employees, the caller should provide hours; this is a fallback
  // using contractual hours (37.5/week standard UK full-time)
  const weeklyHours = 37.5;
  if (emp.pay_frequency === 'weekly') return round2(amount * weeklyHours);
  if (emp.pay_frequency === 'fortnightly') return round2(amount * weeklyHours * 2);
  return round2(amount * weeklyHours * 52 / 12); // monthly
}

/**
 * Map a DB employee row (snake_case) to the shape calculatePayslip expects (camelCase).
 */
function mapEmployeeForCalc(emp) {
  return {
    taxCode: emp.tax_code,
    niCategory: emp.ni_category,
    studentLoanPlan: emp.student_loan_plan,
    payFrequency: emp.pay_frequency,
    pensionEnrolled: emp.pension_enrolled,
    pensionEmployeePct: Number(emp.pension_employee_pct),
    pensionEmployerPct: Number(emp.pension_employer_pct),
  };
}

/**
 * Map a DB payroll_ytd row to the shape calculatePayslip expects.
 */
function mapYtdForCalc(ytdRow) {
  if (!ytdRow) {
    return { grossYtd: 0, taxYtd: 0, niYtd: 0, pensionYtd: 0, studentLoanYtd: 0 };
  }
  return {
    grossYtd: Number(ytdRow.gross_ytd || 0),
    taxYtd: Number(ytdRow.tax_ytd || 0),
    niYtd: Number(ytdRow.ni_ytd || 0),
    pensionYtd: Number(ytdRow.pension_ytd || 0),
    studentLoanYtd: Number(ytdRow.student_loan_ytd || 0),
  };
}

// ---------------------------------------------------------------------------
// createPayrollRun
// ---------------------------------------------------------------------------

/**
 * Create a draft payroll run for a given period.
 *
 * Fetches all active employees, computes each payslip using the PAYE calculator,
 * then inserts a payroll_runs record and one payslips record per employee.
 *
 * @param {string} userId      - auth.users.id
 * @param {string} periodStart - YYYY-MM-DD
 * @param {string} periodEnd   - YYYY-MM-DD
 * @param {string} payDate     - YYYY-MM-DD
 * @returns {Promise<{ run?: object, payslips?: Array, employees?: Array, error?: string }>}
 */
export async function createPayrollRun(userId, periodStart, periodEnd, payDate) {
  if (!supabaseReady) return { error: 'Supabase not configured' };

  try {
    // ── Validate inputs ─────────────────────────────────────────────────────

    if (!periodStart || !periodEnd || !payDate) {
      return { error: 'periodStart, periodEnd, and payDate are all required' };
    }
    if (periodEnd <= periodStart) {
      return { error: 'periodEnd must be after periodStart' };
    }

    // ── Check for duplicate run ─────────────────────────────────────────────

    const { data: existingRuns, error: dupErr } = await supabase
      .from('payroll_runs')
      .select('id')
      .eq('user_id', userId)
      .eq('period_start', periodStart)
      .eq('period_end', periodEnd)
      .limit(1);

    if (dupErr) throw dupErr;
    if (existingRuns && existingRuns.length > 0) {
      return { error: `A payroll run already exists for period ${periodStart} to ${periodEnd}` };
    }

    // ── Fetch active employees ──────────────────────────────────────────────

    const { data: employees, error: empErr } = await supabase
      .from('employees')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .or(`leave_date.is.null,leave_date.gt.${periodEnd}`)
      .order('last_name', { ascending: true });

    if (empErr) throw empErr;
    if (!employees || employees.length === 0) {
      return { error: 'No active employees to process' };
    }

    // ── Derive tax period ───────────────────────────────────────────────────

    const taxYear = deriveTaxYear(payDate);
    const taxMonth = deriveTaxMonth(payDate);
    const taxWeek = deriveTaxWeek(payDate, taxYear);

    // ── Fetch YTD records for all employees ─────────────────────────────────

    const empIds = employees.map(e => e.id);

    const { data: ytdRows, error: ytdErr } = await supabase
      .from('payroll_ytd')
      .select('*')
      .eq('tax_year', taxYear)
      .in('employee_id', empIds);

    if (ytdErr) throw ytdErr;

    // Index by employee_id for fast lookup
    const ytdByEmployee = {};
    for (const row of (ytdRows || [])) {
      ytdByEmployee[row.employee_id] = row;
    }

    // ── Calculate payslips ──────────────────────────────────────────────────

    const calculatedPayslips = [];
    let totalGross = 0, totalTax = 0;
    let totalNiEmployee = 0, totalNiEmployer = 0;
    let totalPensionEmployee = 0, totalPensionEmployer = 0;
    let totalStudentLoan = 0, totalNet = 0;

    for (const emp of employees) {
      const grossPay = computeGrossPay(emp);
      const ytdData = mapYtdForCalc(ytdByEmployee[emp.id]);
      const empForCalc = mapEmployeeForCalc(emp);

      const result = calculatePayslip(empForCalc, grossPay, ytdData, taxMonth);

      calculatedPayslips.push({
        employee: emp,
        grossPay: result.grossPay,
        taxablePayThisPeriod: result.taxablePayThisPeriod,
        taxDeducted: result.taxDeducted,
        niEmployee: result.niEmployee,
        niEmployer: result.niEmployer,
        pensionEmployee: result.pensionEmployee,
        pensionEmployer: result.pensionEmployer,
        studentLoan: result.studentLoan,
        netPay: result.netPay,
        newYtd: result.newYtd,
      });

      totalGross += result.grossPay;
      totalTax += result.taxDeducted;
      totalNiEmployee += result.niEmployee;
      totalNiEmployer += result.niEmployer;
      totalPensionEmployee += result.pensionEmployee;
      totalPensionEmployer += result.pensionEmployer;
      totalStudentLoan += result.studentLoan;
      totalNet += result.netPay;
    }

    // ── Insert payroll run ──────────────────────────────────────────────────

    const { data: run, error: runErr } = await supabase
      .from('payroll_runs')
      .insert({
        user_id: userId,
        tax_year: taxYear,
        tax_month: taxMonth,
        tax_week: taxWeek,
        period_start: periodStart,
        period_end: periodEnd,
        pay_date: payDate,
        status: 'draft',
        total_gross: round2(totalGross),
        total_tax: round2(totalTax),
        total_ni_employee: round2(totalNiEmployee),
        total_ni_employer: round2(totalNiEmployer),
        total_pension_employee: round2(totalPensionEmployee),
        total_pension_employer: round2(totalPensionEmployer),
        total_student_loan: round2(totalStudentLoan),
        total_net: round2(totalNet),
      })
      .select()
      .single();

    if (runErr) throw runErr;

    // ── Insert payslips ─────────────────────────────────────────────────────

    const payslipRows = calculatedPayslips.map(p => ({
      payroll_run_id: run.id,
      employee_id: p.employee.id,
      hours_worked: p.employee.salary_type === 'hourly'
        ? (p.employee.pay_frequency === 'weekly' ? 37.5
          : p.employee.pay_frequency === 'fortnightly' ? 75
          : 162.5)
        : null,
      gross_pay: p.grossPay,
      taxable_pay: p.taxablePayThisPeriod,
      tax_deducted: p.taxDeducted,
      ni_employee: p.niEmployee,
      ni_employer: p.niEmployer,
      pension_employee: p.pensionEmployee,
      pension_employer: p.pensionEmployer,
      student_loan: p.studentLoan,
      other_deductions: 0,
      other_additions: 0,
      net_pay: p.netPay,
      gross_ytd: p.newYtd.grossYtd,
      tax_ytd: p.newYtd.taxYtd,
      ni_ytd: p.newYtd.niYtd,
    }));

    const { data: payslips, error: slipErr } = await supabase
      .from('payslips')
      .insert(payslipRows)
      .select();

    if (slipErr) {
      // Roll back: delete the run (CASCADE will clean up any partial payslips)
      await supabase.from('payroll_runs').delete().eq('id', run.id);
      throw slipErr;
    }

    return { run, payslips, employees };
  } catch (err) {
    return { error: err?.message ?? String(err) };
  }
}

// ---------------------------------------------------------------------------
// approvePayrollRun
// ---------------------------------------------------------------------------

/**
 * Approve a draft payroll run: validates data integrity, updates YTD records
 * for each employee, and sets the run status to 'approved'.
 *
 * Does NOT post ledger entries or submit to HMRC — those are separate steps.
 *
 * @param {string} runId - payroll_runs.id
 * @returns {Promise<{ success?: boolean, run?: object, error?: string }>}
 */
export async function approvePayrollRun(runId) {
  if (!supabaseReady) return { error: 'Supabase not configured' };

  try {
    // ── Fetch run ───────────────────────────────────────────────────────────

    const { data: run, error: runErr } = await supabase
      .from('payroll_runs')
      .select('*')
      .eq('id', runId)
      .single();

    if (runErr) throw runErr;
    if (!run) return { error: 'Payroll run not found' };
    if (run.status !== 'draft') {
      return { error: `Cannot approve run with status '${run.status}' — must be 'draft'` };
    }

    // ── Fetch payslips ──────────────────────────────────────────────────────

    const { data: payslips, error: slipErr } = await supabase
      .from('payslips')
      .select('*')
      .eq('payroll_run_id', runId);

    if (slipErr) throw slipErr;
    if (!payslips || payslips.length === 0) {
      return { error: 'No payslips found for this run' };
    }

    // ── Validate payslips ───────────────────────────────────────────────────

    for (const slip of payslips) {
      if (slip.gross_pay == null || slip.net_pay == null) {
        return { error: `Payslip ${slip.id} has null gross_pay or net_pay` };
      }
    }

    // ── Data integrity: total_net must match sum of payslip net_pay ────────

    const sumNet = round2(payslips.reduce((s, p) => s + Number(p.net_pay), 0));
    const runNet = round2(Number(run.total_net || 0));

    if (Math.abs(sumNet - runNet) >= 0.01) {
      return {
        error: `Data integrity failure: run total_net (${runNet}) does not match sum of payslip net_pay (${sumNet})`,
      };
    }

    // ── Update YTD for each employee ────────────────────────────────────────

    for (const slip of payslips) {
      // Fetch current YTD
      const { data: existingYtd } = await supabase
        .from('payroll_ytd')
        .select('*')
        .eq('employee_id', slip.employee_id)
        .eq('tax_year', run.tax_year)
        .maybeSingle();

      const currentGross      = Number(existingYtd?.gross_ytd || 0);
      const currentTax        = Number(existingYtd?.tax_ytd || 0);
      const currentNi         = Number(existingYtd?.ni_ytd || 0);
      const currentPension    = Number(existingYtd?.pension_ytd || 0);
      const currentStudentLoan = Number(existingYtd?.student_loan_ytd || 0);

      const newYtd = {
        employee_id: slip.employee_id,
        tax_year: run.tax_year,
        gross_ytd: round2(currentGross + Number(slip.gross_pay)),
        tax_ytd: round2(currentTax + Number(slip.tax_deducted)),
        ni_ytd: round2(currentNi + Number(slip.ni_employee)),
        pension_ytd: round2(currentPension + Number(slip.pension_employee)),
        student_loan_ytd: round2(currentStudentLoan + Number(slip.student_loan)),
        updated_at: new Date().toISOString(),
      };

      const { error: ytdErr } = await supabase
        .from('payroll_ytd')
        .upsert(newYtd, { onConflict: 'employee_id,tax_year' });

      if (ytdErr) throw ytdErr;
    }

    // ── Update run status ───────────────────────────────────────────────────

    const { data: updatedRun, error: updateErr } = await supabase
      .from('payroll_runs')
      .update({ status: 'approved' })
      .eq('id', runId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return { success: true, run: updatedRun };
  } catch (err) {
    return { error: err?.message ?? String(err) };
  }
}

// ---------------------------------------------------------------------------
// submitPayrollRun
// ---------------------------------------------------------------------------

/**
 * Submit an approved payroll run: posts the double-entry journal to the ledger,
 * creates a bill to HMRC for the PAYE/NIC liability, and marks the run as submitted.
 *
 * @param {string} runId - payroll_runs.id (must have status 'approved')
 * @returns {Promise<{ success?: boolean, run?: object, journalEntryId?: string, billId?: string, error?: string }>}
 */
export async function submitPayrollRun(runId) {
  if (!supabaseReady) return { error: 'Supabase not configured' };

  try {
    // ── Fetch run ───────────────────────────────────────────────────────────

    const { data: run, error: runErr } = await supabase
      .from('payroll_runs')
      .select('*')
      .eq('id', runId)
      .single();

    if (runErr) throw runErr;
    if (!run) return { error: 'Payroll run not found' };
    if (run.status !== 'approved') {
      return { error: `Cannot submit run with status '${run.status}' — must be 'approved'` };
    }

    // ── Fetch payslips ──────────────────────────────────────────────────────

    const { data: payslips, error: slipErr } = await supabase
      .from('payslips')
      .select('*')
      .eq('payroll_run_id', runId);

    if (slipErr) throw slipErr;
    if (!payslips || payslips.length === 0) {
      return { error: 'No payslips found for this run' };
    }

    // ── Post to ledger ──────────────────────────────────────────────────────

    const { accounts, userId } = await fetchUserAccounts();
    if (!userId) return { error: 'Not authenticated' };
    if (!accounts || accounts.length === 0) {
      return { error: 'No chart of accounts found — cannot post journal' };
    }

    const ledgerResult = await postPayrollEntry(run, payslips, accounts, userId);

    if (!ledgerResult.success) {
      return { error: `Ledger posting failed: ${ledgerResult.error}` };
    }

    // ── Create HMRC PAYE bill ───────────────────────────────────────────────

    const payeLiability = round2(
      Number(run.total_tax || 0)
      + Number(run.total_ni_employee || 0)
      + Number(run.total_ni_employer || 0)
      + Number(run.total_student_loan || 0)
    );

    const payeDueDate = calculatePAYEDueDate(run.pay_date);

    const billRow = {
      user_id: run.user_id,
      bill_number: `PAYE-${run.tax_year}-${String(run.tax_month).padStart(2, '0')}`,
      supplier_name: 'HMRC',
      bill_date: run.pay_date,
      due_date: payeDueDate,
      category: 'Tax & Government',
      description: `PAYE/NIC liability for ${run.period_start} to ${run.period_end}`,
      reference: run.id,
      amount: payeLiability,
      tax_rate: 0,
      tax_amount: 0,
      total: payeLiability,
      status: 'Draft',
    };

    const { data: bill, error: billErr } = await supabase
      .from('bills')
      .insert(billRow)
      .select('id')
      .single();

    if (billErr) throw billErr;

    // ── Update run status to 'submitted' ────────────────────────────────────

    const { data: updatedRun, error: updateErr } = await supabase
      .from('payroll_runs')
      .update({ status: 'submitted' })
      .eq('id', runId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return {
      success: true,
      run: updatedRun,
      journalEntryId: ledgerResult.journalEntryId,
      billId: bill.id,
    };
  } catch (err) {
    return { error: err?.message ?? String(err) };
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Calculate the PAYE payment due date for a given pay date.
 *
 * UK PAYE rules:
 *   - PAYE/NIC collected in a tax month is due by the 22nd of the following month
 *     (for electronic payments; 19th for cheque — we assume electronic).
 *   - Tax months run from the 6th to the 5th of the next calendar month.
 *     e.g. Tax month 1 = 6 April to 5 May; payment due 22 June.
 *
 * Logic:
 *   - If pay_date is on or after the 6th → belongs to this calendar month's tax month
 *     → PAYE due 22nd of NEXT calendar month
 *   - If pay_date is before the 6th → belongs to the PREVIOUS calendar month's tax month
 *     → PAYE due 22nd of THIS calendar month
 *
 * @param {string} payDate - YYYY-MM-DD
 * @returns {string} YYYY-MM-DD due date
 */
function calculatePAYEDueDate(payDate) {
  const d = new Date(payDate + 'T00:00:00');
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-based
  const day = d.getDate();

  let dueYear, dueMonth;

  if (day >= 6) {
    // Pay date is on/after the 6th: tax month = this calendar month
    // Due date = 22nd of the NEXT calendar month
    dueMonth = month + 1;
    dueYear = year;
    if (dueMonth > 11) {
      dueMonth = 0;
      dueYear = year + 1;
    }
  } else {
    // Pay date is before the 6th: tax month = previous calendar month
    // Due date = 22nd of THIS calendar month
    dueMonth = month;
    dueYear = year;
  }

  const mm = String(dueMonth + 1).padStart(2, '0'); // back to 1-based
  return `${dueYear}-${mm}-22`;
}
