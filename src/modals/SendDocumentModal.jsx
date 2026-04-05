import { useMemo, useState } from "react";
import { ff, PDF_TEMPLATES } from "../constants";
import { Btn, Field, Input, Textarea } from "../components/atoms";
import { Icons } from "../components/icons";
import { buildInvoiceEmail, buildPaymentConfirmationEmail, buildQuoteEmail } from "../utils/emailTemplates";
import { A4InvoiceDoc } from "../components/shared/A4InvoiceDoc";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatCurrency(amount, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
  }).format(Number(amount || 0));
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
  // orgSettings stores the org name as `orgName`; callers may also pass companyName/name
  return company?.orgName || company?.companyName || company?.name || "";
}

function buildDefaultSubject(documentType, document, company) {
  const companyName = extractCompanyName(company) || "Your Company";

  if (documentType === "quote") {
    return `Quote ${document?.quoteNumber || "—"} from ${companyName}`;
  }

  if (documentType === "payment_confirmation") {
    return `Payment Received — Invoice ${document?.invoiceNumber || "—"}`;
  }

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
      `Hi ${customerName},`,
      "",
      `Please find your quote ${documentNumber} for ${total} below.`,
      "",
      "Thank you for your time.",
      companyName,
    ].join("\n");
  }

  if (documentType === "payment_confirmation") {
    return [
      `Hi ${customerName},`,
      "",
      `We've received your payment for invoice ${documentNumber}.`,
      "",
      "Thank you for your business.",
      companyName,
    ].join("\n");
  }

  const dueDate = formatDate(document?.dueDate);

  return [
    `Hi ${customerName},`,
    "",
    `Please find your invoice ${documentNumber} for ${total} below.`,
    dueDate ? `Payment is due by ${dueDate}.` : "",
    "",
    "Thank you for your business.",
    companyName,
  ]
    .filter((line, idx, arr) => !(line === "" && arr[idx - 1] === ""))
    .join("\n");
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
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p style=\"margin:0 0 10px;\">${line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`)
    .join("");

  const marker = "</td>\n            </tr>";
  const insertAt = baseHtml.indexOf(marker);
  if (insertAt < 0) return baseHtml;

  const prefix = baseHtml.slice(0, insertAt);
  const suffix = baseHtml.slice(insertAt);
  const injected = `${prefix}<div style=\"font-family:Arial,Helvetica,sans-serif;color:#27272A;font-size:15px;line-height:1.55;margin-bottom:16px;\">${personalBlock}</div>${suffix}`;

  return injected;
}

export default function SendDocumentModal({
  documentType,
  document,
  company,
  customer,
  onClose,
  onSent,
  // PDF generation props (optional — when provided, PDF is attached to the email)
  docData,
  currSymbol,
  isVat,
  pdfTemplate,
  accentColor,
  footerText,
  invoiceTemplate,
}) {
  const [to, setTo] = useState(customer?.email || "");
  const [cc, setCc] = useState("");
  const [replyTo, setReplyTo] = useState(company?.email || "");
  const companyDisplayName = extractCompanyName(company);
  const [subject, setSubject] = useState(() => buildDefaultSubject(documentType, document, company));
  const [personalMessage, setPersonalMessage] = useState(() =>
    buildDefaultMessage(documentType, document, company, customer),
  );
  const [sendCopy, setSendCopy] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  const toError = to && !EMAIL_RE.test(to.trim()) ? "Please enter a valid email address." : null;
  const subjectError = subject && subject.trim().length < 3 ? "Subject must be at least 3 characters." : null;
  const missingCustomerEmail = !to && !customer?.email;

  const titleLabel = useMemo(() => {
    const docLabel = getDocumentLabel(documentType);
    return `Send ${docLabel} ${getDocumentNumber(documentType, document)}`;
  }, [documentType, document]);

  async function handleSend() {
    if (!to.trim()) {
      setError("Recipient email is required.");
      return;
    }
    if (!EMAIL_RE.test(to.trim())) {
      setError("Please enter a valid recipient email.");
      return;
    }
    if (subject.trim().length < 3) {
      setError("Subject must be at least 3 characters.");
      return;
    }

    setSending(true);
    setError(null);

    // Capture the hidden invoice element for PDF attachment
    let attachmentBase64 = null;
    let attachmentFilename = null;
    if (docData) {
      try {
        const el = window.document.getElementById("send-modal-pdf-preview");
        if (el) {
          // Sanitize clone (same approach as A4PrintModal.handlePrint)
          const clone = el.cloneNode(true);
          clone.querySelectorAll("script").forEach(s => s.remove());
          clone.querySelectorAll("*").forEach(node => {
            Array.from(node.attributes).forEach(attr => {
              if (/^on[a-z]/i.test(attr.name)) node.removeAttribute(attr.name);
            });
          });
          const docNum = (document?.invoiceNumber || document?.quoteNumber || "").replace(/[^a-zA-Z0-9_-]/g, "");
          const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${docNum}</title><style>*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}body{background:#fff;font-family:'Lato','DM Sans','Helvetica Neue',sans-serif}@page{size:A4;margin:0}</style></head><body>${clone.outerHTML}</body></html>`;
          attachmentBase64 = btoa(unescape(encodeURIComponent(fullHtml)));
          const docTypeLabel = documentType === "quote" ? "Quote" : "Invoice";
          attachmentFilename = `${docTypeLabel}-${docNum || "document"}.html`;
        }
      } catch {
        // PDF capture failed — send email without attachment rather than blocking
      }
    }

    const htmlBody = buildEmailHtml({
      documentType,
      document,
      company,
      customer,
      personalMessage,
    });

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

      if (!res.ok) {
        const fallbackError = rawText?.trim() || "Send failed";
        throw new Error(data?.error || data?.message || fallbackError);
      }

      if (!data) {
        throw new Error(rawText?.trim() || "Email sent, but the server response was not JSON.");
      }

      setSent(true);
      setTimeout(() => onSent?.(data), 1500);
    } catch (err) {
      setError(err?.message || "Send failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(17,17,16,0.55)",
        display: "grid",
        placeItems: "center",
        zIndex: 1500,
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          background: "#FFFFFF",
          borderRadius: 12,
          border: "1px solid #E8E6E0",
          boxShadow: "0 18px 40px rgba(17,17,16,0.2)",
          overflow: "hidden",
          fontFamily: ff,
        }}
      >
        <div style={{ padding: "16px 18px", borderBottom: "1px solid #E8E6E0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: 700, color: "#1F2937" }}>
            <Icons.Send />
            <span>{titleLabel}</span>
          </div>
          <button type="button" onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: "#6B7280", display: "flex" }}>
            <Icons.X />
          </button>
        </div>

        {sent ? (
          <div
            style={{
              padding: "44px 22px",
              textAlign: "center",
              color: "#166534",
              fontWeight: 700,
              fontSize: 18,
              opacity: 1,
              animation: "fadeInSendSuccess 220ms ease-out",
            }}
          >
            ✓ Email sent to {to.trim()}
          </div>
        ) : (
          <>
            <div style={{ padding: "16px 18px 8px", borderBottom: "1px solid #E8E6E0" }}>
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

            <div style={{ padding: "14px 18px", borderBottom: "1px solid #E8E6E0" }}>
              <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 700, color: "#6B7280", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Message
              </div>
              <Textarea value={personalMessage} onChange={setPersonalMessage} rows={9} />
              <div style={{ marginTop: 8, fontSize: 12, color: "#78716C" }}>
                (personalize message above — this is what the client will see before the invoice details)
              </div>
            </div>

            <div style={{ padding: "12px 18px", borderBottom: "1px solid #E8E6E0" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#44403C", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={sendCopy}
                  onChange={(event) => setSendCopy(event.target.checked)}
                  style={{ width: 16, height: 16, accentColor: "#D97706" }}
                />
                <span>Send me a copy (CC to {company?.email || (companyDisplayName ? `${companyDisplayName} email` : "company email")})</span>
              </label>
              {docData && (
                <div style={{ marginTop: 8, fontSize: 12, color: "#6B7280", display: "flex", alignItems: "center", gap: 5 }}>
                  <Icons.Receipt /> A copy of your {documentType === "quote" ? "quote" : "invoice"} will be attached to this email.
                </div>
              )}
            </div>

            {(missingCustomerEmail || error) && (
              <div style={{ padding: "12px 18px 0" }}>
                {missingCustomerEmail && (
                  <div style={{ fontSize: 12, color: "#B45309", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "8px 10px", marginBottom: 8 }}>
                    No email address saved for this client. Please enter one manually.
                  </div>
                )}
                {error && (
                  <div style={{ fontSize: 12, color: "#B91C1C", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "8px 10px" }}>
                    {error}
                  </div>
                )}
              </div>
            )}

            <div style={{ padding: "16px 18px", display: "flex", justifyContent: "flex-end", gap: 10, background: "#F0EFE9" }}>
              <Btn variant="outline" onClick={onClose} disabled={sending}>Cancel</Btn>
              <Btn variant="accent" onClick={handleSend} disabled={sending || !!toError || !!subjectError} icon={<Icons.Send />}>
                {sending ? "Sending…" : "Send Email →"}
              </Btn>
            </div>

            {/* Hidden invoice render for PDF attachment capture */}
            {docData && (
              <div style={{ position: "fixed", left: -9999, top: 0, width: "210mm", visibility: "hidden", pointerEvents: "none", overflow: "hidden", height: 0 }}>
                <A4InvoiceDoc
                  docId="send-modal-pdf-preview"
                  data={docData}
                  currSymbol={currSymbol || "£"}
                  isVat={isVat || false}
                  orgSettings={company || {}}
                  accentColor={accentColor || (PDF_TEMPLATES.find(t => t.id === (pdfTemplate || "classic"))?.defaultAccent || "#1e6be0")}
                  template={pdfTemplate || "classic"}
                  footerText={footerText || ""}
                  invoiceTemplate={invoiceTemplate}
                />
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes fadeInSendSuccess {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
