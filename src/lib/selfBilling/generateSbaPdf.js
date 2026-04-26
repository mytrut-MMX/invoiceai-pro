// generateSbaPdf — HMRC VAT Notice 700/62 §8 self-billing agreement PDF.
// Pure function: input → Uint8Array. No Supabase, no DOM, no fetch.
// Direction swap (issued: we are Self-Biller; received: counterparty is)
// happens once in resolveParties(); downstream renders biller first.

import jsPDF from 'jspdf';
import { resolveLogoDataUrl, drawLogo } from '../../utils/pdf/pdfShared';
import { getCompanyLogoUrl, isLogoEnabled } from '../../utils/branding/logoHelper';
import {
  HMRC_SBA_TERMS_TEMPLATE, HMRC_SBA_NON_VAT_CLAUSE, SBA_CLAUSE_KEYS, SB_DIRECTION,
  SELF_BILL_MARKER_TITLE, SELF_BILL_VAT_STATEMENT,
  SELF_BILL_VAT_STATEMENT_NON_VAT_SUPPLIER,
} from '../../constants/selfBilling.js';

// Phrases that must stay atomic in the rendered text stream: HMRC marker
// strings plus Clause 2's verbatim wording. Hard-break around each before
// wrap so splitTextToSize doesn't split them mid-phrase.
const PRESERVE_PHRASES = Object.freeze([
  SELF_BILL_MARKER_TITLE, SELF_BILL_VAT_STATEMENT, 'will not issue sales invoices',
]);
function preserveMarkers(body) {
  let out = String(body || '');
  for (const m of PRESERVE_PHRASES) {
    if (m && out.includes(m)) out = out.split(m).join(`\n${m}\n`);
  }
  return out.replace(/\n+/g, '\n').replace(/^\n/, '');
}

// Layout (mm) — A4 portrait, Fibonacci margins.
const PAGE_W = 210, PAGE_H = 297, ML = 21, MB = 21, MT = 34;
const CR = PAGE_W - ML, CONTENT_W = CR - ML;
// Typography (pt) — Fibonacci scale, 1.618× line height.
const T_TITLE = 21, T_H = 13, T_BODY = 10, T_FOOT = 8;
const PT = 0.3528;
const lh = (pt) => pt * 1.618 * PT;
// Colors
const BRAND = [30,107,224], INK = [26,26,26], BODY = [85,85,85];
const MUTED = [107,107,107], LINE = [225,225,225], WATERMARK = [200,200,200];

const setFill = (d, c) => d.setFillColor(c[0], c[1], c[2]);
const setText = (d, c) => d.setTextColor(c[0], c[1], c[2]);
const setDraw = (d, c) => d.setDrawColor(c[0], c[1], c[2]);

function fmtDate(v) {
  if (!v) return '—';
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? '—'
    : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtIso(v) {
  if (!v) return '';
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}
function formatAddress(p) {
  if (!p) return '';
  return [p.street, [p.city, p.postcode].filter(Boolean).join(' '), p.country]
    .filter(Boolean).join('\n');
}

function resolveParties({ agreement, ourBusinessProfile, counterpartyName, counterpartyAddress, counterpartyVat }) {
  const us = {
    name: ourBusinessProfile?.orgName || ourBusinessProfile?.name || 'Your Company',
    address: formatAddress(ourBusinessProfile),
    vat: ourBusinessProfile?.vatNumber || ourBusinessProfile?.vatNum || null,
  };
  const them = { name: counterpartyName || '', address: counterpartyAddress || '', vat: counterpartyVat || null };
  return agreement?.direction === SB_DIRECTION.RECEIVED
    ? { biller: them, billee: us, usIsBiller: false }
    : { biller: us, billee: them, usIsBiller: true };
}

function substitutePlaceholders(body, agreement) {
  return String(body || '')
    .replace(/\{startDate\}/g, fmtDate(agreement?.start_date))
    .replace(/\{endDate\}/g, fmtDate(agreement?.end_date));
}

function addPage(s) { s.doc.addPage(); s.page += 1; s.y = MT; }
function ensureSpace(s, needed) { if (s.y + needed > PAGE_H - MB) addPage(s); }

function drawTitleBand(s) {
  const { doc, logoDataUrl } = s;
  setFill(doc, BRAND);
  doc.rect(0, 0, PAGE_W, 5, 'F');

  if (logoDataUrl) {
    drawLogo(doc, logoDataUrl, { x: ML, y: 8, size: 'small', maxWidth: 36 });
  }

  setText(doc, INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(T_TITLE);
  doc.text('SELF-BILLING AGREEMENT', PAGE_W / 2, 22, { align: 'center' });
  s.y = MT;
}

function drawMetaGrid(s) {
  const { doc, agreement } = s;
  const rows = [
    ['Agreement ID', `${(agreement?.id || '').slice(0, 8)}-v${agreement?.version || 1}`],
    ['Direction',   agreement?.direction || '—'],
    ['Start',       fmtDate(agreement?.start_date)],
    ['End',         fmtDate(agreement?.end_date)],
    ['Status',      agreement?.status || '—'],
  ];
  doc.setFontSize(T_BODY);
  const colW = CONTENT_W / 2;
  const rowH = lh(T_BODY) * 1.25;
  rows.forEach((pair, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = ML + col * colW;
    const y = s.y + row * rowH;
    setText(doc, MUTED);
    doc.setFont('helvetica', 'normal');
    doc.text(pair[0], x, y + lh(T_BODY));
    setText(doc, INK);
    doc.setFont('helvetica', 'bold');
    doc.text(String(pair[1]), x + 35, y + lh(T_BODY));
  });
  s.y += Math.ceil(rows.length / 2) * rowH + 4;
}

function drawParties(s, parties) {
  const { doc } = s;
  const blocks = [
    { label: 'THE SELF-BILLER', party: parties.biller },
    { label: 'THE SELF-BILLEE', party: parties.billee },
  ];
  blocks.forEach((b) => {
    ensureSpace(s, 40);
    setText(doc, MUTED);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(T_FOOT);
    doc.text(b.label, ML, s.y + lh(T_FOOT));
    s.y += lh(T_FOOT) + 1;
    setText(doc, INK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(T_BODY);
    doc.text(b.party.name || '—', ML, s.y + lh(T_BODY));
    s.y += lh(T_BODY);
    setText(doc, BODY);
    doc.setFont('helvetica', 'normal');
    String(b.party.address || '').split('\n').filter(Boolean).forEach((ln) => {
      doc.text(ln, ML, s.y + lh(T_BODY));
      s.y += lh(T_BODY);
    });
    setText(doc, MUTED);
    doc.setFontSize(T_FOOT);
    doc.text(b.party.vat ? `VAT ${b.party.vat}` : 'Not VAT registered', ML, s.y + lh(T_FOOT));
    s.y += lh(T_FOOT) + 4;
  });
  s.y += 2;
}

function drawClause(s, cl) {
  const { doc } = s;
  ensureSpace(s, lh(T_H) + lh(T_BODY) * 2 + 6);
  setText(doc, INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(T_H);
  doc.text(`${cl.num}. ${cl.title}`, ML, s.y + lh(T_H));
  s.y += lh(T_H) + 2;

  setText(doc, BODY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(T_BODY);
  const lines = doc.splitTextToSize(preserveMarkers(cl.body), CONTENT_W);
  lines.forEach((ln) => {
    ensureSpace(s, lh(T_BODY));
    doc.text(ln, ML, s.y + lh(T_BODY));
    s.y += lh(T_BODY);
  });
  s.y += 3;
}

function drawClauses(s) {
  const { agreement, counterpartyIsVatRegistered } = s;
  const baseClauses = HMRC_SBA_TERMS_TEMPLATE.map((clause) => {
    if (clause.id === SBA_CLAUSE_KEYS.VAT_STATUS_NOTIFICATION && counterpartyIsVatRegistered === false) {
      return HMRC_SBA_NON_VAT_CLAUSE;
    }
    if (clause.id === SBA_CLAUSE_KEYS.MANDATORY_MARKERS && counterpartyIsVatRegistered === false) {
      return {
        ...clause,
        body: clause.body.split(SELF_BILL_VAT_STATEMENT).join(SELF_BILL_VAT_STATEMENT_NON_VAT_SUPPLIER),
      };
    }
    return clause;
  });
  const base = baseClauses.map((c, i) => ({
    num: i + 1,
    title: c.title,
    body: substitutePlaceholders(c.body, agreement),
  }));
  const customArr = Array.isArray(agreement?.terms_snapshot?.custom_clauses)
    ? agreement.terms_snapshot.custom_clauses
    : [];
  const custom = customArr.map((c, i) => ({
    num: base.length + i + 1,
    title: c.title || `Additional Clause ${i + 1}`,
    body: String(c.body || ''),
  }));
  [...base, ...custom].forEach((cl) => drawClause(s, cl));
}

function signatureFieldsFor(agreement, usIsBiller, role) {
  // role: 'biller' | 'billee'. Picks the right signature columns based on
  // whether we (the authenticated user) are the biller in this agreement.
  const weAreThisRole = (role === 'biller') === usIsBiller;
  if (weAreThisRole) {
    return {
      at:   agreement.signed_by_us_at,
      name: agreement.signed_by_us_name,
      roleLabel: agreement.signed_by_us_role,
      ip:   agreement.signed_by_us_ip,
      pending: Boolean(agreement.signed_by_us_name) && !agreement.signed_by_us_at,
    };
  }
  return {
    at:   agreement.signed_by_them_at,
    name: agreement.signed_by_them_name,
    roleLabel: null,
    ip:   agreement.signed_by_them_ip,
    pending: Boolean(agreement.signed_by_them_token) && !agreement.signed_by_them_at,
  };
}

function drawSignatureBlock(s, label, fields) {
  const { doc } = s;
  ensureSpace(s, 32);
  setText(doc, MUTED);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(T_FOOT);
  doc.text(label, ML, s.y + lh(T_FOOT));
  s.y += lh(T_FOOT) + 6;

  const boxY = s.y;
  const boxH = 18;
  setDraw(doc, LINE);
  doc.setLineWidth(0.3);
  doc.line(ML, boxY + boxH - 5, CR, boxY + boxH - 5);

  setText(doc, INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(T_BODY);
  doc.text(fields.name || ' ', ML, boxY + boxH - 7);

  setText(doc, MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(T_FOOT);
  const meta = [
    fields.roleLabel,
    fields.at ? fmtDate(fields.at) : null,
    fields.ip || null,
  ].filter(Boolean).join(' · ');
  if (meta) doc.text(meta, ML, boxY + boxH);

  if (fields.pending) {
    setText(doc, WATERMARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('PENDING SIGNATURE', (ML + CR) / 2, boxY + boxH / 2, {
      align: 'center',
      angle: 18,
    });
  }

  s.y = boxY + boxH + 8;
}

function drawSignatures(s) {
  const { agreement } = s;
  if (s.y + 60 > PAGE_H - MB) addPage(s);
  const usIsBiller = agreement?.direction !== SB_DIRECTION.RECEIVED;
  drawSignatureBlock(s, 'SIGNED ON BEHALF OF THE SELF-BILLER',
    signatureFieldsFor(agreement, usIsBiller, 'biller'));
  drawSignatureBlock(s, 'SIGNED ON BEHALF OF THE SELF-BILLEE',
    signatureFieldsFor(agreement, usIsBiller, 'billee'));
}

function drawFooters(doc, generatedAt, agreement) {
  const total = doc.internal.getNumberOfPages();
  const label = `Agreement ${(agreement?.id || '').slice(0, 8)} v${agreement?.version || 1}`;
  const iso   = fmtIso(generatedAt);
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    const footY = PAGE_H - MB / 2;
    setDraw(doc, LINE);
    doc.setLineWidth(0.3);
    doc.line(ML, footY - 4, CR, footY - 4);
    setText(doc, MUTED);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(T_FOOT);
    doc.text(label, ML, footY);
    doc.text(`Page ${i} of ${total}`, PAGE_W / 2, footY, { align: 'center' });
    if (iso) doc.text(`Generated ${iso}`, CR, footY, { align: 'right' });
  }
}

export async function generateSbaPdf({
  agreement,
  ourBusinessProfile,
  orgSettings = null,
  counterpartyName,
  counterpartyAddress,
  counterpartyVat,
  counterpartyIsVatRegistered = true,
  generatedAt = new Date(),
  compress = true,
}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress });
  const parties = resolveParties({
    agreement, ourBusinessProfile, counterpartyName, counterpartyAddress,
    counterpartyVat: counterpartyIsVatRegistered === false ? null : counterpartyVat,
  });

  let logoDataUrl = "";
  if (orgSettings && isLogoEnabled(orgSettings)) {
    logoDataUrl = await resolveLogoDataUrl(getCompanyLogoUrl(orgSettings));
  }
  const state = { doc, page: 1, y: 0, generatedAt, agreement, counterpartyIsVatRegistered, logoDataUrl };

  drawTitleBand(state);
  drawMetaGrid(state);
  drawParties(state, parties);
  drawClauses(state);
  drawSignatures(state);
  drawFooters(doc, generatedAt, agreement);

  return new Uint8Array(doc.output('arraybuffer'));
}