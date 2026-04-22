import { vi, describe, it, expect, beforeEach } from 'vitest';

const ctx = vi.hoisted(() => ({
  updates: [], sessionToken: 'session-token',
  fetchResponse: null, fetchThrows: null,
}));

vi.mock('../supabase.js', () => ({
  supabase: {
    from: () => ({
      update: (patch) => ({
        eq: function () {
          ctx.updates.push(patch);
          return this;
        },
        // chainable .eq().eq() terminates when awaited.
        then: (ok) => Promise.resolve(ok({ error: null })),
      }),
    }),
    auth: {
      getSession: () => Promise.resolve({ data: { session: { access_token: ctx.sessionToken } } }),
    },
  },
}));

import {
  isVerificationStale, shouldAutoVerify, verifySupplierVat,
} from './sbaVatVerify.js';

beforeEach(() => {
  ctx.updates = [];
  ctx.sessionToken = 'session-token';
  ctx.fetchResponse = null;
  ctx.fetchThrows = null;
  // Stub global fetch so we don't need jsdom or msw just for URL capture.
  global.fetch = vi.fn(async () => {
    if (ctx.fetchThrows) throw ctx.fetchThrows;
    const r = ctx.fetchResponse || { ok: true, status: 200, body: { status: 'valid', name: 'Acme Ltd' } };
    return { ok: r.ok, status: r.status, json: async () => r.body };
  });
});

const DAY = 86400000;
const iso = (msAgo) => new Date(Date.now() - msAgo).toISOString();

describe('isVerificationStale', () => {
  it('null vat_verified_at → stale', () => {
    expect(isVerificationStale({ vat_verified_at: null })).toBe(true);
  });
  it('91 days ago → stale', () => {
    expect(isVerificationStale({ vat_verified_at: iso(91 * DAY) })).toBe(true);
  });
  it('1 day ago → fresh', () => {
    expect(isVerificationStale({ vat_verified_at: iso(1 * DAY) })).toBe(false);
  });
});

describe('shouldAutoVerify', () => {
  const fresh = iso(1 * DAY);
  it('non-VAT supplier → false', () => {
    expect(shouldAutoVerify({ is_vat_registered: false, vat_number: 'GB123456789', vat_verified_at: null })).toBe(false);
  });
  it('no VRN → false', () => {
    expect(shouldAutoVerify({ is_vat_registered: true, vat_number: null, vat_verified_at: null })).toBe(false);
  });
  it('fresh → false', () => {
    expect(shouldAutoVerify({ is_vat_registered: true, vat_number: '123456789', vat_verified_at: fresh, vat_verification_status: 'valid' })).toBe(false);
  });
  it('stale → true', () => {
    expect(shouldAutoVerify({ is_vat_registered: true, vat_number: '123456789', vat_verified_at: iso(200 * DAY) })).toBe(true);
  });
});

describe('verifySupplierVat', () => {
  const baseSup = { id: 's1', vat_number: '123456789', is_vat_registered: true, vat_verified_at: null, vat_verification_status: null };

  it('valid VRN → status valid, supplier row updated', async () => {
    ctx.fetchResponse = { ok: true, status: 200, body: { status: 'valid', name: 'Acme Ltd' } };
    const out = await verifySupplierVat({ userId: 'u1', supplierId: 's1', supplier: baseSup });
    expect(out.status).toBe('valid');
    expect(out.name).toBe('Acme Ltd');
    expect(ctx.updates[0]).toMatchObject({ vat_verification_status: 'valid', vat_verification_name: 'Acme Ltd' });
  });

  it('invalid VRN → status invalid, row updated', async () => {
    ctx.fetchResponse = { ok: true, status: 200, body: { status: 'invalid' } };
    const out = await verifySupplierVat({ userId: 'u1', supplierId: 's1', supplier: baseSup });
    expect(out.status).toBe('invalid');
    expect(ctx.updates[0]).toMatchObject({ vat_verification_status: 'invalid' });
  });

  it('API error → status error, NO row update', async () => {
    ctx.fetchResponse = { ok: false, status: 503, body: { status: 'error' } };
    const out = await verifySupplierVat({ userId: 'u1', supplierId: 's1', supplier: baseSup });
    expect(out.status).toBe('error');
    expect(ctx.updates).toHaveLength(0);
  });

  it('fresh cache → no API call (short-circuits)', async () => {
    const fresh = {
      ...baseSup, vat_verified_at: iso(1 * DAY),
      vat_verification_status: 'valid', vat_verification_name: 'Cached Ltd',
    };
    const out = await verifySupplierVat({ userId: 'u1', supplierId: 's1', supplier: fresh });
    expect(out.status).toBe('valid');
    expect(out.cached).toBe(true);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('force=true bypasses cache and hits API', async () => {
    const fresh = {
      ...baseSup, vat_verified_at: iso(1 * DAY),
      vat_verification_status: 'valid', vat_verification_name: 'Cached Ltd',
    };
    ctx.fetchResponse = { ok: true, status: 200, body: { status: 'valid', name: 'Refreshed Ltd' } };
    const out = await verifySupplierVat({ userId: 'u1', supplierId: 's1', supplier: fresh, force: true });
    expect(global.fetch).toHaveBeenCalled();
    expect(out.name).toBe('Refreshed Ltd');
    expect(out.cached).toBe(false);
  });

  it('network exception → status error, no row update', async () => {
    ctx.fetchThrows = new Error('network down');
    const out = await verifySupplierVat({ userId: 'u1', supplierId: 's1', supplier: baseSup });
    expect(out.status).toBe('error');
    expect(ctx.updates).toHaveLength(0);
  });

  it('not VAT registered → unchecked, no API call', async () => {
    const sup = { ...baseSup, is_vat_registered: false };
    const out = await verifySupplierVat({ userId: 'u1', supplierId: 's1', supplier: sup });
    expect(out.status).toBe('unchecked');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
