import { useState, useEffect, useContext } from "react";
import { AppCtx } from "../../context/AppContext";
import { Icons } from "../../components/icons";
import { Btn, Switch } from "../../components/atoms";
import Section from "../../components/settings/Section";
import OTPInput from "../../components/ui/OTPInput";
import { useToast } from "../../components/ui/Toast";
import {
  getMfaPreference,
  setMfaPreference,
  sendEmailOtp,
  verifyEmailOtp,
} from "../../lib/supabase";

const RESEND_COOLDOWN_S = 30;

export default function SettingsSecurity() {
  const { user } = useContext(AppCtx);
  const { toast } = useToast();

  const [enabled, setEnabled]       = useState(false);
  const [loadingPref, setLoadingPref] = useState(true);

  // Enrolment flow state
  const [stage, setStage]           = useState("idle"); // idle | sending | verify | disabling
  const [code, setCode]             = useState("");
  const [verifying, setVerifying]   = useState(false);
  const [error, setError]           = useState("");
  const [cooldown, setCooldown]     = useState(0);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    if (!user?.email) { setLoadingPref(false); return; }
    getMfaPreference({ userId: user.id, email: user.email }).then(v => {
      if (cancelled) return;
      setEnabled(!!v);
      setLoadingPref(false);
    });
    return () => { cancelled = true; };
  }, [user?.id, user?.email]);

  // Resend cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const cancelEnrol = () => {
    setStage("idle");
    setCode("");
    setError("");
  };

  const startEnrol = async () => {
    if (!user?.email) return;
    setError("");
    setCode("");
    setStage("sending");
    const { error: err } = await sendEmailOtp(user.email);
    if (err) {
      setStage("idle");
      setError(err.message || "Could not send verification code. Please try again.");
      return;
    }
    setStage("verify");
    setCooldown(RESEND_COOLDOWN_S);
  };

  const resendCode = async () => {
    if (cooldown > 0 || !user?.email) return;
    setError("");
    const { error: err } = await sendEmailOtp(user.email);
    if (err) {
      setError(err.message || "Could not resend verification code.");
      return;
    }
    setCode("");
    setCooldown(RESEND_COOLDOWN_S);
  };

  const verifyAndEnable = async (token) => {
    if (!user?.email) return;
    setVerifying(true);
    setError("");
    const { error: err } = await verifyEmailOtp(user.email, token);
    if (err) {
      setVerifying(false);
      setError(err.message || "Invalid code. Please check your email and try again.");
      return;
    }
    const { error: persistErr } = await setMfaPreference({
      userId: user.id,
      email:  user.email,
      enabled: true,
    });
    setVerifying(false);
    if (persistErr) {
      setError("Verified, but we couldn't save the preference. Please try again.");
      return;
    }
    setEnabled(true);
    setStage("idle");
    setCode("");
    toast({ variant: "success", title: "Two-factor authentication enabled" });
  };

  const handleToggle = async (next) => {
    if (next === enabled) return;

    if (next) {
      await startEnrol();
      return;
    }

    // Disabling — confirm first.
    const ok = window.confirm("Are you sure? This will reduce your account security.");
    if (!ok) return;

    setStage("disabling");
    const { error: err } = await setMfaPreference({
      userId: user.id,
      email:  user.email,
      enabled: false,
    });
    setStage("idle");
    if (err) {
      toast({ variant: "danger", title: "Could not disable 2FA", description: "Please try again." });
      return;
    }
    setEnabled(false);
    toast({ variant: "success", title: "Two-factor authentication disabled" });
  };

  if (loadingPref) {
    return (
      <Section title="Two-factor authentication">
        <div className="text-sm text-[var(--text-tertiary)]">Loading…</div>
      </Section>
    );
  }

  return (
    <>
      <Section title="Two-factor authentication">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm font-semibold text-[var(--text-primary)]">Email verification code</span>
              {enabled ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-sm)] bg-[var(--success-50)] text-[var(--success-700)] text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--success-600)]" />
                  Enabled
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-sm)] bg-[var(--neutral-50)] text-[var(--text-tertiary)] text-[11px] font-semibold">
                  Disabled
                </span>
              )}
            </div>
            <div className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Add an extra layer of security. After entering your password, you'll need to enter a 6-digit code sent to{" "}
              <strong>{user?.email}</strong>.
            </div>
          </div>
          <Switch
            checked={enabled || stage === "verify" || stage === "sending"}
            onChange={handleToggle}
          />
        </div>

        {stage === "verify" && (
          <div className="mt-5 pt-5 border-t border-[var(--border-subtle)]">
            <div className="text-sm font-semibold text-[var(--text-primary)] mb-1">Check your inbox</div>
            <div className="text-sm text-[var(--text-secondary)] mb-4">
              We sent a 6-digit code to <strong>{user?.email}</strong>. Enter it below to finish enabling 2FA.
            </div>

            <OTPInput
              value={code}
              onChange={setCode}
              onComplete={verifyAndEnable}
              disabled={verifying}
              error={!!error}
            />

            {error && (
              <div className="mt-3 bg-[var(--danger-50)] border border-[var(--danger-100)] rounded-[var(--radius-md)] px-3 py-2 flex items-center gap-2">
                <span className="text-[var(--danger-600)] flex"><Icons.Info /></span>
                <span className="text-xs text-[var(--danger-700)] font-medium">{error}</span>
              </div>
            )}

            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <Btn
                variant="primary"
                onClick={() => verifyAndEnable(code)}
                disabled={verifying || code.length !== 6}
              >
                {verifying ? "Verifying…" : "Verify and enable"}
              </Btn>
              <button
                type="button"
                onClick={resendCode}
                disabled={cooldown > 0}
                className="text-sm text-[var(--brand-600)] hover:text-[var(--brand-700)] disabled:text-[var(--text-tertiary)] disabled:cursor-not-allowed bg-transparent border-none cursor-pointer"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
              </button>
              <button
                type="button"
                onClick={cancelEnrol}
                disabled={verifying}
                className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] bg-transparent border-none cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {stage === "sending" && (
          <div className="mt-5 pt-5 border-t border-[var(--border-subtle)] text-sm text-[var(--text-tertiary)]">
            Sending verification code…
          </div>
        )}

        {error && stage === "idle" && (
          <div className="mt-4 bg-[var(--danger-50)] border border-[var(--danger-100)] rounded-[var(--radius-md)] px-3 py-2 flex items-center gap-2">
            <span className="text-[var(--danger-600)] flex"><Icons.Info /></span>
            <span className="text-xs text-[var(--danger-700)] font-medium">{error}</span>
          </div>
        )}
      </Section>
    </>
  );
}
