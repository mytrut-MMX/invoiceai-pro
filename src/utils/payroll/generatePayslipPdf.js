/**
 * generatePayslipPdf — renders a PayslipDocument to an A4 PDF and triggers download.
 *
 * Mirrors the invoice PDF generation approach from SendDocumentModal:
 * renders a React component into an off-screen DOM element, then uses
 * html2pdf.js to convert it to a downloadable PDF.
 */

import html2pdf from "html2pdf.js";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import PayslipDocument from "../../components/payroll/PayslipDocument";

/**
 * Generate and download a payslip PDF.
 *
 * @param {object} payslip     - payslips table row
 * @param {object} employee    - employees table row
 * @param {object} payrollRun  - payroll_runs table row
 * @param {object} employer    - { name, payeRef, address, logo? }
 * @param {boolean} showEmployerCopy - include employer costs section
 * @returns {Promise<{ success: boolean, filename?: string, error?: string }>}
 */
export async function generatePayslipPdf(payslip, employee, payrollRun, employer = {}, showEmployerCopy = false) {
  const docId = "payslip-pdf-render-" + Date.now();

  try {
    // Create off-screen container (same technique as SendDocumentModal)
    const container = document.createElement("div");
    container.style.cssText = "position:fixed;left:-9999px;top:0;width:210mm;visibility:hidden;pointer-events:none;overflow:hidden;";
    document.body.appendChild(container);

    // Render PayslipDocument into the container
    const root = createRoot(container);
    root.render(
      createElement(PayslipDocument, {
        payslip,
        employee,
        payrollRun,
        employer,
        showEmployerCopy,
        docId,
      })
    );

    // Wait for React to flush rendering
    await new Promise(r => setTimeout(r, 100));

    const el = document.getElementById(docId);
    if (!el) {
      root.unmount();
      document.body.removeChild(container);
      return { success: false, error: "Failed to render payslip document" };
    }

    // Build filename: Payslip_LastName_YYYY-MM-DD.pdf
    const lastName = (employee?.last_name || "Employee").replace(/[^a-zA-Z0-9_-]/g, "_");
    const periodEnd = (payrollRun?.period_end || "").replace(/[^a-zA-Z0-9_-]/g, "");
    const filename = `Payslip_${lastName}_${periodEnd}.pdf`;

    // Generate PDF with same options as invoice generator
    await html2pdf()
      .set({
        margin: 0,
        filename,
        image: { type: "jpeg", quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(el)
      .save();

    // Cleanup
    root.unmount();
    document.body.removeChild(container);

    return { success: true, filename };
  } catch (err) {
    // Cleanup on error
    try {
      const leftover = document.getElementById(docId)?.closest("div[style*='-9999']");
      if (leftover) document.body.removeChild(leftover);
    } catch { /* ignore */ }

    return { success: false, error: err?.message || "PDF generation failed" };
  }
}
