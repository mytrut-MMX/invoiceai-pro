import { useMemo, useState } from "react";
import { PDF_TEMPLATES } from "../constants";
import { useToast } from "../components/ui/Toast";
import { Btn, Field, Input, Textarea } from "../components/atoms";
import { Icons } from "../components/icons";
import { buildInvoiceEmail, buildPaymentConfirmationEmail, buildQuoteEmail } from "../utils/emailTemplates";
import { generateInvoicePdfBlob } from "../utils/pdf/generateInvoicePdf";
import { useModalA11y } from "../hooks/useModalA11y";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatCurrency(amount, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(Number(amount || 0));
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function getDocumentNumber(documentType, document) {
  if (documentType === "quote") return document?.quoteNumber || "—";
  return document?.invoiceNumber || "—";
}

function getDocumentLabel(documentType) {
  if (documentType === "quote") return "Quote";
  if (documentType === "payment_confirmation") return "Payment Confirmation";
  return "Invoice";
}

function extractCompanyName(company) {
  return company?.orgName || company?.companyName || company?.name || "";
}

function buildDefaultSubject(documentType, document, company) {
  const companyName = extractCompanyName(company) || "Your Company";
  if (documentType === "quote") return `Quote ${document?.quoteNumber || "—"} from ${companyName}`;
  if (documentType === "payment_confirmation") return `Payment Received — Invoice ${document?.invoiceNumber || "—"}`;
  return `Invoice ${document?.invoiceNumber || "—"} from ${companyName}`;
}

function buildDefaultMessage(documentType, document, company, customer) {
  const customerName = customer?.contactName || customer?.companyName || customer?.name || "there";
  const companyName = extractCompanyName(company) || "Your Company";
  const documentNumber = getDocumentNumber(documentType, document);
  const currency = document?.currency || company?.currency || "GBP";
  const total = formatCurrency(document?.total || document?.amount || document?.amountDue || 0, currency);

  if (documentType === "quote") {
    return [
      `Hi ${customerName},`, "",
      `Please find your quote ${documentNumber} for ${total} below.`, "",
      "Thank you for your time.", companyName,
    ].join("\n");
  }
  if (documentType === "payment_confirmation") {
    return [
      `Hi ${customerName},`, "",
      `We've received your payment for invoice ${documentNumber}.`, "",
      "Thank you for your business.", companyName,
    ].join("\n");
  }
  const dueDate = formatDate(document?.dueDate);
  return [
    `Hi ${customerName},`, "",
    `Please find your invoice ${documentNumber} for ${total} below.`,
    dueDate ? `Payment is due by ${dueDate}.` : "", "",
    "Thank you for your business.", companyName,
  ].filter((line, idx, arr) => !(line === "" && arr[idx - 1] === "")).join("\n");
}

function buildEmailHtml({ documentType, document, company, customer, personalMessage }) {
  const trimmedMessage = (personalMessage || "").trim();
  const baseHtml =
    documentType === "quote"
      ? buildQuoteEmail({ quote: document, company, customer })
      : documentType === "payment_confirmation"
        ? buildPaymentConfirmationEmail({ invoice: document, company, customer })
        : buildInvoiceEmail({ invoice: document, company, customer });
  if (!trimmedMessage) return baseHtml;
  const personalBlock = trimmedMessage
    .split("\n").map(l => l.trim()).filter(Boolean)
    .map(l => `<p style="margin:0 0 10px;">${l.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`)
    .join("");
  const marker = "</td>\n            </tr>";
  const insertAt = baseHtml.indexOf(marker);
  if (insertAt < 0) return baseHtml;
  const prefix = baseHtml.slice(0, insertAt);
  const suffix = baseHtml.slice(insertAt);
  return `${prefix}<div style="font-family:Arial,Helvetica,sans-serif;color:#27272A;font-size:15px;line-height:1.55;margin-bottom:16px;">${personalBlock}</div>${suffix}`;
}

export default function SendDocumentModal({
  documentType, document, company, customer,
  onClose, onSent,
  docData, currSymbol, isVat, pdfTemplate, accentColor, footerText, invoiceTemplate,
}) {
  const [to, setTo] = useState(customer?.email || "");
  const [cc, setCc] = useState("");
  const [replyTo, setReplyTo] = useState(company?.email || "");
  const companyDisplayName = extractCompanyName(company);
  const [subject, setSubject] = useState(() => buildDefaultSubject(documentType, document, company));
  const [personalMessage, setPersonalMessage] = useState(() => buildDefaultMessage(documentType, document, company, customer));
  const [sendCopy, setSendCopy] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();
  const overlayRef = useModalA11y(true, onClose);

  const toError = to && !EMAIL_RE.test(to.trim()) ? "Please enter a valid email address." : null;
  const subjectError = subject && subject.trim().length < 3 ? "Subject must be at least 3 characters." : null;
  const missingCustomerEmail = !to && !customer?.email;

  const titleLabel = useMemo(
    () => `Send ${getDocumentLabel(documentType)} ${getDocumentNumber(documentType, document)}`,
    [documentType, document]
  );

  async function handleSend() {
    if (!to.trim()) return setError("Recipient email is required.");
    if (!EMAIL_RE.test(to.trim())) return setError("Please enter a valid recipient email.");
    if (subject.trim().length < 3) return setError("Subject must be at least 3 characters.");

    setSending(true);
    setError(null);

    let attachmentBase64 = null;
    let attachmentFilename = null;
    if (docData) {
      try {
        const res = await generateInvoicePdfBlob({
          data: docData,
          currSymbol: currSymbol || "£",
          isVat: isVat || false,
          orgSettings: company || {},
          accentColor: accentColor || (PDF_TEMPLATES.find(t => t.id === (pdfTemplate || "classic"))?.defaultAccent || "#1e6be0"),
          footerText: footerText || "",
        });
        if (res.success) {
          attachmentFilename = res.filename;
          const arrayBuffer = await res.blob.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = "";
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
          attachmentBase64 = btoa(binary);
        }
      } catch {
        // PDF generation failed — send email without attachment rather than blocking
      }
    }

    const htmlBody = buildEmailHtml({ documentType, document, company, customer, personalMessage });
    const payload = {
      to: to.trim(),
      cc: sendCopy ? company?.email : (cc.trim() || undefined),
      subject: subject.trim(),
      htmlBody,
      documentType,
      documentNumber: document?.invoiceNumber || document?.quoteNumber,
      replyTo: replyTo.trim() || undefined,
      fromName: companyDisplayName || undefined,
      attachmentBase64: attachmentBase64 || undefined,
      attachmentFilename: attachmentFilename || undefined,
    };

    try {
      const res = await fetch("/api/send-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const contentType = res.headers.get("content-type") || "";
      const isJson = contentType.toLowerCase().includes("application/json");
      const data = isJson ? await res.json() : null;
      const rawText = isJson ? "" : await res.text();
      if (!res.ok) throw new Error(data?.error || data?.message || (rawText?.trim() || "Send failed"));
      if (!data) throw new Error(rawText?.trim() || "Email sent, but the server response was not JSON.");
      setSent(true);
      toast({ title: "Document sent successfully", variant: "success" });
      setTimeout(() => onSent?.(data), 1500);
    } catch (err) {
      setError(err?.message || "Send failed");
      toast({ title: "Failed to send document", description: err?.message, variant: "danger" });
    } finally {
      setSending(false);
    }
  }

  return (
    <div ref={overlayRef} className="fixed inset-0 bg-black/50 z-[1500] grid place-items-center p-4">
      <div className="w-full max-w-[560px] bg-white rounded-2xl shadow-[var(--shadow-popover)] overflow-hidden">
        {/* Header */}
        <div className="border-b border-[var(--border-subtle)] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)]">
            <Icons.Send />
            <span>{titleLabel}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] bg-transparent border-none cursor-pointer flex"
          >
            <Icons.X />
          </button>
        </div>

        {sent ? (
          <div className="px-6 py-12 text-center text-[var(--success-700)] font-bold text-lg">
            ✓ Email sent to {to.trim()}
          </div>
        ) : (
          <>
            <div className="px-6 py-4 space-y-3 border-b border-[var(--border-subtle)]">
              <Field label="To" required error={toError}>
                <Input value={to} onChange={setTo} placeholder="john@acmecorp.com" type="email" error={!!toError} />
              </Field>
              <Field label="CC">
                <Input value={cc} onChange={setCc} placeholder="Optional" type="email" />
              </Field>
              <Field label="Reply-to">
                <Input value={replyTo} onChange={setReplyTo} placeholder="hello@yourcompany.com" type="email" />
              </Field>
              <Field label="Subject" required error={subjectError}>
                <Input value={subject} onChange={setSubject} placeholder="Invoice INV-0042 from Your Company" error={!!subjectError} />
              </Field>
            </div>

            <div className="px-6 py-4 border-b border-[var(--border-subtle)]">
              <div className="mb-2 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                Message
              </div>
              <Textarea value={personalMessage} onChange={setPersonalMessage} rows={9} />
              <div className="mt-2 text-xs text-[var(--text-tertiary)]">
                (personalize message above — this is what the client will see before the invoice details)
              </div>
            </div>

            <div className="px-6 py-3 border-b border-[var(--border-subtle)]">
              <label className="flex items-center gap-2.5 text-sm text-[var(--text-secondary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendCopy}
                  onChange={e => setSendCopy(e.target.checked)}
                  className="w-4 h-4 accent-[var(--brand-600)]"
                />
                <span>Send me a copy (CC to {company?.email || (companyDisplayName ? `${companyDisplayName} email` : "company email")})</span>
              </label>
              {docData && (
                <div className="mt-2 text-xs text-[var(--text-tertiary)] flex items-center gap-1.5">
                  <Icons.Receipt /> A PDF copy of your {documentType === "quote" ? "quote" : "invoice"} will be attached to this email.
                </div>
              )}
            </div>

            {(missingCustomerEmail || error) && (
              <div className="px-6 pt-3 space-y-2">
                {missingCustomerEmail && (
                  <div className="text-xs text-[var(--warning-700)] bg-[var(--warning-50)] border border-[var(--warning-100)] rounded-[var(--radius-md)] px-3 py-2">
                    No email address saved for this client. Please enter one manually.
                  </div>
                )}
                {error && (
                  <div className="text-xs text-[var(--danger-700)] bg-[var(--danger-50)] border border-[var(--danger-100)] rounded-[var(--radius-md)] px-3 py-2">
                    {error}
                  </div>
                )}
              </div>
            )}

            <div className="px-6 py-4 flex justify-end gap-2 bg-[var(--surface-sunken)]">
              <Btn variant="outline" onClick={onClose} disabled={sending}>Cancel</Btn>
              <Btn variant="accent" onClick={handleSend} disabled={sending || !!toError || !!subjectError} icon={<Icons.Send />}>
                {sending ? "Sending…" : "Send email →"}
              </Btn>
            </div>

          </>
        )}
      </div>
    </div>
  );
}
