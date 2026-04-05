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
import { getDefaultTemplate, getTemplateById } from "../../utils/InvoiceTemplateSchema";

const EmailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 446" width="18" height="18" fill="currentColor">
    <path d="M412 0H100C44.86 0 0 44.86 0 100v246c0 55.14 44.86 100 100 100h312c55.14 0 100-44.86 100-100V100C512 44.86 467.14 0 412 0zm60 346c0 33.08-26.92 60-60 60H100c-33.08 0-60-26.92-60-60V100c0-33.08 26.92-60 60-60h312c33.08 0 60 26.92 60 60v246z"/>
    <path d="M387.16 112.78l-107.98 76.47c-13.84 9.8-32.44 9.8-46.28 0l-107.97-76.47c-9.01-6.38-21.5-4.25-27.88 4.76-6.38 9.01-4.25 21.5 4.76 27.88l107.97 76.47c13.84 9.8 30.05 14.7 46.26 14.7s32.43-4.9 46.26-14.7l107.98-76.47c9.01-6.38 11.15-18.87 4.76-27.88-6.38-9.01-18.87-11.15-27.88-4.76z"/>
  </svg>
);

export default function InvoiceViewPanel({ invoice, onEdit, onDelete, onClose }) {
  const { orgSettings, pdfTemplate, companyLogo, companyLogoSize, footerText, invoiceTemplateConfig, setInvoices } = useContext(AppCtx);
  const { cisEnabled, cisDefaultRate } = useCISSettings();
  const isVat = orgSettings?.vatReg === "Yes";
  const currSym = CUR_SYM[orgSettings?.currency || "GBP"] || "£";
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendDocumentType, setSendDocumentType] = useState("invoice");
  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth < 768 : false));

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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
      <div style={{ width: "100%", maxWidth: 1100, margin: "0 auto", fontFamily: ff, padding: "clamp(14px,4vw,28px) clamp(12px,4vw,32px)" }}>
        {/* Action bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={onClose}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", border: "1.5px solid #e0e0e0", borderRadius: 8, background: "#fff", color: "#444", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: ff }}>
              ← Invoices
            </button>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#1A1A1A" }}>{invoice.invoice_number}</span>
            <Tag color={STATUS_COLORS[invoice.status] || "#888"}>{invoice.status || "Draft"}</Tag>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => { setSendDocumentType("invoice"); setShowSendModal(true); }}
              style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 16px", background: "#111110", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", fontFamily: ff, fontWeight: 500, cursor: "pointer" }}
            >
              <EmailIcon />
              {!isMobile && "Send"}
            </button>
            {invoice.status === "Paid" && (
              <Btn variant="outline" icon={<EmailIcon />} onClick={() => { setSendDocumentType("payment_confirmation"); setShowSendModal(true); }}>
                Send Receipt
              </Btn>
            )}
            <Btn variant="outline" icon={<Icons.Receipt />} onClick={() => setShowPrintModal(true)}>Print / PDF</Btn>
            <Btn variant="primary" icon={<Icons.Edit />} onClick={onEdit}>Edit</Btn>
            <Btn variant="ghost" icon={<Icons.Trash />}
              onClick={() => {
                if (window.confirm(`Delete ${invoice.invoice_number}?`)) {
                  setInvoices(prev => prev.filter(x => x.id !== invoice.id));
                  onClose();
                }
              }}>
              Delete
            </Btn>
          </div>
        </div>

        {/* Invoice meta row */}
        <div style={{ display: "flex", gap: 24, marginBottom: 20, flexWrap: "wrap" }}>
          {[
            { label: "Customer", value: invoice.customer?.name || "—" },
            { label: "Issue Date", value: fmtDate(invoice.issue_date) },
            { label: "Due Date",   value: fmtDate(invoice.due_date) },
            { label: "Amount",     value: fmt(currSym, invoice.total || 0) },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: "#fff", border: "1px solid #e8e8ec", borderRadius: 8, padding: "10px 16px", minWidth: 120 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A" }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Activity log */}
        {(invoice.activity || []).length > 0 && (
          <div style={{ background:"#fff", border:"1px solid #e8e8ec", borderRadius:10, marginBottom:20, overflow:"hidden" }}>
            <div style={{ padding:"10px 18px", borderBottom:"1px solid #f0f0f0" }}>
              <span style={{ fontSize:12, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em" }}>Activity</span>
            </div>
            <div style={{ padding:"4px 18px" }}>
              {invoice.activity.map((entry, i) => (
                <div key={i} style={{ display:"flex", gap:12, padding:"10px 0", borderBottom: i < invoice.activity.length - 1 ? "1px solid #f7f7f7" : "none" }}>
                  <div style={{ width:2, minHeight:32, background:"#e8e8ec", borderRadius:2, flexShrink:0, marginTop:3 }} />
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:"#1a1a2e" }}>{entry.action}</div>
                    <div style={{ fontSize:11, color:"#AAA", marginTop:2 }}>{entry.actor} · {new Date(entry.timestamp).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* A4 document preview */}
        <div style={{ background: "#e8e8ec", padding: "28px 16px", borderRadius: 12, display: "flex", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: 794, position: "relative" }}>
            <Ribbon status={invoice.status || "Draft"} />
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
                invoiceTemplate={activeInvoiceTemplate}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
