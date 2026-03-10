import { useState, useContext, useMemo } from "react";
import { createPortal } from "react-dom";
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
@@ -94,57 +93,57 @@ function InvoiceFormPanel({ existing, onClose, onSave }) {
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
    const descText = item.description ? `${item.name} — ${item.description}` : item.name;
    const newItem = { id:crypto.randomUUID(), description:descText, quantity:1, rate:item.rate, tax_rate:isVat?(item.taxRate||20):0, amount:item.rate, sort_order:items.length };
    setItems(p=>[...p, newItem]);
    setShowItemModal(false);
  };
 return (
    <div style={{ minHeight:"100vh", background:"#F7F7F5" }}>
      {showPaidModal && <PaidConfirmModal invoice={{ ...docData, invoice_number:docData.docNumber, currency:orgSettings?.currency||"GBP" }} onConfirm={handlePaidConfirm} onCancel={()=>setShowPaidModal(false)} />}
      {showPrintModal && <A4PrintModal data={docData} currSymbol={currSym} isVat={isVat} onClose={()=>setShowPrintModal(false)} />}
      {showItemModal && <ItemModal existing={null} onClose={()=>setShowItemModal(false)} onSave={handleNewItemSaved} />}
           <div style={{ width:"100%", maxWidth:1100, margin:"0 auto", minHeight:"100vh", background:"#F7F7F5", display:"flex", flexDirection:"column", fontFamily:ff }}>
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
@@ -238,81 +237,91 @@ function InvoiceFormPanel({ existing, onClose, onSave }) {
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
              currSymbol={currSym} isVat={isVat} cisDeduction={totals.cisDeduction}
            />
          </div>
        </div>
      </div>
    </div>
              );
}

// ─── INVOICES PAGE ────────────────────────────────────────────────────────────
export default function InvoicesPage() {
  const { invoices, setInvoices } = useContext(AppCtx);
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
@@ -347,36 +356,28 @@ export default function InvoicesPage() {
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
