import { useState, useEffect, useMemo } from "react";
import { CUR_SYM } from "../../constants";
import { Btn, Field, Select } from "../atoms";
import { todayStr, fmt } from "../../utils/helpers";
import { fetchUserAccounts } from "../../utils/ledger/fetchUserAccounts";
import { postBillPaymentEntry } from "../../utils/ledger/postBillPaymentEntry";
import { Icons } from "../icons";

const PAYMENT_METHODS = ["BACS", "Faster Payments", "CHAPS", "Cheque", "Cash", "Other"];
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const dateInputCls =
  "w-full h-9 px-3 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-white outline-none focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)] transition-colors duration-150 box-border";

/**
 * Modal to record a (full or partial) bank payment against a supplier bill.
 * Posts a DR Accounts Payable / CR Bank journal via postBillPaymentEntry.
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

  const bankAccounts = useMemo(
    () => (accounts || []).filter(a => a.type === "asset" && typeof a.code === "string" && a.code.startsWith("1")),
    [accounts],
  );

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
      className="fixed inset-0 bg-black/50 z-[3000] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-[520px] shadow-[var(--shadow-popover)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="border-b border-[var(--border-subtle)] px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] m-0">Record bill payment</h3>
            <p className="text-xs text-[var(--text-tertiary)] mt-1 m-0">
              Posts a bank payment and clears the supplier's Accounts Payable balance.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] bg-transparent border-none cursor-pointer flex"
          >
            <Icons.X />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Bill summary */}
          <div className="bg-[var(--surface-sunken)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] px-3 py-2.5 text-xs">
            <div className="flex justify-between mb-1">
              <span className="text-[var(--text-tertiary)]">Bill</span>
              <span className="font-medium text-[var(--text-primary)]">
                {bill.bill_number || "—"} · {bill.supplier_name || "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-tertiary)]">Total</span>
              <span className="font-medium text-[var(--text-primary)] tabular-nums">{fmt(currSym, total)}</span>
            </div>
            {cisDeduction > 0 && (
              <div className="flex justify-between mt-0.5">
                <span className="text-[var(--text-tertiary)]">CIS deducted</span>
                <span className="font-medium text-[var(--brand-700)] tabular-nums">−{fmt(currSym, cisDeduction)}</span>
              </div>
            )}
            {alreadyPaid > 0 && (
              <div className="flex justify-between mt-0.5">
                <span className="text-[var(--text-tertiary)]">Already paid</span>
                <span className="font-medium text-[var(--success-700)] tabular-nums">−{fmt(currSym, alreadyPaid)}</span>
              </div>
            )}
            <div className="flex justify-between mt-1.5 pt-1.5 border-t border-[var(--border-subtle)]">
              <span className="text-[var(--text-tertiary)] font-semibold">Outstanding</span>
              <span className={`font-semibold tabular-nums ${outstanding > 0 ? "text-[var(--text-primary)]" : "text-[var(--success-700)]"}`}>
                {fmt(currSym, outstanding)}
              </span>
            </div>
          </div>

          {error && (
            <div className="bg-[var(--danger-50)] border border-[var(--danger-100)] rounded-[var(--radius-md)] px-3 py-2 text-xs text-[var(--danger-700)]">
              {error}
            </div>
          )}

          {noBankAccounts && !error && (
            <div className="bg-[var(--danger-50)] border border-[var(--danger-100)] rounded-[var(--radius-md)] px-3 py-2 text-xs text-[var(--danger-700)]">
              No bank accounts in your chart of accounts. Add one in Settings → Chart of Accounts.
            </div>
          )}

          <Field label="Payment Date" required>
            <input
              type="date"
              value={paidDate}
              onChange={e => setPaidDate(e.target.value)}
              className={dateInputCls}
            />
          </Field>

          <Field label="From Bank Account" required>
            <select
              value={bankAccountId}
              onChange={e => setBankAccountId(e.target.value)}
              disabled={noBankAccounts}
              className="w-full h-9 px-3 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-white outline-none focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)] cursor-pointer disabled:bg-[var(--surface-sunken)] disabled:cursor-not-allowed"
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
              className="w-full h-9 px-3 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-white outline-none focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)] box-border tabular-nums"
            />
          </Field>

          <Field label="Reference">
            <input
              type="text"
              value={reference}
              onChange={e => setReference(e.target.value)}
              placeholder="Optional bank reference"
              className="w-full h-9 px-3 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-white outline-none focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)] box-border"
            />
          </Field>
        </div>

        <div className="border-t border-[var(--border-subtle)] px-6 py-4 flex justify-end gap-2">
          <Btn variant="outline" onClick={onClose} disabled={loading}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSave} disabled={loading || noBankAccounts || accountsLoading}>
            {loading ? "Saving…" : "Record payment"}
          </Btn>
        </div>
      </div>
    </div>
  );
}
