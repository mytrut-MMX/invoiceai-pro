import { useState, useContext, useMemo, useEffect } from "react";
import { ff, CUR_SYM, DEFAULT_INV_TERMS } from "../../constants";
import { AppCtx } from "../../context/AppContext";
import { Icons } from "../icons";
import { Field, Input, Select, Textarea, Btn, SlideToggle, InfoBox, PaymentTermsField } from "../atoms";
import { LineItemsTable, SaveSplitBtn, PaidConfirmModal, A4PrintModal, CustomerPicker } from "../shared";
import { todayStr, addDays, nextNum, newLine } from "../../utils/helpers";
import { calcTotals } from "../../utils/calcTotals";
import ItemModal from "../../modals/ItemModal";
import { useCISSettings } from "../../hooks/useCISSettings";
import { postInvoiceEntry, reverseEntry, findEntryBySource } from "../../utils/ledger/ledgerService";
import { fetchUserAccounts } from "../../utils/ledger/fetchUserAccounts";
import { getDefaultTemplate, getTemplateById } from "../../utils/InvoiceTemplateSchema";

const STATUSES = ["Draft","Sent","Overdue","Paid","Void","Partial"];

export default function InvoiceFormPanel({ existing, onClose, onSave, onConvertFromQuote }) {
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
    const token = crypto.randomUUID();
    const basePath = mode === "public" ? "public" : "secure";
    const shareUrl = `${window.location.origin}/${basePath}/invoice/${invNumber}?token=${token}&expires=${expiresOn}`;
    window.prompt(mode === "private"
      ? "Private link created. Customer will use one-time passcode. Copy link:"
      : "Public link created. Anyone with the link can access before expiry. Copy link:", shareUrl);
  };

  const handleNewItemSaved = (item) => {
    setCatalogItems(p=>[...p, item]);
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

              {/* Totals */}
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
