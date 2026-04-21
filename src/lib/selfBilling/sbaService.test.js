import { vi, describe, it, expect, beforeEach } from 'vitest';

// Fluent Supabase mock. Each PostgREST chainable method returns the same
// builder; the builder is thenable so `await builder` resolves with __result.
// Terminators (maybeSingle / single) return a Promise directly.
const { mockBuilder, mockSupabase } = vi.hoisted(() => {
  const builder = { __result: { data: null, error: null, count: null } };
  const chainable = ['select','insert','update','delete','eq','gt','lt','in','is','not','filter','order'];
  chainable.forEach((m) => { builder[m] = vi.fn(() => builder); });
  builder.maybeSingle = vi.fn(() => Promise.resolve(builder.__result));
  builder.single      = vi.fn(() => Promise.resolve(builder.__result));
  builder.then = (ok, err) => Promise.resolve(builder.__result).then(ok, err);
  const supabase = {
    from: vi.fn(() => builder),
    rpc:  vi.fn(() => Promise.resolve({ data: null, error: null })),
  };
  return { mockBuilder: builder, mockSupabase: supabase };
});

vi.mock('../supabase.js', () => ({ supabase: mockSupabase }));

import {
  createDraftSba, signBySender, signByCounterparty, terminateSba,
  supersedeAndRenew, listActiveSbas, getSbaById,
  getActiveSbaForSupplier, getActiveSbaForCustomer, expireStaleSbas,
} from './sbaService.js';
import { SBA_STATUS, SB_DIRECTION } from '../../constants/selfBilling.js';

const USER = '11111111-1111-1111-1111-111111111111';
const SUP  = 'ssssssss-ssss-ssss-ssss-ssssssssssss';
const CUS  = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const SBA  = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

function setResult(r) {
  mockBuilder.__result = { data: null, error: null, count: null, ...r };
}

beforeEach(() => {
  vi.clearAllMocks();
  setResult({});
});

describe('createDraftSba', () => {
  it('inserts a draft when no overlap exists', async () => {
    mockBuilder.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const draft = { id: SBA, status: 'draft', version: 1 };
    mockBuilder.single.mockResolvedValueOnce({ data: draft, error: null });
    const out = await createDraftSba({
      userId: USER, supplierId: SUP, direction: SB_DIRECTION.ISSUED,
      startDate: '2026-01-01', endDate: '2026-12-31', termsSnapshot: {},
    });
    expect(out).toEqual(draft);
  });

  it('throws SBA_OVERLAP when active agreement exists', async () => {
    mockBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: 'old', start_date: '2026-01-01', end_date: '2026-06-30', supplier: { name: 'Acme' } },
      error: null,
    });
    await expect(createDraftSba({
      userId: USER, supplierId: SUP, direction: SB_DIRECTION.ISSUED,
      startDate: '2026-07-01', endDate: '2026-12-31', termsSnapshot: {},
    })).rejects.toMatchObject({ code: 'SBA_OVERLAP' });
  });

  it('rejects dates more than 24 months apart', async () => {
    await expect(createDraftSba({
      userId: USER, supplierId: SUP, direction: SB_DIRECTION.ISSUED,
      startDate: '2026-01-01', endDate: '2029-01-01', termsSnapshot: {},
    })).rejects.toMatchObject({ code: 'SBA_INVALID_DATES' });
  });

  it('rejects when both supplierId and customerId are set', async () => {
    await expect(createDraftSba({
      userId: USER, supplierId: SUP, customerId: CUS,
      direction: SB_DIRECTION.ISSUED,
      startDate: '2026-01-01', endDate: '2026-12-31', termsSnapshot: {},
    })).rejects.toMatchObject({ code: 'SBA_INVALID_COUNTERPARTY' });
  });
});

describe('signBySender', () => {
  it('transitions draft to pending_countersign with a token', async () => {
    mockBuilder.maybeSingle.mockResolvedValueOnce({ data: { id: SBA, status: 'draft' }, error: null });
    mockBuilder.single.mockResolvedValueOnce({ data: { id: SBA, status: 'pending_countersign' }, error: null });
    const out = await signBySender({
      userId: USER, sbaId: SBA, signedByName: 'Me', signedByRole: 'Dir', ip: '1.2.3.4',
    });
    expect(out.status).toBe('pending_countersign');
    const updateArg = mockBuilder.update.mock.calls[0][0];
    expect(updateArg.signed_by_them_token).toMatch(/^[a-f0-9]{64}$/);
  });

  it('refuses non-draft status', async () => {
    mockBuilder.maybeSingle.mockResolvedValueOnce({ data: { id: SBA, status: 'active' }, error: null });
    await expect(signBySender({
      userId: USER, sbaId: SBA, signedByName: 'Me', signedByRole: 'Dir',
    })).rejects.toMatchObject({ code: 'SBA_NOT_ACTIVE' });
  });
});

describe('signByCounterparty', () => {
  it('calls RPC with only the token (no userId)', async () => {
    mockSupabase.rpc.mockResolvedValueOnce({ data: { id: SBA, status: 'active' }, error: null });
    const out = await signByCounterparty({ token: 'abcd', signedByName: 'Them', ip: '5.6.7.8' });
    expect(out.status).toBe('active');
    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'sign_sba_by_counterparty',
      expect.objectContaining({ p_token: 'abcd', p_name: 'Them' })
    );
    const args = mockSupabase.rpc.mock.calls[0][1];
    expect(args).not.toHaveProperty('p_user_id');
  });

  it('throws SBA_NOT_SIGNED when the token is missing', async () => {
    await expect(signByCounterparty({ token: '', signedByName: 'Them' }))
      .rejects.toMatchObject({ code: 'SBA_NOT_SIGNED' });
  });
});

describe('terminateSba', () => {
  it('terminates an active agreement with a valid reason', async () => {
    mockBuilder.maybeSingle.mockResolvedValueOnce({ data: { id: SBA, status: 'active' }, error: null });
    mockBuilder.single.mockResolvedValueOnce({ data: { id: SBA, status: 'terminated' }, error: null });
    const out = await terminateSba({
      userId: USER, sbaId: SBA, reason: 'counterparty requested termination',
    });
    expect(out.status).toBe('terminated');
  });

  it('rejects reasons under 10 characters', async () => {
    await expect(terminateSba({ userId: USER, sbaId: SBA, reason: 'short' }))
      .rejects.toMatchObject({ code: 'SBA_INVALID_REASON' });
  });
});

describe('supersedeAndRenew', () => {
  it('delegates atomicity to the RPC and returns the new row', async () => {
    mockSupabase.rpc.mockResolvedValueOnce({ data: { id: 'new', version: 2 }, error: null });
    const out = await supersedeAndRenew({
      userId: USER, sbaId: SBA,
      newStartDate: '2027-01-01', newEndDate: '2027-12-31', newTermsSnapshot: {},
    });
    expect(out.version).toBe(2);
    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'supersede_and_renew_sba',
      expect.objectContaining({
        p_old_sba_id: SBA,
        p_new_start_date: '2027-01-01',
        p_new_end_date: '2027-12-31',
        p_new_terms_snapshot: {},
      }),
    );
    const rpcArgs = mockSupabase.rpc.mock.calls[0][1];
    expect(rpcArgs).not.toHaveProperty('p_user_id');
    expect(mockBuilder.update).not.toHaveBeenCalled();
    expect(mockBuilder.insert).not.toHaveBeenCalled();
  });

  it('throws on RPC failure without mutating local state', async () => {
    mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'txn rolled back' } });
    await expect(supersedeAndRenew({
      userId: USER, sbaId: SBA,
      newStartDate: '2027-01-01', newEndDate: '2027-12-31',
    })).rejects.toMatchObject({ code: 'SBA_NOT_ACTIVE' });
    expect(mockBuilder.update).not.toHaveBeenCalled();
    expect(mockBuilder.insert).not.toHaveBeenCalled();
  });
});

describe('listActiveSbas', () => {
  it('filters by status=active and end_date > today', async () => {
    setResult({ data: [{ id: SBA, status: 'active', end_date: '2027-01-01' }], error: null });
    const rows = await listActiveSbas({ userId: USER });
    expect(rows).toHaveLength(1);
    expect(mockBuilder.eq).toHaveBeenCalledWith('status', SBA_STATUS.ACTIVE);
    expect(mockBuilder.gt).toHaveBeenCalledWith('end_date', expect.any(String));
    expect(mockBuilder.order).toHaveBeenCalledWith('end_date', { ascending: true });
  });

  it('applies direction filter when provided', async () => {
    setResult({ data: [], error: null });
    await listActiveSbas({ userId: USER, direction: SB_DIRECTION.RECEIVED });
    expect(mockBuilder.eq).toHaveBeenCalledWith('direction', 'received');
  });
});

describe('getSbaById', () => {
  it('returns the row when found', async () => {
    mockBuilder.maybeSingle.mockResolvedValueOnce({ data: { id: SBA, status: 'active' }, error: null });
    expect(await getSbaById({ userId: USER, sbaId: SBA })).toMatchObject({ id: SBA });
  });

  it('throws SBA_NOT_ACTIVE when not found', async () => {
    mockBuilder.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await expect(getSbaById({ userId: USER, sbaId: SBA }))
      .rejects.toMatchObject({ code: 'SBA_NOT_ACTIVE' });
  });
});

describe('getActiveSbaForSupplier', () => {
  it('returns null without hitting Supabase when supplierId is missing', async () => {
    const out = await getActiveSbaForSupplier({ userId: USER, supplierId: null });
    expect(out).toBeNull();
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });
});

describe('getActiveSbaForCustomer', () => {
  it('returns row when an active received agreement exists', async () => {
    mockBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: SBA, direction: 'received' }, error: null,
    });
    expect(await getActiveSbaForCustomer({ userId: USER, customerId: CUS }))
      .toMatchObject({ id: SBA });
  });
});

describe('expireStaleSbas', () => {
  it('returns the updated row count', async () => {
    setResult({ data: [{ id: '1' }, { id: '2' }], error: null, count: 2 });
    expect(await expireStaleSbas({ userId: USER })).toBe(2);
  });

  it('returns 0 when nothing needs expiry', async () => {
    setResult({ data: [], error: null, count: 0 });
    expect(await expireStaleSbas({ userId: USER })).toBe(0);
  });
});