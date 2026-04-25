import { useState, useMemo, useContext, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ROUTES } from "../router/routes";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Btn } from "../components/atoms";
import { upsert, formatPhoneNumber, fmt } from "../utils/helpers";
import { CUR_SYM } from "../constants";
import CustomerForm from "../modals/CustomerModal";
import SupplierFormPanel from "../components/suppliers/SupplierFormPanel";
import {
  saveCustomer, deleteCustomer as deleteCustomerFromDb,
  saveSupplier, deleteSupplier as deleteSupplierFromDb,
} from "../lib/dataAccess";
import { useToast } from "../components/ui/Toast";
import EmptyState from "../components/ui/EmptyState";
import { ListSkeleton } from "../components/ui/Skeleton";

const AVATAR_BG = ["bg-indigo-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-sky-500", "bg-violet-500"];
const avatarBgFor = (name = "") => AVATAR_BG[(name.charCodeAt(0) || 0) % AVATAR_BG.length];

function Th({ children, align = "left" }) {
  const a = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return <th className={`py-2.5 px-4 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider whitespace-nowrap ${a}`}>{children}</th>;
}

function ActionBtn({ onClick, title, icon, tone = "neutral" }) {
  const t = tone === "danger" ? "hover:border-[var(--danger-100)] hover:text-[var(--danger-600)]" : "hover:border-[var(--brand-600)] hover:text-[var(--brand-600)]";
  return (
    <button onClick={onClick} title={title} className={`flex items-center justify-center bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] p-1.5 cursor-pointer text-[var(--text-tertiary)] transition-colors duration-150 ${t}`}>
      {icon}
    </button>
  );
}

function SummaryCard({ label, value, tone = "neutral" }) {
  const t = { info: "text-[var(--info-600)]", danger: "text-[var(--danger-600)]", success: "text-[var(--success-600)]", warning: "text-[var(--warning-600)]", neutral: "text-[var(--text-primary)]" }[tone] || "text-[var(--text-primary)]";
  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-4">
      <div className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-lg font-semibold tabular-nums leading-tight ${t}`}>{value}</div>
    </div>
  );
}

function TypeBadge({ type }) {
  const c = type === "customer" ? "bg-[var(--info-50)] text-[var(--info-700)]" : "bg-[var(--warning-50)] text-[var(--warning-700)]";
  return <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-[var(--radius-sm)] ${c}`}>{type === "customer" ? "Customer" : "Supplier"}</span>;
}

export default function ContactsPage({ initialFormType = null }) {
  const { customers, setCustomers, suppliers, setSuppliers, invoices, quotes, payments, bills, orgSettings, user, businessDataHydrated } = useContext(AppCtx);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currSym = CUR_SYM[orgSettings?.currency || "GBP"] || "£";
  const { toast } = useToast();

  const [editing, setEditing] = useState(null);
  const [formType, setFormType] = useState(initialFormType);
  const [splitOpen, setSplitOpen] = useState(false);

  const search = searchParams.get("q") || "";
  const tab    = searchParams.get("type") || "all";
  const setSearch = (v) => setSearchParams(p => { const n = new URLSearchParams(p); v ? n.set("q", v) : n.delete("q"); return n; }, { replace: true });
  const setTab    = (v) => setSearchParams(p => { const n = new URLSearchParams(p); v === "all" ? n.delete("type") : n.set("type", v); return n; }, { replace: true });

  useEffect(() => {
    if (!splitOpen) return;
    const h = () => setSplitOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [splitOpen]);

  const handleDeleteCustomer = async (c) => {
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
      setCustomers(snapshot);
      toast({ title: "Failed to delete customer", description: error.message, variant: "danger" });
      return;
    }
    toast({ title: "Customer deleted", variant: "success" });
  };

  const handleDeleteSupplier = async (s) => {
    if (!window.confirm(`Delete supplier "${s.name}"? This cannot be undone.`)) return;
    if (!user?.id) return;
    const { error } = await deleteSupplierFromDb(user.id, s.id);
    if (error) { toast({ title: "Failed to delete supplier", description: error.message, variant: "danger" }); return; }
    setSuppliers(prev => prev.filter(x => x.id !== s.id));
    toast({ title: "Supplier deleted", variant: "success" });
  };

  const onSaveCustomer = async (c) => {
    if (!user?.id) return alert("You must be logged in to save.");
    const { data, error } = await saveCustomer(user.id, c);
    if (error) { toast({ title: "Save failed", description: error?.message || String(error), variant: "danger" }); return; }
    setCustomers(p => upsert(p, data));
    toast({ title: "Customer saved", variant: "success" });
    closeForm();
  };

  const onSaveSupplier = async (s) => {
    if (!user?.id) return alert("You must be logged in to save.");
    const { data, error } = await saveSupplier(user.id, s);
    if (error) { toast({ title: "Failed to save supplier", description: error.message, variant: "danger" }); return; }
    setSuppliers(prev => {
      const idx = prev.findIndex(x => x.id === data.id);
      if (idx >= 0) { const u = [...prev]; u[idx] = data; return u; }
      return [data, ...prev];
    });
    toast({ title: "Supplier saved", variant: "success" });
    closeForm();
  };

  const openNewCustomer = () => { setEditing(null); setFormType("customer"); setSplitOpen(false); };
  const openNewSupplier = () => { setEditing(null); setFormType("supplier"); setSplitOpen(false); };
  const openEdit  = (c) => { setEditing(c); setFormType(c._type); };
  const closeForm = () => {
    if (initialFormType) { navigate(ROUTES.CONTACTS, { replace: true }); return; }
    setFormType(null); setEditing(null);
  };

  const outstandingByCustomer = useMemo(() => {
    const map = {};
    for (const c of customers || []) {
      const cInv = (invoices || []).filter(i => i.customer?.id === c.id);
      const ids  = new Set(cInv.map(i => i.id));
      const inv  = cInv.reduce((s, i) => s + Number(i.total || 0), 0);
      const col  = (payments || []).filter(p => ids.has(p.invoice_id)).reduce((s, p) => s + Number(p.amount || 0), 0);
      map[c.id] = Math.max(0, inv - col);
    }
    return map;
  }, [customers, invoices, payments]);

  const outstandingBySupplier = useMemo(() => {
    const map = {};
    for (const b of bills || []) {
      if (!b.supplier_id || b.status === "Paid" || b.status === "Void") continue;
      map[b.supplier_id] = (map[b.supplier_id] || 0) + Number(b.total || b.amount || 0);
    }
    return map;
  }, [bills]);

  const contacts = useMemo(() => {
    const custs = (customers || []).map(c => ({ ...c, _type: "customer" }));
    const sups  = (suppliers || []).map(s => ({ ...s, _type: "supplier" }));
    let list = [...custs, ...sups];
    if (tab === "customers") list = list.filter(c => c._type === "customer");
    if (tab === "suppliers") list = list.filter(c => c._type === "supplier");
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        (c.name || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.company || "").toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [customers, suppliers, tab, search]);

  const totalReceivable = useMemo(() => Object.values(outstandingByCustomer).reduce((s, v) => s + v, 0), [outstandingByCustomer]);
  const totalPayable    = useMemo(() => Object.values(outstandingBySupplier).reduce((s, v) => s + v, 0), [outstandingBySupplier]);

  if (!businessDataHydrated) return <ListSkeleton />;

  if (formType === "customer") {
    return <CustomerForm existing={editing} customers={customers} onClose={closeForm} onSave={onSaveCustomer} settings={{ cis: { enabled: orgSettings?.cisReg === "Yes" } }} />;
  }
  if (formType === "supplier") {
    return <SupplierFormPanel existing={editing} suppliers={suppliers} onClose={closeForm} onSave={onSaveSupplier} />;
  }

  const hasSearch     = search.length > 0;
  const totalContacts = (customers?.length || 0) + (suppliers?.length || 0);
  const tabItems = [
    { id: "all",       label: `All (${totalContacts})` },
    { id: "customers", label: `Customers (${customers?.length || 0})` },
    { id: "suppliers", label: `Suppliers (${suppliers?.length || 0})` },
  ];

  return (
    <div className="bg-[var(--surface-page)] min-h-screen">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-end justify-between gap-3 mb-5 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)] m-0">Contacts</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1 m-0">{totalContacts} contact{totalContacts !== 1 ? "s" : ""} · customers and suppliers in one place</p>
          </div>
          <div className="relative" onMouseDown={e => e.stopPropagation()}>
            <Btn onClick={() => setSplitOpen(v => !v)} variant="primary" icon={<Icons.Plus />}>Add</Btn>
            {splitOpen && (
              <div className="absolute right-0 top-[calc(100%+6px)] w-44 bg-[var(--surface-overlay)] rounded-[var(--radius-lg)] shadow-[var(--shadow-popover)] border border-[var(--border-subtle)] py-1 z-50">
                <button onClick={openNewCustomer} className="w-full text-left px-3 py-2 text-[12px] text-[var(--text-primary)] hover:bg-[var(--surface-sunken)] border-none bg-transparent cursor-pointer">New customer</button>
                <button onClick={openNewSupplier} className="w-full text-left px-3 py-2 text-[12px] text-[var(--text-primary)] hover:bg-[var(--surface-sunken)] border-none bg-transparent cursor-pointer">New supplier</button>
              </div>
            )}
          </div>
        </div>

        {totalContacts > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <SummaryCard label="Total contacts" value={String(totalContacts)} tone="neutral" />
            <SummaryCard label="Receivable"     value={fmt(currSym, totalReceivable)} tone={totalReceivable > 0 ? "danger" : "neutral"} />
            <SummaryCard label="Payable"        value={fmt(currSym, totalPayable)}    tone={totalPayable > 0 ? "warning" : "neutral"} />
          </div>
        )}

        <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] overflow-hidden">
          <div className="p-3 flex items-center gap-2 flex-wrap border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-1 flex-shrink-0">
              {tabItems.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={["h-9 px-3 text-sm rounded-[var(--radius-md)] border cursor-pointer transition-colors duration-150",
                    tab === t.id ? "bg-[var(--brand-50)] text-[var(--brand-700)] border-[var(--brand-200)] font-medium" : "bg-[var(--surface-card)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--surface-sunken)]"].join(" ")}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-[160px] h-9 px-3 bg-[var(--surface-sunken)] border border-[var(--border-subtle)] rounded-[var(--radius-md)]">
              <span className="text-[var(--text-tertiary)] flex flex-shrink-0"><Icons.Search /></span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, or company…"
                className="flex-1 min-w-0 border-none outline-none bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]" />
              {hasSearch && (
                <button onClick={() => setSearch("")} title="Clear search" className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] bg-transparent border-none cursor-pointer flex flex-shrink-0 p-0">
                  <Icons.X />
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[820px]">
              <thead>
                <tr className="bg-[var(--surface-sunken)] border-b border-[var(--border-subtle)]">
                  <Th>Name</Th><Th>Type</Th><Th>Email</Th><Th>Phone</Th><Th align="right">Outstanding</Th><Th align="right" />
                </tr>
              </thead>
              <tbody>
                {contacts.length === 0 ? (
                  <tr><td colSpan={6}>
                    {totalContacts === 0 ? (
                      <EmptyState icon={Icons.Customers} title="No contacts yet" description="Add your first customer or supplier to get started" action={{ label: "New customer", onClick: openNewCustomer, icon: <Icons.Plus /> }} />
                    ) : (
                      <EmptyState icon={Icons.Search} title="No contacts match your filters" action={{ label: "Clear", onClick: () => { setSearch(""); setTab("all"); }, variant: "outline" }} />
                    )}
                  </td></tr>
                ) : contacts.map(c => {
                  const isCust = c._type === "customer";
                  const outstanding = isCust ? (outstandingByCustomer[c.id] || 0) : (outstandingBySupplier[c.id] || 0);
                  const subline = isCust ? (c.company && c.company !== c.name ? c.company : null) : (c.legal_name && c.legal_name !== c.name ? c.legal_name : null);
                  return (
                    <tr key={`${c._type}_${c.id}`} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface-sunken)] transition-colors duration-150">
                      <td className="py-3 px-4 min-w-[180px]">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-[30px] h-[30px] rounded-full ${avatarBgFor(c.name)} text-white font-semibold text-xs flex items-center justify-center flex-shrink-0`}>
                            {(c.name || "?")[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-[var(--text-primary)] truncate">{c.name}</div>
                            {subline && <div className="text-xs text-[var(--text-tertiary)]">{subline}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap"><TypeBadge type={c._type} /></td>
                      <td className="py-3 px-4 min-w-[160px]">
                        {c.email ? <div className="text-sm text-[var(--text-primary)] truncate max-w-[220px]">{c.email}</div> : <span className="text-sm text-[var(--text-tertiary)]">—</span>}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {c.phone ? <div className="text-sm text-[var(--text-primary)]">{formatPhoneNumber(c.phone)}</div> : <span className="text-sm text-[var(--text-tertiary)]">—</span>}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap tabular-nums">
                        {outstanding > 0
                          ? <span className={`text-sm font-medium ${isCust ? "text-[var(--danger-600)]" : "text-[var(--warning-700)]"}`}>{fmt(currSym, outstanding)}</span>
                          : <span className="text-sm text-[var(--text-tertiary)]">—</span>}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <ActionBtn onClick={() => openEdit(c)} title={`Edit ${c._type}`} icon={<Icons.Edit />} />
                          <ActionBtn onClick={() => isCust ? handleDeleteCustomer(c) : handleDeleteSupplier(c)} title={`Delete ${c._type}`} icon={<Icons.Trash />} tone="danger" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {contacts.length > 0 && totalContacts > 0 && (
            <div className="border-t border-[var(--border-subtle)] px-4 py-2 text-xs text-[var(--text-tertiary)] text-right">
              {hasSearch || tab !== "all" ? `${contacts.length} of ${totalContacts}` : totalContacts} contact{totalContacts !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
