/**
 * CorporationTaxDetailPage — Phase 1 Task 5.
 *
 * View a single CT accounting period, edit tax adjustments inline, and see
 * a live Corporation Tax calc preview that updates on every input change.
 *
 * Actions:
 *   - Save adjustments       → persists edits + computed snapshot
 *   - Finalize               → one-way in Phase 1 (sets locked=true; unlock
 *                              is a support-only workflow)
 *   - Delete                 → blocked if locked
 *
 * Out of scope for this task: PDF export (Task 6), unlock workflow (Phase 2).
 *
 * Accounting profit is loaded ONCE (period dates are immutable post-create);
 * the `computeCorporationTax` call is pure and runs synchronously as the
 * user edits adjustment inputs.
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ff } from "../constants";
import { Icons } from "../components/icons";
import { Btn } from "../components/atoms";
import { StatusBadge, moduleUi } from "../components/shared/moduleListUI";
import { ROUTES } from "../router/routes";
import { supabase } from "../lib/supabase";
import { useBusinessType } from "../hooks/useBusinessType";
import {
  getCorporationTaxPeriod,
  updateCorporationTaxPeriod,
  deleteCorporationTaxPeriod,
  setCorporationTaxPeriodStatus,
} from "../utils/ct/ctPeriods";
import { computeCorporationTax } from "../utils/ct/computeCorporationTax";
import { getAccountingProfit } from "../utils/ct/getAccountingProfit";
import { exportCorporationTaxPdf } from "../utils/ct/exportCorporationTaxPdf";
import { exportCorporationTaxCsv } from "../utils/ct/exportCorporationTaxCsv";

// ─── Formatters ──────────────────────────────────────────────────────────────
const GBP0 = new Intl.NumberFormat("en-GB", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const GBP2 = new Intl.NumberFormat("en-GB", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const fmtGbp0 = (v) => (v == null ? "—" : `£${GBP0.format(Number(v))}`);
const fmtGbp2 = (v) => (v == null ? "—" : `£${GBP2.format(Number(v))}`);
const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

// ─── Bracket presentation ────────────────────────────────────────────────────
const BRACKET_BADGE = {
  loss:           { label: "Loss — no CT",                  bg: "#f3f4f6", fg: "#374151", border: "#d1d5db" },
  small:          { label: "Small profits rate (19%)",      bg: "#f0fdf4", fg: "#166534", border: "#bbf7d0" },
  marginal_zone:  { label: "Marginal zone (using main rate)", bg: "#fffbeb", fg: "#92400e", border: "#fde68a" },
  main:           { label: "Main rate (25%)",               bg: "#eff6ff", fg: "#1d4ed8", border: "#bfdbfe" },
};

function BracketBadge({ bracket }) {
  const spec = BRACKET_BADGE[bracket];
  if (!spec) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        background: spec.bg,
        color: spec.fg,
        border: `1px solid ${spec.border}`,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: spec.fg }} />
      {spec.label}
    </span>
  );
}

// ─── Confirm modal (mirrors PayrollRunDetailPage) ───────────────────────────
function ConfirmModal({ title, message, warning, confirmLabel, confirmVariant = "primary", onConfirm, onCancel, busy }) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.35)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 14,
          padding: "24px 28px",
          width: 440,
          maxWidth: "92vw",
          boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
          fontFamily: ff,
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2e", margin: "0 0 10px" }}>{title}</h3>
        <p style={{ fontSize: 13, color: "#374151", margin: "0 0 8px", lineHeight: 1.5 }}>{message}</p>
        {warning && (
          <div
            style={{
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: 8,
              padding: "8px 12px",
              marginBottom: 14,
              fontSize: 12,
              color: "#92400e",
            }}
          >
            {warning}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <Btn variant="outline" onClick={onCancel} disabled={busy}>Cancel</Btn>
          <Btn variant={confirmVariant} onClick={onConfirm} disabled={busy}>
            {busy ? "Processing…" : confirmLabel}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Money input (disabled-aware) ────────────────────────────────────────────
function MoneyInput({ value, onChange, disabled }) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      step="0.01"
      disabled={disabled}
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: "9px 11px",
        border: "1px solid #e8e8ec",
        borderRadius: 5,
        fontSize: 13,
        fontFamily: ff,
        background: disabled ? "#f3f4f6" : "#fff",
        color: disabled ? "#6b7280" : "#1a1a2e",
        cursor: disabled ? "not-allowed" : "text",
        outline: "none",
      }}
    />
  );
}

function FieldLabel({ label, children }) {
  return (
    <label style={{ display: "block" }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#6B7280",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      {children}
    </label>
  );
}

function SectionCard({ title, children, style }) {
  return (
    <section
      style={{
        background: "#fff",
        borderRadius: 12,
        border: "1px solid #e2e8f0",
        padding: "18px 20px",
        marginBottom: 16,
        ...style,
      }}
    >
      {title && (
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e", marginBottom: 14 }}>
          {title}
        </div>
      )}
      {children}
    </section>
  );
}

function ExportMenuItem({ label, onClick }) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "8px 12px",
        background: "transparent",
        border: "none",
        borderRadius: 6,
        fontSize: 13,
        fontFamily: ff,
        color: "#1a1a2e",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {label}
    </button>
  );
}

// ═════════════════════════════════════════════════════════════════════════════

export default function CorporationTaxDetailPage() {
  const { periodId } = useParams();
  const navigate = useNavigate();
  const { isLtd, loading: btLoading } = useBusinessType();

  const [period, setPeriod] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [accountingProfit, setAccountingProfit] = useState(null);
  const [profitLoading, setProfitLoading] = useState(true);
  const [profitError, setProfitError] = useState(null);

  // Editable adjustments (controlled strings — parsed on save/compute)
  const [disallowable, setDisallowable] = useState("0");
  const [capital, setCapital] = useState("0");
  const [other, setOther] = useState("0");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [exportSuccess, setExportSuccess] = useState(null); // 'pdf' | 'csv-flat' | 'csv-detailed' | null
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef(null);

  // ─── Load period ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await getCorporationTaxPeriod(periodId);
      if (cancelled) return;
      if (!res.success) {
        setLoadError(res.error);
        return;
      }
      setPeriod(res.period);
      setDisallowable(String(res.period.disallowable_expenses ?? 0));
      setCapital(String(res.period.capital_allowances ?? 0));
      setOther(String(res.period.other_adjustments ?? 0));
      setNotes(res.period.adjustments_notes || "");
    })();
    return () => { cancelled = true; };
  }, [periodId]);

  // ─── Load accounting profit once period dates are known ──────────────────
  useEffect(() => {
    if (!period) return;
    let cancelled = false;
    setProfitLoading(true);
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) {
        if (!cancelled) {
          setProfitError("Not signed in");
          setProfitLoading(false);
        }
        return;
      }
      const res = await getAccountingProfit({
        userId: auth.user.id,
        periodStart: period.period_start,
        periodEnd: period.period_end,
      });
      if (cancelled) return;
      setProfitLoading(false);
      if (!res.success) {
        setProfitError(res.error);
        return;
      }
      setAccountingProfit(res.accountingProfit);
    })();
    return () => { cancelled = true; };
  }, [period]);

  // ─── Live calc (pure, synchronous) ───────────────────────────────────────
  const calc = useMemo(() => {
    if (accountingProfit === null) return null;
    try {
      return computeCorporationTax({
        accountingProfit,
        disallowableExpenses: Number(disallowable) || 0,
        capitalAllowances: Number(capital) || 0,
        otherAdjustments: Number(other) || 0,
      });
    } catch (e) {
      return { error: e.message };
    }
  }, [accountingProfit, disallowable, capital, other]);

  const isLocked = !!period?.locked;

  // ─── Save adjustments + snapshot ─────────────────────────────────────────
  async function handleSave() {
    if (!calc || calc.error) return null;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    const res = await updateCorporationTaxPeriod(periodId, {
      disallowableExpenses: Number(disallowable) || 0,
      capitalAllowances: Number(capital) || 0,
      otherAdjustments: Number(other) || 0,
      adjustmentsNotes: notes.trim() || null,
      accountingProfit,
      taxAdjustedProfit: calc.taxAdjustedProfit,
      ctRateApplied: calc.ctRateApplied,
      ctEstimated: calc.ctEstimated,
      rateBracket: calc.rateBracket,
      computedAt: new Date().toISOString(),
    });
    setSaving(false);
    if (!res.success) {
      setSaveError(res.error);
      return null;
    }
    setPeriod(res.period);
    setSaveSuccess(true);
    return res.period;
  }

  async function handleFinalize() {
    const saved = await handleSave();
    if (!saved) { setConfirmAction(null); return; }
    setSaving(true);
    const res = await setCorporationTaxPeriodStatus(periodId, "finalized");
    setSaving(false);
    setConfirmAction(null);
    if (!res.success) {
      setSaveError(res.error);
      return;
    }
    setPeriod(res.period);
  }

  async function handleDelete() {
    setSaving(true);
    const res = await deleteCorporationTaxPeriod(periodId);
    setSaving(false);
    setConfirmAction(null);
    if (!res.success) {
      setSaveError(res.error);
      return;
    }
    navigate(ROUTES.CORPORATION_TAX);
  }

  async function handleExport(kind) {
    setExportMenuOpen(false);
    setExporting(true);
    setExportError(null);
    setExportSuccess(null);
    const res =
      kind === "pdf"
        ? await exportCorporationTaxPdf({ periodId })
        : await exportCorporationTaxCsv(periodId, kind === "csv-flat" ? "flat" : "detailed");
    setExporting(false);
    if (!res.success) {
      setExportError(res.error || "Export failed");
      return;
    }
    setExportSuccess(kind);
  }

  // Close export dropdown on outside-click or Esc.
  useEffect(() => {
    if (!exportMenuOpen) return;
    function onMouseDown(e) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setExportMenuOpen(false);
      }
    }
    function onKeyDown(e) {
      if (e.key === "Escape") setExportMenuOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [exportMenuOpen]);

  // ─── Access gates ────────────────────────────────────────────────────────
  if (btLoading) {
    return (
      <div style={{ ...moduleUi.page, fontFamily: ff }}>
        <div style={{ textAlign: "center", padding: "80px 24px", color: "#94a3b8", fontSize: 14 }}>
          Loading…
        </div>
      </div>
    );
  }

  if (!isLtd) {
    return (
      <div style={{ ...moduleUi.page, fontFamily: ff }}>
        <div
          style={{
            maxWidth: 560,
            margin: "80px auto",
            padding: 24,
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
            Corporation Tax is for LTD companies only
          </div>
          <Btn variant="primary" onClick={() => navigate(ROUTES.DASHBOARD)}>Back to dashboard</Btn>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ ...moduleUi.page, fontFamily: ff }}>
        <div style={{ maxWidth: 560, margin: "60px auto", textAlign: "center" }}>
          <div style={{ color: "#b91c1c", fontSize: 14, marginBottom: 16 }}>
            {loadError}
          </div>
          <Btn variant="outline" onClick={() => navigate(ROUTES.CORPORATION_TAX)}>
            ← Back to Corporation Tax
          </Btn>
        </div>
      </div>
    );
  }

  if (!period) {
    return (
      <div style={{ ...moduleUi.page, fontFamily: ff }}>
        <div style={{ textAlign: "center", padding: "80px 24px", color: "#94a3b8", fontSize: 14 }}>
          Loading period…
        </div>
      </div>
    );
  }

  const statusLabel =
    period.status === "finalized" ? "Finalized" :
    period.status === "exported" ? "Submitted" : "Draft";

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{ ...moduleUi.page, fontFamily: ff }}>

      {/* Sticky header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "#fff",
          borderBottom: "1px solid #e8e8ec",
          padding: "12px 24px",
          margin: "-24px -24px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => navigate(ROUTES.CORPORATION_TAX)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: 13, fontFamily: ff, padding: 0 }}
          >
            ← Corporation Tax
          </button>
          <span style={{ color: "#d1d5db" }}>/</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>
            {fmtDate(period.period_start)} – {fmtDate(period.period_end)}
          </span>
          <StatusBadge status={statusLabel} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {!isLocked && (
            <>
              <Btn
                variant="outline"
                onClick={() => setConfirmAction({
                  type: "delete",
                  title: "Delete period",
                  message: "Delete this Corporation Tax period? Any saved adjustments will be lost.",
                  warning: "This cannot be undone.",
                  confirmLabel: "Delete",
                  confirmVariant: "danger",
                })}
              >
                <Icons.Trash /> Delete
              </Btn>
              <Btn
                variant="accent"
                onClick={() => setConfirmAction({
                  type: "finalize",
                  title: "Finalize period",
                  message: "Lock this period with the current adjustments and CT estimate?",
                  warning: "Finalizing is one-way in Phase 1. Once finalized, contact support to unlock.",
                  confirmLabel: "Finalize",
                })}
                disabled={!calc || calc?.error || profitLoading}
              >
                <Icons.Check /> Finalize
              </Btn>
              <Btn variant="primary" onClick={handleSave} disabled={saving || !calc || calc?.error}>
                <Icons.Save /> {saving ? "Saving…" : "Save"}
              </Btn>
            </>
          )}
          <div
            ref={exportMenuRef}
            style={{ position: "relative" }}
            title={period.status === "draft" ? "Finalize this period to enable export." : undefined}
          >
            <Btn
              variant="outline"
              onClick={() => setExportMenuOpen((v) => !v)}
              disabled={exporting || period.status === "draft"}
            >
              <Icons.Download /> {exporting ? "Generating…" : "Export ▾"}
            </Btn>
            {exportMenuOpen && (
              <div
                role="menu"
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  right: 0,
                  background: "#fff",
                  border: "1px solid #e8e8ec",
                  borderRadius: 8,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
                  minWidth: 180,
                  padding: 4,
                  zIndex: 20,
                }}
              >
                <ExportMenuItem label="PDF" onClick={() => handleExport("pdf")} />
                <ExportMenuItem label="CSV — flat" onClick={() => handleExport("csv-flat")} />
                <ExportMenuItem label="CSV — detailed" onClick={() => handleExport("csv-detailed")} />
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto" }}>

        {/* Locked banner */}
        {isLocked && (
          <div
            style={{
              background: "#f3f4f6",
              border: "1px solid #d1d5db",
              borderRadius: 10,
              padding: "12px 18px",
              marginBottom: 16,
              fontSize: 13,
              color: "#374151",
            }}
          >
            <span style={{ fontWeight: 700 }}>🔒 This period is finalized and locked.</span>{" "}
            Contact support to unlock. You can still export the PDF.
          </div>
        )}

        {/* Save error */}
        {saveError && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 16,
              fontSize: 13,
              color: "#b91c1c",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>{saveError}</span>
            <button
              onClick={() => setSaveError(null)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#b91c1c", fontSize: 16, padding: 0 }}
            >×</button>
          </div>
        )}

        {saveSuccess && !saveError && (
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 16,
              fontSize: 13,
              color: "#166534",
            }}
          >
            Saved.
          </div>
        )}

        {/* Export error / success */}
        {exportError && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 16,
              fontSize: 13,
              color: "#b91c1c",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>Export failed: {exportError}</span>
            <button
              onClick={() => setExportError(null)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#b91c1c", fontSize: 16, padding: 0 }}
            >×</button>
          </div>
        )}
        {exportSuccess && !exportError && (
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 16,
              fontSize: 13,
              color: "#166534",
            }}
          >
            {exportSuccess === "pdf"
              ? "PDF exported."
              : exportSuccess === "csv-flat"
              ? "CSV (flat) exported."
              : "CSV (detailed) exported."}
          </div>
        )}

        {/* Period info */}
        <SectionCard title="Period">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, fontSize: 13 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Start</div>
              <div style={{ color: "#1a1a2e", fontWeight: 600 }}>{fmtDate(period.period_start)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>End</div>
              <div style={{ color: "#1a1a2e", fontWeight: 600 }}>{fmtDate(period.period_end)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Payment due</div>
              <div style={{ color: "#1a1a2e", fontWeight: 600 }}>{fmtDate(period.payment_due_date)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Filing due</div>
              <div style={{ color: "#1a1a2e", fontWeight: 600 }}>{fmtDate(period.filing_due_date)}</div>
            </div>
          </div>
          {period.source === "companies_house" && (
            <div style={{ marginTop: 12, fontSize: 12, color: "#64748b" }}>
              Synced from Companies House
              {period.companies_house_synced_at && ` on ${fmtDate(period.companies_house_synced_at)}`}
            </div>
          )}
        </SectionCard>

        {/* Accounting profit */}
        <SectionCard title="Accounting profit">
          {profitLoading && (
            <div style={{ fontSize: 13, color: "#94a3b8" }}>Loading from ledger…</div>
          )}
          {!profitLoading && profitError && (
            <div style={{ fontSize: 13, color: "#b91c1c" }}>
              Could not load accounting profit: {profitError}
            </div>
          )}
          {!profitLoading && !profitError && accountingProfit !== null && (
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>
                {fmtGbp2(accountingProfit)}
              </div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                Sum of revenue − expenses from journal entries for the period.
              </div>
            </div>
          )}
        </SectionCard>

        {/* Tax adjustments */}
        <SectionCard title="Tax adjustments">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
            <FieldLabel label="Disallowable £">
              <MoneyInput value={disallowable} onChange={setDisallowable} disabled={isLocked} />
            </FieldLabel>
            <FieldLabel label="Capital allowances £">
              <MoneyInput value={capital} onChange={setCapital} disabled={isLocked} />
            </FieldLabel>
            <FieldLabel label="Other £ (+/−)">
              <MoneyInput value={other} onChange={setOther} disabled={isLocked} />
            </FieldLabel>
          </div>
          <FieldLabel label="Notes">
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isLocked}
              placeholder="Optional notes for your records"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: 10,
                border: "1px solid #dbe4ee",
                borderRadius: 8,
                fontSize: 13,
                fontFamily: ff,
                resize: "vertical",
                background: isLocked ? "#f3f4f6" : "#fff",
                color: isLocked ? "#6b7280" : "#1a1a2e",
                cursor: isLocked ? "not-allowed" : "text",
              }}
            />
          </FieldLabel>
        </SectionCard>

        {/* Live calculation */}
        <SectionCard title="Live calculation">
          {!calc && (
            <div style={{ fontSize: 13, color: "#94a3b8" }}>
              Waiting for accounting profit to load…
            </div>
          )}
          {calc?.error && (
            <div style={{ fontSize: 13, color: "#b91c1c" }}>{calc.error}</div>
          )}
          {calc && !calc.error && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>
                    Tax-adjusted profit
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>
                    {fmtGbp2(calc.taxAdjustedProfit)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>
                    CT rate applied
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>
                    {calc.ctRateApplied}%
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <BracketBadge bracket={calc.rateBracket} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>
                    CT estimated
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#16A34A", fontVariantNumeric: "tabular-nums" }}>
                    {fmtGbp0(calc.ctEstimated)}
                  </div>
                </div>
              </div>

              {calc.rateBracket === "marginal_zone" && calc.warnings.length > 0 && (
                <div
                  style={{
                    background: "#fffbeb",
                    border: "1px solid #fde68a",
                    borderRadius: 8,
                    padding: "10px 12px",
                    fontSize: 12,
                    color: "#92400e",
                  }}
                >
                  ⚠ {calc.warnings[0]}
                </div>
              )}
            </>
          )}
        </SectionCard>
      </div>

      {confirmAction && (
        <ConfirmModal
          title={confirmAction.title}
          message={confirmAction.message}
          warning={confirmAction.warning}
          confirmLabel={confirmAction.confirmLabel}
          confirmVariant={confirmAction.confirmVariant}
          busy={saving}
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => {
            if (confirmAction.type === "delete")   return handleDelete();
            if (confirmAction.type === "finalize") return handleFinalize();
          }}
        />
      )}
    </div>
  );
}
