/**
 * computeCorporationTax — pure, synchronous CT600 estimator.
 *
 * Phase 2: small profits rate (19%), main rate (25%), and HMRC marginal
 * relief (CTM03930) for augmented profits in the £50K–£250K band.
 *
 * Tax-adjusted profit (taxable total profits, N):
 *   taxAdjustedProfit = accountingProfit
 *                     + disallowableExpenses
 *                     - capitalAllowances
 *                     + otherAdjustments
 *
 * Augmented profits (A) for threshold testing and marginal relief:
 *   A = taxAdjustedProfit + augmentedProfitsAdjustment
 *
 * Pro-rated, associate-divided thresholds:
 *   U = 250000 × (accountingPeriodDays / 365) / (associatedCompaniesCount + 1)
 *   L =  50000 × (accountingPeriodDays / 365) / (associatedCompaniesCount + 1)
 *
 * Marginal relief (HMRC formula, MSCR = 3/200):
 *   MR = (U − A) × (N / A) × 3/200    (floored, never negative)
 *
 * Brackets (evaluated on floored integer-pounds augmented profits):
 *   A < 0            -> 'loss',          rate=0,  ct=0
 *   floor(A) <= L    -> 'small',         rate=19, ct=floor(N * 0.19)
 *   floor(A) >= U    -> 'main',          rate=25, ct=floor(N * 0.25)
 *   L < floor(A) < U -> 'marginal_zone', rate=25, ct=floor(A*0.25 − MR)
 */

export const CT_SMALL_PROFITS_THRESHOLD = 50000;
export const CT_MAIN_RATE_THRESHOLD = 250000;
export const CT_SMALL_PROFITS_RATE = 19;
export const CT_MAIN_RATE = 25;
export const CT_MSCR_NUMERATOR = 3;
export const CT_MSCR_DENOMINATOR = 200;

/**
 * Pure HMRC marginal relief calculation.
 *
 * @param {Object} input
 * @param {number} input.augmentedProfits   - A, must be > 0 when called
 * @param {number} input.taxableProfit      - N (taxable total profits)
 * @param {number} input.upperLimit         - U, pro-rated and associate-divided
 * @param {number} input.lowerLimit         - L, accepted for signature symmetry
 * @returns {number} floored, non-negative marginal relief in whole pounds
 */
// eslint-disable-next-line no-unused-vars
export function computeMarginalRelief({ augmentedProfits, taxableProfit, upperLimit, lowerLimit }) {
  const raw =
    ((upperLimit - augmentedProfits) * (taxableProfit / augmentedProfits) * CT_MSCR_NUMERATOR) /
    CT_MSCR_DENOMINATOR;
  return Math.max(0, Math.floor(raw));
}

export function computeCorporationTax({
  accountingProfit,
  disallowableExpenses,
  capitalAllowances,
  otherAdjustments,
  associatedCompaniesCount = 0,
  augmentedProfitsAdjustment = 0,
  accountingPeriodDays = 365,
  lossCarriedForwardIn = 0,
}) {
  if (disallowableExpenses < 0) {
    throw new TypeError("disallowableExpenses must be >= 0");
  }
  if (capitalAllowances < 0) {
    throw new TypeError("capitalAllowances must be >= 0");
  }
  if (associatedCompaniesCount < 0) {
    throw new TypeError("associatedCompaniesCount must be >= 0");
  }
  if (augmentedProfitsAdjustment < 0) {
    throw new TypeError("augmentedProfitsAdjustment must be >= 0");
  }
  if (accountingPeriodDays < 1 || accountingPeriodDays > 366) {
    throw new TypeError("accountingPeriodDays must be between 1 and 366");
  }
  if (lossCarriedForwardIn < 0) {
    throw new TypeError("lossCarriedForwardIn must be >= 0");
  }

  const taxAdjustedProfit =
    accountingProfit + disallowableExpenses - capitalAllowances + otherAdjustments;

  let lossUsed = 0;
  let lossUnused = lossCarriedForwardIn;
  let taxableAfterLoss = taxAdjustedProfit;
  if (taxAdjustedProfit > 0) {
    lossUsed = Math.min(lossCarriedForwardIn, taxAdjustedProfit);
    lossUnused = lossCarriedForwardIn - lossUsed;
    taxableAfterLoss = taxAdjustedProfit - lossUsed;
  }

  const augmentedProfits = taxableAfterLoss + augmentedProfitsAdjustment;

  if (augmentedProfits < 0) {
    return {
      taxAdjustedProfit,
      augmentedProfits,
      ctRateApplied: 0,
      ctEstimated: 0,
      marginalRelief: 0,
      rateBracket: "loss",
      lossUsed,
      lossUnused,
      warnings: [],
    };
  }

  const divisor = associatedCompaniesCount + 1;
  const proRate = accountingPeriodDays / 365;
  const upperLimit = (CT_MAIN_RATE_THRESHOLD * proRate) / divisor;
  const lowerLimit = (CT_SMALL_PROFITS_THRESHOLD * proRate) / divisor;

  const flooredAugmented = Math.floor(augmentedProfits);
  const warnings = [];
  let rateBracket;
  let ctRateApplied;
  let marginalRelief = 0;
  let ctEstimated;

  if (flooredAugmented <= lowerLimit) {
    rateBracket = "small";
    ctRateApplied = CT_SMALL_PROFITS_RATE;
    ctEstimated = Math.floor((taxableAfterLoss * ctRateApplied) / 100);
  } else if (flooredAugmented >= upperLimit) {
    rateBracket = "main";
    ctRateApplied = CT_MAIN_RATE;
    ctEstimated = Math.floor((taxableAfterLoss * ctRateApplied) / 100);
  } else {
    rateBracket = "marginal_zone";
    ctRateApplied = CT_MAIN_RATE;
    marginalRelief = computeMarginalRelief({
      augmentedProfits,
      taxableProfit: taxableAfterLoss,
      upperLimit,
      lowerLimit,
    });
    ctEstimated = Math.floor(augmentedProfits * 0.25 - marginalRelief);
    warnings.push(
      "Marginal relief calculated per HMRC CTM03930. Consult a qualified accountant " +
        "if you have associated companies or augmented profits adjustments.",
    );
  }

  return {
    taxAdjustedProfit,
    augmentedProfits,
    ctRateApplied,
    ctEstimated,
    marginalRelief,
    rateBracket,
    lossUsed,
    lossUnused,
    warnings,
  };
}
