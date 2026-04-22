// importReceivedSelfBill — records an invoice issued by a customer as a
// self-bill (customer sends us the PDF, we file it on our side). Writes to
// invoices with received_as_self_bill=true, posts the AR/revenue/VAT entry,
// uploads the PDF, and appends a self_billing_emission_log row with
// emission_type='received'.
//
// Throws SelfBillingError on: SBA_NOT_ACTIVE, DUPLICATE_WITH_SBA (duplicate
// customer ref), SB_NO_LINE_ITEMS, and numeric validation failures. PDF
// upload + emission log insert are best-effort — a failure there doesn't
// roll back the invoice or ledger post.

import { supabase, supabaseReady } from "../../lib/supabase.js";
import { saveInvoice } from "../../lib/dataAccess.js";
import { getActiveSbaForCustomer } from "../../lib/selfBilling/sbaService.js";
import { postInvoiceEntry } from "../../utils/ledger/ledgerService.js";
import { fetchUserAccounts } from "../../utils/ledger/fetchUserAccounts.js";
import { SelfBillingError } from "../../lib/selfBilling/errors.js";
import { SB_INVOICES_BUCKET, SELF_BILL_MARKER_TITLE } from "../../constants/selfBilling.js";

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

async function sha256Hex(bytes) {
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function importReceivedSelfBill(input) {
  if (!supabaseReady) throw new Error("Supabase not configured");

  // Deep-clone lineItems to guarantee input immutability.
  const lineItems = Array.isArray(input.lineItems)
    ? input.lineItems.map((li) => ({ ...li }))
    : [];

  const {
    userId, customerId, customerSbRef,
    issueDate, supplyDate, taxPoint,
    vatRate = 0, vatAmount = 0, totalAmount = 0,
    notes = null, pdfBytes,
  } = input;

  if (!userId)           throw new SelfBillingError("SBA_NOT_FOUND", { reason: "userId required" });
  if (!customerId)       throw new SelfBillingError("SBA_NOT_ACTIVE", { reason: "customerId required" });
  if (!customerSbRef || !String(customerSbRef).trim()) {
    throw new SelfBillingError("SBA_NOT_ACTIVE", { reason: "customer self-bill reference required" });
  }
  if (lineItems.length === 0) {
    // Borrow SB_NO_LINE_ITEMS once it's in errors.js; until then SBA_NOT_ACTIVE with reason.
    throw new SelfBillingError("SBA_NOT_ACTIVE", { reason: "at least one line item required" });
  }

  const netAmount = round2(lineItems.reduce((s, li) => s + (Number(li.amount) || 0), 0));
  const total = round2(Number(totalAmount) || 0);
  const vat   = round2(Number(vatAmount) || 0);
  if (Math.abs(netAmount + vat - total) >= 0.01) {
    throw new SelfBillingError("SBA_NOT_ACTIVE", {
      reason: `total ${total.toFixed(2)} must equal net ${netAmount.toFixed(2)} + VAT ${vat.toFixed(2)}`,
    });
  }

  // Agreement must be active and direction='received'.
  const agreement = await getActiveSbaForCustomer({ userId, customerId });
  if (!agreement) throw new SelfBillingError("SBA_NOT_ACTIVE", { reason: "no active received-direction SBA" });

  // Pre-check duplicate. DB unique index (migration 046) is the final line of
  // defence; this gives callers a typed error with userAction rather than a
  // raw Postgres 23505.
  const { data: dupes } = await supabase.from("invoices")
    .select("id")
    .eq("user_id", userId)
    .eq("received_as_self_bill", true)
    .eq("received_sb_agreement_id", agreement.id)
    .eq("received_sb_customer_ref", String(customerSbRef).trim())
    .limit(1);
  if (dupes && dupes.length > 0) {
    throw new SelfBillingError("DUPLICATE_WITH_SBA", { billId: dupes[0].id, sbaId: agreement.id });
  }

  const invoiceId = crypto.randomUUID();
  const invoice = {
    id: invoiceId,
    invoice_number: String(customerSbRef).trim(),
    customer_id: customerId,
    customer: agreement.customer || { id: customerId, name: agreement?.customer?.name || "" },
    status: "Sent",
    issue_date: issueDate,
    supply_date: supplyDate || null,
    tax_point: taxPoint || issueDate,
    line_items: lineItems.map((li, idx) => ({
      id: li.id || crypto.randomUUID(),
      description: li.description || "",
      quantity: li.quantity ?? 1,
      rate: li.rate ?? li.amount ?? null,
      amount: Number(li.amount) || 0,
      tax_rate: Number(vatRate) || 0,
      tax_type: Number(vatRate) === 0 ? "zero-rated" : "standard",
      tax_amount: round2(((Number(li.amount) || 0) * (Number(vatRate) || 0)) / 100),
      sort_order: idx,
    })),
    subtotal: netAmount,
    total,
    taxBreakdown: vat > 0 ? [{ rate: Number(vatRate) || 0, amount: vat, type: "standard" }] : [],
    cisDeduction: 0,
    notes,
    received_as_self_bill: true,
    received_sb_customer_ref: String(customerSbRef).trim(),
    received_sb_agreement_id: agreement.id,
  };

  const { error: saveErr } = await saveInvoice(userId, invoice);
  if (saveErr) throw new Error(`Failed to save invoice: ${saveErr.message || saveErr}`);

  // Ledger post: DR AR, CR Revenue, CR VAT Output. Best-effort — a failure
  // shouldn't roll back the invoice (posting can be retried).
  try {
    const { accounts } = await fetchUserAccounts();
    await postInvoiceEntry(invoice, accounts, userId);
  } catch (err) {
    console.error("[importReceivedSelfBill] ledger post failed:", err);
  }

  // PDF storage + emission log. Best-effort for the same reason.
  try {
    if (pdfBytes) {
      const hashHex = await sha256Hex(pdfBytes);
      const path = `${userId}/received/${invoiceId}_${Date.now()}.pdf`;
      const { error: upErr } = await supabase.storage.from(SB_INVOICES_BUCKET)
        .upload(path, pdfBytes, { contentType: "application/pdf", upsert: false });
      if (upErr) throw upErr;
      await supabase.from("self_billing_emission_log").insert({
        user_id: userId, bill_id: null, supplier_id: null,
        agreement_id: agreement.id,
        self_bill_number: String(customerSbRef).trim(),
        emission_type: "received",
        pdf_storage_path: path, pdf_sha256: hashHex,
        snapshot: {
          net: netAmount, vat, total,
          lineItems: invoice.line_items.map((li) => ({
            description: li.description, amount: li.amount,
            tax_rate: li.tax_rate, tax_amount: li.tax_amount,
          })),
          customerRef: String(customerSbRef).trim(),
          customerId, markerTitle: SELF_BILL_MARKER_TITLE,
        },
      });
    }
  } catch (err) {
    console.error("[importReceivedSelfBill] PDF/emission failed:", err);
  }

  return invoice;
}
