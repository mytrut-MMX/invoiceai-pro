import { useEffect, useState } from "react";
import { ff } from "../constants";
import { supabase, getSession } from "../lib/supabase";

export default function AuthCallbackPage({ onAuth }) {
  const [status, setStatus] = useState("loading"); // "loading" | "error"
  const [errorMessage, setErrorMessage] = useState("We couldn't complete your sign-in. Please try again.");

  useEffect(() => {
    const handleSession = (session) => {
      const u = {
        id: session.user.id,
        name: session.user.user_metadata?.full_name || session.user.email,
        email: session.user.email,
        role: "Admin",
        expiresAt: session.expires_at ? session.expires_at * 1000 : null,
        provider: session.user.app_metadata?.provider || "email",
      };
      // Change URL to "/" before triggering re-render — no page reload needed.
      // This avoids any localStorage/reload race condition: React state is already
      // set in memory, and App.jsx re-renders with path="/" and user set.
      window.history.replaceState({}, "", "/");
      onAuth(u);
    };

    const readOAuthErrorFromUrl = () => {
      const search = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      return (
        search.get("error_description") ||
        search.get("error") ||
        hash.get("error_description") ||
        hash.get("error")
      );
    };

    const oauthError = readOAuthErrorFromUrl();
    if (oauthError) {
      setErrorMessage(decodeURIComponent(oauthError.replace(/\+/g, " ")));
      setStatus("error");
      return () => {};
    }

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

    // If Supabase returned PKCE auth code in query string, exchange it manually
    // to avoid depending on browser timing.
    const searchParams = new URLSearchParams(window.location.search);
    const authCode = searchParams.get("code");
    if (authCode && supabase) {
      supabase.auth.exchangeCodeForSession(authCode).catch(() => {
        // Polling fallback below handles final error state gracefully.
      });
    }

    // Fallback polling loop — max 20 attempts × 600 ms = 12 s
    let attempts = 0;
    const poll = async () => {
      const session = await getSession();
      if (session?.user) {
        handleSession(session);
        return;
      }
      attempts += 1;
      if (attempts < 20) {
        setTimeout(poll, 600);
      } else {
        setErrorMessage("Sign-in took too long. Please try again.");
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
          <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 24 }}>{errorMessage}</div>
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
