/**
 * sendCISStatement — end-to-end delivery of a CIS Payment and Deduction
 * Statement to a subcontractor.
 *
 * Flow:
 *   1. Render PDF blob via generateCISStatementBlob.
 *   2. Upload to Supabase Storage bucket 'cis-statements'
 *      at {user_id}/{period_end_iso}/{supplier_id}_{timestamp}.pdf.
 *   3. POST blob (base64) + email HTML to /api/send-document.
 *   4. Insert cis_pds_log audit row (HMRC CIS340 3-year retention).
 *
 * Returns { success, ... } — never throws. On post-send audit failure, the
 * email has already gone out, so success stays true with a warning.
 */

import { supabase } from "../../lib/supabase";
import { generateCISStatementBlob } from "./generateCISStatementPdf";
import { buildCISStatementEmail } from "../emailTemplates";

const sanitize = (s) => String(s || "Subcontractor").replace(/[^a-zA-Z0-9_-]/g, "_");

async function blobToBase64(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function toIsoDate(d) {
  if (!d) return "";
  // Idempotent: if already a YYYY-MM-DD string, return as-is.
  if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}/.test(d)) {
    return d.slice(0, 10);
  }
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  // Format in Europe/London to match HMRC CIS340 tax-month semantics.
  // en-CA locale yields YYYY-MM-DD natively.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(dt);
}

function buildSubcontractorPayload(row) {
  return {
    name: row?.supplier?.name || "",
    utr: row?.supplier?.utr || "",
    verification_number: row?.verification_number || "",
  };
}

function buildAmounts(row) {
  return {
    gross_amount: row.gross_amount,
    materials_amount: row.materials_amount,
    labour_amount: row.labour_amount,
    cis_deducted: row.cis_deducted,
    cis_rate_used: row.cis_rate_used,
  };
}

export async function sendCISStatement({ contractor, row, period, settings = {}, orgSettings = null }) {
  if (!supabase) {
    return { success: false, error: "Supabase not configured", stage: "storage" };
  }

  // 0. Fresh auth lookup (do not cache — session may have rotated).
  let userId;
  try {
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user?.id) {
      return { success: false, error: authErr?.message || "Not signed in", stage: "storage" };
    }
    userId = authData.user.id;
  } catch (err) {
    return { success: false, error: err?.message || "Auth lookup failed", stage: "storage" };
  }

  const periodEndIso = toIsoDate(period?.period_end);
  const periodStartIso = toIsoDate(period?.period_start);
  const subcontractor = buildSubcontractorPayload(row);
  const amounts = buildAmounts(row);

  // 1. Render PDF blob.
  let pdfBlob;
  try {
    const pdfRes = await generateCISStatementBlob({
      contractor,
      subcontractor,
      period,
      amounts,
    }, orgSettings);
    if (!pdfRes?.success || !pdfRes.blob) {
      return { success: false, error: pdfRes?.error || "PDF generation failed", stage: "pdf" };
    }
    pdfBlob = pdfRes.blob;
  } catch (err) {
    return { success: false, error: err?.message || "PDF generation failed", stage: "pdf" };
  }

  // 2. Upload to Storage.
  const storagePath = `${userId}/${periodEndIso}/${row.supplier.id}_${Date.now()}.pdf`;
  try {
    const { error: uploadErr } = await supabase.storage
      .from("cis-statements")
      .upload(storagePath, pdfBlob, { contentType: "application/pdf", upsert: false });
    if (uploadErr) {
      return { success: false, error: uploadErr.message || "Storage upload failed", stage: "storage" };
    }
  } catch (err) {
    return { success: false, error: err?.message || "Storage upload failed", stage: "storage" };
  }

  // 3. Base64 + build email + POST.
  let resendId = null;
  try {
    const attachmentBase64 = await blobToBase64(pdfBlob);
    const attachmentFilename = `CIS_PDS_${sanitize(row.supplier.name)}_${periodEndIso}.pdf`;

    const htmlBody = buildCISStatementEmail({
      contractor,
      subcontractor,
      period,
      amounts,
      personalMessage: settings.personalMessage || "",
    });

    const payload = {
      to: row.supplier.email,
      subject: `CIS Payment and Deduction Statement — ${period.label}`,
      htmlBody,
      documentType: "cis-statement",
      documentNumber: `${row.supplier.id}_${periodEndIso}`,
      fromName: settings.fromName || undefined,
      replyTo: settings.replyTo || undefined,
      attachmentBase64,
      attachmentFilename,
    };

    const res = await fetch("/api/send-document", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        success: false,
        error: data?.error || data?.message || `Email send failed (HTTP ${res.status})`,
        stage: "email",
      };
    }
    resendId = data?.emailId || null;
  } catch (err) {
    return { success: false, error: err?.message || "Email send failed", stage: "email" };
  }

  // 4. Audit-log insert. Failure here does NOT void the email.
  try {
    const { data: logRow, error: logErr } = await supabase
      .from("cis_pds_log")
      .insert({
        user_id: userId,
        supplier_id: row.supplier.id,
        period_start: periodStartIso,
        period_end: periodEndIso,
        tax_month_label: period.label,
        emission_type: "email",
        email_sent_to: row.supplier.email,
        email_resend_id: resendId,
        pdf_storage_path: storagePath,
        gross_amount: row.gross_amount,
        materials_amount: row.materials_amount,
        labour_amount: row.labour_amount,
        cis_deducted: row.cis_deducted,
        cis_rate_used: row.cis_rate_used,
        verification_number: row.verification_number || null,
        bill_ids: row.bill_ids,
      })
      .select("id")
      .single();
    if (logErr) {
      console.warn("[cis-pds] email sent but log insert failed:", logErr.message);
      return {
        success: true,
        warning: "log-insert-failed",
        error: logErr.message,
        storage_path: storagePath,
        resend_id: resendId,
      };
    }
    return { success: true, log_id: logRow?.id, storage_path: storagePath, resend_id: resendId };
  } catch (err) {
    console.warn("[cis-pds] email sent but log insert threw:", err?.message);
    return {
      success: true,
      warning: "log-insert-failed",
      error: err?.message || "Log insert failed",
      storage_path: storagePath,
      resend_id: resendId,
    };
  }
}

/**
 * logCISStatementDownload — fire-and-forget audit write after a successful
 * per-row PDF download. No Storage upload, no email.
 */
export async function logCISStatementDownload({ contractor: _contractor, row, period }) {
  if (!supabase) return { success: false, error: "Supabase not configured" };

  try {
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user?.id) {
      return { success: false, error: authErr?.message || "Not signed in" };
    }
    const userId = authData.user.id;

    const { data: logRow, error: logErr } = await supabase
      .from("cis_pds_log")
      .insert({
        user_id: userId,
        supplier_id: row.supplier.id,
        period_start: toIsoDate(period?.period_start),
        period_end: toIsoDate(period?.period_end),
        tax_month_label: period.label,
        emission_type: "download",
        email_sent_to: null,
        email_resend_id: null,
        pdf_storage_path: null,
        gross_amount: row.gross_amount,
        materials_amount: row.materials_amount,
        labour_amount: row.labour_amount,
        cis_deducted: row.cis_deducted,
        cis_rate_used: row.cis_rate_used,
        verification_number: row.verification_number || null,
        bill_ids: row.bill_ids,
      })
      .select("id")
      .single();
    if (logErr) return { success: false, error: logErr.message };
    return { success: true, log_id: logRow?.id };
  } catch (err) {
    return { success: false, error: err?.message || "Log insert failed" };
  }
}
