import { useState, useEffect, useMemo } from "react";
import { ff, CUR_SYM } from "../../constants";
import { Btn, Field, Select } from "../atoms";
import { todayStr, fmt } from "../../utils/helpers";
import { fetchUserAccounts } from "../../utils/ledger/fetchUserAccounts";
import { postBillPaymentEntry } from "../../utils/ledger/postBillPaymentEntry";

const PAYMENT_METHODS = ["BACS", "Faster Payments", "CHAPS", "Cheque", "Cash", "Other"];

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/**
 * Modal to record a (full or partial) bank payment against a supplier bill.
 * Posts a DR Accounts Payable / CR Bank journal via postBillPaymentEntry.
 * Does NOT update the bill row here — that's the caller's job (onPaymentRecorded).
 *
 * @param {{
 *   open: boolean,
 *   bill: object,
 *   onClose: () => void,
 *   onPaymentRecorded: (info: { paymentAmount: number, paidDate: string }) => void,
 * }} props
 */
export default function RecordBillPaymentModal({ open, bill, onClose, onPaymentRecorded }) {
  const currSym = CUR_SYM.GBP || "£";

  const total        = Number(bill?.total || 0);
  const cisDeduction = Number(bill?.cis_deduction || 0);
  const alreadyPaid  = Number(bill?.paid_amount || 0);
  const outstanding  = useMemo(() => round2(total - cisDeduction - alreadyPaid), [total, cisDeduction, alreadyPaid]);

  const [paidDate, setPaidDate]             = useState(todayStr());
  const [bankAccountId, setBankAccountId]   = useState("");
  const [paymentMethod, setPaymentMethod]   = useState("BACS");
  const [paymentAmount, setPaymentAmount]   = useState(outstanding > 0 ? outstanding.toFixed(2) : "");
  const [reference, setReference]           = useState("");
  const [accounts, setAccounts]             = useState([]);
  const [userId, setUserId]                 = useState(null);
  const [loading, setLoading]               = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [error, setError]                   = useState("");

  // Bank accounts: asset accounts with a "1xxx" code (future-proof for extra banks).
  const bankAccounts = useMemo(
    () => (accounts || []).filter(a => a.type === "asset" && typeof a.code === "string" && a.code.startsWith("1")),
    [accounts],
  );

  // On open: load chart of accounts
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setAccountsLoading(true);
    setError("");
    (async () => {
      try {
        const { accounts: acc, userId: uid } = await fetchUserAccounts();
        if (cancelled) return;
        setAccounts(acc || []);
        setUserId(uid);
      } catch (err) {
        if (!cancelled) setError(err?.message || "Failed to load accounts");
      } finally {
        if (!cancelled) setAccountsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  // Default bank account to 1200, then 1000, then first.
  useEffect(() => {
    if (!bankAccountId && bankAccounts.length > 0) {
      const preferred =
        bankAccounts.find(a => a.code === "1200") ||
        bankAccounts.find(a => a.code === "1000") ||
        bankAccounts[0];
      if (preferred) setBankAccountId(preferred.id);
    }
  }, [bankAccounts, bankAccountId]);

  if (!open || !bill) return null;

  const noBankAccounts = !accountsLoading && bankAccounts.length === 0;

  const handleSave = async () => {
    setError("");
    const amt = Number(paymentAmount);

    if (!paidDate)                            return setError("Payment date is required.");
    if (!bankAccountId)                       return setError("Please select a bank account.");
    if (!paymentMethod)                       return setError("Payment method is required.");
    if (!Number.isFinite(amt) || amt <= 0)    return setError("Payment amount must be greater than zero.");
    if (amt > outstanding + 0.005) {
      return setError(`Payment exceeds outstanding balance ${fmt(currSym, outstanding)}`);
    }

    setLoading(true);
    const payment = {
      paidDate,
      bankAccountId,
      paymentMethod,
      paymentAmount: round2(amt),
      reference: reference.trim() || undefined,
    };
    const result = await postBillPaymentEntry(bill, payment, accounts, userId);
    setLoading(false);

    if (!result?.success) {
      setError(result?.error || "Failed to record payment.");
      return;
    }

    onPaymentRecorded({ paymentAmount: payment.paymentAmount, paidDate: payment.paidDate });
    onClose();
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.35)" }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: 14, padding: "24px 28px", width: 520, maxWidth: "92vw", boxShadow: "0 12px 40px rgba(0,0,0,0.18)", fontFamily: ff }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2e", margin: "0 0 4px" }}>Record Bill Payment</h3>
        <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 14px", lineHeight: 1.5 }}>
          Posts a bank payment and clears the supplier's Accounts Payable balance.
        </p>

        {/* Bill summary */}
        <div style={{ background: "#f9fafb", border: "1px solid #e8e8ec", borderRadius: 8, padding: "10px 12px", marginBottom: 14, fontSize: 12, color: "#374151" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ color: "#6b7280" }}>Bill</span>
            <span style={{ fontWeight: 600, color: "#1a1a2e" }}>
              {bill.bill_number || "—"} · {bill.supplier_name || "—"}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#6b7280" }}>Total</span>
            <span style={{ fontWeight: 600, color: "#1a1a2e" }}>{fmt(currSym, total)}</span>
          </div>
          {cisDeduction > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
              <span style={{ color: "#6b7280" }}>CIS deducted</span>
              <span style={{ fontWeight: 600, color: "#7c3aed" }}>−{fmt(currSym, cisDeduction)}</span>
            </div>
          )}
          {alreadyPaid > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
              <span style={{ color: "#6b7280" }}>Already paid</span>
              <span style={{ fontWeight: 600, color: "#059669" }}>−{fmt(currSym, alreadyPaid)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, paddingTop: 6, borderTop: "1px solid #e5e7eb" }}>
            <span style={{ color: "#6b7280", fontWeight: 600 }}>Outstanding</span>
            <span style={{ fontWeight: 700, color: outstanding > 0 ? "#1a1a2e" : "#059669" }}>{fmt(currSym, outstanding)}</span>
          </div>
        </div>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", marginBottom: 14, fontSize: 12, color: "#b91c1c" }}>
            {error}
          </div>
        )}

        {noBankAccounts && !error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", marginBottom: 14, fontSize: 12, color: "#b91c1c" }}>
            No bank accounts in your chart of accounts. Add one in Settings → Chart of Accounts.
          </div>
        )}

        <Field label="Payment Date" required>
          <input
            type="date"
            value={paidDate}
            onChange={e => setPaidDate(e.target.value)}
            style={{ width: "100%", padding: "9px 10px", border: "1.5px solid #E0E0E0", borderRadius: 8, fontSize: 13, fontFamily: ff, boxSizing: "border-box" }}
          />
        </Field>

        <Field label="From Bank Account" required>
          <select
            value={bankAccountId}
            onChange={e => setBankAccountId(e.target.value)}
            disabled={noBankAccounts}
            style={{ width: "100%", padding: "9px 10px", border: "1.5px solid #E0E0E0", borderRadius: 8, fontSize: 13, fontFamily: ff, boxSizing: "border-box", background: "#fff" }}
          >
            <option value="">-- Select bank account --</option>
            {bankAccounts.map(a => (
              <option key={a.id} value={a.id}>{a.code} · {a.name}</option>
            ))}
          </select>
        </Field>

        <Field label="Payment Method" required>
          <Select value={paymentMethod} onChange={setPaymentMethod} options={PAYMENT_METHODS} />
        </Field>

        <Field label="Payment Amount" required>
          <input
            type="number"
            step="0.01"
            min="0"
            value={paymentAmount}
            onChange={e => setPaymentAmount(e.target.value)}
            placeholder="0.00"
            style={{ width: "100%", padding: "9px 10px", border: "1.5px solid #E0E0E0", borderRadius: 8, fontSize: 13, fontFamily: ff, boxSizing: "border-box" }}
          />
        </Field>

        <Field label="Reference">
          <input
            type="text"
            value={reference}
            onChange={e => setReference(e.target.value)}
            placeholder="Optional bank reference"
            style={{ width: "100%", padding: "9px 10px", border: "1.5px solid #E0E0E0", borderRadius: 8, fontSize: 13, fontFamily: ff, boxSizing: "border-box" }}
          />
        </Field>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <Btn variant="outline" onClick={onClose} disabled={loading}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSave} disabled={loading || noBankAccounts || accountsLoading}>
            {loading ? "Saving…" : "Record Payment"}
          </Btn>
        </div>
      </div>
    </div>
  );
}
