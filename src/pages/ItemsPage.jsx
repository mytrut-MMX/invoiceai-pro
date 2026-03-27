import { useState, useContext } from "react";
import { ff } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Btn, Tag, Switch, InfoBox } from "../components/atoms";
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
    <div style={{ padding:"clamp(14px,4vw,28px) clamp(12px,4vw,32px)", maxWidth:1100, background:"#f4f5f7", minHeight:"100vh", fontFamily:ff }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, color:"#1a1a2e", margin:"0 0 3px" }}>Items</h1>
          <p style={{ color:"#6b7280", fontSize:13, margin:0 }}>Products and services you sell</p>
        </div>
        <Btn onClick={() => { setEditingItem(null); setShowForm(true); }} variant="primary" icon={<Icons.Plus />}>New Item</Btn>
      </div>

      {!isVat && (
        <div style={{ marginBottom:14 }}>
          <InfoBox color="#D97706">Your organisation is not VAT registered. VAT rates are hidden on all items.</InfoBox>
        </div>
      )}

      <div style={{ background:"#fff", borderRadius:10, border:"1px solid #e8e8ec", boxShadow:"0 1px 3px rgba(0,0,0,0.04)", overflowX:"auto" }}>
        <div style={{ padding:"11px 16px", borderBottom:"1px solid #e8e8ec", display:"flex", alignItems:"center", gap:9 }}>
          <Icons.Search />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search items…"
            style={{ flex:1, border:"none", outline:"none", fontSize:13, color:"#1a1a2e", background:"transparent", fontFamily:ff }} />
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:500 }}>
          <thead>
            <tr style={{ background:"#f9fafb" }}>
              {["Name","Type","Rate","Unit",...(isVat?["VAT"]:[]),"CIS","Status","",""].map(h=>(
                <th key={h} style={{ padding:"8px 18px", textAlign:h==="Rate"?"right":"left", fontSize:10, fontWeight:700, color:"#6b7280", textTransform:"uppercase", letterSpacing:"0.06em", borderBottom:"1px solid #e8e8ec" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(item=>(
             <tr key={item.id}
                onClick={() => { setEditingItem(item); setShowForm(true); }}
                style={{ borderBottom:"1px solid #f3f4f6", cursor:"pointer" }}
                onMouseEnter={e=>e.currentTarget.style.background="#f9fafb"}
                onMouseLeave={e=>e.currentTarget.style.background=""}>
                <td style={{ padding:"12px 18px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    {item.photo
                      ? <img src={item.photo} alt="" style={{ width:30, height:30, borderRadius:"50%", objectFit:"cover", flexShrink:0 }} />
                      : <div style={{ width:30, height:30, borderRadius:"50%", background:typeAvatars[item.type]||"#e5e7eb", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:12, color:typeColors[item.type]||"#6b7280", flexShrink:0 }}>{(item.type||"—")[0]}</div>
                    }
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e" }}>{item.name}</div>
                      <div style={{ fontSize:11, color:"#6b7280", marginTop:1 }}>{item.description}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding:"12px 18px" }}><Tag color={typeColors[item.type]||"#6b7280"}>{item.type||"—"}</Tag></td>
                <td style={{ padding:"12px 18px", fontSize:13, fontWeight:700, color:"#1a1a2e", textAlign:"right" }}>{fmt("£",item.rate)}</td>
                <td style={{ padding:"12px 18px", fontSize:13, color:"#6b7280" }}>{item.unit}</td>
                {isVat && <td style={{ padding:"12px 18px", fontSize:13, color:"#6b7280" }}>{item.taxRate}%</td>}
                <td style={{ padding:"12px 18px" }}>
                 {isCisOrg && item.cis?.enabled
                    ? <Tag color="#D97706">CIS {item.cis?.labour ?? 100}% labour</Tag>
                    : <span style={{ fontSize:12, color:"#CCC" }}>—</span>}
                </td>
                <td style={{ padding:"12px 18px" }} onClick={e=>e.stopPropagation()}>
                  <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                    <Switch checked={item.active} onChange={()=>toggleActive(item.id)} />
                    <span style={{ fontSize:12, color:item.active?"#16A34A":"#9CA3AF" }}>{item.active?"Active":"Inactive"}</span>
                  </div>
                </td>
                <td style={{ padding:"12px 18px" }} onClick={e=>e.stopPropagation()}>
                  <Btn onClick={() => { setEditingItem(item); setShowForm(true); }} variant="ghost" size="sm" icon={<Icons.Edit />}>Edit</Btn>
                </td>
                <td style={{ padding:"12px 18px" }} onClick={e=>e.stopPropagation()}>
                  <Btn onClick={() => deleteItem(item)} variant="ghost" size="sm" style={{ color:"#dc2626" }}>Delete</Btn>
                </td>
              </tr>
            ))}
            {filtered.length===0 && (
              <tr><td colSpan={8} style={{ padding:"40px 18px", textAlign:"center", color:"#CCC", fontSize:13 }}>No items. Click "New Item" to add one.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      
    </div>
  );
}
