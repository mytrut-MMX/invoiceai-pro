import { describe, it, expect } from "vitest";
import {
  computeCorporationTax,
  computeMarginalRelief,
  CT_SMALL_PROFITS_THRESHOLD,
  CT_MAIN_RATE_THRESHOLD,
  CT_SMALL_PROFITS_RATE,
  CT_MAIN_RATE,
  CT_MSCR_NUMERATOR,
  CT_MSCR_DENOMINATOR,
} from "../computeCorporationTax";

const noAdj = { disallowableExpenses: 0, capitalAllowances: 0, otherAdjustments: 0 };

describe("computeCorporationTax — constants", () => {
  it("exports the HMRC Phase 1 thresholds and rates", () => {
    expect(CT_SMALL_PROFITS_THRESHOLD).toBe(50000);
    expect(CT_MAIN_RATE_THRESHOLD).toBe(250000);
    expect(CT_SMALL_PROFITS_RATE).toBe(19);
    expect(CT_MAIN_RATE).toBe(25);
  });
});

describe("computeCorporationTax — loss bracket", () => {
  it("1. accounting loss with no adjustments returns loss bracket, ct=0", () => {
    const r = computeCorporationTax({ accountingProfit: -1000, ...noAdj });
    expect(r.rateBracket).toBe("loss");
    expect(r.ctRateApplied).toBe(0);
    expect(r.ctEstimated).toBe(0);
    expect(r.warnings).toEqual([]);
  });

  it("2. small profit tipped into loss by capital allowances", () => {
    const r = computeCorporationTax({
      accountingProfit: 100,
      disallowableExpenses: 0,
      capitalAllowances: 200,
      otherAdjustments: 0,
    });
    expect(r.rateBracket).toBe("loss");
    expect(r.taxAdjustedProfit).toBe(-100);
    expect(r.ctEstimated).toBe(0);
  });
});

describe("computeCorporationTax — small profits bracket (19%)", () => {
  it("3. zero profit falls in small bracket, ct=0", () => {
    const r = computeCorporationTax({ accountingProfit: 0, ...noAdj });
    expect(r.rateBracket).toBe("small");
    expect(r.ctRateApplied).toBe(19);
    expect(r.ctEstimated).toBe(0);
  });

  it("4. mid-small profit of 30,000 yields ct=5,700", () => {
    const r = computeCorporationTax({ accountingProfit: 30000, ...noAdj });
    expect(r.rateBracket).toBe("small");
    expect(r.ctEstimated).toBe(5700);
    expect(r.warnings).toEqual([]);
  });

  it("5. exact small-profits threshold (50,000) yields ct=9,500", () => {
    const r = computeCorporationTax({ accountingProfit: 50000, ...noAdj });
    expect(r.rateBracket).toBe("small");
    expect(r.ctEstimated).toBe(9500);
  });
});

describe("computeCorporationTax — marginal zone (£50,001–£249,999)", () => {
  it("6. £50,001 tips into marginal zone, rate=25, ct=9,501 with relief warning", () => {
    const r = computeCorporationTax({ accountingProfit: 50001, ...noAdj });
    expect(r.rateBracket).toBe("marginal_zone");
    expect(r.ctRateApplied).toBe(25);
    expect(r.ctEstimated).toBe(9501);
    expect(r.warnings.length).toBeGreaterThanOrEqual(1);
  });

  it("7. mid marginal zone (£150,000) yields ct=36,000 after relief", () => {
    const r = computeCorporationTax({ accountingProfit: 150000, ...noAdj });
    expect(r.rateBracket).toBe("marginal_zone");
    expect(r.ctEstimated).toBe(36000);
  });
});

describe("computeCorporationTax — main rate (25%)", () => {
  it("8. exact main-rate threshold (£250,000) yields ct=62,500", () => {
    const r = computeCorporationTax({ accountingProfit: 250000, ...noAdj });
    expect(r.rateBracket).toBe("main");
    expect(r.ctRateApplied).toBe(25);
    expect(r.ctEstimated).toBe(62500);
    expect(r.warnings).toEqual([]);
  });

  it("9. high profit (£1,000,000) yields ct=250,000", () => {
    const r = computeCorporationTax({ accountingProfit: 1000000, ...noAdj });
    expect(r.rateBracket).toBe("main");
    expect(r.ctEstimated).toBe(250000);
  });
});

describe("computeCorporationTax — adjustments affect bracket", () => {
  it("10. disallowable adds back and promotes to marginal zone", () => {
    const r = computeCorporationTax({
      accountingProfit: 40000,
      disallowableExpenses: 15000,
      capitalAllowances: 0,
      otherAdjustments: 0,
    });
    expect(r.taxAdjustedProfit).toBe(55000);
    expect(r.rateBracket).toBe("marginal_zone");
  });

  it("11. capital allowances demote to small bracket", () => {
    const r = computeCorporationTax({
      accountingProfit: 60000,
      disallowableExpenses: 0,
      capitalAllowances: 15000,
      otherAdjustments: 0,
    });
    expect(r.taxAdjustedProfit).toBe(45000);
    expect(r.rateBracket).toBe("small");
  });

  it("12. negative other adjustment demotes to small bracket", () => {
    const r = computeCorporationTax({
      accountingProfit: 50000,
      disallowableExpenses: 0,
      capitalAllowances: 0,
      otherAdjustments: -10000,
    });
    expect(r.taxAdjustedProfit).toBe(40000);
    expect(r.rateBracket).toBe("small");
  });

  it("13. all adjustments combined resolve to marginal zone", () => {
    const r = computeCorporationTax({
      accountingProfit: 80000,
      disallowableExpenses: 20000,
      capitalAllowances: 30000,
      otherAdjustments: -5000,
    });
    // 80,000 + 20,000 - 30,000 - 5,000 = 65,000
    expect(r.taxAdjustedProfit).toBe(65000);
    expect(r.rateBracket).toBe("marginal_zone");
  });
});

describe("computeCorporationTax — rounding and validation", () => {
  it("14. fractional profit rounds CT DOWN to the whole pound", () => {
    // 50,000.99 is below £50,001, so it falls in small bracket; HMRC
    // floors CT to pounds -> floor(50000.99 * 0.19) = 9,500.
    const r = computeCorporationTax({ accountingProfit: 50000.99, ...noAdj });
    expect(r.rateBracket).toBe("small");
    expect(r.ctEstimated).toBe(9500);
  });

  it("15. negative disallowable input throws TypeError", () => {
    expect(() =>
      computeCorporationTax({
        accountingProfit: 10000,
        disallowableExpenses: -100,
        capitalAllowances: 0,
        otherAdjustments: 0,
      }),
    ).toThrow(TypeError);
  });
});

describe("computeCorporationTax — marginal relief (HMRC CTM03930)", () => {
  it("exports MSCR fraction constants (3/200)", () => {
    expect(CT_MSCR_NUMERATOR).toBe(3);
    expect(CT_MSCR_DENOMINATOR).toBe(200);
  });

  it("16. HMRC worked example: £150,000 profit → relief=1,500, ct=36,000", () => {
    const r = computeCorporationTax({ accountingProfit: 150000, ...noAdj });
    expect(r.augmentedProfits).toBe(150000);
    expect(r.rateBracket).toBe("marginal_zone");
    expect(r.marginalRelief).toBe(1500);
    expect(r.ctEstimated).toBe(36000);
  });

  it("17. associatedCompaniesCount=1 halves thresholds; £80,000 is marginal", () => {
    const r = computeCorporationTax({
      accountingProfit: 80000,
      ...noAdj,
      associatedCompaniesCount: 1,
    });
    // U = 250000/2 = 125000, L = 50000/2 = 25000
    // MR = (125000 - 80000) * (80000/80000) * 3/200 = 45000 * 0.015 = 675
    // CT = floor(80000*0.25 - 675) = 20000 - 675 = 19325
    expect(r.rateBracket).toBe("marginal_zone");
    expect(r.marginalRelief).toBe(675);
    expect(r.ctEstimated).toBe(19325);
  });

  it("18. accountingPeriodDays=183 pro-rates thresholds; £60,000 is marginal", () => {
    const r = computeCorporationTax({
      accountingProfit: 60000,
      ...noAdj,
      accountingPeriodDays: 183,
    });
    // U ≈ 250000 * 183/365 ≈ 125342.47
    // L ≈  50000 * 183/365 ≈  25068.49
    // 60000 is between L and U → marginal
    // MR = (125342.47 - 60000) * 1 * 3/200 ≈ 980.137 → floor 980
    expect(r.rateBracket).toBe("marginal_zone");
    expect(r.marginalRelief).toBe(980);
  });

  it("19. augmentedProfitsAdjustment pushes £45,000 profit into marginal_zone", () => {
    const r = computeCorporationTax({
      accountingProfit: 45000,
      ...noAdj,
      augmentedProfitsAdjustment: 10000,
    });
    expect(r.taxAdjustedProfit).toBe(45000);
    expect(r.augmentedProfits).toBe(55000);
    expect(r.rateBracket).toBe("marginal_zone");
  });

  it("20. computeMarginalRelief clamps to 0 when formula would be negative", () => {
    const r = computeMarginalRelief({
      augmentedProfits: 300000,
      taxableProfit: 300000,
      upperLimit: 250000,
      lowerLimit: 50000,
    });
    expect(r).toBe(0);
  });

  it("21. negative associatedCompaniesCount throws TypeError", () => {
    expect(() =>
      computeCorporationTax({
        accountingProfit: 10000,
        ...noAdj,
        associatedCompaniesCount: -1,
      }),
    ).toThrow(TypeError);
  });

  it("22. accountingPeriodDays=0 throws TypeError", () => {
    expect(() =>
      computeCorporationTax({
        accountingProfit: 10000,
        ...noAdj,
        accountingPeriodDays: 0,
      }),
    ).toThrow(TypeError);
  });

  it("23. marginal_zone warning text reflects relief being applied", () => {
    const r = computeCorporationTax({ accountingProfit: 150000, ...noAdj });
    expect(r.warnings[0]).toBe(
      "Marginal relief applied. Consult an accountant for associated company complexity.",
    );
  });
});
