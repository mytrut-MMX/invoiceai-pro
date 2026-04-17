import { useState, useEffect } from "react";
import { Icons } from "../components/icons";
import { Field, Btn } from "../components/atoms";
import InvoiceSagaLogo from "../components/InvoiceSagaLogo";
import { supabase, supabaseReady, signInWithGoogle, getSession, supabaseConfigError } from "../lib/supabase";
import ForgotPasswordPage from "./ForgotPasswordPage";

// AUTH-008: In-memory brute-force lockout (per email, 5 attempts → 15 min lockout)
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

function checkLockout(email) {
  const entry = loginAttempts.get(email);
  if (!entry) return false;
  if (Date.now() > entry.until) { loginAttempts.delete(email); return false; }
  return entry.count >= MAX_ATTEMPTS;
}
function recordFailure(email) {
  const entry = loginAttempts.get(email) || { count: 0, until: Date.now() + LOCKOUT_MS };
  entry.count += 1;
  entry.until = Date.now() + LOCKOUT_MS;
  loginAttempts.set(email, entry);
}
function clearAttempts(email) { loginAttempts.delete(email); }

const inputCls =
  "w-full h-11 px-3 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-white outline-none focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)] transition-colors duration-150 box-border";

const inputWithIconCls =
  "w-full h-11 pl-10 pr-3 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-white outline-none focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)] transition-colors duration-150 box-border";

export default function AuthPage({ onAuth }) {
  const [mode, setMode] = useState(() => window.location.pathname === "/signup" ? "register" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  useEffect(() => {
    getSession().then(session => {
      if (session?.user) {
        onAuth({
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.email,
          email: session.user.email,
          role: "Admin",
          expiresAt: Date.now() + 8 * 60 * 60 * 1000,
          provider: session.user.app_metadata?.provider || "email",
        });
      }
    });
  }, []);

  const oauthErrorMessage = (provider, error) => {
    const msg = typeof error === "string" ? error : (error?.message || "");
    if (msg.toLowerCase().includes("forbidden use of secret api key in browser")) {
      return "Auth is misconfigured: browser is using a secret Supabase key. Replace it with VITE_SUPABASE_ANON_KEY.";
    }
    if (msg.toLowerCase().includes("provider is not enabled") || error?.code === 400) {
      return `${provider} sign-in is not enabled yet. Please use email and password, or contact support.`;
    }
    return msg || `${provider} sign-in failed. Please try again.`;
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) { setError(oauthErrorMessage("Google", error)); setLoading(false); }
  };

  const saveProfileToSupabase = async ({ userId, email, name }) => {
    if (!supabaseReady || !supabase) return;
    if (!userId) return;
    try {
      await supabase.from("profiles").upsert({ user_id: userId, email, name }, { onConflict: "user_id" });
    } catch {}
  };

  const fetchNameFromSupabase = async (userId) => {
    if (!supabaseReady || !supabase) return null;
    if (!userId) return null;
    try {
      const { data } = await supabase.from("profiles").select("name").eq("user_id", userId).single();
      return data?.name || null;
    } catch { return null; }
  };

  const handleSubmit = () => {
    setError("");
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) { setError("Email and password are required."); return; }
    if (!/\S+@\S+\.\S+/.test(normalizedEmail)) { setError("Please enter a valid email address."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }

    if (checkLockout(normalizedEmail)) {
      setError("Too many failed attempts. Try again in 15 minutes.");
      return;
    }

    if (!supabaseReady || !supabase) {
      setError("Authentication service unavailable. Please try again later.");
      return;
    }

    setLoading(true);
    setTimeout(async () => {
      if (mode === "register") {
        if (!name.trim()) { setError("Full name is required."); setLoading(false); return; }
        if (password !== confirmPw) { setError("Passwords do not match."); setLoading(false); return; }

        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { data: { full_name: name.trim() } },
        });
        if (error) {
          setError(oauthErrorMessage("Email", error));
          setLoading(false);
          return;
        }
        await saveProfileToSupabase({
          userId: data?.user?.id,
          email: normalizedEmail,
          name: name.trim(),
        });
        if (data?.user && data?.session) {
          clearAttempts(normalizedEmail);
          onAuth({
            id: data.user.id,
            name: data.user.user_metadata?.full_name || name.trim(),
            email: data.user.email,
            role: "Admin",
            expiresAt: Date.now() + 8 * 60 * 60 * 1000,
            provider: data.user.app_metadata?.provider || "email",
          });
        } else {
          setError("Account created. Please confirm your email, then sign in.");
        }
        setLoading(false);
        return;
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (error || !data?.user) {
          recordFailure(normalizedEmail);
          setError(oauthErrorMessage("Email", error || "Incorrect email or password."));
          setLoading(false);
          return;
        }
        clearAttempts(normalizedEmail);
        const sbName = await fetchNameFromSupabase(data.user.id);
        onAuth({
          id: data.user.id,
          name: sbName || data.user.user_metadata?.full_name || data.user.email,
          email: data.user.email,
          role: "Admin",
          expiresAt: Date.now() + 8 * 60 * 60 * 1000,
          provider: data.user.app_metadata?.provider || "email",
        });
        setLoading(false);
      }
    }, 600);
  };

  if (showForgot) {
    return (
      <ForgotPasswordPage
        onBackToLogin={() => {
          setShowForgot(false);
          setError("");
          setPassword("");
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface-sunken)] flex items-center justify-center p-4">
      {!supabaseReady && (
        <div className="fixed top-0 left-0 right-0 bg-[var(--warning-50)] border-b border-[var(--warning-100)] px-4 py-2 flex items-center gap-2 z-[999] text-xs text-[var(--warning-700)]">
          <Icons.Alert />
          <span>
            <strong>Supabase not configured</strong> — {supabaseConfigError || "cloud authentication is required. Set "}
            {!supabaseConfigError && <><code className="font-mono">VITE_SUPABASE_URL</code> and <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> in your environment.</>}
          </span>
        </div>
      )}

      <div className="w-full max-w-[440px]">
        {/* Logo + tagline */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-5">
            <InvoiceSagaLogo height={32} />
          </div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] leading-tight m-0">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-2 m-0">
            {mode === "login"
              ? "Sign in to continue to InvoiceSaga"
              : "Start invoicing in under 2 minutes"}
          </p>
        </div>

        <div className="bg-[var(--surface-card)] rounded-2xl shadow-[var(--shadow-lg)] p-8">
          {/* Tab switcher */}
          <div className="flex border-b border-[var(--border-subtle)] mb-5 -mx-1">
            {[["login", "Sign in"], ["register", "Create account"]].map(([m, l]) => {
              const active = mode === m;
              return (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(""); }}
                  className={[
                    "py-2.5 px-4 bg-transparent border-none cursor-pointer text-sm -mb-px transition-colors duration-150",
                    active
                      ? "text-[var(--text-primary)] font-semibold border-b-2 border-[var(--text-primary)]"
                      : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] border-b-2 border-transparent",
                  ].join(" ")}
                >
                  {l}
                </button>
              );
            })}
          </div>

          {/* Google OAuth */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full h-11 flex items-center justify-center gap-2.5 bg-white text-[var(--text-primary)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm font-medium cursor-pointer hover:bg-[var(--surface-sunken)] disabled:cursor-not-allowed disabled:opacity-60 transition-colors duration-150 mb-4"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.14 0 5.95 1.08 8.17 2.85l6.1-6.1C34.46 3.01 29.5 1 24 1 14.82 1 7.03 6.49 3.6 14.24l7.1 5.52C12.4 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#FBBC05" d="M46.52 24.5c0-1.64-.15-3.22-.42-4.74H24v8.97h12.67c-.55 2.94-2.2 5.43-4.67 7.1l7.1 5.52C43.13 37.5 46.52 31.44 46.52 24.5z"/>
              <path fill="#34A853" d="M10.7 28.24A14.48 14.48 0 0 1 9.5 24c0-1.48.25-2.9.7-4.24l-7.1-5.52A23.94 23.94 0 0 0 0 24c0 3.87.93 7.53 2.58 10.76l7.12-6.52z" transform="translate(1)"/>
              <path fill="#4285F4" d="M24 47c5.5 0 10.12-1.82 13.5-4.96l-7.1-5.52C28.54 37.9 26.37 38.5 24 38.5c-6.26 0-11.6-4.22-13.3-9.96l-7.12 5.52C7.03 41.51 14.82 47 24 47z"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-[var(--border-subtle)]" />
            <span className="text-xs text-[var(--text-tertiary)] whitespace-nowrap">or continue with email</span>
            <div className="flex-1 h-px bg-[var(--border-subtle)]" />
          </div>

          {/* Form fields */}
          <div className="space-y-3">
            {mode === "register" && (
              <Field label="Full name" required>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] flex pointer-events-none">
                    <Icons.User />
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className={inputWithIconCls}
                  />
                </div>
              </Field>
            )}

            <Field label="Email address" required>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] flex pointer-events-none">
                  <Icons.Send />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputWithIconCls}
                />
              </div>
            </Field>

            <Field label="Password" required>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                  placeholder={mode === "register" ? "Min. 8 characters" : "Enter your password"}
                  className={`${inputCls} pr-11`}
                />
                <button
                  onClick={() => setShowPw(p => !p)}
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] p-1.5 flex"
                  title={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <Icons.EyeSlash /> : <Icons.Eye />}
                </button>
              </div>
            </Field>

            {mode === "register" && (
              <Field label="Confirm password" required>
                <input
                  type={showPw ? "text" : "password"}
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                  placeholder="Repeat password"
                  className={[
                    "w-full h-11 px-3 border rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-white outline-none transition-colors duration-150 box-border",
                    confirmPw && confirmPw !== password
                      ? "border-[var(--danger-600)] focus:shadow-[var(--focus-ring)]"
                      : "border-[var(--border-default)] focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)]",
                  ].join(" ")}
                />
              </Field>
            )}
          </div>

          {error && (
            <div className="mt-3 bg-[var(--danger-50)] border border-[var(--danger-100)] rounded-[var(--radius-md)] px-3 py-2 flex items-center gap-2">
              <span className="text-[var(--danger-600)] flex"><Icons.Info /></span>
              <span className="text-xs text-[var(--danger-700)] font-medium">{error}</span>
            </div>
          )}

          {mode === "register" && (
            <div className="mt-3 bg-[var(--surface-sunken)] rounded-[var(--radius-md)] px-3 py-2.5">
              <div className="text-[11px] text-[var(--text-secondary)] font-semibold mb-1">Password requirements</div>
              {[
                ["At least 8 characters", password.length >= 8],
                ["Passwords match", password === confirmPw && confirmPw.length > 0],
              ].map(([t, ok]) => (
                <div
                  key={t}
                  className={[
                    "flex items-center gap-1.5 text-[11px]",
                    ok ? "text-[var(--success-700)]" : "text-[var(--text-tertiary)]",
                  ].join(" ")}
                >
                  <span className={`flex items-center justify-center w-3.5 h-3.5 rounded-full ${ok ? "bg-[var(--success-600)] text-white" : "border border-[var(--border-default)]"}`}>
                    {ok && <Icons.Check />}
                  </span>
                  {t}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full h-11 mt-4 bg-[var(--text-primary)] hover:bg-[var(--surface-dark-2)] disabled:bg-[var(--surface-sunken)] disabled:text-[var(--text-tertiary)] disabled:cursor-not-allowed text-white border-none rounded-[var(--radius-md)] text-sm font-semibold cursor-pointer transition-colors duration-150"
          >
            {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>

          {mode === "login" && (
            <div className="text-center mt-4 flex flex-col gap-2">
              <div>
                <span className="text-sm text-[var(--text-tertiary)]">Don't have an account? </span>
                <button
                  onClick={() => { setMode("register"); setError(""); }}
                  className="text-sm text-[var(--brand-600)] hover:text-[var(--brand-700)] font-semibold bg-transparent border-none cursor-pointer"
                >
                  Create one free
                </button>
              </div>
              <button
                onClick={() => setShowForgot(true)}
                className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] bg-transparent border-none cursor-pointer"
              >
                Forgot your password?
              </button>
            </div>
          )}
        </div>

        <div className="text-center mt-6 text-xs text-[var(--text-tertiary)]">
          Your data stays private · InvoiceSaga
        </div>
      </div>
    </div>
  );
}
