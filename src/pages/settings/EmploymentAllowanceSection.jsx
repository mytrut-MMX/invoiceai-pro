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

  const [taxYear] = useState(getCurrentTaxYear());
  const [status,       setStatus]      = useState(null);
  const [eligibility,  setEligibility] = useState(null);
  const [loading,      setLoading]     = useState(true);
  const [loadError,    setLoadError]   = useState("");
  const [confirmed,    setConfirmed]   = useState(false);
  const [saving,       setSaving]      = useState(false);
  const [actionError,  setActionError] = useState("");

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
      "Stop claiming Employment Allowance? Future payroll runs will not absorb employer NI "
      + "into the allowance until you re-enable it. Existing usage for this tax year will be preserved."
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

  if (loading) {
    return (
      <Section title="Employment Allowance">
        <div className="py-5 text-center text-[var(--text-secondary)] text-sm">
          Checking Employment Allowance status…
        </div>
      </Section>
    );
  }

  if (loadError) {
    return (
      <Section title="Employment Allowance">
        <InfoBox color="var(--danger-600)">{loadError}</InfoBox>
      </Section>
    );
  }

  const isActive = status?.enabled === true;
  const annualLimit = Number(status?.annual_limit || EA_ANNUAL_LIMIT_2025_26);
  const usedAmount = Number(status?.used_amount || 0);
  const remaining = round2(annualLimit - usedAmount);
  const usedPct = annualLimit > 0 ? Math.min(100, round2((usedAmount / annualLimit) * 100)) : 0;

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
    !confirmed || saving
    || eligibility?.noEmployees
    || eligibility?.singleDirectorViolation;

  return (
    <Section title="Employment Allowance">
      <div className="mb-3.5 text-sm text-[var(--text-secondary)]">
        Tax year <strong>{taxYear}</strong> · Annual allowance <strong>{fmtMoney(annualLimit)}</strong>
      </div>

      <p className="m-0 mb-3.5 text-xs text-[var(--text-tertiary)] leading-relaxed">
        Employment Allowance reduces your employer Class 1 National Insurance bill by up to {fmtMoney(annualLimit)} per tax year.
        Most businesses with employees are eligible.{" "}
        <a
          href="https://www.gov.uk/claim-employment-allowance"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--brand-600)] hover:text-[var(--brand-700)]"
        >
          HMRC eligibility rules
        </a>.
      </p>

      {warnings.map((w, i) => (
        <div key={i} className="mb-3">
          <InfoBox color="var(--warning-600)">{w.msg}</InfoBox>
        </div>
      ))}

      {isActive && (
        <>
          <div className="flex items-center gap-2 mb-3.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--success-600)]" />
            <span className="text-sm font-semibold text-[var(--success-700)]">Active</span>
            {status?.claimed_at && (
              <span className="text-xs text-[var(--text-tertiary)] ml-2">
                Claimed on {fmtDateShort(status.claimed_at)}
              </span>
            )}
          </div>

          <div className="bg-[var(--surface-sunken)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-4 py-3.5 mb-3.5">
            <div className="flex justify-between mb-2 text-xs text-[var(--text-secondary)]">
              <span>Used: <strong>{fmtMoney(usedAmount)}</strong> / {fmtMoney(annualLimit)}</span>
              <span>Remaining: <strong className="text-[var(--success-700)]">{fmtMoney(remaining)}</strong></span>
            </div>
            <div className="bg-[var(--border-subtle)] rounded-[3px] h-2.5 overflow-hidden">
              <div
                className="bg-[var(--brand-600)] h-full transition-all duration-300"
                style={{ width: `${usedPct}%` }}
              />
            </div>
            <div className="mt-1.5 text-[11px] text-[var(--text-tertiary)] text-right">{usedPct}% used</div>
          </div>

          {eligibility?.cumulativeEmployerNi > 0 && (
            <div className="mb-3.5 text-xs text-[var(--text-tertiary)]">
              Cumulative employer NI for this tax year: <strong>{fmtMoney(eligibility.cumulativeEmployerNi)}</strong>
            </div>
          )}

          {actionError && (
            <div className="mb-3 text-sm text-[var(--danger-600)] font-semibold flex items-center gap-1.5">
              <Icons.Alert /> {actionError}
            </div>
          )}

          <Btn variant="outline" onClick={handleStop} disabled={saving}>
            {saving ? "Stopping…" : "Stop claiming"}
          </Btn>
        </>
      )}

      {!isActive && (
        <>
          <div className="mb-3.5">
            <label className="flex items-start gap-2 cursor-pointer text-sm text-[var(--text-secondary)] leading-relaxed">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={e => setConfirmed(e.target.checked)}
                className="mt-0.5 accent-[var(--brand-600)] cursor-pointer"
              />
              <span>
                I confirm my business is eligible for Employment Allowance under{" "}
                <a
                  href="https://www.gov.uk/claim-employment-allowance/eligibility"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--brand-600)] hover:text-[var(--brand-700)]"
                >
                  HMRC's eligibility rules
                </a>{" "}
                (not solely a single-director company, less than 50% public sector work, not part of a connected company group already claiming).
              </span>
            </label>
          </div>

          {actionError && (
            <div className="mb-3 text-sm text-[var(--danger-600)] font-semibold flex items-center gap-1.5">
              <Icons.Alert /> {actionError}
            </div>
          )}

          <Btn
            variant="primary"
            onClick={handleClaim}
            disabled={claimDisabled}
          >
            {saving ? "Claiming…" : "Claim Employment Allowance"}
          </Btn>
        </>
      )}
    </Section>
  );
}
