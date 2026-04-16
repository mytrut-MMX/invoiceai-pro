/**
 * exportCorporationTaxPdf — end-to-end CT600 PDF export.
 *
 * Flow:
 *   1. Auth lookup (fresh, no cache).
 *   2. Fetch the period row (RLS-protected).
 *   3. Fetch business_profiles.org_settings for company name + CRN.
 *   4. Build calc snapshot from the PERSISTED period columns (not a fresh
 *      recompute): the stored snapshot is what the user saved/finalized,
 *      so re-exporting a historical period reproduces that moment in time
 *      regardless of later journal-entry changes.
 *   5. Generate the PDF blob.
 *   6. Upload to Supabase Storage at
 *      `ct-exports/{user_id}/{period_id}/{london-timestamp}.pdf`.
 *   7. Insert an immutable ct_export_log row (HMRC 6-year retention).
 *      Failure at step 7 does NOT void the download: we still return
 *      success with `warning: 'log-insert-failed'`.
 *   8. Trigger a browser download of the same blob.
 *
 * Stages returned on failure: 'auth' | 'period' | 'profile' | 'pdf'
 *                           | 'storage' | 'log'
 *
 * Mirrors sendCISStatement.js's stage/warning contract. No email in Phase 1.
 */

import { supabase } from "../../lib/supabase";
import { generateCorporationTaxPdfBlob } from "./generateCorporationTaxPdf";

/**
 * Format a Date (or instant-string) as YYYY-MM-DDTHH-mm-ss in Europe/London.
 * Used for the Storage path timestamp segment so DST crossings don't shift
 * the surfacing day (mirrors the toIsoDate fix from PR #159).
 */
export function toLondonTimestamp(d = new Date()) {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  // en-GB + explicit parts yields a stable ordered fields set.
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(dt);
  const map = {};
  for (const p of parts) map[p.type] = p.value;
  // Some engines render hour=24 at midnight — normalise to 00.
  const hour = map.hour === "24" ? "00" : map.hour;
  return `${map.year}-${map.month}-${map.day}T${hour}-${map.minute}-${map.second}`;
}

function sanitize(seg) {
  return String(seg || "").replace(/[^a-zA-Z0-9_-]/g, "_");
}

function filenameFor({ company, period }) {
  const name = company?.companyName || company?.name || "Company";
  const periodEnd = period?.period_end
    ? String(period.period_end).slice(0, 10)
    : "";
  return `CT600_${sanitize(name)}_${sanitize(periodEnd)}.pdf`;
}

/**
 * Kick off a browser download of `blob` as `filename`. Safe to call more than
 * once for the same blob.
 */
function triggerDownload(blob, filename) {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revoke on the next tick so Safari has a chance to consume the URL.
    setTimeout(() => { try { URL.revokeObjectURL(url); } catch { /* ignore */ } }, 0);
    return url;
  } catch {
    return null;
  }
}

/**
 * Export a Corporation Tax period as a PDF: renders, uploads, audits, downloads.
 *
 * @param {Object} args
 * @param {string} args.periodId
 * @returns {Promise<
 *   | { success: true, storagePath: string, logId: string|null, filename: string, warning?: string, error?: string }
 *   | { success: false, error: string, stage: 'auth'|'period'|'profile'|'pdf'|'storage'|'log' }
 * >}
 */
export async function exportCorporationTaxPdf({ periodId }) {
  if (!supabase) {
    return { success: false, error: "Supabase not configured", stage: "auth" };
  }
  if (!periodId) {
    return { success: false, error: "periodId is required", stage: "period" };
  }

  // 1. Auth.
  let userId;
  try {
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user?.id) {
      return { success: false, error: authErr?.message || "Not signed in", stage: "auth" };
    }
    userId = authData.user.id;
  } catch (err) {
    return { success: false, error: err?.message || "Auth lookup failed", stage: "auth" };
  }

  // 2. Period (RLS-protected — if it's not ours, we get 'not found').
  let period;
  try {
    const { data, error } = await supabase
      .from("corporation_tax_periods")
      .select("*")
      .eq("id", periodId)
      .single();
    if (error || !data) {
      return { success: false, error: error?.message || "Period not found", stage: "period" };
    }
    period = data;
  } catch (err) {
    return { success: false, error: err?.message || "Period fetch failed", stage: "period" };
  }

  // Guard: draft periods produce numbers that can still change. Exporting
  // them would write an inconsistent snapshot to ct_export_log. The UI
  // disables the dropdown in this state; this throw is defense-in-depth for
  // direct orchestrator calls (e.g. from the browser console).
  if (period.status === "draft") {
    throw new Error("Cannot export a draft period. Finalize it first.");
  }

  // 3. Company (name + CRN) from business_profiles.org_settings.
  let company = {};
  try {
    const { data, error } = await supabase
      .from("business_profiles")
      .select("org_settings")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      return { success: false, error: error.message || "Company profile fetch failed", stage: "profile" };
    }
    const os = data?.org_settings || {};
    company = {
      companyName: os.companyName || os.name || null,
      name: os.name || null,
      crn: os.crn || null,
    };
  } catch (err) {
    return { success: false, error: err?.message || "Company profile fetch failed", stage: "profile" };
  }

  // 4. Use the persisted snapshot — do NOT recompute. Re-exporting a
  //    historical row must reproduce what was saved, even if the underlying
  //    journal entries or rates changed since.
  const calc = {
    accountingProfit: period.accounting_profit,
    disallowableExpenses: period.disallowable_expenses,
    capitalAllowances: period.capital_allowances,
    otherAdjustments: period.other_adjustments,
    associatedCompaniesCount: period.associated_companies_count,
    augmentedProfitsAdjustment: period.augmented_profits_adjustment,
    taxAdjustedProfit: period.tax_adjusted_profit,
    ctRateApplied: period.ct_rate_applied,
    ctEstimated: period.ct_estimated,
    marginalRelief: period.marginal_relief,
    rateBracket: period.rate_bracket,
    warnings: period.rate_bracket === "marginal_zone"
      ? [
          "Marginal relief is not calculated in Phase 1. CT estimated at the " +
            "full main rate (25%); your actual liability may be lower.",
        ]
      : [],
    notes: period.adjustments_notes || null,
  };

  // 5. PDF blob.
  let blob;
  let filename;
  try {
    const pdfRes = await generateCorporationTaxPdfBlob({ company, period, calc });
    if (!pdfRes?.success || !pdfRes.blob) {
      return { success: false, error: pdfRes?.error || "PDF generation failed", stage: "pdf" };
    }
    blob = pdfRes.blob;
    filename = pdfRes.filename || filenameFor({ company, period });
  } catch (err) {
    return { success: false, error: err?.message || "PDF generation failed", stage: "pdf" };
  }

  // 6. Storage upload. Path: {user_id}/{period_id}/{london-timestamp}.pdf
  const timestamp = toLondonTimestamp(new Date());
  const storagePath = `${userId}/${periodId}/${timestamp}.pdf`;
  try {
    const { error: uploadErr } = await supabase.storage
      .from("ct-exports")
      .upload(storagePath, blob, {
        contentType: "application/pdf",
        upsert: false,
      });
    if (uploadErr) {
      return { success: false, error: uploadErr.message || "Storage upload failed", stage: "storage" };
    }
  } catch (err) {
    return { success: false, error: err?.message || "Storage upload failed", stage: "storage" };
  }

  // 7. Audit log insert. Failure here does NOT void the download.
  let logId = null;
  let logWarning = null;
  let logWarningMsg = null;
  try {
    const { data: logRow, error: logErr } = await supabase
      .from("ct_export_log")
      .insert({
        user_id: userId,
        period_id: periodId,
        export_type: "pdf",
        storage_path: storagePath,
        period_start: period.period_start,
        period_end: period.period_end,
        accounting_profit: period.accounting_profit,
        disallowable_expenses: period.disallowable_expenses,
        capital_allowances: period.capital_allowances,
        other_adjustments: period.other_adjustments,
        tax_adjusted_profit: period.tax_adjusted_profit,
        ct_rate_applied: period.ct_rate_applied,
        ct_estimated: period.ct_estimated,
        rate_bracket: period.rate_bracket,
      })
      .select("id")
      .single();
    if (logErr) {
      logWarning = "log-insert-failed";
      logWarningMsg = logErr.message;
      console.warn("[ct-export] PDF uploaded but log insert failed:", logErr.message);
    } else {
      logId = logRow?.id || null;
    }
  } catch (err) {
    logWarning = "log-insert-failed";
    logWarningMsg = err?.message || "Log insert failed";
    console.warn("[ct-export] PDF uploaded but log insert threw:", logWarningMsg);
  }

  // 8. Download — fire after Storage + audit so the user sees the final
  //    committed state. Still fires if audit warned (download is the
  //    primary UX; audit is best-effort).
  triggerDownload(blob, filename);

  if (logWarning) {
    return {
      success: true,
      warning: logWarning,
      error: logWarningMsg,
      storagePath,
      logId: null,
      filename,
    };
  }
  return { success: true, storagePath, logId, filename };
}
