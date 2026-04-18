import { describe, it, expect } from 'vitest';
import { computeDueDate } from './paymentTerms.js';

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
