import { useState, useContext, useMemo } from "react";
import { ff, TAX_RATES, ITEM_TYPES, ITEM_UNITS, ACCOUNT_CATEGORIES, CIS_RATES } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Field, Input, Select, Textarea, Switch, Btn, InfoBox } from "../components/atoms";

export default function ItemForm({ existing, onClose, onSave }) {
  const { orgSettings, catalogItems } = useContext(AppCtx);
  const isVat = orgSettings?.vatReg === "Yes";
  const orgCisEnabled = orgSettings?.cisReg === "Yes";
  const isEdit = !!existing;

  const [name, setName] = useState(existing?.name || "");
  const [itemType, setItemType] = useState(existing?.type || "Service");
  const [description, setDescription] = useState(existing?.description || "");
  const [rate, setRate] = useState(existing?.rate ?? "");
  const [unit, setUnit] = useState(existing?.unit || "");
  const [taxRate, setTaxRate] = useState(existing?.taxRate ?? 20);
  const [active, setActive] = useState(existing?.active ?? true);
  const [sku, setSku] = useState(existing?.sku || "");
  const [account, setAccount] = useState(existing?.account || "");
  const [cisApplicable, setCisApplicable] = useState(orgCisEnabled ? (existing?.cisApplicable ?? false) : false);
  const [cisLabourRate, setCisLabourRate] = useState(existing?.cisLabourRate || "20%");
  const [newUnitInput, setNewUnitInput] = useState("");
  const [isUnitMenuOpen, setIsUnitMenuOpen] = useState(false);
  const [customUnits, setCustomUnits] = useState([]);
  const [hiddenUnits, setHiddenUnits] = useState([]);

  const showCIS = orgCisEnabled && (itemType === "Service" || itemType === "Labour" || itemType === "Material");
  const typeColors = { Service: "#4F46E5", Labour: "#D97706", Material: "#059669", Equipment: "#2563EB", Other: "#6B7280" };

  const catalogUnits = useMemo(() => {
    const fromCatalog = (catalogItems || []).map(item => item?.unit).filter(Boolean);
    return Array.from(new Set(fromCatalog));
  }, [catalogItems]);

  const allUnits = useMemo(() => {
    const merged = Array.from(new Set([...ITEM_UNITS, ...catalogUnits, ...customUnits]));
    return merged.filter(u => !hiddenUnits.includes(u));
  }, [catalogUnits, customUnits, hiddenUnits]);

  const handleAddUnit = () => {
    const candidate = newUnitInput.trim();
    if (!candidate) return;
    if (hiddenUnits.includes(candidate)) {
      setHiddenUnits(prev => prev.filter(u => u !== candidate));
    }
    if (!ITEM_UNITS.includes(candidate) && !catalogUnits.includes(candidate)) {
      setCustomUnits(prev => (prev.includes(candidate) ? prev : [...prev, candidate]));
    }
    setUnit(candidate);
    setNewUnitInput("");
  };

  const handleDeleteUnit = (unitValue) => {
    setHiddenUnits(prev => (prev.includes(unitValue) ? prev : [...prev, unitValue]));
    setCustomUnits(prev => prev.filter(u => u !== unitValue));
    if (unit === unitValue) setUnit("");
  };
  
  const handleSave = () => {
    onSave({
     id: existing?.id || crypto.randomUUID(),
      name, type: itemType, description, rate: Number(rate), unit,
      taxRate: isVat ? Number(taxRate) : 0,
      active, sku, account,
      cisApplicable: showCIS ? cisApplicable : false,
      cisLabourRate: showCIS && cisApplicable ? cisLabourRate : null
    });
    onClose();
  };

  return (
    <div style={{ background: "#f4f5f7", minHeight: "100vh", fontFamily: ff }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 0 40px" }}>
        <div style={{ position: "sticky", top: 0, zIndex: 10, background: "#fff", borderBottom: "1px solid #e8e8ec", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: 13, fontFamily: ff, display: "flex", alignItems: "center", gap: 4 }}>
              ← Items
            </button>
            <span style={{ color: "#d1d5db" }}>/</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>
              {isEdit ? existing.name : "New Item"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={onClose} variant="outline">Cancel</Btn>
            <Btn onClick={handleSave} variant="primary" disabled={!name || !rate}>
              {isEdit ? "Save Changes" : "Save Item"}
            </Btn>
          </div>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e8e8ec", padding: "18px 22px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e", marginBottom: 16 }}>Item Details</div>
            <Field label="Item Type" required>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {ITEM_TYPES.map(t => (
                  <button key={t} onClick={() => setItemType(t)}
                    style={{ padding: "7px 14px", borderRadius: 20, border: `1.5px solid ${itemType === t ? typeColors[t] : "#E0E0E0"}`, background: itemType === t ? typeColors[t] + "15" : "#FAFAFA", color: itemType === t ? typeColors[t] : "#888", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: ff, transition: "all 0.15s" }}>
                    {t}
                  </button>
                ))}
              </div>
              </Field>

            <Field label="Item Name" required><Input value={name} onChange={setName} placeholder="e.g. Web Design Package" /></Field>
            <Field label="Description"><Textarea value={description} onChange={setDescription} placeholder="Brief description…" rows={2} /></Field>

            <div style={{ display: "grid", gridTemplateColumns: isVat ? "1fr 1fr 1fr" : "1fr 1fr", gap: 12 }}>
              <Field label="Rate" required><Input value={rate} onChange={setRate} placeholder="0.00" type="number" align="right" /></Field>
              <Field label="Unit">
                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    onClick={() => setIsUnitMenuOpen(prev => !prev)}
                    style={{ width: "100%", padding: "9px 11px", border: "1px solid #e8e8ec", borderRadius: 5, fontSize: 13, fontFamily: ff, color: unit ? "#1A1A1A" : "#999", background: "#fff", textAlign: "left", cursor: "pointer" }}
                  >
                    {unit || "Select unit…"}
                  </button>
                  {isUnitMenuOpen && (
                    <div style={{ position: "absolute", zIndex: 20, top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #e8e8ec", borderRadius: 8, boxShadow: "0 8px 20px rgba(0,0,0,0.08)", padding: 8, maxHeight: 240, overflowY: "auto" }}>
                      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                        <Input value={newUnitInput} onChange={setNewUnitInput} placeholder="Add custom unit" />
                        <Btn onClick={handleAddUnit} variant="outline" size="sm">Add</Btn>
                      </div>
                      {allUnits.map(unitOption => (
                        <div key={unitOption} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 8px", borderRadius: 6, background: unit === unitOption ? "#eff6ff" : "transparent" }}>
                          <button type="button" onClick={() => { setUnit(unitOption); setIsUnitMenuOpen(false); }} style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: 13, fontFamily: ff, color: "#1f2937", flex: 1 }}>
                            {unitOption}
                          </button>
                          <button type="button" onClick={() => handleDeleteUnit(unitOption)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: 14 }}>
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Field>
           {isVat && (
                <Field label="VAT Rate">
                  <Select value={String(taxRate)} onChange={v => setTaxRate(Number(v))} options={TAX_RATES.map(r => ({ value: String(r), label: `${r}%` }))} />
                </Field>
              )}
            </div>>

          {!isVat && <InfoBox color="#D97706">VAT Rate hidden — your organisation is not VAT registered.</InfoBox>}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 4 }}>
              <Field label="SKU / Code"><Input value={sku} onChange={setSku} placeholder="e.g. WD-001" /></Field>
              <Field label="Account / Category">
                <Select value={account} onChange={setAccount} options={ACCOUNT_CATEGORIES} placeholder="Select category…" />
              </Field>
            </div>
          </div>

          {showCIS && (
            <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e8e8ec", padding: "18px 22px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e", marginBottom: 16 }}>CIS Details</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: cisApplicable ? 12 : 0 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A" }}>CIS Applicable</div>
                  <div style={{ fontSize: 11, color: "#AAA", marginTop: 2 }}>
                    {itemType === "Material" ? "Materials may include a CIS-liable labour element." :
                      itemType === "Labour" ? "Labour is typically subject to CIS deduction." :
                        "Services may be subject to CIS if provided to a contractor."}
                  </div>
                </div>
                <Switch checked={cisApplicable} onChange={setCisApplicable} />
              </div>
              {cisApplicable && (
                <div style={{ marginTop: 10 }}>
                  <Field label="CIS Deduction Rate"><Select value={cisLabourRate} onChange={setCisLabourRate} options={CIS_RATES} /></Field>
                  <InfoBox>{itemType === "Material" ? "Only the labour element is subject to CIS." : "CIS will be deducted when this item is included on an invoice to a contractor."}</InfoBox>
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "#F9F9F9", borderRadius: 8, border: "1px solid #EBEBEB" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>Active</div>
              <div style={{ fontSize: 11, color: "#AAA", marginTop: 1 }}>Available in invoices and quotes</div>
            </div>
            <Switch checked={active} onChange={setActive} />
          </div>
        </div>
      </div>
    </div>
  );
}
