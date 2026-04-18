import { createClient } from "@supabase/supabase-js";

// Hardcoded anon key (role: "anon") — safe public credential for the JS bundle.
// If VITE_SUPABASE_ANON_KEY is set in Vercel, it takes precedence; if it
// accidentally contains a service_role key the guard below catches it and
// falls back to this safe value so the app keeps working without exposing secrets.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://oecvlkllkpyfpgczqwii.supabase.co";

const ANON_KEY_FALLBACK =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lY3Zsa2xsa3B5ZnBnY3pxd2lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTU3NDYsImV4cCI6MjA4ODQ5MTc0Nn0.U1xmtE1D5Izd8exA33cldR-9-5YpHwKX6wZVV0HFqIg";

function resolveAnonKey() {
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!envKey) return ANON_KEY_FALLBACK;
  // Guard: reject service_role keys that were accidentally set as the anon key
  try {
    const payload = JSON.parse(atob(envKey.split(".")[1]));
    if (payload?.role === "service_role") {
      console.error(
        "[supabase] ⚠️ VITE_SUPABASE_ANON_KEY contains a service_role key — " +
        "do not expose this in browser code. Fix in Vercel → Settings → Environment Variables. " +
        "Falling back to bundled anon key."
      );
      return ANON_KEY_FALLBACK;
    }
  } catch {
    // Malformed JWT — fall through to use as-is and let createClient validate it
  }
  return envKey;
}

const SUPABASE_ANON_KEY = resolveAnonKey();
const decodeJwtPayload = (jwt) => {
  if (typeof jwt !== "string") return null;
  const parts = jwt.split(".");
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const normalized = `${b64}${"=".repeat((4 - (b64.length % 4)) % 4)}`;
    return JSON.parse(atob(normalized));
  } catch {
    return null;
  }
};

const looksLikeSecretKey = (key) => {
  if (typeof key !== "string") return false;
  if (key.startsWith("sb_secret_")) return true; // Supabase secret key format
  const payload = decodeJwtPayload(key);
  if (payload?.role === "service_role") return true;
  return false;
};

export const supabaseConfigError = looksLikeSecretKey(SUPABASE_ANON_KEY)
  ? "Invalid Supabase client key: do not expose secret/service_role keys in browser code. Use VITE_SUPABASE_ANON_KEY."
  : "";

const isConfigured =
  typeof SUPABASE_URL === "string" &&
  SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_URL.includes("YOUR_PROJECT") &&
  typeof SUPABASE_ANON_KEY === "string" &&
  SUPABASE_ANON_KEY.length > 20 &&
  !SUPABASE_ANON_KEY.includes("YOUR_ANON") &&
  !looksLikeSecretKey(SUPABASE_ANON_KEY);

export const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

/** true when env vars are set and non-placeholder */
export const supabaseReady = isConfigured;

// ─── Auth helpers ──────────────────────────────────────────────────────────

export async function signInWithGoogle() {
  if (!supabase) return { error: 'Supabase not configured' };
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  });
}

export async function signInWithGitHub() {
  if (!supabase) return { error: 'Supabase not configured' };
  return supabase.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
}

export async function signOut() {
  if (!supabase) return;
  return supabase.auth.signOut();
}

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session ?? null;
}

// ─── MFA: email OTP as a second factor ─────────────────────────────────────
//
// The MFA preference is stored in `profiles.mfa_email_enabled` (boolean) and
// mirrored in localStorage as a fast-path check for the login screen:
//   ai_invoice_mfa_email_<lowercased-email>  →  "1" | absent
//
// The localStorage mirror is per-device and best-effort. The Supabase column
// is the source of truth; if the column doesn't exist yet, getMfaPreference
// falls back to localStorage so the feature degrades gracefully on databases
// that haven't been migrated.

const MFA_LS_PREFIX = "ai_invoice_mfa_email_";
const MFA_PENDING_KEY = "ai_invoice_mfa_pending";

const mfaLsKey = (email) => `${MFA_LS_PREFIX}${(email || "").trim().toLowerCase()}`;

/** While true, App.jsx's auth listener must not promote the user past the
 *  MFA gate. AuthPage sets this around the password→OTP transition. */
export function setMfaPending(on) {
  try {
    if (on) sessionStorage.setItem(MFA_PENDING_KEY, "1");
    else    sessionStorage.removeItem(MFA_PENDING_KEY);
  } catch {}
}

export function isMfaPending() {
  try { return sessionStorage.getItem(MFA_PENDING_KEY) === "1"; } catch { return false; }
}

/** Read MFA preference for an email — Supabase first, localStorage fallback. */
export async function getMfaPreference({ userId, email }) {
  const key = mfaLsKey(email);
  let lsValue = null;
  try { lsValue = localStorage.getItem(key) === "1"; } catch {}

  if (!supabase || !userId) return !!lsValue;

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("mfa_email_enabled")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return !!lsValue;
    const enabled = !!data?.mfa_email_enabled;
    try {
      if (enabled) localStorage.setItem(key, "1");
      else         localStorage.removeItem(key);
    } catch {}
    return enabled;
  } catch {
    return !!lsValue;
  }
}

/** Persist MFA preference: Supabase + localStorage mirror. */
export async function setMfaPreference({ userId, email, enabled }) {
  const key = mfaLsKey(email);
  try {
    if (enabled) localStorage.setItem(key, "1");
    else         localStorage.removeItem(key);
  } catch {}

  if (!supabase || !userId) return { error: null };

  try {
    const { error } = await supabase
      .from("profiles")
      .upsert({ user_id: userId, email, mfa_email_enabled: !!enabled }, { onConflict: "user_id" });
    return { error: error || null };
  } catch (err) {
    return { error: err };
  }
}

/** Send a 6-digit email OTP. Used both at login (after password) and from Settings. */
export async function sendEmailOtp(email) {
  if (!supabase) return { error: { message: "Supabase not configured" } };
  return supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });
}

/** Verify an emailed 6-digit OTP. On success the client gets a fresh session. */
export async function verifyEmailOtp(email, token) {
  if (!supabase) return { error: { message: "Supabase not configured" } };
  return supabase.auth.verifyOtp({ email, token, type: "email" });
}
