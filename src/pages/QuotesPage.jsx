import { useState, useContext, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { ff, STATUS_COLORS, CUR_SYM, DEFAULT_QUOTE_TERMS, QUOTE_STATUSES } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Field, Input, Textarea, Btn, Tag, Ribbon } from "../components/atoms";
import { LineItemsTable, SaveSplitBtn, A4PrintModal, A4InvoiceDoc, CustomerPicker } from "../components/shared";
import { PDF_TEMPLATES } from "../constants";
import { fmt, fmtDate, todayStr, addDays, nextNum, newLine, parseCisRate } from "../utils/helpers";
import ItemModal from "../modals/ItemModal";
import { useCISSettings } from "../hooks/useCISSettings";

// ─── helpers ──────────────────────────────────────────────────────────────────
function calcTotals(items, discType, discVal, shipping, isVat, customer, cisEnabled, cisDefaultRate) {
  const subtotal = items.reduce((s,i)=>s+Number(i.amount||0), 0);
  const discAmt = discType==="percent" ? subtotal*(Number(discVal)/100) : Math.min(Number(discVal)||0, subtotal);
  const afterDisc = subtotal - discAmt;
  const ship = Number(shipping)||0;
  const taxBreakdown = isVat
    ? Object.values(items.reduce((acc,it)=>{
        const r=Number(it.tax_rate||0); if(!r) return acc;
        if(!acc[r]) acc[r]={rate:r,amount:0};
        const base = Number(it.amount||0) - (subtotal>0 ? discAmt*(Number(it.amount||0)/subtotal) : 0);
        acc[r].amount += base*(r/100);
        return acc;
      },{}))
    : [];
  const vatTotal = taxBreakdown.reduce((s,t)=>s+t.amount,0);
  const gross = afterDisc + ship + vatTotal;
  const customerCIS = customer?.cis || {
    registered: !!customer?.taxDetails?.cisRegistered,
    rateValue: parseCisRate(customer?.taxDetails?.cisRate, cisDefaultRate),
    rate: customer?.taxDetails?.cisRate,
  };
  const hasCISItems = cisEnabled && customerCIS?.registered && items.some(i => i?.cis?.enabled || i?.cisApplicable);
  const cisEstimate = hasCISItems
    ? items.reduce((sum, item) => {
        if (!item?.cis?.enabled && !item?.cisApplicable) return sum;
        const qty = Number(item.quantity ?? item.qty) || 1;
        const lineTotal = Number(item.amount) || ((Number(item.rate) || 0) * qty);
        const labourShare = item?.cis?.labour ?? (item?.cisApplicable ? 100 : 0);
        const labourAmount = lineTotal * (labourShare / 100);
        const rateValue = customerCIS?.rateValue ?? 20;
        return sum + (labourAmount * rateValue / 100);
      }, 0)
    : 0;
  return { subtotal, discountAmount:discAmt, shipping:ship, taxBreakdown, cisDeduction:0, cisEstimate, hasCISItems, customerCIS, total: gross, grossTotal: gross };
}

// ─── QUOTE FORM PANEL ─────────────────────────────────────────────────────────
function QuoteFormPanel({ existing, onClose, onSave, onConvertToInvoice, asPage = false }) {
  const { customers, catalogItems, setCatalogItems, orgSettings, quotes, invoices, setInvoices } = useContext(AppCtx);
  const { cisEnabled, cisDefaultRate } = useCISSettings();
  const isVat = orgSettings?.vatReg==="Yes";
  const currSym = CUR_SYM[orgSettings?.currency||"GBP"]||"£";
  const isEdit = !!existing;
  const q = existing||{};

  const [customer, setCustomer] = useState(q.customer||null);
  const [custSearch, setCustSearch] = useState(q.customer?.name||"");
  const [custOpen, setCustOpen] = useState(false);
  const [issueDate, setIssueDate] = useState(q.issue_date||todayStr());
  const [expiryDate, setExpiryDate] = useState(q.expiry_date||addDays(todayStr(),30));
  const [items, setItems] = useState((q.line_items&&q.line_items.length>0) ? q.line_items : [newLine(0)]);
  const [discType, setDiscType] = useState(q.discount_type||"percent");
  const [discVal, setDiscVal] = useState(q.discount_value||"");
  const [shipping, setShipping] = useState(q.shipping||"");
  const showShipping = orgSettings?.deliversItems !== false;
  const [notes, setNotes] = useState(q.notes||"");
  const [terms, setTerms] = useState(q.terms||DEFAULT_QUOTE_TERMS);
  const [status, setStatus] = useState(q.status||"Draft");
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [poNumber, setPoNumber] = useState(q.po_number||"");
  const [quoteNumber, setQuoteNumber] = useState(q.quote_number || nextNum("QUO", quotes));
  const isLockedAcceptedQuote = isEdit && q.status === "Invoiced";

  const totals = useMemo(()=>calcTotals(items,discType,discVal,showShipping?shipping:0,isVat,customer,cisEnabled,cisDefaultRate),[items,discType,discVal,shipping,isVat,customer,showShipping,cisEnabled,cisDefaultRate]);
  const vatAmount = totals.taxBreakdown.reduce((sum, tax) => sum + Number(tax.amount || 0), 0);
  const vatRate = totals.taxBreakdown.length === 1 ? totals.taxBreakdown[0].rate : "mixed";
  const filteredCustomers = customers.filter(c=>
    !custSearch || c.name.toLowerCase().includes(custSearch.toLowerCase())
  );

  const docData = { docNumber:quoteNumber, customer, issueDate, dueDate:expiryDate, paymentTerms:`Valid until ${fmtDate(expiryDate)}`, items, ...totals, notes, terms, status, poNumber, docType:"quote" };

  const handleShare = () => {
    const visibility = window.prompt("Share visibility: Public or Private and secure?", "Public");
    if (!visibility) return;
    const expiresOn = window.prompt("Link expiration date (YYYY-MM-DD)", expiryDate || addDays(todayStr(), 30));
    if (!expiresOn) return;
    const mode = visibility.toLowerCase().includes("private") ? "private" : "public";
    // AUTH-005: Use full UUID (122 bits entropy) instead of truncated 8-char segment (32 bits)
    const token = crypto.randomUUID();
    const basePath = mode === "public" ? "public" : "secure";
    const shareUrl = `${window.location.origin}/${basePath}/quote/${quoteNumber}?token=${token}&expires=${expiresOn}`;
    window.prompt(mode === "private"
      ? "Private link created. Customer will use one-time passcode. Copy link:"
      : "Public link created. Anyone with the link can access before expiry. Copy link:", shareUrl);
  };

  const buildQuote = (newStatus) => ({
    id: q.id||crypto.randomUUID(),
    quote_number: quoteNumber,
    customer, issue_date:issueDate, expiry_date:expiryDate,
    line_items:items, discount_type:discType, discount_value:discVal,
    shipping: showShipping ? shipping : "", ...totals, notes, terms, po_number:poNumber,
    status: newStatus||status,
  });

  const handleSave = (newStatus) => {
    if (isLockedAcceptedQuote) {
      window.alert("You are not allowed to edit an accepted quote.");
      return;
    }
    setSaving(true);
    setTimeout(()=>{ onSave(buildQuote(newStatus)); setSaving(false); onClose(); }, 400);
  };
  const handleStatusChange = (nextStatus) => {
    if (isLockedAcceptedQuote) {
      window.alert("You are not allowed to edit an accepted quote.");
      return;
    }
    setStatus(nextStatus);
    if(!isEdit) return;
    if(nextStatus === "Accepted" && q.status !== "Accepted" && window.confirm("Quote accepted. Convert it to invoice now?")) {
      const savedQuote = buildQuote("Accepted");
      onSave(savedQuote);
      onConvertToInvoice?.(savedQuote);
      onClose();
    }
  };
  

  const handleNewItemSaved = (item) => {
    setCatalogItems(p=>[...p, item]);
    const newItem = { id:crypto.randomUUID(), name:item.name, description:item.description||"", quantity:1, rate:item.rate, tax_rate:isVat?(item.taxRate||20):0, amount:item.rate, sort_order:items.length };
    setItems(p=>[...p, newItem]);
    setShowItemModal(false);
  };

  const panelContent = (
    <div style={{ position: asPage ? "relative" : "fixed", inset: asPage ? "auto" : 0, background: asPage ? "transparent" : "rgba(0,0,0,0.4)", zIndex: asPage ? "auto" : 900, display:"flex", justifyContent: asPage ? "center" : "flex-end" }}>
      {showPrintModal && <A4PrintModal data={docData} currSymbol={currSym} isVat={isVat} onClose={()=>setShowPrintModal(false)} />}
      {showItemModal && <ItemModal existing={null} onClose={()=>setShowItemModal(false)} onSave={handleNewItemSaved} settings={{ cis: { enabled: cisEnabled } }} />}
           <div style={{ width:"100%", maxWidth:860, height: asPage ? "auto" : "100%", minHeight: asPage ? "calc(100vh - 180px)" : "100%", background:"#f4f5f7", display:"flex", flexDirection:"column", boxShadow: asPage ? "0 12px 34px rgba(0,0,0,0.10)" : "-8px 0 40px rgba(0,0,0,0.16)", borderRadius: asPage ? 12 : 0, overflow:"hidden", fontFamily:ff }}>
        <div style={{ position:"sticky", top:0, zIndex:10, background:"#fff", borderBottom:"1px solid #e8e8ec", padding:"12px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#6b7280", fontSize:13, fontFamily:ff }}>
            ← Quotes
          </button>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#6b7280", fontSize:13, fontFamily:ff }}>
                ← Quotes
              </button>
              <span style={{ color:"#d1d5db" }}>/</span>
              <span style={{ fontSize:13, fontWeight:600, color:"#1a1a2e" }}>
                {isEdit ? q.quote_number : "New Quote"}
              </span>
            </div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
            {isEdit && (
              <Btn onClick={()=>onConvertToInvoice(buildQuote("Invoiced"))} disabled={isLockedAcceptedQuote} variant="outline" icon={<Icons.Receipt />}>
                Convert to Invoice
              </Btn>
            )}
            <Btn onClick={handleShare} variant="outline" icon={<Icons.Send />}>Share Link</Btn>
            <Btn onClick={()=>setShowPrintModal(true)} variant="outline" icon={<Icons.Receipt />}>Print / PDF</Btn>
            <SaveSplitBtn
              onSave={()=>handleSave()}
              onSaveAndSend={()=>handleSave("Sent")}
              onSaveAndPrint={()=>handleSave()}
              saving={saving}
            />
          </div>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>
          {isLockedAcceptedQuote && (
            <div style={{ marginBottom:12, padding:"10px 12px", border:"1px solid #FECACA", background:"#FEF2F2", borderRadius:8, fontSize:13, color:"#B91C1C", fontWeight:600 }}>
              You are not allowed to edit an accepted quote.
            </div>
          )}
          {/* Customer */}
          <div style={{ background:"#fff", borderRadius:10, border:"1px solid #e8e8ec", boxShadow:"0 1px 3px rgba(0,0,0,0.04)", padding:"16px 18px", marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>Customer</div>
            <CustomerPicker
              customers={customers}
              value={customer}
              onChange={c => {
                setCustomer(c);
                setCustSearch(c.name);
                if(cisEnabled && !!(c?.cis?.registered || c?.taxDetails?.cisRegistered)){
                  setItems(prev => prev.map(it => ({ ...it, cisApplicable: true })));
                }
              }}
              onClear={() => { setCustomer(null); setCustSearch(""); setCustOpen(false); }}
            />
          </div>

          {/* Quote details */}
          <div style={{ background:"#fff", borderRadius:10, border:"1px solid #e8e8ec", boxShadow:"0 1px 3px rgba(0,0,0,0.04)", padding:"16px 18px", marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:12 }}>Quote Details</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12 }}>
              <Field label="Quote #"><Input value={quoteNumber} onChange={setQuoteNumber} /></Field>
              <Field label="Issue Date">
                <input value={issueDate} onChange={e=>setIssueDate(e.target.value)} type="date"
                  style={{ width:"100%", padding:"8px 10px", border:"1.5px solid #E0E0E0", borderRadius:8, fontSize:13, fontFamily:ff, outline:"none", boxSizing:"border-box" }} />
              </Field>
              <Field label="Expiry Date">
                <input value={expiryDate} onChange={e=>setExpiryDate(e.target.value)} type="date"
                  style={{ width:"100%", padding:"8px 10px", border:"1.5px solid #E0E0E0", borderRadius:8, fontSize:13, fontFamily:ff, outline:"none", boxSizing:"border-box" }} />
              </Field>
              <Field label="PO / Reference">
                <Input value={poNumber} onChange={setPoNumber} placeholder="Optional" />
              </Field>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:12, paddingTop:12, borderTop:"1px solid #F0F0F0" }}>
              <span style={{ fontSize:13, fontWeight:600, color:"#333" }}>Status</span>
              <select value={status} onChange={e=>handleStatusChange(e.target.value)}
                style={{ padding:"5px 10px", border:"1.5px solid #E0E0E0", borderRadius:7, fontSize:13, fontFamily:ff, background:"#f9fafb", outline:"none", cursor:"pointer" }}>
                {QUOTE_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Line items */}
          <div style={{ background:"#fff", borderRadius:10, border:"1px solid #e8e8ec", boxShadow:"0 1px 3px rgba(0,0,0,0.04)", padding:"16px 18px", marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:12 }}>Line Items</div>
            <LineItemsTable
              items={items}
              onChange={setItems}
              currSymbol={currSym}
              catalogItems={catalogItems}
              isVat={isVat}
              onAddNewItem={()=>setShowItemModal(true)}
              isCISInvoice={cisEnabled && !!(customer?.cis?.registered || customer?.taxDetails?.cisRegistered)}
            />
          </div>

          {/* Totals + Notes */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:14, alignItems:"start", marginBottom:40 }}>
            <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e8e8ec", boxShadow:"0 1px 3px rgba(0,0,0,0.04)", padding:"16px 18px" }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>Notes & Terms</div>
              <Field label="Notes (shown on quote)">
                <Textarea value={notes} onChange={setNotes} rows={3} placeholder="e.g. This quote is valid for 30 days." />
              </Field>
              <Field label="Terms & Conditions">
                <Textarea value={terms} onChange={setTerms} rows={3} />
              </Field>
            </div>
            <div style={{ background:"#FAFAFA", borderRadius:10, border:"1px solid #EBEBEB", padding:"14px 16px", minWidth:260 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0" }}>
                <span style={{ fontSize:13, color:"#666" }}>Discount</span>
                <div style={{ display:"flex", gap:5, alignItems:"center" }}>
                  <div style={{ display:"flex", border:"1.5px solid #E0E0E0", borderRadius:6, overflow:"hidden" }}>
                    {[["percent","%"],["fixed",currSym]].map(([t,l])=>(
                      <button key={t} onClick={()=>setDiscType(t)}
                        style={{ padding:"3px 8px", border:"none", background:discType===t?"#1A1A1A":"transparent", color:discType===t?"#fff":"#999", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:ff }}>{l}</button>
                    ))}
                  </div>
                  <input value={discVal} onChange={e=>setDiscVal(e.target.value)} type="number" min="0"
                    style={{ width:62, padding:"4px 6px", border:"1.5px solid #E0E0E0", borderRadius:6, fontSize:13, textAlign:"right", fontFamily:ff, background:"#fff", outline:"none" }} />
                </div>
              </div>
              {showShipping && (
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0" }}>
                  <span style={{ fontSize:13, color:"#666" }}>Shipping</span>
                  <input value={shipping} onChange={e=>setShipping(e.target.value)} type="number" min="0" placeholder="0.00" inputMode="decimal"
                    style={{ width:86, padding:"4px 6px", border:"1.5px solid #E0E0E0", borderRadius:6, fontSize:13, textAlign:"right", fontFamily:ff, background:"#fff", outline:"none" }} />
                </div>
              )}

              {/* ── Totals ── */}
              <div style={{ marginTop:16, paddingTop:12, borderTop:"1px solid #e8e8ec" }}>
                <div style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", fontSize:13 }}>
                  <span style={{ color:"#6b7280" }}>Subtotal</span>
                  <span>£{totals.subtotal.toFixed(2)}</span>
                </div>

                {vatAmount > 0 && (
                  <div style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", fontSize:13 }}>
                    <span style={{ color:"#6b7280" }}>VAT ({vatRate}%)</span>
                    <span>£{vatAmount.toFixed(2)}</span>
                  </div>
                )}

                {totals.hasCISItems && (
                  <div style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", fontSize:12, marginTop:4, paddingTop:8, borderTop:"1px dashed #e8e8ec", color:"#6b7280" }}>
                    <span style={{ display:"flex", alignItems:"center", gap:4 }}>
                      <span style={{ display:"inline-block", width:6, height:6, borderRadius:"50%", background:"#d97706", flexShrink:0 }} />
                      Est. CIS Deduction
                      <span style={{ fontSize:11, color:"#9ca3af", marginLeft:4 }}>
                        ({totals.customerCIS?.rate || "20% — Standard"})
                      </span>
                    </span>
                    <span>−£{totals.cisEstimate.toFixed(2)}</span>
                  </div>
                )}

                <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0 0", marginTop:6, borderTop:"2px solid #e8e8ec", fontSize:15, fontWeight:700, color:"#1a1a2e" }}>
                  <span>Quote Total</span>
                  <span>£{(totals.subtotal + vatAmount).toFixed(2)}</span>
                </div>

                {totals.hasCISItems && (
                  <div style={{ marginTop:12, padding:"10px 12px", background:"#fffbeb", borderRadius:8, border:"1px solid #fde68a", fontSize:12, color:"#92400e", lineHeight:1.6 }}>
                    <strong>Note:</strong> This quote includes CIS-applicable items. If converted to an invoice, £{totals.cisEstimate.toFixed(2)} will be deducted at {totals.customerCIS?.rateValue ?? 20}% and paid directly to HMRC.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (asPage) return panelContent;
  return createPortal(panelContent, document.body);
}

// ─── QUOTE VIEW PANEL ─────────────────────────────────────────────────────────
function QuoteViewPanel({ quote, onEdit, onDelete, onConvert, onClose }) {
  const { orgSettings, pdfTemplate, companyLogo, companyLogoSize, footerText, invoiceTemplateConfig } = useContext(AppCtx);
  const { cisEnabled, cisDefaultRate } = useCISSettings();
  const isVat = orgSettings?.vatReg === "Yes";
  const currSym = CUR_SYM[orgSettings?.currency || "GBP"] || "£";
  const [showPrintModal, setShowPrintModal] = useState(false);

  const totals = calcTotals(
    quote.line_items || [],
    quote.discount_type || "percent",
    quote.discount_value || "",
    quote.shipping || "",
    isVat,
    quote.customer,
    cisEnabled,
    cisDefaultRate
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

  return (
    <>
      {showPrintModal && (
        <A4PrintModal data={docData} currSymbol={currSym} isVat={isVat} onClose={() => setShowPrintModal(false)} />
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
            { label: "Customer",    value: quote.customer?.name || "—" },
            { label: "Issue Date",  value: fmtDate(quote.issue_date) },
            { label: "Expires",     value: fmtDate(quote.expiry_date) },
            { label: "Amount",      value: fmt(currSym, quote.total || 0) },
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

// ─── QUOTES PAGE ──────────────────────────────────────────────────────────────
export default function QuotesPage({ onNavigate, initialShowForm = false }) {
  const { quotes, setQuotes, invoices, setInvoices } = useContext(AppCtx);
  const [panel, setPanel] = useState(initialShowForm ? { mode:"new-page" } : null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const isNewQuotePage = panel?.mode === "new-page";
  const isViewPage = panel?.mode === "view";

  const filtered = quotes.filter(q => {
    const matchSearch = !search ||
      q.quote_number?.toLowerCase().includes(search.toLowerCase()) ||
      q.customer?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus==="All" || q.status===filterStatus;
    return matchSearch && matchStatus;
  });

  const onSave = q => setQuotes(p => {
    const i = p.findIndex(x=>x.id===q.id);
    if(i>=0){ const u=[...p]; u[i]=q; return u; }
    return [q,...p];
  });

  const handleConvertToInvoice = (quote) => {
    const alreadyInvoiced = invoices.some(inv => inv.converted_from_quote === quote.quote_number);
    if (alreadyInvoiced) {
      const shouldInvoiceAgain = window.confirm("This quote has already been invoiced. Do you want to invoice it again?");
      if (!shouldInvoiceAgain) return;
    }
    // save quote as Invoiced
    onSave({ ...quote, status:"Invoiced" });
    // create invoice from quote
    const inv = {
      id: crypto.randomUUID(),
      invoice_number: nextNum("INV", invoices),
      customer: quote.customer,
      issue_date: quote.issue_date,
      due_date: addDays(quote.issue_date||todayStr(), 30),
      payment_terms: "Net 30",
      line_items: quote.line_items||[],
      discount_type: quote.discount_type,
      discount_value: quote.discount_value,
      shipping: quote.shipping,
      subtotal: quote.subtotal,
      discountAmount: quote.discountAmount,
      taxBreakdown: quote.taxBreakdown,
      cisDeduction: quote.cisEstimate || 0,
      hasCISItems:  quote.hasCISItems  || false,
      customerCIS:  quote.customerCIS  || null,
      total: (quote.grossTotal ?? quote.total) - (quote.cisEstimate || 0),
      notes: quote.notes,
      terms: quote.terms,
      status: "Draft",
      converted_from_quote: quote.quote_number,
    };
    setInvoices(p=>[inv,...p]);
    setPanel(null);
    onNavigate?.("invoices");
  };

  const summary = {
    total:    quotes.length,
    accepted: quotes.filter(q=>q.status==="Accepted").length,
    pending:  quotes.filter(q=>["Draft","Sent"].includes(q.status)).length,
    value:    quotes.filter(q=>q.status==="Accepted").reduce((s,q)=>s+(q.total||0),0),
  };

  if (isViewPage) {
    return (
      <QuoteViewPanel
        quote={panel.quote}
        onClose={() => setPanel(null)}
        onEdit={() => setPanel({ mode: "edit", quote: panel.quote })}
        onDelete={() => { setQuotes(prev => prev.filter(x => x.id !== panel.quote.id)); setPanel(null); }}
        onConvert={() => handleConvertToInvoice(panel.quote)}
      />
    );
  }

  return (
    <div style={{ padding:"clamp(14px,4vw,28px) clamp(12px,4vw,32px)", maxWidth:1100, fontFamily:ff }}>
      {/* Summary cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12, marginBottom:22 }}>
        {[
          { label:"Total Quotes",   value:String(summary.total),       color:"#1A1A1A" },
          { label:"Accepted",       value:String(summary.accepted),     color:"#16A34A" },
          { label:"Pending",        value:String(summary.pending),      color:"#E86C4A" },
          { label:"Accepted Value", value:fmt("£",summary.value),       color:"#2563EB" },
        ].map(s=>(
          <div key={s.label} style={{ background:"#fff", borderRadius:10, padding:"14px 16px", border:"1px solid #e8e8ec", boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:5 }}>{s.label}</div>
            <div style={{ fontSize:18, fontWeight:800, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Header row */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, gap:10, flexWrap:"wrap" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <h1 style={{ fontSize:22, fontWeight:800, color:"#1A1A1A", margin:0 }}>Quotes</h1>
          <span style={{ fontSize:13, color:"#AAA" }}>{quotes.length} total</span>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <div style={{ display:"flex", background:"#f3f4f6", border:"1px solid #e8e8ec", borderRadius:8, padding:3, overflow:"hidden" }}>
            {["All",...QUOTE_STATUSES].map(s=>(
              <button key={s} onClick={()=>setFilterStatus(s)}
                style={{ padding:"6px 12px", border:"none", background:filterStatus===s?"#fff":"transparent", color:filterStatus===s?"#1a1a2e":"#6b7280", boxShadow:filterStatus===s?"0 1px 3px rgba(0,0,0,0.08)":"none", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:ff }}>
                {s}
              </button>
            ))}
          </div>
          <Btn onClick={()=>setPanel({ mode:"new-page" })} variant="primary" icon={<Icons.Plus />}>New Quote</Btn>
        </div>
      </div>

      {isNewQuotePage && (
        <div style={{ marginBottom:14 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10, gap:10, flexWrap:"wrap" }}>
            <div style={{ fontSize:20, fontWeight:800, color:"#1A1A1A" }}>New Quote</div>
            <Btn onClick={()=>{ if(initialShowForm && onNavigate) onNavigate("quotes"); else setPanel(null); }} variant="outline" icon={<Icons.ChevDown />}>← Quotes</Btn>
          </div>
          <QuoteFormPanel
            asPage
            existing={null}
            onClose={()=>{ if(initialShowForm && onNavigate) onNavigate("quotes"); else setPanel(null); }}
            onSave={q=>{ onSave(q); if(initialShowForm && onNavigate) onNavigate("quotes"); else setPanel(null); }}
            onConvertToInvoice={handleConvertToInvoice}
          />
        </div>
      )}

      {/* Table */}
      {!isNewQuotePage && (
      <div style={{ background:"#fff", borderRadius:10, border:"1px solid #e8e8ec", boxShadow:"0 1px 3px rgba(0,0,0,0.04)", overflowX:"auto" }}>
        <div style={{ padding:"10px 16px", borderBottom:"1px solid #F0F0F0", display:"flex", alignItems:"center", gap:9 }}>
          <Icons.Search />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search quotes…"
            style={{ flex:1, border:"none", outline:"none", fontSize:13, color:"#1A1A1A", background:"transparent", fontFamily:ff }} />
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:540 }}>
          <thead>
            <tr style={{ background:"#f9fafb" }}>
              {["Quote #","Customer","Issue Date","Expires","Amount","Status",""].map(h=>(
                <th key={h} style={{ padding:"8px 16px", textAlign:h==="Amount"?"right":"left", fontSize:10, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em", borderBottom:"1px solid #F0F0F0" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(q=>(
              <tr key={q.id} style={{ borderBottom:"1px solid #F7F7F7", cursor:"pointer" }}
                onClick={()=>setPanel({ mode:"view", quote:q })}
                onMouseEnter={e=>e.currentTarget.style.background="#FAFAFA"}
                onMouseLeave={e=>e.currentTarget.style.background=""}>
                <td style={{ padding:"12px 16px", fontSize:13, fontWeight:700, color:"#1A1A1A" }}>{q.quote_number}</td>
                <td style={{ padding:"12px 16px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:26, height:26, borderRadius:"50%", background:"#4F46E522", color:"#4F46E5", fontWeight:800, fontSize:11, display:"flex", alignItems:"center", justifyContent:"center" }}>{q.customer?.name?.[0]||"?"}</div>
                    <span style={{ fontSize:13, color:"#444" }}>{q.customer?.name||"—"}</span>
                  </div>
                </td>
                <td style={{ padding:"12px 16px", fontSize:13, color:"#888" }}>{fmtDate(q.issue_date)}</td>
                <td style={{ padding:"12px 16px", fontSize:13, color:q.status==="Expired"?"#C0392B":"#888" }}>{fmtDate(q.expiry_date)}</td>
                <td style={{ padding:"12px 16px", fontSize:13, fontWeight:700, color:"#1A1A1A", textAlign:"right" }}>{fmt("£",q.total||0)}</td>
                <td style={{ padding:"12px 16px" }}><Tag color={STATUS_COLORS[q.status]||"#888"}>{q.status||"Draft"}</Tag></td>
                <td style={{ padding:"12px 16px" }} onClick={e=>e.stopPropagation()}>
                  <Btn onClick={()=>q.status==="Invoiced"?window.alert("You are not allowed to edit an accepted quote."):setPanel({ mode:"edit", quote:q })} variant="ghost" size="sm" disabled={q.status==="Invoiced"} icon={<Icons.Edit />}>{q.status==="Invoiced"?"Locked":"Edit"}</Btn>
                  <Btn onClick={()=>window.confirm(`Delete ${q.quote_number}?`) && setQuotes(prev=>prev.filter(x=>x.id!==q.id))} variant="ghost" size="sm" icon={<Icons.Trash />}>Delete</Btn>
                </td>
              </tr>
            ))}
            {filtered.length===0 && (
              <tr><td colSpan={7} style={{ padding:"40px", textAlign:"center", color:"#CCC", fontSize:13 }}>
                {quotes.length===0 ? "No quotes yet. Click 'New Quote' to create your first." : "No quotes match your filters."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      )}

      {panel && panel.mode !== "new-page" && (
        <QuoteFormPanel
          existing={panel.mode==="edit" ? panel.quote : null}
          onClose={()=>setPanel(null)}
          onSave={q=>{ onSave(q); setPanel(null); }}
          onConvertToInvoice={handleConvertToInvoice}
        />
      )}
    </div>
  );
}
