import { useEffect, useState } from "react";
import { ff } from "../constants";
import { supabase, getSession } from "../lib/supabase";

export default function AuthCallbackPage({ onAuth }) {
  const [status, setStatus] = useState("loading"); // "loading" | "error"

  useEffect(() => {
    const handleSession = (session) => {
      const u = {
        name: session.user.user_metadata?.full_name || session.user.email,
        email: session.user.email,
        role: "Admin",
        expiresAt: Date.now() + 8 * 60 * 60 * 1000,
        provider: session.user.app_metadata?.provider || "email",
      };
      try { localStorage.setItem("ai_invoice_user", JSON.stringify(u)); } catch {}
      // Change URL to "/" before triggering re-render — no page reload needed.
      // This avoids any localStorage/reload race condition: React state is already
      // set in memory, and App.jsx re-renders with path="/" and user set.
      window.history.replaceState({}, "", "/");
      onAuth(u);
    };

    // Subscribe to auth state changes — Supabase exchanges the token from the
    // URL hash automatically; this fires as soon as the session is ready.
    let unsubscribe = () => {};
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          handleSession(session);
        }
      });
      unsubscribe = () => subscription.unsubscribe();
    }

    // Fallback polling loop — max 5 attempts × 600 ms = 3 s
    let attempts = 0;
    const poll = async () => {
      const session = await getSession();
      if (session?.user) {
        handleSession(session);
        return;
      }
      attempts += 1;
      if (attempts < 5) {
        setTimeout(poll, 600);
      } else {
        setStatus("error");
      }
    };
    poll();

    return unsubscribe;
  }, [onAuth]);

  if (status === "error") {
    return (
      <div style={{ minHeight: "100vh", background: "#FAFAF7", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ff }}>
        <div style={{ textAlign: "center", maxWidth: 380 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#111110", marginBottom: 8 }}>Sign-in failed</div>
          <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 24 }}>We couldn't complete your sign-in. Please try again.</div>
          <a href="/login" style={{ display: "inline-block", background: "#111110", color: "#FAFAF7", padding: "10px 24px", borderRadius: 8, fontSize: 14, fontWeight: 500, textDecoration: "none" }}>
            Back to sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF7", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ff }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, border: "3px solid #E8E6E0", borderTopColor: "#111110", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 20px" }} />
        <div style={{ fontSize: 15, color: "#6b7280" }}>Signing you in…</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
