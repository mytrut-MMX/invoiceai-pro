import { useState, useContext, useRef, useEffect, useCallback } from "react";
import { ff, TAX_RATES, ITEM_TYPES, ITEM_UNITS, ACCOUNT_CATEGORIES } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Field, Input, Select, SlideToggle, Textarea, Switch, Btn, InfoBox } from "../components/atoms";
import { useCISSettings } from "../hooks/useCISSettings";

function UnitCombobox({ value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value || "");
  const wrapRef = useRef(null);

  useEffect(() => {
    setSearch(value || "");
  }, [value]);

  useEffect(() => {
    const handler = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter(o =>
    !search || o.toLowerCase().includes(search.toLowerCase())
  );

  const select = opt => {
    onChange(opt);
    setSearch(opt);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center",
          border: `1px solid ${open ? "#1e6be0" : "#e8e8ec"}`,
          borderRadius: 5, background: "#fff", cursor: "text",
          boxShadow: open ? "0 0 0 2px #1e6be022" : "none",
          transition: "border-color 0.15s, box-shadow 0.15s",
        }}>
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Select or type to add"
          style={{
            flex: 1, padding: "9px 4px 9px 11px",
            border: "none", outline: "none",
            fontSize: 14, fontFamily: ff, color: "#1a1a2e", background: "transparent",
          }}
        />
        <span style={{ padding: "0 10px", display: "flex", alignItems: "center", color: "#9ca3af", flexShrink: 0 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 512 512"
            style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
            <path d="M2.157 159.57c0 13.773 5.401 27.542 16.195 38.02l198.975 192.867c21.411 20.725 55.94 20.725 77.34 0L493.63 197.59c21.508-20.846 21.637-54.778.269-75.773-21.35-20.994-56.104-21.098-77.612-.26L256.004 276.93 95.721 121.562c-21.528-20.833-56.268-20.734-77.637.26C7.472 132.261 2.157 145.923 2.157 159.57z" fill="currentColor" />
          </svg>
        </span>
      </div>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 3px)", left: 0, right: 0,
          background: "#fff", border: "1.5px solid #e8e8ec", borderRadius: 7,
          boxShadow: "0 6px 20px rgba(0,0,0,0.10)", zIndex: 500,
          maxHeight: 200, overflowY: "auto",
        }}>
          {filtered.length === 0 && search ? (
            <div
              onMouseDown={() => select(search)}
              style={{ padding: "9px 13px", fontSize: 13, color: "#1e6be0", cursor: "pointer", fontFamily: ff }}
              onMouseEnter={e => e.currentTarget.style.background = "#f0f5ff"}
              onMouseLeave={e => e.currentTarget.style.background = ""}>
              Add "{search}"
            </div>
          ) : filtered.map(opt => (
            <div
              key={opt}
              onMouseDown={() => select(opt)}
              style={{
                padding: "9px 13px", fontSize: 13,
                color: opt === value ? "#1e6be0" : "#1a1a2e",
                fontWeight: opt === value ? 600 : 400,
                cursor: "pointer", fontFamily: ff,
                background: opt === value ? "#f0f5ff" : "",
              }}
              onMouseEnter={e => { if (opt !== value) e.currentTarget.style.background = "#f7f7f9"; }}
              onMouseLeave={e => { if (opt !== value) e.currentTarget.style.background = ""; }}>
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ImageUpload({ value, onChange }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

  const loadFile = useCallback(file => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > MAX_SIZE) { alert("Image must be under 2 MB"); return; }
    const reader = new FileReader();
    reader.onload = e => onChange(e.target.result);
    reader.readAsDataURL(file);
  }, [onChange]);

  const onDrop = e => {
    e.preventDefault(); setDragging(false);
    loadFile(e.dataTransfer.files[0]);
  };

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      style={{
        border: `2px dashed ${dragging ? "#1e6be0" : "#d1d5db"}`,
        borderRadius: 10, background: dragging ? "#f0f5ff" : "#fafafa",
        transition: "border-color 0.15s, background 0.15s",
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: 130, padding: 16, gap: 20, flexWrap: "wrap",
      }}>
      {value ? (
        <div style={{ position: "relative", flexShrink: 0 }}>
          <img src={value} alt="item" style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 8, border: "1px solid #e8e8ec" }} />
          <button onClick={() => onChange("")}
            style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "#ef4444", border: "none", color: "#fff", fontSize: 13, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ff }}>
            ×
          </button>
        </div>
      ) : (
        <div style={{ textAlign: "center" }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 472.7 386.4" style={{ width: 44, height: 36, color: "#9ca3af", display: "block", margin: "0 auto 8px" }}>
            <path d="M392 0H81C36 0 0 36 0 81v224a81 81 0 0081 81h311c44 0 81-36 81-81V81c0-45-37-81-81-81zM42 81c0-21 18-39 39-39h311c21 0 39 18 39 39v101l-112 76c-10 7-23 7-33-1l-94-66a72 72 0 00-82 1l-68 48V81zm389 224c0 22-18 39-39 39H81c-21 0-39-17-39-39v-14l92-65c10-7 24-7 34 0l94 66a71 71 0 0081 1l88-60v72z" fill="currentColor"/>
            <path d="M301 83a56 56 0 100 113 56 56 0 000-113zm0 78a21 21 0 110-43 21 21 0 010 43z" fill="currentColor"/>
          </svg>
          <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>Drag image here or</div>
          <button onClick={() => inputRef.current?.click()}
            style={{ fontSize: 12, color: "#1e6be0", background: "none", border: "none", cursor: "pointer", fontFamily: ff, fontWeight: 600, padding: 0 }}>
            Browse images
          </button>
          <div style={{ fontSize: 11, color: "#c4c4c4", marginTop: 4 }}>JPG, PNG, GIF — max 2 MB</div>
        </div>
      )}
      {value && (
        <button onClick={() => inputRef.current?.click()}
          style={{ fontSize: 12, color: "#1e6be0", background: "none", border: "1px solid #1e6be0", borderRadius: 6, cursor: "pointer", fontFamily: ff, fontWeight: 600, padding: "6px 12px" }}>
          Change image
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/gif,image/jpeg,image/png,image/bmp,image/jpg"
        style={{ display: "none" }} onChange={e => loadFile(e.target.files[0])} />
    </div>
  );
}

export default function ItemForm({ existing, onClose, onSave, settings, items = [] }) {
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
  const [photo, setPhoto] = useState(existing?.photo || "");

  const [saved, setSaved] = useState(false);

  const { cisEnabled } = useCISSettings();
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
      photo: photo || "",
      cis: isCIS
        ? {
            enabled: true,
            labour: Number(cisLabour),
            material: Number(cisMaterial),
          }
        : { enabled: false },
    };

    setSaved(true);
    setTimeout(() => { onSave(item); onClose(); }, 600);
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
            <Btn onClick={handleSave} variant="primary" disabled={!name || !rate || saved}>
              {saved ? "Saved ✓" : isEdit ? "Save Changes" : "Save Item"}
            </Btn>
          </div>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e8e8ec", padding: "18px 22px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e", marginBottom: 16 }}>Item Details</div>
            <Field label="Photo">
              <ImageUpload value={photo} onChange={setPhoto} />
            </Field>
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

            <Field label="Item Name" required>
              <Input value={name} onChange={setName} placeholder="e.g. Web Design Package" />
              {name && items.some(i => i.id !== existing?.id && i.name?.toLowerCase() === name.toLowerCase()) && (
                <div style={{ fontSize:11, color:"#d97706", marginTop:4 }}>⚠ An item with this name already exists</div>
              )}
            </Field>
            <Field label="Description"><Textarea value={description} onChange={setDescription} placeholder="Brief description…" rows={2} /></Field>

            <div style={{ display: "grid", gridTemplateColumns: isVat ? "1fr 1fr 1fr" : "1fr 1fr", gap: 12 }}>
              <Field label="Rate" required><Input value={rate} onChange={setRate} placeholder="0.00" type="number" align="right" /></Field>
              <Field label="Unit">
                <UnitCombobox value={unit} onChange={setUnit} options={ITEM_UNITS} />
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
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>
                    CIS Details
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                    Mark this item as subject to CIS deductions
                  </div>
                </div>
                <Switch checked={isCIS} onChange={setIsCIS} />
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
