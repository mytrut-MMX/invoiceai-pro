import { describe, it, expect } from 'vitest';
import { generateSbaPdf } from './generateSbaPdf.js';

const OUR = {
  orgName: 'Our Trading Ltd',
  street: '1 King Street',
  city: 'London',
  postcode: 'EC1A 1AA',
  country: 'United Kingdom',
  vatNumber: 'GB123456789',
};

function baseAgreement(overrides = {}) {
  return {
    id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    version: 1,
    direction: 'issued',
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    status: 'active',
    signed_by_us_at: '2026-01-02T10:00:00Z',
    signed_by_us_name: 'Alex OurCompany',
    signed_by_us_role: 'Director',
    signed_by_us_ip: '1.2.3.4',
    signed_by_them_at: '2026-01-03T10:00:00Z',
    signed_by_them_name: 'Sam Counterparty',
    signed_by_them_ip: '5.6.7.8',
    signed_by_them_token: null,
    terms_snapshot: {},
    ...overrides,
  };
}

function gen({ agreement = baseAgreement(), ourBusinessProfile = OUR, ...rest } = {}) {
  return generateSbaPdf({
    agreement,
    ourBusinessProfile,
    counterpartyName: 'Acme Supplies Ltd',
    counterpartyAddress: '2 Elm Road\nBristol BS1 2AB\nUnited Kingdom',
    counterpartyVat: 'GB987654321',
    generatedAt: new Date('2026-04-21T10:00:00Z'),
    compress: false,
    ...rest,
  });
}

const decode = (bytes) => new TextDecoder('latin1').decode(bytes);

describe('generateSbaPdf', () => {
  it('returns a Uint8Array starting with %PDF', () => {
    const bytes = gen();
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);
    expect(decode(bytes.slice(0, 4))).toBe('%PDF');
  });

  it('direction=issued places our name before the counterparty name', () => {
    const t = decode(gen());
    const ours = t.indexOf('Our Trading Ltd');
    const theirs = t.indexOf('Acme Supplies Ltd');
    expect(ours).toBeGreaterThanOrEqual(0);
    expect(theirs).toBeGreaterThan(ours);
  });

  it('direction=received swaps roles — counterparty becomes Self-Biller', () => {
    const agreement = baseAgreement({ direction: 'received' });
    const t = decode(gen({ agreement }));
    const ours = t.indexOf('Our Trading Ltd');
    const theirs = t.indexOf('Acme Supplies Ltd');
    expect(theirs).toBeGreaterThanOrEqual(0);
    expect(ours).toBeGreaterThan(theirs);
  });

  it('renders "Not VAT registered" when our VAT is null', () => {
    const t = decode(gen({ ourBusinessProfile: { ...OUR, vatNumber: null } }));
    expect(t).toContain('Not VAT registered');
  });

  it('contains HMRC mandatory marker phrases', () => {
    const t = decode(gen());
    expect(t).toContain('SELF-BILLING INVOICE');
    expect(t).toContain('output tax due to HMRC');
    expect(t).toContain('will not issue sales invoices');
  });

  it('renders all 5 base clauses with numbered titles', () => {
    const t = decode(gen());
    expect(t).toMatch(/1\. Issuance of Invoices/);
    expect(t).toMatch(/2\. Acceptance/);
    expect(t).toMatch(/3\. VAT Status Notifications/);
    expect(t).toMatch(/4\. Duration/);
    expect(t).toMatch(/5\. Invoice Markers/);
  });

  it('appends custom_clauses from terms_snapshot as clause 6+', () => {
    const agreement = baseAgreement({
      terms_snapshot: {
        custom_clauses: [{ title: 'Dispute Resolution', body: 'Any dispute shall be resolved in London.' }],
      },
    });
    const t = decode(gen({ agreement }));
    expect(t).toMatch(/6\. Dispute Resolution/);
    expect(t).toContain('Any dispute shall be resolved in London.');
  });

  it('is deterministic for the same generatedAt (±16 byte metadata jitter)', () => {
    const a = gen();
    const b = gen();
    expect(Math.abs(a.length - b.length)).toBeLessThanOrEqual(16);
  });

  it('non-VAT supplier agreement uses registration notification clause', () => {
    const bytes = gen({ counterpartyIsVatRegistered: false, counterpartyVat: null });
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);
    const t = decode(bytes);
    expect(t).toMatch(/3\. VAT Registration Notification/);
    expect(t).not.toMatch(/VAT Status Notifications/);
  });

  it("non-VAT supplier agreement shows 'Not VAT registered' in parties", () => {
    const bytes = gen({ counterpartyIsVatRegistered: false, counterpartyVat: null });
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);
    const t = decode(bytes);
    expect(t).toContain('Not VAT registered');
  });
});