import { useState, useContext, useMemo, useRef, useCallback } from "react";
import { ff, CUR_SYM, TAX_RATES, EXPENSE_CATEGORIES, EXPENSE_STATUSES, PAYMENT_METHODS } from "../constants";
import { postExpenseEntry } from "../utils/ledger/ledgerService";
import { fetchUserAccounts } from "../utils/ledger/fetchUserAccounts";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Field, Input, Select, Textarea, Btn, Switch } from "../components/atoms";
import { moduleUi, EmptyState } from "../components/shared/moduleListUI";
import { CustomerPicker } from "../components/shared";
import { fmt, fmtDate, todayStr, nextNum } from "../utils/helpers";

// ─── helpers ──────────────────────────────────────────────────────────────────
const STATUS_STYLE = {
  Draft:       { color: "#6b7280", bg: "#f3f4f6" },
  Submitted:   { color: "#1e6be0", bg: "#eff6ff" },
  Approved:    { color: "#059669", bg: "#ecfdf5" },
  Reimbursed:  { color: "#7c3aed", bg: "#f5f3ff" },
};

function expNextNum(expenses) {
  return nextNum("EXP", expenses.map(e => ({ invoice_number: e.expense_number })));
}

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || { color: "#6b7280", bg: "#f3f4f6" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 9px", borderRadius: 20,
      background: s.bg, color: s.color,
      fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
      {status}
    </span>
  );
}

// ─── CSV Export ───────────────────────────────────────────────────────────────
function exportCSV(rows) {
  const headers = ["Date","Expense #","Category","Vendor","Net","VAT Rate","VAT","Total","Status","Billable","Customer","Paid Through","Mileage","Rate/unit","Notes"];
  const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [
    headers.map(esc).join(","),
    ...rows.map(e => [
      e.date, e.expense_number, e.category,
      e.expense_type === "mileage" ? `${e.mileage_from || ""} → ${e.mileage_to || ""}` : e.vendor,
      e.amount, e.tax_rate, e.tax_amount, e.total,
      e.status, e.billable ? "Yes" : "No",
      e.customer?.name || "", e.paid_through || "",
      e.expense_type === "mileage" ? e.mileage_km : "",
      e.expense_type === "mileage" ? e.mileage_rate : "",
      e.notes,
    ].map(esc).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `expenses-${todayStr()}.csv`;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 500);
}

// ─── Section card (defined at module level to prevent remount on every render) ─
function ExpenseSection({ title, children }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e8ec", borderRadius: 8, marginBottom: 12 }}>
      <div style={{ padding: "10px 18px", borderBottom: "1px solid #f0f0f4", fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em" }}>{title}</div>
      <div style={{ padding: "16px 18px" }}>{children}</div>
    </div>
  );
}

// ─── Receipt upload ───────────────────────────────────────────────────────────
function ReceiptUpload({ value, onChange }) {
  const ref = useRef(null);
  const [drag, setDrag] = useState(false);
  const load = useCallback(file => {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 3 * 1024 * 1024) { alert("Max 3 MB"); return; }
    const r = new FileReader();
    r.onload = e => onChange(e.target.result);
    r.readAsDataURL(file);
  }, [onChange]);
  return (
    <div onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); load(e.dataTransfer.files[0]); }}
      style={{ border: `1.5px dashed ${drag ? "#1e6be0" : "#d1d5db"}`, borderRadius: 8,
        background: drag ? "#f0f5ff" : "#fafafa", padding: 16,
        display: "flex", alignItems: "center", gap: 16, minHeight: 80 }}>
      {value ? (
        <div style={{ position: "relative" }}>
          <img src={value} alt="receipt" style={{ maxHeight: 72, maxWidth: 130, objectFit: "contain", borderRadius: 6, border: "1px solid #e8e8ec" }} />
          <button onClick={() => onChange("")}
            style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: "#ef4444", border: "none", color: "#fff", fontSize: 12, cursor: "pointer", fontFamily: ff, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
      ) : (
        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>Drag receipt or</div>
          <button onClick={() => ref.current?.click()}
            style={{ fontSize: 12, color: "#1e6be0", background: "none", border: "none", cursor: "pointer", fontFamily: ff, fontWeight: 600 }}>browse image</button>
          <div style={{ fontSize: 11, color: "#c4c4c4", marginTop: 2 }}>JPG, PNG · max 3 MB</div>
        </div>
      )}
      {value && <button onClick={() => ref.current?.click()}
        style={{ fontSize: 12, color: "#1e6be0", background: "none", border: "1px solid #1e6be0", borderRadius: 6, cursor: "pointer", fontFamily: ff, fontWeight: 600, padding: "4px 10px" }}>Change</button>}
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }} onChange={e => load(e.target.files[0])} />
    </div>
  );
}

// ─── FORM ─────────────────────────────────────────────────────────────────────
function ExpenseForm({ existing, onClose, onSave }) {
  const { orgSettings, customers, customPayMethods } = useContext(AppCtx);
  const isVat = orgSettings?.vatReg === "Yes";
  const currSym = CUR_SYM[orgSettings?.currency || "GBP"] || "£";
  const e = existing || {};

  const [expType, setExpType]           = useState(e.expense_type || "regular");
  const [date, setDate]                 = useState(e.date || todayStr());
  const [category, setCategory]         = useState(e.category || "");
  const [vendor, setVendor]             = useState(e.vendor || "");
  const [description, setDescription]  = useState(e.description || "");
  const [amount, setAmount]             = useState(e.amount ?? "");
  const [taxRate, setTaxRate]           = useState(e.tax_rate ?? (isVat ? 20 : 0));
  const [status, setStatus]             = useState(e.status || "Draft");
  const [billable, setBillable]         = useState(e.billable || false);
  const [customer, setCustomer]         = useState(e.customer || null);
  const [paidThrough, setPaidThrough]   = useState(e.paid_through || "Card");
  const [receipt, setReceipt]           = useState(e.receipt || "");
  const [notes, setNotes]               = useState(e.notes || "");
  const [mileageFrom, setMileageFrom]   = useState(e.mileage_from || "");
  const [mileageTo, setMileageTo]       = useState(e.mileage_to || "");
  const [mileageKm, setMileageKm]       = useState(e.mileage_km ?? "");
  const [mileageRate, setMileageRate]   = useState(e.mileage_rate ?? 0.45);
  const [vehicle, setVehicle]           = useState(e.vehicle || "Car");

  const net    = expType === "mileage" ? Number(mileageKm || 0) * Number(mileageRate || 0) : Number(amount || 0);
  const taxAmt = isVat && expType !== "mileage" ? net * Number(taxRate) / 100 : 0;
  const total  = net + taxAmt;
  const allPay = [...PAYMENT_METHODS, ...(customPayMethods || [])];

  const handleSave = () => {
    const expenseObj = {
      id: e.id || crypto.randomUUID(),
      expense_number: e.expense_number,
      expense_type: expType,
      date, category,
      vendor: expType === "mileage" ? "" : vendor,
      description,
      amount: net,
      tax_rate:   expType === "mileage" ? 0 : Number(taxRate),
      tax_amount: taxAmt,
      total, status, billable,
      customer: billable ? customer : null,
      paid_through: paidThrough,
      receipt, notes,
      mileage_from: mileageFrom,
      mileage_to:   mileageTo,
      mileage_km:   Number(mileageKm),
      mileage_rate: Number(mileageRate),
      vehicle,
      created_at: e.created_at || new Date().toISOString(),
    };
    onSave(expenseObj);
    // Fire-and-forget — never blocks the UI save path
    ;(async () => {
      try {
        const { accounts, userId } = await fetchUserAccounts();
        if (!userId) return;
        await postExpenseEntry(expenseObj, accounts, userId);
      } catch (err) {
        console.error('[Ledger] expense post failed:', err);
      }
    })();
  };

  const valid = expType === "mileage" ? Number(mileageKm) > 0 : Number(amount) > 0;
  const S = ExpenseSection;
  const row2 = children => <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{children}</div>;
  const row3 = children => <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>{children}</div>;

  return (
    <div style={{ background: "#f4f5f7", minHeight: "100vh", fontFamily: ff }}>
      {/* sticky header */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: "#fff", borderBottom: "1px solid #e8e8ec", padding: "11px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: 13, fontFamily: ff }}>← Expenses</button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={onClose} variant="outline">Cancel</Btn>
          <Btn onClick={handleSave} variant="primary" disabled={!valid}>Save</Btn>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "20px 20px 48px" }}>
        {/* type toggle */}
        <S title="Expense Type">
          <div style={{ display: "flex", gap: 8 }}>
            {[["regular","Regular Expense"],["mileage","Mileage"]].map(([v,l]) => (
              <button key={v} onClick={() => setExpType(v)}
                style={{ flex: 1, padding: "9px 0", borderRadius: 7, border: `1.5px solid ${expType===v ? "#1e6be0" : "#e8e8ec"}`, background: expType===v ? "#f0f5ff" : "#fafafa", color: expType===v ? "#1e6be0" : "#6b7280", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: ff }}>
                {l}
              </button>
            ))}
          </div>
        </S>

        {expType === "regular" ? (
          <S title="Expense Details">
            {row2(<>
              <Field label="Date" required>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #e8e8ec", borderRadius: 5, fontSize: 13, fontFamily: ff, outline: "none", boxSizing: "border-box" }} />
              </Field>
              <Field label="Category">
                <Select value={category} onChange={setCategory}
                  options={EXPENSE_CATEGORIES.map(c => ({ value: c.name, label: `${c.code} · ${c.name}` }))} placeholder="Select…" />
              </Field>
            </>)}
            <Field label="Vendor / Merchant"><Input value={vendor} onChange={setVendor} placeholder="e.g. Amazon, Screwfix" /></Field>
            <Field label="Description"><Textarea value={description} onChange={setDescription} placeholder="What was this expense for?" rows={2} /></Field>
            {row2(<>
              <Field label="Net Amount" required><Input value={amount} onChange={setAmount} type="number" placeholder="0.00" align="right" /></Field>
              <Field label="Paid Through">
                <Select value={paidThrough} onChange={setPaidThrough} options={allPay.map(m => ({ value: m, label: m }))} />
              </Field>
            </>)}
            {isVat && row3(<>
              <Field label="VAT Rate"><Select value={String(taxRate)} onChange={v => setTaxRate(Number(v))} options={TAX_RATES.map(r => ({ value: String(r), label: `${r}%` }))} /></Field>
              <Field label="VAT"><Input value={fmt(currSym, taxAmt)} readOnly align="right" /></Field>
              <Field label="Total"><Input value={fmt(currSym, total)} readOnly align="right" /></Field>
            </>)}
          </S>
        ) : (
          <S title="Mileage Details">
            {row2(<>
              <Field label="Date" required>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #e8e8ec", borderRadius: 5, fontSize: 13, fontFamily: ff, outline: "none", boxSizing: "border-box" }} />
              </Field>
              <Field label="Vehicle">
                <Select value={vehicle} onChange={setVehicle} options={["Car","Van","Motorcycle","Bicycle","Other"].map(v => ({ value: v, label: v }))} />
              </Field>
            </>)}
            {row2(<>
              <Field label="From"><Input value={mileageFrom} onChange={setMileageFrom} placeholder="Start location" /></Field>
              <Field label="To"><Input value={mileageTo} onChange={setMileageTo} placeholder="End location" /></Field>
            </>)}
            {row2(<>
              <Field label="Distance (km/miles)" required><Input value={mileageKm} onChange={setMileageKm} type="number" placeholder="0" align="right" /></Field>
              <Field label="Rate per km/mile"><Input value={mileageRate} onChange={setMileageRate} type="number" placeholder="0.45" align="right" /></Field>
            </>)}
            {Number(mileageKm) > 0 && (
              <div style={{ background: "#f0f5ff", borderRadius: 7, padding: "9px 14px", fontSize: 13, color: "#1e6be0", fontWeight: 600, marginBottom: 4 }}>
                {mileageKm} × {fmt("£", mileageRate)} = <strong>{fmt(currSym, total)}</strong>
              </div>
            )}
            <Field label="Purpose"><Textarea value={description} onChange={setDescription} placeholder="Business purpose of journey" rows={2} /></Field>
          </S>
        )}

        {/* Billable */}
        <S title="Billable to Customer">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: billable ? 14 : 0 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>Charge to customer</div>
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>Include on a customer invoice</div>
            </div>
            <Switch checked={billable} onChange={setBillable} />
          </div>
          {billable && <CustomerPicker customers={customers} value={customer} onChange={setCustomer} onClear={() => setCustomer(null)} />}
        </S>

        {/* Status & Notes */}
        <S title="Status & Notes">
          <Field label="Status">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {EXPENSE_STATUSES.map(s => {
                const st = STATUS_STYLE[s] || { color: "#6b7280", bg: "#f3f4f6" };
                return (
                  <button key={s} onClick={() => setStatus(s)}
                    style={{ padding: "5px 14px", borderRadius: 20, border: `1.5px solid ${status===s ? st.color : "#e8e8ec"}`, background: status===s ? st.bg : "#fafafa", color: status===s ? st.color : "#9ca3af", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: ff }}>
                    {s}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Notes"><Textarea value={notes} onChange={setNotes} placeholder="Internal notes…" rows={2} /></Field>
        </S>

        {/* Receipt */}
        {expType === "regular" && (
          <S title="Receipt">
            <ReceiptUpload value={receipt} onChange={setReceipt} />
          </S>
        )}
      </div>
    </div>
  );
}

// ─── LEFT FILTER PANEL ────────────────────────────────────────────────────────
const FILTER_GROUPS = [
  { key: "all",          label: "All Expenses" },
  { key: "_sep1",        label: null },
  { key: "unbilled",     label: "Unbilled" },
  { key: "billable",     label: "Billable" },
  { key: "nonbillable",  label: "Non-billable" },
  { key: "_sep2",        label: null },
  ...EXPENSE_STATUSES.map(s => ({ key: s, label: s })),
];

function filterExpenses(expenses, key) {
  if (key === "all")         return expenses;
  if (key === "unbilled")    return expenses.filter(e => e.billable && e.status !== "Reimbursed");
  if (key === "billable")    return expenses.filter(e => e.billable);
  if (key === "nonbillable") return expenses.filter(e => !e.billable);
  return expenses.filter(e => e.status === key);
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function ExpensesPage({ initialShowForm = false, onNavigate }) {
  const { expenses, setExpenses, orgSettings } = useContext(AppCtx);
  const isVat  = orgSettings?.vatReg === "Yes";
  const currSym = CUR_SYM[orgSettings?.currency || "GBP"] || "£";

  const [showForm,    setShowForm]    = useState(initialShowForm);
  const [editingExp,  setEditingExp]  = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [search,      setSearch]      = useState("");
  const [billableFilter, setBillableFilter] = useState("All");

  const panelFiltered = useMemo(() => filterExpenses(expenses, activeFilter), [expenses, activeFilter]);

  const filtered = useMemo(() => {
    if (!search) return panelFiltered;
    const q = search.toLowerCase();
    return panelFiltered.filter(e =>
      (e.expense_number || "").toLowerCase().includes(q) ||
      (e.category || "").toLowerCase().includes(q) ||
      (e.vendor || "").toLowerCase().includes(q) ||
      (e.description || "").toLowerCase().includes(q) ||
      (e.customer?.name || "").toLowerCase().includes(q) ||
      (e.paid_through || "").toLowerCase().includes(q)
    );
  }, [panelFiltered, search]);

  const filteredByBillable = useMemo(() => {
    if (billableFilter === "All") return filtered;
    if (billableFilter === "Billable") return filtered.filter(e => !!e.billable);
    if (billableFilter === "With Receipt") return filtered.filter(e => !!e.receipt_url || !!e.receipt);
    return filtered;
  }, [filtered, billableFilter]);
  
  const sortedFiltered = useMemo(
    () => [...filteredByBillable].sort((a, b) => new Date(b.date) - new Date(a.date)),
    [filteredByBillable]
  );
  const hasFilters = search || activeFilter !== "all" || billableFilter !== "All";
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.total || 0), 0);
  const billableCount = expenses.filter(e => e.billable).length;
  const withReceiptCount = expenses.filter(e => !!e.receipt_url || !!e.receipt).length;
  
  const countFor = key => filterExpenses(expenses, key).length;

  const onSave = exp => {
    setExpenses(prev => {
      const num = exp.expense_number || expNextNum(prev);
      const item = { ...exp, expense_number: num };
      const idx = prev.findIndex(x => x.id === item.id);
      if (idx >= 0) { const u = [...prev]; u[idx] = item; return u; }
      return [item, ...prev];
    });
    if (initialShowForm && onNavigate) { onNavigate("expenses"); return; }
    setShowForm(false);
    setEditingExp(null);
  };

  const onDelete = id => {
    if (!window.confirm("Delete this expense?")) return;
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  if (showForm) return (
    <ExpenseForm
      existing={editingExp}
      onClose={() => {
        if (initialShowForm && onNavigate) { onNavigate("expenses"); return; }
        setShowForm(false); setEditingExp(null);
      }}
      onSave={onSave}
    />
  );

  // table columns
  const cols = ["Date","Expense Account","Reference #","Paid Through","Customer","Status","Amount",""];

  return (
    <div style={{ display: "flex", height: "100%", fontFamily: ff, background: "#f8fafc" }}>

      {/* ── LEFT FILTER PANEL ── */}
      <div style={{ width: 200, flexShrink: 0, borderRight: "1px solid #e8e8ec", background: "#fff", padding: "14px 0", overflowY: "auto" }}>
        {FILTER_GROUPS.map(({ key, label }) => {
          if (!label) return <div key={key} style={{ height: 1, background: "#f0f0f4", margin: "8px 0" }} />;
          const cnt = countFor(key);
          const active = activeFilter === key;
          return (
            <button key={key} onClick={() => setActiveFilter(key)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", textAlign: "left", padding: "7px 18px",
                background: "none", border: "none",
                borderLeft: `3px solid ${active ? "#1e6be0" : "transparent"}`,
                color: active ? "#1e6be0" : "#374151",
                fontSize: 13, fontWeight: active ? 700 : 400,
                cursor: "pointer", fontFamily: ff,
              }}>
              <span>{label}</span>
              {cnt > 0 && (
                <span style={{ fontSize: 11, color: active ? "#1e6be0" : "#9ca3af", fontWeight: 600, minWidth: 18, textAlign: "right" }}>{cnt}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#f8fafc", padding: "14px" }}>

        {/* header */}
       <div style={{ padding: "16px 20px 10px", border: "1px solid #e2e8f0", borderRadius: 12, background:"#fff", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexShrink: 0, gap:12, flexWrap:"wrap" }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0 }}>Expenses</h1>
            <p style={{ fontSize:13, color:"#64748b", margin:"6px 0 0" }}>{expenses.length} records · monitor spend, billables, and documentation.</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="outline" icon={<Icons.Download />} onClick={() => exportCSV(sortedFiltered)}>Export CSV</Btn>
            <Btn variant="primary" icon={<Icons.Plus />} onClick={() => { setEditingExp(null); setShowForm(true); }}>New Expense</Btn>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12, marginTop:12, marginBottom:10 }}>
          {[
            { label:"Total Expenses", value:fmt(currSym, totalExpenses), color:"#0f172a" },
            { label:"Billable", value:billableCount, color:"#1d4ed8" },
            { label:"With Receipt", value:withReceiptCount, color:"#0f766e" },
          ].map(card => (
            <div key={card.label} style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, padding:"12px 14px" }}>
              <div style={{ fontSize:11, textTransform:"uppercase", letterSpacing:"0.06em", color:"#94a3b8", fontWeight:700 }}>{card.label}</div>
              <div style={{ fontSize:20, marginTop:4, fontWeight:800, color:card.color }}>{card.value}</div>
            </div>
          ))}
        </div>
        
        {/* search toolbar */}
        <div style={{ ...moduleUi.toolbar, marginTop: 10, marginBottom: 10 }}>
          <div style={{ ...moduleUi.searchWrap, maxWidth: 380 }}>
            <Icons.Search />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search expenses…"
              style={{ flex: 1, border: "none", outline: "none", fontSize: 13, color: "#1a1a2e", background: "transparent", fontFamily: ff }} />
            {search && (
              <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 0, fontSize: 14, lineHeight: 1, fontFamily: ff }}>×</button>
            )}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <select value={billableFilter} onChange={e=>setBillableFilter(e.target.value)} style={{ padding:"8px 10px", border:"1px solid #dbe4ee", borderRadius:10, fontSize:12, background:"#fff", fontFamily:ff }}>
              {["All","Billable","With Receipt"].map(v => <option key={v}>{v}</option>)}
            </select>
            {hasFilters && <Btn variant="ghost" size="sm" onClick={() => { setSearch(""); setActiveFilter("all"); setBillableFilter("All"); }}>Clear filters</Btn>}
            <span style={{ fontSize: 12, color: "#9ca3af" }}>{sortedFiltered.length} record{sortedFiltered.length !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* table */}
        <div style={{ ...moduleUi.card, flex: 1, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}>
            <thead>
              <tr style={{ ...moduleUi.tableHead, position: "sticky", top: 0, zIndex: 1 }}>
                {cols.map(h => (
                  <th key={h} style={{ ...moduleUi.th, textAlign: ["Amount"].includes(h) ? "right" : "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedFiltered.map(exp => (
                <tr key={exp.id}
                  onClick={() => { setEditingExp(exp); setShowForm(true); }}
                  style={{ borderBottom: "1px solid #f3f4f6", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                  onMouseLeave={e => e.currentTarget.style.background = ""}>

                  {/* Date */}
                  <td style={{ padding: "11px 16px", fontSize: 13, color: "#374151", whiteSpace: "nowrap" }}>
                    {fmtDate(exp.date)}
                  </td>

                  {/* Category */}
                  <td style={{ padding: "11px 16px", fontSize: 13, color: "#1a1a2e", fontWeight: 500 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {exp.expense_type === "mileage" && (
                        <span style={{ fontSize: 11, color: "#0891b2", background: "#ecfeff", padding: "1px 6px", borderRadius: 10, fontWeight: 700 }}>Mileage</span>
                      )}
                      <span>{exp.category || <span style={{ color: "#c4c4c4" }}>—</span>}</span>
                    </div>
                    {exp.expense_type === "mileage" && exp.mileage_km > 0 && (
                      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>{exp.mileage_km} km · {exp.mileage_from} → {exp.mileage_to}</div>
                    )}
                    {exp.expense_type !== "mileage" && exp.vendor && (
                      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{exp.vendor}</div>
                    )}
                  </td>

                  {/* Reference */}
                  <td style={{ padding: "11px 16px", fontSize: 13, color: "#1e6be0", fontWeight: 600, whiteSpace: "nowrap" }}>
                    {exp.expense_number}
                  </td>

                  {/* Paid Through */}
                  <td style={{ padding: "11px 16px", fontSize: 13, color: "#6b7280" }}>
                    {exp.paid_through || "—"}
                  </td>

                  {/* Customer */}
                  <td style={{ padding: "11px 16px", fontSize: 13, color: exp.billable && exp.customer ? "#059669" : "#9ca3af", fontWeight: exp.billable && exp.customer ? 600 : 400 }}>
                    {exp.billable && exp.customer ? exp.customer.name : exp.billable ? <span style={{ color: "#d97706", fontWeight: 600 }}>Billable</span> : "—"}
                  </td>

                  {/* Status */}
                  <td style={{ padding: "11px 16px" }}>
                    <StatusBadge status={exp.status} />
                  </td>

                  {/* Amount */}
                  <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 600, color: "#1a1a2e", textAlign: "right", whiteSpace: "nowrap" }}>
                    {fmt(currSym, exp.total)}
                    {isVat && exp.tax_amount > 0 && (
                      <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 400 }}>incl. {fmt(currSym, exp.tax_amount)} VAT</div>
                    )}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: "11px 12px" }} onClick={ev => ev.stopPropagation()}>
                    <div style={{ display: "flex", gap: 2, opacity: 0 }} className="row-actions"
                      onMouseEnter={e => e.currentTarget.style.opacity = 1}
                      onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                      <Btn size="sm" variant="ghost" icon={<Icons.Edit />} onClick={() => { setEditingExp(exp); setShowForm(true); }} />
                      <Btn size="sm" variant="ghost" icon={<Icons.Trash />} onClick={() => onDelete(exp.id)} />
                    </div>
                  </td>
                </tr>
              ))}

              {sortedFiltered.length === 0 && (
                  <tr><td colSpan={8}><EmptyState icon={<Icons.Expenses />} text={expenses.length === 0 ? "No expenses yet. Record your first expense to start tracking spend." : "No expenses match your current search or filters."} cta={expenses.length===0 ? <Btn variant="primary" onClick={() => { setEditingExp(null); setShowForm(true); }}>New Expense</Btn> : <Btn variant="outline" onClick={() => { setSearch(""); setActiveFilter("all"); setBillableFilter("All"); }}>Clear filters</Btn>} /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* row-actions hover style */}
      <style>{`
        tr:hover .row-actions { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
