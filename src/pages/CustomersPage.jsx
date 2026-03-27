import { useState, useContext } from "react";
import { ff } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Btn, Tag } from "../components/atoms";
import { upsert, formatPhoneNumber } from "../utils/helpers";
import CustomerForm from "../modals/CustomerModal";

export default function CustomersPage({ initialShowForm = false, onNavigate }) {
  const { customers, setCustomers, orgSettings, invoices, quotes } = useContext(AppCtx);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [showForm, setShowForm] = useState(initialShowForm);
  const [search, setSearch] = useState("");

  const deleteCustomer = (c) => {
    const invCount = (invoices||[]).filter(i => i.customer?.id === c.id).length;
    const qCount   = (quotes||[]).filter(q => q.customer?.id === c.id).length;
    const linked   = invCount + qCount;
    const msg = linked > 0
      ? `"${c.name}" is linked to ${linked} invoice/quote(s). Deleting will not remove those records, but the customer will no longer appear in lookups.\n\nDelete anyway?`
      : `Delete "${c.name}"? This cannot be undone.`;
    if (window.confirm(msg)) setCustomers(p => p.filter(x => x.id !== c.id));
  };

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const onSave = c => {
    setCustomers(p => upsert(p, c));
    if (initialShowForm && onNavigate) { onNavigate("customers"); return; }
    setShowForm(false);
    setEditingCustomer(null);
  };
  
  if (showForm) {
    return (
      <CustomerForm
        existing={editingCustomer}
        customers={customers}
        onClose={() => {
          if (initialShowForm && onNavigate) { onNavigate("customers"); return; }
          setShowForm(false);
          setEditingCustomer(null);
        }}
        onSave={onSave}
        settings={{ cis: { enabled: orgSettings?.cisReg === "Yes" } }}
      />
    );
  }

  return (
    <div style={{ padding:"clamp(14px,4vw,28px) clamp(12px,4vw,32px)", maxWidth:1100, background:"#f4f5f7", minHeight:"100vh", fontFamily:ff }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, color:"#1a1a2e", margin:"0 0 3px" }}>Customers</h1>
          <p style={{ color:"#6b7280", fontSize:12, margin:0 }}>{customers.length} total</p>
        </div>
        <Btn onClick={()=> { setEditingCustomer(null); setShowForm(true); }} variant="primary" icon={<Icons.Plus />}>New Customer</Btn>
      </div>

      <div style={{ background:"#fff", borderRadius:10, border:"1px solid #e8e8ec", boxShadow:"0 1px 3px rgba(0,0,0,0.04)", overflowX:"auto" }}>
        <div style={{ padding:"11px 16px", borderBottom:"1px solid #f0f0f4", display:"flex", alignItems:"center", gap:9 }}>
          <Icons.Search />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search customers…"
            style={{ flex:1, border:"none", outline:"none", fontSize:13, color:"#1a1a2e", background:"transparent", fontFamily:ff }} />
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:500 }}>
          <thead>
            <tr style={{ background:"#f9fafb" }}>
              {["Name","Type","Email","Phone","Currency","",""] .map(h=>(
                <th key={h} style={{ padding:"8px 18px", textAlign:"left", fontSize:10, fontWeight:700, color:"#6b7280", textTransform:"uppercase", letterSpacing:"0.06em", borderBottom:"1px solid #f0f0f4" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(c=>(
              <tr key={c.id} style={{ borderBottom:"1px solid #f3f4f6" }}
                onMouseEnter={e=>e.currentTarget.style.background="#f9fafb"}
                onMouseLeave={e=>e.currentTarget.style.background=""}>
                <td style={{ padding:"12px 18px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:30, height:30, borderRadius:"50%", background:"#e8f0fc", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:12, color:"#374151" }}>{c.name[0]}</div>
                    <span style={{ fontSize:13, fontWeight:600, color:"#1a1a2e" }}>{c.name}</span>
                  </div>
                </td>
                <td style={{ padding:"12px 18px" }}><Tag color={c.type==="Business"?"#1e6be0":"#d97706"}>{c.type}</Tag></td>
                <td style={{ padding:"12px 18px", fontSize:13, color:"#374151" }}>{c.email}</td>
                <td style={{ padding:"12px 18px", fontSize:13, color:"#6b7280" }}>{formatPhoneNumber(c.phone)}</td>
                <td style={{ padding:"12px 18px", fontSize:13, color:"#6b7280" }}>{c.currency}</td>
                <td style={{ padding:"12px 18px" }}>
                  <Btn onClick={() => { setEditingCustomer(c); setShowForm(true); }} variant="ghost" size="sm" icon={<Icons.Edit />}>Edit</Btn>
                </td>
                <td style={{ padding:"12px 18px" }}>
                  <Btn onClick={() => deleteCustomer(c)} variant="ghost" size="sm" style={{ color:"#dc2626" }}>Delete</Btn>
                </td>
              </tr>
            ))}
            {filtered.length===0 && (
              <tr><td colSpan={6} style={{ padding:"40px 18px", textAlign:"center", color:"#CCC", fontSize:13 }}>No customers found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
