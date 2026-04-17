import { useEffect, useState } from "react";
import { CUR_SYM } from "../../constants";
import { Btn, StatusBadge } from "../atoms";
import { fmt, fmtDate } from "../../utils/helpers";
import { fetchBillPayments } from "../../utils/ledger/fetchBillPayments";
import { reverseEntry } from "../../utils/ledger/ledgerService";
import { fetchUserAccounts } from "../../utils/ledger/fetchUserAccounts";

/**
 * Payment history panel for a single bill.
 * Lists all `bill_payment` journal entries for bill.id, highlights those that
 * have been reversed, and lets the user reverse active payments.
 */
export default function BillPaymentsTab({ bill, onPaymentReversed }) {
  const currSym = CUR_SYM.GBP || "£";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const list = await fetchBillPayments(bill.id);
      setRows(list);
    } catch (err) {
      setError(err?.message || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!bill?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await fetchBillPayments(bill.id);
        if (!cancelled) setRows(list);
      } catch (err) {
        if (!cancelled) setError(err?.message || "Failed to load payments");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [bill?.id]);

  const handleReverse = async (payment) => {
    const msg = `Reverse payment of ${fmt(currSym, payment.amount)} from ${fmtDate(payment.date)}? This posts a reversal entry and updates the bill's paid amount.`;
    if (!window.confirm(msg)) return;

    setBusyId(payment.id);
    setError("");
    try {
      const { userId } = await fetchUserAccounts();
      if (!userId) {
        setError("Not authenticated");
        setBusyId(null);
        return;
      }
      const result = await reverseEntry(payment.id, userId);
      if (!result?.success) {
        setError(result?.error || "Failed to reverse payment");
        setBusyId(null);
        return;
      }
      onPaymentReversed?.(payment);
      await load();
    } catch (err) {
      setError(err?.message || "Failed to reverse payment");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <div className="py-5 px-1 text-sm text-[var(--text-secondary)]">Loading payments…</div>;
  }

  if (rows.length === 0) {
    return <div className="py-6 px-1 text-sm text-[var(--text-secondary)] text-center">No payments recorded yet.</div>;
  }

  return (
    <div>
      {error && (
        <div className="bg-[var(--danger-50)] border border-[var(--danger-100)] rounded-[var(--radius-md)] px-3 py-2 mb-3 text-xs text-[var(--danger-700)]">
          {error}
        </div>
      )}

      <div className="border border-[var(--border-subtle)] rounded-[var(--radius-md)] overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[var(--surface-sunken)]">
              <th className="text-left py-2 px-2.5 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider border-b border-[var(--border-subtle)]">Date</th>
              <th className="text-right py-2 px-2.5 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider border-b border-[var(--border-subtle)]">Amount</th>
              <th className="text-left py-2 px-2.5 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider border-b border-[var(--border-subtle)]">Method</th>
              <th className="text-left py-2 px-2.5 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider border-b border-[var(--border-subtle)]">Reference</th>
              <th className="text-left py-2 px-2.5 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider border-b border-[var(--border-subtle)]">Status</th>
              <th className="text-right py-2 px-2.5 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider border-b border-[var(--border-subtle)]">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(p => {
              const strikeCls = p.reversed ? "line-through text-[var(--text-tertiary)]" : "";
              return (
                <tr key={p.id} className="border-b border-[var(--border-subtle)] last:border-0">
                  <td className={`py-2.5 px-2.5 text-sm text-[var(--text-primary)] ${strikeCls}`}>{fmtDate(p.date)}</td>
                  <td className={`py-2.5 px-2.5 text-sm font-semibold text-right tabular-nums ${strikeCls || "text-[var(--text-primary)]"}`}>
                    {fmt(currSym, p.amount)}
                  </td>
                  <td className={`py-2.5 px-2.5 text-sm ${strikeCls || "text-[var(--text-secondary)]"}`}>{p.method || "—"}</td>
                  <td className={`py-2.5 px-2.5 text-xs ${p.reversed ? "line-through text-[var(--text-tertiary)]" : "text-[var(--text-secondary)]"}`}>
                    {p.reference || "—"}
                  </td>
                  <td className="py-2.5 px-2.5">
                    <StatusBadge status={p.reversed ? "Refunded" : "Active"} />
                  </td>
                  <td className="py-2.5 px-2.5 text-right">
                    {p.reversed ? (
                      <span className="text-[var(--text-tertiary)] text-xs">—</span>
                    ) : (
                      <Btn variant="outline" size="sm" onClick={() => handleReverse(p)} disabled={busyId === p.id}>
                        {busyId === p.id ? "Reversing…" : "Reverse"}
                      </Btn>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
