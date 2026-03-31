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
