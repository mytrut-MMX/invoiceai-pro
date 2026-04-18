import { useState, useMemo, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../router/routes";
import { CUR_SYM, CIS_RATES_SUPPLIER } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Btn, StatusBadge } from "../components/atoms";
import { formatPhoneNumber, fmt } from "../utils/helpers";
import { saveSupplier, deleteSupplier } from "../lib/dataAccess";
import SupplierFormPanel from "../components/suppliers/SupplierFormPanel";
import { useToast } from "../components/ui/Toast";
import EmptyState from "../components/ui/EmptyState";

const AVATAR_BG = [
  "bg-indigo-500", "bg-emerald-500", "bg-amber-500",
  "bg-rose-500", "bg-sky-500", "bg-violet-500",
];
const avatarBgFor = (name = "") => AVATAR_BG[(name.charCodeAt(0) || 0) % AVATAR_BG.length];

const CIS_RATE_TONE = {
  gross_0:        "bg-[var(--success-50)] text-[var(--success-700)]",
  standard_20:    "bg-[var(--warning-50)] text-[var(--warning-700)]",
  unverified_30:  "bg-[var(--danger-50)] text-[var(--danger-700)]",
};

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
      className={`flex items-center justify-center bg-white border border-[var(--border-subtle)] rounded-[var(--radius-md)] p-1.5 cursor-pointer text-[var(--text-tertiary)] transition-colors duration-150 ${toneCls}`}
    >
      {icon}
    </button>
  );
}

function SummaryCard({ label, value, tone = "neutral" }) {
  const toneCls = {
    info:    "text-[var(--info-600)]",
    danger:  "text-[var(--danger-600)]",
    success: "text-[var(--success-600)]",
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


export default function SuppliersPage({ initialShowForm = false }) {
  const { suppliers, setSuppliers, orgSettings, user, bills } = useContext(AppCtx);
  const navigate = useNavigate();
  const currSym = CUR_SYM[orgSettings?.currency || "GBP"] || "£";
  const { toast } = useToast();

  const [editingSupplier, setEditingSupplier] = useState(null);
  const [showForm, setShowForm] = useState(initialShowForm);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const onSave = async (supplier) => {
    if (!user?.id) return alert("You must be logged in to save.");
    const { data, error } = await saveSupplier(user.id, supplier);
    if (error) {
      console.error("[SuppliersPage] saveSupplier failed:", error);
      toast({ title: "Failed to save supplier", description: error.message, variant: "danger" });
      return;
    }
    setSuppliers(prev => {
      const idx = prev.findIndex(s => s.id === data.id);
      if (idx >= 0) { const u = [...prev]; u[idx] = data; return u; }
      return [data, ...prev];
    });
    toast({ title: "Supplier saved", variant: "success" });
    if (initialShowForm) { navigate(ROUTES.SUPPLIERS, { replace: true }); return; }
    setShowForm(false);
    setEditingSupplier(null);
  };

  const onDelete = async (sup) => {
    if (!window.confirm(`Delete supplier "${sup.name}"? This cannot be undone.`)) return;
    if (!user?.id) return;
    const { error } = await deleteSupplier(user.id, sup.id);
    if (error) {
      console.error("[SuppliersPage] deleteSupplier failed:", error);
      toast({ title: "Failed to delete supplier", description: error.message, variant: "danger" });
      return;
    }
    setSuppliers(prev => prev.filter(x => x.id !== sup.id));
    toast({ title: "Supplier deleted", variant: "success" });
  };

  const openNew   = () => { setEditingSupplier(null); setShowForm(true); };
  const openEdit  = (s) => { setEditingSupplier(s); setShowForm(true); };
  const closeForm = () => {
    if (initialShowForm) { navigate(ROUTES.SUPPLIERS, { replace: true }); return; }
    setShowForm(false);
    setEditingSupplier(null);
  };

  const filtered = useMemo(() => {
    let list = suppliers || [];
    if (filter === "cis") list = list.filter(s => s.cis?.is_subcontractor);
    else if (filter === "vat") list = list.filter(s => s.is_vat_registered);
    else if (filter === "inactive") list = list.filter(s => s.is_active === false);
    else list = list.filter(s => s.is_active !== false);

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        (s.name || "").toLowerCase().includes(q) ||
        (s.email || "").toLowerCase().includes(q) ||
        (s.utr || "").toLowerCase().includes(q) ||
        (s.vat_number || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [suppliers, filter, search]);

  const metrics = useMemo(() => {
    const active = (suppliers || []).filter(s => s.is_active !== false);
    return {
      count: active.length,
      cisCount: active.filter(s => s.cis?.is_subcontractor).length,
      vatCount: active.filter(s => s.is_vat_registered).length,
      inactiveCount: (suppliers || []).filter(s => s.is_active === false).length,
    };
  }, [suppliers]);

  const billsBySupplier = useMemo(() => {
    const map = {};
    (bills || []).forEach(b => {
      if (!b.supplier_id) return;
      if (!map[b.supplier_id]) map[b.supplier_id] = { count: 0, total: 0 };
      map[b.supplier_id].count += 1;
      map[b.supplier_id].total += Number(b.total || b.amount || 0);
    });
    return map;
  }, [bills]);

  if (showForm) {
    return (
      <SupplierFormPanel
        existing={editingSupplier}
        suppliers={suppliers}
        onClose={closeForm}
        onSave={onSave}
      />
    );
  }

  const hasSearch = search.length > 0 || filter !== "all";
  const totalSuppliers = (suppliers || []).length;

  return (
    <div className="bg-[var(--surface-page)] min-h-screen">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-3 mb-5 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)] m-0">Suppliers</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1 m-0">
              {totalSuppliers} supplier{totalSuppliers !== 1 ? "s" : ""} · manage suppliers and CIS subcontractors
            </p>
          </div>
          <Btn onClick={openNew} variant="primary" icon={<Icons.Plus />}>New supplier</Btn>
        </div>

        {/* Summary strip */}
        {totalSuppliers > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <SummaryCard label="Active"             value={String(metrics.count)}         tone="neutral" />
            <SummaryCard label="CIS Subcontractors" value={String(metrics.cisCount)}      tone="warning" />
            <SummaryCard label="VAT Registered"     value={String(metrics.vatCount)}      tone="info" />
            <SummaryCard label="Inactive"           value={String(metrics.inactiveCount)} tone="muted" />
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
                placeholder="Search name, email, UTR, VAT number…"
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
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="h-9 px-3 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm bg-white text-[var(--text-primary)] cursor-pointer outline-none focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)]"
            >
              <option value="all">All Active</option>
              <option value="cis">CIS Subcontractors</option>
              <option value="vat">VAT Registered</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-[var(--surface-sunken)] border-b border-[var(--border-subtle)]">
                  <Th>Supplier</Th>
                  <Th>Type</Th>
                  <Th>Contact</Th>
                  <Th>CIS</Th>
                  <Th align="center">VAT</Th>
                  <Th align="right">Bills</Th>
                  <Th>Status</Th>
                  <Th align="right" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      {totalSuppliers === 0 ? (
                        <EmptyState
                          icon={Icons.Customers}
                          title="No suppliers yet"
                          description="Add your first supplier or CIS subcontractor to start tracking payables"
                          action={{ label: "New supplier", onClick: openNew, icon: <Icons.Plus /> }}
                        />
                      ) : (
                        <EmptyState
                          icon={Icons.Search}
                          title="No suppliers match your filters"
                          action={{ label: "Clear filters", onClick: () => { setSearch(""); setFilter("all"); }, variant: "outline" }}
                        />
                      )}
                    </td>
                  </tr>
                ) : filtered.map(s => {
                  const billData = billsBySupplier[s.id];
                  const cisRateLabel = s.cis?.is_subcontractor
                    ? (CIS_RATES_SUPPLIER.find(r => r.value === s.cis.rate)?.label || s.cis.rate)
                    : null;
                  const cisToneCls = s.cis?.rate ? (CIS_RATE_TONE[s.cis.rate] || "") : "";
                  const avatarCls = avatarBgFor(s.name);

                  return (
                    <tr
                      key={s.id}
                      className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface-sunken)] transition-colors duration-150"
                    >
                      <td className="py-3 px-4 min-w-[180px]">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-[30px] h-[30px] rounded-full ${avatarCls} text-white font-semibold text-xs flex items-center justify-center flex-shrink-0`}>
                            {(s.name || "?")[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-[var(--text-primary)] truncate">{s.name}</div>
                            {s.legal_name && s.legal_name !== s.name && (
                              <div className="text-xs text-[var(--text-tertiary)]">{s.legal_name}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusBadge status={s.type || "Business"} />
                      </td>

                      <td className="py-3 px-4 min-w-[160px]">
                        {s.email && (
                          <div className="text-sm text-[var(--text-primary)] truncate max-w-[200px]">{s.email}</div>
                        )}
                        {s.phone && (
                          <div className="text-xs text-[var(--text-tertiary)] mt-0.5">{formatPhoneNumber(s.phone)}</div>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {cisRateLabel ? (
                          <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-[var(--radius-sm)] ${cisToneCls}`}>
                            {cisRateLabel}
                          </span>
                        ) : (
                          <span className="text-sm text-[var(--text-tertiary)]">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {s.is_vat_registered ? (
                          <span className="text-[var(--success-600)] flex justify-center"><Icons.Check /></span>
                        ) : (
                          <span className="text-sm text-[var(--text-tertiary)]">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {billData ? (
                          <div>
                            <div className="text-sm font-medium text-[var(--text-primary)] tabular-nums">
                              {fmt(currSym, billData.total)}
                            </div>
                            <div className="text-[10px] text-[var(--text-tertiary)]">
                              {billData.count} bill{billData.count !== 1 ? "s" : ""}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-[var(--text-tertiary)]">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusBadge status={s.is_active !== false ? "Active" : "Inactive"} />
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <ActionBtn onClick={() => openEdit(s)} title="Edit supplier" icon={<Icons.Edit />} />
                          <ActionBtn onClick={() => onDelete(s)} title="Delete supplier" icon={<Icons.Trash />} tone="danger" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.length > 0 && totalSuppliers > 0 && (
            <div className="border-t border-[var(--border-subtle)] px-4 py-2 text-xs text-[var(--text-tertiary)] text-right">
              {hasSearch ? `${filtered.length} of ${totalSuppliers}` : totalSuppliers} supplier{totalSuppliers !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
