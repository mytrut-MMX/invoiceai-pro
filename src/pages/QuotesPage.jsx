import { useState, useContext, useMemo } from "react";
import { createPortal } from "react-dom";
import { ff, STATUS_COLORS, CUR_SYM, DEFAULT_QUOTE_TERMS, QUOTE_STATUSES } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Field, Input, Textarea, Btn, Tag } from "../components/atoms";
import { LineItemsTable, TotalsBlock, SaveSplitBtn, A4PrintModal } from "../components/shared";
import { fmt, fmtDate, todayStr, addDays, nextNum, newLine } from "../utils/helpers";
import ItemModal from "../modals/ItemModal";

// ─── helpers ──────────────────────────────────────────────────────────────────
function calcTotals(items, discType, discVal, shipping, isVat) {
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
  const total = afterDisc + ship + vatTotal;
  return { subtotal, discountAmount:discAmt, shipping:ship, taxBreakdown, cisDeduction:0, total };
}

// ─── QUOTE FORM PANEL ─────────────────────────────────────────────────────────
function QuoteFormPanel({ existing, onClose, onSave, onConvertToInvoice, asPage = false }) {
  const { customers, catalogItems, setCatalogItems, orgSettings, quotes } = useContext(AppCtx);
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
  const [notes, setNotes] = useState(q.notes||"");
  const [terms, setTerms] = useState(q.terms||DEFAULT_QUOTE_TERMS);
  const [status, setStatus] = useState(q.status||"Draft");
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [poNumber, setPoNumber] = useState(q.po_number||"");

  const totals = useMemo(()=>calcTotals(items,discType,discVal,shipping,isVat),[items,discType,discVal,shipping,isVat]);

  const filteredCustomers = customers.filter(c=>
    !custSearch || c.name.toLowerCase().includes(custSearch.toLowerCase())
  );

  const quoteNumber = q.quote_number || nextNum("QUO", quotes);
  const docData = { docNumber:quoteNumber, customer, issueDate, dueDate:expiryDate, paymentTerms:`Valid until ${fmtDate(expiryDate)}`, items, ...totals, notes, terms, status };

  const buildQuote = (newStatus) => ({
    id: q.id||crypto.randomUUID(),
    quote_number: quoteNumber,
    customer, issue_date:issueDate, expiry_date:expiryDate,
    line_items:items, discount_type:discType, discount_value:discVal,
    shipping, ...totals, notes, terms, po_number:poNumber,
    status: newStatus||status,
  });

  const handleSave = (newStatus) => {
    setSaving(true);
    setTimeout(()=>{ onSave(buildQuote(newStatus)); setSaving(false); onClose(); }, 400);
  };

  const handleNewItemSaved = (item) => {
    setCatalogItems(p=>[...p, item]);
    const descText = item.description ? `${item.name} — ${item.description}` : item.name;
    const newItem = { id:crypto.randomUUID(), description:descText, quantity:1, rate:item.rate, tax_rate:isVat?(item.taxRate||20):0, amount:item.rate, sort_order:items.length };
    setItems(p=>[...p, newItem]);
    setShowItemModal(false);
  };

  const panelContent = (
    <div style={{ position: asPage ? "relative" : "fixed", inset: asPage ? "auto" : 0, background: asPage ? "transparent" : "rgba(0,0,0,0.4)", zIndex: asPage ? "auto" : 900, display:"flex", justifyContent: asPage ? "center" : "flex-end" }}>
      {showPrintModal && <A4PrintModal data={docData} currSymbol={currSym} isVat={isVat} onClose={()=>setShowPrintModal(false)} />}
      {showItemModal && <ItemModal existing={null} onClose={()=>setShowItemModal(false)} onSave={handleNewItemSaved} />}

           <div style={{ width:"100%", maxWidth:860, height: asPage ? "auto" : "100%", minHeight: asPage ? "calc(100vh - 180px)" : "100%", background:"#F7F7F5", display:"flex", flexDirection:"column", boxShadow: asPage ? "0 12px 34px rgba(0,0,0,0.10)" : "-8px 0 40px rgba(0,0,0,0.16)", borderRadius: asPage ? 12 : 0, overflow:"hidden", fontFamily:ff }}>
        <div style={{ background:"#1A1A1A", padding:"12px 20px", display:"flex", alignItems:"center", gap:12, flexWrap:"wrap", flexShrink:0 }}>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.1)", border:"none", borderRadius:7, padding:"6px 10px", color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", gap:6, fontSize:13, fontFamily:ff }}>
            <span style={{ transform:"rotate(90deg)", display:"flex" }}><Icons.ChevDown /></span> Back
          </button>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:15, fontWeight:800, color:"#fff" }}>{isEdit?`Edit ${q.quote_number}`:"New Quote"}</div>
            {isEdit && q.customer?.name && <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:1 }}>{q.customer.name}</div>}
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
            {isEdit && (
              <Btn onClick={()=>onConvertToInvoice(buildQuote("Invoiced"))} variant="outline-light" icon={<Icons.Receipt />}>
                Convert to Invoice
              </Btn>
            )}
            <Btn onClick={()=>setShowPrintModal(true)} variant="outline-light" icon={<Icons.Receipt />}>Print / PDF</Btn>
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
          {/* Customer */}
          <div style={{ background:"#fff", borderRadius:12, border:"1px solid #EBEBEB", padding:"16px 18px", marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>Customer</div>
            <div style={{ position:"relative" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 12px", border:`1.5px solid ${customer?"#1A1A1A":"#E0E0E0"}`, borderRadius:8, background:"#FAFAFA", cursor:"pointer" }}
                onClick={()=>!customer && setCustOpen(o=>!o)}>
                {customer ? (<>
                  <div style={{ width:28, height:28, borderRadius:"50%", background:"#E86C4A22", color:"#E86C4A", fontWeight:800, fontSize:12, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{customer.name[0]}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:"#1A1A1A" }}>{customer.name}</div>
                    <div style={{ fontSize:11, color:"#AAA" }}>{customer.email}</div>
                  </div>
                  <button onClick={e=>{ e.stopPropagation(); setCustomer(null); setCustSearch(""); setCustOpen(false); }} style={{ background:"none", border:"none", cursor:"pointer", color:"#CCC", flexShrink:0 }}><Icons.X /></button>
                </>) : (<>
                  <Icons.Search />
                  <input value={custSearch} onChange={e=>{ setCustSearch(e.target.value); setCustOpen(true); }} onClick={e=>e.stopPropagation()} placeholder="Search or select customer…"
                    style={{ flex:1, border:"none", outline:"none", fontSize:13, fontFamily:ff, background:"transparent" }} />
                  <Icons.ChevDown />
                </>)}
              </div>
              {custOpen && !customer && (
                <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, background:"#fff", border:"1.5px solid #E0E0E0", borderRadius:9, boxShadow:"0 8px 28px rgba(0,0,0,0.12)", zIndex:300, maxHeight:220, overflowY:"auto" }}>
                  {filteredCustomers.length===0
                    ? <div style={{ padding:"14px 16px", fontSize:13, color:"#CCC", textAlign:"center" }}>No customers found</div>
                    : filteredCustomers.map(c=>(
                        <button key={c.id} onClick={()=>{ setCustomer(c); setCustSearch(c.name); setCustOpen(false); }}
                          style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"none", border:"none", cursor:"pointer", fontFamily:ff, textAlign:"left" }}
                          onMouseEnter={e=>e.currentTarget.style.background="#F7F7F5"}
                          onMouseLeave={e=>e.currentTarget.style.background="none"}>
                          <div style={{ width:28, height:28, borderRadius:"50%", background:"#E86C4A22", color:"#E86C4A", fontWeight:800, fontSize:12, display:"flex", alignItems:"center", justifyContent:"center" }}>{c.name[0]}</div>
                          <div>
                            <div style={{ fontSize:13, fontWeight:600, color:"#1A1A1A" }}>{c.name}</div>
                            <div style={{ fontSize:11, color:"#888" }}>{c.email}</div>
                          </div>
                        </button>
                      ))}
                </div>
              )}
            </div>
          </div>

          {/* Quote details */}
          <div style={{ background:"#fff", borderRadius:12, border:"1px solid #EBEBEB", padding:"16px 18px", marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:12 }}>Quote Details</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12 }}>
              <Field label="Quote #"><Input value={quoteNumber} disabled /></Field>
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
              <select value={status} onChange={e=>setStatus(e.target.value)}
                style={{ padding:"5px 10px", border:"1.5px solid #E0E0E0", borderRadius:7, fontSize:13, fontFamily:ff, background:"#FAFAFA", outline:"none", cursor:"pointer" }}>
                {QUOTE_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Line items */}
          <div style={{ background:"#fff", borderRadius:12, border:"1px solid #EBEBEB", padding:"16px 18px", marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:12 }}>Line Items</div>
            <LineItemsTable
              items={items}
              onChange={setItems}
              currSymbol={currSym}
              catalogItems={catalogItems}
              isVat={isVat}
              onAddNewItem={()=>setShowItemModal(true)}
            />
          </div>

          {/* Totals + Notes */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:14, alignItems:"start", marginBottom:40 }}>
            <div style={{ background:"#fff", borderRadius:12, border:"1px solid #EBEBEB", padding:"16px 18px" }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>Notes & Terms</div>
              <Field label="Notes (shown on quote)">
                <Textarea value={notes} onChange={setNotes} rows={3} placeholder="e.g. This quote is valid for 30 days." />
              </Field>
              <Field label="Terms & Conditions">
                <Textarea value={terms} onChange={setTerms} rows={3} />
              </Field>
            </div>
            <TotalsBlock
              subtotal={totals.subtotal} discountType={discType} discountValue={discVal}
              setDiscountType={setDiscType} setDiscountValue={setDiscVal}
              shipping={shipping} setShipping={setShipping}
              taxBreakdown={totals.taxBreakdown} total={totals.total}
              currSymbol={currSym} isVat={isVat} cisDeduction={0}
            />
          </div>
        </div>
      </div>
    </div>
  );

  if (asPage) return panelContent;
  return createPortal(panelContent, document.body);
}

// ─── QUOTES PAGE ──────────────────────────────────────────────────────────────
export default function QuotesPage({ onNavigate }) {
  const { quotes, setQuotes, invoices, setInvoices } = useContext(AppCtx);
  const [panel, setPanel] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const isNewQuotePage = panel?.mode === "new-page";

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
    // save quote as Invoiced
    onSave({ ...quote, status:"Invoiced" });
    // create invoice from quote
    const inv = {
      id: crypto.randomUUID(),
      invoice_number: `INV-${String(invoices.length+1).padStart(4,"0")}`,
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
      cisDeduction: 0,
      total: quote.total,
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
          <div key={s.label} style={{ background:"#fff", borderRadius:12, padding:"14px 16px", border:"1px solid #EBEBEB" }}>
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
          <div style={{ display:"flex", background:"#fff", border:"1px solid #EBEBEB", borderRadius:9, overflow:"hidden" }}>
            {["All",...QUOTE_STATUSES].map(s=>(
              <button key={s} onClick={()=>setFilterStatus(s)}
                style={{ padding:"6px 12px", border:"none", background:filterStatus===s?"#1A1A1A":"transparent", color:filterStatus===s?"#fff":"#888", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:ff }}>
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
            <Btn onClick={()=>setPanel(null)} variant="outline" icon={<Icons.ChevDown />}>Back to Quotes</Btn>
          </div>
          <QuoteFormPanel
            asPage
            existing={null}
            onClose={()=>setPanel(null)}
            onSave={q=>{ onSave(q); setPanel(null); }}
            onConvertToInvoice={handleConvertToInvoice}
          />
        </div>
      )}

      {/* Table */}
      {!isNewQuotePage && (
      <div style={{ background:"#fff", borderRadius:14, border:"1px solid #EBEBEB", overflowX:"auto" }}>
        <div style={{ padding:"10px 16px", borderBottom:"1px solid #F0F0F0", display:"flex", alignItems:"center", gap:9 }}>
          <Icons.Search />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search quotes…"
            style={{ flex:1, border:"none", outline:"none", fontSize:13, color:"#1A1A1A", background:"transparent", fontFamily:ff }} />
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:540 }}>
          <thead>
            <tr style={{ background:"#FAFAFA" }}>
              {["Quote #","Customer","Issue Date","Expires","Amount","Status",""].map(h=>(
                <th key={h} style={{ padding:"8px 16px", textAlign:h==="Amount"?"right":"left", fontSize:10, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em", borderBottom:"1px solid #F0F0F0" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(q=>(
              <tr key={q.id} style={{ borderBottom:"1px solid #F7F7F7", cursor:"pointer" }}
                onClick={()=>setPanel({ mode:"edit", quote:q })}
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
                  <Btn onClick={()=>setPanel({ mode:"edit", quote:q })} variant="ghost" size="sm" icon={<Icons.Edit />}>Edit</Btn>
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
