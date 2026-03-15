import { useState, useContext, useMemo } from "react";
import { ff, STATUS_COLORS, CUR_SYM, PAYMENT_METHODS } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Field, Input, Select, Textarea, Btn, Tag } from "../components/atoms";
import { fmt, fmtDate, todayStr, nextNum } from "../utils/helpers";

// ─── Payment Modal ────────────────────────────────────────────────────────────
function PaymentModal({ existing, onClose, onSave }) {
  const { invoices, customers, customPayMethods, setInvoices, payments } = useContext(AppCtx);
  const allMethods = [...PAYMENT_METHODS, ...(customPayMethods||[])];
  const isEdit = !!existing;
  const p = existing||{};

  const [customer, setCustomer] = useState(p.customer_name||"");
  const [invoiceId, setInvoiceId] = useState(p.invoice_id||"");
  const [amount, setAmount] = useState(p.amount??"");
  const [date, setDate] = useState(p.date||todayStr());
  const [method, setMethod] = useState(p.method||"Bank Transfer");
  const [reference, setReference] = useState(p.reference||"");
  const [notes, setNotes] = useState(p.notes||"");
  const [status, setStatus] = useState(p.status||"Reconciled");
  const [paymentNumber, setPaymentNumber] = useState(p.payment_number || nextNum("PAY", payments));

  const linkedInvoice = invoices.find(i=>i.id===invoiceId||i.invoice_number===invoiceId);
  const custSuggestions = customers.filter(c=>!customer||c.name.toLowerCase().includes(customer.toLowerCase()));

  const handleSave = () => {
    onSave({
      id: p.id||crypto.randomUUID(),
      payment_number: paymentNumber,
      customer_name: customer,
      invoice_id: invoiceId,
      invoice_number: linkedInvoice?.invoice_number||invoiceId,
      quote_number: linkedInvoice?.converted_from_quote || "",
      amount: Number(amount),
      date, method, reference, notes, status
    });
    onClose();

    if (linkedInvoice && Number(amount) >= Number(linkedInvoice.total||0)) {
      setInvoices(prev=>prev.map(inv=>inv.id===linkedInvoice.id?{...inv,status:"Paid"}:inv));
    }

  };

  return (
    <div style={{ background:"#f4f5f7", minHeight:"100vh", fontFamily:ff }}>
      <div style={{ maxWidth:640, margin:"0 auto", padding:"0 0 40px" }}>
        <div style={{ position:"sticky", top:0, zIndex:10, background:"#fff", borderBottom:"1px solid #e8e8ec", padding:"12px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#6b7280", fontSize:13, fontFamily:ff }}>
              ← Payments
            </button>
            <span style={{ color:"#d1d5db" }}>/</span>
            <span style={{ fontSize:13, fontWeight:600, color:"#1a1a2e" }}>
              {isEdit ? "Edit Payment" : "New Payment"}
            </span>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <Btn onClick={onClose} variant="outline">Cancel</Btn>
            <Btn onClick={handleSave} variant="primary" disabled={!amount||!date}>
              {isEdit ? "Save Changes" : "Record Payment"}
            </Btn>
          </div>
        </div>

       <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ background:"#fff", borderRadius:10, border:"1px solid #e8e8ec", padding:"18px 22px" }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", marginBottom:16 }}>Payment Details</div>
          <Field label="Payment #">
            <Input value={paymentNumber} onChange={setPaymentNumber} />
          </Field>
          <Field label="Customer">
            <input value={customer} onChange={e=>setCustomer(e.target.value)} list="cust-list" placeholder="Customer name…"
              style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #E0E0E0", borderRadius:8, fontSize:13, fontFamily:ff, outline:"none", boxSizing:"border-box" }} />
            <datalist id="cust-list">{custSuggestions.map(c=><option key={c.id} value={c.name} />)}</datalist>
          </Field>

          <Field label="Invoice / Reference">
            <div style={{ position:"relative" }}>
              <input value={invoiceId} onChange={e=>setInvoiceId(e.target.value)} list="inv-list" placeholder="Select invoice or enter ref…"
                style={{ width:"100%", padding:"9px 12px", border:`1.5px solid ${linkedInvoice?"#1A1A1A":"#E0E0E0"}`, borderRadius:8, fontSize:13, fontFamily:ff, outline:"none", boxSizing:"border-box" }} />
              <datalist id="inv-list">{invoices.map(i=><option key={i.id} value={i.invoice_number}>{i.invoice_number} — {i.customer?.name} — {fmt("£",i.total)}</option>)}</datalist>
            </div>
            {linkedInvoice && (
              <div style={{ marginTop:6, padding:"8px 10px", background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:7, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
               <span style={{ fontSize:12, color:"#15803D", fontWeight:600 }}>{linkedInvoice.invoice_number} · {linkedInvoice.customer?.name}{linkedInvoice.converted_from_quote?` · ${linkedInvoice.converted_from_quote}`:""}</span>
                <span style={{ fontSize:12, color:"#15803D", fontWeight:700 }}>{fmt("£",linkedInvoice.total)}</span>
              </div>
            )}
          </Field>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Amount" required>
              <Input value={amount} onChange={setAmount} type="number" placeholder="0.00" />
            </Field>
            <Field label="Date" required>
              <input value={date} onChange={e=>setDate(e.target.value)} type="date"
                style={{ width:"100%", padding:"9px 10px", border:"1.5px solid #E0E0E0", borderRadius:8, fontSize:13, fontFamily:ff, outline:"none", boxSizing:"border-box" }} />
            </Field>
          </div>

          <Field label="Payment Method">
            <Select value={method} onChange={setMethod} options={allMethods} />
          </Field>
          <Field label="Reference / Transaction ID">
            <Input value={reference} onChange={setReference} placeholder="Bank ref, Stripe ID…" />
          </Field>
          <Field label="Status">
            <Select value={status} onChange={setStatus} options={["Reconciled","Partial","Pending","Refunded"]} />
          </Field>
          <Field label="Notes (internal)">
            <Textarea value={notes} onChange={setNotes} rows={2} placeholder="Optional internal notes…" />
          </Field>
        </div>
          </div>
        </div>
      </div>
  );
}

// ─── Payments Page ────────────────────────────────────────────────────────────
export default function PaymentsPage() {
  const { payments, setPayments, orgSettings } = useContext(AppCtx);
  const currSym = CUR_SYM[orgSettings?.currency||"GBP"]||"£";
  const [showForm, setShowForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [search, setSearch] = useState("");
  const [filterMethod, setFilterMethod] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  const methods = useMemo(()=>["All",...new Set(payments.map(p=>p.method).filter(Boolean))],[payments]);

  const filtered = payments.filter(p=>{
    const matchSearch = !search ||
      p.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      p.reference?.toLowerCase().includes(search.toLowerCase());
    const matchMethod = filterMethod==="All"||p.method===filterMethod;
    const matchStatus = filterStatus==="All"||p.status===filterStatus;
    return matchSearch && matchMethod && matchStatus;
  });

  const onSave = pmt => setPayments(p=>{
    const i = p.findIndex(x=>x.id===pmt.id);
    if(i>=0){ const u=[...p]; u[i]=pmt; return u; }
    return [pmt,...p];
  });

  const del = id => { if(window.confirm("Delete this payment?")) setPayments(p=>p.filter(x=>x.id!==id)); };

  const totalIn = filtered.reduce((s,p)=>s+(p.status!=="Refunded"?Number(p.amount||0):0),0);
  const totalRef = filtered.reduce((s,p)=>s+(p.status==="Refunded"?Number(p.amount||0):0),0);

  const statusColors = { Reconciled:"#16A34A", Partial:"#D97706", Pending:"#6B7280", Refunded:"#DC2626" };
  const methodIcon = { "Bank Transfer":"🏦","Credit Card":"💳","Cash":"💵","Cheque":"📝","PayPal":"🔵","Stripe":"🟣","Direct Debit":"🔄" };

  if (showForm) return (
    <PaymentModal
      existing={editingPayment}
      onClose={() => { setShowForm(false); setEditingPayment(null); }}
      onSave={pmt => { onSave(pmt); setShowForm(false); setEditingPayment(null); }}
    />
  );

  return (
    <div style={{ padding:"clamp(14px,4vw,28px) clamp(12px,4vw,32px)", maxWidth:1100, fontFamily:ff }}>
      {/* Summary */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:12, marginBottom:22 }}>
        {[
          { label:"Total Received", value:fmt(currSym,payments.filter(p=>p.status!=="Refunded").reduce((s,p)=>s+Number(p.amount||0),0)), color:"#16A34A" },
          { label:"This Month",     value:fmt(currSym,payments.filter(p=>p.status!=="Refunded"&&p.date?.startsWith(new Date().toISOString().slice(0,7))).reduce((s,p)=>s+Number(p.amount||0),0)), color:"#1A1A1A" },
          { label:"Refunded",       value:fmt(currSym,totalRef), color:"#DC2626" },
          { label:"Transactions",   value:payments.length, color:"#888" },
        ].map(s=>(
          <div key={s.label} style={{ background:"#fff", borderRadius:10, padding:"14px 16px", border:"1px solid #e8e8ec", boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:5 }}>{s.label}</div>
            <div style={{ fontSize:18, fontWeight:800, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, gap:10, flexWrap:"wrap" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <h1 style={{ fontSize:22, fontWeight:800, color:"#1A1A1A", margin:0 }}>Payments</h1>
          <span style={{ fontSize:13, color:"#AAA" }}>{payments.length} total</span>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
            style={{ padding:"6px 10px", border:"1.5px solid #E0E0E0", borderRadius:8, fontSize:12, fontFamily:ff, background:"#fff", outline:"none", cursor:"pointer" }}>
            {["All","Reconciled","Partial","Pending","Refunded"].map(s=><option key={s}>{s}</option>)}
          </select>
          <select value={filterMethod} onChange={e=>setFilterMethod(e.target.value)}
            style={{ padding:"6px 10px", border:"1.5px solid #E0E0E0", borderRadius:8, fontSize:12, fontFamily:ff, background:"#fff", outline:"none", cursor:"pointer" }}>
            {methods.map(m=><option key={m}>{m}</option>)}
          </select>
          <Btn onClick={() => { setEditingPayment(null); setShowForm(true); }} variant="primary" icon={<Icons.Plus />}>Record Payment</Btn>
        </div>
      </div>

      <div style={{ background:"#fff", borderRadius:10, border:"1px solid #e8e8ec", boxShadow:"0 1px 3px rgba(0,0,0,0.04)", overflowX:"auto" }}>
        <div style={{ padding:"10px 16px", borderBottom:"1px solid #F0F0F0", display:"flex", alignItems:"center", gap:9 }}>
          <Icons.Search />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search payments…"
            style={{ flex:1, border:"none", outline:"none", fontSize:13, color:"#1A1A1A", background:"transparent", fontFamily:ff }} />
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:560 }}>
          <thead>
            <tr style={{ background:"#f9fafb" }}>
              {["Payment #","Date","Customer","Invoice","Method","Reference","Amount","Status",""].map(h=>(
                <th key={h} style={{ padding:"8px 16px", textAlign:h==="Amount"?"right":"left", fontSize:10, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em", borderBottom:"1px solid #F0F0F0" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(pmt=>(
              <tr key={pmt.id} style={{ borderBottom:"1px solid #F7F7F7" }}
                onMouseEnter={e=>e.currentTarget.style.background="#FAFAFA"}
                onMouseLeave={e=>e.currentTarget.style.background=""}>
                <td style={{ padding:"12px 16px", fontSize:12, color:"#1A1A1A", fontWeight:700, whiteSpace:"nowrap" }}>{pmt.payment_number||"—"}</td>
                <td style={{ padding:"12px 16px", fontSize:13, color:"#888", whiteSpace:"nowrap" }}>{fmtDate(pmt.date)}</td>
                <td style={{ padding:"12px 16px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                    <div style={{ width:26, height:26, borderRadius:"50%", background:"#16A34A22", color:"#16A34A", fontWeight:800, fontSize:11, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{(pmt.customer_name||"?")[0]}</div>
                    <span style={{ fontSize:13, color:"#444" }}>{pmt.customer_name||"—"}</span>
                  </div>
                </td>
                <td style={{ padding:"12px 16px", fontSize:13, color:"#4F46E5", fontWeight:600 }}>{pmt.invoice_number||"—"}</td>
                <td style={{ padding:"12px 16px", fontSize:13, color:"#555" }}>
                  <span>{methodIcon[pmt.method]||"💰"} {pmt.method}</span>
                </td>
                <td style={{ padding:"12px 16px", fontSize:12, color:"#AAA", maxWidth:120, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{pmt.reference||"—"}</td>
                <td style={{ padding:"12px 16px", fontSize:13, fontWeight:700, color:pmt.status==="Refunded"?"#DC2626":"#16A34A", textAlign:"right", whiteSpace:"nowrap" }}>
                  {pmt.status==="Refunded"?"-":""}{fmt(currSym,pmt.amount||0)}
                </td>
                <td style={{ padding:"12px 16px" }}><Tag color={statusColors[pmt.status]||"#888"}>{pmt.status}</Tag></td>
                <td style={{ padding:"12px 16px" }}>
                  <div style={{ display:"flex", gap:4 }}>
                    <Btn onClick={() => { setEditingPayment(pmt); setShowForm(true); }} variant="ghost" size="sm" icon={<Icons.Edit />} />
                    <Btn onClick={()=>del(pmt.id)} variant="ghost" size="sm" icon={<Icons.Trash />} />
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length===0 && (
              <tr><td colSpan={9} style={{ padding:"40px", textAlign:"center", color:"#CCC", fontSize:13 }}>
                {payments.length===0?"No payments recorded yet.":"No payments match your filters."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
