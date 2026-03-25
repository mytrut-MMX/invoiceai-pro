import { useState, useContext, useMemo, useRef, useCallback } from "react";
import { ff, CUR_SYM, TAX_RATES, EXPENSE_CATEGORIES, EXPENSE_STATUSES, PAYMENT_METHODS, STATUS_COLORS } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Field, Input, Select, Textarea, Btn, Tag, Switch } from "../components/atoms";
import { CustomerPicker } from "../components/shared";
import { fmt, fmtDate, todayStr, nextNum } from "../utils/helpers";

// ─── helpers ──────────────────────────────────────────────────────────────────
const EXP_STATUS_COLORS = {
  Draft: "#6b7280", Submitted: "#1e6be0", Approved: "#059669", Reimbursed: "#7c3aed",
};

function expNextNum(expenses) {
  const nums = (expenses || [])
    .map(e => parseInt(String(e.expense_number || "").replace(/\D/g, ""), 10))
    .filter(Boolean);
  return `EXP-${String(nums.length ? Math.max(...nums) + 1 : 1).padStart(4, "0")}`;
}

// ─── Receipt image upload ──────────────────────────────────────────────────────
function ReceiptUpload({ value, onChange }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const loadFile = useCallback(file => {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 3 * 1024 * 1024) { alert("Image must be under 3 MB"); return; }
    const reader = new FileReader();
    reader.onload = e => onChange(e.target.result);
    reader.readAsDataURL(file);
  }, [onChange]);

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); loadFile(e.dataTransfer.files[0]); }}
      style={{
        border: `2px dashed ${dragging ? "#1e6be0" : "#d1d5db"}`,
        borderRadius: 10, background: dragging ? "#f0f5ff" : "#fafafa",
        transition: "border-color 0.15s, background 0.15s",
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: 110, padding: 14, gap: 16, flexWrap: "wrap",
      }}>
      {value ? (
        <div style={{ position: "relative", flexShrink: 0 }}>
          <img src={value} alt="receipt" style={{ maxHeight: 90, maxWidth: 160, objectFit: "contain", borderRadius: 6, border: "1px solid #e8e8ec" }} />
          <button onClick={() => onChange("")}
            style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "#ef4444", border: "none", color: "#fff", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ff }}>
            ×
          </button>
        </div>
      ) : (
        <div style={{ textAlign: "center" }}>
          <Icons.Receipt />
          <div style={{ fontSize: 12, color: "#9ca3af", margin: "6px 0 4px" }}>Drag receipt here or</div>
          <button onClick={() => inputRef.current?.click()}
            style={{ fontSize: 12, color: "#1e6be0", background: "none", border: "none", cursor: "pointer", fontFamily: ff, fontWeight: 600, padding: 0 }}>
            Browse image
          </button>
          <div style={{ fontSize: 11, color: "#c4c4c4", marginTop: 3 }}>JPG, PNG, GIF — max 3 MB</div>
        </div>
      )}
      {value && (
        <button onClick={() => inputRef.current?.click()}
          style={{ fontSize: 12, color: "#1e6be0", background: "none", border: "1px solid #1e6be0", borderRadius: 6, cursor: "pointer", fontFamily: ff, fontWeight: 600, padding: "5px 10px" }}>
          Change
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/gif,image/jpeg,image/png,image/bmp,image/jpg"
        style={{ display: "none" }} onChange={e => loadFile(e.target.files[0])} />
    </div>
  );
}

// ─── CSV Export ───────────────────────────────────────────────────────────────
function exportCSV(rows, currSym) {
  const headers = ["Expense #","Date","Type","Category","Vendor / Description","Net Amount","Tax Rate","Tax Amount","Total","Status","Billable","Customer","Paid Through","Mileage km","Rate/km","Notes"];
  const escape = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [
    headers.map(escape).join(","),
    ...rows.map(e => [
      e.expense_number, e.date, e.expense_type === "mileage" ? "Mileage" : "Regular",
      e.category, e.expense_type === "mileage" ? `${e.mileage_from || ""} → ${e.mileage_to || ""}` : (e.vendor || e.description || ""),
      e.amount, e.tax_rate, e.tax_amount, e.total,
      e.status, e.billable ? "Yes" : "No", e.customer?.name || "",
      e.paid_through || "", e.expense_type === "mileage" ? e.mileage_km : "",
      e.expense_type === "mileage" ? e.mileage_rate : "", e.notes,
    ].map(escape).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `expenses-${todayStr()}.csv`;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 500);
}

// ─── EXPENSE FORM ─────────────────────────────────────────────────────────────
function ExpenseForm({ existing, onClose, onSave }) {
  const { orgSettings, customers, customPayMethods } = useContext(AppCtx);
  const isVat = orgSettings?.vatReg === "Yes";
  const currSym = CUR_SYM[orgSettings?.currency || "GBP"] || "£";
  const isEdit = !!existing;
  const e = existing || {};

  const [expType, setExpType] = useState(e.expense_type || "regular");
  const [date, setDate] = useState(e.date || todayStr());
  const [category, setCategory] = useState(e.category || "");
  const [vendor, setVendor] = useState(e.vendor || "");
  const [description, setDescription] = useState(e.description || "");
  const [amount, setAmount] = useState(e.amount ?? "");
  const [taxRate, setTaxRate] = useState(e.tax_rate ?? (isVat ? 20 : 0));
  const [status, setStatus] = useState(e.status || "Draft");
  const [billable, setBillable] = useState(e.billable || false);
  const [customer, setCustomer] = useState(e.customer || null);
  const [paidThrough, setPaidThrough] = useState(e.paid_through || "Card");
  const [receipt, setReceipt] = useState(e.receipt || "");
  const [notes, setNotes] = useState(e.notes || "");

  // Mileage fields
  const [mileageFrom, setMileageFrom] = useState(e.mileage_from || "");
  const [mileageTo, setMileageTo] = useState(e.mileage_to || "");
  const [mileageKm, setMileageKm] = useState(e.mileage_km ?? "");
  const [mileageRate, setMileageRate] = useState(e.mileage_rate ?? 0.45);
  const [vehicle, setVehicle] = useState(e.vehicle || "Car");

  const net = expType === "mileage"
    ? Number(mileageKm || 0) * Number(mileageRate || 0)
    : Number(amount || 0);
  const taxAmt = isVat && expType !== "mileage" ? net * (Number(taxRate) / 100) : 0;
  const total = net + taxAmt;

  const allPayMethods = [...PAYMENT_METHODS, ...customPayMethods];

  const handleSave = () => {
    const item = {
      id: e.id || crypto.randomUUID(),
      expense_number: e.expense_number,
      expense_type: expType,
      date,
      category,
      vendor: expType === "mileage" ? `${mileageFrom} → ${mileageTo}` : vendor,
      description,
      amount: net,
      tax_rate: expType === "mileage" ? 0 : Number(taxRate),
      tax_amount: taxAmt,
      total,
      status,
      billable,
      customer: billable ? customer : null,
      paid_through: paidThrough,
      receipt,
      notes,
      mileage_from: expType === "mileage" ? mileageFrom : "",
      mileage_to: expType === "mileage" ? mileageTo : "",
      mileage_km: expType === "mileage" ? Number(mileageKm) : 0,
      mileage_rate: expType === "mileage" ? Number(mileageRate) : 0,
      vehicle: expType === "mileage" ? vehicle : "",
      created_at: e.created_at || new Date().toISOString(),
    };
    onSave(item);
  };

  const isValid = expType === "mileage"
    ? mileageKm && Number(mileageKm) > 0
    : amount && Number(amount) > 0;

  const card = (title, children) => (
    <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e8e8ec", padding: "18px 22px", marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );

  return (
    <div style={{ background: "#f4f5f7", minHeight: "100vh", fontFamily: ff }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: "#fff", borderBottom: "1px solid #e8e8ec", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: 13, fontFamily: ff, display: "flex", alignItems: "center", gap: 4 }}>
            ← Expenses
          </button>
          <span style={{ color: "#d1d5db" }}>/</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>
            {isEdit ? e.expense_number : "New Expense"}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={onClose} variant="outline">Cancel</Btn>
          <Btn onClick={handleSave} variant="primary" disabled={!isValid}>
            {isEdit ? "Save Changes" : "Save Expense"}
          </Btn>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "20px 24px 40px" }}>
        {/* Type selector */}
        {card("Expense Type",
          <div style={{ display: "flex", gap: 10 }}>
            {[["regular", "Regular Expense"], ["mileage", "Mileage"]].map(([v, l]) => (
              <button key={v} onClick={() => setExpType(v)}
                style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: `2px solid ${expType === v ? "#1e6be0" : "#e8e8ec"}`, background: expType === v ? "#f0f5ff" : "#fafafa", color: expType === v ? "#1e6be0" : "#6b7280", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: ff, transition: "all 0.15s" }}>
                {l}
              </button>
            ))}
          </div>
        )}

        {expType === "regular" ? (
          /* ── Regular expense fields ── */
          card("Expense Details", <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Date" required>
                <input value={date} onChange={e => setDate(e.target.value)} type="date"
                  style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #E0E0E0", borderRadius: 8, fontSize: 13, fontFamily: ff, outline: "none", boxSizing: "border-box" }} />
              </Field>
              <Field label="Category">
                <Select value={category} onChange={setCategory}
                  options={EXPENSE_CATEGORIES.map(c => ({ value: c, label: c }))}
                  placeholder="Select category…" />
              </Field>
            </div>
            <Field label="Vendor / Merchant"><Input value={vendor} onChange={setVendor} placeholder="e.g. Staples, Amazon" /></Field>
            <Field label="Description"><Textarea value={description} onChange={setDescription} placeholder="What was this expense for?" rows={2} /></Field>
            <div style={{ display: "grid", gridTemplateColumns: isVat ? "1fr 1fr 1fr" : "1fr 1fr", gap: 12 }}>
              <Field label="Net Amount" required>
                <Input value={amount} onChange={setAmount} type="number" placeholder="0.00" align="right" />
              </Field>
              {isVat && (
                <Field label="VAT Rate">
                  <Select value={String(taxRate)} onChange={v => setTaxRate(Number(v))}
                    options={TAX_RATES.map(r => ({ value: String(r), label: `${r}%` }))} />
                </Field>
              )}
              <Field label="Paid Through">
                <Select value={paidThrough} onChange={setPaidThrough}
                  options={allPayMethods.map(m => ({ value: m, label: m }))} />
              </Field>
            </div>
            {/* Totals preview */}
            {net > 0 && (
              <div style={{ marginTop: 8, padding: "10px 14px", background: "#f9fafb", borderRadius: 8, border: "1px solid #e8e8ec", fontSize: 12, display: "flex", gap: 20, flexWrap: "wrap" }}>
                <span>Net: <strong>{fmt(currSym, net)}</strong></span>
                {isVat && taxAmt > 0 && <span>VAT ({taxRate}%): <strong>{fmt(currSym, taxAmt)}</strong></span>}
                <span style={{ color: "#1e6be0", fontWeight: 700 }}>Total: <strong>{fmt(currSym, total)}</strong></span>
              </div>
            )}
          </>)
        ) : (
          /* ── Mileage fields ── */
          card("Mileage Details", <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Date" required>
                <input value={date} onChange={e => setDate(e.target.value)} type="date"
                  style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #E0E0E0", borderRadius: 8, fontSize: 13, fontFamily: ff, outline: "none", boxSizing: "border-box" }} />
              </Field>
              <Field label="Vehicle">
                <Select value={vehicle} onChange={setVehicle}
                  options={["Car","Van","Motorcycle","Bicycle","Other"].map(v => ({ value: v, label: v }))} />
              </Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="From"><Input value={mileageFrom} onChange={setMileageFrom} placeholder="Start location" /></Field>
              <Field label="To"><Input value={mileageTo} onChange={setMileageTo} placeholder="End location" /></Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Distance (km/miles)" required>
                <Input value={mileageKm} onChange={setMileageKm} type="number" placeholder="0" align="right" />
              </Field>
              <Field label="Rate per km/mile (£)">
                <Input value={mileageRate} onChange={setMileageRate} type="number" placeholder="0.45" align="right" />
              </Field>
            </div>
            <Field label="Purpose / Description"><Textarea value={description} onChange={setDescription} placeholder="Business purpose of journey" rows={2} /></Field>
            {Number(mileageKm) > 0 && (
              <div style={{ marginTop: 4, padding: "10px 14px", background: "#f0f5ff", borderRadius: 8, border: "1px solid #dbeafe", fontSize: 12 }}>
                <span style={{ color: "#1e6be0", fontWeight: 700 }}>{mileageKm} km/miles × {fmt("£", mileageRate)} = Total: <strong>{fmt(currSym, total)}</strong></span>
              </div>
            )}
          </>)
        )}

        {/* Billable */}
        {card("Billable to Customer",
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: billable ? 14 : 0 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>Charge to customer</div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Include this expense on a customer invoice</div>
              </div>
              <Switch checked={billable} onChange={setBillable} />
            </div>
            {billable && (
              <CustomerPicker
                customers={customers}
                value={customer}
                onChange={setCustomer}
                onClear={() => setCustomer(null)}
              />
            )}
          </>
        )}

        {/* Status */}
        {card("Status & Notes",
          <>
            <Field label="Status">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {EXPENSE_STATUSES.map(s => (
                  <button key={s} onClick={() => setStatus(s)}
                    style={{ padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${status === s ? (EXP_STATUS_COLORS[s] || "#6b7280") : "#E0E0E0"}`, background: status === s ? (EXP_STATUS_COLORS[s] + "18") : "#FAFAFA", color: status === s ? (EXP_STATUS_COLORS[s] || "#6b7280") : "#888", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: ff, transition: "all 0.15s" }}>
                    {s}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Notes"><Textarea value={notes} onChange={setNotes} placeholder="Internal notes…" rows={2} /></Field>
          </>
        )}

        {/* Receipt */}
        {expType === "regular" && card("Receipt",
          <ReceiptUpload value={receipt} onChange={setReceipt} />
        )}
      </div>
    </div>
  );
}

// ─── EXPENSES PAGE ────────────────────────────────────────────────────────────
export default function ExpensesPage() {
  const { expenses, setExpenses, orgSettings } = useContext(AppCtx);
  const isVat = orgSettings?.vatReg === "Yes";
  const currSym = CUR_SYM[orgSettings?.currency || "GBP"] || "£";

  const [showForm, setShowForm] = useState(false);
  const [editingExp, setEditingExp] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const filtered = useMemo(() => {
    return expenses.filter(e => {
      const matchSearch = !search ||
        (e.expense_number || "").toLowerCase().includes(search.toLowerCase()) ||
        (e.vendor || "").toLowerCase().includes(search.toLowerCase()) ||
        (e.category || "").toLowerCase().includes(search.toLowerCase()) ||
        (e.description || "").toLowerCase().includes(search.toLowerCase()) ||
        (e.customer?.name || "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "All" || e.status === statusFilter;
      return matchSearch && matchStatus;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [expenses, search, statusFilter]);

  const totals = useMemo(() => ({
    net: filtered.reduce((s, e) => s + Number(e.amount || 0), 0),
    tax: filtered.reduce((s, e) => s + Number(e.tax_amount || 0), 0),
    total: filtered.reduce((s, e) => s + Number(e.total || 0), 0),
  }), [filtered]);

  const onSave = exp => {
    setExpenses(prev => {
      const num = exp.expense_number || expNextNum(prev);
      const item = { ...exp, expense_number: num };
      const idx = prev.findIndex(x => x.id === item.id);
      if (idx >= 0) { const u = [...prev]; u[idx] = item; return u; }
      return [item, ...prev];
    });
    setShowForm(false);
    setEditingExp(null);
  };

  const onDelete = id => {
    if (!window.confirm("Delete this expense?")) return;
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const openNew = () => { setEditingExp(null); setShowForm(true); };
  const openEdit = exp => { setEditingExp(exp); setShowForm(true); };

  if (showForm) return (
    <ExpenseForm
      existing={editingExp}
      onClose={() => { setShowForm(false); setEditingExp(null); }}
      onSave={onSave}
    />
  );

  const tabs = ["All", ...EXPENSE_STATUSES];

  return (
    <div style={{ padding: "clamp(14px,4vw,28px) clamp(12px,4vw,32px)", maxWidth: 1200, background: "#f4f5f7", minHeight: "100vh", fontFamily: ff }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1a1a2e", margin: "0 0 3px" }}>Expenses</h1>
          <p style={{ color: "#6b7280", fontSize: 13, margin: 0 }}>Track and manage your business expenses</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="outline" icon={<Icons.Download />} onClick={() => exportCSV(filtered, currSym)}>Export CSV</Btn>
          <Btn variant="primary" icon={<Icons.Plus />} onClick={openNew}>New Expense</Btn>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Expenses", value: fmt(currSym, totals.total), color: "#1e6be0" },
          { label: "Net Amount", value: fmt(currSym, totals.net), color: "#059669" },
          ...(isVat ? [{ label: "VAT Reclaimable", value: fmt(currSym, totals.tax), color: "#d97706" }] : []),
          { label: "Count", value: `${filtered.length} expense${filtered.length !== 1 ? "s" : ""}`, color: "#6b7280" },
        ].map(c => (
          <div key={c.label} style={{ background: "#fff", borderRadius: 10, border: "1px solid #e8e8ec", padding: "14px 16px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e8e8ec", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden" }}>
        {/* Search + filter bar */}
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #e8e8ec", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 180 }}>
            <Icons.Search />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search expenses…"
              style={{ flex: 1, border: "none", outline: "none", fontSize: 13, color: "#1a1a2e", background: "transparent", fontFamily: ff }} />
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {tabs.map(t => (
              <button key={t} onClick={() => setStatusFilter(t)}
                style={{ padding: "5px 12px", borderRadius: 20, border: `1.5px solid ${statusFilter === t ? "#1e6be0" : "#e8e8ec"}`, background: statusFilter === t ? "#f0f5ff" : "#fafafa", color: statusFilter === t ? "#1e6be0" : "#6b7280", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: ff, transition: "all 0.12s" }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                {["Date", "Expense #", "Type", "Category", "Vendor / Route", "Amount", ...(isVat ? ["VAT"] : []), "Total", "Customer", "Status", ""].map(h => (
                  <th key={h} style={{ padding: "8px 14px", textAlign: ["Amount", "VAT", "Total"].includes(h) ? "right" : "left", fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #e8e8ec", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(exp => (
                <tr key={exp.id}
                  onClick={() => openEdit(exp)}
                  style={{ borderBottom: "1px solid #f3f4f6", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                  onMouseLeave={e => e.currentTarget.style.background = ""}>
                  <td style={{ padding: "11px 14px", fontSize: 13, color: "#6b7280", whiteSpace: "nowrap" }}>{fmtDate(exp.date)}</td>
                  <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 700, color: "#1a1a2e", whiteSpace: "nowrap" }}>{exp.expense_number}</td>
                  <td style={{ padding: "11px 14px" }}>
                    <Tag color={exp.expense_type === "mileage" ? "#0891b2" : "#6b7280"}>
                      {exp.expense_type === "mileage" ? "Mileage" : "Expense"}
                    </Tag>
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: 13, color: "#1a1a2e" }}>{exp.category || "—"}</td>
                  <td style={{ padding: "11px 14px", fontSize: 13, color: "#1a1a2e", maxWidth: 200 }}>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {exp.expense_type === "mileage"
                        ? <span style={{ color: "#0891b2" }}>🚗 {exp.mileage_km} km · {exp.mileage_from} → {exp.mileage_to}</span>
                        : exp.vendor || exp.description || "—"
                      }
                    </div>
                    {exp.description && exp.expense_type !== "mileage" && (
                      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{exp.description}</div>
                    )}
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 600, color: "#1a1a2e", textAlign: "right", whiteSpace: "nowrap" }}>{fmt(currSym, exp.amount)}</td>
                  {isVat && <td style={{ padding: "11px 14px", fontSize: 13, color: "#6b7280", textAlign: "right", whiteSpace: "nowrap" }}>{exp.tax_amount > 0 ? fmt(currSym, exp.tax_amount) : "—"}</td>}
                  <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 700, color: "#1e6be0", textAlign: "right", whiteSpace: "nowrap" }}>{fmt(currSym, exp.total)}</td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: "#6b7280" }}>
                    {exp.billable && exp.customer
                      ? <span style={{ color: "#059669", fontWeight: 600 }}>{exp.customer.name}</span>
                      : exp.billable
                      ? <Tag color="#d97706">Billable</Tag>
                      : "—"
                    }
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <Tag color={EXP_STATUS_COLORS[exp.status] || "#6b7280"}>{exp.status}</Tag>
                  </td>
                  <td style={{ padding: "11px 14px" }} onClick={ev => ev.stopPropagation()}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <Btn size="sm" variant="ghost" icon={<Icons.Edit />} onClick={() => openEdit(exp)} />
                      <Btn size="sm" variant="ghost" icon={<Icons.Trash />} onClick={() => onDelete(exp.id)} />
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={isVat ? 11 : 10} style={{ padding: "48px 20px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
                    {expenses.length === 0
                      ? <>No expenses yet. <button onClick={openNew} style={{ color: "#1e6be0", background: "none", border: "none", cursor: "pointer", fontFamily: ff, fontSize: 13, fontWeight: 600 }}>Add your first expense</button></>
                      : "No expenses match your search or filter."
                    }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
