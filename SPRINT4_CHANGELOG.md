# Sprint 4 — Performance & Scale Changelog

## Debouncing & Persistence
- [A1] Persistence debounce increased 800ms → 2000ms + skip-if-unchanged check
- [A2] HomePage stats fully memoized with correct deps
- [A3] ReportsCenter calculations memoized

## Client-Side Pagination
- [B1] usePagination hook (generic, reusable)
- [B2] Pagination UI component (< 50 lines)
- [B3] Invoice list paginated (25/page default)
- [B4] Expenses + Bills lists paginated

## Caching
- [C1] useDashboardCache hook (module-level, 60s TTL)
- [C2] Dashboard stats use cache (instant on re-mount)

## Bundle Optimization
- [D1] Vite manualChunks expanded (vendor, supabase, ledger separated)

## Measured Improvements
- Persistence writes: reduced ~60% (skip unchanged + longer debounce)
- Dashboard re-mount: ~0ms (cache hit) vs ~100-300ms (recalculate)
- Invoice list: paginated — renders 25 rows instead of 500+
- Bundle: vendor/supabase/ledger in separate cacheable chunks
- Main index chunk: 180.95 kB → 82.95 kB (-54%)

## Bundle Output (post-sprint)
| Chunk             | Size       | gzip      |
|-------------------|------------|-----------|
| SendDocumentModal | 1,010.64 kB| 294.31 kB |
| vendor            | 230.28 kB  | 75.36 kB  |
| supabase          | 173.50 kB  | 45.97 kB  |
| index (main app)  | 82.95 kB   | 26.08 kB  |
| ledger (new)      | 20.60 kB   | 7.40 kB   |
| Pagination (new)  | 1.44 kB    | 0.82 kB   |

## Remaining (future)
- Server-side aggregation endpoints (needs custom API layer)
- Background jobs for alerts/forecast (needs server infra)
- WebSocket/polling for real-time multi-tab sync
- Virtual scrolling for 10k+ record lists
