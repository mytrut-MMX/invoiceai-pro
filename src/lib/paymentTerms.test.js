import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('./supabase.js', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  },
}));

import { computeDueDate, createPaymentTerm } from './paymentTerms.js';
import { supabase } from './supabase.js';

describe('createPaymentTerm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns Not authenticated error when user is null', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: null } });
    const result = await createPaymentTerm({ name: 'Net 10', type: 'net', days: 10 });
    expect(result.data).toBeNull();
    expect(result.error.message).toBe('Not authenticated');
  });
});

describe('computeDueDate', () => {
  it('net 30 from 2025-01-15 → 2025-02-14', () => {
    const result = computeDueDate('2025-01-15', { type: 'net', days: 30 });
    expect(result.toISOString().slice(0, 10)).toBe('2025-02-14');
  });

  it('eom from 2025-02-10 → 2025-02-28', () => {
    const result = computeDueDate('2025-02-10', { type: 'eom' });
    expect(result.toISOString().slice(0, 10)).toBe('2025-02-28');
  });

  it('eom from 2024-02-10 (leap year) → 2024-02-29', () => {
    const result = computeDueDate('2024-02-10', { type: 'eom' });
    expect(result.toISOString().slice(0, 10)).toBe('2024-02-29');
  });

  it('due_on_receipt from 2025-06-01 → 2025-06-01', () => {
    const result = computeDueDate('2025-06-01', { type: 'due_on_receipt' });
    expect(result.toISOString().slice(0, 10)).toBe('2025-06-01');
  });

  it('custom 7 from 2025-12-28 → 2026-01-04', () => {
    const result = computeDueDate('2025-12-28', { type: 'custom', days: 7 });
    expect(result.toISOString().slice(0, 10)).toBe('2026-01-04');
  });
});
