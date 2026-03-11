import { useState, useContext, useMemo, useEffect } from "react";
import { ff, STATUS_COLORS, CUR_SYM, DEFAULT_INV_TERMS } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Field, Input, Select, Textarea, Btn, Tag, SlideToggle, InfoBox, PaymentTermsField } from "../components/atoms";
import { LineItemsTable, TotalsBlock, SaveSplitBtn, PaidConfirmModal, A4PrintModal } from "../components/shared";
import { fmt, fmtDate, todayStr, addDays, nextNum, newLine } from "../utils/helpers";
import ItemModal from "../modals/ItemModal";

// ─── helpers ──────────────────────────────────────────────────────────────────
function calcTotals(items, discType, discVal, shipping, isVat, customer, orgSettings) {
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
  const orgCisEnabled = orgSettings?.cisReg === "Yes";
  const role = orgSettings?.cisRole || "Contractor";
  const customerCisRate = parseInt(customer?.taxDetails?.cisRate||"20%")/100;
  const orgCisRate = Number(orgSettings?.cisRate||20)/100;
  const cisRate = customer?.taxDetails?.cisRegistered ? customerCisRate : orgCisRate;
  const cisDed = orgCisEnabled && ["Contractor","Both"].includes(role)
    ? afterDisc * cisRate
    : 0;
  return { subtotal, discountAmount:discAmt, shipping:ship, taxBreakdown, cisDeduction:cisDed, total: gross - cisDed };
}

const STATUSES = ["Draft","Sent","Overdue","Paid","Void","Partial"];

// ─── INVOICE FORM PANEL ───────────────────────────────────────────────────────
function InvoiceFormPanel({ existing, onClose, onSave, onConvertFromQuote }) {
  const { customers, catalogItems, setCatalogItems, orgSettings, invoices, setPayments, quotes } = useContext(AppCtx);
  const isVat = orgSettings?.vatReg==="Yes";
  const currSym = CUR_SYM[orgSettings?.currency||"GBP"]||"£";
  const isEdit = !!existing;
  const inv = existing||{};

  const [customer, setCustomer] = useState(inv.customer||null);
  const [custSearch, setCustSearch] = useState(inv.customer?.name||"");
  const [custOpen, setCustOpen] = useState(false);
  const [issueDate, setIssueDate] = useState(inv.issue_date||todayStr());
  const [payTerms, setPayTerms] = useState(inv.payment_terms||customer?.paymentTerms||"Net 30");
  const [customDays, setCustomDays] = useState(inv.custom_payment_days||"");
  const [dueDate, setDueDate] = useState(inv.due_date||addDays(todayStr(),30));
  const [items, setItems] = useState((inv.line_items&&inv.line_items.length>0) ? inv.line_items : [newLine(0)]);
  const [discType, setDiscType] = useState(inv.discount_type||"percent");
  const [discVal, setDiscVal] = useState(inv.discount_value||"");
  const [shipping, setShipping] = useState(inv.shipping||"");
  const showShipping = orgSettings?.deliversItems !== false;
  const [notes, setNotes] = useState(inv.notes||"");
  const [terms, setTerms] = useState(inv.terms||DEFAULT_INV_TERMS);
  const [status, setStatus] = useState(inv.status||"Draft");
  const [template, setTemplate] = useState(inv.template||"classic");
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showPaidModal, setShowPaidModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recurringEnabled, setRecurringEnabled] = useState(inv.recurring||false);
  const [recurFreq, setRecurFreq] = useState(inv.recurring_frequency||"Monthly");
  const [poNumber, setPoNumber] = useState(inv.po_number||"");
  const [invNumber, setInvNumber] = useState(inv.invoice_number || nextNum("INV", invoices));
  const acceptedQuotes = useMemo(() => (quotes||[]).filter(q=>q.status==="Accepted"), [quotes]);
  const [selectedQuoteId, setSelectedQuoteId] = useState("");

  useEffect(() => {
    if(!selectedQuoteId || !onConvertFromQuote) return;
    onConvertFromQuote(selectedQuoteId);
    setSelectedQuoteId("");
  }, [selectedQuoteId, onConvertFromQuote]);

  const totals = useMemo(()=>calcTotals(items,discType,discVal,showShipping?shipping:0,isVat,customer,orgSettings),[items,discType,discVal,shipping,isVat,customer,orgSettings,showShipping]);
  
  const handleTermsChange = (t, days) => {
    setPayTerms(t);
    const map = { "Net 30":30,"Net 15":15,"Net 7":7,"Net 60":60,"Net 90":90,"Due on Receipt":0 };
    if(t==="Custom"){ setCustomDays(days); setDueDate(addDays(issueDate,Number(days)||30)); }
    else if(map[t]!==undefined) setDueDate(addDays(issueDate,map[t]));
  };

  const filteredCustomers = customers.filter(c=>
    !custSearch || c.name.toLowerCase().includes(custSearch.toLowerCase())
  );

  const docData = { docNumber:invNumber, customer, issueDate, dueDate, paymentTerms:payTerms, items, ...totals, notes, terms, status, poNumber };

  const buildInvoice = (newStatus) => ({
    id: inv.id||crypto.randomUUID(),
    invoice_number: invNumber,
    customer, issue_date:issueDate, due_date:dueDate,
    payment_terms:payTerms, custom_payment_days:customDays,
    line_items:items, discount_type:discType, discount_value:discVal,
    shipping: showShipping ? shipping : "", ...totals, notes, terms, po_number:poNumber,
    status: newStatus||status, template,
    recurring:recurringEnabled, recurring_frequency:recurFreq
  });

  const handleSave = (newStatus) => {
    setSaving(true);
    setTimeout(()=>{ onSave(buildInvoice(newStatus)); setSaving(false); onClose(); }, 400);
  };

  const handlePaidConfirm = ({ date, method, reference }) => {
    const saved = buildInvoice("Paid");
    onSave(saved);
    setPayments(p=>[{
      id:crypto.randomUUID(), invoice_id:saved.id, invoice_number:saved.invoice_number,
      customer_name:customer?.name||"", amount:totals.total, date, method, reference, status:"Reconciled"
    },...p]);
    setShowPaidModal(false);
    onClose();
  };

  const handleNewItemSaved = (item) => {
    setCatalogItems(p=>[...p, item]);
    // auto-add it to the invoice
    const newItem = { id:crypto.randomUUID(), name:item.name, description:item.description||"", quantity:1, rate:item.rate, tax_rate:isVat?(item.taxRate||20):0, amount:item.rate, sort_order:items.length };
    setItems(p=>[...p, newItem]);
    setShowItemModal(false);
  };

  return (
    <>
      {showPaidModal && <PaidConfirmModal invoice={{ ...docData, invoice_number:docData.docNumber, currency:orgSettings?.currency||"GBP" }} onConfirm={handlePaidConfirm} onCancel={()=>setShowPaidModal(false)} />}
      {showPrintModal && <A4PrintModal data={docData} currSymbol={currSym} isVat={isVat} onClose={()=>setShowPrintModal(false)} />}
      {showItemModal && <ItemModal existing={null} onClose={()=>setShowItemModal(false)} onSave={handleNewItemSaved} />}

      <div style={{ width:"100%", maxWidth:1100, margin:"0 auto", background:"#F7F7F5", display:"flex", flexDirection:"column", fontFamily:ff, padding:"clamp(14px,4vw,28px) clamp(12px,4vw,32px)" }}>
        {/* Header */}
        <div style={{ background:"#1A1A1A", padding:"12px 20px", display:"flex", alignItems:"center", gap:12, flexWrap:"wrap", flexShrink:0 }}>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.1)", border:"none", borderRadius:7, padding:"6px 10px", color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", gap:6, fontSize:13, fontFamily:ff }}>
            <span style={{ transform:"rotate(90deg)", display:"flex" }}><Icons.ChevDown /></span> Back
          </button>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:15, fontWeight:800, color:"#fff" }}>{isEdit?`Edit ${inv.invoice_number}`:"New Invoice"}</div>
            {isEdit && inv.customer?.name && <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:1 }}>{inv.customer.name}</div>}
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
            {isEdit && status!=="Paid" && (
              <Btn onClick={()=>setShowPaidModal(true)} variant="success" icon={<Icons.Check />}>Mark Paid</Btn>
            )}
            <Btn onClick={()=>setShowPrintModal(true)} variant="outline-light" icon={<Icons.Receipt />}>Print / PDF</Btn>
            <SaveSplitBtn onSave={()=>handleSave()} onSaveAndSend={()=>handleSave("Sent")} onSaveAndPrint={()=>{ handleSave(); }} saving={saving} />
          </div>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>
          {/* Customer picker */}
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
                        <button key={c.id} onClick={()=>{ setCustomer(c); setCustSearch(c.name); setCustOpen(false);
                          if(!isEdit || !inv.payment_terms){
                            const nextTerms = c.paymentTerms || "Net 30";
                            setPayTerms(nextTerms);
                            const map = { "Net 30":30,"Net 15":15,"Net 7":7,"Net 60":60,"Net 90":90,"Due on Receipt":0 };
                            if(nextTerms==="Custom") setDueDate(addDays(issueDate,Number(c.customPaymentDays)||30));
                            else if(map[nextTerms]!==undefined) setDueDate(addDays(issueDate,map[nextTerms]));
                          } }}
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
            {!isEdit && acceptedQuotes.length>0 && (
              <div style={{ marginTop:10, padding:"10px", border:"1px solid #D1FAE5", borderRadius:8, background:"#F0FDF4" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                  <span style={{ fontSize:12, fontWeight:700, color:"#166534" }}>Convert Accepted Quote</span>
                  <Select
                    value={selectedQuoteId}
                    onChange={setSelectedQuoteId}
                    placeholder="Choose accepted quote"
                    options={acceptedQuotes.map(q=>({ value:q.id, label:`${q.quote_number} · ${q.customer?.name||"No customer"}` }))}
                    style={{ maxWidth:360 }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Invoice details */}
          <div style={{ background:"#fff", borderRadius:12, border:"1px solid #EBEBEB", padding:"16px 18px", marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:12 }}>Invoice Details</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12 }}>
              <Field label="Invoice #"><Input value={invNumber} onChange={setInvNumber} /></Field>
              <Field label="Issue Date">
                <input value={issueDate} onChange={e=>setIssueDate(e.target.value)} type="date"
                  style={{ width:"100%", padding:"8px 10px", border:"1.5px solid #E0E0E0", borderRadius:8, fontSize:13, fontFamily:ff, outline:"none", boxSizing:"border-box" }} />
              </Field>
              <Field label="Payment Terms">
                <PaymentTermsField value={payTerms} onChange={handleTermsChange} customDays={customDays} onCustomDaysChange={d=>{ setCustomDays(d); setDueDate(addDays(issueDate,Number(d)||30)); }} />
              </Field>
              <Field label="Due Date">
                <input value={dueDate} onChange={e=>setDueDate(e.target.value)} type="date"
                  style={{ width:"100%", padding:"8px 10px", border:"1.5px solid #E0E0E0", borderRadius:8, fontSize:13, fontFamily:ff, outline:"none", boxSizing:"border-box" }} />
              </Field>
              <Field label="PO Number">
                <Input value={poNumber} onChange={setPoNumber} placeholder="Optional" />
              </Field>
            </div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:12, paddingTop:12, borderTop:"1px solid #F0F0F0", flexWrap:"wrap", gap:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:13, fontWeight:600, color:"#333" }}>Status</span>
                <select value={status} onChange={e=>setStatus(e.target.value)}
                  style={{ padding:"5px 10px", border:"1.5px solid #E0E0E0", borderRadius:7, fontSize:13, fontFamily:ff, background:"#FAFAFA", outline:"none", cursor:"pointer" }}>
                  {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:13, fontWeight:600, color:"#333" }}>Recurring</span>
                <SlideToggle value={recurringEnabled} onChange={setRecurringEnabled} />
                {recurringEnabled && <Select value={recurFreq} onChange={setRecurFreq} options={["Weekly","Monthly","Quarterly","Annually"]} />}
              </div>
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
              <Field label="Notes (shown on invoice)">
                <Textarea value={notes} onChange={setNotes} rows={3} placeholder="e.g. Thank you for your business!" />
              </Field>
              <Field label="Payment Terms & Conditions">
                <Textarea value={terms} onChange={setTerms} rows={3} />
              </Field>
            </div>
            <TotalsBlock
              subtotal={totals.subtotal} discountType={discType} discountValue={discVal}
              setDiscountType={setDiscType} setDiscountValue={setDiscVal}
              shipping={shipping} setShipping={setShipping}
              taxBreakdown={totals.taxBreakdown} total={totals.total}
              currSymbol={currSym} isVat={isVat} cisDeduction={totals.cisDeduction} showShipping={showShipping}
            />
          </div>
        </div>
      </div>
     </>
  );
}

// ─── INVOICES PAGE ────────────────────────────────────────────────────────────
export default function InvoicesPage() {
  const { invoices, setInvoices, quotes, setQuotes } = useContext(AppCtx);
  const [panel, setPanel] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const filtered = invoices.filter(inv => {
    const matchSearch = !search ||
      inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus==="All" || inv.status===filterStatus;
    return matchSearch && matchStatus;
  });

  const onSave = inv => setInvoices(p => {
    const i = p.findIndex(x=>x.id===inv.id);
    if(i>=0){ const u=[...p]; u[i]=inv; return u; }
    return [inv,...p];
  });
  const handleConvertAcceptedQuote = (quoteId) => {
    const quote = quotes.find(q=>q.id===quoteId);
    if(!quote) return;
    setQuotes(prev=>prev.map(q=>q.id===quoteId?{...q,status:"Invoiced"}:q));
    setPanel({ mode:"edit", invoice:{
      invoice_number: nextNum("INV", invoices),
      customer: quote.customer,
      issue_date: quote.issue_date||todayStr(),
      due_date: addDays(quote.issue_date||todayStr(),30),
      payment_terms: "Net 30",
      line_items: quote.line_items||[newLine(0)],
      discount_type: quote.discount_type||"percent",
      discount_value: quote.discount_value||"",
      shipping: quote.shipping||"",
      notes: quote.notes||"",
      terms: quote.terms||DEFAULT_INV_TERMS,
      po_number: quote.po_number||"",
      status: "Draft",
      converted_from_quote: quote.quote_number,
    }});
  };

  const summary = {
    outstanding: invoices.filter(i=>["Sent","Partial"].includes(i.status)).reduce((s,i)=>s+(i.total||0),0),
    overdue:     invoices.filter(i=>i.status==="Overdue").reduce((s,i)=>s+(i.total||0),0),
    paid:        invoices.filter(i=>i.status==="Paid").reduce((s,i)=>s+(i.total||0),0),
    draft:       invoices.filter(i=>i.status==="Draft").reduce((s,i)=>s+(i.total||0),0),
  };

  if (panel) {
    return (
      <InvoiceFormPanel
        existing={panel.mode==="edit" ? panel.invoice : null}
        onClose={()=>setPanel(null)}
        onSave={inv=>{ onSave(inv); setPanel(null); }}
        onConvertFromQuote={handleConvertAcceptedQuote}
      />
    );
  }
  
  return (
    <div style={{ padding:"clamp(14px,4vw,28px) clamp(12px,4vw,32px)", maxWidth:1100, fontFamily:ff }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12, marginBottom:22 }}>
        {[
          { label:"Outstanding", value:fmt("£",summary.outstanding), color:"#E86C4A" },
          { label:"Overdue",     value:fmt("£",summary.overdue),     color:"#C0392B" },
          { label:"Paid (all)",  value:fmt("£",summary.paid),        color:"#16A34A" },
          { label:"Draft",       value:fmt("£",summary.draft),       color:"#888" },
        ].map(s=>(
          <div key={s.label} style={{ background:"#fff", borderRadius:12, padding:"14px 16px", border:"1px solid #EBEBEB" }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:5 }}>{s.label}</div>
            <div style={{ fontSize:18, fontWeight:800, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, gap:10, flexWrap:"wrap" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <h1 style={{ fontSize:22, fontWeight:800, color:"#1A1A1A", margin:0 }}>Invoices</h1>
          <span style={{ fontSize:13, color:"#AAA" }}>{invoices.length} total</span>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <div style={{ display:"flex", background:"#fff", border:"1px solid #EBEBEB", borderRadius:9, overflow:"hidden" }}>
            {["All",...STATUSES].map(s=>(
              <button key={s} onClick={()=>setFilterStatus(s)}
                style={{ padding:"6px 12px", border:"none", background:filterStatus===s?"#1A1A1A":"transparent", color:filterStatus===s?"#fff":"#888", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:ff }}>
                {s}
              </button>
            ))}
          </div>
          <Btn onClick={()=>setPanel({ mode:"new" })} variant="primary" icon={<Icons.Plus />}>New Invoice</Btn>
        </div>
      </div>

      <div style={{ background:"#fff", borderRadius:14, border:"1px solid #EBEBEB", overflowX:"auto" }}>
        <div style={{ padding:"10px 16px", borderBottom:"1px solid #F0F0F0", display:"flex", alignItems:"center", gap:9 }}>
          <Icons.Search />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search invoices…"
            style={{ flex:1, border:"none", outline:"none", fontSize:13, color:"#1A1A1A", background:"transparent", fontFamily:ff }} />
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:560 }}>
          <thead>
            <tr style={{ background:"#FAFAFA" }}>
              {["Invoice #","Customer","Issue Date","Due Date","Amount","Status",""].map(h=>(
                <th key={h} style={{ padding:"8px 16px", textAlign:h==="Amount"?"right":"left", fontSize:10, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em", borderBottom:"1px solid #F0F0F0" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(inv=>(
              <tr key={inv.id} style={{ borderBottom:"1px solid #F7F7F7", cursor:"pointer" }}
                onClick={()=>setPanel({ mode:"edit", invoice:inv })}
                onMouseEnter={e=>e.currentTarget.style.background="#FAFAFA"}
                onMouseLeave={e=>e.currentTarget.style.background=""}>
                <td style={{ padding:"12px 16px", fontSize:13, fontWeight:700, color:"#1A1A1A" }}>{inv.invoice_number}</td>
                <td style={{ padding:"12px 16px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:26, height:26, borderRadius:"50%", background:"#E86C4A22", color:"#E86C4A", fontWeight:800, fontSize:11, display:"flex", alignItems:"center", justifyContent:"center" }}>{inv.customer?.name?.[0]||"?"}</div>
                    <span style={{ fontSize:13, color:"#444" }}>{inv.customer?.name||"—"}</span>
                  </div>
                </td>
                <td style={{ padding:"12px 16px", fontSize:13, color:"#888" }}>{fmtDate(inv.issue_date)}</td>
                <td style={{ padding:"12px 16px", fontSize:13, color:inv.status==="Overdue"?"#C0392B":"#888" }}>{fmtDate(inv.due_date)}</td>
                <td style={{ padding:"12px 16px", fontSize:13, fontWeight:700, color:"#1A1A1A", textAlign:"right" }}>{fmt("£",inv.total||0)}</td>
                <td style={{ padding:"12px 16px" }}><Tag color={STATUS_COLORS[inv.status]||"#888"}>{inv.status||"Draft"}</Tag></td>
                <td style={{ padding:"12px 16px" }} onClick={e=>e.stopPropagation()}>
                  <Btn onClick={()=>setPanel({ mode:"edit", invoice:inv })} variant="ghost" size="sm" icon={<Icons.Edit />}>Edit</Btn>
                  <Btn onClick={()=>window.confirm(`Delete ${inv.invoice_number}?`) && setInvoices(prev=>prev.filter(x=>x.id!==inv.id))} variant="ghost" size="sm" icon={<Icons.Trash />}>Delete</Btn>
                </td>
              </tr>
            ))}
            {filtered.length===0 && (
              <tr><td colSpan={7} style={{ padding:"40px", textAlign:"center", color:"#CCC", fontSize:13 }}>
                {invoices.length===0 ? "No invoices yet. Click 'New Invoice' to create your first." : "No invoices match your filters."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
