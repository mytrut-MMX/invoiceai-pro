import { useState, useRef, useEffect, useContext } from "react";
import { ff, CUR_SYM, PAYMENT_METHODS } from "../../constants";
import { AppCtx } from "../../context/AppContext";
import { Icons } from "../icons";
import { Field, Input, Select, Btn } from "../atoms";
import { fmt, todayStr } from "../../utils/helpers";

export { CustomerPicker } from "./CustomerPicker";
export { LineItemsTable } from "./LineItemsTable";
export { A4InvoiceDoc } from "./A4InvoiceDoc";
export { A4PrintModal } from "./A4PrintModal";

// ─── TOTALS BLOCK ─────────────────────────────────────────────────────────────
export function TotalsBlock({ subtotal, discountType, discountValue, setDiscountType, setDiscountValue, shipping, setShipping, taxBreakdown, total, currSymbol, isVat, cisDeduction, showShipping = true }) {
  const discAmt = discountType === "percent" ? subtotal * (Number(discountValue) / 100) : Math.min(Number(discountValue), subtotal);
  const R = ({ label, value, color }) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
      <span style={{ fontSize: 13, color: color || "#666" }}>{label}</span>
      <span style={{ fontSize: 13, color: color || "#444", fontWeight: 500 }}>{value}</span>
    </div>
  );
  return (
    <div style={{ background: "#FAFAFA", borderRadius: 10, border: "1px solid #EBEBEB", padding: "14px 16px", minWidth: 260 }}>
      <R label="Subtotal" value={fmt(currSymbol, subtotal)} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0" }}>
        <span style={{ fontSize: 13, color: "#666" }}>Discount</span>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          <div style={{ display: "flex", border: "1.5px solid #E0E0E0", borderRadius: 6, overflow: "hidden" }}>
            {[["percent", "%"], ["fixed", currSymbol]].map(([t, l]) => (
              <button key={t} onClick={() => setDiscountType(t)}
                style={{ padding: "3px 8px", border: "none", background: discountType === t ? "#1A1A1A" : "transparent", color: discountType === t ? "#fff" : "#999", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: ff }}>{l}</button>
            ))}
          </div>
          <input value={discountValue} onChange={e => setDiscountValue(e.target.value)} type="number" min="0"
            style={{ width: 62, padding: "4px 6px", border: "1.5px solid #E0E0E0", borderRadius: 6, fontSize: 13, textAlign: "right", fontFamily: ff, background: "#fff", outline: "none" }} />
        </div>
      </div>
      {discAmt > 0 && <R label="" value={`− ${fmt(currSymbol, discAmt)}`} color="#E86C4A" />}
      {showShipping && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0" }}>
          <span style={{ fontSize: 13, color: "#666" }}>Shipping</span>
          <input value={shipping} onChange={e => setShipping(e.target.value)} type="number" min="0" placeholder="0.00" inputMode="decimal"
            style={{ width: 86, padding: "4px 6px", border: "1.5px solid #E0E0E0", borderRadius: 6, fontSize: 13, textAlign: "right", fontFamily: ff, background: "#fff", outline: "none" }} />
        </div>
      )}
      {isVat && taxBreakdown.map(tb => <R key={tb.rate} label={`VAT ${tb.rate}%`} value={fmt(currSymbol, tb.amount)} />)}
      {cisDeduction > 0 && <R label="CIS Deduction" value={`− ${fmt(currSymbol, cisDeduction)}`} color="#D97706" />}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0 2px", borderTop: "2px solid #1A1A1A", marginTop: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: "#1A1A1A" }}>Total Due</span>
        <span style={{ fontSize: 16, fontWeight: 800, color: "#1A1A1A" }}>{fmt(currSymbol, total)}</span>
      </div>
      {cisDeduction > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", marginTop: 2 }}>
          <span style={{ fontSize: 11, color: "#AAA" }}>Gross (before CIS)</span>
          <span style={{ fontSize: 11, color: "#AAA" }}>{fmt(currSymbol, total + cisDeduction)}</span>
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
  return (
    <div ref={ref} style={{ position: "relative", display: "flex" }}>
      <button onClick={() => { onSave(); setOpen(false); }} disabled={saving}
        style={{ padding: "8px 14px", background: "#1A1A1A", color: "#fff", border: "none", borderRight: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px 0 0 8px", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: ff, display: "flex", alignItems: "center", gap: 6, opacity: saving ? 0.6 : 1 }}>
        <Icons.Save />{saving ? "Saving…" : "Save"}
      </button>
      <button onClick={() => setOpen(o => !o)} disabled={saving}
        style={{ padding: "8px 9px", background: "#1A1A1A", color: "#fff", border: "none", borderRadius: "0 8px 8px 0", fontSize: 13, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", opacity: saving ? 0.6 : 1 }}>
        <Icons.ChevDown />
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, background: "#fff", border: "1.5px solid #E0E0E0", borderRadius: 9, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 160, zIndex: 500, overflow: "hidden" }}>
          {[
            { label: "Save",         icon: <Icons.Save />,    action: onSave },
            { label: "Save & Send",  icon: <Icons.Send />,    action: onSaveAndSend },
            { label: "Save & Print", icon: <Icons.Receipt />, action: onSaveAndPrint },
          ].map(item => (
            <button key={item.label} onClick={() => { item.action(); setOpen(false); }}
              style={{ width: "100%", padding: "10px 14px", background: "none", border: "none", display: "flex", alignItems: "center", gap: 9, fontSize: 13, fontWeight: 600, color: "#1A1A1A", cursor: "pointer", fontFamily: ff, textAlign: "left" }}
              onMouseEnter={e => e.currentTarget.style.background = "#F7F7F5"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}>
              <span style={{ color: "#888" }}>{item.icon}</span>{item.label}
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.18)", fontFamily: ff, overflow: "hidden" }}>
        <div style={{ background: "#F0FDF4", padding: "18px 22px 14px", borderBottom: "1px solid #BBF7D0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#16A34A", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><Icons.Check /></div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#15803D" }}>Mark as Paid</div>
              <div style={{ fontSize: 12, color: "#16A34A", marginTop: 1 }}>{invoice.invoice_number} · {fmt(CUR_SYM[invoice.currency] || "£", invoice.total)}</div>
            </div>
          </div>
        </div>
        <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 13 }}>
          <p style={{ margin: 0, fontSize: 13, color: "#555", lineHeight: 1.6 }}>Confirm payment details. A record will be automatically added to <strong>Payments Received</strong>.</p>
          <Field label="Payment Date" required>
            <input value={payDate} onChange={e => setPayDate(e.target.value)} type="date"
              style={{ width: "100%", padding: "9px 10px", border: "1.5px solid #E0E0E0", borderRadius: 8, fontSize: 13, fontFamily: ff, outline: "none", boxSizing: "border-box" }} />
          </Field>
          <Field label="Payment Method" required>
            <Select value={payMethod} onChange={setPayMethod} options={allMethods} />
          </Field>
          <Field label="Reference (optional)">
            <Input value={payRef} onChange={setPayRef} placeholder="Bank ref, transaction ID…" />
          </Field>
        </div>
        <div style={{ padding: "12px 22px 18px", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Btn onClick={onCancel} variant="outline">Cancel</Btn>
          <Btn onClick={() => onConfirm({ date: payDate, method: payMethod, reference: payRef })} variant="primary" icon={<Icons.Check />}>Confirm Payment</Btn>
        </div>
      </div>
    </div>
  );
}
