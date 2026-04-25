// SendSelfBillModal — emails a self-billed invoice PDF to the supplier via
// POST /api/send-document with { action: 'selfbill', ... }. The API refuses
// to send if no PDF exists on file, so this modal looks up the most recent
// emission_log row for the bill up front and either (a) shows the signed
// URL preview or (b) disables Send with a "Generate PDF first" hint.

import { useState, useEffect, useMemo } from "react";
import { Btn, Field, Input, Textarea } from "../atoms";
import { Icons } from "../icons";
import { supabase } from "../../lib/supabase";
import { SB_INVOICES_BUCKET } from "../../constants/selfBilling";
import { getSbError } from "../../lib/selfBilling/errors";
import { useToast } from "../ui/Toast";
import { useModalA11y } from "../../hooks/useModalA11y";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SendSelfBillModal({ bill, supplier, onClose, onSent }) {
  const { toast } = useToast();
  const overlayRef = useModalA11y(true, onClose);

  const [recipient, setRecipient] = useState(supplier?.email || "");
  const [ccInput, setCcInput] = useState("");
  const [subject, setSubject] = useState(
    `Self-billed invoice ${bill?.self_bill_invoice_number || ""}`.trim(),
  );
  const [message, setMessage] = useState(
    `<p>Please find attached self-billed invoice <strong>${bill?.self_bill_invoice_number || ""}</strong> issued on your behalf under our self-billing agreement.</p>`,
  );

  const [previewUrl, setPreviewUrl] = useState(null);
  const [pdfMissing, setPdfMissing] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);

  // Fetch the newest emission-log row for this bill and sign its PDF path.
  useEffect(() => {
    let cancelled = false;
    if (!bill?.id) return;
    (async () => {
      const { data: log } = await supabase
        .from("self_billing_emission_log")
        .select("pdf_storage_path")
        .eq("bill_id", bill.id)
        .not("pdf_storage_path", "is", null)
        .order("created_at", { ascending: false })
        .limit(1).maybeSingle();
      if (cancelled) return;
      if (!log?.pdf_storage_path) { setPdfMissing(true); return; }
      const { data: url } = await supabase.storage
        .from(SB_INVOICES_BUCKET).createSignedUrl(log.pdf_storage_path, 3600);
      if (!cancelled) setPreviewUrl(url?.signedUrl || null);
    })();
    return () => { cancelled = true; };
  }, [bill?.id]);

  const ccEmails = useMemo(
    () => ccInput.split(",").map((s) => s.trim()).filter((s) => EMAIL_RE.test(s)),
    [ccInput],
  );
  const invalidCc = useMemo(
    () => ccInput.split(",").map((s) => s.trim()).filter(Boolean).filter((s) => !EMAIL_RE.test(s)),
    [ccInput],
  );

  const canSend = !sending && !pdfMissing && EMAIL_RE.test(recipient)
    && subject.trim().length > 0 && invalidCc.length === 0;

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true); setSendError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Session expired — sign in again.");

      const res = await fetch("/api/send-document", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "selfbill",
          billId: bill.id,
          recipientEmail: recipient.trim(),
          ccEmails,
          subject: subject.trim(),
          message,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.success) {
        // API returns { error } (plain) or typed error codes — normalise.
        const msg = body?.error || `Send failed (${res.status})`;
        const resolved = body?.code ? getSbError(body.code, body.ctx || {}) : null;
        setSendError({ code: body?.code || null, title: resolved?.title || "Could not send", message: msg, userAction: resolved?.userAction });
        setSending(false);
        return;
      }
      // HTTP 207 Multi-Status: email sent but the server's audit log insert
      // failed. Warn loudly — the Resend ID is the only surviving reference
      // until support can backfill the emission_log row.
      if (body?.warning === "email_sent_but_audit_log_failed") {
        toast({
          title: `Sent to ${recipient} — audit log warning`,
          description: `Email sent but audit log failed — contact support with Resend ID ${body.resendId || "n/a"}.`,
          variant: "warning",
        });
      } else {
        toast({ title: `Sent to ${recipient}`, variant: "success" });
      }
      onSent?.(body.emissionLogId);
      onClose();
    } catch (err) {
      setSendError({ code: null, title: "Could not send", message: err?.message || "Unknown error" });
      setSending(false);
    }
  };

  return (
    <div ref={overlayRef} className="fixed inset-0 bg-black/50 z-[3000] flex items-center justify-center p-4" onMouseDown={onClose}>
      <div
        className="bg-[var(--surface-card)] rounded-[var(--radius-xl)] shadow-[var(--shadow-popover)] w-full max-w-[720px] max-h-[90vh] overflow-y-auto border border-[var(--border-subtle)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] sticky top-0 bg-[var(--surface-card)] z-10">
          <div>
            <h2 className="text-lg font-semibold m-0">Send self-bill</h2>
            <p className="text-xs text-[var(--text-tertiary)] m-0 mt-0.5">
              {bill?.self_bill_invoice_number} · {supplier?.name || bill?.supplier_name || "supplier"}
            </p>
          </div>
          <button onClick={onClose} className="bg-transparent border-none cursor-pointer text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"><Icons.X /></button>
        </div>

        <div className="p-5 space-y-4">
          <Field label="To" required>
            <Input value={recipient} onChange={setRecipient} type="email" placeholder="accounts@supplier.co.uk" />
          </Field>
          <Field label="CC (comma-separated, optional)" hint={invalidCc.length > 0 ? `Invalid: ${invalidCc.join(", ")}` : undefined}>
            <Input value={ccInput} onChange={setCcInput} placeholder="finance@supplier.co.uk, ops@supplier.co.uk" />
          </Field>
          <Field label="Subject" required>
            <Input value={subject} onChange={setSubject} />
          </Field>
          <Field label="Message (HTML allowed)">
            <Textarea value={message} onChange={setMessage} rows={4} />
          </Field>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">PDF preview</div>
            {pdfMissing ? (
              <div className="px-3 py-4 bg-[var(--warning-50)] border border-[var(--warning-100)] rounded-[var(--radius-md)] text-sm text-[var(--warning-700)]">
                No PDF on file for this self-bill. Generate one from the bills page before sending.
              </div>
            ) : previewUrl ? (
              <iframe
                src={previewUrl} title="Self-bill PDF preview"
                className="w-full h-[320px] border border-[var(--border-subtle)] rounded-[var(--radius-md)] bg-white"
              />
            ) : (
              <div className="px-3 py-4 bg-[var(--surface-sunken)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] text-sm text-[var(--text-tertiary)]">
                Loading PDF…
              </div>
            )}
          </div>

          {sendError && (
            <div className="px-3 py-2 bg-[var(--danger-50)] border border-[var(--danger-100)] rounded-[var(--radius-md)] text-sm text-[var(--danger-700)]">
              <div className="font-semibold">{sendError.title}</div>
              <div>{sendError.message}</div>
              {sendError.userAction && <div className="text-[11px] text-[var(--danger-600)] mt-1">{sendError.userAction}</div>}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[var(--border-subtle)] sticky bottom-0 bg-[var(--surface-card)]">
          <Btn variant="outline" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSend} disabled={!canSend}>
            {sending ? "Sending…" : "Send"}
          </Btn>
        </div>
      </div>
    </div>
  );
}
