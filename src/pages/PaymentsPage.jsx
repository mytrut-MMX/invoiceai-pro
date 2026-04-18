import { useState, useContext, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ROUTES } from "../router/routes";
import { ff, CUR_SYM, PAYMENT_METHODS } from "../constants";
import { postPaymentEntry } from "../utils/ledger/ledgerService";
import { fetchUserAccounts } from "../utils/ledger/fetchUserAccounts";
import { AppCtx } from "../context/AppContext";
import { deletePayment } from "../lib/dataAccess";
import { reverseEntry, findEntryBySource } from "../utils/ledger/ledgerService";
import { Icons } from "../components/icons";
import { Field, Input, Select, Textarea, Btn, StatusBadge } from "../components/atoms";
import { fmt, fmtDate, todayStr, nextNum } from "../utils/helpers";
import { useToast } from "../components/ui/Toast";
import EmptyState from "../components/ui/EmptyState";

const METHOD_ICON = {
  "Bank Transfer": "🏦", "Credit Card": "💳", "Cash": "💵",
  "Cheque": "📝", "PayPal": "🔵", "Stripe": "🟣", "Direct Debit": "🔄",
};

// ─── Payment Detail View ───────────────────────────────────────────────────────
function PaymentDetailView({ payment, onClose, onEdit, onDelete }) {
  const { orgSettings } = useContext(AppCtx);
  const currSym = CUR_SYM[orgSettings?.currency||"GBP"]||"£";
  const p = payment;

  const rows = [
    { label: "Payment Number", value: p.payment_number || "—" },
    { label: "Date",           value: fmtDate(p.date) },
    { label: "Customer",       value: p.customer_name || "—" },
    { label: "Invoice",        value: p.invoice_number || "—" },
    { label: "Payment Mode",   value: p.method ? `${METHOD_ICON[p.method]||"💰"} ${p.method}` : "—" },
    { label: "Reference",      value: p.reference || "—" },
    { label: "Status",         value: <StatusBadge status={p.status} /> },
    ...(p.notes ? [{ label: "Notes", value: p.notes }] : []),
  ];

  return (
    <div style={{ background:"#f4f5f7", minHeight:"100vh", fontFamily:ff }}>
      {/* Sticky header */}
      <div style={{ position:"sticky", top:0, zIndex:10, background:"#fff", borderBottom:"1px solid #e8e8ec", padding:"12px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#6b7280", fontSize:13, fontFamily:ff, padding:0 }}>
            ← Payments
          </button>
          <span style={{ color:"#d1d5db" }}>/</span>
          <span style={{ fontSize:13, fontWeight:600, color:"#1a1a2e" }}>{p.payment_number || "Payment"}</span>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <Btn onClick={onEdit} variant="outline" icon={<Icons.Edit />}>Edit</Btn>
          <Btn onClick={onDelete} variant="ghost" icon={<Icons.Trash />} style={{ color:"#DC2626" }} />
        </div>
      </div>

      <div style={{ maxWidth:700, margin:"0 auto", padding:"28px 24px 48px" }}>
        {/* Amount hero card */}
        <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e8e8ec", padding:"28px 32px", marginBottom:20, textAlign:"center" }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Amount Received</div>
          <div style={{ fontSize:38, fontWeight:800, color: p.status==="Refunded" ? "#DC2626" : "#16A34A", letterSpacing:"-0.5px" }}>
            {p.status==="Refunded" ? "-" : ""}{fmt(currSym, p.amount||0)}
          </div>
          <div style={{ marginTop:12 }}><StatusBadge status={p.status} /></div>
        </div>

        {/* Details card */}
        <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e8e8ec", overflow:"hidden" }}>
          <div style={{ padding:"14px 22px", borderBottom:"1px solid #f0f0f0" }}>
            <span style={{ fontSize:13, fontWeight:700, color:"#1a1a2e" }}>Payment Details</span>
          </div>
          <div style={{ padding:"4px 0" }}>
            {rows.map(({ label, value }) => (
              <div key={label} style={{ display:"flex", alignItems:"center", padding:"13px 22px", borderBottom:"1px solid #f7f7f7" }}>
                <div style={{ width:180, fontSize:13, color:"#888", fontWeight:500, flexShrink:0 }}>{label}</div>
                <div style={{ fontSize:13, color:"#1a1a2e", fontWeight:500 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Applied to invoice */}
        {p.invoice_number && (
          <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e8e8ec", overflow:"hidden", marginTop:20 }}>
            <div style={{ padding:"14px 22px", borderBottom:"1px solid #f0f0f0" }}>
              <span style={{ fontSize:13, fontWeight:700, color:"#1a1a2e" }}>Applied To</span>
            </div>
            <div style={{ padding:"16px 22px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:34, height:34, borderRadius:8, background:"var(--brand-50)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Icons.Invoices />
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:"var(--brand-600)" }}>{p.invoice_number}</div>
                  {p.quote_number && <div style={{ fontSize:11, color:"#AAA", marginTop:1 }}>from {p.quote_number}</div>}
                </div>
              </div>
              <div style={{ fontSize:14, fontWeight:700, color:"#16A34A" }}>{fmt(currSym, p.amount||0)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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
    const newPmt = {
      id: p.id || crypto.randomUUID(),
      payment_number: paymentNumber,
      customer_name: customer,
      invoice_id: invoiceId,
      invoice_number: linkedInvoice?.invoice_number || invoiceId,
      quote_number: linkedInvoice?.converted_from_quote || "",
      amount: Number(amount),
      date, method, reference, notes, status
    };
    onSave(newPmt);
    onClose();

    // Fire-and-forget — never blocks the UI save path
    ;(async () => {
      try {
        if (!linkedInvoice) return;
        const { accounts, userId } = await fetchUserAccounts();
        if (!userId) return;
        await postPaymentEntry(newPmt, linkedInvoice, accounts, userId, orgSettings?.vatScheme || 'Standard', orgSettings?.accountingBasis || 'Accrual');
      } catch (err) {
        console.error('[Ledger] payment post failed:', err);
      }
    })();

    if (linkedInvoice) {
      const isEdit = payments.some(p => p.id === newPmt.id);
      const prevPaid = payments
        .filter(pmt => pmt.invoice_id === linkedInvoice.id && pmt.id !== newPmt.id)
        .reduce((s, pmt) => s + Number(pmt.amount || 0), 0);
      const totalPaid = prevPaid + Number(amount);
      const invTotal = Number(linkedInvoice.total || 0);
      const newInvStatus = totalPaid >= invTotal
        ? "Paid"
        : totalPaid > 0
          ? "Partial"
          : linkedInvoice.status;
      const actEntry = { action: `Payment ${isEdit ? "updated" : "recorded"}: £${Number(amount).toFixed(2)}`, timestamp: new Date().toISOString(), actor: "System" };
      setInvoices(prev => prev.map(inv =>
        inv.id === linkedInvoice.id ? { ...inv, status: newInvStatus, activity: [...(inv.activity || []), actEntry] } : inv
      ));
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
export default function PaymentsPage({ initialShowForm = false }) {
  const { payments, setPayments, orgSettings, user } = useContext(AppCtx);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const currSym = CUR_SYM[orgSettings?.currency||"GBP"]||"£";
  const [showForm, setShowForm] = useState(initialShowForm);
  const [editingPayment, setEditingPayment] = useState(null);
  const [viewingPayment, setViewingPayment] = useState(null);

  // Filters driven by URL search params
  const search       = searchParams.get("q") || "";
  const filterMethod = searchParams.get("method") || "All";
  const filterStatus = searchParams.get("status") || "All";

  const setSearch       = (v) => setSearchParams(p => { const n = new URLSearchParams(p); v ? n.set("q", v) : n.delete("q"); return n; }, { replace: true });
  const setFilterMethod = (v) => setSearchParams(p => { const n = new URLSearchParams(p); v && v !== "All" ? n.set("method", v) : n.delete("method"); return n; }, { replace: true });
  const setFilterStatus = (v) => setSearchParams(p => { const n = new URLSearchParams(p); v && v !== "All" ? n.set("status", v) : n.delete("status"); return n; }, { replace: true });

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

  const onSave = pmt => {
    setPayments(p=>{
      const i = p.findIndex(x=>x.id===pmt.id);
      if(i>=0){ const u=[...p]; u[i]=pmt; return u; }
      return [pmt,...p];
    });
    toast({ title: "Payment recorded", variant: "success" });
  };

  const del = async (id) => {
    if (!window.confirm("Delete this payment?")) return;
    if (!user?.id) return alert("You must be logged in to delete.");
    const snapshot = payments;
    setPayments(p => p.filter(x => x.id !== id));
    setViewingPayment(null);
    const { error } = await deletePayment(user.id, id);
    if (error) {
      console.error("[PaymentsPage] deletePayment failed:", error);
      setPayments(snapshot);
      toast({ title: "Failed to delete payment", description: error.message, variant: "danger" });
      return;
    }
    toast({ title: "Payment deleted", variant: "success" });
    // Fire-and-forget ledger reversal — never blocks the UI delete path
    ;(async () => {
      try {
        const { fetchUserAccounts } = await import("../utils/ledger/fetchUserAccounts");
        const { userId } = await fetchUserAccounts();
        if (!userId) return;
        const entry = await findEntryBySource('payment', id);
        if (entry) await reverseEntry(entry.id, userId);
      } catch (err) {
        console.error('[Ledger] payment reversal failed:', err);
      }
    })();
  };

  const totalRef = filtered.reduce((s,p)=>s+(p.status==="Refunded"?Number(p.amount||0):0),0);
  const totalReceived = payments.filter(p=>p.status!=="Refunded").reduce((s,p)=>s+Number(p.amount||0),0);
  const unreconciledCount = payments.filter(p=>p.status!=="Reconciled").length;
  const hasFilters = search || filterMethod !== "All" || filterStatus !== "All";

  // Detail view
  if (viewingPayment) {
    const latest = payments.find(p=>p.id===viewingPayment.id) || viewingPayment;
    if (showForm) return (
      <PaymentModal
        existing={latest}
        onClose={() => setShowForm(false)}
        onSave={pmt => { onSave(pmt); setShowForm(false); setViewingPayment(pmt); }}
      />
    );
    return (
      <PaymentDetailView
        payment={latest}
        onClose={() => setViewingPayment(null)}
        onEdit={() => { setEditingPayment(latest); setShowForm(true); }}
        onDelete={() => del(latest.id)}
      />
    );
  }

  // New payment form
  if (showForm && !viewingPayment) return (
    <PaymentModal
      existing={editingPayment}
      onClose={() => {
        if (initialShowForm) { navigate(ROUTES.PAYMENTS, { replace: true }); return; }
        setShowForm(false); setEditingPayment(null);
      }}
      onSave={pmt => {
        onSave(pmt);
        if (initialShowForm) { navigate(ROUTES.PAYMENTS, { replace: true }); return; }
        setShowForm(false); setEditingPayment(null);
      }}
    />
  );

  const thisMonthTotal = payments
    .filter(p => p.status !== "Refunded" && p.date?.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((s, p) => s + Number(p.amount || 0), 0);

  return (
    <div className="bg-[var(--surface-page)] min-h-screen">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-3 mb-5 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)] m-0">Payments Received</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1 m-0">
              {payments.length} record{payments.length !== 1 ? "s" : ""} · searchable, auditable payment history
            </p>
          </div>
          <Btn onClick={() => { setEditingPayment(null); setShowForm(true); }} variant="primary" icon={<Icons.Plus />}>Record payment</Btn>
        </div>

        {/* Summary strip */}
        {payments.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
            <PaymentSummaryCard label="Total Received" value={fmt(currSym, totalReceived)} tone="success" />
            <PaymentSummaryCard label="Unreconciled"   value={String(unreconciledCount)}    tone={unreconciledCount ? "warning" : "muted"} />
            <PaymentSummaryCard label="This Month"     value={fmt(currSym, thisMonthTotal)} tone="neutral" />
            <PaymentSummaryCard label="Refunded"       value={fmt(currSym, totalRef)}        tone="danger" />
            <PaymentSummaryCard label="Transactions"   value={String(payments.length)}       tone="muted" />
          </div>
        )}

        {/* Main card */}
        <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] overflow-hidden">
          {/* Toolbar */}
          <div className="p-3 flex items-center gap-2 flex-wrap border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2 flex-1 min-w-[160px] h-9 px-3 bg-[var(--surface-sunken)] border border-[var(--border-subtle)] rounded-[var(--radius-md)]">
              <span className="text-[var(--text-tertiary)] flex flex-shrink-0"><Icons.Search /></span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search payments…"
                className="flex-1 min-w-0 border-none outline-none bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
              />
              {search && (
                <button onClick={() => setSearch("")} title="Clear" className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] bg-transparent border-none cursor-pointer flex flex-shrink-0 p-0">
                  <Icons.X />
                </button>
              )}
            </div>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="h-9 px-3 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm bg-white text-[var(--text-primary)] cursor-pointer outline-none focus:border-[var(--brand-600)]"
            >
              {["All", "Reconciled", "Partial", "Pending", "Refunded"].map(s => <option key={s}>{s}</option>)}
            </select>
            <select
              value={filterMethod}
              onChange={e => setFilterMethod(e.target.value)}
              className="h-9 px-3 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm bg-white text-[var(--text-primary)] cursor-pointer outline-none focus:border-[var(--brand-600)]"
            >
              {methods.map(m => <option key={m}>{m}</option>)}
            </select>
            {hasFilters && (
              <button
                onClick={() => { setSearch(""); setFilterMethod("All"); setFilterStatus("All"); }}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer px-2 py-1 whitespace-nowrap transition-colors duration-150"
              >
                Clear
              </button>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[780px]">
              <thead>
                <tr className="bg-[var(--surface-sunken)] border-b border-[var(--border-subtle)]">
                  <PmtTh>Payment #</PmtTh>
                  <PmtTh>Date</PmtTh>
                  <PmtTh>Customer</PmtTh>
                  <PmtTh>Invoice</PmtTh>
                  <PmtTh>Method</PmtTh>
                  <PmtTh>Reference</PmtTh>
                  <PmtTh align="right">Amount</PmtTh>
                  <PmtTh>Status</PmtTh>
                  <PmtTh align="right" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      {payments.length === 0 ? (
                        <EmptyState
                          icon={Icons.Payments}
                          title="No payments yet"
                          description="Record your first payment to start tracking inflows"
                          action={{ label: "Record payment", onClick: () => { setEditingPayment(null); setShowForm(true); }, icon: <Icons.Plus /> }}
                        />
                      ) : (
                        <EmptyState
                          icon={Icons.Search}
                          title="No payments match your filters"
                          action={{ label: "Clear filters", onClick: () => { setSearch(""); setFilterMethod("All"); setFilterStatus("All"); }, variant: "outline" }}
                        />
                      )}
                    </td>
                  </tr>
                ) : filtered.map(pmt => {
                  const custName = pmt.customer_name || "—";
                  return (
                    <tr
                      key={pmt.id}
                      onClick={() => setViewingPayment(pmt)}
                      className="border-b border-[var(--border-subtle)] last:border-0 cursor-pointer hover:bg-[var(--surface-sunken)] transition-colors duration-150"
                    >
                      <td className="py-3 px-4 text-sm font-semibold text-[var(--text-primary)] whitespace-nowrap">{pmt.payment_number || "—"}</td>
                      <td className="py-3 px-4 text-sm text-[var(--text-secondary)] whitespace-nowrap">{fmtDate(pmt.date)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-[26px] h-[26px] rounded-full bg-[var(--success-100)] text-[var(--success-700)] font-semibold text-[11px] flex items-center justify-center flex-shrink-0">
                            {(custName || "?")[0].toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[180px]">{custName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-[var(--brand-600)] whitespace-nowrap">{pmt.invoice_number || "—"}</td>
                      <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">
                        {pmt.method ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span>{METHOD_ICON[pmt.method] || "💰"}</span>
                            <span>{pmt.method}</span>
                          </span>
                        ) : "—"}
                      </td>
                      <td className="py-3 px-4 text-xs text-[var(--text-tertiary)] truncate max-w-[140px] whitespace-nowrap">{pmt.reference || "—"}</td>
                      <td className={`py-3 px-4 text-right text-sm font-medium tabular-nums whitespace-nowrap ${pmt.status === "Refunded" ? "text-[var(--danger-600)]" : "text-[var(--success-700)]"}`}>
                        {pmt.status === "Refunded" ? "−" : ""}{fmt(currSym, pmt.amount || 0)}
                      </td>
                      <td className="py-3 px-4"><StatusBadge status={pmt.status} /></td>
                      <td className="py-3 px-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <PmtActionBtn onClick={() => { setEditingPayment(pmt); setShowForm(true); }} title="Edit payment" icon={<Icons.Edit />} />
                          <PmtActionBtn onClick={() => del(pmt.id)} title="Delete payment" icon={<Icons.Trash />} tone="danger" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.length > 0 && (
            <div className="border-t border-[var(--border-subtle)] px-4 py-2 text-xs text-[var(--text-tertiary)] text-right">
              {hasFilters ? `${filtered.length} of ${payments.length}` : payments.length} payment{payments.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Payments list helpers (Tailwind) ─────────────────────────────────────────

function PmtTh({ children, align = "left" }) {
  const alignCls = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <th className={`py-2.5 px-4 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider whitespace-nowrap ${alignCls}`}>
      {children}
    </th>
  );
}

function PmtActionBtn({ onClick, title, icon, tone = "neutral" }) {
  const toneCls = tone === "danger"
    ? "hover:border-[var(--danger-100)] hover:text-[var(--danger-600)]"
    : "hover:border-[var(--brand-600)] hover:text-[var(--brand-600)]";
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex items-center justify-center bg-white border border-[var(--border-subtle)] rounded-[var(--radius-md)] p-1.5 cursor-pointer text-[var(--text-tertiary)] transition-colors duration-150 ${toneCls}`}
    >
      {icon}
    </button>
  );
}

function PaymentSummaryCard({ label, value, tone = "neutral" }) {
  const toneCls = {
    success: "text-[var(--success-600)]",
    danger:  "text-[var(--danger-600)]",
    warning: "text-[var(--warning-600)]",
    muted:   "text-[var(--text-tertiary)]",
    neutral: "text-[var(--text-primary)]",
  }[tone] || "text-[var(--text-primary)]";
  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-4">
      <div className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-lg font-semibold tabular-nums leading-tight ${toneCls}`}>{value}</div>
    </div>
  );
}

