import { useState, useContext } from "react";
import { ff } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Btn, Tag, Switch, InfoBox } from "../components/atoms";
import { fmt } from "../utils/helpers";
import ItemForm from "../modals/ItemModal";

export default function ItemsPage() {
  const { orgSettings, catalogItems, setCatalogItems } = useContext(AppCtx);
  const isVat = orgSettings?.vatReg === "Yes";
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [search, setSearch] = useState("");

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
    setShowForm(false);
    setEditingItem(null);
  };

  const toggleActive = id => setCatalogItems(p => p.map(i => i.id===id ? {...i, active:!i.active} : i));

  const typeColors = { Service:"#4F46E5", Labour:"#D97706", Material:"#059669", Equipment:"#2563EB", Other:"#6B7280" };

  if (showForm) return (
    <ItemForm
      existing={editingItem}
      onClose={() => { setShowForm(false); setEditingItem(null); }}
      onSave={onSave}
    />
  );
  
  return (
    <div style={{ padding:"clamp(14px,4vw,28px) clamp(12px,4vw,32px)", maxWidth:1100, fontFamily:ff }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:"#1A1A1A", margin:"0 0 3px" }}>Items</h1>
          <p style={{ color:"#AAA", fontSize:13, margin:0 }}>Products and services you sell</p>
        </div>
        <Btn onClick={() => { setEditingItem(null); setShowForm(true); }} variant="primary" icon={<Icons.Plus />}>New Item</Btn>
      </div>

      {!isVat && (
        <div style={{ marginBottom:14 }}>
          <InfoBox color="#D97706">Your organisation is not VAT registered. VAT rates are hidden on all items.</InfoBox>
        </div>
      )}

      <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e8e8ec", boxShadow:"0 1px 3px rgba(0,0,0,0.04)", overflowX:"auto" }}>
        <div style={{ padding:"11px 16px", borderBottom:"1px solid #F0F0F0", display:"flex", alignItems:"center", gap:9 }}>
          <Icons.Search />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search items…"
            style={{ flex:1, border:"none", outline:"none", fontSize:13, color:"#1A1A1A", background:"transparent", fontFamily:ff }} />
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:500 }}>
          <thead>
            <tr style={{ background:"#FAFAFA" }}>
              {["Name","Type","Rate","Unit",...(isVat?["VAT"]:[]),"CIS","Status",""].map(h=>(
                <th key={h} style={{ padding:"8px 18px", textAlign:h==="Rate"?"right":"left", fontSize:10, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em", borderBottom:"1px solid #F0F0F0" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(item=>(
              <tr key={item.id} style={{ borderBottom:"1px solid #F7F7F7" }}
                onMouseEnter={e=>e.currentTarget.style.background="#FAFAFA"}
                onMouseLeave={e=>e.currentTarget.style.background=""}>
                <td style={{ padding:"12px 18px" }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#1A1A1A" }}>{item.name}</div>
                  <div style={{ fontSize:11, color:"#AAA", marginTop:1 }}>{item.description}</div>
                </td>
                <td style={{ padding:"12px 18px" }}><Tag color={typeColors[item.type]||"#888"}>{item.type||"—"}</Tag></td>
                <td style={{ padding:"12px 18px", fontSize:13, fontWeight:700, color:"#1A1A1A", textAlign:"right" }}>{fmt("£",item.rate)}</td>
                <td style={{ padding:"12px 18px", fontSize:13, color:"#888" }}>{item.unit}</td>
                {isVat && <td style={{ padding:"12px 18px", fontSize:13, color:"#888" }}>{item.taxRate}%</td>}
                <td style={{ padding:"12px 18px" }}>
                  {item.cisApplicable
                    ? <Tag color="#D97706">CIS {item.cisLabourRate||"20%"}</Tag>
                    : <span style={{ fontSize:12, color:"#CCC" }}>—</span>}
                </td>
                <td style={{ padding:"12px 18px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                    <Switch checked={item.active} onChange={()=>toggleActive(item.id)} />
                    <span style={{ fontSize:12, color:item.active?"#16A34A":"#9CA3AF" }}>{item.active?"Active":"Inactive"}</span>
                  </div>
                </td>
                <td style={{ padding:"12px 18px" }}>
                  <Btn onClick={() => { setEditingItem(item); setShowForm(true); }} variant="ghost" size="sm" icon={<Icons.Edit />}>Edit</Btn>
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
