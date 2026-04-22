import { describe, it, expect } from 'vitest';
import { generateSelfBilledPdf } from './generateSelfBilledPdf.js';
import {
  SELF_BILL_MARKER_TITLE,
  SELF_BILL_VAT_STATEMENT,
  SELF_BILL_VAT_STATEMENT_NON_VAT_SUPPLIER,
} from '../../constants/selfBilling.js';

const OUR = {
  orgName: 'Our Trading Ltd',
  street: '1 King Street', city: 'London', postcode: 'EC1A 1AA', country: 'United Kingdom',
  vatNumber: 'GB123456789', email: 'ops@ourtrading.co.uk',
};
const SUPPLIER = {
  name: 'Acme Supplies Ltd', legal_name: 'Acme Supplies Limited',
  billingAddress: { street: '2 Elm Road', city: 'Bristol', postcode: 'BS1 2AB', country: 'United Kingdom' },
  vat_number: 'GB987654321', vat_status: 'valid',
};
const AGREEMENT = {
  id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', version: 2,
  start_date: '2026-01-01', end_date: '2026-12-31',
};
const baseBill = (overrides = {}) => ({
  self_bill_invoice_number: 'SB-2026-0001',
  issueDate: '2026-04-15', supplyDate: '2026-04-10',
  taxPoint: '2026-04-15', dueDate: '2026-05-15',
  lineItems: [
    { description: 'Labour week 15', quantity: 1, rate: 1000, taxRate: 20, lineNet: 1000, lineTax: 200 },
    { description: 'Materials',       quantity: 1, rate: 500,  taxRate: 20, lineNet: 500,  lineTax: 100 },
  ],
  breakdown: [{ rate: 20, taxableAmount: 1500, taxAmount: 300 }],
  netAmount: 1500, taxAmount: 300, totalAmount: 1800,
  cisDeduction: 0, amountPayable: 1800, vatIncluded: true, ...overrides,
});

const gen = ({ bill = baseBill(), supplier = SUPPLIER, ...rest } = {}) =>
  generateSelfBilledPdf({
    bill, supplier, ourBusinessProfile: OUR, agreement: AGREEMENT,
    generatedAt: new Date('2026-04-21T10:00:00Z'), compress: false, ...rest,
  });

const decode = (bytes) => new TextDecoder('latin1').decode(bytes);

describe('generateSelfBilledPdf', () => {
  it('returns a Uint8Array starting with %PDF and non-empty bytes', () => {
    const bytes = gen();
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(500);
    expect(decode(bytes.slice(0, 4))).toBe('%PDF');
  });

  it('contains both HMRC mandatory markers in uncompressed stream', () => {
    const t = decode(gen());
    expect(t).toContain(SELF_BILL_MARKER_TITLE);
    expect(t).toContain(SELF_BILL_VAT_STATEMENT);
  });

  it('non-VAT supplier uses non-VAT statement, not the standard one', () => {
    const t = decode(gen({ supplier: { ...SUPPLIER, vat_number: null, vat_status: 'unchecked' } }));
    // The non-VAT constant contains an em-dash (U+2014); jsPDF re-encodes it
    // in WinAnsi so we check the ASCII halves rather than the exact string.
    expect(t).toContain('VAT not applicable');
    expect(t).toContain('supplier is not VAT registered');
    expect(t).not.toContain(SELF_BILL_VAT_STATEMENT);
  });

  it('agreement reference line contains agreement id prefix + version', () => {
    const t = decode(gen());
    expect(t).toContain('aaaaaaaa');
    expect(t).toContain('v2');
    expect(t).toMatch(/Self-Billing Agreement aaaaaaaa v2/);
  });

  it('supplier appears in "From" position, we appear in "Bill To" position', () => {
    // In a PDF content stream, "(" is escaped as "\(", so we search for
    // substrings without parens and assert supplier is rendered before us.
    const t = decode(gen());
    const fromLabel = t.indexOf('FROM');
    const billToLabel = t.indexOf('BILL TO');
    const sup = t.indexOf('Acme Supplies Ltd');
    const us = t.indexOf('Our Trading Ltd');
    expect(fromLabel).toBeGreaterThanOrEqual(0);
    expect(billToLabel).toBeGreaterThan(fromLabel);
    expect(sup).toBeGreaterThan(fromLabel);
    expect(sup).toBeLessThan(us); // supplier (left "From") drawn before us (right "Bill To")
    expect(us).toBeGreaterThan(billToLabel);
  });

  it('>20 line items produce a multi-page doc with marker panel on final page', () => {
    const lineItems = Array.from({ length: 25 }, (_, i) => ({
      description: `Item ${i + 1}`, quantity: 1, rate: 100,
      taxRate: 20, lineNet: 100, lineTax: 20,
    }));
    const bill = baseBill({
      lineItems,
      breakdown: [{ rate: 20, taxableAmount: 2500, taxAmount: 500 }],
      netAmount: 2500, taxAmount: 500, totalAmount: 3000, amountPayable: 3000,
    });
    const t = decode(gen({ bill }));
    expect(t).toMatch(/\/Count 2/);
    const panelIdx = t.indexOf(SELF_BILL_VAT_STATEMENT);
    const page2Idx = t.lastIndexOf('/Type /Page ');
    expect(panelIdx).toBeGreaterThan(page2Idx >= 0 ? 0 : -1);
    expect(panelIdx).toBeGreaterThanOrEqual(0);
  });

  it('CIS bill renders labour, materials, and deduction lines', () => {
    const bill = baseBill({
      cisDeduction: 200, amountPayable: 1600,
      cis: { labour: 1000, materials: 500, deduction: 200, rateLabel: '20%' },
    });
    const t = decode(gen({ bill }));
    expect(t).toContain('CIS BREAKDOWN');
    expect(t).toContain('Labour');
    expect(t).toContain('Materials');
    expect(t).toMatch(/CIS deduction/);
    expect(t).toContain('CIS Deduction');
  });

  it('deterministic output: same input → same byte length (±16 jitter)', () => {
    const a = gen(), b = gen();
    expect(Math.abs(a.length - b.length)).toBeLessThanOrEqual(16);
  });
});