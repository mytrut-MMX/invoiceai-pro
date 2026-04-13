import { useState, useContext, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../router/routes";
import { ff, CUR_SYM, BILL_STATUSES } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Btn } from "../components/atoms";
import { moduleUi, EmptyState, ModuleHeader, SearchInput, StatusBadge } from "../components/shared/moduleListUI";
import { fmt, fmtDate, todayStr } from "../utils/helpers";
import BillFormPanel from "../components/bills/BillFormPanel";
import { deleteBill } from "../lib/dataAccess";
import { supabase } from "../lib/supabase";
import { reverseEntry, findEntryBySource } from "../utils/ledger/ledgerService";
import { fetchUserAccounts } from "../utils/ledger/fetchUserAccounts";
import { usePagination } from "../hooks/usePagination";
import { useCISSettings } from "../hooks/useCISSettings";
import Pagination from "../components/shared/Pagination";

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

export default function BillsPage({ initialShowForm = false }) {
  const { bills, setBills, orgSettings, user } = useContext(AppCtx);
  const { cisEnabled } = useCISSettings();
  const navigate = useNavigate();
  const isVat   = orgSettings?.vatReg === "Yes";
  const currSym = CUR_SYM[orgSettings?.currency || "GBP"] || "£";

  const [showForm,     setShowForm]     = useState(initialShowForm);
  const [editingBill,  setEditingBill]  = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [search,       setSearch]       = useState("");
  const [cisFilter,    setCisFilter]    = useState("all");

  // ─── Auto-mark overdue ─────────────────────────────────────────────────────
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

  // ─── Filtered + searched list ──────────────────────────────────────────────
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

  // ─── Stats ─────────────────────────────────────────────────────────────────
  const today = todayStr();
  const weekEnd = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split("T")[0]; })();
  const totalAll   = bills.reduce((s, b) => s + Number(b.total || b.amount || 0), 0);
  const overdueAmt = bills.filter(b => b.status === "Overdue").reduce((s, b) => s + Number(b.total || b.amount || 0), 0);
  const dueWeekAmt = bills.filter(b => b.status !== "Paid" && b.status !== "Void" && b.due_date >= today && b.due_date <= weekEnd)
    .reduce((s, b) => s + Number(b.total || b.amount || 0), 0);
  const paidAmt    = bills.filter(b => b.status === "Paid").reduce((s, b) => s + Number(b.total || b.amount || 0), 0);
  const cisYearStart = currentCISTaxYearStart();
  const cisYtdAmt = bills
    .filter(b => b.bill_date >= cisYearStart && Number(b.cis_deduction || 0) > 0)
    .reduce((s, b) => s + Number(b.cis_deduction || 0), 0);

  const hasFilters = search || activeFilter !== "all" || (cisEnabled && cisFilter !== "all");

  const { page, setPage, totalPages, paginatedItems, totalItems, pageSize } = usePagination(sorted, 25);

  // ─── CRUD ──────────────────────────────────────────────────────────────────
  const onSave = bill => {
    setBills(prev => {
      const idx = prev.findIndex(x => x.id === bill.id);
      if (idx >= 0) { const u = [...prev]; u[idx] = bill; return u; }
      return [bill, ...prev];
    });
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
      alert("Failed to delete bill: " + (error.message || "Unknown error"));
      return;
    }
    // Fire-and-forget ledger reversal — never blocks the UI delete path
    ;(async () => {
      try {
        const { userId } = await fetchUserAccounts();
        if (!userId) return;
        const billEntry = await findEntryBySource('bill', id);
        if (billEntry) await reverseEntry(billEntry.id, userId);
        // Payment entries use composite source_id: `${billId}:${date}:${amount}`
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
  // ─── Form mode ─────────────────────────────────────────────────────────────
  if (showForm) return (
    <BillFormPanel
      existing={editingBill}
      onClose={() => {
        if (initialShowForm) { navigate(ROUTES.BILLS, { replace: true }); return; }
        setShowForm(false); setEditingBill(null);
      }}
      onSave={onSave}
    />
  );

  // ─── Render ────────────────────────────────────────────────────────────────
  const cols = cisEnabled
    ? ["Date", "Supplier", "Bill #", "Category", "CIS", "Due Date", "Status", "Amount", ""]
    : ["Date", "Supplier", "Bill #", "Category", "Due Date", "Status", "Amount", ""];

  return (
    <div style={moduleUi.pageCanvas}>
      <div style={{ ...moduleUi.page, maxWidth: 1320, fontFamily: ff }}>
        <ModuleHeader
          title="Bills"
          helper={`${bills.length} record${bills.length !== 1 ? "s" : ""} · track supplier invoices and accounts payable.`}
          right={<Btn variant="primary" icon={<Icons.Plus />} onClick={() => { setEditingBill(null); setShowForm(true); }}>New Bill</Btn>}
        />

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginTop: 16, marginBottom: 10 }}>
          {[
            { label: "Total Bills", value: fmt(currSym, totalAll),   color: "#0f172a" },
            { label: "Overdue",     value: fmt(currSym, overdueAmt), color: "#dc2626" },
            { label: "Due This Week", value: fmt(currSym, dueWeekAmt), color: "#d97706" },
            { label: "Paid",        value: fmt(currSym, paidAmt),    color: "#059669" },
            ...(cisEnabled ? [{ label: "CIS Deducted (YTD)", value: fmt(currSym, cisYtdAmt), color: "#7c3aed" }] : []),
          ].map(c => (
            <div key={c.label} style={moduleUi.summaryCard}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", fontWeight: 700 }}>{c.label}</div>
              <div style={{ fontSize: 20, marginTop: 4, fontWeight: 800, color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{ ...moduleUi.toolbar, marginTop: 10, marginBottom: 10 }}>
          <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Search bills…" />
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <select value={activeFilter} onChange={e => setActiveFilter(e.target.value)}
              style={{ padding: "8px 10px", border: "1px solid #dbe4ee", borderRadius: 10, fontSize: 12, background: "#fff", fontFamily: ff }}>
              {FILTER_OPTS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
            {cisEnabled && (
              <select value={cisFilter} onChange={e => setCisFilter(e.target.value)}
                style={{ padding: "8px 10px", border: "1px solid #dbe4ee", borderRadius: 10, fontSize: 12, background: "#fff", fontFamily: ff }}>
                <option value="all">All (CIS + non-CIS)</option>
                <option value="cis_only">CIS Only</option>
                <option value="non_cis">Non-CIS Only</option>
              </select>
            )}
            {hasFilters && <Btn variant="ghost" size="sm" onClick={() => { setSearch(""); setActiveFilter("all"); setCisFilter("all"); }}>Clear filters</Btn>}
            <span style={{ fontSize: 12, color: "#9ca3af" }}>{sorted.length} record{sorted.length !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* Table */}
        <div style={{ ...moduleUi.card, flex: 1, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}>
            <thead>
              <tr style={{ ...moduleUi.tableHead, position: "sticky", top: 0, zIndex: 1 }}>
                {cols.map(h => <th key={h} style={{ ...moduleUi.th, textAlign: (h === "Amount" || h === "CIS") ? "right" : "left" }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map(bill => (
                <tr key={bill.id}
                  onClick={() => { setEditingBill(bill); setShowForm(true); }}
                  style={{ borderBottom: "1px solid #f3f4f6", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                  onMouseLeave={e => e.currentTarget.style.background = ""}>
                  <td style={{ padding: "11px 16px", fontSize: 13, color: "#374151", whiteSpace: "nowrap" }}>{fmtDate(bill.bill_date)}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13, color: "#1a1a2e", fontWeight: 500 }}>{bill.supplier_name || "—"}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13, color: "#1e6be0", fontWeight: 600, whiteSpace: "nowrap" }}>{bill.bill_number || "—"}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13, color: "#6b7280" }}>{bill.category || "—"}</td>
                  {cisEnabled && (
                    <td style={{ padding: "11px 16px", fontSize: 13, color: Number(bill.cis_deduction || 0) > 0 ? "#7c3aed" : "#cbd5e1", fontWeight: Number(bill.cis_deduction || 0) > 0 ? 600 : 400, textAlign: "right", whiteSpace: "nowrap" }}>
                      {Number(bill.cis_deduction || 0) > 0 ? fmt(currSym, bill.cis_deduction) : "—"}
                    </td>
                  )}
                  <td style={{ padding: "11px 16px", fontSize: 13, color: bill.due_date < today && bill.status !== "Paid" && bill.status !== "Void" ? "#dc2626" : "#374151", fontWeight: bill.due_date < today && bill.status !== "Paid" && bill.status !== "Void" ? 600 : 400, whiteSpace: "nowrap" }}>
                    {fmtDate(bill.due_date)}
                  </td>
                  <td style={{ padding: "11px 16px" }}><StatusBadge status={bill.status} /></td>
                  <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 600, color: "#1a1a2e", textAlign: "right", whiteSpace: "nowrap" }}>
                    {fmt(currSym, bill.total || bill.amount || 0)}
                    {isVat && bill.tax_amount > 0 && (
                      <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 400 }}>incl. {fmt(currSym, bill.tax_amount)} VAT</div>
                    )}
                  </td>
                  <td style={{ padding: "11px 12px" }} onClick={ev => ev.stopPropagation()}>
                    <div style={{ display: "flex", gap: 2, opacity: 0 }} className="row-actions"
                      onMouseEnter={e => e.currentTarget.style.opacity = 1}
                      onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                      <Btn size="sm" variant="ghost" icon={<Icons.Edit />} onClick={() => { setEditingBill(bill); setShowForm(true); }} />
                      <Btn size="sm" variant="ghost" icon={<Icons.Trash />} onClick={() => onDelete(bill.id)} />
                    </div>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr><td colSpan={cisEnabled ? 9 : 8}><EmptyState icon={<Icons.Receipt />}
                  text={bills.length === 0 ? "No bills yet. Record your first supplier invoice to start tracking payables." : "No bills match your current search or filters."}
                  cta={bills.length === 0
                    ? <Btn variant="primary" onClick={() => { setEditingBill(null); setShowForm(true); }}>New Bill</Btn>
                    : <Btn variant="outline" onClick={() => { setSearch(""); setActiveFilter("all"); setCisFilter("all"); }}>Clear filters</Btn>}
                /></td></tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={totalItems} pageSize={pageSize} />
        </div>

        <style>{`tr:hover .row-actions { opacity: 1 !important; }`}</style>
      </div>
    </div>
  );
}
