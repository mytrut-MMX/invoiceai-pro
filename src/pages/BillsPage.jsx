import { useState, useContext, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../router/routes";
import { CUR_SYM, BILL_STATUSES } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Btn, StatusBadge } from "../components/atoms";
import { fmt, fmtDate, todayStr } from "../utils/helpers";
import BillFormPanel from "../components/bills/BillFormPanel";
import SelfBillFormPanel from "../components/bills/SelfBillFormPanel";
import BillModeSelector, { BILL_MODES } from "../components/bills/BillModeSelector";
import RecordBillPaymentModal from "../components/bills/RecordBillPaymentModal";
import { deleteBill, saveBill } from "../lib/dataAccess";
import { supabase } from "../lib/supabase";
import { reverseEntry, findEntryBySource } from "../utils/ledger/ledgerService";
import { fetchUserAccounts } from "../utils/ledger/fetchUserAccounts";
import { postBillEntry } from "../utils/ledger/postBillEntry";
import { usePagination } from "../hooks/usePagination";
import { useCISSettings } from "../hooks/useCISSettings";
import Pagination from "../components/shared/Pagination";
import { useToast } from "../components/ui/Toast";
import EmptyState from "../components/ui/EmptyState";
import { ListSkeleton } from "../components/ui/Skeleton";

const FILTER_OPTS = [{ key: "all", label: "All Bills" }, ...BILL_STATUSES.map(s => ({ key: s, label: s }))];

function currentCISTaxYearStart() {
  const today = new Date();
  const year = today.getMonth() < 3 || (today.getMonth() === 3 && today.getDate() < 6)
    ? today.getFullYear() - 1
    : today.getFullYear();
  return `${year}-04-06`;
}

function filterBills(bills, key) {
  if (key === "all") return bills;
  return bills.filter(b => b.status === key);
}

function Th({ children, align = "left" }) {
  const alignCls = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <th className={`py-2.5 px-4 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider whitespace-nowrap ${alignCls}`}>
      {children}
    </th>
  );
}

function ActionBtn({ onClick, title, icon, tone = "neutral", children }) {
  const toneCls = tone === "danger"
    ? "hover:border-[var(--danger-100)] hover:text-[var(--danger-600)]"
    : "hover:border-[var(--brand-600)] hover:text-[var(--brand-600)]";
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex items-center justify-center gap-1 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] px-2 py-1.5 cursor-pointer text-xs text-[var(--text-tertiary)] transition-colors duration-150 ${toneCls}`}
    >
      {icon}
      {children}
    </button>
  );
}

function SummaryCard({ label, value, tone = "neutral" }) {
  const toneCls = {
    info:    "text-[var(--info-600)]",
    danger:  "text-[var(--danger-600)]",
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


export default function BillsPage({ initialShowForm = false }) {
  const { bills, setBills, orgSettings, user, businessDataHydrated } = useContext(AppCtx);
  const { cisEnabled } = useCISSettings();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isVat   = orgSettings?.vatReg === "Yes";
  const currSym = CUR_SYM[orgSettings?.currency || "GBP"] || "£";

  const [showForm,     setShowForm]     = useState(initialShowForm);
  const [editingBill,  setEditingBill]  = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [search,       setSearch]       = useState("");
  const [cisFilter,    setCisFilter]    = useState("all");
  const [paymentModalBill, setPaymentModalBill] = useState(null);
  const [billMode, setBillMode] = useState(() => {
    // Honour ?mode=selfbill in the URL so deep links can land on the self-bill flow.
    if (typeof window === "undefined") return BILL_MODES.STANDARD;
    const q = new URLSearchParams(window.location.search).get("mode");
    return q === "selfbill" ? BILL_MODES.SELFBILL : BILL_MODES.STANDARD;
  });
  const [hasActiveIssuedSba, setHasActiveIssuedSba] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) { setHasActiveIssuedSba(false); return; }
      const today = new Date().toISOString().slice(0, 10);
      const { count } = await supabase.from("self_billing_agreements")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id).eq("direction", "issued")
        .eq("status", "active").gt("end_date", today);
      if (!cancelled) setHasActiveIssuedSba((count || 0) > 0);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    const today = todayStr();
    setBills(prev => {
      const updated = prev.map(b =>
        b.status === "Approved" && b.due_date && b.due_date < today
          ? { ...b, status: "Overdue" } : b
      );
      return updated.some((b, i) => b !== prev[i]) ? updated : prev;
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sorted = useMemo(() => {
    let result = filterBills(bills, activeFilter);
    if (cisEnabled && cisFilter !== "all") {
      result = cisFilter === "cis_only"
        ? result.filter(b => Number(b.cis_deduction || 0) > 0)
        : result.filter(b => !(Number(b.cis_deduction || 0) > 0));
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(b =>
        (b.supplier_name || "").toLowerCase().includes(q) ||
        (b.bill_number || "").toLowerCase().includes(q) ||
        (b.category || "").toLowerCase().includes(q) ||
        (b.description || "").toLowerCase().includes(q) ||
        (b.reference || "").toLowerCase().includes(q)
      );
    }
    return [...result].sort((a, b) => new Date(b.bill_date) - new Date(a.bill_date));
  }, [bills, activeFilter, search, cisFilter, cisEnabled]);

  const today = todayStr();
  const weekEnd = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split("T")[0]; })();
  const totalAll   = bills.reduce((s, b) => s + Number(b.total || b.amount || 0), 0);
  const overdueAmt = bills.filter(b => b.status === "Overdue").reduce((s, b) => s + Number(b.total || b.amount || 0), 0);
  const dueWeekAmt = bills.filter(b => b.status !== "Paid" && b.status !== "Void" && b.due_date >= today && b.due_date <= weekEnd)
    .reduce((s, b) => s + Number(b.total || b.amount || 0), 0);
  const paidAmt    = bills.filter(b => b.status === "Paid").reduce((s, b) => s + Number(b.total || b.amount || 0), 0);
  const cisYearStart = currentCISTaxYearStart();
  const cisYtdAmt = bills
    .filter(b => b.status === "Paid" && b.paid_date >= cisYearStart && Number(b.cis_deduction || 0) > 0)
    .reduce((s, b) => s + Number(b.cis_deduction || 0), 0);

  const hasFilters = search || activeFilter !== "all" || (cisEnabled && cisFilter !== "all");
  const { page, setPage, totalPages, paginatedItems, totalItems, pageSize } = usePagination(sorted, 25);

  const onSave = bill => {
    setBills(prev => {
      const idx = prev.findIndex(x => x.id === bill.id);
      if (idx >= 0) { const u = [...prev]; u[idx] = bill; return u; }
      return [bill, ...prev];
    });
    toast({ title: "Bill saved", variant: "success" });
    if (initialShowForm) { navigate(ROUTES.BILLS, { replace: true }); return; }
    setShowForm(false);
    setEditingBill(null);
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this bill?")) return;
    if (!user?.id) return alert("You must be logged in to delete.");
    const snapshot = bills;
    setBills(prev => prev.filter(b => b.id !== id));
    const { error } = await deleteBill(user.id, id);
    if (error) {
      console.error("[BillsPage] deleteBill failed:", error);
      setBills(snapshot);
      toast({ title: "Failed to delete bill", description: error.message, variant: "danger" });
      return;
    }
    toast({ title: "Bill deleted", variant: "success" });
    ;(async () => {
      try {
        const { userId } = await fetchUserAccounts();
        if (!userId) return;
        const billEntry = await findEntryBySource('bill', id);
        if (billEntry) await reverseEntry(billEntry.id, userId);
        const { data: paymentEntries } = await supabase
          .from('journal_entries')
          .select('id')
          .eq('source_type', 'bill_payment')
          .like('source_id', `${id}:%`);
        for (const pe of paymentEntries || []) {
          await reverseEntry(pe.id, userId);
        }
      } catch (err) {
        console.error('[Ledger] bill reversal failed:', err);
      }
    })();
  };

  const handleApprove = (bill) => {
    const updated = { ...bill, status: 'Approved' };
    setBills(prev => prev.map(b => b.id === bill.id ? updated : b));
    if (user?.id) {
      ;(async () => {
        const { error } = await saveBill(user.id, updated);
        if (error) {
          toast({ title: "Failed to approve bill", description: error.message, variant: "danger" });
          setBills(prev => prev.map(b => b.id === bill.id ? bill : b));
          return;
        }
        toast({ title: "Bill approved", variant: "success" });
        try {
          const { accounts, userId } = await fetchUserAccounts();
          if (!userId) return;
          await postBillEntry(updated, null, accounts, userId);
        } catch (err) {
          console.error('[Ledger] approve post failed:', err);
        }
      })();
    }
  };

  const handlePaymentRecorded = ({ paymentAmount, paidDate }) => {
    const bill = paymentModalBill;
    if (!bill) return;
    const prevPaid    = Number(bill.paid_amount || 0);
    const newPaidAmt  = Math.round((prevPaid + Number(paymentAmount)) * 100) / 100;
    const outstanding = Math.round((Number(bill.total || 0) - Number(bill.cis_deduction || 0)) * 100) / 100;
    const newStatus   = newPaidAmt + 0.005 >= outstanding ? "Paid"
                      : newPaidAmt > 0                    ? "Partially Paid"
                      : bill.status;
    const updated = { ...bill, paid_amount: newPaidAmt, paid_date: paidDate, status: newStatus };
    setBills(prev => prev.map(b => (b.id === bill.id ? updated : b)));
    setPaymentModalBill(null);
    if (user?.id) {
      ;(async () => {
        const { error } = await saveBill(user.id, updated);
        if (error) {
          toast({ title: "Failed to record payment", description: error.message, variant: "danger" });
          setBills(prev => prev.map(b => b.id === bill.id ? bill : b));
          return;
        }
        toast({ title: "Payment recorded", variant: "success" });
      })();
    }
  };

  if (!businessDataHydrated) return <ListSkeleton />;

  if (showForm) {
    const closeForm = () => {
      if (initialShowForm) { navigate(ROUTES.BILLS, { replace: true }); return; }
      setShowForm(false); setEditingBill(null);
    };
    // Route to the self-bill panel when either (a) the user explicitly picked
    // Self-Billed mode for a new bill, or (b) they opened an existing bill row
    // that was originally issued as a self-bill (read-only for now — Phase 4.2
    // will add an editable self-bill detail view).
    const useSelfBill = (!editingBill && billMode === BILL_MODES.SELFBILL) || editingBill?.is_self_billed;
    return useSelfBill
      ? <SelfBillFormPanel existing={editingBill} onClose={closeForm} onSave={onSave} />
      : <BillFormPanel existing={editingBill} onClose={closeForm} onSave={onSave} />;
  }

  const summaryItems = [
    { label: "Total Bills",     value: fmt(currSym, totalAll),   tone: "neutral" },
    { label: "Overdue",         value: fmt(currSym, overdueAmt), tone: "danger" },
    { label: "Due This Week",   value: fmt(currSym, dueWeekAmt), tone: "warning" },
    { label: "Paid",            value: fmt(currSym, paidAmt),    tone: "success" },
    ...(cisEnabled ? [{ label: "CIS Deducted (YTD)", value: fmt(currSym, cisYtdAmt), tone: "brand" }] : []),
  ];

  return (
    <div className="bg-[var(--surface-page)] min-h-screen">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-3 mb-5 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)] m-0">Bills</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1 m-0">
              {bills.length} record{bills.length !== 1 ? "s" : ""} · track supplier invoices and accounts payable
            </p>
          </div>
          <Btn variant="primary" icon={<Icons.Plus />} onClick={() => { setEditingBill(null); setShowForm(true); }}>
            {billMode === BILL_MODES.SELFBILL ? "New self-bill" : "New bill"}
          </Btn>
        </div>

        <BillModeSelector mode={billMode} onChange={setBillMode} hasActiveIssuedSba={hasActiveIssuedSba} />

        {/* Summary strip */}
        {bills.length > 0 && (
          <div className={`grid grid-cols-2 ${cisEnabled ? "sm:grid-cols-5" : "sm:grid-cols-4"} gap-3 mb-4`}>
            {summaryItems.map(c => (
              <SummaryCard key={c.label} label={c.label} value={c.value} tone={c.tone} />
            ))}
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
                placeholder="Search bills…"
                className="flex-1 min-w-0 border-none outline-none bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  title="Clear"
                  className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] bg-transparent border-none cursor-pointer flex flex-shrink-0 p-0"
                >
                  <Icons.X />
                </button>
              )}
            </div>
            <select
              value={activeFilter}
              onChange={e => setActiveFilter(e.target.value)}
              className="h-9 px-3 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm bg-[var(--surface-card)] text-[var(--text-primary)] cursor-pointer outline-none focus:border-[var(--brand-600)]"
            >
              {FILTER_OPTS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
            {cisEnabled && (
              <select
                value={cisFilter}
                onChange={e => setCisFilter(e.target.value)}
                className="h-9 px-3 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm bg-[var(--surface-card)] text-[var(--text-primary)] cursor-pointer outline-none focus:border-[var(--brand-600)]"
              >
                <option value="all">All (CIS + non-CIS)</option>
                <option value="cis_only">CIS Only</option>
                <option value="non_cis">Non-CIS Only</option>
              </select>
            )}
            {hasFilters && (
              <button
                onClick={() => { setSearch(""); setActiveFilter("all"); setCisFilter("all"); }}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer px-2 py-1 rounded whitespace-nowrap transition-colors duration-150"
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
                  <Th>Date</Th>
                  <Th>Supplier</Th>
                  <Th>Bill #</Th>
                  <Th>Category</Th>
                  {cisEnabled && <Th align="right">CIS</Th>}
                  <Th>Due Date</Th>
                  <Th>Status</Th>
                  <Th align="right">Amount</Th>
                  <Th align="right" />
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={cisEnabled ? 9 : 8}>
                      {bills.length === 0 ? (
                        <EmptyState
                          icon={Icons.Receipt}
                          title="No bills yet"
                          description="Record your first supplier invoice to start tracking payables"
                          action={{ label: "New bill", onClick: () => { setEditingBill(null); setShowForm(true); }, icon: <Icons.Plus /> }}
                        />
                      ) : (
                        <EmptyState
                          icon={Icons.Search}
                          title="No bills match your filters"
                          action={{ label: "Clear filters", onClick: () => { setSearch(""); setActiveFilter("all"); setCisFilter("all"); }, variant: "outline" }}
                        />
                      )}
                    </td>
                  </tr>
                ) : paginatedItems.map(bill => {
                  const isOverdue = bill.due_date < today && bill.status !== "Paid" && bill.status !== "Void";
                  return (
                    <tr
                      key={bill.id}
                      onClick={() => { setEditingBill(bill); setShowForm(true); }}
                      className="border-b border-[var(--border-subtle)] last:border-0 cursor-pointer hover:bg-[var(--surface-sunken)] transition-colors duration-150"
                    >
                      <td className="py-3 px-4 text-sm text-[var(--text-secondary)] whitespace-nowrap">{fmtDate(bill.bill_date)}</td>
                      <td className="py-3 px-4 text-sm text-[var(--text-primary)] font-medium">{bill.supplier_name || "—"}</td>
                      <td className="py-3 px-4 text-sm font-medium text-[var(--brand-600)] whitespace-nowrap">{bill.bill_number || "—"}</td>
                      <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">{bill.category || "—"}</td>
                      {cisEnabled && (
                        <td className="py-3 px-4 text-sm text-right tabular-nums whitespace-nowrap">
                          {Number(bill.cis_deduction || 0) > 0 ? (
                            <span className="text-[var(--brand-700)] font-medium">{fmt(currSym, bill.cis_deduction)}</span>
                          ) : (
                            <span className="text-[var(--text-tertiary)]">—</span>
                          )}
                        </td>
                      )}
                      <td className={`py-3 px-4 text-sm whitespace-nowrap ${isOverdue ? "text-[var(--danger-600)] font-medium" : "text-[var(--text-secondary)]"}`}>
                        {fmtDate(bill.due_date)}
                      </td>
                      <td className="py-3 px-4"><StatusBadge status={bill.status} /></td>
                      <td className="py-3 px-4 text-right whitespace-nowrap tabular-nums">
                        <div className="text-sm font-medium text-[var(--text-primary)]">{fmt(currSym, bill.total || bill.amount || 0)}</div>
                        {isVat && bill.tax_amount > 0 && (
                          <div className="text-[11px] text-[var(--text-tertiary)]">incl. {fmt(currSym, bill.tax_amount)} VAT</div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap" onClick={ev => ev.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {bill.status === "Draft" && (
                            <ActionBtn onClick={() => handleApprove(bill)} title="Approve bill">Approve</ActionBtn>
                          )}
                          <ActionBtn onClick={() => { setEditingBill(bill); setShowForm(true); }} title="Edit bill" icon={<Icons.Edit />} />
                          {bill.status !== "Paid" && bill.status !== "Void" && bill.status !== "Draft" && (
                            <ActionBtn onClick={() => setPaymentModalBill(bill)} title="Record payment">Pay</ActionBtn>
                          )}
                          <ActionBtn onClick={() => onDelete(bill.id)} title="Delete bill" icon={<Icons.Trash />} tone="danger" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {sorted.length > 0 && totalPages > 1 && (
            <div className="px-4 border-t border-[var(--border-subtle)]">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={totalItems} pageSize={pageSize} />
            </div>
          )}

          {sorted.length > 0 && (
            <div className="border-t border-[var(--border-subtle)] px-4 py-2 text-xs text-[var(--text-tertiary)] text-right">
              {hasFilters ? `${sorted.length} of ${bills.length}` : bills.length} record{bills.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>

      {paymentModalBill && (
        <RecordBillPaymentModal
          open={true}
          bill={paymentModalBill}
          onClose={() => setPaymentModalBill(null)}
          onPaymentRecorded={handlePaymentRecorded}
        />
      )}
    </div>
  );
}
