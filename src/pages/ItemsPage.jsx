import { useState, useContext } from "react";
import { ff } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Btn, Tag, Switch, InfoBox } from "../components/atoms";
import { moduleUi, ModuleHeader, SearchInput, EmptyState } from "../components/shared/moduleListUI";
import { fmt } from "../utils/helpers";
import ItemForm from "../modals/ItemModal";

export default function ItemsPage({ initialShowForm = false, onNavigate }) {
  const { orgSettings, catalogItems, setCatalogItems, invoices, quotes } = useContext(AppCtx);
  const isVat = orgSettings?.vatReg === "Yes";
  const isCisOrg = orgSettings?.cisReg === "Yes";
  const [showForm, setShowForm] = useState(initialShowForm);
  const [editingItem, setEditingItem] = useState(null);
  const [search, setSearch] = useState("");

  const deleteItem = (item) => {
    const linked = [...(invoices||[]), ...(quotes||[])].filter(doc =>
      (doc.line_items||doc.items||[]).some(li => li.itemId === item.id || li.name === item.name)
    ).length;
    const msg = linked > 0
      ? `"${item.name}" is used in ${linked} invoice/quote(s). Deleting will not remove those records.\n\nDelete anyway?`
      : `Delete "${item.name}"? This cannot be undone.`;
    if (window.confirm(msg)) setCatalogItems(p => p.filter(x => x.id !== item.id));
  };

  const filtered = catalogItems.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.description.toLowerCase().includes(search.toLowerCase())
  );

  const onSave = item => {
    setCatalogItems(p => {
      const i = p.findIndex(x=>x.id===item.id);
      if(i>=0){ const u=[...p]; u[i]=item; return u; }
      return [...p, item];
    });
    if (initialShowForm && onNavigate) { onNavigate("items"); return; }
    setShowForm(false);
    setEditingItem(null);
  };

  const toggleActive = id => setCatalogItems(p => p.map(i => i.id===id ? {...i, active:!i.active} : i));

  const typeColors = { Service:"#1e6be0", Labour:"#d97706", Material:"#059669", Equipment:"#0891b2", Other:"#6b7280" };
  const typeAvatars = { Service:"#e8f0fc", Labour:"#fef3c7", Material:"#d1fae5", Equipment:"#cffafe", Other:"#e5e7eb" };

  if (showForm) return (
    <ItemForm
      existing={editingItem}
      items={catalogItems}
      onClose={() => {
        if (initialShowForm && onNavigate) { onNavigate("items"); return; }
        setShowForm(false); setEditingItem(null);
      }}
      onSave={onSave}
      settings={{ cis: { enabled: orgSettings?.cisReg === "Yes" } }}
    />
  );
  
  return (
    <div style={{ ...moduleUi.page, minHeight:"100vh", background:"#f8fafc", fontFamily:ff }}>
      <ModuleHeader
        title="Items"
        helper={`${catalogItems.length} items · products and services with rates, VAT, CIS and active status.`}
        right={<Btn onClick={() => { setEditingItem(null); setShowForm(true); }} variant="primary" icon={<Icons.Plus />}>New Item</Btn>}
      />

      {!isVat && <div style={{ marginTop:12 }}><InfoBox color="#D97706">Your organisation is not VAT registered. VAT rates are hidden on all items.</InfoBox></div>}

      <div style={moduleUi.toolbar}>
        <SearchInput value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search items…" />
      </div>

      <div style={{ ...moduleUi.card, overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:680 }}>cv
          <thead>
            <tr style={moduleUi.tableHead}>
              {["Name","Type","Rate","Unit",...(isVat?["VAT"]:[]),"CIS","Status","",""] .map(h=>(
                <th key={h} style={{ ...moduleUi.th, textAlign:h==="Rate"?"right":"left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(item=>(
             <tr key={item.id} onClick={() => { setEditingItem(item); setShowForm(true); }} style={{ borderBottom:"1px solid #f1f5f9", cursor:"pointer" }} onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"} onMouseLeave={e=>e.currentTarget.style.background=""}>
                <td style={moduleUi.td}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    {item.photo
                      ? <img src={item.photo} alt="" style={{ width:30, height:30, borderRadius:"50%", objectFit:"cover", flexShrink:0 }} />
                      : <div style={{ width:30, height:30, borderRadius:"50%", background:typeAvatars[item.type]||"#e5e7eb", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:12, color:typeColors[item.type]||"#6b7280", flexShrink:0 }}>{(item.type||"—")[0]}</div>
                    }
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:"#0f172a" }}>{item.name}</div>
                      <div style={{ fontSize:11, color:"#64748b", marginTop:1 }}>{item.description}</div>
                    </div>
                  </div>
                </td>
                <td style={moduleUi.td}><Tag color={typeColors[item.type]||"#6b7280"}>{item.type||"—"}</Tag></td>
                <td style={{ ...moduleUi.td, fontWeight:700, color:"#0f172a", textAlign:"right" }}>{fmt("£",item.rate)}</td>
                <td style={moduleUi.td}>{item.unit}</td>
                {isVat && <td style={moduleUi.td}>{item.taxRate}%</td>}
                <td style={moduleUi.td}>{isCisOrg && item.cis?.enabled ? <Tag color="#D97706">CIS {item.cis?.labour ?? 100}% labour</Tag> : <span style={{ fontSize:12, color:"#94a3b8" }}>—</span>}</td>
                <td style={moduleUi.td} onClick={e=>e.stopPropagation()}>
                  <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                    <Switch checked={item.active} onChange={()=>toggleActive(item.id)} />
                    <span style={{ fontSize:12, color:item.active?"#16A34A":"#94a3b8" }}>{item.active?"Active":"Inactive"}</span>
                  </div>
                </td>
                <td style={moduleUi.td} onClick={e=>e.stopPropagation()}><Btn onClick={() => { setEditingItem(item); setShowForm(true); }} variant="ghost" size="sm" icon={<Icons.Edit />}>Edit</Btn></td>
                <td style={moduleUi.td} onClick={e=>e.stopPropagation()}><Btn onClick={() => deleteItem(item)} variant="ghost" size="sm" style={{ color:"#dc2626" }}>Delete</Btn></td>
              </tr>
            ))}
            {filtered.length===0 && (
              <tr><td colSpan={9}><EmptyState icon={<Icons.Items />} text="No items found. Create one to add pricing to invoices and quotes." cta={<Btn onClick={() => { setEditingItem(null); setShowForm(true); }} variant="primary">New Item</Btn>} /></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
