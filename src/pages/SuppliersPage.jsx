import { useState, useMemo, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../router/routes";
import { ff, CUR_SYM, CIS_RATES_SUPPLIER } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Btn } from "../components/atoms";
import { StatusBadge } from "../components/shared/moduleListUI";
import { formatPhoneNumber, fmt } from "../utils/helpers";
import { saveSupplier, deleteSupplier } from "../lib/dataAccess";
import SupplierFormPanel from "../components/suppliers/SupplierFormPanel";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const T = {
  pageBg:       "#f4f5f7",
  cardBg:       "#fff",
  cardBorder:   "1px solid #e8e8ec",
  cardRadius:   12,
  cardShadow:   "0 1px 4px rgba(0,0,0,0.05)",
  theadBg:      "#f9fafb",
  rowBorder:    "1px solid #f3f4f6",
  toolbarBorder:"1px solid #f0f0f4",
  cellPad:      "11px 16px",
  heading:      "#1a1a2e",
  body:         "#374151",
  muted:        "#6b7280",
  faint:        "#9ca3af",
  positive:     "#166534",
  negative:     "#b91c1c",
  rowHover:     "#f8faff",
  actionBorder: "#e8e8ec",
};

const AVATAR_PALETTES = [
  { bg:"#eff6ff", fg:"#1d4ed8" },
  { bg:"#fef3c7", fg:"#92400e" },
  { bg:"#f0fdf4", fg:"#166534" },
  { bg:"#fdf4ff", fg:"#7e22ce" },
  { bg:"#fff1f2", fg:"#be123c" },
  { bg:"#f0f9ff", fg:"#0369a1" },
  { bg:"#fafaf9", fg:"#44403c" },
];
const avatarPalette = (name = "") =>
  AVATAR_PALETTES[name.charCodeAt(0) % AVATAR_PALETTES.length];

function MetricCard({ label, value, sub, color = T.heading }) {
  return (
    <div style={{ background:T.cardBg, border:T.cardBorder, borderRadius:10, padding:"14px 18px", flex:"1 1 140px", minWidth:0 }}>
      <div style={{ fontSize:10, fontWeight:700, color:T.faint, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:5 }}>
        {label}
      </div>
      <div style={{ fontSize:18, fontWeight:800, color, fontVariantNumeric:"tabular-nums", lineHeight:1.2 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize:11, color:T.muted, marginTop:3 }}>{sub}</div>}
    </div>
  );
}

function SupplierAvatar({ name }) {
  const { bg, fg } = avatarPalette(name);
  return (
    <div style={{
      width:30, height:30, borderRadius:"50%",
      background:bg, color:fg,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontWeight:700, fontSize:12, flexShrink:0,
      fontFamily:ff,
    }}>
      {(name || "?")[0].toUpperCase()}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function SuppliersPage({ initialShowForm = false }) {
  const { suppliers, setSuppliers, orgSettings, user, bills } = useContext(AppCtx);
  const navigate = useNavigate();
  const currSym = CUR_SYM[orgSettings?.currency || "GBP"] || "£";

  const [editingSupplier, setEditingSupplier] = useState(null);
  const [showForm, setShowForm] = useState(initialShowForm);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const onSave = async (supplier) => {
    if (!user?.id) return alert("You must be logged in to save.");
    const { data, error } = await saveSupplier(user.id, supplier);
    if (error) {
      console.error("[SuppliersPage] saveSupplier failed:", error);
      alert("Failed to save supplier: " + (error.message || "Unknown error"));
      return;
    }
    setSuppliers(prev => {
      const idx = prev.findIndex(s => s.id === data.id);
      if (idx >= 0) { const u = [...prev]; u[idx] = data; return u; }
      return [data, ...prev];
    });
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
      alert("Failed to delete: " + (error.message || "Unknown error"));
      return;
    }
    setSuppliers(prev => prev.filter(x => x.id !== sup.id));
  };

  const openNew  = () => { setEditingSupplier(null); setShowForm(true); };
  const openEdit = (s) => { setEditingSupplier(s); setShowForm(true); };
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
    <div style={{ padding:"clamp(14px,4vw,28px) clamp(12px,4vw,32px)", maxWidth:1100, background:T.pageBg, minHeight:"100vh", fontFamily:ff }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, marginBottom:20, flexWrap:"wrap" }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, color:T.heading, margin:"0 0 3px" }}>Suppliers</h1>
          <p style={{ color:T.muted, fontSize:12, margin:0 }}>
            {totalSuppliers} supplier{totalSuppliers !== 1 ? "s" : ""} · manage suppliers and CIS subcontractors
          </p>
        </div>
        <Btn onClick={openNew} variant="primary" icon={<Icons.Plus />}>New Supplier</Btn>
      </div>

      {/* Metric cards */}
      {totalSuppliers > 0 && (
        <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
          <MetricCard label="Active"             value={metrics.count}         color={T.heading} />
          <MetricCard label="CIS Subcontractors" value={metrics.cisCount}      color="#d97706" />
          <MetricCard label="VAT Registered"     value={metrics.vatCount}      color="#1d4ed8" />
          <MetricCard label="Inactive"           value={metrics.inactiveCount} color={T.faint} />
        </div>
      )}

      {/* Main card */}
      <div style={{ background:T.cardBg, borderRadius:T.cardRadius, border:T.cardBorder, boxShadow:T.cardShadow, overflow:"hidden" }}>
        {/* Toolbar */}
        <div style={{ padding:"10px 16px", borderBottom:T.toolbarBorder, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:7, flex:1, minWidth:140, border:"1px solid #e8e8ec", borderRadius:8, padding:"7px 10px", background:"#f9fafb" }}>
            <span style={{ color:T.faint, display:"flex", flexShrink:0 }}><Icons.Search /></span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, email, UTR, VAT number…"
              style={{ flex:1, border:"none", outline:"none", fontSize:13, color:T.heading, background:"transparent", fontFamily:ff }}
            />
            {search && (
              <button onClick={() => setSearch("")}
                style={{ background:"none", border:"none", cursor:"pointer", color:T.faint, fontSize:16, padding:0, lineHeight:1, display:"flex" }}>×</button>
            )}
          </div>
          <select value={filter} onChange={e => setFilter(e.target.value)}
            style={{ padding:"8px 10px", border:"1px solid #dbe4ee", borderRadius:10, fontSize:12, background:"#fff", fontFamily:ff }}>
            <option value="all">All Active</option>
            <option value="cis">CIS Subcontractors</option>
            <option value="vat">VAT Registered</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Table */}
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:820 }}>
            <thead>
              <tr style={{ background:T.theadBg, borderBottom:T.toolbarBorder }}>
                {[
                  { label:"Supplier", align:"left"  },
                  { label:"Type",     align:"left"  },
                  { label:"Contact",  align:"left"  },
                  { label:"CIS",      align:"left"  },
                  { label:"VAT",      align:"center"},
                  { label:"Bills",    align:"right" },
                  { label:"Status",   align:"left"  },
                  { label:"",         align:"right" },
                ].map(({ label, align }) => (
                  <th key={label} style={{
                    padding:"8px 16px", textAlign:align,
                    fontSize:10, fontWeight:700, color:T.faint,
                    textTransform:"uppercase", letterSpacing:"0.07em", whiteSpace:"nowrap",
                  }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding:"60px 24px", textAlign:"center" }}>
                    {totalSuppliers === 0 ? (
                      <>
                        <div style={{ fontSize:36, marginBottom:12 }}>🚚</div>
                        <div style={{ fontSize:15, fontWeight:700, color:T.heading, marginBottom:6 }}>No suppliers yet</div>
                        <div style={{ fontSize:13, color:T.muted, marginBottom:20 }}>Add your first supplier or CIS subcontractor to start tracking payables</div>
                        <Btn variant="primary" icon={<Icons.Plus />} onClick={openNew}>New Supplier</Btn>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize:28, marginBottom:10 }}>🔍</div>
                        <div style={{ fontSize:14, fontWeight:600, color:T.heading, marginBottom:5 }}>No suppliers match your filters</div>
                        <Btn variant="outline" onClick={() => { setSearch(""); setFilter("all"); }}>Clear filters</Btn>
                      </>
                    )}
                  </td>
                </tr>
              ) : filtered.map(s => {
                const billData = billsBySupplier[s.id];
                const cisRateLabel = s.cis?.is_subcontractor
                  ? (CIS_RATES_SUPPLIER.find(r => r.value === s.cis.rate)?.label || s.cis.rate)
                  : null;
                const cisColor = s.cis?.rate === "gross_0"
                  ? { bg: "#d1fae5", color: "#059669" }
                  : s.cis?.rate === "standard_20"
                  ? { bg: "#fef3c7", color: "#d97706" }
                  : s.cis?.rate === "unverified_30"
                  ? { bg: "#fee2e2", color: "#dc2626" }
                  : null;

                return (
                  <tr key={s.id}
                    style={{ borderBottom:T.rowBorder, transition:"background 0.1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = T.rowHover}
                    onMouseLeave={e => e.currentTarget.style.background = ""}>
                    {/* Identity */}
                    <td style={{ padding:T.cellPad, minWidth:180 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <SupplierAvatar name={s.name} />
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:600, color:T.heading, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                            {s.name}
                          </div>
                          {s.legal_name && s.legal_name !== s.name && (
                            <div style={{ fontSize:11, color:T.muted, marginTop:1 }}>{s.legal_name}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* Type */}
                    <td style={{ padding:T.cellPad, whiteSpace:"nowrap" }}>
                      <StatusBadge status={s.type || "Business"} />
                    </td>
                    {/* Contact */}
                    <td style={{ padding:T.cellPad, minWidth:160 }}>
                      {s.email && (
                        <div style={{ fontSize:13, color:T.body, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:200 }}>
                          {s.email}
                        </div>
                      )}
                      {s.phone && (
                        <div style={{ fontSize:11, color:T.muted, marginTop:1 }}>{formatPhoneNumber(s.phone)}</div>
                      )}
                    </td>
                    {/* CIS */}
                    <td style={{ padding:T.cellPad, whiteSpace:"nowrap" }}>
                      {cisRateLabel && cisColor ? (
                        <span style={{ fontSize:11, fontWeight:700, background:cisColor.bg, color:cisColor.color, padding:"3px 8px", borderRadius:6 }}>
                          {cisRateLabel}
                        </span>
                      ) : (
                        <span style={{ fontSize:13, color:T.faint }}>—</span>
                      )}
                    </td>
                    {/* VAT */}
                    <td style={{ padding:T.cellPad, textAlign:"center" }}>
                      {s.is_vat_registered ? (
                        <span style={{ color:"#059669", fontSize:16, fontWeight:700 }}>✓</span>
                      ) : (
                        <span style={{ fontSize:13, color:T.faint }}>—</span>
                      )}
                    </td>
                    {/* Bills */}
                    <td style={{ padding:T.cellPad, textAlign:"right", whiteSpace:"nowrap" }}>
                      {billData ? (
                        <div>
                          <div style={{ fontSize:13, fontWeight:600, color:T.heading, fontVariantNumeric:"tabular-nums" }}>
                            {fmt(currSym, billData.total)}
                          </div>
                          <div style={{ fontSize:10, color:T.muted }}>{billData.count} bill{billData.count !== 1 ? "s" : ""}</div>
                        </div>
                      ) : (
                        <span style={{ fontSize:13, color:T.faint }}>—</span>
                      )}
                    </td>
                    {/* Status */}
                    <td style={{ padding:T.cellPad, whiteSpace:"nowrap" }}>
                      <StatusBadge status={s.is_active !== false ? "Active" : "Inactive"} />
                    </td>
                    {/* Actions */}
                    <td style={{ padding:T.cellPad, textAlign:"right", whiteSpace:"nowrap" }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", gap:4 }}>
                        <button onClick={() => openEdit(s)} title="Edit supplier"
                          style={{ background:"none", border:`1px solid ${T.actionBorder}`, borderRadius:6, padding:"5px 7px", cursor:"pointer", color:T.muted, display:"flex", alignItems:"center", transition:"all 0.12s" }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor="#1e6be0"; e.currentTarget.style.color="#1e6be0"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor=T.actionBorder; e.currentTarget.style.color=T.muted; }}>
                          <Icons.Edit />
                        </button>
                        <button onClick={() => onDelete(s)} title="Delete supplier"
                          style={{ background:"none", border:`1px solid ${T.actionBorder}`, borderRadius:6, padding:"5px 7px", cursor:"pointer", color:T.muted, display:"flex", alignItems:"center", transition:"all 0.12s" }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor="#fecaca"; e.currentTarget.style.color=T.negative; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor=T.actionBorder; e.currentTarget.style.color=T.muted; }}>
                          <Icons.Trash />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {filtered.length > 0 && totalSuppliers > 0 && (
          <div style={{ padding:"8px 16px", borderTop:T.toolbarBorder, fontSize:11, color:T.faint, textAlign:"right" }}>
            {hasSearch ? `${filtered.length} of ${totalSuppliers}` : totalSuppliers} supplier{totalSuppliers !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
