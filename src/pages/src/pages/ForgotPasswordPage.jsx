import { useState } from "react";
import { ff } from "../constants";
import { Icons } from "../components/icons";
import { supabase, supabaseReady } from "../lib/supabase";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function readPendingLocalReset() {
  try {
    const raw = sessionStorage.getItem("pending_local_reset");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function makeHexToken32Bytes() {
  const arr = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function ForgotPasswordPage({ onBackToLogin }) {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | error | sent
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPrimaryHovered, setIsPrimaryHovered] = useState(false);
  const [pendingLocalReset, setPendingLocalReset] = useState(() => readPendingLocalReset());

  const resetToForm = () => {
    sessionStorage.removeItem("pending_local_reset");
    setPendingLocalReset(null);
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

      const message = (sbError?.message || "").toLowerCase();
      const userNotFound = message.includes("user not found") || sbError?.status === 400;

      if (!userNotFound) {
        setError(sbError?.message || "Could not send reset email. Please try again.");
        setStatus("error");
        return;
      }
    }

    let foundLocalUser = null;
    try {
      const users = JSON.parse(localStorage.getItem("ai_invoice_users") || "[]");
      if (Array.isArray(users)) {
        foundLocalUser = users.find(
          (u) => u?.email?.toLowerCase().trim() === normalizedEmail
        );
      }
    } catch {
      foundLocalUser = null;
    }

    if (foundLocalUser) {
      const token = makeHexToken32Bytes();
      let existing = [];
      try {
        const parsed = JSON.parse(localStorage.getItem("ai_invoice_reset_tokens") || "[]");
        existing = Array.isArray(parsed) ? parsed : [];
      } catch {
        existing = [];
      }

      const now = Date.now();
      const filtered = existing.filter((r) => Number(r?.expires) > now);
      filtered.push({
        email: normalizedEmail,
        token,
        expires: now + 30 * 60 * 1000,
      });
      localStorage.setItem("ai_invoice_reset_tokens", JSON.stringify(filtered));

      const resetUrl = `${window.location.origin}/reset-password?token=${token}&email=${encodeURIComponent(normalizedEmail)}&local=1`;
      const pending = { email: normalizedEmail, token, resetUrl };
      sessionStorage.setItem("pending_local_reset", JSON.stringify(pending));
      setPendingLocalReset(pending);
    } else {
      sessionStorage.removeItem("pending_local_reset");
      setPendingLocalReset(null);
    }

    setSentTo(normalizedEmail);
    setStatus("sent");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF7", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 460 }}>
        <div style={{ background: "#fff", maxWidth: 460, border: "1px solid #E8E6E0", borderRadius: 12, boxShadow: "0 2px 24px rgba(0,0,0,0.06)", padding: "32px 32px 28px" }}>
          {status !== "sent" ? (
            <>
              <div style={{ margin: "0 auto 16px", width: 56, height: 56, borderRadius: "50%", background: "#FEF3C7", color: "#92400E", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="4" y="11" width="16" height="9" rx="2" />
                  <path d="M8 11V8a4 4 0 1 1 8 0v3" />
                </svg>
              </div>

              <h1 style={{ fontSize: 24, fontWeight: 400, fontFamily: 'Georgia, "Times New Roman", serif', color: "#111110", lineHeight: 1.25, margin: "0 0 6px", letterSpacing: -0.3, textAlign: "center" }}>
                Reset your password
              </h1>
              <p style={{ fontSize: 14, color: "#6B6B6B", lineHeight: 1.6, margin: "0 0 20px", textAlign: "center" }}>
                Enter the email for your account and we'll send reset instructions.
              </p>

              <div style={{ marginBottom: 12 }}>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9A9A9A", display: "flex" }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setIsEmailFocused(true)}
                    onBlur={() => setIsEmailFocused(false)}
                    onKeyDown={(e) => e.key === "Enter" && status !== "loading" && handleSubmit()}
                    placeholder="you@example.com"
                    style={{ width: "100%", border: `1.5px solid ${isEmailFocused ? "#111110" : "#E0E0E0"}`, borderRadius: 6, fontSize: 15, fontFamily: ff, padding: "9px 10px 9px 36px", outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              {error && (
                <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "9px 12px", fontSize: 12, color: "#DC2626", display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ display: "flex" }}><Icons.Info /></span>
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={status === "loading"}
                onMouseEnter={() => setIsPrimaryHovered(true)}
                onMouseLeave={() => setIsPrimaryHovered(false)}
                style={{ width: "100%", background: status === "loading" ? "#E8E6E0" : (isPrimaryHovered ? "#333330" : "#111110"), color: status === "loading" ? "#9A9A9A" : "#FAFAF7", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 500, height: 48, lineHeight: "48px", fontFamily: ff, cursor: status === "loading" ? "not-allowed" : "pointer", padding: 0 }}
              >
                {status === "loading" ? "Sending…" : "Send reset link →"}
              </button>

              <button
                onClick={onBackToLogin}
                style={{ display: "block", margin: "16px auto 0", background: "none", border: "none", cursor: "pointer", color: "#9A9A9A", fontSize: 13, fontFamily: ff }}
              >
                ← Back to sign in
              </button>
            </>
          ) : (
            <>
              <div style={{ margin: "0 auto 16px", width: 56, height: 56, borderRadius: "50%", background: "#D4EDDA", color: "#155724", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icons.Check />
              </div>

              <h1 style={{ fontSize: 24, fontWeight: 400, fontFamily: 'Georgia, "Times New Roman", serif', color: "#111110", lineHeight: 1.25, margin: "0 0 6px", letterSpacing: -0.3, textAlign: "center" }}>
                Check your inbox
              </h1>
              <p style={{ fontSize: 14, color: "#6B6B6B", lineHeight: 1.6, margin: "0 0 16px", textAlign: "center" }}>
                If an account exists for {sentTo || email.trim().toLowerCase()}, we've sent password reset instructions. Check spam if you don't see it.
              </p>

              <div style={{ background: "#F5F4F0", border: "1px solid #E8E6E0", borderRadius: 8, padding: "12px 14px", fontSize: 12, color: "#6B6B6B", marginBottom: 12, lineHeight: 1.7 }}>
                <div>• Check your spam / junk folder</div>
                <div>• Link expires in 30 minutes</div>
              </div>

              {pendingLocalReset?.resetUrl && (
                <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 10, padding: "14px 16px", marginBottom: 12 }}>
                  <div style={{ display: "inline-block", background: "#D97706", color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 8px", borderRadius: 999, marginBottom: 8 }}>
                    Local account
                  </div>
                  <div>
                    <button
                      onClick={() => {
                        window.location.href = pendingLocalReset.resetUrl;
                      }}
                      style={{ background: "none", border: "none", padding: 0, color: "#92400E", cursor: "pointer", fontFamily: ff, fontWeight: 600, fontSize: 14 }}
                    >
                      Reset password now →
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={resetToForm}
                style={{ width: "100%", background: "none", border: "1px solid #E8E6E0", borderRadius: 8, height: 44, fontSize: 14, color: "#6B6B6B", cursor: "pointer", fontFamily: ff, marginBottom: 10 }}
              >
                Try a different email
              </button>

              <button
                onClick={onBackToLogin}
                style={{ display: "block", margin: "0 auto", background: "none", border: "none", cursor: "pointer", color: "#9A9A9A", fontSize: 13, fontFamily: ff }}
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
