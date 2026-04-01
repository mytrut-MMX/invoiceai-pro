import { useEffect, useMemo, useState } from "react";
import { ff } from "../constants";
import { Icons } from "../components/icons";
import { supabase, supabaseReady } from "../lib/supabase";

function getStrength(password) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

export default function ResetPasswordPage({ onPasswordReset, onBackToLogin }) {
  const [mode, setMode] = useState(null); // null | "local" | "supabase"
  const [tokenEmail, setTokenEmail] = useState("");
  const [localToken, setLocalToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | loading | error | success | invalid
  const [errorMsg, setErrorMsg] = useState("");
  const [isPwFocused, setIsPwFocused] = useState(false);
  const [isConfirmFocused, setIsConfirmFocused] = useState(false);
  const [isPrimaryHovered, setIsPrimaryHovered] = useState(false);

  const strength = useMemo(() => getStrength(password), [password]);
  const strengthLabels = ["", "Weak", "Fair", "Good", "Strong", "Very strong"];
  const strengthColors = ["", "#dc2626", "#d97706", "#ca8a04", "#16a34a", "#15803d"];
  const strengthColor = strengthColors[strength] || "#e5e7eb";

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const hashStr = window.location.hash.replace(/^#/, "");
    const hash = new URLSearchParams(hashStr);

    const isLocal = search.get("local") === "1";
    const emailParam = search.get("email") || "";
    const tokenParam = search.get("token") || "";

    if (isLocal && emailParam && tokenParam) {
      const stored = JSON.parse(localStorage.getItem("ai_invoice_reset_tokens") || "[]");
      const entry = stored.find(
        (r) =>
          r.email === decodeURIComponent(emailParam) &&
          r.token === tokenParam &&
          r.expires > Date.now()
      );
      if (!entry) {
        setStatus("invalid");
        return;
      }
      setMode("local");
      setTokenEmail(decodeURIComponent(emailParam));
      setLocalToken(tokenParam);
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    const accessToken = hash.get("access_token");
    const type = hash.get("type");
    const refreshToken = hash.get("refresh_token") || "";

    if (accessToken && type === "recovery" && supabaseReady && supabase) {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) {
            setStatus("invalid");
            return;
          }
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
          if (error) {
            setStatus("invalid");
            return;
          }
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

    if (mode === "local") {
      const stored = JSON.parse(localStorage.getItem("ai_invoice_reset_tokens") || "[]");
      const entry = stored.find(
        (r) => r.email === tokenEmail && r.token === localToken && r.expires > Date.now()
      );
      if (!entry) {
        setStatus("invalid");
        return;
      }

      const salt = crypto.getRandomValues(new Uint8Array(16));
      const saltHex = Array.from(salt)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveBits"]
      );
      const bits = await crypto.subtle.deriveBits(
        { name: "PBKDF2", salt, iterations: 310000, hash: "SHA-256" },
        keyMaterial,
        256
      );
      const hashHex = Array.from(new Uint8Array(bits))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const pwHash = `pbkdf2:310000:${saltHex}:${hashHex}`;

      const users = JSON.parse(localStorage.getItem("ai_invoice_users") || "[]");
      const updated = users.map((u) =>
        u.email?.toLowerCase().trim() === tokenEmail ? { ...u, password: pwHash } : u
      );
      localStorage.setItem("ai_invoice_users", JSON.stringify(updated));

      const remaining = stored.filter(
        (r) => !(r.email === tokenEmail && r.token === localToken)
      );
      localStorage.setItem("ai_invoice_reset_tokens", JSON.stringify(remaining));

      sessionStorage.removeItem("pending_local_reset");
      setStatus("success");
      return;
    }

    setStatus("invalid");
  };

  if (mode === null && status !== "invalid") {
    return (
      <div style={{ minHeight: "100vh", background: "#FAFAF7", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif" }}>
        <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
        <div style={{ width: "100%", maxWidth: 460 }}>
          <div style={{ background: "#fff", maxWidth: 460, border: "1px solid #E8E6E0", borderRadius: 12, boxShadow: "0 2px 24px rgba(0,0,0,0.06)", padding: "32px 32px 28px", textAlign: "center" }}>
            <div style={{ width: 40, height: 40, border: "3px solid #E8E6E0", borderTopColor: "#111110", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 20px" }} />
            <p style={{ fontSize: 14, color: "#6B6B6B", margin: 0 }}>Verifying reset link…</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div style={{ minHeight: "100vh", background: "#FAFAF7", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif" }}>
        <div style={{ width: "100%", maxWidth: 460 }}>
          <div style={{ background: "#fff", maxWidth: 460, border: "1px solid #E8E6E0", borderRadius: 12, boxShadow: "0 2px 24px rgba(0,0,0,0.06)", padding: "32px 32px 28px", textAlign: "center" }}>
            <div style={{ margin: "0 auto 16px", width: 56, height: 56, borderRadius: "50%", background: "#FEE2E2", color: "#B91C1C", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 7v6" />
                <circle cx="12" cy="16.5" r="1" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 400, fontFamily: 'Georgia, "Times New Roman", serif', color: "#111110", lineHeight: 1.25, margin: "0 0 6px", letterSpacing: -0.3 }}>
              Link expired or invalid
            </h1>
            <p style={{ fontSize: 14, color: "#6B6B6B", lineHeight: 1.6, margin: "0 0 20px" }}>
              This password reset link has expired or is no longer valid. Reset links are only valid for 30 minutes.
            </p>
            <button
              onClick={onBackToLogin}
              style={{ width: "100%", background: "#111110", color: "#FAFAF7", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 500, height: 48, lineHeight: "48px", fontFamily: ff, cursor: "pointer", padding: 0 }}
            >
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div style={{ minHeight: "100vh", background: "#FAFAF7", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif" }}>
        <div style={{ width: "100%", maxWidth: 460 }}>
          <div style={{ background: "#fff", maxWidth: 460, border: "1px solid #E8E6E0", borderRadius: 12, boxShadow: "0 2px 24px rgba(0,0,0,0.06)", padding: "32px 32px 28px", textAlign: "center" }}>
            <div style={{ margin: "0 auto 16px", width: 56, height: 56, borderRadius: "50%", background: "#D4EDDA", color: "#155724", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icons.Check />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 400, fontFamily: 'Georgia, "Times New Roman", serif', color: "#111110", lineHeight: 1.25, margin: "0 0 6px", letterSpacing: -0.3 }}>
              Password updated!
            </h1>
            <p style={{ fontSize: 14, color: "#6B6B6B", lineHeight: 1.6, margin: "0 0 20px" }}>
              Your password has been successfully reset. You can now sign in with your new password.
            </p>
            <button
              onClick={() => {
                onPasswordReset();
                onBackToLogin();
              }}
              style={{ width: "100%", background: "#111110", color: "#FAFAF7", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 500, height: 48, lineHeight: "48px", fontFamily: ff, cursor: "pointer", padding: 0 }}
            >
              Sign in now →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF7", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 460 }}>
        <div style={{ background: "#fff", maxWidth: 460, border: "1px solid #E8E6E0", borderRadius: 12, boxShadow: "0 2px 24px rgba(0,0,0,0.06)", padding: "32px 32px 28px" }}>
          <div style={{ margin: "0 auto 16px", width: 56, height: 56, borderRadius: "50%", background: "#FEF3C7", color: "#92400E", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="4" y="11" width="16" height="9" rx="2" />
              <path d="M8 11V8a4 4 0 1 1 8 0v3" />
            </svg>
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 400, fontFamily: 'Georgia, "Times New Roman", serif', color: "#111110", lineHeight: 1.25, margin: "0 0 6px", letterSpacing: -0.3, textAlign: "center" }}>
            Set new password
          </h1>
          <p style={{ fontSize: 14, color: "#6B6B6B", lineHeight: 1.6, margin: "0 0 20px", textAlign: "center" }}>
            {mode === "local" ? `Resetting password for ${tokenEmail}` : "Choose a strong password for your account."}
          </p>

          <div style={{ marginBottom: 12 }}>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9A9A9A", display: "flex" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="4" y="11" width="16" height="9" rx="2" />
                  <path d="M8 11V8a4 4 0 1 1 8 0v3" />
                </svg>
              </span>
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setIsPwFocused(true)}
                onBlur={() => setIsPwFocused(false)}
                placeholder="New password"
                style={{ width: "100%", border: `1.5px solid ${isPwFocused ? "#111110" : "#E0E0E0"}`, borderRadius: 6, fontSize: 15, fontFamily: ff, padding: "9px 36px 9px 36px", outline: "none", boxSizing: "border-box" }}
              />
              <button
                onClick={() => setShowPw((p) => !p)}
                style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#AAA", padding: 2, display: "flex" }}
              >
                {showPw ? <Icons.EyeSlash /> : <Icons.Eye />}
              </button>
            </div>
          </div>

          {password.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 4 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    style={{ flex: 1, height: 3, borderRadius: 2, background: i <= strength ? strengthColor : "#e5e7eb" }}
                  />
                ))}
              </div>
              <div style={{ fontSize: 11, color: strengthColor, fontWeight: 600, marginTop: 4 }}>
                {strengthLabels[strength]}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 10 }}>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9A9A9A", display: "flex" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="4" y="11" width="16" height="9" rx="2" />
                  <path d="M8 11V8a4 4 0 1 1 8 0v3" />
                </svg>
              </span>
              <input
                type={showPw ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onFocus={() => setIsConfirmFocused(true)}
                onBlur={() => setIsConfirmFocused(false)}
                onKeyDown={(e) => e.key === "Enter" && status !== "loading" && handleSubmit()}
                placeholder="Confirm new password"
                style={{ width: "100%", border: `1.5px solid ${confirm && password !== confirm ? "#fca5a5" : (isConfirmFocused ? "#111110" : "#E0E0E0")}`, borderRadius: 6, fontSize: 15, fontFamily: ff, padding: "9px 10px 9px 36px", outline: "none", boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            {[
              ["At least 8 characters", password.length >= 8],
              ["Passwords match", password.length > 0 && password === confirm],
            ].map(([text, ok]) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: ok ? "#16A34A" : "#AAA", marginBottom: 3 }}>
                <span>{ok ? "✓" : "○"}</span>
                {text}
              </div>
            ))}
          </div>

          {errorMsg && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "9px 12px", fontSize: 12, color: "#DC2626", display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ display: "flex" }}><Icons.Info /></span>
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={status === "loading"}
            onMouseEnter={() => setIsPrimaryHovered(true)}
            onMouseLeave={() => setIsPrimaryHovered(false)}
            style={{ width: "100%", background: status === "loading" ? "#E8E6E0" : (isPrimaryHovered ? "#333330" : "#111110"), color: status === "loading" ? "#9A9A9A" : "#FAFAF7", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 500, height: 48, lineHeight: "48px", fontFamily: ff, cursor: status === "loading" ? "not-allowed" : "pointer", padding: 0 }}
          >
            {status === "loading" ? "Updating…" : "Update password →"}
          </button>

          <button
            onClick={onBackToLogin}
            style={{ display: "block", margin: "16px auto 0", background: "none", border: "none", cursor: "pointer", color: "#9A9A9A", fontSize: 13, fontFamily: ff }}
          >
            ← Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
}
