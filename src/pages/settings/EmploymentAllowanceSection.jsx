import { useState, useEffect, useContext } from "react";
import { AppCtx } from "../../context/AppContext";
import { Icons } from "../../components/icons";
import { Btn, InfoBox } from "../../components/atoms";
import Section from "../../components/settings/Section";
import {
  getEAStatus,
  enableEA,
  disableEA,
  getEAEligibility,
  getCurrentTaxYear,
  EA_ANNUAL_LIMIT_2025_26,
} from "../../lib/employmentAllowance";

const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;
const fmtMoney = n => `£${round2(n || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDateShort = isoStr => {
  if (!isoStr) return "—";
  const d = new Date(isoStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

export default function EmploymentAllowanceSection() {
  const { user } = useContext(AppCtx);

  const [taxYear]      = useState(getCurrentTaxYear());
  const [status,       setStatus]       = useState(null);
  const [eligibility,  setEligibility]  = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [loadError,    setLoadError]    = useState("");
  const [confirmed,    setConfirmed]    = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [actionError,  setActionError]  = useState("");

  // Load status + eligibility on mount and when user changes
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    setLoading(true);
    setLoadError("");

    Promise.all([
      getEAStatus(user.id, taxYear),
      getEAEligibility(user.id, taxYear),
    ])
      .then(([statusRow, eligibilityData]) => {
        if (cancelled) return;
        setStatus(statusRow);
        setEligibility(eligibilityData);
      })
      .catch(err => {
        if (cancelled) return;
        setLoadError(err.message || "Failed to load Employment Allowance status");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [user?.id, taxYear]);

  const handleClaim = async () => {
    if (!user?.id) return;
    setSaving(true);
    setActionError("");
    try {
      const row = await enableEA(user.id, taxYear);
      setStatus(row);
      setConfirmed(false);
    } catch (err) {
      setActionError(err.message || "Failed to claim Employment Allowance");
    } finally {
      setSaving(false);
    }
  };

  const handleStop = async () => {
    if (!user?.id) return;
    if (!window.confirm(
      "Stop claiming Employment Allowance? Future payroll runs will not absorb employer NI " +
      "into the allowance until you re-enable it. Existing usage for this tax year will be preserved."
    )) return;

    setSaving(true);
    setActionError("");
    try {
      const row = await disableEA(user.id, taxYear);
      setStatus(row);
    } catch (err) {
      setActionError(err.message || "Failed to stop Employment Allowance");
    } finally {
      setSaving(false);
    }
  };

  // ─── Loading state ────────────────────────────────────────────────────
  if (loading) {
    return (
      <Section title="Employment Allowance">
        <div style={{ padding:"20px 0", textAlign:"center", color:"#6b7280", fontSize:13 }}>
          Checking Employment Allowance status…
        </div>
      </Section>
    );
  }

  // ─── Load error ────────────────────────────────────────────────────────
  if (loadError) {
    return (
      <Section title="Employment Allowance">
        <InfoBox style={{ borderColor:"#fecaca", background:"#fef2f2", color:"#b91c1c" }}>
          {loadError}
        </InfoBox>
      </Section>
    );
  }

  const isActive = status?.enabled === true;
  const annualLimit = Number(status?.annual_limit || EA_ANNUAL_LIMIT_2025_26);
  const usedAmount = Number(status?.used_amount || 0);
  const remaining = round2(annualLimit - usedAmount);
  const usedPct = annualLimit > 0 ? Math.min(100, round2((usedAmount / annualLimit) * 100)) : 0;

  // Eligibility warnings (informational)
  const warnings = [];
  if (eligibility?.noEmployees) {
    warnings.push({
      type: "blocking",
      msg: "You have no active employees. Employment Allowance is only available if you run payroll for employees who pay employer Class 1 NI.",
    });
  }
  if (eligibility?.singleDirectorViolation) {
    warnings.push({
      type: "blocking",
      msg: "Single-director rule: you have exactly one employee earning above the £5,000 secondary threshold and that employee is a company director. HMRC does not allow Employment Allowance claims in this case (rule effective from April 2016). Add another employee or director paid above £5,000/year to qualify.",
    });
  }

  const claimDisabled =
    !confirmed ||
    saving ||
    eligibility?.noEmployees ||
    eligibility?.singleDirectorViolation;

  return (
    <Section title="Employment Allowance">
      {/* Header info */}
      <div style={{ marginBottom:14, fontSize:13, color:"#374151" }}>
        Tax year <strong>{taxYear}</strong> · Annual allowance <strong>{fmtMoney(annualLimit)}</strong>
      </div>

      <p style={{ margin:"0 0 14px", fontSize:12, color:"#6b7280", lineHeight:1.6 }}>
        Employment Allowance reduces your employer Class 1 National Insurance bill by up to {fmtMoney(annualLimit)} per tax year.
        Most businesses with employees are eligible. <a href="https://www.gov.uk/claim-employment-allowance" target="_blank" rel="noopener noreferrer" style={{ color:"#1e6be0" }}>HMRC eligibility rules</a>.
      </p>

      {/* Warnings */}
      {warnings.map((w, i) => (
        <div key={i} style={{ marginBottom:12 }}>
          <InfoBox style={{ borderColor:"#fde68a", background:"#fffbeb", color:"#92400e" }}>
            {w.msg}
          </InfoBox>
        </div>
      ))}

      {/* ─── ACTIVE STATE ──────────────────────────────────────────────── */}
      {isActive && (
        <>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
            <div style={{ width:10, height:10, borderRadius:"50%", background:"#16A34A" }} />
            <span style={{ fontSize:14, fontWeight:700, color:"#16A34A" }}>Active</span>
            {status?.claimed_at && (
              <span style={{ fontSize:12, color:"#6b7280", marginLeft:8 }}>
                Claimed on {fmtDateShort(status.claimed_at)}
              </span>
            )}
          </div>

          {/* Usage progress bar */}
          <div style={{ background:"#f9fafb", borderRadius:8, border:"1px solid #e8e8ec", padding:"14px 16px", marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:12, color:"#374151" }}>
              <span>Used: <strong>{fmtMoney(usedAmount)}</strong> / {fmtMoney(annualLimit)}</span>
              <span>Remaining: <strong style={{ color:"#16A34A" }}>{fmtMoney(remaining)}</strong></span>
            </div>
            <div style={{ background:"#e5e7eb", borderRadius:6, height:10, overflow:"hidden" }}>
              <div style={{ background:"#1e6be0", height:"100%", width:`${usedPct}%`, transition:"width 0.3s ease" }} />
            </div>
            <div style={{ marginTop:6, fontSize:11, color:"#6b7280", textAlign:"right" }}>{usedPct}% used</div>
          </div>

          {/* Cumulative employer NI display (informational) */}
          {eligibility?.cumulativeEmployerNi > 0 && (
            <div style={{ marginBottom:14, fontSize:12, color:"#6b7280" }}>
              Cumulative employer NI for this tax year: <strong>{fmtMoney(eligibility.cumulativeEmployerNi)}</strong>
            </div>
          )}

          {actionError && (
            <div style={{ marginBottom:12, fontSize:13, color:"#dc2626", fontWeight:600, display:"flex", alignItems:"center", gap:6 }}>
              <Icons.Alert /> {actionError}
            </div>
          )}

          <Btn variant="outline" onClick={handleStop} disabled={saving}>
            {saving ? "Stopping…" : "Stop claiming"}
          </Btn>
        </>
      )}

      {/* ─── NOT CLAIMING STATE ────────────────────────────────────────── */}
      {!isActive && (
        <>
          <div style={{ marginBottom:14 }}>
            <label style={{ display:"flex", alignItems:"flex-start", gap:8, cursor:"pointer", fontSize:13, color:"#374151", lineHeight:1.5 }}>
              <input
                type="checkbox"
                checked={confirmed}
                onChange={e => setConfirmed(e.target.checked)}
                style={{ marginTop:3, accentColor:"#1e6be0", cursor:"pointer" }}
              />
              <span>
                I confirm my business is eligible for Employment Allowance under{" "}
                <a href="https://www.gov.uk/claim-employment-allowance/eligibility" target="_blank" rel="noopener noreferrer" style={{ color:"#1e6be0" }}>HMRC's eligibility rules</a>{" "}
                (not solely a single-director company, less than 50% public sector work, not part of a connected company group already claiming).
              </span>
            </label>
          </div>

          {actionError && (
            <div style={{ marginBottom:12, fontSize:13, color:"#dc2626", fontWeight:600, display:"flex", alignItems:"center", gap:6 }}>
              <Icons.Alert /> {actionError}
            </div>
          )}

          <Btn
            variant="primary"
            onClick={handleClaim}
            disabled={claimDisabled}
            style={{ background: claimDisabled ? "#9ca3af" : "#1e6be0", color:"#fff" }}
          >
            {saving ? "Claiming…" : "Claim Employment Allowance"}
          </Btn>
        </>
      )}
    </Section>
  );
}
