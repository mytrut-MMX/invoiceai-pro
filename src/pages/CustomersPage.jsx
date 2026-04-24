import { useState, useMemo, useContext } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ROUTES } from "../router/routes";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Btn, StatusBadge } from "../components/atoms";
import { upsert, formatPhoneNumber, fmt } from "../utils/helpers";
import { CUR_SYM } from "../constants";
import CustomerForm from "../modals/CustomerModal";
import { saveCustomer, deleteCustomer as deleteCustomerFromDb } from "../lib/dataAccess";
import { useToast } from "../components/ui/Toast";
import EmptyState from "../components/ui/EmptyState";
import { ListSkeleton } from "../components/ui/Skeleton";

const AVATAR_BG = [
  "bg-indigo-500", "bg-emerald-500", "bg-amber-500",
  "bg-rose-500", "bg-sky-500", "bg-violet-500",
];
const avatarBgFor = (name = "") => AVATAR_BG[(name.charCodeAt(0) || 0) % AVATAR_BG.length];

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

export default function CustomersPage({ initialShowForm = false }) {
  const { customers, setCustomers, orgSettings, invoices, quotes, payments, user, businessDataHydrated } = useContext(AppCtx);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currSym = CUR_SYM[orgSettings?.currency || "GBP"] || "£";
  const { toast } = useToast();

  const [editingCustomer, setEditingCustomer] = useState(null);
  const [showForm, setShowForm] = useState(initialShowForm);

  const search = searchParams.get("q") || "";
  const setSearch = (v) => setSearchParams(p => {
    const n = new URLSearchParams(p); v ? n.set("q", v) : n.delete("q"); return n;
  }, { replace: true });

  const deleteCustomer = async (c) => {
    const invCount = (invoices || []).filter(i => i.customer?.id === c.id).length;
    const qCount   = (quotes   || []).filter(q => q.customer?.id === c.id).length;
    const linked   = invCount + qCount;
    const msg = linked > 0
      ? `"${c.name}" is linked to ${linked} invoice/quote(s). Deleting will not remove those records, but the customer will no longer appear in lookups.\n\nDelete anyway?`
      : `Delete "${c.name}"? This cannot be undone.`;
    if (!window.confirm(msg)) return;
    if (!user?.id) return alert("You must be logged in to delete.");
    const snapshot = customers;
    setCustomers(p => p.filter(x => x.id !== c.id));
    const { error } = await deleteCustomerFromDb(user.id, c.id);
    if (error) {
      console.error("[CustomersPage] deleteCustomer failed:", error);
      setCustomers(snapshot);
      toast({ title: "Failed to delete customer", description: error.message, variant: "danger" });
      return;
    }
    toast({ title: "Customer deleted", variant: "success" });
  };

  const onSave = async (c) => {
    if (!user?.id) return alert("You must be logged in to save.");
    const { data, error } = await saveCustomer(user.id, c);
    if (error) {
      console.error("[CustomersPage] saveCustomer failed:", error);
      toast({ title: "Save failed", description: error?.message || String(error), variant: "danger" });
      return;
    }
    setCustomers(p => upsert(p, data));
    toast({ title: "Customer saved", variant: "success" });
    if (initialShowForm) { navigate(ROUTES.CUSTOMERS, { replace: true }); return; }
    setShowForm(false);
    setEditingCustomer(null);
  };

  const openNew   = () => { setEditingCustomer(null); setShowForm(true); };
  const openEdit  = (c) => { setEditingCustomer(c); setShowForm(true); };
  const closeForm = () => {
    if (initialShowForm) { navigate(ROUTES.CUSTOMERS, { replace: true }); return; }
    setShowForm(false);
    setEditingCustomer(null);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return customers;
    return customers.filter(c =>
      (c.name || "").toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q)
    );
  }, [customers, search]);

  const metrics = useMemo(() => {
    let totalInvoiced = 0, totalCollected = 0;
    for (const c of customers) {
      const custInvoices = (invoices || []).filter(i => i.customer?.id === c.id);
      const custIds = new Set(custInvoices.map(i => i.id));
      totalInvoiced  += custInvoices.reduce((s, i) => s + Number(i.total || 0), 0);
      totalCollected += (payments || []).filter(p => custIds.has(p.invoice_id)).reduce((s, p) => s + Number(p.amount || 0), 0);
    }
    return {
      count:       customers.length,
      invoiced:    totalInvoiced,
      collected:   totalCollected,
      outstanding: Math.max(0, totalInvoiced - totalCollected),
    };
  }, [customers, invoices, payments]);

  if (!businessDataHydrated) return <ListSkeleton />;

  if (showForm) {
    return (
      <CustomerForm
        existing={editingCustomer}
        customers={customers}
        onClose={closeForm}
        onSave={onSave}
        settings={{ cis: { enabled: orgSettings?.cisReg === "Yes" } }}
      />
    );
  }

  const hasSearch = search.length > 0;

  return (
    <div className="bg-[var(--surface-page)] min-h-screen">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-3 mb-5 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)] m-0">Customers</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1 m-0">
              {customers.length} customer{customers.length !== 1 ? "s" : ""} · manage your client relationships
            </p>
          </div>
          <Btn onClick={openNew} variant="primary" icon={<Icons.Plus />}>New customer</Btn>
        </div>

        {/* Summary strip */}
        {customers.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <SummaryCard label="Customers"   value={String(metrics.count)}           tone="neutral" />
            <SummaryCard label="Invoiced"    value={fmt(currSym, metrics.invoiced)}  tone="info" />
            <SummaryCard label="Collected"   value={fmt(currSym, metrics.collected)} tone="success" />
            <SummaryCard label="Outstanding" value={fmt(currSym, metrics.outstanding)}
                         tone={metrics.outstanding > 0 ? "danger" : "neutral"} />
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
                placeholder="Search by name or email…"
                className="flex-1 min-w-0 border-none outline-none bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
              />
              {hasSearch && (
                <button
                  onClick={() => setSearch("")}
                  title="Clear search"
                  className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] bg-transparent border-none cursor-pointer flex flex-shrink-0 p-0"
                >
                  <Icons.X />
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[720px]">
              <thead>
                <tr className="bg-[var(--surface-sunken)] border-b border-[var(--border-subtle)]">
                  <Th>Customer</Th>
                  <Th>Type</Th>
                  <Th>Contact</Th>
                  <Th align="right">Invoiced</Th>
                  <Th align="right">Collected</Th>
                  <Th align="right">Outstanding</Th>
                  <Th align="right" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      {customers.length === 0 ? (
                        <EmptyState
                          icon={Icons.Customers}
                          title="No customers yet"
                          description="Add your first customer to start creating invoices"
                          action={{ label: "New customer", onClick: openNew, icon: <Icons.Plus /> }}
                        />
                      ) : (
                        <EmptyState
                          icon={Icons.Search}
                          title="No customers match your search"
                          description="Try a different name or email address"
                          action={{ label: "Clear search", onClick: () => setSearch(""), variant: "outline" }}
                        />
                      )}
                    </td>
                  </tr>
                ) : filtered.map(c => {
                  const custInvoices   = (invoices || []).filter(i => i.customer?.id === c.id);
                  const custIds        = new Set(custInvoices.map(i => i.id));
                  const totalInvoiced  = custInvoices.reduce((s, i) => s + Number(i.total || 0), 0);
                  const totalCollected = (payments || []).filter(p => custIds.has(p.invoice_id)).reduce((s, p) => s + Number(p.amount || 0), 0);
                  const outstanding    = Math.max(0, totalInvoiced - totalCollected);
                  const hasActivity    = totalInvoiced > 0;
                  const avatarCls = avatarBgFor(c.name);

                  return (
                    <tr
                      key={c.id}
                      className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface-sunken)] transition-colors duration-150"
                    >
                      <td className="py-3 px-4 min-w-[180px]">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-[30px] h-[30px] rounded-full ${avatarCls} text-white font-semibold text-xs flex items-center justify-center flex-shrink-0`}>
                            {(c.name || "?")[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-[var(--text-primary)] truncate">{c.name}</div>
                            {c.company && c.company !== c.name && (
                              <div className="text-xs text-[var(--text-tertiary)]">{c.company}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusBadge status={c.type || "Individual"} />
                      </td>

                      <td className="py-3 px-4 min-w-[160px]">
                        {c.email && (
                          <div className="text-sm text-[var(--text-primary)] truncate max-w-[200px]">
                            {c.email}
                          </div>
                        )}
                        {c.phone && (
                          <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
                            {formatPhoneNumber(c.phone)}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap tabular-nums">
                        <span className={`text-sm ${hasActivity ? "font-medium text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"}`}>
                          {hasActivity ? fmt(currSym, totalInvoiced) : "—"}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap tabular-nums">
                        <span className={`text-sm ${totalCollected > 0 ? "font-medium text-[var(--success-700)]" : "text-[var(--text-tertiary)]"}`}>
                          {totalCollected > 0 ? fmt(currSym, totalCollected) : "—"}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap tabular-nums">
                        {outstanding > 0 ? (
                          <span className="text-sm font-medium text-[var(--danger-600)]">
                            {fmt(currSym, outstanding)}
                          </span>
                        ) : hasActivity ? (
                          <span className="text-xs font-medium text-[var(--success-700)]">Settled</span>
                        ) : (
                          <span className="text-sm text-[var(--text-tertiary)]">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <ActionBtn onClick={() => openEdit(c)}   title="Edit customer"   icon={<Icons.Edit />} />
                          <ActionBtn onClick={() => deleteCustomer(c)} title="Delete customer" icon={<Icons.Trash />} tone="danger" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          {filtered.length > 0 && customers.length > 0 && (
            <div className="border-t border-[var(--border-subtle)] px-4 py-2 text-xs text-[var(--text-tertiary)] text-right">
              {hasSearch ? `${filtered.length} of ${customers.length}` : customers.length} customer{customers.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tone = "neutral", sub }) {
  const toneCls = {
    info:    "text-[var(--info-600)]",
    danger:  "text-[var(--danger-600)]",
    success: "text-[var(--success-600)]",
    warning: "text-[var(--warning-600)]",
    neutral: "text-[var(--text-primary)]",
  }[tone] || "text-[var(--text-primary)]";

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-4">
      <div className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className={`text-lg font-semibold tabular-nums leading-tight ${toneCls}`}>{value}</div>
      {sub && <div className="text-[11px] text-[var(--danger-600)] font-semibold mt-1">{sub}</div>}
    </div>
  );
}

