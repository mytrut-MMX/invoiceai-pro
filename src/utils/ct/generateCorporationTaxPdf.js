/**
 * generateCorporationTaxPdf — render a CT600 Corporation Tax estimate to an
 * A4 PDF Blob.
 *
 * Mirrors generateCISStatementPdf.js: builds an off-screen DOM element, then
 * html2pdf converts it to a Blob via `.outputPdf("blob")`. The caller owns
 * the download/upload lifecycle (see exportCorporationTaxPdf.js).
 *
 * Note: this is an ESTIMATE produced from user-supplied adjustments. It is
 * not a CT600 submission. See the disclaimer footer rendered into the PDF.
 */

const ff = "'Inter', 'Lato', 'DM Sans', 'Helvetica Neue', sans-serif";
const mono = "'Courier New', monospace";

const C = {
  heading: "#1a1a2e",
  body: "#374151",
  muted: "#6b7280",
  faint: "#9ca3af",
  border: "#e2e8f0",
  lightBg: "#f8fafc",
  accent: "#1e6be0",
  positive: "#16a34a",
  warning: "#92400e",
  warningBg: "#fffbeb",
  warningBorder: "#fde68a",
};

const BRACKET_BADGE = {
  loss:          { label: "Loss — no CT",                    bg: "#f3f4f6", fg: "#374151", border: "#d1d5db" },
  small:         { label: "Small profits rate (19%)",         bg: "#f0fdf4", fg: "#166534", border: "#bbf7d0" },
  marginal_zone: { label: "Marginal zone (using main rate)",  bg: "#fffbeb", fg: "#92400e", border: "#fde68a" },
  main:          { label: "Main rate (25%)",                  bg: "#eff6ff", fg: "#1d4ed8", border: "#bfdbfe" },
};

const GBP0 = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 0, maximumFractionDigits: 0 });
const GBP2 = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtGbp0 = (v) => (v == null || v === "" ? "—" : GBP0.format(Number(v)));
const fmtGbp2 = (v) => (v == null || v === "" ? "—" : GBP2.format(Number(v)));

function fmtDate(d) {
  if (!d) return "—";
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeSeg(seg) {
  return String(seg || "").replace(/[^a-zA-Z0-9_-]/g, "_");
}

function filenameFor({ company, period }) {
  const name = company?.companyName || company?.name || "Company";
  const dateIso = period?.period_end
    ? new Date(period.period_end).toISOString().split("T")[0]
    : "";
  return `CT600_${sanitizeSeg(name)}_${sanitizeSeg(dateIso)}.pdf`;
}

function pdfOptions(filename) {
  return {
    margin: 0,
    filename,
    image: { type: "jpeg", quality: 0.95 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  };
}

function renderHtml({ company, period, calc }) {
  const bracket = BRACKET_BADGE[calc?.rateBracket] || null;
  const warnings = Array.isArray(calc?.warnings) ? calc.warnings : [];

  const thStyle = `padding:10px 12px;font-size:10px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:0.06em;border-bottom:1.5px solid ${C.border};text-align:left;`;
  const thRight = thStyle + "text-align:right;";
  const tdLabel = `padding:10px 12px;font-size:12px;color:${C.body};border-bottom:1px solid #f1f5f9;`;
  const tdVal = tdLabel + `text-align:right;font-variant-numeric:tabular-nums;font-weight:600;color:${C.heading};`;
  const tdTotalLabel = `padding:12px;font-size:13px;font-weight:800;color:${C.heading};border-top:2px solid ${C.border};border-bottom:2px solid ${C.border};background:${C.lightBg};`;
  const tdTotalVal = tdTotalLabel + `text-align:right;font-variant-numeric:tabular-nums;`;
  const tdCtLabel = `padding:12px;font-size:13px;font-weight:800;color:${C.positive};border-bottom:2px solid ${C.border};`;
  const tdCtVal = tdCtLabel + `text-align:right;font-variant-numeric:tabular-nums;font-size:15px;`;

  const associatedCount = Number(calc?.associatedCompaniesCount) || 0;
  const augmentedAdj = Number(calc?.augmentedProfitsAdjustment) || 0;
  const marginalRelief = Number(calc?.marginalRelief) || 0;
  const lossIn = Number(period?.loss_carried_forward_in) || 0;
  const taxAdjProfit = Number(calc?.taxAdjustedProfit) || 0;
  const lossUsed = lossIn > 0 && taxAdjProfit > 0 ? Math.min(lossIn, taxAdjProfit) : 0;

  return `
    <div style="width:210mm;min-height:297mm;padding:18mm 16mm;font-family:${ff};color:${C.body};background:#fff;box-sizing:border-box;">

      <!-- HEADER -->
      <div style="border-bottom:2px solid ${C.heading};padding-bottom:14px;margin-bottom:20px;">
        <div style="font-size:22px;font-weight:800;color:${C.heading};letter-spacing:0.02em;">
          Corporation Tax Estimate
        </div>
        <div style="font-size:11px;color:${C.muted};margin-top:4px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">
          CT600 — draft for accountant review
        </div>
      </div>

      <!-- COMPANY + PERIOD META -->
      <div style="display:flex;justify-content:space-between;gap:20px;margin-bottom:22px;">
        <div style="flex:1;">
          <div style="font-size:10px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Company</div>
          <div style="font-size:13px;font-weight:700;color:${C.heading};">${esc(company?.companyName || company?.name || "—")}</div>
          <div style="font-size:11px;color:${C.body};margin-top:4px;">
            CRN: <span style="font-family:${mono};font-weight:600;color:${C.heading};">${esc(company?.crn || "—")}</span>
          </div>
        </div>
        <div style="text-align:right;min-width:220px;">
          <div style="font-size:10px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Accounting period</div>
          <div style="font-size:11px;color:${C.body};">
            Start: <strong style="color:${C.heading};">${fmtDate(period?.period_start)}</strong>
          </div>
          <div style="font-size:11px;color:${C.body};margin-top:2px;">
            End: <strong style="color:${C.heading};">${fmtDate(period?.period_end)}</strong>
          </div>
          <div style="font-size:11px;color:${C.body};margin-top:2px;">
            Payment due: <strong style="color:${C.heading};">${fmtDate(period?.payment_due_date)}</strong>
          </div>
          <div style="font-size:11px;color:${C.body};margin-top:2px;">
            Filing due: <strong style="color:${C.heading};">${fmtDate(period?.filing_due_date)}</strong>
          </div>
        </div>
      </div>

      <!-- BRACKET BADGE -->
      ${bracket ? `
      <div style="margin-bottom:20px;">
        <span style="display:inline-block;padding:6px 14px;border-radius:999px;background:${bracket.bg};color:${bracket.fg};border:1px solid ${bracket.border};font-size:11px;font-weight:700;letter-spacing:0.02em;">
          ${esc(bracket.label)}
        </span>
      </div>` : ""}

      <!-- COMPUTATION TABLE -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:22px;">
        <thead>
          <tr>
            <th style="${thStyle}">Computation</th>
            <th style="${thRight}">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="${tdLabel}">Accounting profit</td>
            <td style="${tdVal}">${fmtGbp2(calc?.accountingProfit)}</td>
          </tr>
          <tr>
            <td style="${tdLabel}">+ Disallowable expenses</td>
            <td style="${tdVal}">${fmtGbp2(calc?.disallowableExpenses)}</td>
          </tr>
          <tr>
            <td style="${tdLabel}">− Capital allowances</td>
            <td style="${tdVal}">${fmtGbp2(calc?.capitalAllowances)}</td>
          </tr>
          <tr>
            <td style="${tdLabel}">± Other adjustments</td>
            <td style="${tdVal}">${fmtGbp2(calc?.otherAdjustments)}</td>
          </tr>
          ${associatedCount > 0 ? `
          <tr>
            <td style="${tdLabel}">Associated companies</td>
            <td style="${tdVal}">${associatedCount}</td>
          </tr>` : ""}
          ${augmentedAdj > 0 ? `
          <tr>
            <td style="${tdLabel}">Augmented profits adjustment</td>
            <td style="${tdVal}">${fmtGbp2(augmentedAdj)}</td>
          </tr>` : ""}
          ${lossIn > 0 ? `
          <tr>
            <td style="${tdLabel}">Losses brought forward</td>
            <td style="${tdVal}">${fmtGbp2(lossIn)}</td>
          </tr>` : ""}
          <tr>
            <td style="${tdTotalLabel}">= Tax-adjusted profit</td>
            <td style="${tdTotalVal}">${fmtGbp2(calc?.taxAdjustedProfit)}</td>
          </tr>
          <tr>
            <td style="${tdLabel}">CT rate applied</td>
            <td style="${tdVal}">${calc?.ctRateApplied == null ? "—" : `${calc.ctRateApplied}%`}</td>
          </tr>
          ${lossUsed > 0 ? `
          <tr>
            <td style="${tdLabel}">Loss relief applied</td>
            <td style="${tdVal}">−${fmtGbp0(lossUsed)}</td>
          </tr>` : ""}
          ${marginalRelief > 0 ? `
          <tr>
            <td style="${tdLabel}">Marginal relief</td>
            <td style="${tdVal}">−${fmtGbp0(marginalRelief)}</td>
          </tr>` : ""}
          <tr>
            <td style="${tdCtLabel}">Estimated Corporation Tax</td>
            <td style="${tdCtVal}">${fmtGbp0(calc?.ctEstimated)}</td>
          </tr>
        </tbody>
      </table>

      ${warnings.length > 0 ? `
      <div style="background:${C.warningBg};border:1px solid ${C.warningBorder};border-radius:8px;padding:12px 14px;margin-bottom:20px;">
        <div style="font-size:11px;font-weight:700;color:${C.warning};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Warnings</div>
        ${warnings.map((w) => `<div style="font-size:12px;color:${C.warning};line-height:1.5;margin-top:4px;">⚠ ${esc(w)}</div>`).join("")}
      </div>` : ""}

      ${calc?.notes ? `
      <div style="margin-bottom:20px;">
        <div style="font-size:10px;font-weight:700;color:${C.muted};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Notes</div>
        <div style="font-size:12px;color:${C.body};line-height:1.5;white-space:pre-wrap;">${esc(calc.notes)}</div>
      </div>` : ""}

      <!-- DISCLAIMER -->
      <div style="margin-top:28px;padding:12px 14px;background:${C.lightBg};border:1px solid ${C.border};border-radius:8px;">
        <div style="font-size:11px;color:${C.body};line-height:1.55;">
          <strong style="color:${C.heading};">Disclaimer.</strong>
          This is an estimate generated by InvoiceSaga based on inputs provided.
          It is not a CT600 tax return. Consult your accountant before submission to HMRC.
        </div>
      </div>

      <!-- FOOTER -->
      <div style="margin-top:20px;padding-top:12px;border-top:1px solid ${C.border};">
        <div style="font-size:9px;color:${C.faint};line-height:1.5;">
          Generated on ${fmtDate(new Date())} for accountant review.
        </div>
      </div>
    </div>
  `;
}

async function withRenderedDoc({ company, period, calc }, worker) {
  const container = document.createElement("div");
  container.style.cssText =
    "position:fixed;left:-9999px;top:0;width:210mm;visibility:hidden;pointer-events:none;overflow:hidden;";
  container.innerHTML = renderHtml({ company, period, calc });
  document.body.appendChild(container);

  try {
    // Give layout a tick to settle (matches CIS pattern).
    await new Promise((r) => setTimeout(r, 50));
    const el = container.firstElementChild;
    if (!el) {
      return { success: false, error: "Failed to render Corporation Tax document" };
    }
    return await worker(el);
  } finally {
    try { if (container.parentNode) container.parentNode.removeChild(container); } catch { /* ignore */ }
  }
}

/**
 * Generate the CT estimate PDF as a Blob. Caller handles download + upload.
 *
 * @param {Object} args
 * @param {{ companyName?: string, name?: string, crn?: string }} args.company
 * @param {{ period_start, period_end, payment_due_date, filing_due_date }} args.period
 * @param {{
 *   accountingProfit, disallowableExpenses, capitalAllowances, otherAdjustments,
 *   taxAdjustedProfit, ctRateApplied, ctEstimated, rateBracket, warnings?, notes?
 * }} args.calc
 * @returns {Promise<{ success: true, filename: string, blob: Blob } | { success: false, error: string }>}
 */
export async function generateCorporationTaxPdfBlob({ company, period, calc }) {
  try {
    const filename = filenameFor({ company, period });
    const { default: html2pdf } = await import("html2pdf.js");
    return await withRenderedDoc({ company, period, calc }, async (el) => {
      const blob = await html2pdf().set(pdfOptions(filename)).from(el).outputPdf("blob");
      return { success: true, filename, blob };
    });
  } catch (err) {
    return { success: false, error: err?.message || "PDF generation failed" };
  }
}
