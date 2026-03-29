import { useState, useContext } from "react";
import { ff } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Btn, Tag } from "../components/atoms";
import { moduleUi, ModuleHeader, SearchInput, EmptyState } from "../components/shared/moduleListUI";
import { upsert, formatPhoneNumber, fmt } from "../utils/helpers";
import { CUR_SYM } from "../constants";
import CustomerForm from "../modals/CustomerModal";

export default function CustomersPage({ initialShowForm = false, onNavigate }) {
  const { customers, setCustomers, orgSettings, invoices, quotes, payments } = useContext(AppCtx);
  const currSym = CUR_SYM[orgSettings?.currency || "GBP"] || "£";
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [showForm, setShowForm] = useState(initialShowForm);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");

  const deleteCustomer = (c) => {
    const invCount = (invoices||[]).filter(i => i.customer?.id === c.id).length;
    const qCount   = (quotes||[]).filter(q => q.customer?.id === c.id).length;
    const linked   = invCount + qCount;
    const msg = linked > 0
      ? `"${c.name}" is linked to ${linked} invoice/quote(s). Deleting will not remove those records, but the customer will no longer appear in lookups.\n\nDelete anyway?`
      : `Delete "${c.name}"? This cannot be undone.`;
    if (window.confirm(msg)) setCustomers(p => p.filter(x => x.id !== c.id));
  };

  const filtered = customers.filter(c => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "All" || c.type === typeFilter;
    return matchSearch && matchType;
  });
  const totalInvoicedAll = (invoices || []).reduce((s, i) => s + Number(i.total || 0), 0);
  const totalCollectedAll = (payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalOutstandingAll = Math.max(0, totalInvoicedAll - totalCollectedAll);
  const hasFilters = search || typeFilter !== "All";

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
    <div style={{ ...moduleUi.page, minHeight:"100vh", background:"#f8fafc", fontFamily:ff }}>
      <ModuleHeader
        title="Customers"
        helper="Track customer details, invoicing performance, and collections."
        right={<Btn onClick={()=> { setEditingCustomer(null); setShowForm(true); }} variant="primary" icon={<Icons.Plus />}>New Customer</Btn>}
      />

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))", gap:12, marginTop:14, marginBottom:14 }}>
        {[
          { label:"Total Customers", value:customers.length, color:"#0f172a" },
          { label:"Total Invoiced", value:fmt(currSym, totalInvoicedAll), color:"#1d4ed8" },
          { label:"Collected", value:fmt(currSym, totalCollectedAll), color:"#059669" },
          { label:"Outstanding", value:fmt(currSym, totalOutstandingAll), color: totalOutstandingAll > 0 ? "#dc2626" : "#059669" },
        ].map(card => (
          <div key={card.label} style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, padding:"12px 14px" }}>
            <div style={{ fontSize:11, textTransform:"uppercase", letterSpacing:"0.06em", color:"#94a3b8", fontWeight:700 }}>{card.label}</div>
            <div style={{ fontSize:20, marginTop:4, fontWeight:800, color:card.color }}>{card.value}</div>
          </div>
        ))}
      </div>
      
      <div style={moduleUi.toolbar}>
        <SearchInput value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search customers…" />
      <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} style={{ padding:"8px 10px", border:"1px solid #dbe4ee", borderRadius:10, fontSize:12, background:"#fff", fontFamily:ff }}>
            {["All","Business","Individual"].map(v => <option key={v}>{v}</option>)}
          </select>
          {hasFilters && <Btn variant="ghost" size="sm" onClick={()=>{ setSearch(""); setTypeFilter("All"); }}>Clear filters</Btn>}
        </div>
      </div>

      <div style={{ ...moduleUi.card, overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:620 }}>
          <thead>
            <tr style={moduleUi.tableHead}>
              {["Name","Type","Email","Phone","Currency","Invoiced","Collected","Outstanding","",""] .map(h=>(
                <th key={h} style={{ ...moduleUi.th, textAlign:"left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(c=>{
              const custInvoices = (invoices||[]).filter(i => i.customer?.id === c.id);
              const custInvoiceIds = new Set(custInvoices.map(i => i.id));
              const totalInvoiced   = custInvoices.reduce((s,i) => s + Number(i.total||0), 0);
              const totalCollected  = (payments||[]).filter(p => custInvoiceIds.has(p.invoice_id)).reduce((s,p) => s + Number(p.amount||0), 0);
              const totalOutstanding = Math.max(0, totalInvoiced - totalCollected);
              return (
              <tr key={c.id} style={{ borderBottom:"1px solid #f1f5f9" }}
                onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
                onMouseLeave={e=>e.currentTarget.style.background=""}>
                <td style={moduleUi.td}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:30, height:30, borderRadius:"50%", background:"#FEF3C7", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:12, color:"#92400E" }}>{c.name[0]}</div>
                    <span style={{ fontSize:13, fontWeight:600, color:"#0f172a" }}>{c.name}</span>
                  </div>
                </td>
                 <td style={moduleUi.td}><Tag color={c.type==="Business"?"#334155":"#b45309"}>{c.type}</Tag></td>
                <td style={moduleUi.td}>{c.email}</td>
                <td style={moduleUi.td}>{formatPhoneNumber(c.phone)}</td>
                <td style={moduleUi.td}>{c.currency}</td>
                <td style={{ ...moduleUi.td, fontWeight:700, color:"#0f172a", textAlign:"right" }}>{fmt(currSym, totalInvoiced)}</td>
                <td style={{ ...moduleUi.td, fontWeight:700, color:"#059669", textAlign:"right" }}>{fmt(currSym, totalCollected)}</td>
                <td style={{ ...moduleUi.td, fontWeight:700, color:totalOutstanding > 0 ? "#DC2626" : "#059669", textAlign:"right" }}>{fmt(currSym, totalOutstanding)}</td>
                <td style={moduleUi.td}><Btn onClick={() => { setEditingCustomer(c); setShowForm(true); }} variant="ghost" size="sm" icon={<Icons.Edit />} /></td>
                <td style={moduleUi.td}><Btn onClick={() => deleteCustomer(c)} variant="ghost" size="sm" icon={<Icons.Trash />} style={{ color:"#dc2626" }} /></td>
              </tr>
              );
            })}
            {filtered.length===0 && (
              <tr><td colSpan={10}><EmptyState icon={<Icons.Customers />} text={customers.length===0 ? "No customers yet. Add your first customer to begin invoicing." : "No customers match your current search or filters."} cta={customers.length===0 ? <Btn variant="primary" onClick={()=> { setEditingCustomer(null); setShowForm(true); }}>New Customer</Btn> : <Btn variant="outline" onClick={()=>{setSearch(""); setTypeFilter("All");}}>Clear filters</Btn>} /></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
