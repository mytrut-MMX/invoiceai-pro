import { describe, it, expect, vi } from 'vitest';

let insertedBalances = null;

vi.mock('../../lib/supabase', () => ({
  supabaseReady: true,
  supabase: {
    from: vi.fn((table) => {
      if (table === 'leave_balances') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
          insert: (rows) => {
            insertedBalances = rows;
            return {
              select: () => Promise.resolve({ data: rows.map((r, i) => ({ id: `bal${i}`, ...r })), error: null }),
            };
          },
        };
      }
      if (table === 'employees') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { start_date: '2026-10-01' }, error: null }),
            }),
          }),
        };
      }
      return {};
    }),
  },
}));

const { countWorkingDays, calculateSSP, getLeaveBalances } = await import('./leaveService');

describe('countWorkingDays', () => {
  it('Mon-Fri week returns 5', () => {
    expect(countWorkingDays('2026-01-05', '2026-01-09')).toBe(5);
  });

  it('Mon-Sun returns 5 (weekends excluded)', () => {
    expect(countWorkingDays('2026-01-05', '2026-01-11')).toBe(5);
  });

  it('Wed-Wed (8 calendar days) returns 6', () => {
    expect(countWorkingDays('2026-01-07', '2026-01-14')).toBe(6);
  });
});

describe('pro-rata annual entitlement', () => {
  it('employee starting 1 Oct in 2026-27 tax year gets ~14 days', async () => {
    insertedBalances = null;
    const balances = await getLeaveBalances('emp1', '2026-27');
    const annual = balances.find(b => b.leave_type === 'annual');
    expect(annual.entitlement_days).toBe(14);
    const sick = balances.find(b => b.leave_type === 'sick');
    expect(sick.entitlement_days).toBe(140);
  });
});

describe('calculateSSP', () => {
  it('5 qualifying days → 2 payable (5 - 3 waiting)', () => {
    const result = calculateSSP('2026-01-05', '2026-01-09');
    expect(result.qualifyingDays).toBe(5);
    expect(result.payableDays).toBe(2);
  });

  it('10 qualifying days → 7 payable', () => {
    const result = calculateSSP('2026-01-05', '2026-01-16');
    expect(result.qualifyingDays).toBe(10);
    expect(result.payableDays).toBe(7);
  });

  it('150 qualifying days → capped at 140, payable = 137', () => {
    const result = calculateSSP('2026-01-05', '2026-07-31');
    expect(result.qualifyingDays).toBe(150);
    expect(result.payableDays).toBe(137);
  });
});
