/**
 * HMRC Self Assessment category mapping for ITSA quarterly submissions.
 *
 * Maps InvoiceSaga EXPENSE_CATEGORIES codes to HMRC Self Assessment
 * self-employment supplementary page (SA103S) expense categories.
 *
 * HMRC SA103S self-employment expense boxes:
 *   cost_of_goods                 – Cost of goods bought for resale or goods used
 *   travel_motor                  – Car, van and travel expenses
 *   staff_costs                   – Wages, salaries and other staff costs
 *   premises_costs                – Rent, rates, power and insurance costs
 *   repairs_maintenance           – Repairs and maintenance of property and equipment
 *   admin_office                  – Phone, fax, stationery and other office costs
 *   advertising_entertainment     – Advertising and business entertainment costs
 *   interest                      – Interest on bank and other loans
 *   financial_charges             – Bank, credit card and other financial charges
 *   irrecoverable_debts           – Irrecoverable debts written off
 *   professional_fees             – Accountancy, legal and other professional fees
 *   depreciation                  – Depreciation and loss/profit on sale of assets
 *   other_expenses                – Other business expenses
 *   capital_allowances            – Capital allowances
 */

// ---------------------------------------------------------------------------
// Code → HMRC SA category mapping
// ---------------------------------------------------------------------------

/**
 * Maps InvoiceSaga expense category codes to HMRC SA category keys.
 * Keys match the hmrc_sa_code values added to EXPENSE_CATEGORIES in constants.
 */
export const SA_CATEGORY_MAP = {
  '100': 'advertising_entertainment',    // Advertising
  '110': 'travel_motor',                 // Automobile
  '261': 'travel_motor',                 // Meals & Subsistence
  '300': 'capital_allowances',           // Equipment
  '315': 'staff_costs',                  // Subcontractor Labour
  '316': 'cost_of_goods',               // Subcontractor Materials
  '404': 'financial_charges',            // Bank Charges
  '420': 'advertising_entertainment',    // Client Entertainment
  '430': 'travel_motor',                 // Fuel
  '440': 'premises_costs',              // Insurance
  '460': 'admin_office',                // IT & Software
  '480': 'admin_office',                // Office Supplies
  '490': 'admin_office',                // Postage & Courier
  '500': 'professional_fees',           // Professional Services
  '510': 'premises_costs',              // Rent & Rates
  '520': 'repairs_maintenance',         // Repairs & Maintenance
  '530': 'admin_office',                // Stationery
  '540': 'admin_office',                // Subscriptions
  '550': 'travel_motor',                // Travel
  '560': 'premises_costs',              // Utilities
  '570': 'staff_costs',                 // Wages & Salaries
  '999': 'other_expenses',              // Other
};

// ---------------------------------------------------------------------------
// Human-readable labels for each HMRC SA category
// ---------------------------------------------------------------------------

export const SA_CATEGORY_LABELS = {
  cost_of_goods:               'Cost of goods bought for resale or goods used',
  travel_motor:                'Car, van and travel expenses',
  staff_costs:                 'Wages, salaries and other staff costs',
  premises_costs:              'Rent, rates, power and insurance costs',
  repairs_maintenance:         'Repairs and maintenance of property and equipment',
  admin_office:                'Phone, fax, stationery and other office costs',
  advertising_entertainment:   'Advertising and business entertainment costs',
  interest:                    'Interest on bank and other loans',
  financial_charges:           'Bank, credit card and other financial charges',
  irrecoverable_debts:         'Irrecoverable debts written off',
  professional_fees:           'Accountancy, legal and other professional fees',
  depreciation:                'Depreciation and loss/profit on sale of assets',
  other_expenses:              'Other business expenses',
  capital_allowances:          'Capital allowances',
};

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Map a single expense to its HMRC Self Assessment category.
 *
 * Looks up the category by expense code (from the EXPENSE_CATEGORIES constant),
 * falling back to the expense's hmrc_sa_category or hmrc_sa_code field if set,
 * and ultimately to 'other_expenses'.
 *
 * @param {{ category_code?: string, code?: string, hmrc_sa_category?: string, hmrc_sa_code?: string, category?: string }} expense
 * @returns {{ hmrcCode: string, hmrcLabel: string }}
 */
export function mapExpenseToHMRC(expense) {
  // Try direct code lookup first
  const code = expense.category_code || expense.code || '';
  let hmrcCode = SA_CATEGORY_MAP[code];

  // Fallback: check if expense already has an HMRC mapping
  if (!hmrcCode) {
    hmrcCode = expense.hmrc_sa_category || expense.hmrc_sa_code || '';
  }

  // Validate the code exists in our labels, otherwise default
  if (!hmrcCode || !SA_CATEGORY_LABELS[hmrcCode]) {
    hmrcCode = 'other_expenses';
  }

  return {
    hmrcCode,
    hmrcLabel: SA_CATEGORY_LABELS[hmrcCode],
  };
}

/**
 * Aggregate an array of expenses by their HMRC Self Assessment category.
 *
 * @param {Array<{ amount?: number, category_code?: string, code?: string, hmrc_sa_category?: string }>} expenses
 * @returns {Record<string, number>}  e.g. { travel_motor: 1234.56, admin_office: 789.00 }
 */
export function aggregateByHMRCCategory(expenses) {
  const totals = {};

  for (const exp of expenses) {
    const { hmrcCode } = mapExpenseToHMRC(exp);
    const amount = Number(exp.amount || 0);
    totals[hmrcCode] = (totals[hmrcCode] || 0) + amount;
  }

  // Round each total to 2dp
  for (const key of Object.keys(totals)) {
    totals[key] = Math.round((totals[key] + Number.EPSILON) * 100) / 100;
  }

  return totals;
}
