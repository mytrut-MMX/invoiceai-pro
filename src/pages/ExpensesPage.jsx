import { useState, useContext, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ROUTES } from "../router/routes";
import { ff, CUR_SYM, EXPENSE_STATUSES } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Btn } from "../components/atoms";
import { moduleUi, EmptyState, ModuleHeader, SearchInput, StatusBadge } from "../components/shared/moduleListUI";
import { fmt, fmtDate, todayStr, nextNum } from "../utils/helpers";
import ExpenseForm from "../components/expenses/ExpenseForm";
import { deleteExpense } from "../lib/dataAccess";
import { reverseEntry, findEntryBySource } from "../utils/ledger/ledgerService";
import { fetchUserAccounts } from "../utils/ledger/fetchUserAccounts";
import { usePagination } from "../hooks/usePagination";
import Pagination from "../components/shared/Pagination";

function expNextNum(expenses) {
  return nextNum("EXP", expenses.map(e => ({ invoice_number: e.expense_number })));
}

function exportCSV(rows) {
  const headers = ["Date", "Expense #", "Category", "Vendor", "Net", "VAT Rate", "VAT", "Total", "Status", "Billable", "Customer", "Paid Through", "Mileage", "Rate/unit", "Notes"];
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

const FILTER_GROUPS = [
  { key: "all",         label: "All Expenses" },
  { key: "_sep1",       label: null },
  { key: "unbilled",    label: "Unbilled" },
  { key: "billable",    label: "Billable" },
  { key: "nonbillable", label: "Non-billable" },
  { key: "_sep2",       label: null },
  ...EXPENSE_STATUSES.map(s => ({ key: s, label: s })),
  { key: "_sep3",         label: null },
  { key: "subcontractor", label: "Subcontractors" },
];

function filterExpenses(expenses, key) {
  if (key === "all")         return expenses;
  if (key === "unbilled")       return expenses.filter(e => e.billable && e.status !== "Reimbursed");
  if (key === "billable")       return expenses.filter(e => e.billable);
  if (key === "nonbillable")    return expenses.filter(e => !e.billable);
  if (key === "subcontractor")  return expenses.filter(e => e.category === "Subcontractor Labour" || e.category === "Subcontractor Materials");
  return expenses.filter(e => e.status === key);
}

export default function ExpensesPage({ initialShowForm = false }) {
  const { expenses, setExpenses, orgSettings, user } = useContext(AppCtx);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isVat   = orgSettings?.vatReg === "Yes";
  const currSym = CUR_SYM[orgSettings?.currency || "GBP"] || "£";

  const [showForm,       setShowForm]       = useState(initialShowForm);
  const [editingExp,     setEditingExp]     = useState(null);
  const [activeFilter,   setActiveFilter]   = useState(searchParams.get("filter") || "all");
  const [search,         setSearch]         = useState("");
  const [billableFilter, setBillableFilter] = useState("All");

  const sortedFiltered = useMemo(() => {
    let result = filterExpenses(expenses, activeFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        (e.expense_number || "").toLowerCase().includes(q) ||
        (e.category || "").toLowerCase().includes(q) ||
        (e.vendor || "").toLowerCase().includes(q) ||
        (e.description || "").toLowerCase().includes(q) ||
        (e.customer?.name || "").toLowerCase().includes(q) ||
        (e.paid_through || "").toLowerCase().includes(q)
      );
    }
    if (billableFilter === "Billable")     result = result.filter(e => !!e.billable);
    if (billableFilter === "With Receipt") result = result.filter(e => !!e.receipt_url || !!e.receipt);
    return [...result].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [expenses, activeFilter, search, billableFilter]);

  const hasFilters       = search || activeFilter !== "all" || billableFilter !== "All";

  const { page, setPage, totalPages, paginatedItems, totalItems, pageSize } = usePagination(sortedFiltered, 25);
  const totalExpenses    = expenses.reduce((s, e) => s + Number(e.total || 0), 0);
  const billableCount    = expenses.filter(e => e.billable).length;
  const withReceiptCount = expenses.filter(e => !!e.receipt_url || !!e.receipt).length;
  const countFor = key  => filterExpenses(expenses, key).length;

  const onSave = exp => {
    setExpenses(prev => {
      const num  = exp.expense_number || expNextNum(prev);
      const item = { ...exp, expense_number: num };
      const idx  = prev.findIndex(x => x.id === item.id);
      if (idx >= 0) { const u = [...prev]; u[idx] = item; return u; }
      return [item, ...prev];
    });
    if (initialShowForm) { navigate(ROUTES.EXPENSES, { replace: true }); return; }
    setShowForm(false);
    setEditingExp(null);
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this expense?")) return;
    if (!user?.id) return alert("You must be logged in to delete.");
    const snapshot = expenses;
    setExpenses(prev => prev.filter(e => e.id !== id));
    const { error } = await deleteExpense(user.id, id);
    if (error) {
      console.error("[ExpensesPage] deleteExpense failed:", error);
      setExpenses(snapshot);
      alert("Failed to delete expense: " + (error.message || "Unknown error"));
      return;
    }
    // Fire-and-forget ledger reversal — never blocks the UI delete path
    ;(async () => {
      try {
        const { userId } = await fetchUserAccounts();
        if (!userId) return;
        const entry = await findEntryBySource('expense', id);
        if (entry) await reverseEntry(entry.id, userId);
      } catch (err) {
        console.error('[Ledger] expense reversal failed:', err);
      }
    })();
  };

  if (showForm) return (
    <ExpenseForm
      existing={editingExp}
      onClose={() => {
        if (initialShowForm) { navigate(ROUTES.EXPENSES, { replace: true }); return; }
        setShowForm(false); setEditingExp(null);
      }}
      onSave={onSave}
    />
  );

  const cols = ["Date", "Expense Account", "Reference #", "Paid Through", "Customer", "Status", "Amount", ""];

  return (
    <div style={moduleUi.pageCanvas}>
      <div style={{ ...moduleUi.page, maxWidth: 1320, fontFamily: ff }}>
        <div style={{ display: "flex", height: "100%" }}>

          {/* LEFT FILTER PANEL */}
          <div style={{ width: 200, flexShrink: 0, borderRight: "1px solid #e8e8ec", background: "#fff", padding: "14px 0", overflowY: "auto" }}>
            {FILTER_GROUPS.map(({ key, label }) => {
              if (!label) return <div key={key} style={{ height: 1, background: "#f0f0f4", margin: "8px 0" }} />;
              const cnt    = countFor(key);
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

          {/* MAIN CONTENT */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: "0 0 0 14px", gap: 12 }}>
            <ModuleHeader
              title="Expenses"
              helper={`${expenses.length} records · monitor spend, billables, and documentation.`}
              right={
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn variant="outline" icon={<Icons.Download />} onClick={() => exportCSV(sortedFiltered)}>Export CSV</Btn>
                  <Btn variant="primary" icon={<Icons.Plus />} onClick={() => { setEditingExp(null); setShowForm(true); }}>New Expense</Btn>
                </div>
              }
            />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginTop: 12, marginBottom: 10 }}>
              {[
                { label: "Total Expenses", value: fmt(currSym, totalExpenses), color: "#0f172a" },
                { label: "Billable",       value: billableCount,               color: "#1d4ed8" },
                { label: "With Receipt",   value: withReceiptCount,            color: "#0f766e" },
              ].map(card => (
                <div key={card.label} style={moduleUi.summaryCard}>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", fontWeight: 700 }}>{card.label}</div>
                  <div style={{ fontSize: 20, marginTop: 4, fontWeight: 800, color: card.color }}>{card.value}</div>
                </div>
              ))}
            </div>

            {/* search toolbar */}
            <div style={{ ...moduleUi.toolbar, marginTop: 10, marginBottom: 10 }}>
              <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Search expenses…" />
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <select value={billableFilter} onChange={e => setBillableFilter(e.target.value)} style={{ padding: "8px 10px", border: "1px solid #dbe4ee", borderRadius: 10, fontSize: 12, background: "#fff", fontFamily: ff }}>
                  {["All", "Billable", "With Receipt"].map(v => <option key={v}>{v}</option>)}
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
                  {paginatedItems.map(exp => (
                    <tr key={exp.id}
                      onClick={() => { setEditingExp(exp); setShowForm(true); }}
                      style={{ borderBottom: "1px solid #f3f4f6", cursor: "pointer" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                      onMouseLeave={e => e.currentTarget.style.background = ""}>
                      <td style={{ padding: "11px 16px", fontSize: 13, color: "#374151", whiteSpace: "nowrap" }}>
                        {fmtDate(exp.date)}
                      </td>
                      <td style={{ padding: "11px 16px", fontSize: 13, color: "#1a1a2e", fontWeight: 500 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {exp.expense_type === "mileage" && (
                            <span style={{ fontSize: 11, color: "#0891b2", background: "#ecfeff", padding: "1px 6px", borderRadius: 10, fontWeight: 700 }}>Mileage</span>
                          )}
                          <span>{exp.category || <span style={{ color: "#c4c4c4" }}>—</span>}</span>
                          {exp.is_cis_expense && (
                            <span style={{ marginLeft: 4, fontSize: 10, fontWeight: 700, color: "#92400e", background: "#fef3c7", borderRadius: 4, padding: "1px 5px" }}>CIS</span>
                          )}
                        </div>
                        {exp.expense_type === "mileage" && exp.mileage_km > 0 && (
                          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>{exp.mileage_km} km · {exp.mileage_from} → {exp.mileage_to}</div>
                        )}
                        {exp.expense_type !== "mileage" && exp.vendor && (
                          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{exp.vendor}</div>
                        )}
                      </td>
                      <td style={{ padding: "11px 16px", fontSize: 13, color: "#1e6be0", fontWeight: 600, whiteSpace: "nowrap" }}>
                        {exp.expense_number}
                      </td>
                      <td style={{ padding: "11px 16px", fontSize: 13, color: "#6b7280" }}>
                        {exp.paid_through || "—"}
                      </td>
                      <td style={{ padding: "11px 16px", fontSize: 13, color: exp.billable && exp.customer ? "#059669" : "#9ca3af", fontWeight: exp.billable && exp.customer ? 600 : 400 }}>
                        {exp.billable && exp.customer ? exp.customer.name : exp.billable ? <span style={{ color: "#d97706", fontWeight: 600 }}>Billable</span> : "—"}
                      </td>
                      <td style={{ padding: "11px 16px" }}>
                        <StatusBadge status={exp.status} />
                      </td>
                      <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 600, color: "#1a1a2e", textAlign: "right", whiteSpace: "nowrap" }}>
                        {fmt(currSym, exp.total)}
                        {isVat && exp.tax_amount > 0 && (
                          <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 400 }}>incl. {fmt(currSym, exp.tax_amount)} VAT</div>
                        )}
                      </td>
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
                    <tr><td colSpan={8}><EmptyState icon={<Icons.Expenses />}
                      text={expenses.length === 0 ? "No expenses yet. Record your first expense to start tracking spend." : "No expenses match your current search or filters."}
                      cta={expenses.length === 0
                        ? <Btn variant="primary" onClick={() => { setEditingExp(null); setShowForm(true); }}>New Expense</Btn>
                        : <Btn variant="outline" onClick={() => { setSearch(""); setActiveFilter("all"); setBillableFilter("All"); }}>Clear filters</Btn>}
                    /></td></tr>
                  )}
                </tbody>
              </table>
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={totalItems} pageSize={pageSize} />
            </div>
          </div>

          <style>{`tr:hover .row-actions { opacity: 1 !important; }`}</style>
        </div>
      </div>
    </div>
  );
}
