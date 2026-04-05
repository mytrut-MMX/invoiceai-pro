import { useState, useMemo } from "react";

/**
 * Client-side pagination hook.
 * @param {Array} items - full list
 * @param {number} [initialPageSize=25] - items per page
 * @returns {{ page, setPage, pageSize, setPageSize, totalPages, paginatedItems, hasNext, hasPrev, totalItems }}
 */
export function usePagination(items, initialPageSize = 25) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Reset to page 1 when items change significantly
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  return {
    page: safePage,
    setPage: (p) => setPage(Math.max(1, Math.min(p, totalPages))),
    pageSize,
    setPageSize: (s) => { setPageSize(s); setPage(1); },
    totalPages,
    paginatedItems,
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1,
    totalItems: items.length,
  };
}
