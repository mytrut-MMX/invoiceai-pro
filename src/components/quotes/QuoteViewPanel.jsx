import { useState, useEffect, useContext } from "react";
import { ff, STATUS_COLORS, CUR_SYM, PDF_TEMPLATES } from "../../constants";
import { AppCtx } from "../../context/AppContext";
import { Icons } from "../icons";
import { Btn, Tag, Ribbon } from "../atoms";
import { A4PrintModal, A4InvoiceDoc } from "../shared";
import SendDocumentModal from "../../modals/SendDocumentModal";
import { fmt, fmtDate, markDocumentAsSent } from "../../utils/helpers";
import { calcTotals } from "../../utils/calcTotals";
import { useCISSettings } from "../../hooks/useCISSettings";

const EmailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 446" width="18" height="18" fill="currentColor">
    <path d="M412 0H100C44.86 0 0 44.86 0 100v246c0 55.14 44.86 100 100 100h312c55.14 0 100-44.86 100-100V100C512 44.86 467.14 0 412 0zm60 346c0 33.08-26.92 60-60 60H100c-33.08 0-60-26.92-60-60V100c0-33.08 26.92-60 60-60h312c33.08 0 60 26.92 60 60v246z"/>
    <path d="M387.16 112.78l-107.98 76.47c-13.84 9.8-32.44 9.8-46.28 0l-107.97-76.47c-9.01-6.38-21.5-4.25-27.88 4.76-6.38 9.01-4.25 21.5 4.76 27.88l107.97 76.47c13.84 9.8 30.05 14.7 46.26 14.7s32.43-4.9 46.26-14.7l107.98-76.47c9.01-6.38 11.15-18.87 4.76-27.88-6.38-9.01-18.87-11.15-27.88-4.76z"/>
  </svg>
);

export default function QuoteViewPanel({ quote, onEdit, onDelete, onConvert, onClose }) {
  const { orgSettings, pdfTemplate, companyLogo, companyLogoSize, footerText, invoiceTemplateConfig } = useContext(AppCtx);
  const { cisEnabled, cisDefaultRate } = useCISSettings();
  const isVat = orgSettings?.vatReg === "Yes";
  const currSym = CUR_SYM[orgSettings?.currency || "GBP"] || "£";
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendDocumentType, setSendDocumentType] = useState("quote");
  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth < 768 : false));

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
        />
      )}
      <div style={{ width: "100%", maxWidth: 1100, margin: "0 auto", fontFamily: ff, padding: "clamp(14px,4vw,28px) clamp(12px,4vw,32px)" }}>
        {/* Action bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={onClose}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", border: "1.5px solid #e0e0e0", borderRadius: 8, background: "#fff", color: "#444", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: ff }}>
              ← Quotes
            </button>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#1A1A1A" }}>{quote.quote_number}</span>
            <Tag color={STATUS_COLORS[quote.status] || "#888"}>{quote.status || "Draft"}</Tag>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => { setSendDocumentType("quote"); setShowSendModal(true); }}
              style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 16px", background: "#111110", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", fontFamily: ff, fontWeight: 500, cursor: "pointer" }}
            >
              <EmailIcon />
              {!isMobile && "Send"}
            </button>
            <Btn variant="outline" icon={<Icons.Receipt />} onClick={() => setShowPrintModal(true)}>Print / PDF</Btn>
            {!isInvoiced && (
              <>
                <Btn variant="outline" icon={<Icons.Invoices />} onClick={onConvert}>Convert to Invoice</Btn>
                <Btn variant="primary" icon={<Icons.Edit />} onClick={onEdit}>Edit</Btn>
              </>
            )}
            <Btn variant="ghost" icon={<Icons.Trash />}
              onClick={() => { if (window.confirm(`Delete ${quote.quote_number}?`)) onDelete(); }}>
              Delete
            </Btn>
          </div>
        </div>

        {/* Meta cards */}
        <div style={{ display: "flex", gap: 24, marginBottom: 20, flexWrap: "wrap" }}>
          {[
            { label: "Customer",   value: quote.customer?.name || "—" },
            { label: "Issue Date", value: fmtDate(quote.issue_date) },
            { label: "Expires",    value: fmtDate(quote.expiry_date) },
            { label: "Amount",     value: fmt(currSym, quote.total || 0) },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: "#fff", border: "1px solid #e8e8ec", borderRadius: 8, padding: "10px 16px", minWidth: 120 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A" }}>{value}</div>
            </div>
          ))}
        </div>

        {/* A4 document */}
        <div style={{ background: "#e8e8ec", padding: "28px 16px", borderRadius: 12, display: "flex", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: 794, position: "relative" }}>
            <Ribbon status={quote.status || "Draft"} />
            <div style={{ background: "#fff", boxShadow: "0 4px 24px rgba(0,0,0,0.14)" }}>
              <A4InvoiceDoc
                data={docData}
                currSymbol={currSym}
                isVat={isVat}
                orgSettings={{ ...orgSettings, logo: companyLogo, logoSize: Number(invoiceTemplateConfig?.logoSize || companyLogoSize || 52) }}
                accentColor={tplDef?.defaultAccent || "#1A1A1A"}
                template={activeTemplate}
                footerText={footerText || ""}
                templateConfig={invoiceTemplateConfig || {}}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
