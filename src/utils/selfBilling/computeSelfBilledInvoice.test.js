import { describe, it, expect } from 'vitest';
import { computeSelfBilledInvoice } from './computeSelfBilledInvoice.js';

const baseInput = () => ({
  lineItems: [{ description: 'labour', quantity: 1, rate: 1000, taxType: 'standard', taxRate: 20, cisApplicable: true }],
  supplierVatStatus: 'valid',
  supplierCisRate: null,
  supplierCisLabourOnly: false,
  supplyDate: '2026-01-10',
  issueDate: '2026-01-15',
  applyReverseCharge: false,
  ourVatRegistered: true,
});

describe('computeSelfBilledInvoice', () => {
  it('VAT-registered supplier, single line 20% standard', () => {
    const r = computeSelfBilledInvoice(baseInput());
    expect(r.vatIncluded).toBe(true);
    expect(r.netAmount).toBe(1000);
    expect(r.taxAmount).toBe(200);
    expect(r.totalAmount).toBe(1200);
    expect(r.errors).toEqual([]);
    expect(r.breakdown).toEqual([{ rate: 20, taxableAmount: 1000, taxAmount: 200 }]);
  });

  it('mixed rates (20% + 5% + 0%) produces 3 breakdown rows', () => {
    const input = {
      ...baseInput(),
      lineItems: [
        { description: 'a', quantity: 1, rate: 100, taxType: 'standard',   taxRate: 20, cisApplicable: false },
        { description: 'b', quantity: 2, rate: 50,  taxType: 'reduced',    taxRate: 5,  cisApplicable: false },
        { description: 'c', quantity: 1, rate: 40,  taxType: 'zero-rated', taxRate: 0,  cisApplicable: false },
      ],
    };
    const r = computeSelfBilledInvoice(input);
    expect(r.breakdown).toHaveLength(3);
    expect(r.netAmount).toBe(240);
    expect(r.taxAmount).toBe(25); // 20 + 5 + 0
    expect(r.breakdown.map((b) => b.rate)).toEqual([0, 5, 20]);
  });

  it('non-VAT (unchecked) supplier produces warning, no VAT, no error', () => {
    const r = computeSelfBilledInvoice({ ...baseInput(), supplierVatStatus: 'unchecked' });
    expect(r.vatIncluded).toBe(false);
    expect(r.taxAmount).toBe(0);
    expect(r.totalAmount).toBe(1000);
    expect(r.errors).toEqual([]);
    expect(r.warnings.some((w) => w.code === 'SUPPLIER_VAT_UNCHECKED')).toBe(true);
  });

  it('invalid VAT supplier pushes error', () => {
    const r = computeSelfBilledInvoice({ ...baseInput(), supplierVatStatus: 'invalid' });
    expect(r.vatIncluded).toBe(false);
    expect(r.taxAmount).toBe(0);
    expect(r.errors.some((e) => e.code === 'SUPPLIER_VAT_INVALID')).toBe(true);
  });

  it('deregistered supplier pushes error', () => {
    const r = computeSelfBilledInvoice({ ...baseInput(), supplierVatStatus: 'deregistered' });
    expect(r.vatIncluded).toBe(false);
    expect(r.errors.some((e) => e.code === 'SUPPLIER_VAT_DEREGISTERED')).toBe(true);
  });

  it('unchecked supplier pushes warning', () => {
    const r = computeSelfBilledInvoice({ ...baseInput(), supplierVatStatus: 'unchecked' });
    expect(r.warnings.some((w) => w.code === 'SUPPLIER_VAT_UNCHECKED')).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('CIS subcontractor standard_20 deducts 20% of labour', () => {
    const r = computeSelfBilledInvoice({
      ...baseInput(),
      supplierCisRate: 'standard_20',
      supplierCisLabourOnly: true,
      lineItems: [{ description: 'labour', quantity: 1, rate: 1000, taxType: 'standard', taxRate: 20, cisApplicable: true }],
    });
    expect(r.cisDeduction).toBe(200); // 20% of 1000 labour
    expect(r.amountPayable).toBe(1000); // 1200 - 200
  });

  it('CIS gross_0 — no deduction', () => {
    const r = computeSelfBilledInvoice({
      ...baseInput(),
      supplierCisRate: 'gross_0',
      supplierCisLabourOnly: true,
    });
    expect(r.cisDeduction).toBe(0);
    expect(r.amountPayable).toBe(1200);
  });

  it('CIS + reverse charge labour-only: RC VAT only on labour lines', () => {
    const input = {
      ...baseInput(),
      supplierCisRate: 'standard_20',
      supplierCisLabourOnly: true,
      applyReverseCharge: true,
      lineItems: [
        { description: 'labour',    quantity: 1, rate: 1000, taxType: 'standard', taxRate: 20, cisApplicable: true },
        { description: 'materials', quantity: 1, rate: 500,  taxType: 'standard', taxRate: 20, cisApplicable: false },
      ],
    };
    const r = computeSelfBilledInvoice(input);
    // Labour line: RC → lineTax = 0. Materials line: normal VAT = 100.
    expect(r.lineItemResults[0].lineTax).toBe(0);
    expect(r.lineItemResults[1].lineTax).toBe(100);
    expect(r.taxAmount).toBe(100);
    // CIS on labour only: 20% * 1000 = 200
    expect(r.cisDeduction).toBe(200);
  });

  it('CIS + reverse charge NOT labour-only: RC on all lines', () => {
    const input = {
      ...baseInput(),
      supplierCisRate: 'standard_20',
      supplierCisLabourOnly: false,
      applyReverseCharge: true,
      lineItems: [
        { description: 'labour',    quantity: 1, rate: 1000, taxType: 'standard', taxRate: 20, cisApplicable: true },
        { description: 'materials', quantity: 1, rate: 500,  taxType: 'standard', taxRate: 20, cisApplicable: false },
      ],
    };
    const r = computeSelfBilledInvoice(input);
    expect(r.lineItemResults.every((l) => l.lineTax === 0)).toBe(true);
    expect(r.taxAmount).toBe(0);
  });

  it('tax point at exactly 14 days → uses issueDate', () => {
    const r = computeSelfBilledInvoice({
      ...baseInput(),
      supplyDate: '2026-01-01',
      issueDate: '2026-01-15',
    });
    expect(r.taxPoint).toBe('2026-01-15');
  });

  it('tax point at 15 days → uses supplyDate', () => {
    const r = computeSelfBilledInvoice({
      ...baseInput(),
      supplyDate: '2026-01-01',
      issueDate: '2026-01-16',
    });
    expect(r.taxPoint).toBe('2026-01-01');
  });

  it('supply date 31 days from issue → SB_INVALID_DATE_RANGE warning', () => {
    const r = computeSelfBilledInvoice({
      ...baseInput(),
      supplyDate: '2026-01-01',
      issueDate: '2026-02-01', // 31 days
    });
    expect(r.warnings.some((w) => w.code === 'SB_INVALID_DATE_RANGE')).toBe(true);
  });

  it('zero-rated + exempt lines — no VAT, no error', () => {
    const r = computeSelfBilledInvoice({
      ...baseInput(),
      lineItems: [
        { description: 'zero',   quantity: 1, rate: 100, taxType: 'zero-rated', taxRate: 0, cisApplicable: false },
        { description: 'exempt', quantity: 1, rate: 50,  taxType: 'exempt',     taxRate: 0, cisApplicable: false },
      ],
    });
    expect(r.vatIncluded).toBe(true);
    expect(r.taxAmount).toBe(0);
    expect(r.errors).toEqual([]);
    expect(r.totalAmount).toBe(150);
  });

  it('input is not mutated (deep equality before/after)', () => {
    const input = {
      ...baseInput(),
      supplierCisRate: 'standard_20',
      supplierCisLabourOnly: true,
      applyReverseCharge: true,
      lineItems: [
        { description: 'l', quantity: 2, rate: 300, taxType: 'standard', taxRate: 20, cisApplicable: true },
        { description: 'm', quantity: 1, rate: 400, taxType: 'standard', taxRate: 20, cisApplicable: false },
      ],
    };
    const snapshot = JSON.parse(JSON.stringify(input));
    computeSelfBilledInvoice(input);
    expect(input).toEqual(snapshot);
  });

  it('valid supplier VAT + our business NOT VAT-registered → SBA_VAT_MISMATCH', () => {
    const r = computeSelfBilledInvoice({ ...baseInput(), ourVatRegistered: false });
    expect(r.errors.some((e) => e.code === 'SBA_VAT_MISMATCH')).toBe(true);
    expect(r.vatIncluded).toBe(false);
    expect(r.taxAmount).toBe(0);
  });

  it('empty lineItems → SB_NO_LINE_ITEMS error', () => {
    const r = computeSelfBilledInvoice({ ...baseInput(), lineItems: [] });
    expect(r.errors.some((e) => e.code === 'SB_NO_LINE_ITEMS')).toBe(true);
    expect(r.netAmount).toBe(0);
    expect(r.totalAmount).toBe(0);
    expect(r.lineItemResults).toEqual([]);
  });

  it('supplierVatStale passes through to warnings', () => {
    const r = computeSelfBilledInvoice({ ...baseInput(), supplierVatStale: true });
    expect(r.warnings.some((w) => w.code === 'SUPPLIER_VAT_STALE')).toBe(true);
  });

  describe('non-VAT supplier', () => {
    it('non-VAT supplier produces zero VAT, no errors, no warnings', () => {
      const r = computeSelfBilledInvoice({
        ...baseInput(),
        supplierIsVatRegistered: false,
        supplierVatStatus: 'unchecked',
        ourVatRegistered: true,
        lineItems: [{ description: 'labour', quantity: 1, rate: 1000, taxType: 'zero-rated', taxRate: 0, cisApplicable: false }],
      });
      expect(r.vatIncluded).toBe(false);
      expect(r.taxAmount).toBe(0);
      expect(r.errors).toEqual([]);
      expect(r.warnings).toEqual([]);
    });

    it('non-VAT supplier ignores supplierVatStatus entirely', () => {
      const r = computeSelfBilledInvoice({
        ...baseInput(),
        supplierIsVatRegistered: false,
        supplierVatStatus: 'invalid',
      });
      expect(r.errors.some((e) => e.code === 'SUPPLIER_VAT_INVALID')).toBe(false);
    });

    it('non-VAT supplier with CIS deduction works correctly', () => {
      const r = computeSelfBilledInvoice({
        ...baseInput(),
        supplierIsVatRegistered: false,
        supplierCisRate: 'standard_20',
        supplierCisLabourOnly: true,
        lineItems: [
          { description: 'labour',    quantity: 1, rate: 1000, taxType: 'zero-rated', taxRate: 0, cisApplicable: true },
          { description: 'materials', quantity: 1, rate: 500,  taxType: 'zero-rated', taxRate: 0, cisApplicable: false },
        ],
      });
      expect(r.cisDeduction).toBe(200);
      expect(r.amountPayable).toBe(1300);
      expect(r.vatIncluded).toBe(false);
      expect(r.taxAmount).toBe(0);
    });

    it('non-VAT supplier — buyer VAT status is irrelevant', () => {
      const r = computeSelfBilledInvoice({
        ...baseInput(),
        supplierIsVatRegistered: false,
        ourVatRegistered: false,
      });
      expect(r.errors.some((e) => e.code === 'SBA_VAT_MISMATCH')).toBe(false);
    });
  });

  it('all numeric outputs are rounded to 2 decimals', () => {
    const r = computeSelfBilledInvoice({
      ...baseInput(),
      lineItems: [{ description: 'odd', quantity: 3, rate: 33.333, taxType: 'standard', taxRate: 20, cisApplicable: false }],
    });
    const is2dp = (n) => Math.round(n * 100) / 100 === n;
    expect(is2dp(r.netAmount)).toBe(true);
    expect(is2dp(r.taxAmount)).toBe(true);
    expect(is2dp(r.totalAmount)).toBe(true);
    expect(is2dp(r.cisDeduction)).toBe(true);
    expect(is2dp(r.amountPayable)).toBe(true);
    r.breakdown.forEach((b) => {
      expect(is2dp(b.taxableAmount)).toBe(true);
      expect(is2dp(b.taxAmount)).toBe(true);
    });
  });
});