import { useState, useContext, useMemo, useCallback } from "react";
import { ff, CUR_SYM } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Btn } from "../components/atoms";
import {
  moduleUi, ModuleHeader, StatusBadge, EmptyState,
} from "../components/shared/moduleListUI";
import { fmt, fmtDate } from "../utils/helpers";
import { calculateVATReturn } from "../utils/vat/vatReturnCalculator";
import { supabase } from "../lib/supabase";

// ─── VAT period generation ──────────────────────────────────────────────────

const STAGGER_STARTS = {
  1: [1, 4, 7, 10],  // Jan Apr Jul Oct
  2: [2, 5, 8, 11],  // Feb May Aug Nov
  3: [3, 6, 9, 12],  // Mar Jun Sep Dec
};

function pad2(n) { return String(n).padStart(2, "0"); }

function generateQuarterlyPeriods(stagger = 1, yearsBack = 2) {
  const months = STAGGER_STARTS[stagger] || STAGGER_STARTS[1];
  const now = new Date();
  const currentYear = now.getFullYear();
  const periods = [];

  for (let y = currentYear - yearsBack; y <= currentYear + 1; y++) {
    for (const startMonth of months) {
      const periodStart = `${y}-${pad2(startMonth)}-01`;
      const endDate = new Date(y, startMonth + 2, 0); // last day of 3rd month
      const periodEnd = endDate.toISOString().split("T")[0];
      const dueDate = new Date(endDate);
      dueDate.setMonth(dueDate.getMonth() + 1);
      dueDate.setDate(dueDate.getDate() + 7);

      periods.push({
        periodStart,
        periodEnd,
        dueDate: dueDate.toISOString().split("T")[0],
        label: `${fmtDate(periodStart)} – ${fmtDate(periodEnd)}`,
      });
    }
  }

  return periods.filter(p => p.periodEnd <= now.toISOString().split("T")[0] || p.periodStart <= now.toISOString().split("T")[0])
    .sort((a, b) => b.periodStart.localeCompare(a.periodStart));
}

// ─── 9-box metadata ─────────────────────────────────────────────────────────

const BOX_META = [
  { key: "box1", label: "Box 1", desc: "VAT due on sales and other outputs", drillType: "sales" },
  { key: "box2", label: "Box 2", desc: "VAT due on acquisitions from EU (NI)", drillType: null },
  { key: "box3", label: "Box 3", desc: "Total VAT due (Box 1 + Box 2)", drillType: null },
  { key: "box4", label: "Box 4", desc: "VAT reclaimed on purchases", drillType: "purchases" },
  { key: "box5", label: "Box 5", desc: "Net VAT to pay / reclaim", drillType: null },
  { key: "box6", label: "Box 6", desc: "Total value of sales (ex VAT)", drillType: "sales" },
  { key: "box7", label: "Box 7", desc: "Total value of purchases (ex VAT)", drillType: "purchases" },
  { key: "box8", label: "Box 8", desc: "Total value of supplies to EU (NI)", drillType: null },
  { key: "box9", label: "Box 9", desc: "Total value of acquisitions from EU (NI)", drillType: null },
];

// ─── Status badge additions ─────────────────────────────────────────────────

const VAT_STATUS_MAP = {
  open: "Draft",
  draft: "Pending",
  submitted: "Submitted",
  acknowledged: "Approved",
};

const STATUS_FILTERS = [
  { key: "all", label: "All Periods" },
  { key: "open", label: "Open" },
  { key: "draft", label: "Draft" },
  { key: "submitted", label: "Submitted" },
  { key: "acknowledged", label: "Acknowledged" },
];

// ─── Confirmation modal ─────────────────────────────────────────────────────

function ConfirmModal({ title, message, onConfirm, onCancel }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onCancel} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }} />
      <div style={{ position: "relative", background: "#fff", borderRadius: 16, padding: "28px 24px", maxWidth: 420, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.18)", fontFamily: ff }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 800, color: "#0f172a" }}>{title}</h3>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Btn variant="outline" onClick={onCancel}>Cancel</Btn>
          <Btn variant="primary" onClick={onConfirm}>Confirm</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Drill-down panel ───────────────────────────────────────────────────────

function DrillDown({ type, invoices, bills, expenses, period, scheme, currSym, onClose }) {
  const periodStart = period.periodStart;
  const periodEnd = period.periodEnd;

  const inPeriod = (d) => d && d.slice(0, 10) >= periodStart && d.slice(0, 10) <= periodEnd;

  const isCash = scheme === "Cash Accounting";

  const salesItems = useMemo(() => {
    if (type !== "sales") return [];
    return invoices.filter(inv => {
      if (isCash) {
        const pd = inv.payment_date || inv.paid_date || inv.paid_at;
        return pd && inPeriod(pd);
      }
      const tp = inv.tax_point || inv.taxPoint || inv.issue_date || inv.date;
      return inPeriod(tp);
    });
  }, [invoices, type, periodStart, periodEnd, isCash]);

  const purchaseItems = useMemo(() => {
    if (type !== "purchases") return [];
    const filteredBills = bills.filter(b => {
      if (isCash) {
        const pd = b.paid_date || b.payment_date || b.paid_at;
        return pd && inPeriod(pd);
      }
      return inPeriod(b.tax_point || b.date || b.issue_date);
    });
    const filteredExpenses = expenses.filter(e => {
      if (isCash) {
        const pd = e.paid_date || e.payment_date || e.paid_at;
        return pd && inPeriod(pd);
      }
      return inPeriod(e.date || e.expense_date);
    });
    return [
      ...filteredBills.map(b => ({ ...b, _source: "bill" })),
      ...filteredExpenses.map(e => ({ ...e, _source: "expense" })),
    ];
  }, [bills, expenses, type, periodStart, periodEnd, isCash]);

  const items = type === "sales" ? salesItems : purchaseItems;

  return (
    <div style={{ ...moduleUi.summaryCard, marginTop: 10, border: "1px solid #bfdbfe", background: "#f8fafc" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
          {type === "sales" ? "Contributing Invoices" : "Contributing Bills & Expenses"} ({items.length})
        </span>
        <Btn variant="ghost" size="sm" onClick={onClose}><Icons.X /></Btn>
      </div>
      {items.length === 0 ? (
        <div style={{ fontSize: 13, color: "#94a3b8", padding: "12px 0" }}>No transactions found for this period.</div>
      ) : (
        <div style={{ maxHeight: 300, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={moduleUi.tableHead}>
                <th style={{ ...moduleUi.th, fontSize: 10 }}>Date</th>
                <th style={{ ...moduleUi.th, fontSize: 10 }}>{type === "sales" ? "Customer" : "Supplier"}</th>
                <th style={{ ...moduleUi.th, fontSize: 10 }}>Reference</th>
                <th style={{ ...moduleUi.th, fontSize: 10, textAlign: "right" }}>Net</th>
                <th style={{ ...moduleUi.th, fontSize: 10, textAlign: "right" }}>VAT</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const date = type === "sales"
                  ? (item.tax_point || item.taxPoint || item.issue_date || item.date)
                  : (item.date || item.issue_date || item.expense_date);
                const name = type === "sales"
                  ? (item.customer_name || item.client_name || "—")
                  : (item.supplier_name || item.vendor || item.description || "—");
                const ref = item.invoice_number || item.bill_number || item.reference || "—";
                const net = Number(item.net_amount ?? item.subtotal ?? item.amount ?? 0);
                const vat = Number(item.vat_amount ?? item.tax ?? item.tax_amount ?? 0);
                return (
                  <tr key={item.id || i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 10px", color: "#374151", whiteSpace: "nowrap" }}>{fmtDate(date)}</td>
                    <td style={{ padding: "8px 10px", color: "#1a1a2e", fontWeight: 500 }}>{name}</td>
                    <td style={{ padding: "8px 10px", color: "#1e6be0", fontWeight: 600 }}>{ref}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", color: "#374151" }}>{fmt(currSym, net)}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", color: "#374151", fontWeight: 600 }}>{fmt(currSym, vat)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────

export default function VATReturnPage() {
  const { invoices = [], bills = [], expenses = [], orgSettings, user } = useContext(AppCtx);
  const currSym = CUR_SYM[orgSettings?.currency || "GBP"] || "£";
  const stagger = orgSettings?.vatStagger || 1;
  const scheme = orgSettings?.vatScheme || "Standard";
  const flatRatePct = Number(orgSettings?.vatFlatRatePct || 0);

  // ─── State ──────────────────────────────────────────────────────────────────
  const periods = useMemo(() => generateQuarterlyPeriods(stagger), [stagger]);
  const [selectedPeriodIdx, setSelectedPeriodIdx] = useState(0);
  const [drillBox, setDrillBox] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [reviewed, setReviewed] = useState(false);

  const selectedPeriod = periods[selectedPeriodIdx] || periods[0];

  // ─── Calculate VAT return ─────────────────────────────────────────────────
  const vatReturn = useMemo(() => {
    if (!selectedPeriod) return null;
    return calculateVATReturn(invoices, bills, expenses, {
      periodStart: selectedPeriod.periodStart,
      periodEnd: selectedPeriod.periodEnd,
    }, scheme, { flatRatePct });
  }, [invoices, bills, expenses, selectedPeriod, scheme, flatRatePct]);

  // ─── Current period status ────────────────────────────────────────────────
  const currentSubmission = submissions.find(
    s => s.period_start === selectedPeriod?.periodStart
  );
  const periodStatus = currentSubmission?.status || "open";
  const isLocked = periodStatus === "submitted" || periodStatus === "acknowledged";

  // ─── Filtered submission history ──────────────────────────────────────────
  const filteredSubmissions = useMemo(() => {
    if (statusFilter === "all") return submissions;
    return submissions.filter(s => s.status === statusFilter);
  }, [submissions, statusFilter]);

  // ─── Save / Submit handler ────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!vatReturn || !selectedPeriod || !supabase || !user?.id) return;
    setSaving(true);
    try {
      // Upsert period
      const { data: periodData, error: periodErr } = await supabase
        .from("vat_periods")
        .upsert({
          user_id: user.id,
          period_start: selectedPeriod.periodStart,
          period_end: selectedPeriod.periodEnd,
          due_date: selectedPeriod.dueDate,
          stagger,
          scheme,
          status: "draft",
        }, { onConflict: "user_id,period_start" })
        .select()
        .single();

      if (periodErr) throw periodErr;

      // Insert submission
      const { data: subData, error: subErr } = await supabase
        .from("vat_return_submissions")
        .insert({
          user_id: user.id,
          vat_period_id: periodData.id,
          box1: vatReturn.box1,
          box2: vatReturn.box2,
          box3: vatReturn.box3,
          box4: vatReturn.box4,
          box5: vatReturn.box5,
          box6: vatReturn.box6,
          box7: vatReturn.box7,
          box8: vatReturn.box8,
          box9: vatReturn.box9,
          flat_rate_turnover: vatReturn.flatRateTurnover,
          flat_rate_pct: vatReturn.flatRatePct,
          status: "draft",
        })
        .select()
        .single();

      if (subErr) throw subErr;

      setSubmissions(prev => [
        { ...subData, period_start: selectedPeriod.periodStart, period_end: selectedPeriod.periodEnd },
        ...prev,
      ]);
      setShowConfirm(false);
      setReviewed(false);
      alert("HMRC submission coming soon — return saved.");
    } catch (err) {
      console.error("VAT save error:", err);
      alert("Failed to save VAT return. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [vatReturn, selectedPeriod, user, stagger, scheme]);

  // ─── Render ───────────────────────────────────────────────────────────────
  if (!vatReturn) return null;

  const box5Positive = vatReturn.box5 >= 0;

  return (
    <div style={moduleUi.pageCanvas}>
      <div style={{ ...moduleUi.page, maxWidth: 1320, fontFamily: ff }}>
        <ModuleHeader
          title="VAT Returns"
          helper="Calculate and submit your MTD-compliant VAT return to HMRC."
          right={
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {isLocked && (
                <span style={{ fontSize: 12, color: "#b91c1c", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                  <Icons.Alert /> Period locked
                </span>
              )}
              <StatusBadge status={VAT_STATUS_MAP[periodStatus] || "Draft"} />
            </div>
          }
        />

        {/* Period selector */}
        <div style={{ ...moduleUi.toolbar, marginTop: 16, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Period
            </label>
            <select
              value={selectedPeriodIdx}
              onChange={e => { setSelectedPeriodIdx(Number(e.target.value)); setDrillBox(null); setReviewed(false); }}
              style={{ padding: "9px 12px", border: "1px solid #dbe4ee", borderRadius: 10, fontSize: 13, background: "#fff", fontFamily: ff, minWidth: 260, color: "#0f172a" }}
            >
              {periods.map((p, i) => (
                <option key={p.periodStart} value={i}>{p.label}</option>
              ))}
            </select>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>
              Due: {fmtDate(selectedPeriod.dueDate)} · Scheme: {scheme}
            </span>
          </div>
        </div>

        {/* Locked period warning */}
        {isLocked && (
          <div style={{
            background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10,
            padding: "10px 14px", marginBottom: 10, fontSize: 13, color: "#b91c1c",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <Icons.Alert />
            This period has been submitted. Invoices, bills, and expenses in this period should not be edited.
          </div>
        )}

        {/* Hero card — Net VAT due (Box 5) */}
        <div style={{
          background: box5Positive ? "linear-gradient(135deg, #fef2f2 0%, #fff 100%)" : "linear-gradient(135deg, #f0fdf4 0%, #fff 100%)",
          border: `1px solid ${box5Positive ? "#fecaca" : "#bbf7d0"}`,
          borderRadius: 14, padding: "22px 24px", marginBottom: 14,
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", fontWeight: 700 }}>
              Net VAT {box5Positive ? "to Pay" : "to Reclaim"} (Box 5)
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: box5Positive ? "#b91c1c" : "#15803d", marginTop: 4 }}>
              {fmt(currSym, Math.abs(vatReturn.box5))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748b", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={reviewed}
                onChange={e => setReviewed(e.target.checked)}
                disabled={isLocked}
                style={{ accentColor: "#1e6be0" }}
              />
              I have reviewed this return
            </label>
            <Btn
              variant="primary"
              onClick={() => setShowConfirm(true)}
              disabled={!reviewed || isLocked || saving}
            >
              {saving ? "Saving…" : "Submit Return"}
            </Btn>
          </div>
        </div>

        {/* 9-Box grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 10, marginBottom: 14,
        }}>
          {BOX_META.map(box => {
            const value = vatReturn[box.key];
            const isActive = drillBox === box.key;
            const clickable = !!box.drillType;
            return (
              <div
                key={box.key}
                onClick={clickable ? () => setDrillBox(isActive ? null : box.key) : undefined}
                style={{
                  ...moduleUi.summaryCard,
                  cursor: clickable ? "pointer" : "default",
                  border: isActive ? "2px solid #1e6be0" : "1px solid #e2e8f0",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                  boxShadow: isActive ? "0 0 0 3px rgba(30,107,224,0.12)" : undefined,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", fontWeight: 700 }}>
                    {box.label}
                  </div>
                  {clickable && (
                    <Icons.ChevRight />
                  )}
                </div>
                <div style={{ fontSize: 20, marginTop: 4, fontWeight: 800, color: box.key === "box5" ? (value >= 0 ? "#b91c1c" : "#15803d") : "#0f172a" }}>
                  {fmt(currSym, value)}
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3, lineHeight: 1.3 }}>
                  {box.desc}
                </div>
              </div>
            );
          })}
        </div>

        {/* Flat Rate info */}
        {scheme === "Flat Rate" && vatReturn.flatRateTurnover != null && (
          <div style={{ ...moduleUi.summaryCard, marginBottom: 14, display: "flex", gap: 24, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", fontWeight: 700 }}>Flat Rate Turnover</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 2 }}>{fmt(currSym, vatReturn.flatRateTurnover)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", fontWeight: 700 }}>Flat Rate %</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 2 }}>{vatReturn.flatRatePct}%</div>
            </div>
          </div>
        )}

        {/* Drill-down panel */}
        {drillBox && BOX_META.find(b => b.key === drillBox)?.drillType && (
          <DrillDown
            type={BOX_META.find(b => b.key === drillBox).drillType}
            invoices={invoices}
            bills={bills}
            expenses={expenses}
            period={selectedPeriod}
            scheme={scheme}
            currSym={currSym}
            onClose={() => setDrillBox(null)}
          />
        )}

        {/* Submission History */}
        <div style={{ marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>Submission History</h2>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ padding: "7px 10px", border: "1px solid #dbe4ee", borderRadius: 10, fontSize: 12, background: "#fff", fontFamily: ff }}
            >
              {STATUS_FILTERS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
          </div>

          <div style={{ ...moduleUi.tableCard, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 580 }}>
              <thead>
                <tr style={{ ...moduleUi.tableHead, position: "sticky", top: 0, zIndex: 1 }}>
                  {["Period", "Box 5 (Net)", "Status", "Submitted", "HMRC Receipt"].map(h => (
                    <th key={h} style={{ ...moduleUi.th, textAlign: h.includes("Net") ? "right" : "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState
                        icon={<Icons.Invoices />}
                        text="No VAT returns submitted yet. Generate your first return above."
                      />
                    </td>
                  </tr>
                ) : (
                  filteredSubmissions.map(sub => (
                    <tr key={sub.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "11px 16px", fontSize: 13, color: "#374151" }}>
                        {fmtDate(sub.period_start)} – {fmtDate(sub.period_end)}
                      </td>
                      <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 600, color: "#1a1a2e", textAlign: "right" }}>
                        {fmt(currSym, sub.box5)}
                      </td>
                      <td style={{ padding: "11px 16px" }}>
                        <StatusBadge status={VAT_STATUS_MAP[sub.status] || sub.status} />
                      </td>
                      <td style={{ padding: "11px 16px", fontSize: 13, color: "#374151" }}>
                        {sub.submitted_at ? fmtDate(sub.submitted_at) : "—"}
                      </td>
                      <td style={{ padding: "11px 16px", fontSize: 13, color: "#94a3b8" }}>
                        {sub.hmrc_receipt_id || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Confirmation modal */}
        {showConfirm && (
          <ConfirmModal
            title="Save VAT Return"
            message="HMRC submission coming soon — this will save your VAT return as a draft. You can review it before submitting to HMRC in a future update. Continue?"
            onConfirm={handleSave}
            onCancel={() => setShowConfirm(false)}
          />
        )}

        <style>{`tr:hover .row-actions { opacity: 1 !important; }`}</style>
      </div>
    </div>
  );
}
