import { useState, useContext, useMemo, useEffect } from "react";
import { ff, STATUS_COLORS, CUR_SYM, DEFAULT_INV_TERMS, PDF_TEMPLATES } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Field, Input, Select, Textarea, Btn, Tag, Ribbon, SlideToggle, InfoBox, PaymentTermsField } from "../components/atoms";
import { moduleUi, ModulePageHeader, ModuleToolbar, ModuleStatsRow, ModuleTableCard, SearchInput, EmptyStatePanel } from "../components/shared/moduleListUI";
import { LineItemsTable, SaveSplitBtn, PaidConfirmModal, A4PrintModal, A4InvoiceDoc, CustomerPicker } from "../components/shared";
import { fmt, fmtDate, todayStr, addDays, nextNum, newLine } from "../utils/helpers";
import { calcTotals } from "../utils/calcTotals";
import ItemModal from "../modals/ItemModal";
import { useCISSettings } from "../hooks/useCISSettings";
import { postInvoiceEntry, reverseEntry, findEntryBySource } from "../utils/ledger/ledgerService";
import { fetchUserAccounts } from "../utils/ledger/fetchUserAccounts";
import { getDefaultTemplate, getTemplateById } from "../utils/InvoiceTemplateSchema";
import SendDocumentModal from "../modals/SendDocumentModal";
import { getDocumentSentStatus, markDocumentAsSent } from "../utils/helpers";

const STATUSES = ["Draft","Sent","Overdue","Paid","Void","Partial"];

const EmailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 446" width="18" height="18" fill="currentColor">
    <path d="M412 0H100C44.86 0 0 44.86 0 100v246c0 55.14 44.86 100 100 100h312c55.14 0 100-44.86 100-100V100C512 44.86 467.14 0 412 0zm60 346c0 33.08-26.92 60-60 60H100c-33.08 0-60-26.92-60-60V100c0-33.08 26.92-60 60-60h312c33.08 0 60 26.92 60 60v246z"/>
    <path d="M387.16 112.78l-107.98 76.47c-13.84 9.8-32.44 9.8-46.28 0l-107.97-76.47c-9.01-6.38-21.5-4.25-27.88 4.76-6.38 9.01-4.25 21.5 4.76 27.88l107.97 76.47c13.84 9.8 30.05 14.7 46.26 14.7s32.43-4.9 46.26-14.7l107.98-76.47c9.01-6.38 11.15-18.87 4.76-27.88-6.38-9.01-18.87-11.15-27.88-4.76z"/>
  </svg>
);

// ─── INVOICE FORM PANEL ───────────────────────────────────────────────────────
function InvoiceFormPanel({ existing, onClose, onSave, onConvertFromQuote }) {
  const { customers, catalogItems, setCatalogItems, orgSettings, invoices, setPayments, payments, quotes, user } = useContext(AppCtx);
  const { cisEnabled, cisDefaultRate } = useCISSettings();
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
  const [templateId] = useState(inv.templateId || null);
  const [showPaidModal, setShowPaidModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recurringEnabled, setRecurringEnabled] = useState(inv.recurring||false);
  const [recurFreq, setRecurFreq] = useState(inv.recurring_frequency||"Monthly");
  const [recurringNextDate, setRecurringNextDate] = useState(inv.recurring_next_date||addDays(issueDate,30));
  const [poNumber, setPoNumber] = useState(inv.po_number||"");
  const [invNumber, setInvNumber] = useState(inv.invoice_number || nextNum("INV", invoices));
  const [invNumError, setInvNumError] = useState("");
  const acceptedQuotes = useMemo(() => (quotes||[]).filter(q=>q.status==="Accepted"), [quotes]);
  const [selectedQuoteId, setSelectedQuoteId] = useState("");

  useEffect(() => {
    if(!selectedQuoteId || !onConvertFromQuote) return;
    onConvertFromQuote(selectedQuoteId);
    setSelectedQuoteId("");
  }, [selectedQuoteId, onConvertFromQuote]);

  const totals = useMemo(()=>calcTotals(items,discType,discVal,showShipping?shipping:0,isVat,customer,cisEnabled,cisDefaultRate),[items,discType,discVal,shipping,isVat,customer,showShipping,cisEnabled,cisDefaultRate]);
  const vatAmount = totals.taxBreakdown.reduce((sum, tax) => sum + Number(tax.amount || 0), 0);
  const vatRate = totals.taxBreakdown.length === 1 ? totals.taxBreakdown[0].rate : "mixed";
  
  const handleTermsChange = (t, days) => {
    setPayTerms(t);
    const map = { "Net 30":30,"Net 15":15,"Net 7":7,"Net 60":60,"Net 90":90,"Due on Receipt":0 };
    if(t==="Custom"){ setCustomDays(days); setDueDate(addDays(issueDate,Number(days)||30)); }
    else if(map[t]!==undefined) setDueDate(addDays(issueDate,map[t]));
  };

  const filteredCustomers = customers.filter(c=>
    !custSearch || c.name.toLowerCase().includes(custSearch.toLowerCase())
  );

  const docData = { docNumber:invNumber, customer, issueDate, dueDate, paymentTerms:payTerms, items, ...totals, notes, terms, status, poNumber, docType:"invoice", templateId };
  const activeInvoiceTemplate = getTemplateById(templateId) || getDefaultTemplate();

  const buildInvoice = (newStatus) => ({
    id: inv.id||crypto.randomUUID(),
    invoice_number: invNumber,
    customer, issue_date:issueDate, due_date:dueDate,
    payment_terms:payTerms, custom_payment_days:customDays,
    line_items:items, discount_type:discType, discount_value:discVal,
    shipping: showShipping ? shipping : "", ...totals, notes, terms, po_number:poNumber,
    status: newStatus||status, template, templateId,
    recurring:recurringEnabled, recurring_frequency:recurFreq,
    recurring_next_date: recurringEnabled ? recurringNextDate : "",
    activity: inv.activity || []
  });

  const handleSave = (newStatus) => {
    const duplicate = invoices.some(x => x.invoice_number === invNumber && x.id !== inv.id);
    if (duplicate) {
      setInvNumError(`Invoice number "${invNumber}" already exists. Please use a unique number.`);
      return;
    }
    setInvNumError("");
    setSaving(true);
    setTimeout(()=>{
      const previousStatus = inv.status || "Draft";
      const nextStatus = newStatus || status;
      const savedInvoice = buildInvoice(newStatus);
      const action = !isEdit ? "Created" : nextStatus !== previousStatus ? `Status changed to ${nextStatus}` : "Updated";
      savedInvoice.activity = [...(inv.activity || []), { action, timestamp: new Date().toISOString(), actor: user?.name || "Unknown" }];
      onSave(savedInvoice);
      // Fire-and-forget — never blocks the UI save path
      ;(async () => {
        try {
          const { accounts, userId } = await fetchUserAccounts();
          if (!userId) return;
          if (isEdit) {
            const oldEntry = await findEntryBySource('invoice', inv.id);
            if (oldEntry) await reverseEntry(oldEntry.id, userId);
          }
          await postInvoiceEntry(savedInvoice, accounts, userId);
        } catch (err) {
          console.error('[Ledger] invoice post failed:', err);
        }
      })();
      if (nextStatus === "Paid" && previousStatus !== "Paid") {
        setPayments(p=>[{
          id:crypto.randomUUID(), invoice_id:savedInvoice.id, invoice_number:savedInvoice.invoice_number,
          customer_name:customer?.name||"", amount:totals.total, date:todayStr(), method:"Bank Transfer", reference:"Status changed to Paid", status:"Reconciled"
        },...p]);
      }
      setSaving(false);
      onClose();
    }, 400);
  };

  const handlePaidConfirm = ({ date, method, reference }) => {
    const saved = buildInvoice("Paid");
    saved.activity = [...(inv.activity || []), { action: "Marked Paid", timestamp: new Date().toISOString(), actor: user?.name || "Unknown" }];
    onSave(saved);
    const existingPaid = (payments || [])
      .filter(p => p.invoice_id === saved.id)
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    if (existingPaid < totals.total) {
      const paymentAmount = existingPaid > 0 ? totals.total - existingPaid : totals.total;
      setPayments(p=>[{
        id:crypto.randomUUID(), invoice_id:saved.id, invoice_number:saved.invoice_number,
        customer_name:customer?.name||"", amount:paymentAmount, date, method, reference, status:"Reconciled"
      },...p]);
    }
    setShowPaidModal(false);
    onClose();
  };
  
  const handleShare = () => {
    const visibility = window.prompt("Share visibility: Public or Private and secure?", "Public");
    if (!visibility) return;
    const expiresOn = window.prompt("Link expiration date (YYYY-MM-DD)", dueDate || addDays(todayStr(), 30));
    if (!expiresOn) return;
    const mode = visibility.toLowerCase().includes("private") ? "private" : "public";
    // AUTH-005: Use full UUID (122 bits entropy) instead of truncated 8-char segment (32 bits)
    const token = crypto.randomUUID();
    const basePath = mode === "public" ? "public" : "secure";
    const shareUrl = `${window.location.origin}/${basePath}/invoice/${invNumber}?token=${token}&expires=${expiresOn}`;
    window.prompt(mode === "private"
      ? "Private link created. Customer will use one-time passcode. Copy link:"
      : "Public link created. Anyone with the link can access before expiry. Copy link:", shareUrl);
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
      {showPrintModal && <A4PrintModal data={docData} currSymbol={currSym} isVat={isVat} onClose={()=>setShowPrintModal(false)} invoiceTemplate={activeInvoiceTemplate} />}
      {showItemModal && <ItemModal existing={null} onClose={()=>setShowItemModal(false)} onSave={handleNewItemSaved} settings={{ cis: { enabled: cisEnabled } }} />}

      <div style={{ width:"100%", maxWidth:1100, margin:"0 auto", background:"#f4f5f7", display:"flex", flexDirection:"column", fontFamily:ff, padding:"clamp(14px,4vw,28px) clamp(12px,4vw,32px)" }}>
        {/* Header */}
        <div style={{ position:"sticky", top:0, zIndex:10, background:"#fff", borderBottom:"1px solid #e8e8ec", padding:"12px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#6b7280", fontSize:13, fontFamily:ff, display:"flex", alignItems:"center", gap:4 }}>
            ← Invoices
          </button>
           <div style={{ flex:1, minWidth:0 }} />
          <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
            {isEdit && status!=="Paid" && (
              <Btn onClick={()=>setShowPaidModal(true)} variant="success" icon={<Icons.Check />}>Mark Paid</Btn>
            )}
            <Btn onClick={()=>setShowPrintModal(true)} variant="outline" icon={<Icons.Receipt />}>Print / PDF</Btn>
            <Btn onClick={handleShare} variant="outline" icon={<Icons.Send />}>Share Link</Btn>
            <SaveSplitBtn onSave={()=>handleSave()} onSaveAndSend={()=>handleSave("Sent")} onSaveAndPrint={()=>{ handleSave(); }} saving={saving} />
          </div>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>
          {/* Customer picker */}
          <div style={{ background:"#fff", borderRadius:10, border:"1px solid #e8e8ec", boxShadow:"0 1px 3px rgba(0,0,0,0.04)", padding:"16px 18px", marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>Customer</div>
            <CustomerPicker
              customers={customers}
              value={customer}
              onChange={c => {
                setCustomer(c);
                setCustSearch(c.name);
                if(!isEdit || !inv.payment_terms){
                  const nextTerms = c.paymentTerms || "Net 30";
                  setPayTerms(nextTerms);
                  const map = { "Net 30":30,"Net 15":15,"Net 7":7,"Net 60":60,"Net 90":90,"Due on Receipt":0 };
                  if(nextTerms==="Custom") setDueDate(addDays(issueDate,Number(c.customPaymentDays)||30));
                  else if(map[nextTerms]!==undefined) setDueDate(addDays(issueDate,map[nextTerms]));
                }
                if(cisEnabled && !!(c?.cis?.registered || c?.taxDetails?.cisRegistered)){
                  setItems(prev => prev.map(it => ({ ...it, cisApplicable: true })));
                }
              }}
              onClear={() => { setCustomer(null); setCustSearch(""); setCustOpen(false); }}
            />
            {cisEnabled && customer?.cis?.registered && (
              <div style={{
                display:"inline-flex", alignItems:"center", gap:4,
                marginTop:4, padding:"2px 8px",
                background:"#fef3c7", borderRadius:20,
                fontSize:11, fontWeight:600, color:"#92400e"
              }}>
                ⚠ CIS Subcontractor · {customer.cis.rate || "20%"}
              </div>
            )}
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
          {cisEnabled && customer && !customer?.cis?.registered && !customer?.taxDetails?.cisRegistered && (
            <div style={{ marginBottom:14 }}>
              <InfoBox color="#D97706">CIS cannot be applied for this customer because they are not marked as CIS registered.</InfoBox>
            </div>
          )}
          
          {/* Invoice details */}
          <div style={{ background:"#fff", borderRadius:10, border:"1px solid #e8e8ec", boxShadow:"0 1px 3px rgba(0,0,0,0.04)", padding:"16px 18px", marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:12 }}>Invoice Details</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12 }}>
              <Field label="Invoice #">
                <Input value={invNumber} onChange={v=>{ setInvNumber(v); if(invNumError) setInvNumError(""); }} style={invNumError ? { borderColor:"#DC2626" } : {}} />
                {invNumError && <div style={{ fontSize:11, color:"#DC2626", marginTop:3 }}>{invNumError}</div>}
              </Field>
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
                  style={{ padding:"5px 10px", border:"1.5px solid #E0E0E0", borderRadius:7, fontSize:13, fontFamily:ff, background:"#f9fafb", outline:"none", cursor:"pointer" }}>
                  {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:13, fontWeight:600, color:"#333" }}>Recurring</span>
                <SlideToggle value={recurringEnabled} onChange={setRecurringEnabled} />
                {recurringEnabled && <><Select value={recurFreq} onChange={setRecurFreq} options={["Weekly","Monthly","Quarterly","Annually"]} /><input value={recurringNextDate} onChange={e=>setRecurringNextDate(e.target.value)} type="date" style={{ padding:"5px 10px", border:"1.5px solid #E0E0E0", borderRadius:7, fontSize:13, fontFamily:ff, background:"#f9fafb", outline:"none" }} /></>}
              </div>
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
            <div style={{ background:"#fff", borderRadius:10, border:"1px solid #e8e8ec", boxShadow:"0 1px 3px rgba(0,0,0,0.04)", padding:"16px 18px" }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>Notes & Terms</div>
              <Field label="Notes (shown on invoice)">
                <Textarea value={notes} onChange={setNotes} rows={3} placeholder="e.g. Thank you for your business!" />
              </Field>
              <Field label="Payment Terms & Conditions">
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
                  <span style={{ color:"#1a1a2e" }}>£{totals.subtotal.toFixed(2)}</span>
                </div>

                {vatAmount > 0 && (
                  <div style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", fontSize:13 }}>
                    <span style={{ color:"#6b7280" }}>VAT ({vatRate}%)</span>
                    <span style={{ color:"#1a1a2e" }}>£{vatAmount.toFixed(2)}</span>
                  </div>
                )}

                {totals.hasCISItems && (
                  <div style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", fontSize:13, marginTop:4, paddingTop:8, borderTop:"1px dashed #fee2e2" }}>
                    <span style={{ color:"#dc2626" }}>
                      CIS Deduction
                      <span style={{ fontSize:11, color:"#9ca3af", marginLeft:6 }}>
                        ({totals.customerCIS?.rate || "20% — Standard"})
                      </span>
                    </span>
                    <span style={{ color:"#dc2626", fontWeight:600 }}>−£{totals.cisDeduction.toFixed(2)}</span>
                  </div>
                )}

                <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0 0", marginTop:6, borderTop:"2px solid #e8e8ec", fontSize:15, fontWeight:700, color:"#1a1a2e" }}>
                  <span>{totals.hasCISItems ? "Total to Pay" : "Total"}</span>
                  <span>£{Math.max(0, totals.total).toFixed(2)}</span>
                </div>

                {totals.hasCISItems && (
                  <div style={{ marginTop:12, padding:"10px 12px", background:"#fff7ed", borderRadius:8, border:"1px solid #fed7aa", fontSize:12, color:"#92400e", lineHeight:1.6 }}>
                    <strong>CIS applies.</strong> £{totals.cisDeduction.toFixed(2)} will be deducted at {totals.customerCIS?.rateValue ?? 20}% and paid to HMRC on behalf of {customer?.name || "the subcontractor"}.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
     </>
  );
}

// ─── INVOICE VIEW PANEL ───────────────────────────────────────────────────────
function InvoiceViewPanel({ invoice, onEdit, onDelete, onClose }) {
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
              onClick={() => {
                setSendDocumentType("invoice");
                setShowSendModal(true);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                background: "#111110",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontFamily: ff,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <EmailIcon />
              {!isMobile && "Send"}
            </button>
            {invoice.status === "Paid" && (
              <Btn
                variant="outline"
                icon={<EmailIcon />}
                onClick={() => {
                  setSendDocumentType("payment_confirmation");
                  setShowSendModal(true);
                }}
              >
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

// ─── INVOICES PAGE ────────────────────────────────────────────────────────────

// Status badge definitions — one source of truth for the list view
const STATUS_BADGES = {
  Draft:   { bg:"#f1f5f9", color:"#475569", dot:"#94a3b8"  },
  Sent:    { bg:"#eff6ff", color:"#1d4ed8", dot:"#3b82f6"  },
  Overdue: { bg:"#fef2f2", color:"#b91c1c", dot:"#ef4444"  },
  Paid:    { bg:"#f0fdf4", color:"#166534", dot:"#22c55e"  },
  Partial: { bg:"#fffbeb", color:"#92400e", dot:"#f59e0b"  },
  Void:    { bg:"#f3f4f6", color:"#6b7280", dot:"#d1d5db"  },
};

function StatusBadge({ status }) {
  const s = STATUS_BADGES[status] || { bg:"#f3f4f6", color:"#6b7280", dot:"#d1d5db" };
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:5,
      padding:"2px 8px", borderRadius:20,
      background:s.bg, color:s.color,
      fontSize:11, fontWeight:700, whiteSpace:"nowrap",
    }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:s.dot, flexShrink:0 }} />
      {status || "Draft"}
    </span>
  );
}

// Returns days between two date strings (positive = b is later)
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
    if (diff < 0)      hint = { text:`${Math.abs(diff)}d overdue`, color:"#b91c1c" };
    else if (diff === 0) hint = { text:"Due today",                color:"#d97706" };
    else if (diff <= 3)  hint = { text:`Due in ${diff}d`,          color:"#d97706" };
  }
  return (
    <div>
      <div style={{ fontSize:13, color:"#6b7280" }}>{fmtDate(dueDate)}</div>
      {hint && <div style={{ fontSize:10, fontWeight:700, color:hint.color, marginTop:1, letterSpacing:"0.02em" }}>{hint.text}</div>}
    </div>
  );
}

// Compact avatar matching CustomersPage palette
const AVATARS = [
  { bg:"#eff6ff", fg:"#1d4ed8" },{ bg:"#fef3c7", fg:"#92400e" },
  { bg:"#f0fdf4", fg:"#166534" },{ bg:"#fdf4ff", fg:"#7e22ce" },
  { bg:"#fff1f2", fg:"#be123c" },{ bg:"#f0f9ff", fg:"#0369a1" },
];
const avatarFor = (name = "") => AVATARS[name.charCodeAt(0) % AVATARS.length];

export default function InvoicesPage({ initialShowForm = false, onNavigate }) {
  const { invoices, setInvoices, quotes, setQuotes, orgSettings } = useContext(AppCtx);
  const currSym = CUR_SYM[orgSettings?.currency || "GBP"] || "£";

  const [panel, setPanel] = useState(initialShowForm ? { mode:"new" } : null);
  const [search, setSearch] = useState("");
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendDocumentType, setSendDocumentType] = useState("invoice");
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [filterStatus, setFilterStatus] = useState(() => {
    const saved = sessionStorage.getItem("invoices_filter");
    if (saved) { sessionStorage.removeItem("invoices_filter"); return saved; }
    return "All";
  });

  // ─── filtered list (logic unchanged) ─────────────────────────────────────
  const filtered = useMemo(() => invoices.filter(inv => {
    const matchSearch = !search ||
      inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || inv.status === filterStatus;
    return matchSearch && matchStatus;
  }), [invoices, search, filterStatus]);

  const onSave = inv => setInvoices(p => {
    const i = p.findIndex(x => x.id === inv.id);
    if (i >= 0) { const u = [...p]; u[i] = inv; return u; }
    return [inv, ...p];
  });

  const handleConvertAcceptedQuote = (quoteId) => {
    const quote = quotes.find(q => q.id === quoteId);
    if (!quote) return;
    const alreadyInvoiced = invoices.some(inv => inv.converted_from_quote === quote.quote_number);
    if (alreadyInvoiced) {
      const shouldInvoiceAgain = window.confirm("This quote has already been invoiced. Do you want to invoice it again?");
      if (!shouldInvoiceAgain) return;
    }
    setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status:"Invoiced" } : q));
    setPanel({ mode:"edit", invoice:{
      invoice_number: nextNum("INV", invoices),
      customer: quote.customer,
      issue_date: quote.issue_date || todayStr(),
      due_date: addDays(quote.issue_date || todayStr(), 30),
      payment_terms: "Net 30",
      line_items: quote.line_items || [newLine(0)],
      discount_type: quote.discount_type || "percent",
      discount_value: quote.discount_value || "",
      shipping: quote.shipping || "",
      notes: quote.notes || "",
      terms: quote.terms || DEFAULT_INV_TERMS,
      po_number: quote.po_number || "",
      status: "Draft",
      converted_from_quote: quote.quote_number,
    }});
  };

  // ─── summary metrics (all from real data) ────────────────────────────────
  const metrics = useMemo(() => {
    const overdueInvs = invoices.filter(i => i.status === "Overdue");
    return {
      total:       invoices.length,
      unpaid:      invoices.filter(i => ["Sent","Partial","Overdue"].includes(i.status)).reduce((s,i) => s + Number(i.total||0), 0),
      overdueAmt:  overdueInvs.reduce((s,i) => s + Number(i.total||0), 0),
      overdueCount:overdueInvs.length,
      paid:        invoices.filter(i => i.status === "Paid").reduce((s,i) => s + Number(i.total||0), 0),
      outstanding: invoices.filter(i => ["Sent","Partial"].includes(i.status)).reduce((s,i) => s + Number(i.total||0), 0),
    };
  }, [invoices]);

  // Status filter counts
  const statusCounts = useMemo(() => {
    const counts = { All: invoices.length };
    for (const s of STATUSES) counts[s] = invoices.filter(i => i.status === s).length;
    return counts;
  }, [invoices]);

  // ─── panel routing (logic unchanged) ─────────────────────────────────────
  if (panel?.mode === "view") {
    return (
      <InvoiceViewPanel
        invoice={panel.invoice}
        onClose={() => setPanel(null)}
        onEdit={() => setPanel({ mode:"edit", invoice:panel.invoice })}
        onDelete={() => {}}
      />
    );
  }
  if (panel) {
    const isInitialNew = initialShowForm && panel.mode === "new";
    return (
      <InvoiceFormPanel
        existing={panel.mode === "edit" ? panel.invoice : null}
        onClose={() => { if (isInitialNew && onNavigate) onNavigate("invoices"); else setPanel(null); }}
        onSave={inv => { onSave(inv); if (isInitialNew && onNavigate) onNavigate("invoices"); else setPanel(null); }}
        onConvertFromQuote={handleConvertAcceptedQuote}
      />
    );
  }

  const hasFilters = search || filterStatus !== "All";

  // ─── list view ────────────────────────────────────────────────────────────
  return (
    <div style={{ padding:"clamp(14px,4vw,28px) clamp(12px,4vw,32px)", maxWidth:1100, background:"#f4f5f7", minHeight:"100vh", fontFamily:ff }}>
      {showSendModal && selectedDocument && (
        <SendDocumentModal
          documentType={sendDocumentType}
          document={selectedDocument}
          company={{ ...orgSettings, companyName: orgSettings?.companyName || orgSettings?.name }}
          customer={selectedCustomer || {}}
          onClose={() => setShowSendModal(false)}
          onSent={() => {
            setShowSendModal(false);
            if (selectedDocument?.id) markDocumentAsSent(selectedDocument.id);
          }}
        />
      )}

      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, marginBottom:20, flexWrap:"wrap" }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, color:"#1a1a2e", margin:"0 0 3px" }}>Invoices</h1>
          <p style={{ color:"#6b7280", fontSize:12, margin:0 }}>
            {invoices.length} invoice{invoices.length !== 1 ? "s" : ""} · accounts receivable
          </p>
        </div>
        <Btn onClick={() => setPanel({ mode:"new" })} variant="primary" icon={<Icons.Plus />}>New Invoice</Btn>
      </div>

      {/* Summary strip */}
      {invoices.length > 0 && (
        <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
          {[
            { label:"Total Invoices",  value:metrics.total,                    color:"#374151" },
            { label:"Unpaid",          value:fmt(currSym, metrics.unpaid),                    color:"#1d4ed8" },
            { label:"Overdue",         value:fmt(currSym, metrics.overdueAmt), sub: metrics.overdueCount > 0 ? `${metrics.overdueCount} invoice${metrics.overdueCount>1?"s":""}` : null, color: metrics.overdueCount > 0 ? "#b91c1c" : "#374151" },
            { label:"Collected",       value:fmt(currSym, metrics.paid),                      color:"#166534" },
            { label:"Outstanding",     value:fmt(currSym, metrics.outstanding),                color: metrics.outstanding > 0 ? "#92400e" : "#374151" },
          ].map(m => (
            <div key={m.label} style={{ background:"#fff", border:"1px solid #e8e8ec", borderRadius:10, padding:"14px 18px", flex:"1 1 130px", minWidth:0 }}>
              <div style={{ fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:5 }}>{m.label}</div>
              <div style={{ fontSize:18, fontWeight:800, color:m.color, fontVariantNumeric:"tabular-nums", lineHeight:1.2 }}>
                {m.value}
              </div>
              {m.sub && <div style={{ fontSize:10, color:"#b91c1c", fontWeight:600, marginTop:2 }}>{m.sub}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Main card */}
      <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e8e8ec", boxShadow:"0 1px 4px rgba(0,0,0,0.05)", overflow:"hidden" }}>

        {/* Toolbar */}
        <div style={{ padding:"10px 16px", borderBottom:"1px solid #f0f0f4", display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          {/* Search */}
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

          {/* Status filters */}
          <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
            {["All", ...STATUSES].map(s => {
              const active = filterStatus === s;
              const cnt = statusCounts[s] || 0;
              return (
                <button key={s} onClick={() => setFilterStatus(s)}
                  style={{
                    padding:"5px 10px", border:"1px solid", borderRadius:6, cursor:"pointer", fontFamily:ff,
                    fontSize:11, fontWeight:active ? 700 : 500,
                    background: active ? "#1a1a2e" : "#fff",
                    color:      active ? "#fff"    : "#6b7280",
                    borderColor:active ? "#1a1a2e" : "#e8e8ec",
                    transition:"all 0.12s",
                    display:"flex", alignItems:"center", gap:4,
                  }}>
                  {s}
                  {cnt > 0 && s !== "All" && (
                    <span style={{ fontSize:10, fontWeight:700, background: active ? "rgba(255,255,255,0.2)" : "#f3f4f6", color: active ? "#fff" : "#374151", borderRadius:10, padding:"0 5px", lineHeight:"16px" }}>{cnt}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Clear filters */}
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
                  { label:"Invoice",      align:"left"  },
                  { label:"Customer",     align:"left"  },
                  { label:"Issued",       align:"left"  },
                  { label:"Due",          align:"left"  },
                  { label:"Amount",       align:"right" },
                  { label:"Status",       align:"left"  },
                  { label:"",             align:"right" },
                ].map(({ label, align }) => (
                  <th key={label} style={{
                    padding:"8px 16px",
                    textAlign:align,
                    fontSize:10, fontWeight:700,
                    color:"#9ca3af",
                    textTransform:"uppercase", letterSpacing:"0.07em",
                    whiteSpace:"nowrap",
                  }}>{label}</th>
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
                        <Btn variant="primary" icon={<Icons.Plus />} onClick={() => setPanel({ mode:"new" })}>New Invoice</Btn>
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
              ) : filtered.map(inv => {
                const isOverdue = inv.status === "Overdue";
                const av = avatarFor(inv.customer?.name || "");
                const sentStatus = getDocumentSentStatus(inv.id);
                return (
                  <tr key={inv.id}
                    onClick={() => setPanel({ mode:"view", invoice:inv })}
                    style={{
                      borderBottom:"1px solid #f3f4f6", cursor:"pointer",
                      borderLeft: isOverdue ? "3px solid #fca5a5" : "3px solid transparent",
                      transition:"background 0.1s",
                    }}
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
                          <div style={{ fontSize:13, color:"#1a1a2e", fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:180 }}>
                            {inv.customer?.name || "—"}
                          </div>
                          {inv.customer?.type && <div style={{ fontSize:11, color:"#6b7280", marginTop:1 }}>{inv.customer.type}</div>}
                        </div>
                      </div>
                    </td>

                    {/* Issue date */}
                    <td style={{ padding:"11px 16px", fontSize:13, color:"#6b7280", whiteSpace:"nowrap" }}>
                      {fmtDate(inv.issue_date)}
                    </td>

                    {/* Due date */}
                    <td style={{ padding:"11px 16px", whiteSpace:"nowrap" }}>
                      <DueDateCell dueDate={inv.due_date} status={inv.status} />
                    </td>

                    {/* Amount */}
                    <td style={{ padding:"11px 16px", textAlign:"right", whiteSpace:"nowrap" }}>
                      <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", fontVariantNumeric:"tabular-nums" }}>
                        {fmt(currSym, inv.total || 0)}
                      </div>
                    </td>

                    {/* Status */}
                    <td style={{ padding:"11px 16px", whiteSpace:"nowrap" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                        <StatusBadge status={inv.status || "Draft"} />
                        {sentStatus && (
                          <span style={{
                            display:"inline-flex",
                            alignItems:"center",
                            padding:"2px 8px",
                            borderRadius:20,
                            background:"#ecfdf5",
                            border:"1px solid #bbf7d0",
                            color:"#166534",
                            fontSize:10,
                            fontWeight:700,
                            letterSpacing:"0.02em",
                          }}>
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
                            setSelectedDocument({
                              ...inv,
                              invoiceNumber: inv.invoice_number,
                              dueDate: inv.due_date,
                              currency: orgSettings?.currency || "GBP",
                            });
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
                          onClick={() => setPanel({ mode:"edit", invoice:inv })}
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
