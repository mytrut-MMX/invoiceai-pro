import { useEffect, useMemo, useState } from "react";
import { Icons } from "../components/icons";
import { supabase, supabaseReady } from "../lib/supabase";
import InvoiceSagaLogo from "../components/InvoiceSagaLogo";

function getStrength(password) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

// SEC-008: Local password reset (ai_invoice_users) removed — Supabase Auth only
export default function ResetPasswordPage({ onPasswordReset, onBackToLogin }) {
  const [mode, setMode] = useState(null); // null | "supabase"
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | loading | error | success | invalid
  const [errorMsg, setErrorMsg] = useState("");

  const strength = useMemo(() => getStrength(password), [password]);
  const strengthLabels = ["", "Weak", "Fair", "Good", "Strong", "Very strong"];
  const strengthColors = [
    "",
    "var(--danger-600)",
    "var(--warning-600)",
    "var(--warning-700)",
    "var(--success-600)",
    "var(--success-700)",
  ];
  const strengthColor = strengthColors[strength] || "var(--border-default)";

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const hashStr = window.location.hash.replace(/^#/, "");
    const hash = new URLSearchParams(hashStr);

    const accessToken = hash.get("access_token");
    const type = hash.get("type");
    const refreshToken = hash.get("refresh_token") || "";

    if (accessToken && type === "recovery" && supabaseReady && supabase) {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) { setStatus("invalid"); return; }
          setMode("supabase");
          window.history.replaceState({}, "", window.location.pathname);
        })
        .catch(() => setStatus("invalid"));
      return;
    }

    const code = search.get("code");
    if (code && supabaseReady && supabase) {
      supabase.auth
        .exchangeCodeForSession(code)
        .then(({ error }) => {
          if (error) { setStatus("invalid"); return; }
          setMode("supabase");
          window.history.replaceState({}, "", window.location.pathname);
        })
        .catch(() => setStatus("invalid"));
      return;
    }

    setStatus("invalid");
  }, []);

  const handleSubmit = async () => {
    setErrorMsg("");

    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      setStatus("error");
      return;
    }

    if (password !== confirm) {
      setErrorMsg("Passwords do not match.");
      setStatus("error");
      return;
    }

    if (strength < 2) {
      setErrorMsg("Please choose a stronger password.");
      setStatus("error");
      return;
    }

    setStatus("loading");

    if (mode === "supabase") {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setErrorMsg(error.message);
        setStatus("error");
        return;
      }
      setStatus("success");
      return;
    }

    setStatus("invalid");
  };

  const Shell = ({ children }) => (
    <div className="min-h-screen bg-[var(--surface-sunken)] flex items-center justify-center p-4">
      <div className="w-full max-w-[440px]">
        <div className="flex justify-center mb-6">
          <InvoiceSagaLogo height={32} />
        </div>
        <div className="bg-[var(--surface-card)] rounded-2xl shadow-[var(--shadow-lg)] p-8">
          {children}
        </div>
      </div>
    </div>
  );

  if (mode === null && status !== "invalid") {
    return (
      <Shell>
        <div className="text-center">
          <div className="w-10 h-10 border-[3px] border-[var(--border-subtle)] border-t-[var(--text-primary)] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[var(--text-secondary)] m-0">Verifying reset link…</p>
        </div>
      </Shell>
    );
  }

  if (status === "invalid") {
    return (
      <Shell>
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-[var(--danger-50)] text-[var(--danger-700)] flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 7v6" />
              <circle cx="12" cy="16.5" r="1" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] leading-tight m-0 mb-2">
            Link expired or invalid
          </h1>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed m-0 mb-5">
            This password reset link has expired or is no longer valid. Reset links are only valid for 30 minutes.
          </p>
          <button
            onClick={onBackToLogin}
            className="w-full h-11 bg-[var(--text-primary)] hover:bg-[var(--surface-dark-2)] text-white border-none rounded-[var(--radius-md)] text-sm font-semibold cursor-pointer transition-colors duration-150"
          >
            Back to sign in
          </button>
        </div>
      </Shell>
    );
  }

  if (status === "success") {
    return (
      <Shell>
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-[var(--success-50)] text-[var(--success-700)] flex items-center justify-center mx-auto mb-4">
            <Icons.Check />
          </div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] leading-tight m-0 mb-2">
            Password updated
          </h1>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed m-0 mb-5">
            Your password has been successfully reset. You can now sign in with your new password.
          </p>
          <button
            onClick={() => { onPasswordReset(); onBackToLogin(); }}
            className="w-full h-11 bg-[var(--text-primary)] hover:bg-[var(--surface-dark-2)] text-white border-none rounded-[var(--radius-md)] text-sm font-semibold cursor-pointer transition-colors duration-150"
          >
            Sign in now →
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex justify-center mb-4">
        <div className="w-14 h-14 rounded-full bg-[var(--warning-50)] text-[var(--warning-700)] flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="4" y="11" width="16" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 1 1 8 0v3" />
          </svg>
        </div>
      </div>

      <h1 className="text-2xl font-semibold text-[var(--text-primary)] text-center leading-tight m-0 mb-2">
        Set new password
      </h1>
      <p className="text-sm text-[var(--text-secondary)] text-center leading-relaxed m-0 mb-5">
        Choose a strong password for your account.
      </p>

      <div className="relative mb-3">
        <input
          type={showPw ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
          className="w-full h-11 pl-3 pr-11 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-white outline-none focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)] transition-colors duration-150 box-border"
        />
        <button
          onClick={() => setShowPw((p) => !p)}
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] p-1.5 flex"
        >
          {showPw ? <Icons.EyeSlash /> : <Icons.Eye />}
        </button>
      </div>

      {password.length > 0 && (
        <div className="mb-3">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex-1 h-[3px] rounded-[2px] transition-colors duration-150"
                style={{
                  background: i <= strength ? strengthColor : "var(--border-subtle)",
                }}
              />
            ))}
          </div>
          <div className="text-[11px] font-semibold mt-1" style={{ color: strengthColor }}>
            {strengthLabels[strength]}
          </div>
        </div>
      )}

      <input
        type={showPw ? "text" : "password"}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && status !== "loading" && handleSubmit()}
        placeholder="Confirm new password"
        className={[
          "w-full h-11 px-3 rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-white outline-none transition-colors duration-150 box-border mb-3",
          confirm && password !== confirm
            ? "border border-[var(--danger-600)] focus:shadow-[var(--focus-ring)]"
            : "border border-[var(--border-default)] focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)]",
        ].join(" ")}
      />

      <div className="mb-3">
        {[
          ["At least 8 characters", password.length >= 8],
          ["Passwords match", password.length > 0 && password === confirm],
        ].map(([text, ok]) => (
          <div
            key={text}
            className={[
              "flex items-center gap-1.5 text-xs mb-1",
              ok ? "text-[var(--success-700)]" : "text-[var(--text-tertiary)]",
            ].join(" ")}
          >
            <span className={`flex items-center justify-center w-3.5 h-3.5 rounded-full ${ok ? "bg-[var(--success-600)] text-white" : "border border-[var(--border-default)]"}`}>
              {ok && <Icons.Check />}
            </span>
            {text}
          </div>
        ))}
      </div>

      {errorMsg && (
        <div className="bg-[var(--danger-50)] border border-[var(--danger-100)] rounded-[var(--radius-md)] px-3 py-2 text-xs text-[var(--danger-700)] flex items-center gap-2 mb-3">
          <span className="flex"><Icons.Info /></span>
          <span>{errorMsg}</span>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={status === "loading"}
        className="w-full h-11 bg-[var(--text-primary)] hover:bg-[var(--surface-dark-2)] disabled:bg-[var(--surface-sunken)] disabled:text-[var(--text-tertiary)] disabled:cursor-not-allowed text-white border-none rounded-[var(--radius-md)] text-sm font-semibold cursor-pointer transition-colors duration-150"
      >
        {status === "loading" ? "Updating…" : "Update password →"}
      </button>

      <button
        onClick={onBackToLogin}
        className="block mx-auto mt-4 bg-transparent border-none cursor-pointer text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors duration-150"
      >
        ← Back to sign in
      </button>
    </Shell>
  );
}
