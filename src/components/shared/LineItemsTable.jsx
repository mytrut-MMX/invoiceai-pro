import { useState } from "react";
import { UK_VAT_RATES } from "../../constants";
import { Icons } from "../icons";
import { Btn, Input } from "../atoms";
import { fmt, newLine } from "../../utils/helpers";

export function LineItemsTable({ items, onChange, currSymbol, catalogItems, isVat, onAddNewItem, isCISInvoice }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerQty, setPickerQty] = useState({});

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
  const filteredCat = activeItems.filter(i =>
    !pickerSearch
    || i.name.toLowerCase().includes(pickerSearch.toLowerCase())
    || (i.description || "").toLowerCase().includes(pickerSearch.toLowerCase())
  );

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
      {/* Catalogue picker */}
      {activeItems.length > 0 && (
        <div className="relative mb-3">
          <div className="px-3 py-2.5 bg-[var(--surface-sunken)] rounded-[var(--radius-lg)] border border-[var(--border-subtle)] flex items-center justify-between gap-3">
            <span className="text-xs text-[var(--text-tertiary)]">Quick-add from items catalogue</span>
            <Btn onClick={() => { setPickerOpen(o => !o); setPickerSearch(""); }} variant="outline" size="sm" icon={<Icons.Items />}>
              Browse items
            </Btn>
          </div>
          {pickerOpen && (
            <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border border-[var(--border-default)] rounded-[var(--radius-lg)] p-3 shadow-[var(--shadow-popover)] z-[400]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[var(--text-primary)]">Select item to add</span>
                <button
                  onClick={() => setPickerOpen(false)}
                  className="bg-transparent border-none cursor-pointer text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] flex p-0.5"
                >
                  <Icons.X />
                </button>
              </div>
              <input
                value={pickerSearch}
                onChange={e => setPickerSearch(e.target.value)}
                placeholder="Search items…"
                autoFocus
                className="w-full h-9 px-3 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-white outline-none focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)] mb-2 box-border"
              />
              <div className="max-h-[240px] overflow-y-auto">
                {filteredCat.length === 0 && (
                  <div className="py-3.5 text-center text-[var(--text-tertiary)] text-sm">No matching items</div>
                )}
                {filteredCat.map(ci => {
                  const qty = Number(pickerQty[ci.id] || 1);
                  return (
                    <div
                      key={ci.id}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-[var(--radius-md)] hover:bg-[var(--surface-sunken)] transition-colors duration-150"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[var(--text-primary)] truncate">{ci.name}</div>
                        {ci.description && (
                          <div className="text-xs text-[var(--text-tertiary)] truncate">{ci.description}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                        <input
                          type="number"
                          min="1"
                          value={pickerQty[ci.id] || 1}
                          onChange={e => setPickerQty(prev => ({ ...prev, [ci.id]: e.target.value }))}
                          className="w-16 h-8 px-2 border border-[var(--border-default)] rounded-[var(--radius-md)] text-xs bg-white outline-none focus:border-[var(--brand-600)] [-moz-appearance:textfield]"
                        />
                        <button
                          onClick={() => {
                            const safeQty = Number.isFinite(qty) && qty > 0 ? qty : 1;
                            const newItem = {
                              id: crypto.randomUUID(),
                              name: ci.name,
                              description: ci.description || "",
                              quantity: safeQty,
                              rate: ci.rate,
                              tax_rate: isVat ? (ci.taxRate || 20) : 0,
                              amount: ci.rate * safeQty,
                              cisApplicable: isCISInvoice ? (ci.cisApplicable !== false) : !!ci.cisApplicable,
                              sort_order: items.length,
                            };
                            onChange([...items, newItem]);
                            setPickerOpen(false);
                            setPickerSearch("");
                          }}
                          className="h-8 px-3 bg-[var(--text-primary)] hover:bg-[var(--surface-dark-2)] text-white rounded-[var(--radius-md)] border-none cursor-pointer text-xs font-semibold transition-colors duration-150"
                        >
                          Add
                        </button>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">{fmt(currSymbol, ci.rate)}</div>
                          <div className="text-[11px] text-[var(--text-tertiary)]">
                            {ci.unit}{isVat ? ` · ${ci.taxRate}% VAT` : ""}
                          </div>
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
      <div
        className="grid gap-2 pb-2 border-b border-[var(--border-subtle)] mb-2"
        style={{ gridTemplateColumns: cols }}
      >
        {headers.map(([h, a]) => (
          <div
            key={h || `spacer-${a}`}
            className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]"
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
          <div className="grid gap-1.5">
            <Input value={it.name || ""} onChange={v => upd(it.id, "name", v)} placeholder={`Item ${idx + 1} name…`} />
            <Input value={it.description || ""} onChange={v => upd(it.id, "description", v)} placeholder="Description (optional)" />
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
