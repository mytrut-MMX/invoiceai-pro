import { useState, useEffect } from "react";
import { Btn, Field, Select } from "../atoms";
import { todayStr, fmtDate, fmt } from "../../utils/helpers";

const PAYMENT_METHODS = ["BACS", "Faster Payments", "CHAPS", "Cheque", "Cash", "Other"];

/**
 * Modal to record the actual bank payment of net wages for a submitted payroll run.
 *
 * @param {{ run: object, accounts: Array, onClose: () => void, onConfirm: (details: object) => void }} props
 */
export default function RecordPaymentModal({ run, accounts, onClose, onConfirm }) {
  const [paidDate, setPaidDate] = useState(todayStr());
  const [bankAccountId, setBankAccountId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("BACS");
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const bankAccounts = (accounts || []).filter(a => a.type === "asset");

  useEffect(() => {
    if (!bankAccountId && bankAccounts.length > 0) {
      const defaultBank = bankAccounts.find(a => a.code === "1000") || bankAccounts[0];
      if (defaultBank) setBankAccountId(defaultBank.id);
    }
  }, [accounts, bankAccountId]);

  const handleConfirm = () => {
    setError("");
    if (!paidDate) { setError("Payment date is required"); return; }
    if (!bankAccountId) { setError("Please select a bank account"); return; }
    if (!paymentMethod) { setError("Payment method is required"); return; }
    setBusy(true);
    onConfirm({ paidDate, bankAccountId, paymentMethod, reference: reference.trim() || null });
  };

  const netPay = Number(run?.total_net || 0);

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.35)" }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: 14, padding: "24px 28px", width: 480, maxWidth: "92vw", boxShadow: "0 12px 40px rgba(0,0,0,0.18)" }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2e", margin: "0 0 4px" }}>Record Payment</h3>
        <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 16px", lineHeight: 1.5 }}>
          Net pay: <strong>£{fmt("", netPay)}</strong> · Period: {fmtDate(run?.period_start)} – {fmtDate(run?.period_end)}
        </p>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", marginBottom: 14, fontSize: 12, color: "#b91c1c" }}>
            {error}
          </div>
        )}

        <Field label="Payment Date" required>
          <input
            type="date"
            value={paidDate}
            onChange={e => setPaidDate(e.target.value)}
            style={{ width: "100%", padding: "9px 10px", border: "1.5px solid #E0E0E0", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }}
          />
        </Field>

        <Field label="From Bank Account" required>
          <select
            value={bankAccountId}
            onChange={e => setBankAccountId(e.target.value)}
            style={{ width: "100%", padding: "9px 10px", border: "1.5px solid #E0E0E0", borderRadius: 8, fontSize: 13, boxSizing: "border-box", background: "#fff" }}
          >
            <option value="">-- Select bank account --</option>
            {bankAccounts.map(a => (
              <option key={a.id} value={a.id}>{a.code} · {a.name}</option>
            ))}
          </select>
        </Field>

        <Field label="Payment Method" required>
          <Select
            value={paymentMethod}
            onChange={setPaymentMethod}
            options={PAYMENT_METHODS}
          />
        </Field>

        <Field label="Reference">
          <input
            type="text"
            value={reference}
            onChange={e => setReference(e.target.value)}
            placeholder="Optional bank reference"
            style={{ width: "100%", padding: "9px 10px", border: "1.5px solid #E0E0E0", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }}
          />
        </Field>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <Btn variant="outline" onClick={onClose} disabled={busy}>Cancel</Btn>
          <Btn variant="primary" onClick={handleConfirm} disabled={busy || bankAccounts.length === 0}>
            {busy ? "Processing…" : "Record Payment"}
          </Btn>
        </div>
      </div>
    </div>
  );
}
