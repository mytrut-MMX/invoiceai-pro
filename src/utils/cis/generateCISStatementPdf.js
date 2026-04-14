/**
 * generateCISStatementPdf — render a CISStatementDocument to an A4 PDF.
 *
 * Mirrors generatePayslipPdf.js: renders the React document into an off-screen
 * DOM element, then html2pdf converts it to either a downloaded file (.save)
 * or a Blob (.outputPdf("blob")) for ZIP bundling.
 */

import html2pdf from "html2pdf.js";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import CISStatementDocument from "../../components/cis/CISStatementDocument";

function sanitize(seg) {
  return String(seg || "").replace(/[^a-zA-Z0-9_-]/g, "_");
}

function filenameFor({ subcontractor, period }) {
  const name = subcontractor?.name || "Subcontractor";
  const parts = name.trim().split(/\s+/);
  const last = parts.length > 1 ? parts[parts.length - 1] : name;
  const dateIso = period?.period_end
    ? new Date(period.period_end).toISOString().split("T")[0]
    : "";
  return `CIS_PDS_${sanitize(last)}_${sanitize(dateIso)}.pdf`;
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

/**
 * Shared: mount CISStatementDocument off-screen and run a worker fn against
 * the resulting element. Caller decides whether to call .save() or .outputPdf().
 */
async function withRenderedDoc({ contractor, subcontractor, period, amounts }, worker) {
  const docId = "cis-pds-pdf-render-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-9999px;top:0;width:210mm;visibility:hidden;pointer-events:none;overflow:hidden;";
  document.body.appendChild(container);

  const root = createRoot(container);
  try {
    root.render(
      createElement(CISStatementDocument, {
        contractor,
        subcontractor,
        period,
        amounts,
        docId,
      })
    );

    // Give React a tick to flush.
    await new Promise((r) => setTimeout(r, 100));

    const el = document.getElementById(docId);
    if (!el) {
      return { success: false, error: "Failed to render CIS statement document" };
    }
    return await worker(el);
  } finally {
    try { root.unmount(); } catch { /* ignore */ }
    try { if (container.parentNode) container.parentNode.removeChild(container); } catch { /* ignore */ }
  }
}

/**
 * Download a single PDS as a PDF.
 * @returns {Promise<{ success: boolean, filename?: string, error?: string }>}
 */
export async function generateCISStatementPdf({ contractor, subcontractor, period, amounts }) {
  try {
    const filename = filenameFor({ subcontractor, period });
    return await withRenderedDoc({ contractor, subcontractor, period, amounts }, async (el) => {
      await html2pdf().set(pdfOptions(filename)).from(el).save();
      return { success: true, filename };
    });
  } catch (err) {
    return { success: false, error: err?.message || "PDF generation failed" };
  }
}

/**
 * Produce a PDS PDF as a Blob (no download). Used by bulk ZIP path.
 * @returns {Promise<{ success: boolean, filename?: string, blob?: Blob, error?: string }>}
 */
export async function generateCISStatementBlob({ contractor, subcontractor, period, amounts }) {
  try {
    const filename = filenameFor({ subcontractor, period });
    return await withRenderedDoc({ contractor, subcontractor, period, amounts }, async (el) => {
      const blob = await html2pdf().set(pdfOptions(filename)).from(el).outputPdf("blob");
      return { success: true, filename, blob };
    });
  } catch (err) {
    return { success: false, error: err?.message || "PDF generation failed" };
  }
}
