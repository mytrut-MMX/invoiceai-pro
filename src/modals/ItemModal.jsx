import { useState, useContext, useMemo } from "react";
import { ff, TAX_RATES, ITEM_TYPES, ITEM_UNITS, ACCOUNT_CATEGORIES, CIS_RATES } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Field, Input, Select, Textarea, Switch, Btn, InfoBox } from "../components/atoms";

export default function ItemForm({ existing, onClose, onSave }) {
  const { orgSettings, catalogItems } = useContext(AppCtx);
  const isVat = orgSettings?.vatReg === "Yes";
  const orgCisEnabled = orgSettings?.cisReg === "Yes";
  const isEdit = !!existing;

  const [name, setName] = useState(existing?.name||"");
  const [itemType, setItemType] = useState(existing?.type||"Service");
  const [description, setDescription] = useState(existing?.description||"");
  const [rate, setRate] = useState(existing?.rate??"");
  const [unit, setUnit] = useState(existing?.unit||"");
  const [taxRate, setTaxRate] = useState(existing?.taxRate??20);
  const [active, setActive] = useState(existing?.active??true);
  const [sku, setSku] = useState(existing?.sku||"");
  const [account, setAccount] = useState(existing?.account||"");
  const [cisApplicable, setCisApplicable] = useState(existing?.cisApplicable??false);
  const [cisLabourRate, setCisLabourRate] = useState(existing?.cisLabourRate||"20%");

  const showCIS = orgCisEnabled && (itemType==="Service"||itemType==="Labour"||itemType==="Material");
  const [newUnitInput, setNewUnitInput] = useState("");
  const [hiddenUnits, setHiddenUnits] = useState([]);

  const customUnits = useMemo(() => {
    const fromCatalog = (catalogItems || []).map(item => item?.unit).filter(Boolean);
    const deduped = Array.from(new Set(fromCatalog));
    return deduped.filter(u => !ITEM_UNITS.includes(u) && !hiddenUnits.includes(u));
  }, [catalogItems, hiddenUnits]);

  const allUnits = useMemo(() => [...ITEM_UNITS, ...customUnits], [customUnits]);

  const handleAddUnit = () => {
    const candidate = newUnitInput.trim();
    if (!candidate) return;
    setUnit(candidate);
    setNewUnitInput("");
  };

  const handleDeleteUnit = (unitValue) => {
    if (!customUnits.includes(unitValue)) return;
    setHiddenUnits(prev => [...prev, unitValue]);
    if (unit === unitValue) setUnit("");
  };
  const typeColors = { Service:"#4F46E5", Labour:"#D97706", Material:"#059669", Equipment:"#2563EB", Other:"#6B7280" };

  const handleSave = () => {
    onSave({
      id: existing?.id||crypto.randomUUID(),
      name, type:itemType, description, rate:Number(rate), unit,
      taxRate: isVat ? Number(taxRate) : 0,
      active, sku, account,
      cisApplicable: showCIS && orgCisEnabled ? cisApplicable : false,
      cisLabourRate: cisApplicable ? cisLabourRate : null
    });
    onClose();
  };

  return (
    <div style={{ background:"#f4f5f7", minHeight:"100vh", fontFamily:ff }}>
      <div style={{ maxWidth:640, margin:"0 auto", padding:"0 0 40px" }}>
        <div style={{ position:"sticky", top:0, zIndex:10, background:"#fff", borderBottom:"1px solid #e8e8ec", padding:"12px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#6b7280", fontSize:13, fontFamily:ff, display:"flex", alignItems:"center", gap:4 }}>
              ← Items
            </button>
            <span style={{ color:"#d1d5db" }}>/</span>
            <span style={{ fontSize:13, fontWeight:600, color:"#1a1a2e" }}>
              {isEdit ? existing.name : "New Item"}
            </span>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <Btn onClick={onClose} variant="outline">Cancel</Btn>
            <Btn onClick={handleSave} variant="primary" disabled={!name||!rate}>
              {isEdit ? "Save Changes" : "Save Item"}
            </Btn>
          </div>
        </div>

        <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ background:"#fff", borderRadius:10, border:"1px solid #e8e8ec", padding:"18px 22px" }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", marginBottom:16 }}>Item Details</div>
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
            <Field label="Unit">
               <Select value={unit} onChange={setUnit} options={allUnits} placeholder="Select unit…" />
              <div style={{ marginTop:8, display:"flex", gap:8 }}>
                <Input value={newUnitInput} onChange={setNewUnitInput} placeholder="Add custom unit" />
                <Btn onClick={handleAddUnit} variant="outline" size="sm">Add</Btn>
              </div>
              {customUnits.length > 0 && (
                <div style={{ marginTop:8, display:"flex", flexDirection:"column", gap:6 }}>
                  {customUnits.map(customUnit => (
                    <div key={customUnit} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 8px", background:"#f9fafb", border:"1px solid #e8e8ec", borderRadius:6 }}>
                      <span style={{ fontSize:12, color:"#374151" }}>{customUnit}</span>
                      <button type="button" onClick={() => handleDeleteUnit(customUnit)} title="Remove custom unit" style={{ background:"transparent", border:"none", color:"#6b7280", cursor:"pointer", display:"flex", padding:0 }}>
                        <Icons.Trash />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Field>
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

          </div>

          {(itemType==="Service"||itemType==="Labour"||itemType==="Material") && (
            <div style={{ background:"#fff", borderRadius:10, border:"1px solid #e8e8ec", padding:"18px 22px" }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", marginBottom:16 }}>CIS Details</div>
              {!orgCisEnabled && <InfoBox color="#D97706">CIS is disabled for your organisation, so this item cannot be marked as CIS applicable.</InfoBox>}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:cisApplicable?12:0 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#1A1A1A" }}>CIS Applicable</div>
                  <div style={{ fontSize:11, color:"#AAA", marginTop:2 }}>
                    {itemType==="Material"?"Materials may include a CIS-liable labour element.":
                     itemType==="Labour"?"Labour is typically subject to CIS deduction.":
                     "Services may be subject to CIS if provided to a contractor."}
                  </div>
                </div>
                <Switch checked={cisApplicable} onChange={orgCisEnabled ? setCisApplicable : ()=>setCisApplicable(false)} />
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
      </div>
    </div>
  );
}
