import { useState, useRef, useEffect, useContext } from "react";
import { CUR_SYM, PAYMENT_METHODS } from "../../constants";
import { AppCtx } from "../../context/AppContext";
import { Icons } from "../icons";
import { Field, Input, Select, Btn } from "../atoms";
import { fmt, todayStr } from "../../utils/helpers";

export { CustomerPicker } from "./CustomerPicker";
export { LineItemsTable } from "./LineItemsTable";
export { A4InvoiceDoc } from "./A4InvoiceDoc";
export { A4PrintModal } from "./A4PrintModal";

// ─── TOTALS BLOCK ─────────────────────────────────────────────────────────────
export function TotalsBlock({
  subtotal, discountType, discountValue, setDiscountType, setDiscountValue,
  shipping, setShipping, taxBreakdown, total, currSymbol, isVat, cisDeduction,
  showShipping = true,
}) {
  const discAmt = discountType === "percent"
    ? subtotal * (Number(discountValue) / 100)
    : Math.min(Number(discountValue), subtotal);

  const Row = ({ label, value, valueClass = "text-[var(--text-primary)]" }) => (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      <span className={`text-sm font-medium tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );

  return (
    <div className="bg-[var(--surface-sunken)] rounded-[var(--radius-lg)] border border-[var(--border-subtle)] p-4 min-w-[260px]">
      <Row label="Subtotal" value={fmt(currSymbol, subtotal)} />

      {/* Discount row */}
      <div className="flex items-center justify-between py-1">
        <span className="text-sm text-[var(--text-secondary)]">Discount</span>
        <div className="flex items-center gap-1.5">
          <div className="inline-flex rounded-[var(--radius-sm)] border border-[var(--border-default)] overflow-hidden">
            {[["percent", "%"], ["fixed", currSymbol]].map(([t, l]) => {
              const active = discountType === t;
              return (
                <button
                  key={t}
                  onClick={() => setDiscountType(t)}
                  className={[
                    "px-2 py-0.5 text-[11px] font-semibold cursor-pointer border-none transition-colors duration-150",
                    active
                      ? "bg-[var(--text-primary)] text-white"
                      : "bg-transparent text-[var(--text-tertiary)] hover:bg-white",
                  ].join(" ")}
                >
                  {l}
                </button>
              );
            })}
          </div>
          <input
            value={discountValue}
            onChange={e => setDiscountValue(e.target.value)}
            type="number"
            min="0"
            className="w-16 h-7 px-2 border border-[var(--border-default)] rounded-[var(--radius-sm)] text-sm text-right tabular-nums bg-white outline-none focus:border-[var(--brand-600)] [-moz-appearance:textfield]"
          />
        </div>
      </div>

      {discAmt > 0 && (
        <Row label="" value={`− ${fmt(currSymbol, discAmt)}`} valueClass="text-[var(--warning-700)]" />
      )}

      {showShipping && (
        <div className="flex items-center justify-between py-1">
          <span className="text-sm text-[var(--text-secondary)]">Shipping</span>
          <input
            value={shipping}
            onChange={e => setShipping(e.target.value)}
            type="number"
            min="0"
            placeholder="0.00"
            inputMode="decimal"
            className="w-24 h-7 px-2 border border-[var(--border-default)] rounded-[var(--radius-sm)] text-sm text-right tabular-nums bg-white outline-none focus:border-[var(--brand-600)] [-moz-appearance:textfield]"
          />
        </div>
      )}

      {isVat && taxBreakdown.map(tb => (
        <Row key={tb.rate} label={`VAT ${tb.rate}%`} value={fmt(currSymbol, tb.amount)} />
      ))}

      {cisDeduction > 0 && (
        <Row label="CIS Deduction" value={`− ${fmt(currSymbol, cisDeduction)}`} valueClass="text-[var(--warning-700)]" />
      )}

      {/* Total */}
      <div className="flex items-center justify-between pt-2.5 mt-2 border-t-2 border-[var(--text-primary)]">
        <span className="text-base font-bold text-[var(--text-primary)]">Total Due</span>
        <span className="text-base font-bold text-[var(--text-primary)] tabular-nums">
          {fmt(currSymbol, total)}
        </span>
      </div>

      {cisDeduction > 0 && (
        <div className="flex items-center justify-between pt-1 text-[11px] text-[var(--text-tertiary)] tabular-nums">
          <span>Gross (before CIS)</span>
          <span>{fmt(currSymbol, total + cisDeduction)}</span>
        </div>
      )}
    </div>
  );
}

// ─── SAVE SPLIT BUTTON ────────────────────────────────────────────────────────
export function SaveSplitBtn({ onSave, onSaveAndSend, onSaveAndPrint, saving }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const btnBase = "h-9 bg-[var(--text-primary)] hover:bg-[var(--surface-dark-2)] disabled:bg-[var(--text-primary)] text-white border-none text-sm font-semibold transition-colors duration-150";
  const disabled = saving;

  return (
    <div ref={ref} className="relative flex">
      <button
        onClick={() => { onSave(); setOpen(false); }}
        disabled={disabled}
        className={[
          btnBase,
          "px-4 rounded-l-[var(--radius-md)] border-r border-white/15 flex items-center gap-1.5",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        ].join(" ")}
      >
        <Icons.Save />
        {saving ? "Saving…" : "Save"}
      </button>
      <button
        onClick={() => setOpen(o => !o)}
        disabled={disabled}
        className={[
          btnBase,
          "px-2.5 rounded-r-[var(--radius-md)] flex items-center",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        ].join(" ")}
      >
        <Icons.ChevDown />
      </button>
      {open && (
        <div className="absolute top-[calc(100%+4px)] right-0 bg-white border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-popover)] min-w-[180px] z-[500] overflow-hidden">
          {[
            { label: "Save",         icon: <Icons.Save />,    action: onSave },
            { label: "Save & Send",  icon: <Icons.Send />,    action: onSaveAndSend },
            { label: "Save & Print", icon: <Icons.Receipt />, action: onSaveAndPrint },
          ].map(item => (
            <button
              key={item.label}
              onClick={() => { item.action(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3.5 py-2.5 bg-transparent border-none cursor-pointer text-sm font-medium text-[var(--text-primary)] text-left hover:bg-[var(--surface-sunken)] transition-colors duration-150"
            >
              <span className="text-[var(--text-tertiary)] flex">{item.icon}</span>
              {item.label}
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
  const allMethods = [...PAYMENT_METHODS, ...(customPayMethods || [])];
  const [payDate, setPayDate] = useState(todayStr());
  const [payMethod, setPayMethod] = useState("Bank Transfer");
  const [payRef, setPayRef] = useState("");

  return (
    <div className="fixed inset-0 bg-black/50 z-[3000] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-[420px] shadow-[var(--shadow-popover)] overflow-hidden">
        {/* Header */}
        <div className="bg-[var(--success-50)] border-b border-[var(--success-100)] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--success-600)] text-white flex items-center justify-center flex-shrink-0">
              <Icons.Check />
            </div>
            <div className="min-w-0">
              <div className="text-base font-bold text-[var(--success-700)]">Mark as paid</div>
              <div className="text-xs text-[var(--success-700)] mt-0.5 truncate">
                {invoice.invoice_number} · {fmt(CUR_SYM[invoice.currency] || "£", invoice.total)}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-5 flex flex-col gap-3">
          <p className="m-0 text-sm text-[var(--text-secondary)] leading-relaxed">
            Confirm payment details. A record will be automatically added to <strong>Payments Received</strong>.
          </p>
          <Field label="Payment Date" required>
            <input
              value={payDate}
              onChange={e => setPayDate(e.target.value)}
              type="date"
              className="w-full h-9 px-3 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-white outline-none focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)] box-border"
            />
          </Field>
          <Field label="Payment Method" required>
            <Select value={payMethod} onChange={setPayMethod} options={allMethods} />
          </Field>
          <Field label="Reference (optional)">
            <Input value={payRef} onChange={setPayRef} placeholder="Bank ref, transaction ID…" />
          </Field>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-2 flex gap-2 justify-end">
          <Btn onClick={onCancel} variant="outline">Cancel</Btn>
          <Btn onClick={() => onConfirm({ date: payDate, method: payMethod, reference: payRef })} variant="success" icon={<Icons.Check />}>
            Confirm payment
          </Btn>
        </div>
      </div>
    </div>
  );
}
