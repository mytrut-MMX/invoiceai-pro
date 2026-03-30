import { createClient } from "@supabase/supabase-js";

// Fallback to project values when env vars are not set in Vercel.
// The anon key is a public client-side credential — safe to ship in JS bundle.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://oecvlkllkpyfpgczqwii.supabase.co";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lY3Zsa2xsa3B5ZnBnY3pxd2lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTU3NDYsImV4cCI6MjA4ODQ5MTc0Nn0.U1xmtE1D5Izd8exA33cldR-9-5YpHwKX6wZVV0HFqIg";

const looksLikeSecretKey = (key) => {
  if (typeof key !== "string") return true;
  if (key.startsWith("sb_secret_")) return true; // Supabase secret key format
  if (key.includes("service_role")) return true;
  const parts = key.split(".");
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(atob(parts[1]));
      if (payload?.role === "service_role") return true;
    } catch {
      // Ignore invalid JWT parsing; fall through to basic checks.
    }
  }
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
