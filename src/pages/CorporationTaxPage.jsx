/**
 * CorporationTaxPage — Phase 1 Task 4.
 *
 * Lists CT accounting periods for the signed-in LTD company and lets the user
 * create a new period. A Companies House lookup pre-fills the period_start
 * and period_end from `next_accounts` (or derives from ARD as a fallback).
 *
 * Out of scope for this task: period detail, CT calc preview, edit/lock,
 * PDF export. See Tasks 5/6.
 */

import { useState, useEffect, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ff } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Btn } from "../components/atoms";
import {
  moduleUi,
  ModuleHeader,
  EmptyStatePanel,
  StatusBadge,
} from "../components/shared/moduleListUI";
import { ROUTES } from "../router/routes";
import { useBusinessType } from "../hooks/useBusinessType";
import {
  listCorporationTaxPeriods,
  createCorporationTaxPeriod,
  fetchCompaniesHousePrefill,
} from "../utils/ct/ctPeriods";

const GBP0 = new Intl.NumberFormat("en-GB", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const fmtGbp0 = (v) => (v == null ? "—" : `£${GBP0.format(Number(v))}`);
const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

// HMRC → UI label. "finalized" / "exported" are allowed by the schema but
// only "draft" is produced by Phase 1 flows — map defensively so unexpected
// values render with the neutral fallback.
const STATUS_LABEL = {
  draft: "Draft",
  finalized: "Approved",
  finalised: "Approved",
  exported: "Submitted",
};

export default function CorporationTaxPage() {
  const navigate = useNavigate();
  const { orgSettings } = useContext(AppCtx) || {};
  const { isLtd, loading: bizLoading } = useBusinessType();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const r = await listCorporationTaxPeriods();
    if (r.success) setPeriods(r.periods);
    else setError(r.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (bizLoading || !isLtd) return;
    refresh();
  }, [bizLoading, isLtd, refresh]);

  // ─── Access gate ──────────────────────────────────────────────────────────
  if (bizLoading) {
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
          <div style={{ fontSize: 13, color: "#475569", marginBottom: 16 }}>
            Add your Companies House registration number (CRN) in Settings to
            unlock this module.
          </div>
          <Btn variant="primary" onClick={() => navigate(ROUTES.DASHBOARD)}>
            Back to dashboard
          </Btn>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ ...moduleUi.page, fontFamily: ff }}>
      <ModuleHeader
        title="Corporation Tax"
        helper="Manage CT600 accounting periods, review tax-adjusted profit, and track payment and filing deadlines."
        count={periods.length}
        countLabel="periods"
        right={
          <Btn
            variant="primary"
            icon={<Icons.Plus />}
            onClick={() => setModalOpen(true)}
          >
            Create period
          </Btn>
        }
      />

      {error && (
        <div
          style={{
            marginTop: 16,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 12,
            color: "#b91c1c",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ ...moduleUi.tableCard, marginTop: 16, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
          <thead>
            <tr style={moduleUi.tableHead}>
              <th style={moduleUi.th}>Period</th>
              <th style={moduleUi.th}>Status</th>
              <th style={{ ...moduleUi.th, textAlign: "right" }}>CT estimated</th>
              <th style={moduleUi.th}>Payment due</th>
              <th style={moduleUi.th}>Filing due</th>
              <th style={{ ...moduleUi.th, textAlign: "right" }}>&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} style={{ padding: "48px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                  Loading periods…
                </td>
              </tr>
            )}
            {!loading && periods.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <EmptyStatePanel
                    icon={<Icons.Building />}
                    title="No periods yet"
                    message="Create your first Corporation Tax accounting period to get started."
                    cta={
                      <Btn variant="primary" icon={<Icons.Plus />} onClick={() => setModalOpen(true)}>
                        Create period
                      </Btn>
                    }
                  />
                </td>
              </tr>
            )}
            {!loading &&
              periods.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={moduleUi.td}>
                    <div style={moduleUi.primaryText}>
                      {fmtDate(p.period_start)} – {fmtDate(p.period_end)}
                    </div>
                    {p.source === "companies_house" && (
                      <div style={moduleUi.secondaryText}>Synced from Companies House</div>
                    )}
                  </td>
                  <td style={moduleUi.td}>
                    <StatusBadge status={STATUS_LABEL[p.status] || "Draft"} />
                  </td>
                  <td style={{ ...moduleUi.td, ...moduleUi.moneyCell }}>
                    {fmtGbp0(p.ct_estimated)}
                  </td>
                  <td style={moduleUi.td}>{fmtDate(p.payment_due_date)}</td>
                  <td style={moduleUi.td}>{fmtDate(p.filing_due_date)}</td>
                  <td style={{ ...moduleUi.td, textAlign: "right" }}>
                    <Btn
                      size="sm"
                      variant="outline"
                      icon={<Icons.Eye />}
                      onClick={() => navigate(`/corporation-tax/${p.id}`)}
                    >
                      View
                    </Btn>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <CreatePeriodModal
          defaultCrn={orgSettings?.crn || ""}
          onCancel={() => setModalOpen(false)}
          onCreated={async () => {
            setModalOpen(false);
            await refresh();
          }}
        />
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// CreatePeriodModal
// ═════════════════════════════════════════════════════════════════════════════
function CreatePeriodModal({ defaultCrn, onCancel, onCreated }) {
  const [crn, setCrn] = useState(defaultCrn || "");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [disallowable, setDisallowable] = useState("0");
  const [capital, setCapital] = useState("0");
  const [other, setOther] = useState("0");
  const [notes, setNotes] = useState("");
  const [chSyncedName, setChSyncedName] = useState(null);
  const [source, setSource] = useState("manual");

  const [fetching, setFetching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [chError, setChError] = useState(null);
  const [formError, setFormError] = useState(null);

  const handleFetch = async () => {
    setChError(null);
    setChSyncedName(null);
    if (!/^[A-Z0-9]{6,10}$/i.test(crn.trim())) {
      setChError("Enter a valid CRN (6–10 alphanumeric characters).");
      return;
    }
    setFetching(true);
    const r = await fetchCompaniesHousePrefill(crn.trim());
    setFetching(false);
    if (!r.success) {
      setChError(r.error || "Could not fetch from Companies House");
      return;
    }
    if (r.periodStart) setPeriodStart(r.periodStart);
    if (r.periodEnd) setPeriodEnd(r.periodEnd);
    setChSyncedName(r.companyName || "(company)");
    setSource("companies_house");
  };

  const handleCreate = async () => {
    setFormError(null);
    if (!periodStart || !periodEnd) {
      setFormError("Period start and end are required.");
      return;
    }
    if (periodEnd <= periodStart) {
      setFormError("Period end must be after period start.");
      return;
    }
    setSubmitting(true);
    const r = await createCorporationTaxPeriod({
      periodStart,
      periodEnd,
      source,
      disallowableExpenses: Number(disallowable) || 0,
      capitalAllowances: Number(capital) || 0,
      otherAdjustments: Number(other) || 0,
      adjustmentsNotes: notes.trim() || null,
    });
    setSubmitting(false);
    if (!r.success) {
      setFormError(r.error || "Failed to create period");
      return;
    }
    onCreated();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(17,17,16,0.55)",
        display: "grid",
        placeItems: "center",
        zIndex: 1500,
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #E8E6E0",
          boxShadow: "0 18px 40px rgba(17,17,16,0.2)",
          overflow: "hidden",
          fontFamily: ff,
          maxHeight: "calc(100vh - 32px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid #E8E6E0",
            fontSize: 16,
            fontWeight: 700,
            color: "#1F2937",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>Create Corporation Tax period</span>
          <button
            type="button"
            onClick={onCancel}
            style={{ border: "none", background: "transparent", cursor: "pointer", color: "#64748b" }}
            aria-label="Close"
          >
            <Icons.X />
          </button>
        </div>

        <div style={{ padding: "14px 18px", fontSize: 13, color: "#334155", overflowY: "auto" }}>
          {/* Companies House prefill */}
          <div
            style={{
              border: "1px solid #dbe4ee",
              borderRadius: 10,
              padding: 12,
              marginBottom: 14,
              background: "#f8fafc",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Companies House prefill
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
              <input
                type="text"
                value={crn}
                onChange={(e) => setCrn(e.target.value)}
                placeholder="CRN (e.g. 12345678)"
                style={{
                  flex: 1,
                  padding: "9px 11px",
                  border: "1px solid #e8e8ec",
                  borderRadius: 5,
                  fontSize: 13,
                  fontFamily: ff,
                  background: "#fff",
                  outline: "none",
                  textTransform: "uppercase",
                }}
              />
              <Btn variant="accent" onClick={handleFetch} disabled={fetching || !crn.trim()}>
                {fetching ? "Fetching…" : "Fetch from Companies House"}
              </Btn>
            </div>
            {chSyncedName && !chError && (
              <div style={{ marginTop: 8, fontSize: 12, color: "#065f46" }}>
                Synced from Companies House: {chSyncedName}
              </div>
            )}
            {chError && (
              <div style={{ marginTop: 8, fontSize: 12, color: "#b91c1c" }}>
                {chError} You can enter dates manually below.
              </div>
            )}
          </div>

          {/* Period dates */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <Labelled label="Period start">
              <DateInput value={periodStart} onChange={setPeriodStart} />
            </Labelled>
            <Labelled label="Period end">
              <DateInput value={periodEnd} onChange={setPeriodEnd} />
            </Labelled>
          </div>

          {/* Adjustments */}
          <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            Tax adjustments (optional)
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
            <Labelled label="Disallowable £">
              <MoneyInput value={disallowable} onChange={setDisallowable} />
            </Labelled>
            <Labelled label="Capital allowances £">
              <MoneyInput value={capital} onChange={setCapital} />
            </Labelled>
            <Labelled label="Other £">
              <MoneyInput value={other} onChange={setOther} />
            </Labelled>
          </div>
          <Labelled label="Notes">
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
              }}
            />
          </Labelled>

          {formError && (
            <div style={{ marginTop: 8, fontSize: 12, color: "#b91c1c" }}>{formError}</div>
          )}
        </div>

        <div
          style={{
            padding: "12px 18px",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            background: "#F0EFE9",
            borderTop: "1px solid #E8E6E0",
          }}
        >
          <Btn variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Btn>
          <Btn variant="primary" icon={<Icons.Check />} onClick={handleCreate} disabled={submitting}>
            {submitting ? "Creating…" : "Create"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

function Labelled({ label, children }) {
  return (
    <label style={{ display: "block", marginBottom: 10 }}>
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

function DateInput({ value, onChange }) {
  return (
    <input
      type="date"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: "9px 11px",
        border: "1px solid #e8e8ec",
        borderRadius: 5,
        fontSize: 13,
        fontFamily: ff,
        background: "#fff",
        outline: "none",
      }}
    />
  );
}

function MoneyInput({ value, onChange }) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      step="0.01"
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: "9px 11px",
        border: "1px solid #e8e8ec",
        borderRadius: 5,
        fontSize: 13,
        fontFamily: ff,
        background: "#fff",
        outline: "none",
      }}
    />
  );
}
