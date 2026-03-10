import { useState, useRef, useEffect, useContext } from "react";
import { ff, TAX_RATES, CUR_SYM, PDF_TEMPLATES, PAYMENT_METHODS, STATUS_COLORS } from "../../constants";
import { AppCtx } from "../../context/AppContext";
import { Icons } from "../icons";
import { Field, Input, Select, Btn, Tag } from "../atoms";
import { fmt, fmtDate, newLine, todayStr } from "../../utils/helpers";

// ─── LINE ITEMS TABLE ─────────────────────────────────────────────────────────
export function LineItemsTable({ items, onChange, currSymbol, catalogItems, isVat, onAddNewItem }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");

  const upd = (id, f, v) => onChange(items.map(it => {
    if(it.id!==id) return it;
    const u = {...it, [f]:v};
    u.amount = Number(u.quantity) * Number(u.rate);
    return u;
  }));

  const addBlank = () => onChange([...items, newLine(items.length)]);
  const del = id => items.length>1 && onChange(items.filter(i=>i.id!==id));

  const activeItems = (catalogItems||[]).filter(i=>i.active);
  const filteredCat = activeItems.filter(i =>
    !pickerSearch ||
    i.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
    (i.description||"").toLowerCase().includes(pickerSearch.toLowerCase())
  );

  const cols = isVat ? "1fr 68px 84px 76px 74px 28px" : "1fr 68px 90px 80px 28px";
  const headers = isVat
    ? [["Description","left"],["Qty","center"],[`Rate (${currSymbol})`,"right"],["VAT","center"],["Amount","right"],["",""]]
    : [["Description","left"],["Qty","center"],[`Rate (${currSymbol})`,"right"],["Amount","right"],["",""]];

  return (
    <div>
      {/* Catalogue picker dropdown */}
      {activeItems.length > 0 && (
        <div style={{ position:"relative", marginBottom:10 }}>
          <div style={{ padding:"9px 12px", background:"#F9F9F9", borderRadius:8, border:"1px solid #EBEBEB", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontSize:12, color:"#888" }}>Quick-add from items catalogue</span>
            <Btn onClick={()=>{ setPickerOpen(o=>!o); setPickerSearch(""); }} variant="outline" size="sm" icon={<Icons.Items />}>Browse Items</Btn>
          </div>
          {pickerOpen && (
            <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, background:"#fff", border:"1.5px solid #1A1A1A", borderRadius:10, padding:12, boxShadow:"0 8px 24px rgba(0,0,0,0.12)", zIndex:400 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ fontSize:12, fontWeight:700, color:"#1A1A1A" }}>Select Item to Add</span>
                <button onClick={()=>setPickerOpen(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"#AAA" }}><Icons.X /></button>
              </div>
              <input value={pickerSearch} onChange={e=>setPickerSearch(e.target.value)} placeholder="Search items…" autoFocus
                style={{ width:"100%", padding:"7px 10px", border:"1.5px solid #E0E0E0", borderRadius:7, fontSize:13, fontFamily:ff, outline:"none", marginBottom:8, boxSizing:"border-box" }} />
              <div style={{ maxHeight:220, overflowY:"auto" }}>
                {filteredCat.length===0 && <div style={{ padding:"14px 0", textAlign:"center", color:"#CCC", fontSize:13 }}>No matching items</div>}
                {filteredCat.map(ci=>(
                  <button key={ci.id} onClick={()=>{
                    const descText = ci.description ? `${ci.name} — ${ci.description}` : ci.name;
                    const newItem = { id:crypto.randomUUID(), description:descText, quantity:1, rate:ci.rate, tax_rate:isVat?(ci.taxRate||20):0, amount:ci.rate, sort_order:items.length };
                    onChange([...items, newItem]);
                    setPickerOpen(false); setPickerSearch("");
                  }}
                    style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 10px", background:"none", border:"none", cursor:"pointer", borderRadius:7, textAlign:"left", fontFamily:ff }}
                    onMouseEnter={e=>e.currentTarget.style.background="#F5F5F5"}
                    onMouseLeave={e=>e.currentTarget.style.background="none"}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:"#1A1A1A" }}>{ci.name}</div>
                      {ci.description && <div style={{ fontSize:11, color:"#AAA", marginTop:1 }}>{ci.description}</div>}
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0, marginLeft:12 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:"#1A1A1A" }}>{fmt(currSymbol, ci.rate)}</div>
                      <div style={{ fontSize:11, color:"#AAA" }}>{ci.unit}{isVat?` · ${ci.taxRate}% VAT`:""}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Table headers */}
      <div style={{ display:"grid", gridTemplateColumns:cols, gap:6, paddingBottom:8, borderBottom:"1.5px solid #EBEBEB", marginBottom:8 }}>
        {headers.map(([h,a])=><div key={h} style={{ fontSize:10, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em", textAlign:a }}>{h}</div>)}
      </div>

      {/* Rows */}
      {items.map((it,idx)=>(
        <div key={it.id} style={{ display:"grid", gridTemplateColumns:cols, gap:6, marginBottom:6, alignItems:"center" }}>
          <Input value={it.description} onChange={v=>upd(it.id,"description",v)} placeholder={`Item ${idx+1}…`} />
          <Input value={it.quantity} onChange={v=>upd(it.id,"quantity",v)} type="number" align="center" />
          <Input value={it.rate} onChange={v=>upd(it.id,"rate",v)} type="number" align="right" />
          {isVat && (
            <select value={it.tax_rate} onChange={e=>upd(it.id,"tax_rate",Number(e.target.value))}
              style={{ padding:"8px 4px", border:"1.5px solid #E0E0E0", borderRadius:7, fontSize:13, fontFamily:ff, background:"#FAFAFA", outline:"none", appearance:"none", textAlign:"center", cursor:"pointer", width:"100%" }}>
              {TAX_RATES.map(r=><option key={r} value={r}>{r}%</option>)}
            </select>
          )}
          <div style={{ textAlign:"right", fontSize:13, fontWeight:700, color:"#1A1A1A" }}>{fmt(currSymbol, it.amount)}</div>
          <button onClick={()=>del(it.id)} disabled={items.length===1}
            style={{ width:26, height:26, border:"none", background:"none", cursor:items.length===1?"not-allowed":"pointer", color:"#DDD", display:"flex", alignItems:"center", justifyContent:"center" }}
            onMouseEnter={e=>{ if(items.length>1) e.currentTarget.style.color="#DC2626"; }}
            onMouseLeave={e=>e.currentTarget.style.color="#DDD"}>
            <Icons.Trash />
          </button>
        </div>
      ))}

      {/* Add line item buttons */}
      <div style={{ display:"flex", gap:8, marginTop:8 }}>
        <Btn onClick={addBlank} variant="ghost" size="sm" icon={<Icons.Plus />} style={{ color:"#E86C4A" }}>Add Line Item</Btn>
        {onAddNewItem && (
          <Btn onClick={onAddNewItem} variant="ghost" size="sm" icon={<Icons.Items />} style={{ color:"#4F46E5" }}>Create New Item</Btn>
        )}
      </div>
    </div>
  );
}

// ─── TOTALS BLOCK ─────────────────────────────────────────────────────────────
export function TotalsBlock({ subtotal, discountType, discountValue, setDiscountType, setDiscountValue, shipping, setShipping, taxBreakdown, total, currSymbol, isVat, cisDeduction }) {
  const discAmt = discountType==="percent" ? subtotal*(Number(discountValue)/100) : Math.min(Number(discountValue), subtotal);
  const R = ({ label, value, color }) => (
    <div style={{ display:"flex", justifyContent:"space-between", padding:"5px 0" }}>
      <span style={{ fontSize:13, color:color||"#666" }}>{label}</span>
      <span style={{ fontSize:13, color:color||"#444", fontWeight:500 }}>{value}</span>
    </div>
  );
  return (
    <div style={{ background:"#FAFAFA", borderRadius:10, border:"1px solid #EBEBEB", padding:"14px 16px", minWidth:260 }}>
      <R label="Subtotal" value={fmt(currSymbol, subtotal)} />
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0" }}>
        <span style={{ fontSize:13, color:"#666" }}>Discount</span>
        <div style={{ display:"flex", gap:5, alignItems:"center" }}>
          <div style={{ display:"flex", border:"1.5px solid #E0E0E0", borderRadius:6, overflow:"hidden" }}>
            {[["percent","%"],["fixed",currSymbol]].map(([t,l])=>(
              <button key={t} onClick={()=>setDiscountType(t)}
                style={{ padding:"3px 8px", border:"none", background:discountType===t?"#1A1A1A":"transparent", color:discountType===t?"#fff":"#999", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:ff }}>{l}</button>
            ))}
          </div>
          <input value={discountValue} onChange={e=>setDiscountValue(e.target.value)} type="number" min="0"
            style={{ width:62, padding:"4px 6px", border:"1.5px solid #E0E0E0", borderRadius:6, fontSize:13, textAlign:"right", fontFamily:ff, background:"#fff", outline:"none" }} />
        </div>
      </div>
      {discAmt>0 && <R label="" value={`− ${fmt(currSymbol, discAmt)}`} color="#E86C4A" />}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0" }}>
        <span style={{ fontSize:13, color:"#666" }}>Shipping</span>
        <input value={shipping} onChange={e=>setShipping(e.target.value)} type="number" min="0" placeholder="0.00"
          style={{ width:86, padding:"4px 6px", border:"1.5px solid #E0E0E0", borderRadius:6, fontSize:13, textAlign:"right", fontFamily:ff, background:"#fff", outline:"none" }} />
      </div>
      {isVat && taxBreakdown.map(tb=><R key={tb.rate} label={`VAT ${tb.rate}%`} value={fmt(currSymbol, tb.amount)} />)}
      {cisDeduction>0 && <R label="CIS Deduction" value={`− ${fmt(currSymbol, cisDeduction)}`} color="#D97706" />}
      <div style={{ display:"flex", justifyContent:"space-between", padding:"9px 0 2px", borderTop:"2px solid #1A1A1A", marginTop:6 }}>
        <span style={{ fontSize:14, fontWeight:800, color:"#1A1A1A" }}>Total Due</span>
        <span style={{ fontSize:16, fontWeight:800, color:"#1A1A1A" }}>{fmt(currSymbol, total)}</span>
      </div>
      {cisDeduction>0 && (
        <div style={{ display:"flex", justifyContent:"space-between", padding:"3px 0", marginTop:2 }}>
          <span style={{ fontSize:11, color:"#AAA" }}>Gross (before CIS)</span>
          <span style={{ fontSize:11, color:"#AAA" }}>{fmt(currSymbol, total+cisDeduction)}</span>
        </div>
      )}
    </div>
  );
}

// ─── SAVE SPLIT BUTTON ────────────────────────────────────────────────────────
export function SaveSplitBtn({ onSave, onSaveAndSend, onSaveAndPrint, saving }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(()=>{
    const h = e=>{ if(ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return ()=>document.removeEventListener("mousedown", h);
  },[]);
  return (
    <div ref={ref} style={{ position:"relative", display:"flex" }}>
      <button onClick={()=>{ onSave(); setOpen(false); }} disabled={saving}
        style={{ padding:"8px 14px", background:"#1A1A1A", color:"#fff", border:"none", borderRight:"1px solid rgba(255,255,255,0.15)", borderRadius:"8px 0 0 8px", fontSize:13, fontWeight:700, cursor:saving?"not-allowed":"pointer", fontFamily:ff, display:"flex", alignItems:"center", gap:6, opacity:saving?0.6:1 }}>
        <Icons.Save />{saving?"Saving…":"Save"}
      </button>
      <button onClick={()=>setOpen(o=>!o)} disabled={saving}
        style={{ padding:"8px 9px", background:"#1A1A1A", color:"#fff", border:"none", borderRadius:"0 8px 8px 0", fontSize:13, cursor:saving?"not-allowed":"pointer", display:"flex", alignItems:"center", opacity:saving?0.6:1 }}>
        <Icons.ChevDown />
      </button>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", right:0, background:"#fff", border:"1.5px solid #E0E0E0", borderRadius:9, boxShadow:"0 8px 24px rgba(0,0,0,0.12)", minWidth:160, zIndex:500, overflow:"hidden" }}>
          {[
            { label:"Save",         icon:<Icons.Save />,    action:onSave },
            { label:"Save & Send",  icon:<Icons.Send />,    action:onSaveAndSend },
            { label:"Save & Print", icon:<Icons.Receipt />, action:onSaveAndPrint },
          ].map(item=>(
            <button key={item.label} onClick={()=>{ item.action(); setOpen(false); }}
              style={{ width:"100%", padding:"10px 14px", background:"none", border:"none", display:"flex", alignItems:"center", gap:9, fontSize:13, fontWeight:600, color:"#1A1A1A", cursor:"pointer", fontFamily:ff, textAlign:"left" }}
              onMouseEnter={e=>e.currentTarget.style.background="#F7F7F5"}
              onMouseLeave={e=>e.currentTarget.style.background="none"}>
              <span style={{ color:"#888" }}>{item.icon}</span>{item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PAID CONFIRM MODAL ───────────────────────────────────────────────────────
export function PaidConfirmModal({ invoice, onConfirm, onCancel }) {
  const { customPayMethods } = useContext(AppCtx);
  const allMethods = [...PAYMENT_METHODS, ...(customPayMethods||[])];
  const [payDate, setPayDate] = useState(todayStr());
  const [payMethod, setPayMethod] = useState("Bank Transfer");
  const [payRef, setPayRef] = useState("");
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:3000, padding:16 }}>
      <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:420, boxShadow:"0 20px 60px rgba(0,0,0,0.18)", fontFamily:ff, overflow:"hidden" }}>
        <div style={{ background:"#F0FDF4", padding:"18px 22px 14px", borderBottom:"1px solid #BBF7D0" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:38, height:38, borderRadius:"50%", background:"#16A34A", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff" }}><Icons.Check /></div>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:"#15803D" }}>Mark as Paid</div>
              <div style={{ fontSize:12, color:"#16A34A", marginTop:1 }}>{invoice.invoice_number} · {fmt(CUR_SYM[invoice.currency]||"£", invoice.total)}</div>
            </div>
          </div>
        </div>
        <div style={{ padding:"18px 22px", display:"flex", flexDirection:"column", gap:13 }}>
          <p style={{ margin:0, fontSize:13, color:"#555", lineHeight:1.6 }}>Confirm payment details. A record will be automatically added to <strong>Payments Received</strong>.</p>
          <Field label="Payment Date" required>
            <input value={payDate} onChange={e=>setPayDate(e.target.value)} type="date"
              style={{ width:"100%", padding:"9px 10px", border:"1.5px solid #E0E0E0", borderRadius:8, fontSize:13, fontFamily:ff, outline:"none", boxSizing:"border-box" }} />
          </Field>
          <Field label="Payment Method" required>
            <Select value={payMethod} onChange={setPayMethod} options={allMethods} />
          </Field>
          <Field label="Reference (optional)">
            <Input value={payRef} onChange={setPayRef} placeholder="Bank ref, transaction ID…" />
          </Field>
        </div>
        <div style={{ padding:"12px 22px 18px", display:"flex", gap:8, justifyContent:"flex-end" }}>
          <Btn onClick={onCancel} variant="outline">Cancel</Btn>
          <Btn onClick={()=>onConfirm({ date:payDate, method:payMethod, reference:payRef })} variant="primary" icon={<Icons.Check />}>Confirm Payment</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── A4 INVOICE DOCUMENT ──────────────────────────────────────────────────────
export function A4InvoiceDoc({ data, currSymbol, isVat, orgSettings, accentColor, template="classic", footerText="" }) {
  const { docNumber, customer, issueDate, dueDate, paymentTerms, items, subtotal, discountAmount, shipping, taxBreakdown, cisDeduction, total, notes, terms } = data;
  const sym = currSymbol||"£";
  const org = orgSettings||{};
  const tplDef = PDF_TEMPLATES.find(t=>t.id===template)||PDF_TEMPLATES[0];
  const accent = accentColor || tplDef.defaultAccent;
  const addrParts = [org.street, org.city, [org.postcode, org.state].filter(Boolean).join(" "), org.country].filter(Boolean);

  const OrgBlock = ({ dark=false }) => (
    <div>
      {org.logo && <img src={org.logo} alt="logo" style={{ maxHeight:org.logoSize||52, maxWidth:200, objectFit:"contain", display:"block", marginBottom:5 }} />}
      <div style={{ fontSize:"15pt", fontWeight:900, color:dark?"#fff":accent, letterSpacing:"-0.01em" }}>{org.orgName||"Your Company"}</div>
      {addrParts.length>0 && (
        <div style={{ fontSize:"7.5pt", color:dark?"rgba(255,255,255,0.75)":"#666", marginTop:3, lineHeight:1.8 }}>
          {addrParts.map((line,i)=><div key={i}>{line}</div>)}
        </div>
      )}
      {org.vatNum && <div style={{ fontSize:"7.5pt", color:dark?"rgba(255,255,255,0.6)":"#AAA", marginTop:2 }}>VAT No: {org.vatNum}</div>}
    </div>
  );

  const InvoiceMetaBlock = ({ dark=false }) => (
    <div>
      <div style={{ fontSize:"7pt", fontWeight:700, color:dark?"rgba(255,255,255,0.5)":"#AAA", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"3mm" }}>Invoice Details</div>
      {[["Invoice No", docNumber||"INV-0001"],["Issue Date", fmtDate(issueDate)],["Due Date", fmtDate(dueDate)],["Payment Terms", paymentTerms||"Net 30"]].map(([l,v])=>(
        <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"1.5mm 0", borderBottom:`1px solid ${dark?"rgba(255,255,255,0.12)":"#F0F0F0"}` }}>
          <span style={{ fontSize:"8.5pt", color:dark?"rgba(255,255,255,0.6)":"#888" }}>{l}</span>
          <span style={{ fontSize:"8.5pt", fontWeight:700, color:dark?"#fff":"#1A1A1A" }}>{v}</span>
        </div>
      ))}
    </div>
  );

  const BillToBlock = ({ dark=false }) => (
    <div>
      <div style={{ fontSize:"7pt", fontWeight:700, color:dark?"rgba(255,255,255,0.5)":"#AAA", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"3mm" }}>Bill To</div>
      {customer ? (<>
        <div style={{ fontWeight:700, fontSize:"11pt", color:dark?"#fff":"#1A1A1A" }}>{customer.name}</div>
        {customer.companyName && customer.companyName!==customer.name && <div style={{ fontSize:"9pt", color:dark?"rgba(255,255,255,0.7)":"#555", marginTop:1 }}>{customer.companyName}</div>}
        {customer.email && <div style={{ fontSize:"8.5pt", color:dark?"rgba(255,255,255,0.6)":"#666", marginTop:2 }}>{customer.email}</div>}
        {customer.phone && <div style={{ fontSize:"8.5pt", color:dark?"rgba(255,255,255,0.6)":"#666" }}>{customer.phone}</div>}
        {customer.billingAddress && (
          <div style={{ fontSize:"8.5pt", color:dark?"rgba(255,255,255,0.6)":"#666", marginTop:3, lineHeight:1.7 }}>
            {[customer.billingAddress.street, customer.billingAddress.city, [customer.billingAddress.postcode, customer.billingAddress.county].filter(Boolean).join(" "), customer.billingAddress.country].filter(Boolean).map((l,i)=><div key={i}>{l}</div>)}
          </div>
        )}
      </>) : <div style={{ fontSize:"9pt", color:"#CCC", fontStyle:"italic" }}>No customer selected</div>}
    </div>
  );

  const ItemsTable = ({ headerBg=accent, headerColor="#fff", stripeBg="#FAFAFA" }) => (
    <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:"5mm" }}>
      <thead>
        <tr style={{ background:headerBg }}>
          {["Description","Qty","Unit Price",...(isVat?["VAT"]:[]),"Amount"].map((h,i)=>(
            <th key={h} style={{ padding:"2.5mm 3mm", textAlign:i>0?"right":"left", fontSize:"7.5pt", fontWeight:700, color:headerColor, letterSpacing:"0.04em" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {(items||[]).filter(it=>it.description||it.amount>0).map((it,idx)=>(
          <tr key={it.id||idx} style={{ background:idx%2===0?stripeBg:"#fff" }}>
            <td style={{ padding:"2.5mm 3mm", fontSize:"9pt" }}>{it.description||`Item ${idx+1}`}</td>
            <td style={{ padding:"2.5mm 3mm", fontSize:"9pt", textAlign:"right", color:"#666" }}>{it.quantity}</td>
            <td style={{ padding:"2.5mm 3mm", fontSize:"9pt", textAlign:"right", color:"#666" }}>{fmt(sym,it.rate)}</td>
            {isVat && <td style={{ padding:"2.5mm 3mm", fontSize:"9pt", textAlign:"right", color:"#888" }}>{it.tax_rate}%</td>}
            <td style={{ padding:"2.5mm 3mm", fontSize:"9pt", fontWeight:700, textAlign:"right" }}>{fmt(sym,it.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const TotalsSection = () => (
    <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:"5mm" }}>
      <div style={{ minWidth:"62mm" }}>
        {[["Subtotal",fmt(sym,subtotal||0)],
          ...((discountAmount||0)>0?[["Discount",`− ${fmt(sym,discountAmount)}`,"#E86C4A"]]:[]),
          ...(Number(shipping)>0?[["Shipping",fmt(sym,shipping)]]:[]),
          ...(isVat?(taxBreakdown||[]).map(tb=>[`VAT ${tb.rate}%`,fmt(sym,tb.amount)]):[]),
          ...((cisDeduction||0)>0?[["CIS Deduction",`− ${fmt(sym,cisDeduction)}`,"#D97706"]]:[]),
        ].map(([l,v,c])=>(
          <div key={l} style={{ display:"flex", justifyContent:"space-between", gap:"8mm", padding:"1.5mm 0", borderBottom:"1px solid #F4F4F4" }}>
            <span style={{ fontSize:"8.5pt", color:"#888" }}>{l}</span>
            <span style={{ fontSize:"8.5pt", color:c||"#555" }}>{v}</span>
          </div>
        ))}
        <div style={{ display:"flex", justifyContent:"space-between", gap:"8mm", padding:"3mm 4mm 2mm", background:accent, borderRadius:4, marginTop:2 }}>
          <span style={{ fontSize:"10pt", fontWeight:800, color:"#fff" }}>Total Due</span>
          <span style={{ fontSize:"11pt", fontWeight:900, color:"#fff" }}>{fmt(sym,total||0)}</span>
        </div>
      </div>
    </div>
  );

  const NotesSection = () => (notes||terms) ? (
    <div style={{ borderTop:"1px solid #EBEBEB", paddingTop:"4mm", display:"grid", gridTemplateColumns:notes&&terms?"1fr 1fr":"1fr", gap:"6mm" }}>
      {notes && <div><div style={{ fontSize:"7pt", fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"2mm" }}>Notes</div><p style={{ fontSize:"8pt", color:"#555", margin:0, lineHeight:1.7 }}>{notes}</p></div>}
      {terms && <div><div style={{ fontSize:"7pt", fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"2mm" }}>Payment Terms</div><p style={{ fontSize:"8pt", color:"#555", margin:0, lineHeight:1.7 }}>{terms}</p></div>}
    </div>
  ) : null;

  const FooterBar = () => (
    <div style={{ position:"absolute", bottom:"10mm", left:"18mm", right:"18mm", borderTop:"1px solid #EBEBEB", paddingTop:"2.5mm" }}>
      {footerText
        ? <div style={{ fontSize:"7pt", color:"#888", textAlign:"center", lineHeight:1.6 }}>{footerText}</div>
        : <div style={{ display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontSize:"7pt", color:"#CCC" }}>{org.orgName||""}{org.vatNum?` · VAT ${org.vatNum}`:""}{org.crn?` · CRN ${org.crn}`:""}</span>
            <span style={{ fontSize:"7pt", color:"#CCC" }}>{org.email||""}</span>
          </div>
      }
    </div>
  );

  const base = { width:"210mm", minHeight:"297mm", background:"#fff", fontFamily:ff, boxSizing:"border-box", fontSize:"10pt", color:"#1A1A1A", position:"relative" };

  if(template==="modern") return (
    <div id="a4-invoice-doc" style={{ ...base, display:"flex", flexDirection:"column", padding:0 }}>
      <div style={{ display:"grid", gridTemplateColumns:"42% 58%" }}>
        <div style={{ background:accent, padding:"14mm 12mm 10mm 14mm", minHeight:"62mm" }}>
          <OrgBlock dark /><div style={{ marginTop:"8mm" }}><BillToBlock dark /></div>
        </div>
        <div style={{ padding:"14mm 14mm 10mm 12mm", background:"#fff" }}>
          <div style={{ fontSize:"28pt", fontWeight:900, color:accent, letterSpacing:"-0.02em", lineHeight:1 }}>INVOICE</div>
          <div style={{ fontSize:"12pt", fontWeight:700, color:"#555", marginTop:3, marginBottom:"6mm" }}>{docNumber||"INV-0001"}</div>
          <InvoiceMetaBlock />
        </div>
      </div>
      <div style={{ padding:"8mm 14mm 14mm" }}>
        <ItemsTable headerBg={`${accent}18`} headerColor={accent} stripeBg="#F0F7FF" />
        <TotalsSection /><NotesSection />
      </div>
      <FooterBar />
    </div>
  );

  if(template==="minimal") return (
    <div id="a4-invoice-doc" style={{ ...base, padding:"14mm 18mm 16mm" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"8mm" }}>
        <OrgBlock />
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:"10pt", fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.14em" }}>Invoice</div>
          <div style={{ fontSize:"18pt", fontWeight:900, color:accent, marginTop:1 }}>{docNumber||"INV-0001"}</div>
        </div>
      </div>
      <div style={{ height:2, background:`linear-gradient(90deg,${accent},${accent}44)`, marginBottom:"7mm", borderRadius:1 }} />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8mm", marginBottom:"7mm" }}>
        <BillToBlock /><InvoiceMetaBlock />
      </div>
      <ItemsTable headerBg={`${accent}15`} headerColor={accent} stripeBg="#FAFAFA" />
      <TotalsSection /><NotesSection /><FooterBar />
    </div>
  );

  if(template==="branded") return (
    <div id="a4-invoice-doc" style={{ ...base, padding:0 }}>
      <div style={{ background:`linear-gradient(135deg,${accent} 0%,${accent}BB 100%)`, padding:"12mm 18mm 8mm", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-20, right:-20, width:140, height:140, borderRadius:"50%", background:"rgba(255,255,255,0.06)" }} />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", position:"relative" }}>
          <OrgBlock dark />
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:"24pt", fontWeight:900, color:"#fff" }}>INVOICE</div>
            <div style={{ fontSize:"12pt", fontWeight:700, color:"rgba(255,255,255,0.75)", marginTop:2 }}>{docNumber||"INV-0001"}</div>
          </div>
        </div>
      </div>
      <div style={{ background:tplDef.defaultBg||"#FFF7F4", padding:"6mm 18mm 5mm", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10mm", borderBottom:`3px solid ${accent}` }}>
        <BillToBlock /><InvoiceMetaBlock />
      </div>
      <div style={{ padding:"7mm 18mm 14mm" }}>
        <ItemsTable headerBg={`${accent}22`} headerColor={accent} stripeBg="#FFFAF8" />
        <TotalsSection /><NotesSection />
      </div>
      <FooterBar />
    </div>
  );

  // default: classic
  return (
    <div id="a4-invoice-doc" style={{ ...base }}>
      <div style={{ background:accent, padding:"14mm 18mm 10mm", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <OrgBlock dark />
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:"22pt", fontWeight:900, color:"#fff", letterSpacing:"0.04em" }}>INVOICE</div>
          <div style={{ fontSize:"12pt", color:"rgba(255,255,255,0.8)", fontWeight:700, marginTop:2 }}>{docNumber||"INV-0001"}</div>
        </div>
      </div>
      <div style={{ padding:"8mm 18mm 14mm" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8mm", marginBottom:"8mm", paddingBottom:"6mm", borderBottom:`2px solid ${accent}` }}>
          <BillToBlock /><InvoiceMetaBlock />
        </div>
        <ItemsTable headerBg={accent} headerColor="#fff" stripeBg="#F8F8F8" />
        <TotalsSection /><NotesSection />
      </div>
      <FooterBar />
    </div>
  );
}

// ─── A4 PRINT MODAL ───────────────────────────────────────────────────────────
export function A4PrintModal({ data, currSymbol, isVat, onClose, _overrideTemplate, _overrideAccent }) {
  const { orgSettings, pdfTemplate, companyLogo, companyLogoSize, footerText } = useContext(AppCtx);
  const startTpl = _overrideTemplate || pdfTemplate || "classic";
  const tplDef = PDF_TEMPLATES.find(t=>t.id===startTpl)||PDF_TEMPLATES[0];
  const [accentColor, setAccentColor] = useState(_overrideAccent || tplDef.defaultAccent);
  const [activeTemplate, setActiveTemplate] = useState(startTpl);

  const switchTemplate = (id) => {
    setActiveTemplate(id);
    setAccentColor(PDF_TEMPLATES.find(t=>t.id===id)?.defaultAccent||"#1A1A1A");
  };

  const handlePrint = () => {
    const el = document.getElementById("a4-invoice-doc");
    if(!el) return;
    const w = window.open("","_blank","width=900,height=700");
    w.document.write(`<!DOCTYPE html><html><head><title>Invoice ${data.docNumber||""}</title>
      <style>*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}body{background:#fff;font-family:'Instrument Sans','DM Sans','Helvetica Neue',sans-serif}@page{size:A4;margin:0}@media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}</style>
    </head><body>${el.outerHTML}</body></html>`);
    w.document.close();
    setTimeout(()=>{ w.focus(); w.print(); }, 400);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.72)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-start", zIndex:4000, overflowY:"auto", padding:"16px 16px 40px" }}>
      <div style={{ width:"100%", maxWidth:820, background:"#1A1A1A", borderRadius:"12px 12px 0 0", padding:"10px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
          <span style={{ fontSize:13, fontWeight:700, color:"#fff" }}>Print Preview — A4</span>
          <div style={{ display:"flex", gap:5 }}>
            {PDF_TEMPLATES.map(t=>(
              <button key={t.id} onClick={()=>switchTemplate(t.id)}
                style={{ padding:"4px 10px", borderRadius:6, border:`1.5px solid ${activeTemplate===t.id?"#E86C4A":"rgba(255,255,255,0.2)"}`, background:"transparent", color:activeTemplate===t.id?"#E86C4A":"rgba(255,255,255,0.5)", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:ff }}>
                {t.name}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <button onClick={onClose}
            style={{ padding:"7px 14px", borderRadius:8, border:"1.5px solid rgba(255,255,255,0.3)", background:"transparent", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:ff }}>
            Close
          </button>
          <button onClick={handlePrint}
            style={{ padding:"7px 16px", borderRadius:8, border:"none", background:"#E86C4A", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:ff, display:"flex", alignItems:"center", gap:7 }}>
            <Icons.Receipt /> Print / Save PDF
          </button>
        </div>
      </div>
      <div style={{ width:"100%", maxWidth:820, background:"#fff", boxShadow:"0 8px 40px rgba(0,0,0,0.35)", overflow:"hidden" }}>
        <A4InvoiceDoc data={data} currSymbol={currSymbol} isVat={isVat}
          orgSettings={{...orgSettings, logo:companyLogo, logoSize:companyLogoSize}}
          accentColor={accentColor} template={activeTemplate} footerText={footerText||""} />
      </div>
    </div>
  );
}
