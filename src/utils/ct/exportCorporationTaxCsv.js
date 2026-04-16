/**
 * exportCorporationTaxCsv — end-to-end CT600 CSV export.
 *
 * Mirrors exportCorporationTaxPdf.js 1:1, differing only in:
 *   - builder called (flat vs detailed CSV instead of PDF)
 *   - audit log export_type ('csv-flat' | 'csv-detailed' instead of 'pdf')
 *   - storage path extension (.csv) and content type (text/csv;charset=utf-8)
 *   - filename convention (date-based, no company name fetch needed)
 *
 * The persisted period snapshot is the source of truth — re-exporting a
 * historical period reproduces what was saved, regardless of later journal
 * changes (same rationale as the PDF flow).
 *
 * Stages returned on failure: 'auth' | 'period' | 'csv' | 'storage' | 'log'
 */

import { supabase } from "../../lib/supabase";
import { generateCorporationTaxCsvFlat } from "./generateCorporationTaxCsvFlat";
import { generateCorporationTaxCsvDetailed } from "./generateCorporationTaxCsvDetailed";

/**
 * Format a Date as YYYY-MM-DDTHH-mm-ss in Europe/London. Used for the
 * storage path timestamp segment so DST crossings don't shift the surfacing
 * day. Mirrors the PDF exporter's helper.
 */
export function toLondonTimestamp(d = new Date()) {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
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
  const hour = map.hour === "24" ? "00" : map.hour;
  return `${map.year}-${map.month}-${map.day}T${hour}-${map.minute}-${map.second}`;
}

function filenameFor(period, variant) {
  const start = period?.period_start ? String(period.period_start).slice(0, 10) : "";
  const end = period?.period_end ? String(period.period_end).slice(0, 10) : "";
  return `corporation-tax-${start}-${end}-${variant}.csv`;
}

/**
 * Kick off a browser download of `blob` as `filename`. Best-effort: errors
 * are swallowed so a failed click doesn't poison the orchestrator's return
 * value (the audit row is the durable record).
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
    setTimeout(() => { try { URL.revokeObjectURL(url); } catch { /* ignore */ } }, 0);
    return url;
  } catch {
    return null;
  }
}

/**
 * Export a Corporation Tax period as a CSV: builds, uploads, audits, downloads.
 *
 * @param {string} periodId
 * @param {'flat'|'detailed'} variant
 * @returns {Promise<
 *   | { success: true, storagePath: string, logId: string|null, filename: string, warning?: string, error?: string }
 *   | { success: false, error: string, stage: 'auth'|'period'|'csv'|'storage'|'log' }
 * >}
 */
export async function exportCorporationTaxCsv(periodId, variant) {
  if (!supabase) {
    return { success: false, error: "Supabase not configured", stage: "auth" };
  }
  if (!periodId) {
    return { success: false, error: "periodId is required", stage: "period" };
  }
  if (variant !== "flat" && variant !== "detailed") {
    return { success: false, error: "variant must be 'flat' or 'detailed'", stage: "csv" };
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

  // 3. Build CSV blob from the persisted snapshot — do NOT recompute.
  let blob;
  let filename;
  try {
    blob = variant === "flat"
      ? generateCorporationTaxCsvFlat(period)
      : generateCorporationTaxCsvDetailed(period);
    filename = filenameFor(period, variant);
  } catch (err) {
    return { success: false, error: err?.message || "CSV generation failed", stage: "csv" };
  }

  // 4. Storage upload. Path: {user_id}/{period_id}/{london-timestamp}.csv
  const timestamp = toLondonTimestamp(new Date());
  const storagePath = `${userId}/${periodId}/${timestamp}.csv`;
  try {
    const { error: uploadErr } = await supabase.storage
      .from("ct-exports")
      .upload(storagePath, blob, {
        contentType: "text/csv;charset=utf-8",
        upsert: false,
      });
    if (uploadErr) {
      return { success: false, error: uploadErr.message || "Storage upload failed", stage: "storage" };
    }
  } catch (err) {
    return { success: false, error: err?.message || "Storage upload failed", stage: "storage" };
  }

  // 5. Audit log insert. Failure here does NOT void the download.
  const exportType = variant === "flat" ? "csv-flat" : "csv-detailed";
  let logId = null;
  let logWarning = null;
  let logWarningMsg = null;
  try {
    const { data: logRow, error: logErr } = await supabase
      .from("ct_export_log")
      .insert({
        user_id: userId,
        period_id: periodId,
        export_type: exportType,
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
      console.warn("[ct-export] CSV uploaded but log insert failed:", logErr.message);
    } else {
      logId = logRow?.id || null;
    }
  } catch (err) {
    logWarning = "log-insert-failed";
    logWarningMsg = err?.message || "Log insert failed";
    console.warn("[ct-export] CSV uploaded but log insert threw:", logWarningMsg);
  }

  // 6. Download — fire after Storage + audit so the user sees the final
  //    committed state. Still fires if audit warned.
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
