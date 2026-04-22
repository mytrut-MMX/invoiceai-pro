import { vi, describe, it, expect, beforeEach } from 'vitest';

// vi.hoisted so the mock factories (hoisted above imports) capture the ref.
const ctx = vi.hoisted(() => ({
  findEntryResult: null, insertedHeaders: [], insertedLines: [],
  origHeader: null, origLines: [], existingVoids: [],
}));

vi.mock('./ledgerService.js', () => ({
  findAccount: (accounts, code) => accounts?.find((a) => a.code === code) ?? null,
  findEntryBySource: vi.fn(async () => ctx.findEntryResult),
}));

vi.mock('../../lib/supabase.js', () => {
  const entriesSelect = () => {
    const chain = {
      eq: () => chain,
      single: () => Promise.resolve({ data: ctx.origHeader, error: null }),
      then: (ok, err) => Promise.resolve({ data: ctx.existingVoids, error: null }).then(ok, err),
    };
    return chain;
  };
  return {
    supabaseReady: true,
    supabase: {
      from: (table) => table === 'journal_entries' ? {
        insert: (p) => { ctx.insertedHeaders.push(p); return { select: () => ({ single: () => Promise.resolve({ data: { id: `je-${ctx.insertedHeaders.length}` }, error: null }) }) }; },
        delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
        select: entriesSelect,
      } : table === 'journal_lines' ? {
        insert: (rows) => { ctx.insertedLines.push(rows); return Promise.resolve({ error: null }); },
        select: () => ({ eq: () => Promise.resolve({ data: ctx.origLines, error: null }) }),
      } : {},
    },
  };
});

import { postSelfBilledEntry, reverseSelfBilledEntry } from './postSelfBilledEntry.js';

const ACCOUNTS = ['2000', '2100', '2200', '5100', '5200', '6200'].map((c) => ({ id: `acc-${c}`, code: c }));
const USER = 'user-1';
const baseBill = (o = {}) => ({
  id: 'bill-x', bill_date: '2026-04-15', self_bill_invoice_number: 'SB-2026-0001',
  amount: 0, total: 0, tax_amount: 0, labour_amount: 0, materials_amount: 0,
  cis_deduction: 0, reverse_charge_vat_amount: 0,
  bill_type: 'standard', category: 'Office Supplies', ...o,
});
const reset = () => Object.assign(ctx, { findEntryResult: null, insertedHeaders: [], insertedLines: [], origHeader: null, origLines: [], existingVoids: [] });
const sums = (lines) => ({ dr: lines.reduce((s, l) => s + l.debit, 0), cr: lines.reduce((s, l) => s + l.credit, 0) });
const findLine = (lines, code) => lines.find((l) => l.account_id === `acc-${code}`);

beforeEach(() => { reset(); vi.clearAllMocks(); });

describe('postSelfBilledEntry', () => {
  it('VAT supplier: DR expense + DR VAT, CR AP, source_type=self_bill', async () => {
    const r = await postSelfBilledEntry(
      baseBill({ amount: 1000, total: 1200, tax_amount: 200 }),
      { name: 'Acme', is_vat_registered: true }, ACCOUNTS, USER);
    expect(r.success).toBe(true);
    const lines = ctx.insertedLines[0];
    expect(findLine(lines, '6200').debit).toBe(1000);
    expect(findLine(lines, '2100').debit).toBe(200);
    expect(findLine(lines, '2000').credit).toBe(1200);
    const { dr, cr } = sums(lines);
    expect(dr).toBeCloseTo(cr);
    expect(ctx.insertedHeaders[0].source_type).toBe('self_bill');
    expect(ctx.insertedHeaders[0].reference).toBe('SB-2026-0001');
  });

  it('non-VAT supplier: no VAT line', async () => {
    const r = await postSelfBilledEntry(
      baseBill({ amount: 500, total: 500 }),
      { name: 'Acme', is_vat_registered: false }, ACCOUNTS, USER);
    expect(r.success).toBe(true);
    const lines = ctx.insertedLines[0];
    expect(lines.some((l) => l.account_id === 'acc-2100')).toBe(false);
    const { dr, cr } = sums(lines);
    expect(dr).toBeCloseTo(cr);
  });

  it('CIS subcontractor: 5100/5200 split, CR CIS payable', async () => {
    const r = await postSelfBilledEntry(
      baseBill({ amount: 1500, total: 1500, labour_amount: 1000, materials_amount: 500,
        cis_deduction: 200, bill_type: 'cis', cis_rate_at_posting: 'standard_20' }),
      { name: 'Sub', is_vat_registered: false }, ACCOUNTS, USER);
    expect(r.success).toBe(true);
    const lines = ctx.insertedLines[0];
    expect(findLine(lines, '5100').debit).toBe(1000);
    expect(findLine(lines, '5200').debit).toBe(500);
    expect(findLine(lines, '2200').credit).toBe(200);
    expect(findLine(lines, '2000').credit).toBe(1300);
    const { dr, cr } = sums(lines);
    expect(dr).toBeCloseTo(cr);
  });

  it('CIS + reverse charge: DR+CR 2100 RC contra, no plain VAT input', async () => {
    const r = await postSelfBilledEntry(
      baseBill({ amount: 1500, total: 1500, labour_amount: 1000, materials_amount: 500,
        cis_deduction: 200, reverse_charge_vat_amount: 300, bill_type: 'cis_reverse_charge' }),
      { name: 'Sub', is_vat_registered: true }, ACCOUNTS, USER);
    expect(r.success).toBe(true);
    const lines = ctx.insertedLines[0];
    const vat = lines.filter((l) => l.account_id === 'acc-2100');
    expect(vat).toHaveLength(2);
    expect(vat.some((l) => l.debit === 300 && l.credit === 0)).toBe(true);
    expect(vat.some((l) => l.debit === 0 && l.credit === 300)).toBe(true);
    const { dr, cr } = sums(lines);
    expect(dr).toBeCloseTo(cr);
  });

  it('duplicate post throws SelfBillingError DUPLICATE_LEDGER_ENTRY', async () => {
    ctx.findEntryResult = { id: 'existing-je' };
    await expect(postSelfBilledEntry(
      baseBill({ amount: 500, total: 500 }),
      { name: 'Acme', is_vat_registered: false }, ACCOUNTS, USER,
    )).rejects.toMatchObject({ code: 'DUPLICATE_LEDGER_ENTRY' });
  });

  it('zero-amount bill rejected before any insert', async () => {
    const r = await postSelfBilledEntry(
      baseBill({ amount: 0, total: 0 }),
      { name: 'Acme', is_vat_registered: false }, ACCOUNTS, USER);
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/positive total/);
    expect(ctx.insertedHeaders).toHaveLength(0);
  });

  it('trial balance holds across all supported scenarios', async () => {
    const scenarios = [
      baseBill({ amount: 100, total: 120, tax_amount: 20 }),
      baseBill({ amount: 200, total: 200 }),
      baseBill({ amount: 1500, total: 1500, labour_amount: 1000, materials_amount: 500, cis_deduction: 200, bill_type: 'cis' }),
      baseBill({ amount: 900, total: 900, labour_amount: 900, cis_deduction: 180, reverse_charge_vat_amount: 180, bill_type: 'cis_reverse_charge' }),
    ];
    for (const bill of scenarios) {
      reset();
      const r = await postSelfBilledEntry(bill, { name: 'X', is_vat_registered: true }, ACCOUNTS, USER);
      expect(r.success).toBe(true);
      const { dr, cr } = sums(ctx.insertedLines[0]);
      expect(Math.abs(dr - cr)).toBeLessThan(0.01);
    }
  });
});

describe('reverseSelfBilledEntry', () => {
  it('mirrors entry under source_type self_bill_void', async () => {
    ctx.findEntryResult = { id: 'active-je' };
    ctx.origHeader = { id: 'active-je', description: 'Self-billed invoice SB-1 — Acme' };
    ctx.origLines = [
      { account_id: 'acc-6200', debit: 1000, credit: 0 },
      { account_id: 'acc-2100', debit: 200, credit: 0 },
      { account_id: 'acc-2000', debit: 0, credit: 1200 },
    ];
    const r = await reverseSelfBilledEntry('bill-x', USER);
    expect(r.success).toBe(true);
    expect(ctx.insertedHeaders[0].source_type).toBe('self_bill_void');
    expect(ctx.insertedHeaders[0].source_id).toBe('active-je');
    const lines = ctx.insertedLines[0];
    expect(findLine(lines, '6200')).toMatchObject({ debit: 0, credit: 1000 });
    expect(findLine(lines, '2000')).toMatchObject({ debit: 1200, credit: 0 });
    const { dr, cr } = sums(lines);
    expect(dr).toBeCloseTo(cr);
  });
});