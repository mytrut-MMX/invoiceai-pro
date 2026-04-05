import { useContext, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ff, CUR_SYM, PDF_TEMPLATES } from "../../constants";
import { AppCtx } from "../../context/AppContext";
import { Icons } from "../icons";
import { Btn } from "../atoms";
import SendDocumentModal from "../../modals/SendDocumentModal";
import { fmt, fmtDate, getDocumentSentStatus, markDocumentAsSent } from "../../utils/helpers";
import { calcTotals } from "../../utils/calcTotals";
import { useCISSettings } from "../../hooks/useCISSettings";
import { getDefaultTemplate } from "../../utils/InvoiceTemplateSchema";
import { usePagination } from "../../hooks/usePagination";
import Pagination from "../shared/Pagination";

const STATUSES = ["Draft","Sent","Overdue","Paid","Void","Partial"];

const STATUS_BADGES = {
  Draft:   { bg:"#f1f5f9", color:"#475569", dot:"#94a3b8" },
  Sent:    { bg:"#eff6ff", color:"#1d4ed8", dot:"#3b82f6" },
  Overdue: { bg:"#fef2f2", color:"#b91c1c", dot:"#ef4444" },
  Paid:    { bg:"#f0fdf4", color:"#166534", dot:"#22c55e" },
  Partial: { bg:"#fffbeb", color:"#92400e", dot:"#f59e0b" },
  Void:    { bg:"#f3f4f6", color:"#6b7280", dot:"#d1d5db" },
};

const EmailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 446" width="18" height="18" fill="currentColor">
    <path d="M412 0H100C44.86 0 0 44.86 0 100v246c0 55.14 44.86 100 100 100h312c55.14 0 100-44.86 100-100V100C512 44.86 467.14 0 412 0zm60 346c0 33.08-26.92 60-60 60H100c-33.08 0-60-26.92-60-60V100c0-33.08 26.92-60 60-60h312c33.08 0 60 26.92 60 60v246z"/>
    <path d="M387.16 112.78l-107.98 76.47c-13.84 9.8-32.44 9.8-46.28 0l-107.97-76.47c-9.01-6.38-21.5-4.25-27.88 4.76-6.38 9.01-4.25 21.5 4.76 27.88l107.97 76.47c13.84 9.8 30.05 14.7 46.26 14.7s32.43-4.9 46.26-14.7l107.98-76.47c9.01-6.38 11.15-18.87 4.76-27.88-6.38-9.01-18.87-11.15-27.88-4.76z"/>
  </svg>
);

function StatusBadge({ status }) {
  const s = STATUS_BADGES[status] || { bg:"#f3f4f6", color:"#6b7280", dot:"#d1d5db" };
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"2px 8px", borderRadius:20, background:s.bg, color:s.color, fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:s.dot, flexShrink:0 }} />
      {status || "Draft"}
    </span>
  );
}

function daysDiff(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr); d.setHours(0,0,0,0);
  const t = new Date(); t.setHours(0,0,0,0);
  return Math.round((d - t) / 86400000);
}

function DueDateCell({ dueDate, status }) {
  const diff = daysDiff(dueDate);
  const isPaidOrVoid = status === "Paid" || status === "Void" || status === "Draft";
  let hint = null;
  if (!isPaidOrVoid && diff !== null) {
    if (diff < 0)       hint = { text:`${Math.abs(diff)}d overdue`, color:"#b91c1c" };
    else if (diff === 0) hint = { text:"Due today",                  color:"#d97706" };
    else if (diff <= 3)  hint = { text:`Due in ${diff}d`,            color:"#d97706" };
  }
  return (
    <div>
      <div style={{ fontSize:13, color:"#6b7280" }}>{fmtDate(dueDate)}</div>
      {hint && <div style={{ fontSize:10, fontWeight:700, color:hint.color, marginTop:1, letterSpacing:"0.02em" }}>{hint.text}</div>}
    </div>
  );
}

const AVATARS = [
  { bg:"#eff6ff", fg:"#1d4ed8" },{ bg:"#fef3c7", fg:"#92400e" },
  { bg:"#f0fdf4", fg:"#166534" },{ bg:"#fdf4ff", fg:"#7e22ce" },
  { bg:"#fff1f2", fg:"#be123c" },{ bg:"#f0f9ff", fg:"#0369a1" },
];
const avatarFor = (name = "") => AVATARS[name.charCodeAt(0) % AVATARS.length];

export default function InvoiceListView({ onNewInvoice, onViewInvoice, onEditInvoice }) {
  const { invoices, setInvoices, orgSettings, pdfTemplate, companyLogo, companyLogoSize, footerText, invoiceTemplateConfig } = useContext(AppCtx);
  const { cisEnabled, cisDefaultRate } = useCISSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const isVat = orgSettings?.vatReg === "Yes";
  const currSym = CUR_SYM[orgSettings?.currency || "GBP"] || "£";

  const [showSendModal,    setShowSendModal]    = useState(false);
  const [sendDocumentType, setSendDocumentType] = useState("invoice");
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const search       = searchParams.get("q") || "";
  const filterStatus = searchParams.get("status") || "All";

  const setSearch = (v) => setSearchParams(p => { const n = new URLSearchParams(p); v ? n.set("q", v) : n.delete("q"); return n; }, { replace: true });
  const setFilterStatus = (v) => setSearchParams(p => { const n = new URLSearchParams(p); v && v !== "All" ? n.set("status", v) : n.delete("status"); return n; }, { replace: true });

  const filtered = useMemo(() => invoices.filter(inv => {
    const matchSearch = !search ||
      inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || inv.status === filterStatus;
    return matchSearch && matchStatus;
  }), [invoices, search, filterStatus]);

  const metrics = useMemo(() => {
    const overdueInvs = invoices.filter(i => i.status === "Overdue");
    return {
      total:        invoices.length,
      unpaid:       invoices.filter(i => ["Sent","Partial","Overdue"].includes(i.status)).reduce((s,i) => s + Number(i.total||0), 0),
      overdueAmt:   overdueInvs.reduce((s,i) => s + Number(i.total||0), 0),
      overdueCount: overdueInvs.length,
      paid:         invoices.filter(i => i.status === "Paid").reduce((s,i) => s + Number(i.total||0), 0),
      outstanding:  invoices.filter(i => ["Sent","Partial"].includes(i.status)).reduce((s,i) => s + Number(i.total||0), 0),
    };
  }, [invoices]);

  const statusCounts = useMemo(() => {
    const counts = { All: invoices.length };
    for (const s of STATUSES) counts[s] = invoices.filter(i => i.status === s).length;
    return counts;
  }, [invoices]);

  const hasFilters = search || filterStatus !== "All";

  const { page, setPage, totalPages, paginatedItems, totalItems, pageSize } = usePagination(filtered, 25);

  return (
    <div style={{ padding:"clamp(14px,4vw,28px) clamp(12px,4vw,32px)", maxWidth:1100, background:"#f4f5f7", minHeight:"100vh", fontFamily:ff }}>
      {showSendModal && selectedDocument && (() => {
        const doc = selectedDocument;
        const totals = calcTotals(
          doc.line_items || [],
          doc.discount_type || "percent",
          doc.discount_value || "",
          doc.shipping || "",
          isVat,
          doc.customer,
          cisEnabled,
          cisDefaultRate
        );
        const selectedDocData = {
          docNumber: doc.invoice_number,
          customer: doc.customer,
          issueDate: doc.issue_date,
          dueDate: doc.due_date,
          paymentTerms: doc.payment_terms,
          items: doc.line_items || [],
          ...totals,
          notes: doc.notes || "",
          terms: doc.terms || "",
          status: doc.status,
          poNumber: doc.po_number || "",
          docType: "invoice",
        };
        const activeTemplate = doc.template || pdfTemplate || "classic";
        const tplDef = PDF_TEMPLATES.find(t => t.id === activeTemplate) || PDF_TEMPLATES[0];
        return (
          <SendDocumentModal
            documentType={sendDocumentType}
            document={{ ...doc, invoiceNumber: doc.invoice_number, dueDate: doc.due_date, currency: orgSettings?.currency || "GBP" }}
            company={{ ...orgSettings, companyName: orgSettings?.companyName || orgSettings?.name }}
            customer={selectedCustomer || {}}
            onClose={() => setShowSendModal(false)}
            onSent={() => {
              setShowSendModal(false);
              if (doc.id) markDocumentAsSent(doc.id);
            }}
            docData={selectedDocData}
            currSymbol={currSym}
            isVat={isVat}
            pdfTemplate={activeTemplate}
            accentColor={tplDef?.defaultAccent}
            footerText={footerText || ""}
            invoiceTemplate={getDefaultTemplate()}
            orgSettings={{ ...orgSettings, logo: companyLogo, logoSize: Number(invoiceTemplateConfig?.logoSize || companyLogoSize || 52) }}
          />
        );
      })()}

      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, marginBottom:20, flexWrap:"wrap" }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, color:"#1a1a2e", margin:"0 0 3px" }}>Invoices</h1>
          <p style={{ color:"#6b7280", fontSize:12, margin:0 }}>
            {invoices.length} invoice{invoices.length !== 1 ? "s" : ""} · accounts receivable
          </p>
        </div>
        <Btn onClick={onNewInvoice} variant="primary" icon={<Icons.Plus />}>New Invoice</Btn>
      </div>

      {/* Summary strip */}
      {invoices.length > 0 && (
        <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
          {[
            { label:"Total Invoices", value:metrics.total,                    color:"#374151" },
            { label:"Unpaid",         value:fmt(currSym, metrics.unpaid),      color:"#1d4ed8" },
            { label:"Overdue",        value:fmt(currSym, metrics.overdueAmt),  sub: metrics.overdueCount > 0 ? `${metrics.overdueCount} invoice${metrics.overdueCount>1?"s":""}` : null, color: metrics.overdueCount > 0 ? "#b91c1c" : "#374151" },
            { label:"Collected",      value:fmt(currSym, metrics.paid),        color:"#166534" },
            { label:"Outstanding",    value:fmt(currSym, metrics.outstanding), color: metrics.outstanding > 0 ? "#92400e" : "#374151" },
          ].map(m => (
            <div key={m.label} style={{ background:"#fff", border:"1px solid #e8e8ec", borderRadius:10, padding:"14px 18px", flex:"1 1 130px", minWidth:0 }}>
              <div style={{ fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:5 }}>{m.label}</div>
              <div style={{ fontSize:18, fontWeight:800, color:m.color, fontVariantNumeric:"tabular-nums", lineHeight:1.2 }}>{m.value}</div>
              {m.sub && <div style={{ fontSize:10, color:"#b91c1c", fontWeight:600, marginTop:2 }}>{m.sub}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Main card */}
      <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e8e8ec", boxShadow:"0 1px 4px rgba(0,0,0,0.05)", overflow:"hidden" }}>

        {/* Toolbar */}
        <div style={{ padding:"10px 16px", borderBottom:"1px solid #f0f0f4", display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:7, flex:"1 1 200px", minWidth:160, background:"#f9fafb", border:"1px solid #e8e8ec", borderRadius:7, padding:"6px 10px" }}>
            <span style={{ color:"#9ca3af", display:"flex", flexShrink:0 }}><Icons.Search /></span>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by number or customer…"
              style={{ flex:1, border:"none", outline:"none", fontSize:13, color:"#1a1a2e", background:"transparent", fontFamily:ff }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ background:"none", border:"none", cursor:"pointer", color:"#9ca3af", fontSize:13, padding:0, lineHeight:1 }}>×</button>
            )}
          </div>

          <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
            {["All", ...STATUSES].map(s => {
              const active = filterStatus === s;
              const cnt = statusCounts[s] || 0;
              return (
                <button key={s} onClick={() => setFilterStatus(s)}
                  style={{ padding:"5px 10px", border:"1px solid", borderRadius:6, cursor:"pointer", fontFamily:ff, fontSize:11, fontWeight:active ? 700 : 500, background:active ? "#1a1a2e" : "#fff", color:active ? "#fff" : "#6b7280", borderColor:active ? "#1a1a2e" : "#e8e8ec", transition:"all 0.12s", display:"flex", alignItems:"center", gap:4 }}>
                  {s}
                  {cnt > 0 && s !== "All" && (
                    <span style={{ fontSize:10, fontWeight:700, background:active ? "rgba(255,255,255,0.2)" : "#f3f4f6", color:active ? "#fff" : "#374151", borderRadius:10, padding:"0 5px", lineHeight:"16px" }}>{cnt}</span>
                  )}
                </button>
              );
            })}
          </div>

          {hasFilters && (
            <button onClick={() => { setSearch(""); setFilterStatus("All"); }}
              style={{ background:"none", border:"none", cursor:"pointer", color:"#6b7280", fontSize:12, fontFamily:ff, padding:"4px 6px", borderRadius:5, whiteSpace:"nowrap" }}>
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:620 }}>
            <thead>
              <tr style={{ background:"#f9fafb", borderBottom:"1px solid #f0f0f4" }}>
                {[
                  { label:"Invoice",  align:"left"  },
                  { label:"Customer", align:"left"  },
                  { label:"Issued",   align:"left"  },
                  { label:"Due",      align:"left"  },
                  { label:"Amount",   align:"right" },
                  { label:"Status",   align:"left"  },
                  { label:"",         align:"right" },
                ].map(({ label, align }) => (
                  <th key={label} style={{ padding:"8px 16px", textAlign:align, fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.07em", whiteSpace:"nowrap" }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding:"60px 24px", textAlign:"center" }}>
                    {invoices.length === 0 ? (
                      <>
                        <div style={{ fontSize:36, marginBottom:10 }}>📄</div>
                        <div style={{ fontSize:15, fontWeight:700, color:"#1a1a2e", marginBottom:6 }}>No invoices yet</div>
                        <div style={{ fontSize:13, color:"#6b7280", marginBottom:18 }}>Create your first invoice to start getting paid</div>
                        <Btn variant="primary" icon={<Icons.Plus />} onClick={onNewInvoice}>New Invoice</Btn>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize:28, marginBottom:10 }}>🔍</div>
                        <div style={{ fontSize:14, fontWeight:600, color:"#1a1a2e", marginBottom:4 }}>No invoices match your filters</div>
                        <div style={{ fontSize:12, color:"#6b7280", marginBottom:14 }}>Try adjusting your search or status filter</div>
                        <Btn variant="outline" onClick={() => { setSearch(""); setFilterStatus("All"); }}>Clear filters</Btn>
                      </>
                    )}
                  </td>
                </tr>
              ) : paginatedItems.map(inv => {
                const isOverdue = inv.status === "Overdue";
                const av = avatarFor(inv.customer?.name || "");
                const sentStatus = getDocumentSentStatus(inv.id);
                return (
                  <tr key={inv.id}
                    onClick={() => onViewInvoice(inv)}
                    style={{ borderBottom:"1px solid #f3f4f6", cursor:"pointer", borderLeft: isOverdue ? "3px solid #fca5a5" : "3px solid transparent", transition:"background 0.1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f8faff"}
                    onMouseLeave={e => e.currentTarget.style.background = ""}
                  >
                    {/* Invoice # */}
                    <td style={{ padding:"11px 16px", whiteSpace:"nowrap" }}>
                      <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", letterSpacing:"0.01em" }}>{inv.invoice_number}</div>
                      {inv.po_number && <div style={{ fontSize:11, color:"#6b7280", marginTop:1 }}>PO: {inv.po_number}</div>}
                    </td>

                    {/* Customer */}
                    <td style={{ padding:"11px 16px", minWidth:160 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ width:30, height:30, borderRadius:"50%", background:av.bg, color:av.fg, fontWeight:700, fontSize:12, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          {(inv.customer?.name || "?")[0].toUpperCase()}
                        </div>
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontSize:13, color:"#1a1a2e", fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:180 }}>{inv.customer?.name || "—"}</div>
                          {inv.customer?.type && <div style={{ fontSize:11, color:"#6b7280", marginTop:1 }}>{inv.customer.type}</div>}
                        </div>
                      </div>
                    </td>

                    {/* Issue date */}
                    <td style={{ padding:"11px 16px", fontSize:13, color:"#6b7280", whiteSpace:"nowrap" }}>{fmtDate(inv.issue_date)}</td>

                    {/* Due date */}
                    <td style={{ padding:"11px 16px", whiteSpace:"nowrap" }}>
                      <DueDateCell dueDate={inv.due_date} status={inv.status} />
                    </td>

                    {/* Amount */}
                    <td style={{ padding:"11px 16px", textAlign:"right", whiteSpace:"nowrap" }}>
                      <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", fontVariantNumeric:"tabular-nums" }}>{fmt(currSym, inv.total || 0)}</div>
                    </td>

                    {/* Status */}
                    <td style={{ padding:"11px 16px", whiteSpace:"nowrap" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                        <StatusBadge status={inv.status || "Draft"} />
                        {sentStatus && (
                          <span style={{ display:"inline-flex", alignItems:"center", padding:"2px 8px", borderRadius:20, background:"#ecfdf5", border:"1px solid #bbf7d0", color:"#166534", fontSize:10, fontWeight:700, letterSpacing:"0.02em" }}>
                            Sent
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding:"11px 16px", textAlign:"right", whiteSpace:"nowrap" }} onClick={e => e.stopPropagation()}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", gap:4 }}>
                        <button
                          onClick={() => {
                            setSelectedDocument({ ...inv, invoiceNumber: inv.invoice_number, dueDate: inv.due_date, currency: orgSettings?.currency || "GBP" });
                            setSelectedCustomer(inv.customer || null);
                            setSendDocumentType(inv.status === "Paid" ? "payment_confirmation" : "invoice");
                            setShowSendModal(true);
                          }}
                          title={inv.status === "Paid" ? "Send receipt" : "Send invoice"}
                          style={{ background:"none", border:"1px solid #e8e8ec", borderRadius:6, padding:"5px 7px", cursor:"pointer", color:"#6b7280", display:"flex", alignItems:"center", transition:"all 0.12s" }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor="#1e6be0"; e.currentTarget.style.color="#1e6be0"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor="#e8e8ec"; e.currentTarget.style.color="#6b7280"; }}
                        ><EmailIcon /></button>
                        <button
                          onClick={() => onEditInvoice(inv)}
                          title="Edit invoice"
                          style={{ background:"none", border:"1px solid #e8e8ec", borderRadius:6, padding:"5px 7px", cursor:"pointer", color:"#6b7280", display:"flex", alignItems:"center", transition:"all 0.12s" }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor="#1e6be0"; e.currentTarget.style.color="#1e6be0"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor="#e8e8ec"; e.currentTarget.style.color="#6b7280"; }}
                        ><Icons.Edit /></button>
                        <button
                          onClick={() => window.confirm(`Delete ${inv.invoice_number}?`) && setInvoices(prev => prev.filter(x => x.id !== inv.id))}
                          title="Delete invoice"
                          style={{ background:"none", border:"1px solid #e8e8ec", borderRadius:6, padding:"5px 7px", cursor:"pointer", color:"#6b7280", display:"flex", alignItems:"center", transition:"all 0.12s" }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor="#fecaca"; e.currentTarget.style.color="#dc2626"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor="#e8e8ec"; e.currentTarget.style.color="#6b7280"; }}
                        ><Icons.Trash /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div style={{ padding:"0 16px", borderTop:"1px solid #f0f0f4" }}>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={totalItems} pageSize={pageSize} />
          </div>
        )}

        {/* Footer */}
        {filtered.length > 0 && (
          <div style={{ padding:"8px 16px", borderTop:"1px solid #f0f0f4", fontSize:11, color:"#9ca3af", textAlign:"right" }}>
            {hasFilters ? `${filtered.length} of ${invoices.length}` : invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
