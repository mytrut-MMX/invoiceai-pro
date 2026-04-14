import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../router/routes";
import { ff } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Btn, Tag, Switch, InfoBox } from "../components/atoms";
import { moduleUi, ModuleHeader, SearchInput, EmptyState, StatusBadge } from "../components/shared/moduleListUI";
import { fmt } from "../utils/helpers";
import ItemForm from "../modals/ItemModal";
import { deleteCatalogItem } from "../lib/dataAccess";

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
    const linked = [...(invoices||[]), ...(quotes||[])].filter(doc =>
      (doc.line_items||doc.items||[]).some(li => li.itemId === item.id || li.name === item.name)
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
      const i = p.findIndex(x=>x.id===item.id);
      if(i>=0){ const u=[...p]; u[i]=item; return u; }
      return [...p, item];
    });
    if (initialShowForm) { navigate(ROUTES.ITEMS, { replace: true }); return; }
    setShowForm(false);
    setEditingItem(null);
  };

  const toggleActive = id => setCatalogItems(p => p.map(i => i.id===id ? {...i, active:!i.active} : i));

  const typeColors = { Service:"#1e6be0", Labour:"#d97706", Material:"#059669", Equipment:"#0891b2", Other:"#6b7280" };
  const typeAvatars = { Service:"#e8f0fc", Labour:"#fef3c7", Material:"#d1fae5", Equipment:"#cffafe", Other:"#e5e7eb" };
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
    <div style={moduleUi.pageCanvas}>
      <div style={{ ...moduleUi.page, fontFamily:ff }}>
        <div style={moduleUi.sectionStack}>
      <ModuleHeader
        title="Items"
        helper="Manage products and services with rates, VAT, CIS and active status."
        right={<Btn onClick={() => { setEditingItem(null); setShowForm(true); }} variant="primary" icon={<Icons.Plus />}>New Item</Btn>}
      />
      <div style={moduleUi.summaryGrid}>
        {[
          { label:"Total Items", value:catalogItems.length, color:"#0f172a" },
          { label:"Active Items", value:activeItems, color:"#059669" },
          { label:"Services", value:servicesCount, color:"#1d4ed8" },
          { label:"Materials", value:materialsCount, color:"#0f766e" },
        ].map(card => (
          <div key={card.label} style={moduleUi.summaryCard}>
            <div style={{ fontSize:11, textTransform:"uppercase", letterSpacing:"0.06em", color:"#94a3b8", fontWeight:700 }}>{card.label}</div>
            <div style={{ fontSize:20, marginTop:4, fontWeight:800, color:card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {!isVat && <div style={{ marginTop:12 }}><InfoBox color="#D97706">Your organisation is not VAT registered. VAT rates are hidden on all items.</InfoBox></div>}

      <div style={moduleUi.toolbar}>
        <SearchInput value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search items…" />
      <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} style={{ padding:"8px 10px", border:"1px solid #dbe4ee", borderRadius:10, fontSize:12, background:"#fff", fontFamily:ff }}>
            {["All",...Object.keys(typeColors)].map(v => <option key={v}>{v}</option>)}
          </select>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{ padding:"8px 10px", border:"1px solid #dbe4ee", borderRadius:10, fontSize:12, background:"#fff", fontFamily:ff }}>
            {["All","Active","Inactive"].map(v => <option key={v}>{v}</option>)}
          </select>
          {hasFilters && <Btn variant="ghost" size="sm" onClick={()=>{ setSearch(""); setTypeFilter("All"); setStatusFilter("All"); }}>Clear filters</Btn>}
        </div>
      </div>

      <div style={{ ...moduleUi.card, overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:680 }}>
          <thead>
            <tr style={moduleUi.tableHead}>
              {["Name","Type","Rate","Unit",...(isVat?["VAT"]:[]),"CIS","Status","",""] .map(h=>(
                <th key={h} style={{ ...moduleUi.th, textAlign:h==="Rate"?"right":"left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(item=>(
             <tr key={item.id} onClick={() => { setEditingItem(item); setShowForm(true); }} style={{ ...moduleUi.rowHover, cursor:"pointer" }} onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"} onMouseLeave={e=>e.currentTarget.style.background=""}>
                <td style={moduleUi.td}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    {item.photo
                      ? <img src={item.photo} alt="" style={{ width:30, height:30, borderRadius:"50%", objectFit:"cover", flexShrink:0 }} />
                      : <div style={{ width:30, height:30, borderRadius:"50%", background:typeAvatars[item.type]||"#e5e7eb", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:12, color:typeColors[item.type]||"#6b7280", flexShrink:0 }}>{(item.type||"—")[0]}</div>
                    }
                    <div>
                      <div style={moduleUi.primaryText}>{item.name}</div>
                      <div style={moduleUi.secondaryText}>{item.description}</div>
                    </div>
                  </div>
                </td>
                <td style={moduleUi.td}><Tag color={typeColors[item.type]||"#6b7280"}>{item.type||"—"}</Tag></td>
                <td style={{ ...moduleUi.td, ...moduleUi.moneyCell }}>{fmt("£",item.rate)}</td>
                <td style={moduleUi.td}>{item.unit}</td>
                {isVat && <td style={moduleUi.td}>{item.taxRate}%</td>}
                <td style={moduleUi.td}>{isCisOrg && item.cis?.enabled ? <Tag color="#D97706">CIS {item.cis?.labour ?? 100}% labour</Tag> : <span style={{ fontSize:12, color:"#94a3b8" }}>—</span>}</td>
                <td style={moduleUi.td} onClick={e=>e.stopPropagation()}>
                  <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                    <Switch checked={item.active} onChange={()=>toggleActive(item.id)} />
                    <span style={{ fontSize:12, color:item.active?"#16A34A":"#94a3b8" }}>{item.active?"Active":"Inactive"}</span>
                  </div>
                </td>
                <td style={moduleUi.td} onClick={e=>e.stopPropagation()}><Btn onClick={() => { setEditingItem(item); setShowForm(true); }} variant="ghost" size="sm" icon={<Icons.Edit />} /></td>
                <td style={moduleUi.td} onClick={e=>e.stopPropagation()}><Btn onClick={() => deleteItem(item)} variant="ghost" size="sm" icon={<Icons.Trash />} style={{ color:"#dc2626" }} /></td>
              </tr>
            ))}
            {filtered.length===0 && (
              <tr><td colSpan={9}><EmptyState icon={<Icons.Items />} text={catalogItems.length===0 ? "No items yet. Create one to start pricing invoices and quotes." : "No items match your current search or filters."} cta={catalogItems.length===0 ? <Btn onClick={() => { setEditingItem(null); setShowForm(true); }} variant="primary">New Item</Btn> : <Btn variant="outline" onClick={()=>{ setSearch(""); setTypeFilter("All"); setStatusFilter("All"); }}>Clear filters</Btn>} /></td></tr>
            )}
          </tbody>
        </table>
      </div>
        </div>
      </div>
    </div>
  );
}
