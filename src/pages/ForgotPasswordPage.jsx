import { useState } from "react";
import { Icons } from "../components/icons";
import { supabase, supabaseReady } from "../lib/supabase";
import InvoiceSagaLogo from "../components/InvoiceSagaLogo";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// SEC-008: Local password reset (ai_invoice_users) removed — Supabase Auth only

export default function ForgotPasswordPage({ onBackToLogin }) {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | error | sent

  const resetToForm = () => {
    setEmail("");
    setError("");
    setStatus("idle");
    setSentTo("");
  };

  const handleSubmit = async () => {
    setError("");
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Please enter your email address.");
      setStatus("error");
      return;
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      setStatus("error");
      return;
    }

    setStatus("loading");

    if (supabaseReady && supabase) {
      const { error: sbError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (!sbError) {
        setSentTo(normalizedEmail);
        setPendingLocalReset(readPendingLocalReset());
        setStatus("sent");
        return;
      }

      if (sbError) {
        setError(sbError?.message || "Could not send reset email. Please try again.");
        setStatus("error");
        return;
      }
    }

    // Always show success to avoid email enumeration
    setSentTo(normalizedEmail);
    setStatus("sent");
  };

  return (
    <div className="min-h-screen bg-[var(--surface-sunken)] flex items-center justify-center p-4">
      <div className="w-full max-w-[440px]">
        <div className="flex justify-center mb-6">
          <InvoiceSagaLogo height={32} />
        </div>

        <div className="bg-[var(--surface-card)] rounded-2xl shadow-[var(--shadow-lg)] p-8">
          {status !== "sent" ? (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 rounded-full bg-[var(--warning-50)] text-[var(--warning-700)] flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="4" y="11" width="16" height="9" rx="2" />
                    <path d="M8 11V8a4 4 0 1 1 8 0v3" />
                  </svg>
                </div>
              </div>

              <h1 className="text-2xl font-semibold text-[var(--text-primary)] text-center leading-tight m-0 mb-2">
                Reset your password
              </h1>
              <p className="text-sm text-[var(--text-secondary)] text-center leading-relaxed m-0 mb-5">
                Enter the email for your account and we'll send reset instructions.
              </p>

              <div className="relative mb-3">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] flex pointer-events-none">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && status !== "loading" && handleSubmit()}
                  placeholder="you@example.com"
                  className="w-full h-11 pl-10 pr-3 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-white outline-none focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)] transition-colors duration-150 box-border"
                />
              </div>

              {error && (
                <div className="bg-[var(--danger-50)] border border-[var(--danger-100)] rounded-[var(--radius-md)] px-3 py-2 text-xs text-[var(--danger-700)] flex items-center gap-2 mb-3">
                  <span className="flex"><Icons.Info /></span>
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={status === "loading"}
                className="w-full h-11 bg-[var(--text-primary)] hover:bg-[var(--surface-dark-2)] disabled:bg-[var(--surface-sunken)] disabled:text-[var(--text-tertiary)] disabled:cursor-not-allowed text-white border-none rounded-[var(--radius-md)] text-sm font-semibold cursor-pointer transition-colors duration-150"
              >
                {status === "loading" ? "Sending…" : "Send reset link →"}
              </button>

              <button
                onClick={onBackToLogin}
                className="block mx-auto mt-4 bg-transparent border-none cursor-pointer text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors duration-150"
              >
                ← Back to sign in
              </button>
            </>
          ) : (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 rounded-full bg-[var(--success-50)] text-[var(--success-700)] flex items-center justify-center">
                  <Icons.Check />
                </div>
              </div>

              <h1 className="text-2xl font-semibold text-[var(--text-primary)] text-center leading-tight m-0 mb-2">
                Check your inbox
              </h1>
              <p className="text-sm text-[var(--text-secondary)] text-center leading-relaxed m-0 mb-4">
                If an account exists for {sentTo || email.trim().toLowerCase()}, we've sent password reset instructions. Check spam if you don't see it.
              </p>

              <div className="bg-[var(--surface-sunken)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] px-3.5 py-3 text-xs text-[var(--text-secondary)] leading-relaxed mb-3">
                <div>• Check your spam / junk folder</div>
                <div>• Link expires in 30 minutes</div>
              </div>

              <button
                onClick={resetToForm}
                className="w-full h-11 bg-transparent border border-[var(--border-default)] hover:bg-[var(--surface-sunken)] rounded-[var(--radius-md)] text-sm text-[var(--text-secondary)] cursor-pointer transition-colors duration-150 mb-2.5"
              >
                Try a different email
              </button>

              <button
                onClick={onBackToLogin}
                className="block mx-auto bg-transparent border-none cursor-pointer text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors duration-150"
              >
                ← Back to sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
