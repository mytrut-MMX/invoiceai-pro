import { useState, useRef, useEffect, useMemo } from "react";
import { UK_VAT_RATES } from "../../constants";
import { Icons } from "../icons";
import { Input } from "../atoms";
import { fmt, newLine } from "../../utils/helpers";

function ItemAutocomplete({ value, catalogItems, placeholder, currSymbol, onSelect, onManualChange, onAddNewItem }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef(null);

  const q = (query || "").toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return catalogItems;
    return catalogItems.filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.description || "").toLowerCase().includes(q)
    );
  }, [catalogItems, q]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    if (highlight >= filtered.length) setHighlight(0);
  }, [filtered.length, highlight]);

  const handleSelect = ci => {
    onSelect(ci);
    setOpen(false);
    setQuery("");
  };

  const onKeyDown = e => {
    if (!open) {
      if (e.key === "ArrowDown") { setOpen(true); e.preventDefault(); }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight(h => Math.min(h + 1, Math.max(filtered.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      if (filtered[highlight]) {
        e.preventDefault();
        handleSelect(filtered[highlight]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        value={value ?? ""}
        onChange={e => { onManualChange(e.target.value); setQuery(e.target.value); if (!open) setOpen(true); }}
        onFocus={() => { setQuery(value || ""); setOpen(true); }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="border-none outline-none bg-transparent w-full px-3 pt-2 pb-0.5 text-sm font-medium text-[var(--text-primary)]"
      />
      {open && (
        <div className="absolute top-[calc(100%+4px)] left-0 bg-white border border-[var(--border-default)] rounded-[var(--radius-lg)] shadow-[var(--shadow-popover)] z-[400] min-w-[320px] w-full">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-subtle)]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              {filtered.length} {filtered.length === 1 ? "item" : "items"}
            </span>
            {onAddNewItem && (
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); setOpen(false); onAddNewItem(); }}
                className="bg-transparent border-none cursor-pointer text-xs font-semibold text-[var(--brand-600)] hover:text-[var(--brand-700)] p-0"
              >
                + New item
              </button>
            )}
          </div>
          <div className="max-h-[280px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-3">
                <div className="text-sm text-[var(--text-tertiary)] mb-2">No matching items</div>
                <button
                  type="button"
                  onMouseDown={e => { e.preventDefault(); setOpen(false); }}
                  className="inline-flex items-center h-7 px-2.5 bg-transparent border border-[var(--border-default)] rounded-[var(--radius-md)] cursor-pointer text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]"
                >
                  Use "{value || query}" as custom item
                </button>
              </div>
            ) : (
              filtered.map((ci, idx) => (
                <div
                  key={ci.id}
                  onMouseDown={e => { e.preventDefault(); handleSelect(ci); }}
                  onMouseEnter={() => setHighlight(idx)}
                  className={[
                    "flex items-center justify-between gap-3 px-3 py-2 cursor-pointer transition-colors duration-150",
                    idx === highlight ? "bg-[var(--brand-50)]" : "hover:bg-[var(--surface-sunken)]",
                  ].join(" ")}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-[var(--text-primary)] truncate">{ci.name}</div>
                    {ci.description && (
                      <div className="text-xs text-[var(--text-tertiary)] truncate">{ci.description}</div>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-[var(--text-primary)] tabular-nums flex-shrink-0">
                    {fmt(currSymbol, ci.rate)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function LineItemsTable({ items, onChange, currSymbol, catalogItems, isVat, onAddNewItem, isCISInvoice }) {
  const upd = (id, f, v) => onChange(items.map(it => {
    if (it.id !== id) return it;
    const patch = typeof f === "object" ? f : { [f]: v };
    const u = { ...it, ...patch };
    if (!patch.cisApplicable) u.amount = Number(u.quantity) * Number(u.rate);
    return u;
  }));

  const addBlank = () => onChange([...items, { ...newLine(items.length), cisApplicable: !!isCISInvoice }]);
  const del = id => items.length > 1 && onChange(items.filter(i => i.id !== id));

  const activeItems = (catalogItems || []).filter(i => i.active);

  // Column template: Description | Qty | Rate | (VAT if applicable) | Amount | (CIS toggle) | Delete
  const cols = isVat
    ? (isCISInvoice ? "1fr 68px 84px 120px 92px 44px 28px" : "1fr 68px 84px 120px 92px 28px")
    : (isCISInvoice ? "1fr 68px 90px 92px 44px 28px"       : "1fr 68px 90px 92px 28px");

  const headers = isVat
    ? [
        ["Description", "left"],
        ["Qty", "center"],
        [`Rate (${currSymbol})`, "right"],
        ["VAT", "center"],
        ["Amount", "right"],
        ...(isCISInvoice ? [["CIS", "center"]] : []),
        ["", ""],
      ]
    : [
        ["Description", "left"],
        ["Qty", "center"],
        [`Rate (${currSymbol})`, "right"],
        ["Amount", "right"],
        ...(isCISInvoice ? [["CIS", "center"]] : []),
        ["", ""],
      ];

  return (
    <div>
      {/* Table headers */}
      <div
        className="grid gap-2 pb-2 border-b border-[var(--border-subtle)] mb-2"
        style={{ gridTemplateColumns: cols }}
      >
        {headers.map(([h, a]) => (
          <div
            key={h || `spacer-${a}`}
            className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]"
            style={{ textAlign: a || "left" }}
          >
            {h}
          </div>
        ))}
      </div>

      {/* Rows */}
      {items.map((it, idx) => (
        <div
          key={it.id}
          className="grid gap-2 mb-2 items-center"
          style={{ gridTemplateColumns: cols }}
        >
          <div className="border border-[var(--border-default)] rounded-[var(--radius-md)] focus-within:border-[var(--brand-600)] focus-within:shadow-[var(--focus-ring)] transition-colors duration-150">
            <ItemAutocomplete
              value={it.name || ""}
              catalogItems={activeItems}
              placeholder="Item name…"
              currSymbol={currSymbol}
              onManualChange={v => upd(it.id, "name", v)}
              onAddNewItem={onAddNewItem}
              onSelect={ci => upd(it.id, {
                name: ci.name,
                description: ci.description || "",
                rate: ci.rate,
                tax_rate: isVat ? (ci.taxRate || 20) : 0,
                amount: ci.rate * Number(it.quantity || 1),
                cisApplicable: isCISInvoice ? (ci.cisApplicable !== false) : !!ci.cisApplicable,
              })}
            />
            <input
              type="text"
              value={it.description || ""}
              onChange={e => upd(it.id, "description", e.target.value)}
              placeholder="Description (optional)"
              className="border-none outline-none bg-transparent w-full px-3 pt-0 pb-2 text-xs text-[var(--text-secondary)]"
            />
          </div>
          <Input value={it.quantity} onChange={v => upd(it.id, "quantity", v)} type="number" align="center" style={{ MozAppearance: "textfield" }} />
          <Input value={it.rate} onChange={v => upd(it.id, "rate", v)} type="number" align="right" style={{ MozAppearance: "textfield" }} />
          {isVat && (
            <select
              value={it.tax_type === "exempt" ? "exempt" : it.tax_type === "outside_scope" ? "outside" : String(it.tax_rate || 0)}
              onChange={e => {
                const selected = UK_VAT_RATES.find(r => r.value === e.target.value);
                if (selected) upd(it.id, { tax_rate: selected.rate, tax_type: selected.type });
              }}
              className="w-full h-9 px-2 border border-[var(--border-default)] rounded-[var(--radius-md)] text-xs bg-white text-[var(--text-primary)] outline-none cursor-pointer focus:border-[var(--brand-600)]"
            >
              {UK_VAT_RATES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          )}
          <div className="text-right text-sm font-semibold text-[var(--text-primary)] tabular-nums">
            {fmt(currSymbol, it.amount)}
          </div>
          {isCISInvoice && (
            <div className="flex justify-center">
              <button
                onClick={() => upd(it.id, "cisApplicable", !it.cisApplicable)}
                title={it.cisApplicable ? "CIS applies — click to exclude" : "Click to apply CIS deduction"}
                className={[
                  "relative w-9 h-[22px] rounded-full border-none cursor-pointer flex-shrink-0 transition-colors duration-150",
                  it.cisApplicable ? "bg-[var(--warning-600)]" : "bg-[var(--border-default)]",
                ].join(" ")}
              >
                <span
                  className={[
                    "absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-all duration-150",
                    it.cisApplicable ? "left-[18px]" : "left-0.5",
                  ].join(" ")}
                />
              </button>
            </div>
          )}
          <button
            onClick={() => del(it.id)}
            disabled={items.length === 1}
            className={[
              "w-7 h-7 border-none bg-transparent flex items-center justify-center transition-colors duration-150",
              items.length === 1
                ? "text-[var(--text-disabled)] cursor-not-allowed"
                : "text-[var(--text-disabled)] hover:text-[var(--danger-600)] cursor-pointer",
            ].join(" ")}
          >
            <Icons.Trash />
          </button>
        </div>
      ))}

      {/* Add line item buttons */}
      <div className="flex gap-2 mt-2">
        <button
          onClick={addBlank}
          className="inline-flex items-center gap-1.5 h-8 px-2.5 bg-transparent border-none cursor-pointer text-xs font-medium text-[var(--brand-600)] hover:bg-[var(--brand-50)] rounded-[var(--radius-md)] transition-colors duration-150"
        >
          <Icons.Plus />
          Add line item
        </button>
        {onAddNewItem && (
          <button
            onClick={onAddNewItem}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 bg-transparent border-none cursor-pointer text-xs font-medium text-[var(--info-600)] hover:bg-[var(--info-50)] rounded-[var(--radius-md)] transition-colors duration-150"
          >
            <Icons.Items />
            Create new item
          </button>
        )}
      </div>
    </div>
  );
}