import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../router/routes";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Btn, Tag, Switch, InfoBox } from "../components/atoms";
import { fmt } from "../utils/helpers";
import ItemForm from "../modals/ItemModal";
import { deleteCatalogItem } from "../lib/dataAccess";

const TYPE_COLORS = {
  Service:   "var(--info-600)",
  Labour:    "var(--warning-600)",
  Material:  "var(--success-600)",
  Equipment: "var(--brand-500)",
  Other:     "var(--text-tertiary)",
};

const TYPE_AVATAR = {
  Service:   { bg: "bg-[var(--info-50)]",    fg: "text-[var(--info-700)]" },
  Labour:    { bg: "bg-[var(--warning-50)]", fg: "text-[var(--warning-700)]" },
  Material:  { bg: "bg-[var(--success-50)]", fg: "text-[var(--success-700)]" },
  Equipment: { bg: "bg-[var(--brand-50)]",   fg: "text-[var(--brand-700)]" },
  Other:     { bg: "bg-[var(--neutral-50)]", fg: "text-[var(--text-secondary)]" },
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

function EmptyState({ icon, title, message, cta }) {
  return (
    <div className="py-16 px-6 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--surface-sunken)] text-[var(--text-tertiary)] mb-3">
        {icon}
      </div>
      <div className="text-base font-semibold text-[var(--text-primary)] mb-1">{title}</div>
      {message && <div className="text-sm text-[var(--text-secondary)] mb-5">{message}</div>}
      {cta}
    </div>
  );
}

export default function ItemsPage({ initialShowForm = false }) {
  const { orgSettings, catalogItems, setCatalogItems, invoices, quotes, user } = useContext(AppCtx);
  const navigate = useNavigate();
  const isVat = orgSettings?.vatReg === "Yes";
  const isCisOrg = orgSettings?.cisReg === "Yes";
  const [showForm, setShowForm] = useState(initialShowForm);
  const [editingItem, setEditingItem] = useState(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const deleteItem = async (item) => {
    const linked = [...(invoices || []), ...(quotes || [])].filter(doc =>
      (doc.line_items || doc.items || []).some(li => li.itemId === item.id || li.name === item.name)
    ).length;
    const msg = linked > 0
      ? `"${item.name}" is used in ${linked} invoice/quote(s). Deleting will not remove those records.\n\nDelete anyway?`
      : `Delete "${item.name}"? This cannot be undone.`;
    if (!window.confirm(msg)) return;
    if (!user?.id) return alert("You must be logged in to delete.");
    const snapshot = catalogItems;
    setCatalogItems(p => p.filter(x => x.id !== item.id));
    const { error } = await deleteCatalogItem(user.id, item.id);
    if (error) {
      console.error("[ItemsPage] deleteCatalogItem failed:", error);
      setCatalogItems(snapshot);
      alert("Failed to delete item: " + (error.message || "Unknown error"));
    }
  };

  const filtered = catalogItems.filter(i => {
    const matchSearch =
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.description.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "All" || i.type === typeFilter;
    const matchStatus = statusFilter === "All" || (statusFilter === "Active" ? !!i.active : !i.active);
    return matchSearch && matchType && matchStatus;
  });

  const onSave = item => {
    setCatalogItems(p => {
      const i = p.findIndex(x => x.id === item.id);
      if (i >= 0) { const u = [...p]; u[i] = item; return u; }
      return [...p, item];
    });
    if (initialShowForm) { navigate(ROUTES.ITEMS, { replace: true }); return; }
    setShowForm(false);
    setEditingItem(null);
  };

  const toggleActive = id => setCatalogItems(p => p.map(i => i.id === id ? { ...i, active: !i.active } : i));

  const activeItems = catalogItems.filter(i => i.active).length;
  const servicesCount = catalogItems.filter(i => i.type === "Service").length;
  const materialsCount = catalogItems.filter(i => i.type === "Material").length;
  const hasFilters = search || typeFilter !== "All" || statusFilter !== "All";

  if (showForm) return (
    <ItemForm
      existing={editingItem}
      items={catalogItems}
      onClose={() => {
        if (initialShowForm) { navigate(ROUTES.ITEMS, { replace: true }); return; }
        setShowForm(false); setEditingItem(null);
      }}
      onSave={onSave}
      settings={{ cis: { enabled: orgSettings?.cisReg === "Yes" } }}
    />
  );

  return (
    <div className="bg-[var(--surface-page)] min-h-screen">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-3 mb-5 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)] m-0">Items</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1 m-0">
              Manage products and services with rates, VAT, CIS and active status
            </p>
          </div>
          <Btn onClick={() => { setEditingItem(null); setShowForm(true); }} variant="primary" icon={<Icons.Plus />}>New item</Btn>
        </div>

        {/* Summary strip */}
        {catalogItems.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <SummaryCard label="Total Items"  value={String(catalogItems.length)} tone="neutral" />
            <SummaryCard label="Active Items" value={String(activeItems)}         tone="success" />
            <SummaryCard label="Services"     value={String(servicesCount)}       tone="info" />
            <SummaryCard label="Materials"    value={String(materialsCount)}      tone="brand" />
          </div>
        )}

        {!isVat && (
          <div className="mb-4">
            <InfoBox color="var(--warning-600)">
              Your organisation is not VAT registered. VAT rates are hidden on all items.
            </InfoBox>
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
                placeholder="Search items…"
                className="flex-1 min-w-0 border-none outline-none bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
              />
              {search && (
                <button onClick={() => setSearch("")} title="Clear" className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] bg-transparent border-none cursor-pointer flex flex-shrink-0 p-0">
                  <Icons.X />
                </button>
              )}
            </div>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="h-9 px-3 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm bg-white text-[var(--text-primary)] cursor-pointer outline-none focus:border-[var(--brand-600)]"
            >
              {["All", ...Object.keys(TYPE_COLORS)].map(v => <option key={v}>{v}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="h-9 px-3 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm bg-white text-[var(--text-primary)] cursor-pointer outline-none focus:border-[var(--brand-600)]"
            >
              {["All", "Active", "Inactive"].map(v => <option key={v}>{v}</option>)}
            </select>
            {hasFilters && (
              <button
                onClick={() => { setSearch(""); setTypeFilter("All"); setStatusFilter("All"); }}
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
                  <Th>Name</Th>
                  <Th>Type</Th>
                  <Th align="right">Rate</Th>
                  <Th>Unit</Th>
                  {isVat && <Th align="right">VAT</Th>}
                  <Th>CIS</Th>
                  <Th>Status</Th>
                  <Th align="right" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={isVat ? 8 : 7}>
                      {catalogItems.length === 0 ? (
                        <EmptyState
                          icon={<Icons.Items />}
                          title="No items yet"
                          message="Create one to start pricing invoices and quotes"
                          cta={<Btn onClick={() => { setEditingItem(null); setShowForm(true); }} variant="primary" icon={<Icons.Plus />}>New item</Btn>}
                        />
                      ) : (
                        <EmptyState
                          icon={<Icons.Search />}
                          title="No items match your filters"
                          cta={<Btn variant="outline" onClick={() => { setSearch(""); setTypeFilter("All"); setStatusFilter("All"); }}>Clear filters</Btn>}
                        />
                      )}
                    </td>
                  </tr>
                ) : filtered.map(item => {
                  const avatarTone = TYPE_AVATAR[item.type] || TYPE_AVATAR.Other;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => { setEditingItem(item); setShowForm(true); }}
                      className="border-b border-[var(--border-subtle)] last:border-0 cursor-pointer hover:bg-[var(--surface-sunken)] transition-colors duration-150"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          {item.photo ? (
                            <img
                              src={item.photo}
                              alt=""
                              className="w-[30px] h-[30px] rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className={`w-[30px] h-[30px] rounded-full flex items-center justify-center font-semibold text-xs flex-shrink-0 ${avatarTone.bg} ${avatarTone.fg}`}>
                              {(item.type || "—")[0]}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-[var(--text-primary)] truncate">{item.name}</div>
                            {item.description && (
                              <div className="text-xs text-[var(--text-tertiary)] truncate max-w-[280px]">{item.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Tag color={TYPE_COLORS[item.type] || "var(--text-tertiary)"}>{item.type || "—"}</Tag>
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-medium text-[var(--text-primary)] tabular-nums whitespace-nowrap">
                        {fmt("£", item.rate)}
                      </td>
                      <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">{item.unit}</td>
                      {isVat && (
                        <td className="py-3 px-4 text-right text-sm text-[var(--text-secondary)] tabular-nums whitespace-nowrap">
                          {item.taxRate}%
                        </td>
                      )}
                      <td className="py-3 px-4">
                        {isCisOrg && item.cis?.enabled ? (
                          <Tag color="var(--warning-600)">CIS {item.cis?.labour ?? 100}% labour</Tag>
                        ) : (
                          <span className="text-xs text-[var(--text-tertiary)]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <Switch checked={item.active} onChange={() => toggleActive(item.id)} />
                          <span className={`text-xs ${item.active ? "text-[var(--success-700)] font-medium" : "text-[var(--text-tertiary)]"}`}>
                            {item.active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <ActionBtn onClick={() => { setEditingItem(item); setShowForm(true); }} title="Edit item" icon={<Icons.Edit />} />
                          <ActionBtn onClick={() => deleteItem(item)} title="Delete item" icon={<Icons.Trash />} tone="danger" />
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
              {hasFilters ? `${filtered.length} of ${catalogItems.length}` : catalogItems.length} item{catalogItems.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
