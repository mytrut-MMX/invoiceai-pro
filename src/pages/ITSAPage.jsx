import { useState, useContext, useMemo, useCallback } from "react";
import { CUR_SYM } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Btn } from "../components/atoms";
import {
  moduleUi, ModuleHeader, StatusBadge, EmptyState,
} from "../components/shared/moduleListUI";
import { fmt, fmtDate } from "../utils/helpers";
import {
  calculateITSAQuarter, generateITSAPeriods, getITSATaxYears,
} from "../utils/itsa/itsaCalculator";
import { SA_CATEGORY_LABELS } from "../utils/itsa/hmrcCategoryMap";
import { supabase } from "../lib/supabase";

// ─── Status mapping ─────────────────────────────────────────────────────────

const ITSA_STATUS_MAP = {
  open: "Draft",
  draft: "Pending",
  submitted: "Submitted",
  acknowledged: "Approved",
};

// ─── Confirmation modal ─────────────────────────────────────────────────────

function ConfirmModal({ title, message, onConfirm, onCancel }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onCancel} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }} />
      <div style={{ position: "relative", background: "#fff", borderRadius: 16, padding: "28px 24px", maxWidth: 420, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}>
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

// ─── Main page ──────────────────────────────────────────────────────────────

export default function ITSAPage() {
  const { invoices = [], expenses = [], payments = [], orgSettings, user } = useContext(AppCtx);
  const currSym = CUR_SYM[orgSettings?.currency || "GBP"] || "£";
  const basis = orgSettings?.itsaBasis || "cash";

  // ─── State ──────────────────────────────────────────────────────────────────
  const taxYears = useMemo(() => getITSATaxYears(2), []);
  const [selectedTaxYear, setSelectedTaxYear] = useState(taxYears[0] || "2026-27");
  const periods = useMemo(() => generateITSAPeriods(selectedTaxYear), [selectedTaxYear]);
  const [selectedQuarterIdx, setSelectedQuarterIdx] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [reviewed, setReviewed] = useState(false);
  const [view, setView] = useState("quarter"); // 'quarter' | 'annual'

  const selectedPeriod = periods[selectedQuarterIdx] || periods[0];

  // ─── Calculate ITSA quarter ───────────────────────────────────────────────
  const itsaResult = useMemo(() => {
    if (!selectedPeriod) return null;
    return calculateITSAQuarter(invoices, expenses, payments, {
      periodStart: selectedPeriod.periodStart,
      periodEnd: selectedPeriod.periodEnd,
    }, basis);
  }, [invoices, expenses, payments, selectedPeriod, basis]);

  // ─── Annual summary (all 4 quarters) ─────────────────────────────────────
  const annualSummary = useMemo(() => {
    let totalIncome = 0, totalExpenses = 0;
    const quarterResults = [];

    for (const p of periods) {
      const q = calculateITSAQuarter(invoices, expenses, payments, {
        periodStart: p.periodStart, periodEnd: p.periodEnd,
      }, basis);
      quarterResults.push({ ...p, ...q });
      totalIncome += q.totalIncome;
      totalExpenses += q.totalExpenses;
    }

    return {
      quarterResults,
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      totalProfit: Math.round((totalIncome - totalExpenses) * 100) / 100,
    };
  }, [periods, invoices, expenses, payments, basis]);

  // ─── Current period status ────────────────────────────────────────────────
  const currentSubmission = submissions.find(
    s => s.tax_year === selectedTaxYear && s.quarter === selectedPeriod?.quarter
  );
  const periodStatus = currentSubmission?.status || "open";
  const isLocked = periodStatus === "submitted" || periodStatus === "acknowledged";

  // ─── Save handler ─────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!itsaResult || !selectedPeriod || !supabase || !user?.id) return;
    setSaving(true);
    try {
      // Upsert period
      const { data: periodData, error: periodErr } = await supabase
        .from("itsa_periods")
        .upsert({
          user_id: user.id,
          tax_year: selectedTaxYear,
          quarter: selectedPeriod.quarter,
          period_start: selectedPeriod.periodStart,
          period_end: selectedPeriod.periodEnd,
          submission_deadline: selectedPeriod.submissionDeadline,
          status: "draft",
        }, { onConflict: "user_id,tax_year,quarter" })
        .select()
        .single();

      if (periodErr) throw periodErr;

      // Insert quarterly update
      const { data: subData, error: subErr } = await supabase
        .from("itsa_quarterly_updates")
        .insert({
          user_id: user.id,
          period_id: periodData.id,
          total_income: itsaResult.totalIncome,
          total_expenses: itsaResult.totalExpenses,
          expense_breakdown: itsaResult.expenseBreakdown,
          accounting_basis: basis,
          status: "draft",
        })
        .select()
        .single();

      if (subErr) throw subErr;

      setSubmissions(prev => [
        { ...subData, tax_year: selectedTaxYear, quarter: selectedPeriod.quarter },
        ...prev,
      ]);
      setShowConfirm(false);
      setReviewed(false);
      alert("ITSA quarterly update saved as draft. HMRC submission coming soon.");
    } catch (err) {
      console.error("ITSA save error:", err);
      alert("Failed to save ITSA update. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [itsaResult, selectedPeriod, selectedTaxYear, user, basis]);

  // ─── Render ───────────────────────────────────────────────────────────────
  if (!itsaResult) return null;

  const profitPositive = itsaResult.profit >= 0;

  return (
    <div style={moduleUi.pageCanvas}>
      <div style={{ ...moduleUi.page, maxWidth: 1320 }}>
        <ModuleHeader
          title="Self Assessment (ITSA)"
          helper="Calculate and submit your MTD Income Tax quarterly updates to HMRC."
          right={
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {isLocked && (
                <span style={{ fontSize: 12, color: "#b91c1c", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                  <Icons.Alert /> Period locked
                </span>
              )}
              <StatusBadge status={ITSA_STATUS_MAP[periodStatus] || "Draft"} />
            </div>
          }
        />

        {/* View toggle + Tax year / Quarter selectors */}
        <div style={{ ...moduleUi.toolbar, marginTop: 16, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            {/* View toggle */}
            <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid #dbe4ee" }}>
              {[{ key: "quarter", label: "Quarterly" }, { key: "annual", label: "Annual" }].map(v => (
                <button
                  key={v.key}
                  onClick={() => setView(v.key)}
                  style={{
                    padding: "7px 14px", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer",
                    background: view === v.key ? "#1e6be0" : "#fff",
                    color: view === v.key ? "#fff" : "#64748b",
                  }}
                >
                  {v.label}
                </button>
              ))}
            </div>

            {/* Tax year */}
            <label style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Tax Year
            </label>
            <select
              value={selectedTaxYear}
              onChange={e => { setSelectedTaxYear(e.target.value); setSelectedQuarterIdx(0); setReviewed(false); }}
              style={{ padding: "9px 12px", border: "1px solid #dbe4ee", borderRadius: 10, fontSize: 13, background: "#fff", minWidth: 120, color: "#0f172a" }}
            >
              {taxYears.map(ty => <option key={ty} value={ty}>{ty}</option>)}
            </select>

            {/* Quarter (only in quarter view) */}
            {view === "quarter" && (
              <>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Quarter
                </label>
                <select
                  value={selectedQuarterIdx}
                  onChange={e => { setSelectedQuarterIdx(Number(e.target.value)); setReviewed(false); }}
                  style={{ padding: "9px 12px", border: "1px solid #dbe4ee", borderRadius: 10, fontSize: 13, background: "#fff", minWidth: 280, color: "#0f172a" }}
                >
                  {periods.map((p, i) => <option key={p.quarter} value={i}>{p.label}</option>)}
                </select>
              </>
            )}

            <span style={{ fontSize: 12, color: "#94a3b8" }}>
              Basis: {basis === "cash" ? "Cash" : "Accrual"}
              {view === "quarter" && selectedPeriod && ` · Deadline: ${fmtDate(selectedPeriod.submissionDeadline)}`}
            </span>
          </div>
        </div>

        {/* Locked period warning */}
        {view === "quarter" && isLocked && (
          <div style={{
            background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10,
            padding: "10px 14px", marginBottom: 10, fontSize: 13, color: "#b91c1c",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <Icons.Alert />
            This quarter has been submitted. Transactions in this period should not be edited.
          </div>
        )}

        {/* ─── Quarterly View ──────────────────────────────────────────────────── */}
        {view === "quarter" && (
          <>
            {/* Hero card — Profit */}
            <div style={{
              background: profitPositive ? "linear-gradient(135deg, #f0fdf4 0%, #fff 100%)" : "linear-gradient(135deg, #fef2f2 0%, #fff 100%)",
              border: `1px solid ${profitPositive ? "#bbf7d0" : "#fecaca"}`,
              borderRadius: 14, padding: "22px 24px", marginBottom: 14,
              display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
            }}>
              <div>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", fontWeight: 700 }}>
                  Quarterly {profitPositive ? "Profit" : "Loss"}
                </div>
                <div style={{ fontSize: 32, fontWeight: 800, color: profitPositive ? "#15803d" : "#b91c1c", marginTop: 4 }}>
                  {fmt(currSym, Math.abs(itsaResult.profit))}
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
                  I have reviewed this update
                </label>
                <Btn
                  variant="primary"
                  onClick={() => setShowConfirm(true)}
                  disabled={!reviewed || isLocked || saving}
                >
                  {saving ? "Saving..." : "Save Update"}
                </Btn>
              </div>
            </div>

            {/* Income / Expenses / Profit cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 14 }}>
              {[
                { label: "Total Income", value: itsaResult.totalIncome, color: "#15803d" },
                { label: "Total Expenses", value: itsaResult.totalExpenses, color: "#b91c1c" },
                { label: "Net Profit", value: itsaResult.profit, color: profitPositive ? "#15803d" : "#b91c1c" },
              ].map(card => (
                <div key={card.label} style={moduleUi.summaryCard}>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", fontWeight: 700 }}>
                    {card.label}
                  </div>
                  <div style={{ fontSize: 20, marginTop: 4, fontWeight: 800, color: card.color }}>
                    {fmt(currSym, card.value)}
                  </div>
                </div>
              ))}
            </div>

            {/* Expense breakdown by SA box */}
            {Object.keys(itsaResult.expenseBreakdown).length > 0 && (
              <div style={{ ...moduleUi.tableCard, overflow: "hidden", marginBottom: 14 }}>
                <div style={{ padding: "14px 16px", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>Expense Breakdown (SA Categories)</span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={moduleUi.tableHead}>
                      <th style={{ ...moduleUi.th, textAlign: "left" }}>Category</th>
                      <th style={{ ...moduleUi.th, textAlign: "right" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(itsaResult.expenseBreakdown)
                      .sort((a, b) => b[1] - a[1])
                      .map(([key, val]) => (
                        <tr key={key} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "10px 16px", fontSize: 13, color: "#374151" }}>
                            {SA_CATEGORY_LABELS[key] || key}
                          </td>
                          <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, color: "#1a1a2e", textAlign: "right" }}>
                            {fmt(currSym, val)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ─── Annual View ─────────────────────────────────────────────────────── */}
        {view === "annual" && (
          <>
            {/* Annual summary hero */}
            <div style={{
              background: annualSummary.totalProfit >= 0
                ? "linear-gradient(135deg, #f0fdf4 0%, #fff 100%)"
                : "linear-gradient(135deg, #fef2f2 0%, #fff 100%)",
              border: `1px solid ${annualSummary.totalProfit >= 0 ? "#bbf7d0" : "#fecaca"}`,
              borderRadius: 14, padding: "22px 24px", marginBottom: 14,
              display: "flex", gap: 32, flexWrap: "wrap",
            }}>
              {[
                { label: "Annual Income", value: annualSummary.totalIncome, color: "#15803d" },
                { label: "Annual Expenses", value: annualSummary.totalExpenses, color: "#b91c1c" },
                { label: "Annual Profit", value: annualSummary.totalProfit, color: annualSummary.totalProfit >= 0 ? "#15803d" : "#b91c1c" },
              ].map(card => (
                <div key={card.label}>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", fontWeight: 700 }}>
                    {card.label}
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: card.color, marginTop: 4 }}>
                    {fmt(currSym, card.value)}
                  </div>
                </div>
              ))}
            </div>

            {/* Quarter-by-quarter table */}
            <div style={{ ...moduleUi.tableCard, overflow: "hidden", marginBottom: 14 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 580 }}>
                <thead>
                  <tr style={{ ...moduleUi.tableHead, position: "sticky", top: 0, zIndex: 1 }}>
                    {["Quarter", "Period", "Income", "Expenses", "Profit", "Status"].map(h => (
                      <th key={h} style={{ ...moduleUi.th, textAlign: ["Income", "Expenses", "Profit"].includes(h) ? "right" : "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {annualSummary.quarterResults.map(q => {
                    const sub = submissions.find(s => s.tax_year === selectedTaxYear && s.quarter === q.quarter);
                    const status = sub?.status || "open";
                    return (
                      <tr key={q.quarter} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 700, color: "#1e6be0" }}>{q.quarter}</td>
                        <td style={{ padding: "11px 16px", fontSize: 13, color: "#374151" }}>
                          {fmtDate(q.periodStart)} – {fmtDate(q.periodEnd)}
                        </td>
                        <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 600, color: "#15803d", textAlign: "right" }}>
                          {fmt(currSym, q.totalIncome)}
                        </td>
                        <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 600, color: "#b91c1c", textAlign: "right" }}>
                          {fmt(currSym, q.totalExpenses)}
                        </td>
                        <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 800, color: q.profit >= 0 ? "#15803d" : "#b91c1c", textAlign: "right" }}>
                          {fmt(currSym, q.profit)}
                        </td>
                        <td style={{ padding: "11px 16px" }}>
                          <StatusBadge status={ITSA_STATUS_MAP[status] || "Draft"} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Final declaration placeholder */}
            <div style={{
              background: "#f8fafc", border: "1px solid #dbe4ee", borderRadius: 12,
              padding: "18px 20px", display: "flex", alignItems: "center", gap: 12,
            }}>
              <Icons.Invoices />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Final Declaration</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                  Submit your end-of-year final declaration after all four quarters are complete.
                  This will include adjustments, capital allowances, and your final profit figure.
                </div>
              </div>
              <Btn variant="outline" disabled style={{ marginLeft: "auto", whiteSpace: "nowrap" }}>
                Coming Soon
              </Btn>
            </div>
          </>
        )}

        {/* Submission History */}
        <div style={{ marginTop: 20 }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 800, color: "#0f172a" }}>Submission History</h2>
          <div style={{ ...moduleUi.tableCard, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 580 }}>
              <thead>
                <tr style={{ ...moduleUi.tableHead, position: "sticky", top: 0, zIndex: 1 }}>
                  {["Tax Year", "Quarter", "Income", "Expenses", "Status", "Submitted"].map(h => (
                    <th key={h} style={{ ...moduleUi.th, textAlign: ["Income", "Expenses"].includes(h) ? "right" : "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {submissions.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState
                        icon={<Icons.Invoices />}
                        text="No ITSA quarterly updates saved yet. Calculate your first quarter above."
                      />
                    </td>
                  </tr>
                ) : (
                  submissions.map(sub => (
                    <tr key={sub.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "11px 16px", fontSize: 13, color: "#374151" }}>{sub.tax_year}</td>
                      <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 700, color: "#1e6be0" }}>{sub.quarter}</td>
                      <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 600, color: "#15803d", textAlign: "right" }}>
                        {fmt(currSym, sub.total_income)}
                      </td>
                      <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 600, color: "#b91c1c", textAlign: "right" }}>
                        {fmt(currSym, sub.total_expenses)}
                      </td>
                      <td style={{ padding: "11px 16px" }}>
                        <StatusBadge status={ITSA_STATUS_MAP[sub.status] || sub.status} />
                      </td>
                      <td style={{ padding: "11px 16px", fontSize: 13, color: "#374151" }}>
                        {sub.submitted_at ? fmtDate(sub.submitted_at) : "—"}
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
            title="Save ITSA Quarterly Update"
            message={`This will save your ${selectedPeriod.quarter} (${selectedTaxYear}) quarterly update as a draft. HMRC submission will be available in a future update. Continue?`}
            onConfirm={handleSave}
            onCancel={() => setShowConfirm(false)}
          />
        )}
      </div>
    </div>
  );
}
