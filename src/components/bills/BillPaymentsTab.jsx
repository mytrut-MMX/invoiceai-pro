import { useEffect, useState } from "react";
import { ff, CUR_SYM } from "../../constants";
import { Btn } from "../atoms";
import { fmt, fmtDate } from "../../utils/helpers";
import { fetchBillPayments } from "../../utils/ledger/fetchBillPayments";
import { reverseEntry } from "../../utils/ledger/ledgerService";
import { fetchUserAccounts } from "../../utils/ledger/fetchUserAccounts";

/**
 * Payment history panel for a single bill.
 * Lists all `bill_payment` journal entries for bill.id, highlights those that
 * have been reversed, and lets the user reverse active payments.
 *
 * On reversal, calls reverseEntry() and then notifies the parent via
 * onPaymentReversed({ id, amount, date, ... }) so the parent can recalculate
 * bills.paid_amount and bills.status.
 */
export default function BillPaymentsTab({ bill, onPaymentReversed }) {
  const currSym = CUR_SYM.GBP || "£";
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [busyId, setBusyId]     = useState(null);
  const [error, setError]       = useState("");

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
    return (
      <div style={{ padding: "20px 4px", fontSize: 13, color: "#6b7280", fontFamily: ff }}>
        Loading payments…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div style={{ padding: "24px 4px", fontSize: 13, color: "#6b7280", fontFamily: ff, textAlign: "center" }}>
        No payments recorded yet.
      </div>
    );
  }

  const thStyle = {
    textAlign: "left",
    padding: "8px 10px",
    fontSize: 11,
    fontWeight: 600,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    borderBottom: "1px solid #E8E6E0",
    background: "#fafafa",
  };
  const tdBase = {
    padding: "10px",
    fontSize: 13,
    color: "#1a1a2e",
    borderBottom: "1px solid #f3f4f6",
    verticalAlign: "middle",
  };

  return (
    <div style={{ fontFamily: ff }}>
      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "#b91c1c" }}>
          {error}
        </div>
      )}

      <div style={{ border: "1px solid #E8E6E0", borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Date</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
              <th style={thStyle}>Method</th>
              <th style={thStyle}>Reference</th>
              <th style={thStyle}>Status</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(p => {
              const strike = p.reversed ? { textDecoration: "line-through", color: "#9ca3af" } : null;
              return (
                <tr key={p.id}>
                  <td style={{ ...tdBase, ...strike }}>{fmtDate(p.date)}</td>
                  <td style={{ ...tdBase, textAlign: "right", fontWeight: 600, ...strike }}>
                    {fmt(currSym, p.amount)}
                  </td>
                  <td style={{ ...tdBase, ...strike }}>{p.method || "—"}</td>
                  <td style={{ ...tdBase, ...strike, fontSize: 12, color: strike ? "#9ca3af" : "#6b7280" }}>
                    {p.reference || "—"}
                  </td>
                  <td style={tdBase}>
                    {p.reversed ? (
                      <span style={{
                        display: "inline-block", padding: "2px 8px", borderRadius: 999,
                        background: "#fef2f2", color: "#b91c1c", fontSize: 11, fontWeight: 600,
                      }}>
                        Reversed
                      </span>
                    ) : (
                      <span style={{
                        display: "inline-block", padding: "2px 8px", borderRadius: 999,
                        background: "#ecfdf5", color: "#059669", fontSize: 11, fontWeight: 600,
                      }}>
                        Active
                      </span>
                    )}
                  </td>
                  <td style={{ ...tdBase, textAlign: "right" }}>
                    {p.reversed ? (
                      <span style={{ color: "#9ca3af", fontSize: 12 }}>—</span>
                    ) : (
                      <Btn
                        variant="outline"
                        onClick={() => handleReverse(p)}
                        disabled={busyId === p.id}
                      >
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
