import { useState, useMemo, useContext } from "react";
import { ff } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Btn, Tag } from "../components/atoms";
import { upsert, formatPhoneNumber, fmt } from "../utils/helpers";
import { CUR_SYM } from "../constants";
import CustomerForm from "../modals/CustomerModal";

// ─── STYLE TOKENS ─────────────────────────────────────────────────────────────
const col = {
  border:    "1px solid #e8e8ec",
  rowHover:  "#f8faff",
  muted:     "#6b7280",
  label:     "#9ca3af",
  heading:   "#1a1a2e",
  subtext:   "#6b7280",
  positive:  "#059669",
  negative:  "#dc2626",
  neutral:   "#374151",
};

// Deterministic avatar background per name initial
const AVATAR_PALETTES = [
  { bg:"#eff6ff", fg:"#1d4ed8" },
  { bg:"#fef3c7", fg:"#92400e" },
  { bg:"#f0fdf4", fg:"#166534" },
  { bg:"#fdf4ff", fg:"#7e22ce" },
  { bg:"#fff1f2", fg:"#be123c" },
  { bg:"#f0f9ff", fg:"#0369a1" },
  { bg:"#fafaf9", fg:"#44403c" },
];

const avatarPalette = (name = "") => {
  const idx = name.charCodeAt(0) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[idx];
};

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, color = col.heading }) {
  return (
    <div style={{ background:"#fff", border:col.border, borderRadius:10, padding:"14px 18px", flex:"1 1 140px", minWidth:0 }}>
      <div style={{ fontSize:11, fontWeight:700, color:col.label, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:5 }}>
        {label}
      </div>
      <div style={{ fontSize:18, fontWeight:800, color, fontVariantNumeric:"tabular-nums", lineHeight:1.2 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize:11, color:col.muted, marginTop:3 }}>{sub}</div>}
    </div>
  );
}

function Avatar({ name }) {
  const { bg, fg } = avatarPalette(name);
  return (
    <div style={{
      width:34, height:34, borderRadius:"50%",
      background:bg, color:fg,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontWeight:700, fontSize:13, flexShrink:0,
      fontFamily:ff,
    }}>
      {(name || "?")[0].toUpperCase()}
    </div>
  );
}

function EmptyState({ isFiltered, onReset, onCreate }) {
  if (isFiltered) {
    return (
      <tr>
        <td colSpan={7} style={{ padding:"52px 24px", textAlign:"center" }}>
          <div style={{ fontSize:28, marginBottom:10 }}>🔍</div>
          <div style={{ fontSize:14, fontWeight:600, color:col.heading, marginBottom:4 }}>No customers match your search</div>
          <div style={{ fontSize:12, color:col.muted, marginBottom:16 }}>Try a different name or email address</div>
          <Btn variant="outline" onClick={onReset}>Clear search</Btn>
        </td>
      </tr>
    );
  }
  return (
    <tr>
      <td colSpan={7} style={{ padding:"64px 24px", textAlign:"center" }}>
        <div style={{ fontSize:36, marginBottom:12 }}>👥</div>
        <div style={{ fontSize:15, fontWeight:700, color:col.heading, marginBottom:6 }}>No customers yet</div>
        <div style={{ fontSize:13, color:col.muted, marginBottom:20 }}>Add your first customer to start creating invoices</div>
        <Btn variant="primary" icon={<Icons.Plus />} onClick={onCreate}>New Customer</Btn>
      </td>
    </tr>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function CustomersPage({ initialShowForm = false, onNavigate }) {
  const { customers, setCustomers, orgSettings, invoices, quotes, payments } = useContext(AppCtx);
  const currSym = CUR_SYM[orgSettings?.currency || "GBP"] || "£";

  const [editingCustomer, setEditingCustomer] = useState(null);
  const [showForm,        setShowForm]        = useState(initialShowForm);
  const [search,          setSearch]          = useState("");

  // ─── handlers (unchanged logic) ───────────────────────────────────────────
  const deleteCustomer = (c) => {
    const invCount = (invoices||[]).filter(i => i.customer?.id === c.id).length;
    const qCount   = (quotes||[]).filter(q => q.customer?.id === c.id).length;
    const linked   = invCount + qCount;
    const msg = linked > 0
      ? `"${c.name}" is linked to ${linked} invoice/quote(s). Deleting will not remove those records, but the customer will no longer appear in lookups.\n\nDelete anyway?`
      : `Delete "${c.name}"? This cannot be undone.`;
    if (window.confirm(msg)) setCustomers(p => p.filter(x => x.id !== c.id));
  };

  const onSave = (c) => {
    setCustomers(p => upsert(p, c));
    if (initialShowForm && onNavigate) { onNavigate("customers"); return; }
    setShowForm(false);
    setEditingCustomer(null);
  };

  const openNew  = () => { setEditingCustomer(null); setShowForm(true); };
  const openEdit = (c) => { setEditingCustomer(c); setShowForm(true); };
  const closeForm = () => {
    if (initialShowForm && onNavigate) { onNavigate("customers"); return; }
    setShowForm(false);
    setEditingCustomer(null);
  };

  // ─── filtered list ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return customers;
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  }, [customers, search]);

  // ─── summary metrics (derived from real data) ─────────────────────────────
  const metrics = useMemo(() => {
    let totalInvoiced = 0, totalCollected = 0;
    for (const c of customers) {
      const custInvoices  = (invoices||[]).filter(i => i.customer?.id === c.id);
      const custIds       = new Set(custInvoices.map(i => i.id));
      totalInvoiced  += custInvoices.reduce((s, i) => s + Number(i.total || 0), 0);
      totalCollected += (payments||[]).filter(p => custIds.has(p.invoice_id)).reduce((s, p) => s + Number(p.amount || 0), 0);
    }
    return {
      count:       customers.length,
      invoiced:    totalInvoiced,
      collected:   totalCollected,
      outstanding: Math.max(0, totalInvoiced - totalCollected),
    };
  }, [customers, invoices, payments]);

  // ─── form (full-page, unchanged) ──────────────────────────────────────────
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

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ padding:"clamp(14px,4vw,28px) clamp(12px,4vw,32px)", maxWidth:1100, background:"#f4f5f7", minHeight:"100vh", fontFamily:ff }}>

      {/* ── Header ── */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, marginBottom:20, flexWrap:"wrap" }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, color:col.heading, margin:"0 0 3px" }}>Customers</h1>
          <p style={{ color:col.muted, fontSize:12, margin:0 }}>
            {customers.length} customer{customers.length !== 1 ? "s" : ""} · manage your client relationships
          </p>
        </div>
        <Btn onClick={openNew} variant="primary" icon={<Icons.Plus />}>New Customer</Btn>
      </div>

      {/* ── Summary strip ── */}
      {customers.length > 0 && (
        <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
          <MetricCard label="Total Customers" value={metrics.count} sub="in your CRM" />
          <MetricCard label="Total Invoiced"  value={fmt(currSym, metrics.invoiced)}   color="#1e6be0" sub="all time" />
          <MetricCard label="Collected"       value={fmt(currSym, metrics.collected)}  color={col.positive} sub="payments received" />
          <MetricCard label="Outstanding"     value={fmt(currSym, metrics.outstanding)} color={metrics.outstanding > 0 ? col.negative : col.positive} sub="balance due" />
        </div>
      )}

      {/* ── Main card ── */}
      <div style={{ background:"#fff", borderRadius:12, border:col.border, boxShadow:"0 1px 4px rgba(0,0,0,0.05)", overflow:"hidden" }}>

        {/* Toolbar */}
        <div style={{ padding:"11px 16px", borderBottom:"1px solid #f0f0f4", display:"flex", alignItems:"center", gap:9 }}>
          <span style={{ color:col.label, display:"flex", flexShrink:0 }}><Icons.Search /></span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            style={{ flex:1, border:"none", outline:"none", fontSize:13, color:col.heading, background:"transparent", fontFamily:ff }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{ background:"none", border:"none", cursor:"pointer", color:col.label, fontSize:13, padding:"2px 6px", borderRadius:4, fontFamily:ff }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:600 }}>
            <thead>
              <tr style={{ background:"#f9fafb", borderBottom:"1px solid #f0f0f4" }}>
                {[
                  { label:"Customer",   align:"left"  },
                  { label:"Type",       align:"left"  },
                  { label:"Contact",    align:"left"  },
                  { label:"Invoiced",   align:"right" },
                  { label:"Collected",  align:"right" },
                  { label:"Outstanding",align:"right" },
                  { label:"",           align:"right" },
                ].map(({ label, align }) => (
                  <th key={label} style={{
                    padding:"8px 16px",
                    textAlign:align,
                    fontSize:10,
                    fontWeight:700,
                    color:col.label,
                    textTransform:"uppercase",
                    letterSpacing:"0.07em",
                    whiteSpace:"nowrap",
                  }}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <EmptyState
                  isFiltered={search.length > 0}
                  onReset={() => setSearch("")}
                  onCreate={openNew}
                />
              ) : filtered.map(c => {
                const custInvoices   = (invoices||[]).filter(i => i.customer?.id === c.id);
                const custIds        = new Set(custInvoices.map(i => i.id));
                const totalInvoiced  = custInvoices.reduce((s, i) => s + Number(i.total || 0), 0);
                const totalCollected = (payments||[]).filter(p => custIds.has(p.invoice_id)).reduce((s, p) => s + Number(p.amount || 0), 0);
                const outstanding    = Math.max(0, totalInvoiced - totalCollected);
                const hasActivity    = totalInvoiced > 0;

                return (
                  <tr
                    key={c.id}
                    style={{ borderBottom:"1px solid #f3f4f6", transition:"background 0.1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = col.rowHover}
                    onMouseLeave={e => e.currentTarget.style.background = ""}
                  >
                    {/* Identity */}
                    <td style={{ padding:"12px 16px", minWidth:180 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <Avatar name={c.name} />
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:600, color:col.heading, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                            {c.name}
                          </div>
                          {c.company && c.company !== c.name && (
                            <div style={{ fontSize:11, color:col.muted, marginTop:1 }}>{c.company}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td style={{ padding:"12px 16px", whiteSpace:"nowrap" }}>
                      <Tag color={c.type === "Business" ? "#111110" : "#D97706"}>{c.type || "Individual"}</Tag>
                    </td>

                    {/* Contact */}
                    <td style={{ padding:"12px 16px", minWidth:160 }}>
                      {c.email && (
                        <div style={{ fontSize:12, color:col.neutral, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:200 }}>
                          {c.email}
                        </div>
                      )}
                      {c.phone && (
                        <div style={{ fontSize:11, color:col.muted, marginTop:1 }}>
                          {formatPhoneNumber(c.phone)}
                        </div>
                      )}
                    </td>

                    {/* Financials */}
                    <td style={{ padding:"12px 16px", textAlign:"right", whiteSpace:"nowrap" }}>
                      <span style={{ fontSize:13, fontWeight:hasActivity ? 600 : 400, color: hasActivity ? col.heading : col.label, fontVariantNumeric:"tabular-nums" }}>
                        {hasActivity ? fmt(currSym, totalInvoiced) : "—"}
                      </span>
                    </td>
                    <td style={{ padding:"12px 16px", textAlign:"right", whiteSpace:"nowrap" }}>
                      <span style={{ fontSize:13, fontWeight: totalCollected > 0 ? 600 : 400, color: totalCollected > 0 ? col.positive : col.label, fontVariantNumeric:"tabular-nums" }}>
                        {totalCollected > 0 ? fmt(currSym, totalCollected) : "—"}
                      </span>
                    </td>
                    <td style={{ padding:"12px 16px", textAlign:"right", whiteSpace:"nowrap" }}>
                      {outstanding > 0 ? (
                        <span style={{ fontSize:13, fontWeight:700, color:col.negative, fontVariantNumeric:"tabular-nums" }}>
                          {fmt(currSym, outstanding)}
                        </span>
                      ) : hasActivity ? (
                        <span style={{ fontSize:12, color:col.positive, fontWeight:600 }}>Settled</span>
                      ) : (
                        <span style={{ fontSize:12, color:col.label }}>—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding:"12px 16px", textAlign:"right", whiteSpace:"nowrap" }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", gap:4 }}>
                        <button
                          onClick={() => openEdit(c)}
                          title="Edit customer"
                          style={{ background:"none", border:"1px solid #e8e8ec", borderRadius:6, padding:"5px 8px", cursor:"pointer", color:col.muted, display:"flex", alignItems:"center", transition:"all 0.15s" }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = "#1e6be0"; e.currentTarget.style.color = "#1e6be0"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = "#e8e8ec"; e.currentTarget.style.color = col.muted; }}
                        >
                          <Icons.Edit />
                        </button>
                        <button
                          onClick={() => deleteCustomer(c)}
                          title="Delete customer"
                          style={{ background:"none", border:"1px solid #e8e8ec", borderRadius:6, padding:"5px 8px", cursor:"pointer", color:col.muted, display:"flex", alignItems:"center", transition:"all 0.15s" }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = "#fecaca"; e.currentTarget.style.color = col.negative; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = "#e8e8ec"; e.currentTarget.style.color = col.muted; }}
                        >
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

        {/* Footer count */}
        {filtered.length > 0 && customers.length > 0 && (
          <div style={{ padding:"9px 16px", borderTop:"1px solid #f0f0f4", fontSize:11, color:col.label, textAlign:"right" }}>
            {search ? `${filtered.length} of ${customers.length}` : customers.length} customer{customers.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
