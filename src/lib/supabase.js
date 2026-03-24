import { createClient } from "@supabase/supabase-js";

// Fallback to project values when env vars are not set in Vercel.
// The anon key is a public client-side credential — safe to ship in JS bundle.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://oecvlkllkpyfpgczqwii.supabase.co";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lY3Zsa2xsa3B5ZnBnY3pxd2lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTU3NDYsImV4cCI6MjA4ODQ5MTc0Nn0.U1xmtE1D5Izd8exA33cldR-9-5YpHwKX6wZVV0HFqIg";

const isConfigured =
  typeof SUPABASE_URL === "string" &&
  SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_URL.includes("YOUR_PROJECT") &&
  typeof SUPABASE_ANON_KEY === "string" &&
  SUPABASE_ANON_KEY.length > 20 &&
  !SUPABASE_ANON_KEY.includes("YOUR_ANON");

export const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

/** true when env vars are set and non-placeholder */
export const supabaseReady = isConfigured;
