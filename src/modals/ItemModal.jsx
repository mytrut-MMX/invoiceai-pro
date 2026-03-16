import { useState, useContext } from "react";
import { ff, TAX_RATES, ITEM_TYPES, ITEM_UNITS, ACCOUNT_CATEGORIES } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Field, Input, Select, SlideToggle, Textarea, Switch, Btn, InfoBox } from "../components/atoms";

export default function ItemForm({ existing, onClose, onSave, settings }) {
  const { orgSettings } = useContext(AppCtx);
  const isVat = orgSettings?.vatReg === "Yes";
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

  const cisEnabled = settings?.cis?.enabled ?? false;
  const [isCIS, setIsCIS] = useState(existing?.cis?.enabled ?? false);
  const [cisLabour, setCisLabour] = useState(existing?.cis?.labour ?? 100);
  const [cisMaterial, setCisMaterial] = useState(existing?.cis?.material ?? 0);

  const typeColors = { Service: "#4F46E5", Labour: "#D97706", Material: "#059669", Equipment: "#2563EB", Other: "#6B7280" };

  const handleSave = () => {
    const item = {
      id: existing?.id || crypto.randomUUID(),
      name,
      type: itemType,
      rate: Number(rate),
      unit,
      description,
      taxRate: isVat ? Number(taxRate) : 0,
      active,
      sku,
      account,
      cis: isCIS
        ? {
            enabled: true,
            labour: Number(cisLabour),
            material: Number(cisMaterial),
          }
        : { enabled: false },
    };

    onSave(item);
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
                  <input
                    list="unit-options"
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    placeholder="Select or type to add"
                    style={{
                      width: "100%",
                      padding: "9px 32px 9px 11px",
                      border: "1px solid #e8e8ec",
                      borderRadius: 5,
                      fontSize: 14,
                      fontFamily: ff,
                      color: "#1a1a2e",
                      background: "#fff",
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                    onFocus={e => (e.target.style.borderColor = "#1e6be0")}
                    onBlur={e => (e.target.style.borderColor = "#e8e8ec")}
                  />
                  <i
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      pointerEvents: "none",
                      display: "flex",
                      alignItems: "center"
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 512 512">
                      <path
                        d="M2.157 159.57c0 13.773 5.401 27.542 16.195 38.02l198.975 192.867c21.411 20.725 55.94 20.725 77.34 0L493.63 197.59c21.508-20.846 21.637-54.778.269-75.773-21.35-20.994-56.104-21.098-77.612-.26L256.004 276.93 95.721 121.562c-21.528-20.833-56.268-20.734-77.637.26C7.472 132.261 2.157 145.923 2.157 159.57z"
                        fill="#9ca3af"
                      />
                    </svg>
                  </i>
                  <datalist id="unit-options">
                    {ITEM_UNITS.map(u => <option key={u} value={u} />)}
                  </datalist>
                </div>
              </Field>
              {isVat && (
                <Field label="VAT Rate">
                  <Select value={String(taxRate)} onChange={v => setTaxRate(Number(v))} options={TAX_RATES.map(r => ({ value: String(r), label: `${r}%` }))} />
                </Field>
              )}
            </div>

            {!isVat && <InfoBox color="#D97706">VAT Rate hidden — your organisation is not VAT registered.</InfoBox>}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 4 }}>
              <Field label="SKU / Code"><Input value={sku} onChange={setSku} placeholder="e.g. WD-001" /></Field>
              <Field label="Account / Category">
                <Select value={account} onChange={setAccount} options={ACCOUNT_CATEGORIES} placeholder="Select category…" />
              </Field>
            </div>
          </div>

          {cisEnabled && (
            <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e8e8ec", padding: "18px 22px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  marginBottom: isCIS ? 16 : 0,
                }}
              />
                <div>
                  <<div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>
                    CIS Details
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                    Mark this item as subject to CIS deductions
                  </div>
                </div>
                <Switch checked={cisApplicable} onChange={setCisApplicable} />
              </div>
                
              {isCIS && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <Field label="Labour (%)">
                      <Input
                        type="number"
                        value={cisLabour}
                        onChange={v => {
                          const n = Math.min(100, Math.max(0, Number(v)));
                          setCisLabour(n);
                          setCisMaterial(100 - n);
                        }}
                      />
                    </Field>
                    <Field label="Material (%)">
                      <Input
                        type="number"
                        value={cisMaterial}
                        onChange={v => {
                          const n = Math.min(100, Math.max(0, Number(v)));
                          setCisMaterial(n);
                          setCisLabour(100 - n);
                        }}
                      />
                    </Field>
                  </div>

                  {Number(cisLabour) + Number(cisMaterial) !== 100 && (
                    <div style={{ marginTop: 8, fontSize: 12, color: "#dc2626" }}>
                      ⚠ Labour + Material must equal 100%
                    </div>
                  )}

                  {Number(rate) > 0 && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: "10px 14px",
                        background: "#f0f7ff",
                        borderRadius: 8,
                        border: "1px solid #dbeafe",
                        fontSize: 12,
                        color: "#374151",
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 6,
                      }}
                    >
                      <div>
                        Labour value: <strong>
                          £{((Number(rate) * Number(cisLabour)) / 100).toFixed(2)}
                        </strong>
                      </div>
                      <div>
                        Material value: <strong>
                          £{((Number(rate) * Number(cisMaterial)) / 100).toFixed(2)}
                        </strong>
                      </div>
                      <div style={{ gridColumn: "1/-1", color: "#1e6be0", marginTop: 4 }}>
                        Est. CIS deduction (20%): <strong>
                          £{((Number(rate) * Number(cisLabour) / 100) * 0.20).toFixed(2)}
                        </strong> per unit @ standard rate
                      </div>
                    </div>
                  )}
                </>
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
