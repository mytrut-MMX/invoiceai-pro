/**
 * computeCorporationTax — pure, synchronous CT600 estimator.
 *
 * Phase 1 MVP scope: small profits rate (19%) + main rate (25%) only.
 * NO marginal relief, NO loss relief, NO R&D, NO groups.
 *
 * Tax-adjusted profit:
 *   taxAdjustedProfit = accountingProfit
 *                     + disallowableExpenses
 *                     - capitalAllowances
 *                     + otherAdjustments
 *
 * Brackets (evaluated on floored integer-pounds tax-adjusted profit, to
 * match HMRC's pound-unit semantics):
 *   tax-adjusted < 0              -> bracket='loss', rate=0,  ct=0
 *   tax-adjusted <= 50,000        -> bracket='small', rate=19, ct=profit*0.19
 *   50,001..249,999               -> bracket='marginal_zone', rate=25,
 *                                    ct=profit*0.25, warning emitted
 *   tax-adjusted >= 250,000       -> bracket='main', rate=25, ct=profit*0.25
 *
 * Final ctEstimated is rounded DOWN to whole pounds (HMRC convention).
 *
 * @param {Object} input
 * @param {number} input.accountingProfit    - may be negative (loss)
 * @param {number} input.disallowableExpenses - MUST be >= 0 (DB CHECK)
 * @param {number} input.capitalAllowances    - MUST be >= 0 (DB CHECK)
 * @param {number} input.otherAdjustments     - any sign
 * @throws {TypeError} if disallowableExpenses < 0 or capitalAllowances < 0
 * @returns {{
 *   taxAdjustedProfit: number,
 *   ctRateApplied: number,
 *   ctEstimated: number,
 *   rateBracket: 'loss'|'small'|'marginal_zone'|'main',
 *   warnings: string[]
 * }}
 */

export const CT_SMALL_PROFITS_THRESHOLD = 50000;
export const CT_MAIN_RATE_THRESHOLD = 250000;
export const CT_SMALL_PROFITS_RATE = 19;
export const CT_MAIN_RATE = 25;

export function computeCorporationTax({
  accountingProfit,
  disallowableExpenses,
  capitalAllowances,
  otherAdjustments,
}) {
  if (disallowableExpenses < 0) {
    throw new TypeError("disallowableExpenses must be >= 0");
  }
  if (capitalAllowances < 0) {
    throw new TypeError("capitalAllowances must be >= 0");
  }

  const taxAdjustedProfit =
    accountingProfit + disallowableExpenses - capitalAllowances + otherAdjustments;

  if (taxAdjustedProfit < 0) {
    return {
      taxAdjustedProfit,
      ctRateApplied: 0,
      ctEstimated: 0,
      rateBracket: "loss",
      warnings: [],
    };
  }

  // HMRC works in integer pounds — floor before bracket classification so
  // a fractional tax-adjusted profit like £50,000.99 falls in the small
  // bracket (it would be reported to HMRC as £50,000).
  const flooredProfit = Math.floor(taxAdjustedProfit);
  const warnings = [];
  let rateBracket;
  let ctRateApplied;

  if (flooredProfit <= CT_SMALL_PROFITS_THRESHOLD) {
    rateBracket = "small";
    ctRateApplied = CT_SMALL_PROFITS_RATE;
  } else if (flooredProfit >= CT_MAIN_RATE_THRESHOLD) {
    rateBracket = "main";
    ctRateApplied = CT_MAIN_RATE;
  } else {
    rateBracket = "marginal_zone";
    ctRateApplied = CT_MAIN_RATE;
    warnings.push(
      "Marginal relief is not calculated in Phase 1. CT estimated at the " +
        "full main rate (25%); your actual liability may be lower.",
    );
  }

  const ctEstimated = Math.floor((taxAdjustedProfit * ctRateApplied) / 100);

  return {
    taxAdjustedProfit,
    ctRateApplied,
    ctEstimated,
    rateBracket,
    warnings,
  };
}
