import { useState, useContext, useRef, useEffect, useCallback } from "react";
import { TAX_RATES, ITEM_TYPES, ITEM_UNITS, ACCOUNT_CATEGORIES } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Field, Input, Select, Textarea, Switch, Btn, InfoBox } from "../components/atoms";
import { Icons } from "../components/icons";
import { useCISSettings } from "../hooks/useCISSettings";
import { validateImageDataUrl } from "../utils/security";

function UnitCombobox({ value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value || "");
  const wrapRef = useRef(null);

  useEffect(() => { setSearch(value || ""); }, [value]);

  useEffect(() => {
    const handler = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter(o => !search || o.toLowerCase().includes(search.toLowerCase()));

  const select = opt => {
    onChange(opt);
    setSearch(opt);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <div
        onClick={() => setOpen(o => !o)}
        className={[
          "flex items-center border rounded-[var(--radius-md)] bg-white cursor-text transition-[border-color,box-shadow] duration-150",
          open ? "border-[var(--brand-600)] shadow-[var(--focus-ring)]" : "border-[var(--border-default)]",
        ].join(" ")}
      >
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Select or type to add"
          className="flex-1 h-9 pl-3 pr-1 border-none outline-none text-sm bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
        />
        <span className={`pr-3 flex items-center text-[var(--text-tertiary)] flex-shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}>
          <Icons.ChevDown />
        </span>
      </div>
      {open && (
        <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border border-[var(--border-default)] rounded-[var(--radius-lg)] shadow-[var(--shadow-popover)] z-[500] max-h-[200px] overflow-y-auto">
          {filtered.length === 0 && search ? (
            <div
              onMouseDown={() => select(search)}
              className="px-3 py-2.5 text-sm text-[var(--brand-600)] cursor-pointer hover:bg-[var(--brand-50)] transition-colors duration-150"
            >
              Add "{search}"
            </div>
          ) : filtered.map(opt => {
            const active = opt === value;
            return (
              <div
                key={opt}
                onMouseDown={() => select(opt)}
                className={[
                  "px-3 py-2.5 text-sm cursor-pointer transition-colors duration-150",
                  active ? "bg-[var(--brand-50)] text-[var(--brand-700)] font-medium" : "text-[var(--text-primary)] hover:bg-[var(--surface-sunken)]",
                ].join(" ")}
              >
                {opt}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ImageUpload({ value, onChange }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const MAX_SIZE = 2 * 1024 * 1024;

  const loadFile = useCallback(file => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > MAX_SIZE) { alert("Image must be under 2 MB"); return; }
    const reader = new FileReader();
    reader.onload = e => {
      const result = e.target.result;
      if (validateImageDataUrl(result)) onChange(result);
    };
    reader.readAsDataURL(file);
  }, [onChange]);

  const onDrop = e => {
    e.preventDefault();
    setDragging(false);
    loadFile(e.dataTransfer.files[0]);
  };

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={[
        "border-2 border-dashed rounded-[var(--radius-lg)] transition-colors duration-150 flex items-center justify-center min-h-[130px] p-4 gap-5 flex-wrap",
        dragging
          ? "border-[var(--brand-600)] bg-[var(--brand-50)]"
          : "border-[var(--border-subtle)] bg-[var(--surface-sunken)]",
      ].join(" ")}
    >
      {value ? (
        <div className="relative flex-shrink-0">
          <img src={value} alt="item" className="w-[90px] h-[90px] object-cover rounded-[var(--radius-md)] border border-[var(--border-subtle)]" />
          <button
            onClick={() => onChange("")}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[var(--danger-600)] border-none text-white text-xs leading-none cursor-pointer flex items-center justify-center"
          >
            ×
          </button>
        </div>
      ) : (
        <div className="text-center">
          <div className="text-[var(--text-tertiary)] mb-2 flex justify-center">
            <Icons.Items />
          </div>
          <div className="text-xs text-[var(--text-tertiary)] mb-1.5">Drag image here or</div>
          <button
            onClick={() => inputRef.current?.click()}
            className="text-xs text-[var(--brand-600)] hover:text-[var(--brand-700)] bg-transparent border-none cursor-pointer font-semibold p-0"
          >
            Browse images
          </button>
          <div className="text-[11px] text-[var(--text-tertiary)] mt-1">JPG, PNG, GIF — max 2 MB</div>
        </div>
      )}
      {value && (
        <button
          onClick={() => inputRef.current?.click()}
          className="text-xs text-[var(--brand-600)] hover:text-[var(--brand-700)] bg-transparent border border-[var(--brand-600)] rounded-[var(--radius-md)] cursor-pointer font-semibold px-3 py-1.5"
        >
          Change image
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/gif,image/jpeg,image/png,image/bmp,image/jpg"
        className="hidden"
        onChange={e => loadFile(e.target.files[0])}
      />
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
        ? { enabled: true, labour: Number(cisLabour), material: Number(cisMaterial) }
        : { enabled: false },
    };

    setSaved(true);
    setTimeout(() => { onSave(item); onClose(); }, 600);
  };

  return (
    <div className="bg-[var(--surface-page)] min-h-screen">
      <div className="max-w-[720px] mx-auto pb-10">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-[var(--surface-card)] border-b border-[var(--border-subtle)] px-6 py-3 flex items-center justify-between">
          <span className="text-lg font-semibold text-[var(--text-primary)]">
            {isEdit ? existing.name : "New item"}
          </span>
          <div className="flex gap-2">
            <Btn onClick={onClose} variant="outline">Cancel</Btn>
            <Btn onClick={handleSave} variant="primary" disabled={!name || !rate || saved}>
              {saved ? "Saved ✓" : isEdit ? "Save changes" : "Save item"}
            </Btn>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Item details card */}
          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">
              Item details
            </div>

            <Field label="Photo">
              <ImageUpload value={photo} onChange={setPhoto} />
            </Field>
            <Field label="Item Type" required>
              <Select value={itemType} onChange={setItemType} options={ITEM_TYPES.map(t => ({ value: t, label: t }))} />
            </Field>
            <Field label="Item Name" required>
              <Input value={name} onChange={setName} placeholder="e.g. Web Design Package" />
              {name && items.some(i => i.id !== existing?.id && i.name?.toLowerCase() === name.toLowerCase()) && (
                <div className="text-[11px] text-[var(--warning-700)] mt-1">
                  ⚠ An item with this name already exists
                </div>
              )}
            </Field>
            <Field label="Description">
              <Textarea value={description} onChange={setDescription} placeholder="Brief description…" rows={2} />
            </Field>

            <div className={`grid gap-3 ${isVat ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2"}`}>
              <Field label="Rate" required>
                <Input value={rate} onChange={setRate} placeholder="0.00" type="number" align="right" />
              </Field>
              <Field label="Unit">
                <UnitCombobox value={unit} onChange={setUnit} options={ITEM_UNITS} />
              </Field>
              {isVat && (
                <Field label="VAT Rate">
                  <Select
                    value={String(taxRate)}
                    onChange={v => setTaxRate(Number(v))}
                    options={TAX_RATES.map(r => ({ value: String(r), label: `${r}%` }))}
                  />
                </Field>
              )}
            </div>

            {!isVat && (
              <InfoBox color="var(--warning-600)">
                VAT Rate hidden — your organisation is not VAT registered.
              </InfoBox>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
              <Field label="SKU / Code">
                <Input value={sku} onChange={setSku} placeholder="e.g. WD-001" />
              </Field>
              <Field label="Account / Category">
                <Select value={account} onChange={setAccount} options={ACCOUNT_CATEGORIES} placeholder="Select category…" />
              </Field>
            </div>
          </div>

          {/* CIS card */}
          {cisEnabled && (
            <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">CIS details</div>
                  <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
                    Mark this item as subject to CIS deductions
                  </div>
                </div>
                <Switch checked={isCIS} onChange={setIsCIS} />
              </div>

              {isCIS && (
                <>
                  <div className="grid grid-cols-2 gap-3 mt-4">
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
                    <div className="mt-2 text-xs text-[var(--danger-600)]">
                      ⚠ Labour + Material must equal 100%
                    </div>
                  )}

                  {Number(rate) > 0 && (
                    <div className="mt-3 px-3 py-2.5 bg-[var(--warning-50)] rounded-[var(--radius-md)] border border-[var(--warning-100)] text-xs text-[var(--warning-700)] grid grid-cols-2 gap-1.5">
                      <div>
                        Labour value: <strong>£{((Number(rate) * Number(cisLabour)) / 100).toFixed(2)}</strong>
                      </div>
                      <div>
                        Material value: <strong>£{((Number(rate) * Number(cisMaterial)) / 100).toFixed(2)}</strong>
                      </div>
                      <div className="col-span-full mt-1">
                        Est. CIS deduction (20%): <strong>£{((Number(rate) * Number(cisLabour) / 100) * 0.20).toFixed(2)}</strong> per unit @ standard rate
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Active toggle */}
          <div className="flex items-center justify-between px-3 py-2.5 bg-[var(--surface-sunken)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">Active</div>
              <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">Available in invoices and quotes</div>
            </div>
            <Switch checked={active} onChange={setActive} />
          </div>
        </div>
      </div>
    </div>
  );
}
