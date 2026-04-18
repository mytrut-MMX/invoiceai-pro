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

function MetaCard({ label, value }) {
  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-3">
      <div className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="text-sm font-semibold text-[var(--text-primary)] truncate">{value}</div>
    </div>
  );
}

export default function InvoiceViewPanel({ invoice, onEdit, onDelete, onClose }) {
  const { orgSettings, pdfTemplate, companyLogo, companyLogoSize, footerText, invoiceTemplateConfig, setInvoices } = useContext(AppCtx);
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

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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
          accentColor={tplDef?.defaultAccent}
          footerText={footerText || ""}
          invoiceTemplate={activeInvoiceTemplate}
        />
      )}

      <div className="bg-[var(--surface-page)] min-h-screen">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6">
          {/* Action bar */}
          <div className="flex items-center justify-between gap-2 mb-5 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
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
              <Btn
                onClick={() => { setSendDocumentType("invoice"); setShowSendModal(true); }}
                variant="dark"
                icon={<Icons.Send />}
              >
                {isMobile ? "" : "Send"}
              </Btn>
              {invoice.status === "Paid" && (
                <Btn variant="outline" icon={<Icons.Send />} onClick={() => { setSendDocumentType("payment_confirmation"); setShowSendModal(true); }}>
                  Send receipt
                </Btn>
              )}
              <Btn variant="outline" icon={<Icons.Receipt />} onClick={() => setShowPrintModal(true)}>Print / PDF</Btn>
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

          {/* Meta strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <MetaCard label="Customer"   value={invoice.customer?.name || "—"} />
            <MetaCard label="Issue Date" value={fmtDate(invoice.issue_date)} />
            <MetaCard label="Due Date"   value={fmtDate(invoice.due_date)} />
            <MetaCard label="Amount"     value={fmt(currSym, invoice.total || 0)} />
          </div>

          {/* Activity log */}
          {(invoice.activity || []).length > 0 && (
            <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] mb-5 overflow-hidden">
              <div className="px-5 py-3 border-b border-[var(--border-subtle)]">
                <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Activity
                </span>
              </div>
              <div className="px-5">
                {invoice.activity.map((entry, i) => (
                  <div
                    key={i}
                    className={[
                      "flex gap-3 py-3 border-l-2 border-[var(--border-subtle)] pl-3",
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
            <div className="bg-[var(--danger-50)] border border-[var(--danger-100)] rounded-[var(--radius-lg)] p-4 mb-5">
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
          <div className="bg-[var(--surface-sunken)] p-6 rounded-[var(--radius-lg)] flex justify-center">
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
                  accentColor={tplDef?.defaultAccent || "#1A1A1A"}
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
