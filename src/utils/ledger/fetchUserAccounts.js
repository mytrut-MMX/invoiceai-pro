import { supabase, supabaseReady } from '../../lib/supabase.js';

// Module-level cache — shared across all callers for the lifetime of the page session.
// Invalidated when the userId changes (e.g. different logged-in user) or TTL expires.
let _cache = { accounts: null, userId: null, ts: 0 };
const TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetches the current user's chart of accounts from Supabase.
 * RLS on the `accounts` table ensures only the authenticated user's rows
 * are returned — no manual user_id filter is needed.
 *
 * @returns {Promise<{ accounts: Array, userId: string|null }>}
 *   `accounts` is the full accounts array (empty if Supabase is unavailable).
 *   `userId` is the Supabase auth UUID, or null if not authenticated.
 */
export async function fetchUserAccounts() {
  if (!supabaseReady) return { accounts: [], userId: null };

  // Resolve the current auth user's UUID (needed for cache keying and for
  // storing user_id in journal entries so RLS policies match auth.uid()).
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id ?? null;
  if (!userId) return { accounts: [], userId: null };

  const now = Date.now();

  // Return cached data if it's fresh and belongs to the same user.
  if (
    _cache.accounts &&
    _cache.userId === userId &&
    now - _cache.ts < TTL_MS
  ) {
    return { accounts: _cache.accounts, userId };
  }

  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('code');

  if (error || !data) {
    // Serve stale cache rather than failing silently with an empty array.
    if (_cache.accounts && _cache.userId === userId) {
      return { accounts: _cache.accounts, userId };
    }
    return { accounts: [], userId };
  }

  _cache = { accounts: data, userId, ts: now };
  return { accounts: data, userId };
}

/** Clears the accounts cache (call after seedAccountsForUser or account changes). */
export function invalidateAccountsCache() {
  _cache = { accounts: null, userId: null, ts: 0 };
}
