/**
 * aggregatePdsData — group paid, CIS-deducted bills by subcontractor for a tax
 * month, producing the per-supplier rows rendered on the PDS page and PDF.
 *
 * Shape assumptions (see rowToBill / rowToSupplier in src/lib/dataAccess.js):
 *   bills: { id, status, paid_date, supplier_id, labour_amount, materials_amount,
 *           cis_deduction, cis_rate_at_posting, cis_verification_at_posting, ... }
 *   suppliers: { id, name, utr, email,
 *                cis: { is_subcontractor, verification_number, rate } }
 *   Some call-sites may pass the raw DB row shape (is_cis_subcontractor,
 *   cis_verification_number, cis_rate) — both are tolerated.
 */

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function supplierIsCis(s) {
  if (!s) return false;
  if (s.cis && typeof s.cis === "object") return !!s.cis.is_subcontractor;
  return !!s.is_cis_subcontractor;
}

function supplierVerification(s) {
  if (!s) return null;
  if (s.cis && typeof s.cis === "object") return s.cis.verification_number || null;
  return s.cis_verification_number || null;
}

function supplierRate(s) {
  if (!s) return null;
  if (s.cis && typeof s.cis === "object") return s.cis.rate || null;
  return s.cis_rate || null;
}

function supplierToOut(s) {
  if (!s) return null;
  return {
    id: s.id,
    name: s.name,
    utr: s.utr || null,
    email: s.email || null,
    cis_verification_number: supplierVerification(s),
    cis_rate: supplierRate(s),
    is_cis_subcontractor: supplierIsCis(s),
  };
}

function inRange(paidDate, start, end) {
  if (!paidDate) return false;
  const t = new Date(paidDate).getTime();
  if (!Number.isFinite(t)) return false;
  return t >= new Date(start).getTime() && t <= new Date(end).getTime();
}

/**
 * Aggregate CIS-deducted paid bills by supplier for a given tax period.
 * @param {object} params
 * @param {object[]} params.bills
 * @param {object[]} params.suppliers
 * @param {Date|string} params.period_start
 * @param {Date|string} params.period_end
 * @returns {Array<object>}
 */
export function aggregatePdsData({ bills, suppliers, period_start, period_end }) {
  const supplierById = new Map();
  for (const s of suppliers || []) {
    if (s?.id) supplierById.set(s.id, s);
  }

  const groups = new Map();

  for (const b of bills || []) {
    if (!b) continue;
    if (b.status !== "Paid") continue;
    if (!inRange(b.paid_date, period_start, period_end)) continue;
    if (num(b.cis_deduction) <= 0) continue;
    if (!b.supplier_id) continue;

    const supplier = supplierById.get(b.supplier_id);
    if (!supplier) continue;
    if (!supplierIsCis(supplier)) continue;

    const labour = num(b.labour_amount);
    const materials = num(b.materials_amount);
    const gross = labour + materials; // ex-VAT
    const deducted = num(b.cis_deduction);

    let g = groups.get(b.supplier_id);
    if (!g) {
      g = {
        supplier: supplierToOut(supplier),
        cis_rate_used: b.cis_rate_at_posting || supplierRate(supplier) || null,
        verification_number: b.cis_verification_at_posting || supplierVerification(supplier) || null,
        gross_amount: 0,
        materials_amount: 0,
        labour_amount: 0,
        cis_deducted: 0,
        bill_ids: [],
        bill_count: 0,
      };
      groups.set(b.supplier_id, g);
    }

    g.gross_amount += gross;
    g.materials_amount += materials;
    g.labour_amount += labour;
    g.cis_deducted += deducted;
    g.bill_ids.push(b.id);
    g.bill_count += 1;
  }

  const rows = Array.from(groups.values());
  rows.sort((a, b) => (a.supplier?.name || "").localeCompare(b.supplier?.name || ""));
  return rows;
}
