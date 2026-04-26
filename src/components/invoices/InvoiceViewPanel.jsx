import { useState, useEffect, useContext, useMemo } from "react";
import { CUR_SYM, PDF_TEMPLATES } from "../../constants";
import { AppCtx } from "../../context/AppContext";
import { Icons } from "../icons";
import { Btn, Ribbon, StatusBadge } from "../atoms";
import { A4PrintModal, A4InvoiceDoc } from "../shared";
import SendDocumentModal from "../../modals/SendDocumentModal";
import { fmt, fmtDate, markDocumentAsSent } from "../../utils/helpers";
import { calcTotals } from "../../utils/calcTotals";
import { useCISSettings } from "../../hooks/useCISSettings";
import { getDefaultTemplate, getTemplateById } from "../../utils/InvoiceTemplateSchema";
import { calculateLatePaymentClaim } from "../../utils/latePayment";
import { useToast } from "../ui/Toast";
import { supabase } from "../../lib/supabase";
import { SB_INVOICES_BUCKET } from "../../constants/selfBilling";

function MetaCard({ label, value }) {
  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-[13px]">
      <div className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="text-sm font-semibold text-[var(--text-primary)] truncate">{value}</div>
    </div>
  );
}

export default function InvoiceViewPanel({ invoice, onEdit, onDelete, onClose }) {
  const { user, orgSettings, pdfTemplate, companyLogo, companyLogoSize, footerText, invoiceTemplateConfig, setInvoices } = useContext(AppCtx);
  const { cisEnabled, cisDefaultRate } = useCISSettings();
  const { toast } = useToast();
  const isVat = orgSettings?.vatReg === "Yes";
  const currSym = CUR_SYM[orgSettings?.currency || "GBP"] || "£";
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendDocumentType, setSendDocumentType] = useState("invoice");
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  const isReceivedSb = !!invoice.received_as_self_bill;
  const [agreementVersion, setAgreementVersion] = useState(null);
  const [receivedPdfUrl,   setReceivedPdfUrl]   = useState(null);
  const [receivedPdfMissing, setReceivedPdfMissing] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Received self-bills: fetch agreement version + signed URL for the original customer PDF.
  useEffect(() => {
    let cancelled = false;
    if (!isReceivedSb || !user?.id || !invoice.received_sb_agreement_id) return;
    (async () => {
      const [{ data: sba }, { data: log }] = await Promise.all([
        supabase.from("self_billing_agreements").select("version").eq("id", invoice.received_sb_agreement_id).maybeSingle(),
        supabase.from("self_billing_emission_log").select("pdf_storage_path")
          .eq("user_id", user.id).eq("agreement_id", invoice.received_sb_agreement_id)
          .eq("self_bill_number", invoice.received_sb_customer_ref).eq("emission_type", "received")
          .limit(1).maybeSingle(),
      ]);
      if (cancelled) return;
      if (sba?.version != null) setAgreementVersion(sba.version);
      if (!log?.pdf_storage_path) { setReceivedPdfMissing(true); return; }
      const { data: url } = await supabase.storage.from(SB_INVOICES_BUCKET).createSignedUrl(log.pdf_storage_path, 3600);
      if (!cancelled) setReceivedPdfUrl(url?.signedUrl || null);
    })();
    return () => { cancelled = true; };
  }, [isReceivedSb, user?.id, invoice.received_sb_agreement_id, invoice.received_sb_customer_ref]);

  const latePayment = useMemo(
    () => calculateLatePaymentClaim(invoice),
    [invoice.total, invoice.due_date, invoice.status]
  );

  const totals = calcTotals(
    invoice.line_items || [],
    invoice.discount_type || "percent",
    invoice.discount_value || "",
    invoice.shipping || "",
    isVat,
    invoice.customer,
    cisEnabled,
    cisDefaultRate
  );

  const docData = {
    docNumber: invoice.invoice_number,
    customer: invoice.customer,
    issueDate: invoice.issue_date,
    dueDate: invoice.due_date,
    paymentTerms: invoice.payment_terms,
    items: invoice.line_items || [],
    ...totals,
    notes: invoice.notes || "",
    terms: invoice.terms || "",
    status: invoice.status,
    poNumber: invoice.po_number || "",
    docType: "invoice",
    templateId: invoice.templateId || null,
  };

  const activeTemplate = invoice.template || pdfTemplate || "classic";
  const tplDef = PDF_TEMPLATES.find(t => t.id === activeTemplate) || PDF_TEMPLATES[0];
  const activeInvoiceTemplate = getTemplateById(invoice.templateId) || getDefaultTemplate();
  const mappedInvoice = {
    ...invoice,
    invoiceNumber: invoice.invoice_number,
    dueDate: invoice.due_date,
    currency: orgSettings?.currency || "GBP",
  };
  const company = { ...orgSettings, companyName: orgSettings?.companyName || orgSettings?.name };
  const customer = invoice.customer || {};

  return (
    <>
      {showPrintModal && (
        <A4PrintModal
          data={docData}
          currSymbol={currSym}
          isVat={isVat}
          onClose={() => setShowPrintModal(false)}
          invoiceTemplate={activeInvoiceTemplate}
        />
      )}
      {showSendModal && (
        <SendDocumentModal
          documentType={sendDocumentType}
          document={mappedInvoice}
          company={company}
          customer={customer}
          onClose={() => setShowSendModal(false)}
          onSent={() => {
            setShowSendModal(false);
            markDocumentAsSent(invoice.id);
          }}
          docData={docData}
          currSymbol={currSym}
          isVat={isVat}
          pdfTemplate={activeTemplate}
          accentColor={orgSettings?.branding?.accentColor || tplDef?.defaultAccent}
          footerText={footerText || ""}
          invoiceTemplate={activeInvoiceTemplate}
        />
      )}

      <div className="bg-[var(--surface-page)] min-h-screen">
        <div className="max-w-[1280px] mx-auto px-[13px] sm:px-[21px] py-[21px]">
          {/* Action bar */}
          <div className="flex items-center justify-between gap-2 mb-[21px] flex-wrap">
            <div className="flex items-center gap-[13px] flex-wrap">
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 h-9 px-3 border border-[var(--border-default)] rounded-[var(--radius-md)] bg-white text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] text-sm font-medium cursor-pointer transition-colors duration-150"
              >
                ← Invoices
              </button>
              <span className="text-lg font-semibold text-[var(--text-primary)]">{invoice.invoice_number}</span>
              <StatusBadge status={invoice.status || "Draft"} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Send / Send receipt are hidden for received self-bills — the customer already issued it. */}
              {!isReceivedSb && (
                <Btn onClick={() => { setSendDocumentType("invoice"); setShowSendModal(true); }} variant="dark" icon={<Icons.Send />}>
                  {isMobile ? "" : "Send"}
                </Btn>
              )}
              {!isReceivedSb && invoice.status === "Paid" && (
                <Btn variant="outline" icon={<Icons.Send />} onClick={() => { setSendDocumentType("payment_confirmation"); setShowSendModal(true); }}>Send receipt</Btn>
              )}
              {isReceivedSb ? (
                <Btn variant="outline" icon={<Icons.Receipt />} disabled={!receivedPdfUrl}
                  onClick={() => { if (receivedPdfUrl) window.open(receivedPdfUrl, "_blank", "noopener"); }}>
                  {receivedPdfUrl ? "Download original PDF" : receivedPdfMissing ? "Received PDF not available" : "Loading PDF…"}
                </Btn>
              ) : (
                <Btn variant="outline" icon={<Icons.Receipt />} onClick={() => setShowPrintModal(true)}>Print / PDF</Btn>
              )}
              <Btn variant="primary" icon={<Icons.Edit />} onClick={onEdit}>Edit</Btn>
              <Btn
                variant="ghost"
                icon={<Icons.Trash />}
                onClick={() => {
                  if (window.confirm(`Delete ${invoice.invoice_number}?`)) {
                    setInvoices(prev => prev.filter(x => x.id !== invoice.id));
                    toast({ title: "Invoice deleted", variant: "success" });
                    onClose();
                  }
                }}
              >
                Delete
              </Btn>
            </div>
          </div>

          {/* Received-self-bill banner (HMRC VAT Notice 700/62 §8 — customer issued this on our behalf). */}
          {isReceivedSb && (
            <div className="bg-[var(--warning-50)] border border-[var(--warning-100)] rounded-[var(--radius-lg)] px-[13px] py-[8px] mb-[13px] text-sm text-[var(--warning-700)]">
              This invoice was issued by <span className="font-semibold">{invoice.customer?.name || "the customer"}</span> under Self-Billing Agreement <span className="font-mono text-[13px]">{String(invoice.received_sb_agreement_id || "").slice(0, 8)}</span>{agreementVersion != null && ` v${agreementVersion}`}.
            </div>
          )}

          {/* Meta strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-[13px] mb-[21px]">
            <MetaCard label="Customer"   value={invoice.customer?.name || "—"} />
            <MetaCard label="Issue Date" value={fmtDate(invoice.issue_date)} />
            <MetaCard label={isReceivedSb ? "Customer's SB Ref" : "Due Date"}
                      value={isReceivedSb ? (invoice.received_sb_customer_ref || "—") : fmtDate(invoice.due_date)} />
            <MetaCard label="Amount"     value={fmt(currSym, invoice.total || 0)} />
          </div>

          {/* Activity log */}
          {(invoice.activity || []).length > 0 && (
            <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] mb-[21px] overflow-hidden">
              <div className="px-[21px] py-[13px] border-b border-[var(--border-subtle)]">
                <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Activity
                </span>
              </div>
              <div className="px-[21px]">
                {invoice.activity.map((entry, i) => (
                  <div
                    key={i}
                    className={[
                      "flex gap-[13px] py-[13px] border-l-2 border-[var(--border-subtle)] pl-[13px]",
                      i < invoice.activity.length - 1 ? "border-b border-b-[var(--border-subtle)]" : "",
                    ].join(" ")}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[var(--text-primary)]">{entry.action}</div>
                      <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
                        {entry.actor} · {new Date(entry.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Late payment panel */}
          {latePayment.eligible && (
            <div className="bg-[var(--danger-50)] border border-[var(--danger-100)] rounded-[var(--radius-lg)] p-[13px] mb-[21px]">
              <div className="text-sm font-semibold text-[var(--danger-700)] mb-2">
                Late Payment — Statutory Rights
              </div>
              <div className="text-xs text-[var(--danger-700)] leading-relaxed space-y-0.5">
                <div>Days overdue: <strong>{latePayment.daysOverdue}</strong></div>
                <div>Statutory interest ({latePayment.annualRate}% p.a.): <strong>£{latePayment.interest.toFixed(2)}</strong></div>
                <div>Daily rate: £{latePayment.dailyRate.toFixed(3)}/day</div>
                <div>Fixed compensation: <strong>£{latePayment.compensation.toFixed(2)}</strong></div>
                <div className="mt-2 pt-2 border-t border-[var(--danger-100)] text-sm font-bold">
                  Total claimable: £{latePayment.totalClaim.toFixed(2)}
                </div>
                <div className="mt-1 text-[10px] text-[var(--danger-700)]/80">
                  Legal basis: {latePayment.legalBasis}
                </div>
              </div>
            </div>
          )}

          {/* A4 document preview */}
          <div className="bg-[var(--surface-sunken)] p-[21px] rounded-[var(--radius-lg)] flex justify-center">
            <div className="w-full max-w-[794px] relative">
              <Ribbon status={invoice.status || "Draft"} />
              <div className="bg-white shadow-[var(--shadow-lg)]">
                <A4InvoiceDoc
                  data={docData}
                  currSymbol={currSym}
                  isVat={isVat}
                  orgSettings={{
                    ...orgSettings,
                    logo: companyLogo,
                    logoSize: Number(invoiceTemplateConfig?.logoSize || companyLogoSize || 52),
                  }}
                  accentColor={orgSettings?.branding?.accentColor || tplDef?.defaultAccent || "#1A1A1A"}
                  template={activeTemplate}
                  footerText={footerText || ""}
                  templateConfig={invoiceTemplateConfig || {}}
                  invoiceTemplate={activeInvoiceTemplate}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
