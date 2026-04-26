import { useState, useEffect, useContext } from "react";
import { CUR_SYM, PDF_TEMPLATES } from "../../constants";
import { AppCtx } from "../../context/AppContext";
import { Icons } from "../icons";
import { Btn, Ribbon, StatusBadge } from "../atoms";
import { A4PrintModal, A4InvoiceDoc } from "../shared";
import SendDocumentModal from "../../modals/SendDocumentModal";
import { fmt, fmtDate, markDocumentAsSent } from "../../utils/helpers";
import { calcTotals } from "../../utils/calcTotals";
import { useCISSettings } from "../../hooks/useCISSettings";
import { getDefaultTemplate } from "../../utils/InvoiceTemplateSchema";

function MetaCard({ label, value }) {
  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-3">
      <div className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">{label}</div>
      <div className="text-sm font-semibold text-[var(--text-primary)] truncate">{value}</div>
    </div>
  );
}

export default function QuoteViewPanel({ quote, onEdit, onDelete, onConvert, onClose }) {
  const { orgSettings, pdfTemplate, companyLogo, companyLogoSize, footerText, invoiceTemplateConfig } = useContext(AppCtx);
  const { cisEnabled, cisDefaultRate } = useCISSettings();
  const isVat = orgSettings?.vatReg === "Yes";
  const currSym = CUR_SYM[orgSettings?.currency || "GBP"] || "£";
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendDocumentType, setSendDocumentType] = useState("quote");
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" ? window.innerWidth < 768 : false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const totals = calcTotals(
    quote.line_items || [],
    quote.discount_type || "percent",
    quote.discount_value || "",
    quote.shipping || "",
    isVat,
    quote.customer,
    cisEnabled,
    cisDefaultRate,
    true
  );

  const docData = {
    docNumber: quote.quote_number,
    customer: quote.customer,
    issueDate: quote.issue_date,
    dueDate: quote.expiry_date,
    paymentTerms: quote.payment_terms || "Valid 30 days",
    items: quote.line_items || [],
    ...totals,
    cisDeduction: totals.cisEstimate || totals.cisDeduction || 0,
    total: totals.hasCISItems ? totals.grossTotal - (totals.cisEstimate || 0) : totals.total,
    notes: quote.notes || "",
    terms: quote.terms || "",
    status: quote.status,
    poNumber: quote.po_number || "",
    docType: "quote",
  };

  const activeTemplate = quote.template || pdfTemplate || "classic";
  const tplDef = PDF_TEMPLATES.find(t => t.id === activeTemplate) || PDF_TEMPLATES[0];
  const isInvoiced = quote.status === "Invoiced";
  const mappedQuote = {
    ...quote,
    quoteNumber: quote.quote_number,
    dueDate: quote.expiry_date,
    currency: orgSettings?.currency || "GBP",
  };

  return (
    <>
      {showPrintModal && (
        <A4PrintModal data={docData} currSymbol={currSym} isVat={isVat} onClose={() => setShowPrintModal(false)} />
      )}
      {showSendModal && (
        <SendDocumentModal
          documentType={sendDocumentType}
          document={mappedQuote}
          company={{ ...orgSettings, companyName: orgSettings?.companyName || orgSettings?.name }}
          customer={quote.customer || {}}
          onClose={() => setShowSendModal(false)}
          onSent={() => {
            setShowSendModal(false);
            markDocumentAsSent(quote.id);
          }}
          docData={docData}
          currSymbol={currSym}
          isVat={isVat}
          pdfTemplate={activeTemplate}
          accentColor={orgSettings?.branding?.accentColor || tplDef?.defaultAccent}
          footerText={footerText || ""}
          invoiceTemplate={getDefaultTemplate()}
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
                ← Quotes
              </button>
              <span className="text-lg font-semibold text-[var(--text-primary)]">{quote.quote_number}</span>
              <StatusBadge status={quote.status || "Draft"} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Btn
                onClick={() => { setSendDocumentType("quote"); setShowSendModal(true); }}
                variant="dark"
                icon={<Icons.Send />}
              >
                {isMobile ? "" : "Send"}
              </Btn>
              <Btn variant="outline" icon={<Icons.Receipt />} onClick={() => setShowPrintModal(true)}>Print / PDF</Btn>
              {!isInvoiced && (
                <>
                  <Btn variant="outline" icon={<Icons.Invoices />} onClick={onConvert}>Convert to invoice</Btn>
                  <Btn variant="primary" icon={<Icons.Edit />} onClick={onEdit}>Edit</Btn>
                </>
              )}
              <Btn
                variant="ghost"
                icon={<Icons.Trash />}
                onClick={() => { if (window.confirm(`Delete ${quote.quote_number}?`)) onDelete(); }}
              >
                Delete
              </Btn>
            </div>
          </div>

          {/* Meta strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <MetaCard label="Customer"   value={quote.customer?.name || "—"} />
            <MetaCard label="Issue Date" value={fmtDate(quote.issue_date)} />
            <MetaCard label="Expires"    value={fmtDate(quote.expiry_date)} />
            <MetaCard label="Amount"     value={fmt(currSym, quote.total || 0)} />
          </div>

          {/* A4 document preview */}
          <div className="bg-[var(--surface-sunken)] p-6 rounded-[var(--radius-lg)] flex justify-center">
            <div className="w-full max-w-[794px] relative">
              <Ribbon status={quote.status || "Draft"} />
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
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
