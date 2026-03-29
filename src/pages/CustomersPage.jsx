import { useState, useContext } from "react";
import { ff } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Btn } from "../components/atoms";
import { moduleUi, ModulePageHeader, ModuleToolbar, ModuleStatsRow, ModuleTableCard, SearchInput, EmptyStatePanel, StatusBadge } from "../components/shared/moduleListUI";
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
    <div style={moduleUi.pageCanvas}>
      <div style={{ ...moduleUi.page, fontFamily:ff }}>
        <div style={moduleUi.sectionStack}>
      <ModulePageHeader
        title="Customers"
        subtitle="Track customer details, invoicing performance, and collections."
        count={customers.length}
        right={<Btn onClick={()=> { setEditingCustomer(null); setShowForm(true); }} variant="primary" icon={<Icons.Plus />}>New Customer</Btn>}
      />

      <ModuleStatsRow
        items={[
          { label:"Total Customers", value:customers.length, color:"#0f172a" },
          { label:"Total Invoiced", value:fmt(currSym, totalInvoicedAll), color:"#1d4ed8" },
          { label:"Collected", value:fmt(currSym, totalCollectedAll), color:"#059669" },
          { label:"Outstanding", value:fmt(currSym, totalOutstandingAll), color: totalOutstandingAll > 0 ? "#dc2626" : "#059669" },
        ]}
      />
      
      <ModuleToolbar
        search={<SearchInput value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search customers…" ariaLabel="Search customers" />}
        filters={<div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} style={{ padding:"8px 10px", border:"1px solid #dbe4ee", borderRadius:10, fontSize:12, background:"#fff", fontFamily:ff }}>
            {["All","Business","Individual"].map(v => <option key={v}>{v}</option>)}
          </select>
          {hasFilters && <Btn variant="ghost" size="sm" onClick={()=>{ setSearch(""); setTypeFilter("All"); }}>Clear filters</Btn>}
        </div>}
      />

      <<ModuleTableCard minWidth={620} stickyHeader>
          <thead>
             <tr style={{ ...moduleUi.tableHead, ...moduleUi.stickyHead }}>
              {["Name","Customer Type","Phone","Currency","Invoiced","Collected","Outstanding","",""] .map(h=>(
                <th key={h} style={{ ...moduleUi.th, textAlign:["Invoiced","Collected","Outstanding"].includes(h) ? "right" : "left" }}>{h}</th>
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
              <tr key={c.id} style={moduleUi.rowHover}
                onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
                onMouseLeave={e=>e.currentTarget.style.background=""}>
                <td style={moduleUi.td}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:30, height:30, borderRadius:"50%", background:"#FEF3C7", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:12, color:"#92400E" }}>{c.name[0]}</div>
                     <div>
                      <div style={moduleUi.primaryText}>{c.name}</div>
                      <div style={moduleUi.secondaryText}>{c.email || "No email on file"}</div>
                    </div>
                  </div>
                </td>
                 <td style={moduleUi.td}><StatusBadge status={c.type || "Individual"} /></td>
                <td style={{ ...moduleUi.td, ...moduleUi.secondaryText, fontSize:12 }}>{formatPhoneNumber(c.phone) || "—"}</td>
                <td style={{ ...moduleUi.td, ...moduleUi.secondaryText, fontSize:12 }}>{c.currency || "—"}</td>
                <td style={{ ...moduleUi.td, ...moduleUi.moneyCell }}>{fmt(currSym, totalInvoiced)}</td>
                <td style={{ ...moduleUi.td, ...moduleUi.moneyCell, color:"#059669" }}>{fmt(currSym, totalCollected)}</td>
                <td style={{ ...moduleUi.td, ...moduleUi.moneyCell, color:totalOutstanding > 0 ? "#DC2626" : "#059669" }}>{fmt(currSym, totalOutstanding)}</td>
                <td style={moduleUi.td}><Btn onClick={() => { setEditingCustomer(c); setShowForm(true); }} variant="ghost" size="sm" icon={<Icons.Edit />} /></td>
                <td style={moduleUi.td}><Btn onClick={() => deleteCustomer(c)} variant="ghost" size="sm" icon={<Icons.Trash />} style={{ color:"#dc2626" }} /></td>
              </tr>
              );
            })}
            {filtered.length===0 && (
              <tr><td colSpan={9}><EmptyStatePanel icon={<Icons.Customers />} title={customers.length===0 ? "No customers yet" : "No matching customers"} message={customers.length===0 ? "Add your first customer to begin invoicing." : "No customers match your current search or filters."} cta={customers.length===0 ? <Btn variant="primary" onClick={()=> { setEditingCustomer(null); setShowForm(true); }}>New Customer</Btn> : <Btn variant="outline" onClick={()=>{setSearch(""); setTypeFilter("All");}}>Clear filters</Btn>} /></td></tr>
            )}
          </tbody>
      </ModuleTableCard>
        </div>
      </div>
    </div>
  );
}
