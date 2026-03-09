import { useState, useContext } from "react";
import { ff } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Btn, Tag } from "../components/atoms";
import { upsert } from "../utils/helpers";
import CustomerModal from "../modals/CustomerModal";

export default function CustomersPage() {
  const { customers, setCustomers } = useContext(AppCtx);
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const onSave = c => setCustomers(p => upsert(p, c));

  return (
    <div style={{ padding:"clamp(14px,4vw,28px) clamp(12px,4vw,32px)", maxWidth:1100, fontFamily:ff }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:"#1A1A1A", margin:"0 0 3px" }}>Customers</h1>
          <p style={{ color:"#AAA", fontSize:13, margin:0 }}>{customers.length} total</p>
        </div>
        <Btn onClick={()=>setModal({ mode:"new" })} variant="primary" icon={<Icons.Plus />}>New Customer</Btn>
      </div>

      <div style={{ background:"#fff", borderRadius:14, border:"1px solid #EBEBEB", overflowX:"auto" }}>
        <div style={{ padding:"11px 16px", borderBottom:"1px solid #F0F0F0", display:"flex", alignItems:"center", gap:9 }}>
          <Icons.Search />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search customers…"
            style={{ flex:1, border:"none", outline:"none", fontSize:13, color:"#1A1A1A", background:"transparent", fontFamily:ff }} />
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:500 }}>
          <thead>
            <tr style={{ background:"#FAFAFA" }}>
              {["Name","Type","Email","Phone","Currency",""].map(h=>(
                <th key={h} style={{ padding:"8px 18px", textAlign:"left", fontSize:10, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em", borderBottom:"1px solid #F0F0F0" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(c=>(
              <tr key={c.id} style={{ borderBottom:"1px solid #F7F7F7" }}
                onMouseEnter={e=>e.currentTarget.style.background="#FAFAFA"}
                onMouseLeave={e=>e.currentTarget.style.background=""}>
                <td style={{ padding:"12px 18px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:30, height:30, borderRadius:"50%", background:"#F0F0F0", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:12, color:"#555" }}>{c.name[0]}</div>
                    <span style={{ fontSize:13, fontWeight:600, color:"#1A1A1A" }}>{c.name}</span>
                  </div>
                </td>
                <td style={{ padding:"12px 18px" }}><Tag color={c.type==="Business"?"#4F46E5":"#EA580C"}>{c.type}</Tag></td>
                <td style={{ padding:"12px 18px", fontSize:13, color:"#555" }}>{c.email}</td>
                <td style={{ padding:"12px 18px", fontSize:13, color:"#888" }}>{c.phone}</td>
                <td style={{ padding:"12px 18px", fontSize:13, color:"#888" }}>{c.currency}</td>
                <td style={{ padding:"12px 18px" }}>
                  <Btn onClick={()=>setModal({ mode:"edit", customer:c })} variant="ghost" size="sm" icon={<Icons.Edit />}>Edit</Btn>
                </td>
              </tr>
            ))}
            {filtered.length===0 && (
              <tr><td colSpan={6} style={{ padding:"40px 18px", textAlign:"center", color:"#CCC", fontSize:13 }}>No customers found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <CustomerModal
          existing={modal.mode==="edit" ? modal.customer : null}
          onClose={()=>setModal(null)}
          onSave={onSave}
        />
      )}
    </div>
  );
}
