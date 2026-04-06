/**
 * UK PAYE Calculation Engine
 *
 * Income Tax, National Insurance, Student Loan, and Pension calculations.
 * Pure JavaScript, no dependencies. Covers 2025/26 tax year rates.
 * HMRC compliance critical.
 *
 * All monetary values are in GBP (pounds sterling).
 * Rounding follows HMRC guidance unless otherwise noted.
 */

// ---------------------------------------------------------------------------
// Rounding helper
// ---------------------------------------------------------------------------

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// ---------------------------------------------------------------------------
// DEFAULT_TAX_TABLES — 2025/26 thresholds (overridable for future years)
// ---------------------------------------------------------------------------

export const DEFAULT_TAX_TABLES = {
  taxYear: '2025-26',
  personalAllowance: 12570,
  personalAllowanceTaper: 100000, // PA reduced by £1 for every £2 over this
  bands: {
    england: [
      { name: 'basic', rate: 0.20, from: 0, to: 37700 },
      { name: 'higher', rate: 0.40, from: 37700, to: 125140 },
      { name: 'additional', rate: 0.45, from: 125140, to: Infinity },
    ],
    scotland: [
      { name: 'starter', rate: 0.19, from: 0, to: 2827 },
      { name: 'basic', rate: 0.20, from: 2827, to: 14921 },
      { name: 'intermediate', rate: 0.21, from: 14921, to: 31092 },
      { name: 'higher', rate: 0.42, from: 31092, to: 62430 },
      { name: 'advanced', rate: 0.45, from: 62430, to: 112570 },
      { name: 'top', rate: 0.48, from: 112570, to: Infinity },
    ],
    wales: null, // Same as England for 2025/26
  },
  ni: {
    // Weekly thresholds for 2025/26
    weekly: { LEL: 125, PT: 242, ST: 96, UEL: 967, UST: 967 },
    monthly: { LEL: 542, PT: 1048, ST: 417, UEL: 4189, UST: 4189 },
    annual: { LEL: 6500, PT: 12570, ST: 5000, UEL: 50270, UST: 50270 },
    rates: {
      A: { employeePTtoUEL: 0.08, employeeAboveUEL: 0.02, employerAboveST: 0.15 },
      B: { employeePTtoUEL: 0.0585, employeeAboveUEL: 0.02, employerAboveST: 0.15 },
      C: { employeePTtoUEL: 0, employeeAboveUEL: 0, employerAboveST: 0.15 },
      F: { employeePTtoUEL: 0.08, employeeAboveUEL: 0.02, employerAboveST: 0 },
      H: { employeePTtoUEL: 0.08, employeeAboveUEL: 0.02, employerAboveST: 0 },
      J: { employeePTtoUEL: 0.02, employeeAboveUEL: 0.02, employerAboveST: 0.15 },
      M: { employeePTtoUEL: 0.08, employeeAboveUEL: 0.02, employerAboveST: 0 },
      Z: { employeePTtoUEL: 0.02, employeeAboveUEL: 0.02, employerAboveST: 0 },
    },
  },
  studentLoan: {
    plan1: { rate: 0.09, annualThreshold: 26065 },
    plan2: { rate: 0.09, annualThreshold: 28470 },
    plan4: { rate: 0.09, annualThreshold: 32745 },
    plan5: { rate: 0.09, annualThreshold: 25000 },
    postgrad: { rate: 0.06, annualThreshold: 21000 },
  },
  pension: {
    qualifyingEarningsLower: 6240,
    qualifyingEarningsUpper: 50270,
    defaultEmployeePct: 5,
    defaultEmployerPct: 3,
  },
  periodsPerYear: { weekly: 52, fortnightly: 26, monthly: 12 },
};

// ---------------------------------------------------------------------------
// parseTaxCode
// ---------------------------------------------------------------------------

/**
 * Parse a UK PAYE tax code into its components.
 *
 * Examples:
 *   '1257L'  -> { number: 1257, suffix: 'L', isK: false, isScottish: false, isWelsh: false,
 *                 isNonCumulative: false, isBR: false, isD0: false, isD1: false, isNT: false }
 *   'K500'   -> { number: 500, suffix: 'K', isK: true, ... }
 *   'S1257L' -> { ..., isScottish: true }
 *   'BR'     -> { isBR: true, ... }
 *   '1257L W1' or '1257L/1' -> { isNonCumulative: true, ... }
 *
 * @param {string} taxCode
 * @returns {object}
 */
export function parseTaxCode(taxCode) {
  let code = (taxCode || '').trim().toUpperCase();

  const result = {
    number: 0,
    suffix: '',
    isK: false,
    isScottish: false,
    isWelsh: false,
    isNonCumulative: false,
    isBR: false,
    isD0: false,
    isD1: false,
    isD2: false,
    isNT: false,
  };

  // Check for non-cumulative indicators: W1, M1, X, or /1
  if (/\s*(W1|M1|X|\/1)\s*$/i.test(code)) {
    result.isNonCumulative = true;
    code = code.replace(/\s*(W1|M1|X|\/1)\s*$/i, '').trim();
  }

  // Check for S (Scottish) or C (Welsh) prefix
  if (code.startsWith('S')) {
    result.isScottish = true;
    code = code.substring(1);
  } else if (code.startsWith('C')) {
    result.isWelsh = true;
    code = code.substring(1);
  }

  // Check special flat-rate codes
  if (code === 'BR') {
    result.isBR = true;
    return result;
  }
  if (code === 'D0') {
    result.isD0 = true;
    return result;
  }
  if (code === 'D1') {
    result.isD1 = true;
    return result;
  }
  if (code === 'D2') {
    result.isD2 = true;
    return result;
  }
  if (code === 'NT') {
    result.isNT = true;
    return result;
  }

  // Check for K code
  if (code.startsWith('K')) {
    result.isK = true;
    result.suffix = 'K';
    const numStr = code.substring(1).replace(/[^0-9]/g, '');
    result.number = parseInt(numStr, 10) || 0;
    return result;
  }

  // Standard code: numeric portion followed by suffix letter (L, M, N, T)
  const match = code.match(/^(\d+)([A-Z]?)$/);
  if (match) {
    result.number = parseInt(match[1], 10) || 0;
    result.suffix = match[2] || '';
  }

  return result;
}

// ---------------------------------------------------------------------------
// calculateTax
// ---------------------------------------------------------------------------

/**
 * Calculate PAYE income tax for a pay period using the cumulative basis.
 *
 * Cumulative method (default):
 *   1. Determine annual tax-free allowance from tax code: number * 10
 *      - K codes: negative allowance (added to taxable)
 *      - M suffix: allowance * 1.1 (marriage allowance)
 *      - BR/D0/D1/NT: special flat-rate handling
 *   2. Pro-rate allowance to this period: (annualAllowance / periodsPerYear) * periodNumber
 *   3. Cumulative taxable pay = gross_ytd + grossThisPeriod - cumulativeAllowance
 *      - K code: cumulative taxable = gross_ytd + grossThisPeriod + cumulativeKAddition
 *   4. Apply tax bands cumulatively (pro-rated to periodNumber)
 *   5. Tax this period = cumulativeTaxDue - taxAlreadyPaid(ytd)
 *
 * Non-cumulative (Week1/Month1):
 *   1. Same as above but periodNumber is always treated as 1
 *   2. Only this period's gross is used, no YTD accumulation
 *
 * @param {number} grossThisPeriod
 * @param {object} parsedTaxCode - from parseTaxCode()
 * @param {number} periodNumber - which period in the year (1-12 for monthly, 1-52 for weekly)
 * @param {string} payFrequency - 'weekly' | 'fortnightly' | 'monthly'
 * @param {{ grossYtd: number, taxYtd: number }} ytd - year-to-date figures BEFORE this period
 * @param {object} [taxTables=DEFAULT_TAX_TABLES]
 * @returns {{ taxDue: number, cumulativeTaxable: number, cumulativeTaxDue: number }}
 */
export function calculateTax(
  grossThisPeriod,
  parsedTaxCode,
  periodNumber,
  payFrequency,
  ytd = {},
  taxTables = DEFAULT_TAX_TABLES
) {
  const grossYtd = ytd.grossYtd || 0;
  const taxYtd = ytd.taxYtd || 0;
  const periodsPerYear = taxTables.periodsPerYear[payFrequency] || 12;

  // NT code: no tax
  if (parsedTaxCode.isNT) {
    return { taxDue: 0, cumulativeTaxable: 0, cumulativeTaxDue: 0 };
  }

  // Flat-rate codes: BR, D0, D1, D2
  if (parsedTaxCode.isBR) {
    const tax = round2(grossThisPeriod * 0.20);
    return { taxDue: tax, cumulativeTaxable: grossThisPeriod, cumulativeTaxDue: taxYtd + tax };
  }
  if (parsedTaxCode.isD0) {
    const tax = round2(grossThisPeriod * 0.40);
    return { taxDue: tax, cumulativeTaxable: grossThisPeriod, cumulativeTaxDue: taxYtd + tax };
  }
  if (parsedTaxCode.isD1) {
    const tax = round2(grossThisPeriod * 0.45);
    return { taxDue: tax, cumulativeTaxable: grossThisPeriod, cumulativeTaxDue: taxYtd + tax };
  }
  if (parsedTaxCode.isD2) {
    const tax = round2(grossThisPeriod * 0.48);
    return { taxDue: tax, cumulativeTaxable: grossThisPeriod, cumulativeTaxDue: taxYtd + tax };
  }

  // Determine effective period number and gross for cumulative vs non-cumulative
  let effectivePeriod = periodNumber;
  let cumulativeGross = grossYtd + grossThisPeriod;
  let effectiveTaxYtd = taxYtd;

  if (parsedTaxCode.isNonCumulative) {
    effectivePeriod = 1;
    cumulativeGross = grossThisPeriod;
    effectiveTaxYtd = 0;
  }

  // Determine annual allowance
  let annualAllowance = parsedTaxCode.number * 10;

  // Marriage allowance (M suffix): increase by 10%
  if (parsedTaxCode.suffix === 'M') {
    annualAllowance = annualAllowance * 1.1;
  }
  // N suffix: decrease by 10% (transferor of marriage allowance)
  if (parsedTaxCode.suffix === 'N') {
    annualAllowance = annualAllowance * 0.9;
  }

  // Calculate cumulative taxable pay
  let cumulativeTaxable;

  if (parsedTaxCode.isK) {
    // K code: add the K amount to taxable pay instead of subtracting an allowance
    const annualKAddition = parsedTaxCode.number * 10;
    const cumulativeKAddition = (annualKAddition / periodsPerYear) * effectivePeriod;
    cumulativeTaxable = cumulativeGross + cumulativeKAddition;
  } else {
    const cumulativeAllowance = (annualAllowance / periodsPerYear) * effectivePeriod;
    cumulativeTaxable = cumulativeGross - cumulativeAllowance;
  }

  // Taxable pay cannot be negative (but tax can be negative via refund)
  if (cumulativeTaxable < 0) {
    cumulativeTaxable = 0;
  }

  // Select tax bands
  let bands;
  if (parsedTaxCode.isScottish) {
    bands = taxTables.bands.scotland;
  } else if (parsedTaxCode.isWelsh && taxTables.bands.wales) {
    bands = taxTables.bands.wales;
  } else {
    bands = taxTables.bands.england;
  }

  // Apply tax bands cumulatively (pro-rated to effectivePeriod)
  let cumulativeTaxDue = 0;
  let remainingTaxable = cumulativeTaxable;

  for (const band of bands) {
    if (remainingTaxable <= 0) break;

    const proRatedFrom = (band.from / periodsPerYear) * effectivePeriod;
    const proRatedTo = band.to === Infinity
      ? Infinity
      : (band.to / periodsPerYear) * effectivePeriod;

    const bandWidth = proRatedTo === Infinity
      ? remainingTaxable
      : proRatedTo - proRatedFrom;

    const taxableInBand = Math.min(remainingTaxable, bandWidth);
    cumulativeTaxDue += taxableInBand * band.rate;
    remainingTaxable -= taxableInBand;
  }

  cumulativeTaxDue = round2(cumulativeTaxDue);

  // Tax this period
  let taxDue = round2(cumulativeTaxDue - effectiveTaxYtd);

  // K code regulatory cap: tax cannot exceed 50% of gross pay
  if (parsedTaxCode.isK) {
    const maxTax = round2(grossThisPeriod * 0.50);
    if (taxDue > maxTax) {
      taxDue = maxTax;
      cumulativeTaxDue = round2(effectiveTaxYtd + taxDue);
    }
  }

  return {
    taxDue,
    cumulativeTaxable: round2(cumulativeTaxable),
    cumulativeTaxDue,
  };
}

// ---------------------------------------------------------------------------
// calculateNI
// ---------------------------------------------------------------------------

/**
 * Calculate National Insurance contributions for a pay period.
 *
 * @param {number} grossPay - Gross pay for this period
 * @param {string} niCategory - NI category letter (A, B, C, F, H, J, M, Z)
 * @param {string} payFrequency - 'weekly' | 'fortnightly' | 'monthly'
 * @param {object} [taxTables=DEFAULT_TAX_TABLES]
 * @returns {{ niEmployee: number, niEmployer: number }}
 */
export function calculateNI(
  grossPay,
  niCategory = 'A',
  payFrequency = 'monthly',
  taxTables = DEFAULT_TAX_TABLES
) {
  const category = niCategory.toUpperCase();
  const rates = taxTables.ni.rates[category];

  if (!rates) {
    return { niEmployee: 0, niEmployer: 0 };
  }

  // Get period thresholds
  let thresholds;
  if (payFrequency === 'weekly') {
    thresholds = { ...taxTables.ni.weekly };
  } else if (payFrequency === 'fortnightly') {
    // Fortnightly: weekly thresholds * 2
    thresholds = {
      LEL: taxTables.ni.weekly.LEL * 2,
      PT: taxTables.ni.weekly.PT * 2,
      ST: taxTables.ni.weekly.ST * 2,
      UEL: taxTables.ni.weekly.UEL * 2,
    };
  } else {
    // Monthly
    thresholds = { ...taxTables.ni.monthly };
  }

  // Employee NI
  let niEmployee = 0;
  if (grossPay > thresholds.PT) {
    const earningsToUEL = Math.min(grossPay, thresholds.UEL) - thresholds.PT;
    niEmployee += Math.max(0, earningsToUEL) * rates.employeePTtoUEL;

    if (grossPay > thresholds.UEL) {
      niEmployee += (grossPay - thresholds.UEL) * rates.employeeAboveUEL;
    }
  }

  // Employer NI
  let niEmployer = 0;
  if (grossPay > thresholds.ST) {
    niEmployer = (grossPay - thresholds.ST) * rates.employerAboveST;
  }

  return {
    niEmployee: round2(niEmployee),
    niEmployer: round2(niEmployer),
  };
}

// ---------------------------------------------------------------------------
// calculateStudentLoan
// ---------------------------------------------------------------------------

/**
 * Calculate student loan repayment for a pay period.
 *
 * @param {number} grossPay
 * @param {string} planType - 'none' | 'plan1' | 'plan2' | 'plan4' | 'plan5' | 'postgrad'
 * @param {string} payFrequency
 * @param {object} [taxTables=DEFAULT_TAX_TABLES]
 * @returns {number}
 */
export function calculateStudentLoan(
  grossPay,
  planType = 'none',
  payFrequency = 'monthly',
  taxTables = DEFAULT_TAX_TABLES
) {
  if (!planType || planType === 'none') {
    return 0;
  }

  const plan = taxTables.studentLoan[planType];
  if (!plan) {
    return 0;
  }

  const periodsPerYear = taxTables.periodsPerYear[payFrequency] || 12;
  const periodThreshold = plan.annualThreshold / periodsPerYear;

  if (grossPay <= periodThreshold) {
    return 0;
  }

  // HMRC rounds student loan DOWN (floor to nearest penny)
  const repayment = (grossPay - periodThreshold) * plan.rate;
  return Math.floor(repayment * 100) / 100;
}

// ---------------------------------------------------------------------------
// calculatePension
// ---------------------------------------------------------------------------

/**
 * Calculate workplace pension contributions under auto-enrolment.
 *
 * Qualifying earnings = gross pay between lower and upper thresholds (pro-rated to period).
 * Employee contributes employeePct%, employer contributes employerPct%.
 *
 * @param {number} grossPay
 * @param {{ enrolled: boolean, employeePct: number, employerPct: number }} config
 * @param {string} payFrequency
 * @param {object} [taxTables=DEFAULT_TAX_TABLES]
 * @returns {{ pensionEmployee: number, pensionEmployer: number, qualifyingEarnings: number }}
 */
export function calculatePension(
  grossPay,
  config = {},
  payFrequency = 'monthly',
  taxTables = DEFAULT_TAX_TABLES
) {
  const enrolled = config.enrolled !== undefined ? config.enrolled : false;
  const employeePct = config.employeePct !== undefined
    ? config.employeePct
    : taxTables.pension.defaultEmployeePct;
  const employerPct = config.employerPct !== undefined
    ? config.employerPct
    : taxTables.pension.defaultEmployerPct;

  if (!enrolled) {
    return { pensionEmployee: 0, pensionEmployer: 0, qualifyingEarnings: 0 };
  }

  const periodsPerYear = taxTables.periodsPerYear[payFrequency] || 12;
  const periodLower = taxTables.pension.qualifyingEarningsLower / periodsPerYear;
  const periodUpper = taxTables.pension.qualifyingEarningsUpper / periodsPerYear;

  const qualifyingEarnings = Math.max(0, Math.min(grossPay, periodUpper) - periodLower);

  const pensionEmployee = round2(qualifyingEarnings * (employeePct / 100));
  const pensionEmployer = round2(qualifyingEarnings * (employerPct / 100));

  return {
    pensionEmployee,
    pensionEmployer,
    qualifyingEarnings: round2(qualifyingEarnings),
  };
}

// ---------------------------------------------------------------------------
// calculatePayslip — master orchestrator
// ---------------------------------------------------------------------------

/**
 * Master payslip calculation — orchestrates all components.
 *
 * @param {{
 *   taxCode: string,
 *   niCategory: string,
 *   studentLoanPlan: string,
 *   payFrequency: string,
 *   pensionEnrolled: boolean,
 *   pensionEmployeePct: number,
 *   pensionEmployerPct: number,
 * }} employee
 * @param {number} grossPay - Gross pay for this period
 * @param {{
 *   grossYtd: number,
 *   taxYtd: number,
 *   niYtd: number,
 *   pensionYtd: number,
 *   studentLoanYtd: number,
 * }} ytd - Year-to-date figures BEFORE this period
 * @param {number} periodNumber - Period within tax year (1-based)
 * @param {object} [taxTables=DEFAULT_TAX_TABLES]
 * @returns {{
 *   grossPay: number,
 *   taxablePayThisPeriod: number,
 *   taxDeducted: number,
 *   niEmployee: number,
 *   niEmployer: number,
 *   studentLoan: number,
 *   pensionEmployee: number,
 *   pensionEmployer: number,
 *   netPay: number,
 *   newYtd: { grossYtd: number, taxYtd: number, niYtd: number, pensionYtd: number, studentLoanYtd: number },
 * }}
 */
export function calculatePayslip(
  employee,
  grossPay,
  ytd = {},
  periodNumber = 1,
  taxTables = DEFAULT_TAX_TABLES
) {
  const safeYtd = {
    grossYtd: ytd.grossYtd || 0,
    taxYtd: ytd.taxYtd || 0,
    niYtd: ytd.niYtd || 0,
    pensionYtd: ytd.pensionYtd || 0,
    studentLoanYtd: ytd.studentLoanYtd || 0,
  };

  const payFrequency = employee.payFrequency || 'monthly';

  // 1. Parse tax code
  const parsed = parseTaxCode(employee.taxCode || '1257L');

  // 2. Calculate tax (cumulative)
  const taxResult = calculateTax(
    grossPay,
    parsed,
    periodNumber,
    payFrequency,
    { grossYtd: safeYtd.grossYtd, taxYtd: safeYtd.taxYtd },
    taxTables
  );

  // 3. Calculate NI
  const niResult = calculateNI(
    grossPay,
    employee.niCategory || 'A',
    payFrequency,
    taxTables
  );

  // 4. Calculate student loan
  const studentLoan = calculateStudentLoan(
    grossPay,
    employee.studentLoanPlan || 'none',
    payFrequency,
    taxTables
  );

  // 5. Calculate pension
  const pensionResult = calculatePension(
    grossPay,
    {
      enrolled: employee.pensionEnrolled || false,
      employeePct: employee.pensionEmployeePct !== undefined
        ? employee.pensionEmployeePct
        : taxTables.pension.defaultEmployeePct,
      employerPct: employee.pensionEmployerPct !== undefined
        ? employee.pensionEmployerPct
        : taxTables.pension.defaultEmployerPct,
    },
    payFrequency,
    taxTables
  );

  // 6. Net pay
  const netPay = round2(
    grossPay
    - taxResult.taxDue
    - niResult.niEmployee
    - studentLoan
    - pensionResult.pensionEmployee
  );

  // 7. Build new YTD
  const newYtd = {
    grossYtd: round2(safeYtd.grossYtd + grossPay),
    taxYtd: round2(safeYtd.taxYtd + taxResult.taxDue),
    niYtd: round2(safeYtd.niYtd + niResult.niEmployee),
    pensionYtd: round2(safeYtd.pensionYtd + pensionResult.pensionEmployee),
    studentLoanYtd: round2(safeYtd.studentLoanYtd + studentLoan),
  };

  return {
    grossPay,
    taxablePayThisPeriod: round2(taxResult.cumulativeTaxable - (safeYtd.grossYtd - (parsed.isNonCumulative ? safeYtd.grossYtd : 0))),
    taxDeducted: taxResult.taxDue,
    niEmployee: niResult.niEmployee,
    niEmployer: niResult.niEmployer,
    studentLoan,
    pensionEmployee: pensionResult.pensionEmployee,
    pensionEmployer: pensionResult.pensionEmployer,
    netPay,
    newYtd,
  };
}

// ---------------------------------------------------------------------------
// TEST CASES
// ---------------------------------------------------------------------------
/*
TEST CASES:

1. Standard monthly employee: 1257L, Cat A, monthly, £3000/month
   - Period 1: annual allowance 12570, monthly allowance 1047.50
   - Taxable: 3000 - 1047.50 = 1952.50
   - Tax: 1952.50 * 0.20 = 390.50
   - NI employee: (3000 - 1048) * 0.08 = 156.16
   - NI employer: (3000 - 417) * 0.15 = 387.45
   - Net (before pension): 3000 - 390.50 - 156.16 = 2453.34

2. K code: K500, Cat A, monthly, £2000/month
   - K addition: 500 * 10 = 5000 annual, 416.67/month
   - Taxable: 2000 + 416.67 = 2416.67
   - Tax: 2416.67 * 0.20 = 483.33
   - K code cap: cannot exceed 50% of gross = 1000. 483.33 < 1000, so OK.

3. BR code: all at 20%
   - £3000 gross -> tax = 600.00

4. Scottish S1257L: £4000/month
   - Uses Scottish bands with starter rate at 19%

5. Student loan plan 2: £3000/month
   - Monthly threshold: 28470/12 = 2372.50
   - Repayment: (3000 - 2372.50) * 0.09 = 56.48 (floor to 56.47)

6. Pension auto-enrolment: £3000/month, 5%/3%
   - Monthly lower: 6240/12 = 520
   - Monthly upper: 50270/12 = 4189.17
   - Qualifying: 3000 - 520 = 2480
   - Employee: 2480 * 0.05 = 124.00
   - Employer: 2480 * 0.03 = 74.40

7. Week1/Month1 (non-cumulative): 1257L M1, period 6
   - Treated as period 1, ignores YTD
   - Same result as period 1 calculation

8. Cumulative mid-year: period 6, prior YTD gross 15000, YTD tax 1200
   - Cumulative allowance: (12570/12) * 6 = 6285
   - Cumulative gross: 15000 + 3000 = 18000
   - Cumulative taxable: 18000 - 6285 = 11715
   - Cumulative tax due: 11715 * 0.20 = 2343
   - Tax this period: 2343 - 1200 = 1143

9. Higher rate taxpayer: 1257L, £10000/month, period 1
   - Allowance: 1047.50
   - Taxable: 8952.50
   - Basic (up to 37700/12 = 3141.67): 3141.67 * 0.20 = 628.33
   - Higher (remainder: 8952.50 - 3141.67 = 5810.83): 5810.83 * 0.40 = 2324.33
   - Total tax: 628.33 + 2324.33 = 2952.67

10. NI Category B (married women reduced rate):
    - Employee rate PT to UEL: 5.85% instead of 8%
    - Employer rate unchanged at 15%
*/
