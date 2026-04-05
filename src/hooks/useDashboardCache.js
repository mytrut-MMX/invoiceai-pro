import { useMemo } from "react";

// Module-level cache — survives component unmount/remount
let _cache = { hash: "", data: null, ts: 0 };
const CACHE_TTL = 60_000; // 60 seconds

/**
 * Caches expensive dashboard calculations.
 * Recomputes only when inputs change or TTL expires.
 *
 * @param {Function} computeFn - function that returns the computed data
 * @param {Array} deps - dependency values (used to build cache key)
 * @returns {any} - cached or freshly computed result
 */
export function useDashboardCache(computeFn, deps) {
  const hash = useMemo(() => {
    return deps.map(d => {
      if (Array.isArray(d)) return `a${d.length}`;
      if (d && typeof d === "object") return `o${Object.keys(d).length}`;
      return String(d);
    }).join("|");
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return useMemo(() => {
    const now = Date.now();

    // Return cached if hash matches and within TTL
    if (_cache.hash === hash && _cache.data !== null && (now - _cache.ts) < CACHE_TTL) {
      return _cache.data;
    }

    // Recompute
    const result = computeFn();
    _cache = { hash, data: result, ts: now };
    return result;
  }, [hash]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Force cache invalidation (call after any financial event) */
export function invalidateDashboardCache() {
  _cache = { hash: "", data: null, ts: 0 };
}
