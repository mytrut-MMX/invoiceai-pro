import { useState, useContext } from "react";
import { ff, TAX_RATES, ITEM_TYPES, ITEM_UNITS, ACCOUNT_CATEGORIES, CIS_RATES } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Field, Input, Select, Textarea, Switch, Btn, InfoBox } from "../components/atoms";

export default function ItemModal({ existing, onClose, onSave }) {
  const { orgSettings } = useContext(AppCtx);
  const isVat = orgSettings?.vatReg === "Yes";
  const isEdit = !!existing;

  const [name, setName] = useState(existing?.name||"");
  const [itemType, setItemType] = useState(existing?.type||"Service");
  const [description, setDescription] = useState(existing?.description||"");
  const [rate, setRate] = useState(existing?.rate??"");
  const [unit, setUnit] = useState(existing?.unit||"hrs");
  const [taxRate, setTaxRate] = useState(existing?.taxRate??20);
  const [active, setActive] = useState(existing?.active??true);
  const [sku, setSku] = useState(existing?.sku||"");
  const [account, setAccount] = useState(existing?.account||"");
  const [cisApplicable, setCisApplicable] = useState(existing?.cisApplicable??false);
  const [cisLabourRate, setCisLabourRate] = useState(existing?.cisLabourRate||"20%");

  const showCIS = itemType==="Service"||itemType==="Labour"||itemType==="Material";
  const typeColors = { Service:"#4F46E5", Labour:"#D97706", Material:"#059669", Equipment:"#2563EB", Other:"#6B7280" };

  const handleSave = () => {
    onSave({
      id: existing?.id||crypto.randomUUID(),
      name, type:itemType, description, rate:Number(rate), unit,
      taxRate: isVat ? Number(taxRate) : 0,
      active, sku, account,
      cisApplicable: showCIS ? cisApplicable : false,
      cisLabourRate: cisApplicable ? cisLabourRate : null
    });
    onClose();
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:20 }}>
      <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:520, boxShadow:"0 20px 60px rgba(0,0,0,0.18)", fontFamily:ff, overflow:"hidden" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 24px 14px", borderBottom:"1px solid #F0F0F0" }}>
          <div>
            <h2 style={{ margin:0, fontSize:17, fontWeight:800, color:"#1A1A1A" }}>{isEdit?`Edit — ${existing.name}`:"New Item"}</h2>
            <p style={{ margin:"2px 0 0", fontSize:12, color:"#AAA" }}>Products and services you sell</p>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#AAA" }}><Icons.X /></button>
        </div>

        <div style={{ padding:"18px 24px" }}>
          <Field label="Item Type" required>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {ITEM_TYPES.map(t=>(
                <button key={t} onClick={()=>setItemType(t)}
                  style={{ padding:"7px 14px", borderRadius:20, border:`1.5px solid ${itemType===t?typeColors[t]:"#E0E0E0"}`, background:itemType===t?typeColors[t]+"15":"#FAFAFA", color:itemType===t?typeColors[t]:"#888", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:ff, transition:"all 0.15s" }}>
                  {t}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Item Name" required><Input value={name} onChange={setName} placeholder="e.g. Web Design Package" /></Field>
          <Field label="Description"><Textarea value={description} onChange={setDescription} placeholder="Brief description…" rows={2} /></Field>

          <div style={{ display:"grid", gridTemplateColumns:isVat?"1fr 1fr 1fr":"1fr 1fr", gap:12 }}>
            <Field label="Rate" required><Input value={rate} onChange={setRate} placeholder="0.00" type="number" align="right" /></Field>
            <Field label="Unit"><Select value={unit} onChange={setUnit} options={ITEM_UNITS} /></Field>
            {isVat && (
              <Field label="VAT Rate">
                <Select value={String(taxRate)} onChange={v=>setTaxRate(Number(v))} options={TAX_RATES.map(r=>({ value:String(r), label:`${r}%` }))} />
              </Field>
            )}
          </div>

          {!isVat && <InfoBox color="#D97706">VAT Rate hidden — your organisation is not VAT registered.</InfoBox>}

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:4 }}>
            <Field label="SKU / Code"><Input value={sku} onChange={setSku} placeholder="e.g. WD-001" /></Field>
            <Field label="Account / Category">
              <Select value={account} onChange={setAccount} options={ACCOUNT_CATEGORIES} placeholder="Select category…" />
            </Field>
          </div>

          {showCIS && (
            <div style={{ background:"#F9F9F9", borderRadius:10, padding:"14px 14px 10px", border:"1px solid #EBEBEB", marginBottom:14 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:cisApplicable?12:0 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#1A1A1A" }}>CIS Applicable</div>
                  <div style={{ fontSize:11, color:"#AAA", marginTop:2 }}>
                    {itemType==="Material"?"Materials may include a CIS-liable labour element.":
                     itemType==="Labour"?"Labour is typically subject to CIS deduction.":
                     "Services may be subject to CIS if provided to a contractor."}
                  </div>
                </div>
                <Switch checked={cisApplicable} onChange={setCisApplicable} />
              </div>
              {cisApplicable && (
                <div style={{ marginTop:10 }}>
                  <Field label="CIS Deduction Rate"><Select value={cisLabourRate} onChange={setCisLabourRate} options={CIS_RATES} /></Field>
                  <InfoBox>{itemType==="Material"?"Only the labour element is subject to CIS.":"CIS will be deducted when this item is included on an invoice to a contractor."}</InfoBox>
                </div>
              )}
            </div>
          )}

          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 12px", background:"#F9F9F9", borderRadius:8, border:"1px solid #EBEBEB" }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:"#1A1A1A" }}>Active</div>
              <div style={{ fontSize:11, color:"#AAA", marginTop:1 }}>Available in invoices and quotes</div>
            </div>
            <Switch checked={active} onChange={setActive} />
          </div>
        </div>

        <div style={{ padding:"12px 24px 16px", borderTop:"1px solid #F0F0F0", display:"flex", gap:10, justifyContent:"flex-end" }}>
          <Btn onClick={onClose} variant="outline">Cancel</Btn>
          <Btn onClick={handleSave} variant="primary" disabled={!name||!rate}>{isEdit?"Save Changes":"Save Item"}</Btn>
        </div>
      </div>
    </div>
  );
}
