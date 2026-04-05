import { useState } from "react";
import { ff, UK_VAT_RATES } from "../../constants";
import { Icons } from "../icons";
import { Btn, Input } from "../atoms";
import { fmt, newLine } from "../../utils/helpers";

export function LineItemsTable({ items, onChange, currSymbol, catalogItems, isVat, onAddNewItem, isCISInvoice }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerQty, setPickerQty] = useState({});

  const upd = (id, f, v) => onChange(items.map(it => {
    if (it.id !== id) return it;
    const patch = typeof f === 'object' ? f : { [f]: v };
    const u = { ...it, ...patch };
    if (!patch.cisApplicable) u.amount = Number(u.quantity) * Number(u.rate);
    return u;
  }));

  const addBlank = () => onChange([...items, { ...newLine(items.length), cisApplicable: !!isCISInvoice }]);
  const del = id => items.length > 1 && onChange(items.filter(i => i.id !== id));

  const activeItems = (catalogItems || []).filter(i => i.active);
  const filteredCat = activeItems.filter(i =>
    !pickerSearch ||
    i.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
    (i.description || "").toLowerCase().includes(pickerSearch.toLowerCase())
  );

  const cols = isVat
    ? (isCISInvoice ? "1fr 68px 84px 120px 74px 44px 28px" : "1fr 68px 84px 120px 74px 28px")
    : (isCISInvoice ? "1fr 68px 90px 80px 44px 28px"       : "1fr 68px 90px 80px 28px");
  const headers = isVat
    ? [["Description","left"],["Qty","center"],[`Rate (${currSymbol})`,"right"],["VAT","center"],["Amount","right"],...(isCISInvoice?[["CIS","center"]]:[]),["",""]]
    : [["Description","left"],["Qty","center"],[`Rate (${currSymbol})`,"right"],["Amount","right"],...(isCISInvoice?[["CIS","center"]]:[]),["",""]];

  return (
    <div>
      {/* Catalogue picker dropdown */}
      {activeItems.length > 0 && (
        <div style={{ position:"relative", marginBottom:10 }}>
          <div style={{ padding:"9px 12px", background:"#F9F9F9", borderRadius:8, border:"1px solid #EBEBEB", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontSize:12, color:"#888" }}>Quick-add from items catalogue</span>
            <Btn onClick={() => { setPickerOpen(o => !o); setPickerSearch(""); }} variant="outline" size="sm" icon={<Icons.Items />}>Browse Items</Btn>
          </div>
          {pickerOpen && (
            <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, background:"#fff", border:"1.5px solid #1A1A1A", borderRadius:10, padding:12, boxShadow:"0 8px 24px rgba(0,0,0,0.12)", zIndex:400 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ fontSize:12, fontWeight:700, color:"#1A1A1A" }}>Select Item to Add</span>
                <button onClick={() => setPickerOpen(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"#AAA" }}><Icons.X /></button>
              </div>
              <input value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} placeholder="Search items…" autoFocus
                style={{ width:"100%", padding:"7px 10px", border:"1.5px solid #E0E0E0", borderRadius:7, fontSize:13, fontFamily:ff, outline:"none", marginBottom:8, boxSizing:"border-box" }} />
              <div style={{ maxHeight:220, overflowY:"auto" }}>
                {filteredCat.length === 0 && <div style={{ padding:"14px 0", textAlign:"center", color:"#CCC", fontSize:13 }}>No matching items</div>}
                {filteredCat.map(ci => {
                  const qty = Number(pickerQty[ci.id] || 1);
                  return (
                    <div key={ci.id}
                      style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 10px", borderRadius:7, fontFamily:ff }}
                      onMouseEnter={e => e.currentTarget.style.background = "#F5F5F5"}
                      onMouseLeave={e => e.currentTarget.style.background = "none"}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color:"#1A1A1A" }}>{ci.name}</div>
                        {ci.description && <div style={{ fontSize:11, color:"#AAA", marginTop:1 }}>{ci.description}</div>}
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginLeft:12 }}>
                        <input type="number" min="1" value={pickerQty[ci.id] || 1}
                          onChange={e => setPickerQty(prev => ({ ...prev, [ci.id]: e.target.value }))}
                          style={{ width:64, padding:"6px 8px", border:"1.5px solid #E0E0E0", borderRadius:7, fontSize:12, fontFamily:ff, background:"#fff", MozAppearance:"textfield" }} />
                        <button onClick={() => {
                          const safeQty = Number.isFinite(qty) && qty > 0 ? qty : 1;
                          const newItem = { id:crypto.randomUUID(), name:ci.name, description:ci.description||"", quantity:safeQty, rate:ci.rate, tax_rate:isVat?(ci.taxRate||20):0, amount:ci.rate*safeQty, cisApplicable: isCISInvoice ? (ci.cisApplicable !== false) : !!ci.cisApplicable, sort_order:items.length };
                          onChange([...items, newItem]);
                          setPickerOpen(false); setPickerSearch("");
                        }}
                          style={{ padding:"6px 10px", border:"1px solid #1A1A1A", background:"#1A1A1A", color:"#fff", borderRadius:7, cursor:"pointer", fontSize:12, fontWeight:700 }}>
                          Add
                        </button>
                        <div style={{ textAlign:"right", flexShrink:0 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:"#1A1A1A" }}>{fmt(currSymbol, ci.rate)}</div>
                          <div style={{ fontSize:11, color:"#AAA" }}>{ci.unit}{isVat ? ` · ${ci.taxRate}% VAT` : ""}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Table headers */}
      <div style={{ display:"grid", gridTemplateColumns:cols, gap:6, paddingBottom:8, borderBottom:"1.5px solid #EBEBEB", marginBottom:8 }}>
        {headers.map(([h, a]) => <div key={h} style={{ fontSize:10, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em", textAlign:a }}>{h}</div>)}
      </div>

      {/* Rows */}
      {items.map((it, idx) => (
        <div key={it.id} style={{ display:"grid", gridTemplateColumns:cols, gap:6, marginBottom:6, alignItems:"center" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:6 }}>
            <Input value={it.name || ""} onChange={v => upd(it.id, "name", v)} placeholder={`Item ${idx + 1} name…`} />
            <Input value={it.description || ""} onChange={v => upd(it.id, "description", v)} placeholder="Description (optional)" />
          </div>
          <Input value={it.quantity} onChange={v => upd(it.id, "quantity", v)} type="number" align="center" style={{ MozAppearance:"textfield" }} />
          <Input value={it.rate} onChange={v => upd(it.id, "rate", v)} type="number" align="right" style={{ MozAppearance:"textfield" }} />
          {isVat && (
            <select
              value={it.tax_type === 'exempt' ? 'exempt' : it.tax_type === 'outside_scope' ? 'outside' : String(it.tax_rate || 0)}
              onChange={e => {
                const selected = UK_VAT_RATES.find(r => r.value === e.target.value);
                if (selected) upd(it.id, { tax_rate: selected.rate, tax_type: selected.type });
              }}
              style={{ padding:"8px 2px", border:"1.5px solid #E0E0E0", borderRadius:7, fontSize:11, fontFamily:ff, background:"#FAFAFA", outline:"none", cursor:"pointer", width:"100%" }}>
              {UK_VAT_RATES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          )}
          <div style={{ textAlign:"right", fontSize:13, fontWeight:700, color:"#1A1A1A" }}>{fmt(currSymbol, it.amount)}</div>
          {isCISInvoice && (
            <div style={{ display:"flex", justifyContent:"center" }}>
              <button
                onClick={() => upd(it.id, "cisApplicable", !it.cisApplicable)}
                title={it.cisApplicable ? "CIS applies — click to exclude" : "Click to apply CIS deduction"}
                style={{ width:36, height:22, borderRadius:11, border:"none", cursor:"pointer", background:it.cisApplicable?"#D97706":"#E5E7EB", position:"relative", transition:"background 0.15s", flexShrink:0 }}>
                <span style={{ position:"absolute", top:2, left:it.cisApplicable?16:2, width:18, height:18, borderRadius:"50%", background:"#fff", transition:"left 0.15s", boxShadow:"0 1px 2px rgba(0,0,0,0.2)" }} />
              </button>
            </div>
          )}
          <button onClick={() => del(it.id)} disabled={items.length === 1}
            style={{ width:26, height:26, border:"none", background:"none", cursor:items.length===1?"not-allowed":"pointer", color:"#DDD", display:"flex", alignItems:"center", justifyContent:"center" }}
            onMouseEnter={e => { if (items.length > 1) e.currentTarget.style.color = "#DC2626"; }}
            onMouseLeave={e => e.currentTarget.style.color = "#DDD"}>
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
