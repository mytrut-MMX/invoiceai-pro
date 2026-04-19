import { useState, useEffect, useMemo } from "react";
import { Btn, Select, Input, Textarea, Field } from "../atoms";
import { useToast } from "../ui/Toast";
import {
  getLeaveBalances,
  getLeaveRequests,
  createLeaveRequest,
  cancelLeaveRequest,
  countWorkingDays,
} from "../../utils/payroll/leaveService";

const T = {
  cardBg: "#fff",
  cardBorder: "1px solid #e8e8ec",
  cardRadius: 12,
  heading: "#1a1a2e",
  body: "#374151",
  muted: "#6b7280",
  faint: "#9ca3af",
  rowBorder: "1px solid #f3f4f6",
};

const TYPE_PALETTE = {
  annual: { bg: "#eff6ff", fg: "#1d4ed8", bar: "#3b82f6", label: "Annual" },
  sick:   { bg: "#fef3c7", fg: "#92400e", bar: "#f59e0b", label: "Sick" },
  other:  { bg: "#f3f4f6", fg: "#374151", bar: "#6b7280", label: "Other" },
};

const STATUS_PALETTE = {
  approved:  { bg: "#dcfce7", fg: "#166534" },
  pending:   { bg: "#fef3c7", fg: "#92400e" },
  rejected:  { bg: "#fee2e2", fg: "#b91c1c" },
  cancelled: { bg: "#f3f4f6", fg: "#6b7280" },
};

function deriveCurrentTaxYear() {
  const d = new Date();
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const startYear = (month > 4 || (month === 4 && day >= 6)) ? year : year - 1;
  return `${startYear}-${String(startYear + 1).slice(2)}`;
}

function Badge({ palette, children }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
      background: palette.bg, color: palette.fg, borderRadius: 4, padding: "2px 7px",
      display: "inline-block",
    }}>
      {children}
    </span>
  );
}

function BalanceCard({ balance }) {
  const palette = TYPE_PALETTE[balance.leave_type] || TYPE_PALETTE.other;
  const entitlement = Number(balance.entitlement_days) + Number(balance.carried_over || 0);
  const used = Number(balance.used_days || 0);
  const remaining = Math.max(0, entitlement - used);
  const pct = entitlement > 0 ? Math.min(100, (used / entitlement) * 100) : 0;
  return (
    <div style={{
      flex: "1 1 220px",
      background: T.cardBg, border: T.cardBorder, borderRadius: T.cardRadius,
      padding: "16px 18px",
      borderLeft: `4px solid ${palette.bar}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <Badge palette={palette}>{palette.label}</Badge>
        <span style={{ fontSize: 11, color: T.faint }}>{balance.tax_year}</span>
      </div>
      <div style={{ fontSize: 13, color: T.body, marginBottom: 8 }}>
        <span style={{ fontWeight: 700, color: T.heading }}>{used}</span> of {entitlement} days used
      </div>
      <div style={{ height: 6, background: "#f0f0f4", borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: palette.bar, borderRadius: 3, transition: "width 0.2s" }} />
      </div>
      <div style={{ fontSize: 12, color: T.muted }}>
        <span style={{ fontWeight: 600, color: palette.fg }}>{remaining}</span> days remaining
      </div>
    </div>
  );
}

function RequestForm({ onSubmit, onCancel, submitting }) {
  const [leaveType, setLeaveType] = useState("annual");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const workingDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    return countWorkingDays(startDate, endDate);
  }, [startDate, endDate]);

  const canSubmit = startDate && endDate && endDate >= startDate && workingDays > 0;

  return (
    <div style={{
      background: "#fafaff", border: "1px solid #e0e7ff", borderRadius: T.cardRadius,
      padding: 16, marginBottom: 16,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: T.heading, marginBottom: 12 }}>New leave request</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
        <Field label="Type">
          <Select
            value={leaveType}
            onChange={setLeaveType}
            options={[
              { value: "annual", label: "Annual leave" },
              { value: "sick",   label: "Sick leave" },
              { value: "other",  label: "Other" },
            ]}
          />
        </Field>
        <Field label="Start date">
          <Input value={startDate} onChange={setStartDate} type="date" />
        </Field>
        <Field label="End date">
          <Input value={endDate} onChange={setEndDate} type="date" />
        </Field>
      </div>
      <div style={{ fontSize: 12, color: T.muted, marginBottom: 12 }}>
        Working days (Mon–Fri): <span style={{ fontWeight: 700, color: T.heading }}>{workingDays}</span>
      </div>
      <div style={{ marginBottom: 12 }}>
        <Field label="Reason (optional)">
          <Textarea value={reason} onChange={setReason} rows={2} placeholder="e.g. family holiday" />
        </Field>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Btn variant="outline" onClick={onCancel} disabled={submitting}>Cancel</Btn>
        <Btn
          variant="primary"
          disabled={!canSubmit || submitting}
          onClick={() => onSubmit({ leaveType, startDate, endDate, reason })}
        >
          {submitting ? "Submitting…" : "Submit request"}
        </Btn>
      </div>
    </div>
  );
}

function RequestsTable({ requests, onCancel, cancellingId }) {
  if (requests.length === 0) {
    return (
      <div style={{
        textAlign: "center", padding: "32px 20px",
        border: "1px dashed #e8e8ec", borderRadius: T.cardRadius, background: "#fafaf9",
        fontSize: 13, color: T.muted,
      }}>
        No leave requests yet.
      </div>
    );
  }
  return (
    <div style={{ border: T.cardBorder, borderRadius: T.cardRadius, overflow: "hidden", background: T.cardBg }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f9fafb", borderBottom: T.cardBorder }}>
            {["Type", "Dates", "Days", "Status", "Reason", ""].map((h, i) => (
              <th key={i} style={{
                padding: "8px 12px", fontSize: 10, fontWeight: 700, color: T.faint,
                textTransform: "uppercase", letterSpacing: "0.06em",
                textAlign: h === "Days" ? "right" : "left",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {requests.map((r, idx) => {
            const tp = TYPE_PALETTE[r.leave_type] || TYPE_PALETTE.other;
            const sp = STATUS_PALETTE[r.status] || STATUS_PALETTE.pending;
            return (
              <tr key={r.id} style={{ borderTop: idx > 0 ? T.rowBorder : "none" }}>
                <td style={{ padding: "10px 12px" }}>
                  <Badge palette={tp}>{tp.label}</Badge>
                </td>
                <td style={{ padding: "10px 12px", fontSize: 12, color: T.body, whiteSpace: "nowrap" }}>
                  {r.start_date} – {r.end_date}
                </td>
                <td style={{ padding: "10px 12px", fontSize: 13, color: T.heading, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {Number(r.days)}
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <Badge palette={sp}>{r.status}</Badge>
                </td>
                <td style={{ padding: "10px 12px", fontSize: 12, color: T.muted, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {r.reason || "—"}
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right" }}>
                  {r.status === "approved" && (
                    <button
                      onClick={() => onCancel(r.id)}
                      disabled={cancellingId === r.id}
                      style={{
                        background: "none", border: "1px solid #e8e8ec", borderRadius: 6,
                        padding: "4px 10px", cursor: "pointer", fontSize: 12, color: T.muted,
                      }}
                    >
                      {cancellingId === r.id ? "…" : "Cancel"}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function LeaveTab({ employeeId, employeeStartDate, taxYear }) {
  const { toast } = useToast();
  const resolvedTaxYear = taxYear || deriveCurrentTaxYear();

  const [balances, setBalances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  const loadAll = async () => {
    if (!employeeId) { setLoading(false); return; }
    try {
      const [bals, reqs] = await Promise.all([
        getLeaveBalances(employeeId, resolvedTaxYear),
        getLeaveRequests(employeeId, resolvedTaxYear),
      ]);
      setBalances(bals || []);
      setRequests(reqs || []);
    } catch (err) {
      toast({ title: "Failed to load leave data", description: err?.message, variant: "danger" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadAll();
  }, [employeeId, resolvedTaxYear]);

  const handleSubmit = async ({ leaveType, startDate, endDate, reason }) => {
    setSubmitting(true);
    const { request, error } = await createLeaveRequest({
      employeeId, leaveType, startDate, endDate, reason,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Could not submit leave", description: error, variant: "danger" });
      return;
    }
    toast({ title: "Leave request submitted", variant: "success" });
    setShowForm(false);
    if (request) await loadAll();
  };

  const handleCancel = async (requestId) => {
    setCancellingId(requestId);
    const { error } = await cancelLeaveRequest(requestId);
    setCancellingId(null);
    if (error) {
      toast({ title: "Could not cancel request", description: error, variant: "danger" });
      return;
    }
    toast({ title: "Leave cancelled", variant: "success" });
    await loadAll();
  };

  const annual = balances.find(b => b.leave_type === "annual");
  const sick = balances.find(b => b.leave_type === "sick");

  return (
    <div style={{ padding: 4 }}>
      <div style={{ marginBottom: 4, fontSize: 11, color: T.faint, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        Tax year {resolvedTaxYear}
      </div>
      {employeeStartDate && (
        <div style={{ fontSize: 11, color: T.faint, marginBottom: 16 }}>
          Employee started {employeeStartDate}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: T.faint, fontSize: 13 }}>Loading leave data…</div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            {annual && <BalanceCard balance={annual} />}
            {sick && <BalanceCard balance={sick} />}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.heading }}>Leave requests</div>
            {!showForm && (
              <Btn variant="primary" onClick={() => setShowForm(true)}>+ Request leave</Btn>
            )}
          </div>

          {showForm && (
            <RequestForm
              onSubmit={handleSubmit}
              onCancel={() => setShowForm(false)}
              submitting={submitting}
            />
          )}

          <RequestsTable
            requests={requests}
            onCancel={handleCancel}
            cancellingId={cancellingId}
          />
        </>
      )}
    </div>
  );
}
