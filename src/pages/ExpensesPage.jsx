import { useState, useContext, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ROUTES } from "../router/routes";
import { CUR_SYM, EXPENSE_STATUSES } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Btn, StatusBadge } from "../components/atoms";
import { fmt, fmtDate, todayStr, nextNum } from "../utils/helpers";
import ExpenseForm from "../components/expenses/ExpenseForm";
import { deleteExpense } from "../lib/dataAccess";
import { reverseEntry, findEntryBySource } from "../utils/ledger/ledgerService";
import { fetchUserAccounts } from "../utils/ledger/fetchUserAccounts";
import { usePagination } from "../hooks/usePagination";
import Pagination from "../components/shared/Pagination";
import { useToast } from "../components/ui/Toast";
import EmptyState from "../components/ui/EmptyState";
import { ListSkeleton } from "../components/ui/Skeleton";

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

function Th({ children, align = "left" }) {
  const alignCls = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <th className={`py-2.5 px-4 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider whitespace-nowrap ${alignCls}`}>
      {children}
    </th>
  );
}

function ActionBtn({ onClick, title, icon, tone = "neutral" }) {
  const toneCls = tone === "danger"
    ? "hover:border-[var(--danger-100)] hover:text-[var(--danger-600)]"
    : "hover:border-[var(--brand-600)] hover:text-[var(--brand-600)]";
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex items-center justify-center bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] p-1.5 cursor-pointer text-[var(--text-tertiary)] transition-colors duration-150 ${toneCls}`}
    >
      {icon}
    </button>
  );
}

function SummaryCard({ label, value, tone = "neutral" }) {
  const toneCls = {
    info:    "text-[var(--info-600)]",
    success: "text-[var(--success-600)]",
    warning: "text-[var(--warning-600)]",
    brand:   "text-[var(--brand-700)]",
    neutral: "text-[var(--text-primary)]",
  }[tone] || "text-[var(--text-primary)]";
  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-4">
      <div className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-lg font-semibold tabular-nums leading-tight ${toneCls}`}>{value}</div>
    </div>
  );
}


export default function ExpensesPage({ initialShowForm = false }) {
  const { expenses, setExpenses, orgSettings, user, businessDataHydrated } = useContext(AppCtx);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
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

  const hasFilters = search || activeFilter !== "all" || billableFilter !== "All";

  const { page, setPage, totalPages, paginatedItems, totalItems, pageSize } = usePagination(sortedFiltered, 25);
  const totalExpenses    = expenses.reduce((s, e) => s + Number(e.total || 0), 0);
  const billableCount    = expenses.filter(e => e.billable).length;
  const withReceiptCount = expenses.filter(e => !!e.receipt_url || !!e.receipt).length;
  const countFor = key => filterExpenses(expenses, key).length;

  const onSave = exp => {
    setExpenses(prev => {
      const num  = exp.expense_number || expNextNum(prev);
      const item = { ...exp, expense_number: num };
      const idx  = prev.findIndex(x => x.id === item.id);
      if (idx >= 0) { const u = [...prev]; u[idx] = item; return u; }
      return [item, ...prev];
    });
    toast({ title: "Expense saved", variant: "success" });
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
      toast({ title: "Failed to delete expense", description: error.message, variant: "danger" });
      return;
    }
    toast({ title: "Expense deleted", variant: "success" });
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

  if (!businessDataHydrated) return <ListSkeleton />;

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

  return (
    <div className="bg-[var(--surface-page)] min-h-screen">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-3 mb-5 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)] m-0">Expenses</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1 m-0">
              {expenses.length} record{expenses.length !== 1 ? "s" : ""} · monitor spend, billables, and documentation
            </p>
          </div>
          <div className="flex gap-2">
            <Btn variant="outline" icon={<Icons.Download />} onClick={() => exportCSV(sortedFiltered)}>Export CSV</Btn>
            <Btn variant="primary" icon={<Icons.Plus />} onClick={() => { setEditingExp(null); setShowForm(true); }}>New expense</Btn>
          </div>
        </div>

        {/* Summary strip */}
        {expenses.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <SummaryCard label="Total Expenses" value={fmt(currSym, totalExpenses)} tone="neutral" />
            <SummaryCard label="Billable"       value={String(billableCount)}       tone="info" />
            <SummaryCard label="With Receipt"   value={String(withReceiptCount)}    tone="success" />
          </div>
        )}

        <div className="flex gap-4">
          {/* Left filter panel */}
          <div className="hidden lg:block w-[200px] flex-shrink-0 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] py-3 h-fit">
            {FILTER_GROUPS.map(({ key, label }) => {
              if (!label) return <div key={key} className="h-px bg-[var(--border-subtle)] my-2" />;
              const cnt    = countFor(key);
              const active = activeFilter === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveFilter(key)}
                  className={[
                    "flex items-center justify-between w-full text-left px-4 py-1.5 bg-transparent border-none border-l-[3px] cursor-pointer text-sm transition-colors duration-150",
                    active
                      ? "border-l-[var(--brand-600)] text-[var(--brand-700)] font-semibold bg-[var(--brand-50)]"
                      : "border-l-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]",
                  ].join(" ")}
                >
                  <span>{label}</span>
                  {cnt > 0 && (
                    <span className={`text-[11px] font-semibold min-w-[18px] text-right ${active ? "text-[var(--brand-700)]" : "text-[var(--text-tertiary)]"}`}>
                      {cnt}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Main area */}
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] overflow-hidden">
              {/* Toolbar */}
              <div className="p-3 flex items-center gap-2 flex-wrap border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2 flex-1 min-w-[160px] h-9 px-3 bg-[var(--surface-sunken)] border border-[var(--border-subtle)] rounded-[var(--radius-md)]">
                  <span className="text-[var(--text-tertiary)] flex flex-shrink-0"><Icons.Search /></span>
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search expenses…"
                    className="flex-1 min-w-0 border-none outline-none bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                  />
                  {search && (
                    <button onClick={() => setSearch("")} title="Clear" className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] bg-transparent border-none cursor-pointer flex flex-shrink-0 p-0">
                      <Icons.X />
                    </button>
                  )}
                </div>
                <select
                  value={billableFilter}
                  onChange={e => setBillableFilter(e.target.value)}
                  className="h-9 px-3 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm bg-[var(--surface-card)] text-[var(--text-primary)] cursor-pointer outline-none focus:border-[var(--brand-600)]"
                >
                  {["All", "Billable", "With Receipt"].map(v => <option key={v}>{v}</option>)}
                </select>
                {hasFilters && (
                  <button
                    onClick={() => { setSearch(""); setActiveFilter("all"); setBillableFilter("All"); }}
                    className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer px-2 py-1 whitespace-nowrap transition-colors duration-150"
                  >
                    Clear
                  </button>
                )}
                <span className="text-xs text-[var(--text-tertiary)] ml-auto">
                  {sortedFiltered.length} record{sortedFiltered.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[720px]">
                  <thead>
                    <tr className="bg-[var(--surface-sunken)] border-b border-[var(--border-subtle)]">
                      <Th>Date</Th>
                      <Th>Expense Account</Th>
                      <Th>Reference #</Th>
                      <Th>Paid Through</Th>
                      <Th>Customer</Th>
                      <Th>Status</Th>
                      <Th align="right">Amount</Th>
                      <Th align="right" />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedFiltered.length === 0 ? (
                      <tr>
                        <td colSpan={8}>
                          {expenses.length === 0 ? (
                            <EmptyState
                              icon={Icons.Expenses}
                              title="No expenses yet"
                              description="Record your first expense to start tracking spend"
                              action={{ label: "New expense", onClick: () => { setEditingExp(null); setShowForm(true); }, icon: <Icons.Plus /> }}
                            />
                          ) : (
                            <EmptyState
                              icon={Icons.Search}
                              title="No expenses match your filters"
                              action={{ label: "Clear filters", onClick: () => { setSearch(""); setActiveFilter("all"); setBillableFilter("All"); }, variant: "outline" }}
                            />
                          )}
                        </td>
                      </tr>
                    ) : paginatedItems.map(exp => (
                      <tr
                        key={exp.id}
                        onClick={() => { setEditingExp(exp); setShowForm(true); }}
                        className="border-b border-[var(--border-subtle)] last:border-0 cursor-pointer hover:bg-[var(--surface-sunken)] transition-colors duration-150"
                      >
                        <td className="py-3 px-4 text-sm text-[var(--text-secondary)] whitespace-nowrap">{fmtDate(exp.date)}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {exp.expense_type === "mileage" && (
                              <span className="text-[11px] font-semibold text-[var(--info-700)] bg-[var(--info-50)] px-2 py-0.5 rounded-full">Mileage</span>
                            )}
                            <span className="text-sm text-[var(--text-primary)] font-medium">
                              {exp.category || <span className="text-[var(--text-tertiary)]">—</span>}
                            </span>
                            {exp.is_cis_expense && (
                              <span className="text-[10px] font-semibold text-[var(--warning-700)] bg-[var(--warning-50)] px-1.5 py-0.5 rounded">CIS</span>
                            )}
                          </div>
                          {exp.expense_type === "mileage" && exp.mileage_km > 0 && (
                            <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                              {exp.mileage_km} km · {exp.mileage_from} → {exp.mileage_to}
                            </div>
                          )}
                          {exp.expense_type !== "mileage" && exp.vendor && (
                            <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5 truncate max-w-[200px]">{exp.vendor}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-[var(--brand-600)] whitespace-nowrap">{exp.expense_number}</td>
                        <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">{exp.paid_through || "—"}</td>
                        <td className="py-3 px-4 text-sm">
                          {exp.billable && exp.customer ? (
                            <span className="text-[var(--success-700)] font-medium">{exp.customer.name}</span>
                          ) : exp.billable ? (
                            <span className="text-[var(--warning-700)] font-medium">Billable</span>
                          ) : (
                            <span className="text-[var(--text-tertiary)]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4"><StatusBadge status={exp.status} /></td>
                        <td className="py-3 px-4 text-right whitespace-nowrap tabular-nums">
                          <div className="text-sm font-medium text-[var(--text-primary)]">{fmt(currSym, exp.total)}</div>
                          {isVat && exp.tax_amount > 0 && (
                            <div className="text-[11px] text-[var(--text-tertiary)]">incl. {fmt(currSym, exp.tax_amount)} VAT</div>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap" onClick={ev => ev.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <ActionBtn onClick={() => { setEditingExp(exp); setShowForm(true); }} title="Edit expense" icon={<Icons.Edit />} />
                            <ActionBtn onClick={() => onDelete(exp.id)} title="Delete expense" icon={<Icons.Trash />} tone="danger" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {sortedFiltered.length > 0 && totalPages > 1 && (
                <div className="px-4 border-t border-[var(--border-subtle)]">
                  <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={totalItems} pageSize={pageSize} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
