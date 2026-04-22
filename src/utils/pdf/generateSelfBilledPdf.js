// generateSelfBilledPdf — HMRC VAT Notice 700/62 self-billed invoice PDF.
// Pure: input → Uint8Array. No Supabase, no DOM, no fetch.
//
// Role swap (vs. a normal sales invoice):
//   Normal: "From" = us (seller), "Bill To" = customer (buyer).
//   Self-bill: "From" = supplier (they remain the legal seller),
//              "Bill To" = us (we are the buyer issuing the bill).
// Reversing this is the single most common self-bill template defect; the
// parties are resolved once in drawParties() and never toggled elsewhere.
//
// Non-removable elements (never conditional):
//   • Title band — SELF_BILL_MARKER_TITLE centered.
//   • VAT statement panel — SELF_BILL_VAT_STATEMENT when supplier VAT-valid,
//     SELF_BILL_VAT_STATEMENT_NON_VAT_SUPPLIER otherwise.
//   • Agreement reference — agreement id prefix + version + validity window.

import jsPDF from 'jspdf';
import {
  SELF_BILL_MARKER_TITLE,
  SELF_BILL_VAT_STATEMENT,
  SELF_BILL_VAT_STATEMENT_NON_VAT_SUPPLIER,
} from '../../constants/selfBilling.js';

const PRESERVE = Object.freeze([
  SELF_BILL_MARKER_TITLE, SELF_BILL_VAT_STATEMENT, SELF_BILL_VAT_STATEMENT_NON_VAT_SUPPLIER,
]);
function preserveMarkers(body) {
  let out = String(body || '');
  for (const m of PRESERVE) if (m && out.includes(m)) out = out.split(m).join(`\n${m}\n`);
  return out.replace(/\n+/g, '\n').replace(/^\n/, '');
}

const PAGE_W = 210, PAGE_H = 297, ML = 21, MR = 21, MT = 34, MB = 21;
const CR = PAGE_W - MR, CONTENT_W = CR - ML;
const T_TITLE = 21, T_H = 13, T_BODY = 10, T_FOOT = 8, PT = 0.3528;
const lh = (pt) => pt * 1.618 * PT;
const BRAND = [30, 107, 224], INK = [26, 26, 26], BODY = [85, 85, 85];
const MUTED = [107, 107, 107], LINE = [225, 225, 225], STRIPE = [248, 248, 248];
const setFill = (d, c) => d.setFillColor(c[0], c[1], c[2]);
const setText = (d, c) => d.setTextColor(c[0], c[1], c[2]);
const setDraw = (d, c) => d.setDrawColor(c[0], c[1], c[2]);

const money = (v) => `\u00A3${Number(v || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (v) => {
  if (!v) return '\u2014';
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? '\u2014' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};
const iso = (v) => {
  if (!v) return '';
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};
const addr = (p) => !p ? [] : [p.street, [p.city, p.postcode].filter(Boolean).join(' '), p.country].filter(Boolean);
const addPage = (s) => { s.doc.addPage(); s.page += 1; s.y = MT; };
const ensure = (s, n) => { if (s.y + n > PAGE_H - MB) addPage(s); };

function drawTitleBand(s) {
  const { doc } = s;
  setFill(doc, BRAND); doc.rect(0, 0, PAGE_W, 5, 'F');
  setText(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(T_TITLE);
  doc.text(preserveMarkers(SELF_BILL_MARKER_TITLE), PAGE_W / 2, 22, { align: 'center' });
  s.y = MT;
}

function drawIssuer(s) {
  const { doc, ourBusinessProfile: our } = s;
  setText(doc, MUTED); doc.setFont('helvetica', 'bold'); doc.setFontSize(T_FOOT);
  doc.text(`ISSUED BY ${(our?.orgName || our?.name || 'Issuer').toUpperCase()}`, ML, s.y + lh(T_FOOT));
  s.y += lh(T_FOOT) + 4;
}

function drawParties(s) {
  const { doc, supplier, ourBusinessProfile: our } = s;
  const colW = (CONTENT_W - 6) / 2, rightX = ML + colW + 6;
  const sup = [
    supplier?.name || 'Supplier',
    supplier?.legal_name && supplier.legal_name !== supplier?.name ? supplier.legal_name : null,
    ...addr(supplier?.billingAddress),
    `VAT: ${supplier?.vat_number || 'Not VAT registered'}`,
  ].filter(Boolean);
  const us = [
    our?.orgName || our?.name || 'Your Company',
    ...addr(our),
    (our?.vatNumber || our?.vatNum) ? `VAT: ${our.vatNumber || our.vatNum}` : null,
    our?.email || null,
  ].filter(Boolean);
  const col = (x, label, lines) => {
    let y = s.y;
    setText(doc, MUTED); doc.setFont('helvetica', 'bold'); doc.setFontSize(T_FOOT);
    doc.text(label, x, y + lh(T_FOOT)); y += lh(T_FOOT) + 1;
    lines.forEach((ln, i) => {
      setText(doc, i === 0 ? INK : BODY);
      doc.setFont('helvetica', i === 0 ? 'bold' : 'normal'); doc.setFontSize(T_BODY);
      doc.text(String(ln), x, y + lh(T_BODY)); y += lh(T_BODY);
    });
    return y;
  };
  s.y = Math.max(col(ML, 'FROM (SUPPLIER)', sup), col(rightX, 'BILL TO (SELF-BILLER)', us)) + 4;
}

function drawMeta(s) {
  const { doc, bill } = s;
  const pairs = [
    ['Self-Bill No.', bill?.self_bill_invoice_number || '\u2014'],
    ['Issue Date', date(bill?.issueDate)],
    ['Supply Date', date(bill?.supplyDate)],
    ['Tax Point', date(bill?.taxPoint)],
    ['Due Date', date(bill?.dueDate)],
  ];
  const cellW = CONTENT_W / pairs.length, y = s.y;
  pairs.forEach((p, i) => {
    const x = ML + i * cellW;
    setText(doc, MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(T_FOOT);
    doc.text(p[0], x, y + lh(T_FOOT));
    setText(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(T_BODY);
    doc.text(String(p[1]), x, y + lh(T_FOOT) + lh(T_BODY));
  });
  s.y = y + lh(T_FOOT) + lh(T_BODY) + 4;
  setDraw(doc, LINE); doc.setLineWidth(0.3); doc.line(ML, s.y, CR, s.y); s.y += 3;
}

const ITEM_COLS = [
  { key: 'description', w: 0.36, a: 'left',  label: 'Description' },
  { key: 'quantity',    w: 0.08, a: 'right', label: 'Qty' },
  { key: 'rate',        w: 0.13, a: 'right', label: 'Rate' },
  { key: 'net',         w: 0.15, a: 'right', label: 'Net' },
  { key: 'vatRate',     w: 0.08, a: 'right', label: 'VAT %' },
  { key: 'vat',         w: 0.10, a: 'right', label: 'VAT' },
  { key: 'total',       w: 0.10, a: 'right', label: 'Total' },
];

function drawItems(s) {
  const { doc, bill } = s;
  const items = Array.isArray(bill?.lineItems) ? bill.lineItems : [];
  const widths = ITEM_COLS.map((c) => c.w * CONTENT_W);
  const xs = []; let cx = ML;
  ITEM_COLS.forEach((_, i) => { xs.push(cx); cx += widths[i]; });
  const pad = 2;
  const drawHead = () => {
    setFill(doc, BRAND); doc.rect(ML, s.y, CONTENT_W, 7, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(T_FOOT); doc.setTextColor(255, 255, 255);
    ITEM_COLS.forEach((c, i) => {
      const tx = c.a === 'right' ? xs[i] + widths[i] - pad : xs[i] + pad;
      doc.text(c.label, tx, s.y + lh(T_FOOT) + 1.5, c.a === 'right' ? { align: 'right' } : undefined);
    });
    s.y += 7;
  };
  drawHead();
  items.forEach((it, idx) => {
    const rowH = Math.max(lh(T_BODY) + 2, 6.5);
    if (s.y + rowH > PAGE_H - MB - 60) { addPage(s); drawHead(); }
    if (idx % 2 === 0) { setFill(doc, STRIPE); doc.rect(ML, s.y, CONTENT_W, rowH, 'F'); }
    const qty = Number(it.quantity) || 0, rate = Number(it.rate) || 0;
    const net = it.lineNet != null ? Number(it.lineNet) : qty * rate;
    const vat = it.lineTax != null ? Number(it.lineTax) : 0;
    const rt = Number(it.taxRate) || 0;
    const vals = {
      description: String(it.description || '').slice(0, 60),
      quantity: String(qty), rate: money(rate), net: money(net),
      vatRate: `${rt}%`, vat: money(vat), total: money(net + vat),
    };
    ITEM_COLS.forEach((c, i) => {
      const tx = c.a === 'right' ? xs[i] + widths[i] - pad : xs[i] + pad;
      setText(doc, c.key === 'total' ? INK : BODY);
      doc.setFont('helvetica', c.key === 'total' ? 'bold' : 'normal'); doc.setFontSize(T_BODY);
      doc.text(vals[c.key], tx, s.y + lh(T_BODY), c.a === 'right' ? { align: 'right' } : undefined);
    });
    s.y += rowH;
  });
  s.y += 3;
}

function drawVatBreakdown(s) {
  const { doc, bill } = s;
  const b = Array.isArray(bill?.breakdown) ? bill.breakdown : [];
  if (!bill?.vatIncluded || b.length <= 1) return;
  ensure(s, lh(T_FOOT) + b.length * lh(T_BODY) + 6);
  setText(doc, MUTED); doc.setFont('helvetica', 'bold'); doc.setFontSize(T_FOOT);
  doc.text('VAT BREAKDOWN', ML, s.y + lh(T_FOOT)); s.y += lh(T_FOOT) + 1;
  b.forEach((row) => {
    setText(doc, BODY); doc.setFont('helvetica', 'normal'); doc.setFontSize(T_BODY);
    doc.text(`At ${row.rate}%`, ML, s.y + lh(T_BODY));
    doc.text(money(row.taxableAmount), ML + 70, s.y + lh(T_BODY), { align: 'right' });
    doc.text(money(row.taxAmount), ML + 110, s.y + lh(T_BODY), { align: 'right' });
    s.y += lh(T_BODY);
  });
  s.y += 3;
}

function drawCis(s) {
  const { doc, bill } = s, cis = bill?.cis;
  if (!cis || !(Number(cis.labour) > 0 || Number(cis.materials) > 0 || Number(cis.deduction) > 0)) return;
  ensure(s, lh(T_FOOT) + lh(T_BODY) * 3 + 6);
  setText(doc, MUTED); doc.setFont('helvetica', 'bold'); doc.setFontSize(T_FOOT);
  doc.text('CIS BREAKDOWN', ML, s.y + lh(T_FOOT)); s.y += lh(T_FOOT) + 1;
  const rows = [
    ['Labour', money(cis.labour)],
    ['Materials', money(cis.materials)],
    [`CIS deduction${cis.rateLabel ? ` (${cis.rateLabel})` : ''}`, `\u2212 ${money(cis.deduction)}`],
  ];
  rows.forEach(([l, v]) => {
    setText(doc, BODY); doc.setFont('helvetica', 'normal'); doc.setFontSize(T_BODY);
    doc.text(l, ML, s.y + lh(T_BODY));
    setText(doc, INK); doc.setFont('helvetica', 'bold');
    doc.text(v, CR, s.y + lh(T_BODY), { align: 'right' });
    s.y += lh(T_BODY);
  });
  s.y += 3;
}

function drawTotals(s) {
  const { doc, bill } = s;
  const rows = [
    ['Subtotal', money(bill?.netAmount)],
    ['VAT', money(bill?.taxAmount)],
    ['Total', money(bill?.totalAmount)],
    ...(Number(bill?.cisDeduction) > 0 ? [['CIS Deduction', `\u2212 ${money(bill.cisDeduction)}`]] : []),
    ['Amount Payable', money(bill?.amountPayable)],
  ];
  ensure(s, rows.length * lh(T_H) + 6);
  const labelX = CR - 80;
  rows.forEach(([l, v], i) => {
    const isFinal = i === rows.length - 1, size = isFinal ? T_H : T_BODY;
    setText(doc, isFinal ? INK : MUTED);
    doc.setFont('helvetica', isFinal ? 'bold' : 'normal'); doc.setFontSize(size);
    doc.text(l, labelX, s.y + lh(size));
    setText(doc, INK); doc.setFont('helvetica', 'bold');
    doc.text(v, CR, s.y + lh(size), { align: 'right' });
    s.y += lh(size);
  });
  s.y += 4;
}

function drawVatStatement(s) {
  const { doc, supplier } = s;
  const invalid = new Set(['invalid', 'deregistered', 'unchecked']);
  const vatValid = supplier?.vat_status === 'valid'
    || (supplier?.vat_number && !invalid.has(supplier?.vat_status));
  const stmt = vatValid ? SELF_BILL_VAT_STATEMENT : SELF_BILL_VAT_STATEMENT_NON_VAT_SUPPLIER;
  const panelH = 16;
  ensure(s, panelH + 4);
  setDraw(doc, BRAND); doc.setLineWidth(0.6);
  doc.rect(ML, s.y, CONTENT_W, panelH, 'S');
  setText(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  const lines = doc.splitTextToSize(preserveMarkers(stmt), CONTENT_W - 8);
  let ty = s.y + 6;
  lines.forEach((ln) => { doc.text(ln, ML + 4, ty); ty += lh(11); });
  s.y += panelH + 3;
}

function drawAgreementRef(s) {
  const { doc, agreement: a } = s;
  ensure(s, lh(T_FOOT) + 2);
  setText(doc, MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(T_FOOT);
  const id = String(a?.id || '').slice(0, 8), v = a?.version ?? 1;
  doc.text(
    `Issued under Self-Billing Agreement ${id} v${v}, valid ${date(a?.start_date)} to ${date(a?.end_date)}.`,
    ML, s.y + lh(T_FOOT),
  );
  s.y += lh(T_FOOT) + 2;
}

function drawFooters(doc, generatedAt, a) {
  const total = doc.internal.getNumberOfPages();
  const label = `Agreement ${(a?.id || '').slice(0, 8)} v${a?.version || 1}`;
  const stamp = iso(generatedAt);
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    const footY = PAGE_H - MB / 2;
    setDraw(doc, LINE); doc.setLineWidth(0.3); doc.line(ML, footY - 4, CR, footY - 4);
    setText(doc, MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(T_FOOT);
    doc.text(label, ML, footY);
    doc.text(`Page ${i} of ${total}`, PAGE_W / 2, footY, { align: 'center' });
    if (stamp) doc.text(`Generated ${stamp}`, CR, footY, { align: 'right' });
  }
}

export function generateSelfBilledPdf({
  bill, supplier, ourBusinessProfile, agreement,
  generatedAt = new Date(), compress = true,
}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress });
  const s = { doc, page: 1, y: 0, bill, supplier, ourBusinessProfile, agreement, generatedAt };
  drawTitleBand(s);
  drawIssuer(s);
  drawParties(s);
  drawMeta(s);
  drawItems(s);
  drawVatBreakdown(s);
  drawCis(s);
  drawTotals(s);
  drawVatStatement(s);
  drawAgreementRef(s);
  drawFooters(doc, generatedAt, agreement);
  return new Uint8Array(doc.output('arraybuffer'));
}