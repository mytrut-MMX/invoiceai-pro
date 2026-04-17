function pageBtnClass(active, disabled) {
  const base = "h-8 min-w-8 px-2.5 text-xs rounded-[var(--radius-md)] border transition-colors duration-150 cursor-pointer";
  const state = active
    ? "bg-[var(--brand-600)] text-white border-[var(--brand-600)] font-semibold"
    : "bg-white text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--surface-sunken)]";
  const d = disabled ? " opacity-40 cursor-not-allowed hover:bg-white" : "";
  return `${base} ${state}${d}`;
}

export default function Pagination({ page, totalPages, onPageChange, totalItems, pageSize }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm text-[var(--text-tertiary)]">
        Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, totalItems)} of {totalItems}
      </span>
      <div className="flex gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={pageBtnClass(false, page <= 1)}
        >
          ← Prev
        </button>
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
          let p;
          if (totalPages <= 7) p = i + 1;
          else if (page <= 4) p = i + 1;
          else if (page >= totalPages - 3) p = totalPages - 6 + i;
          else p = page - 3 + i;
          return (
            <button key={p} onClick={() => onPageChange(p)} className={pageBtnClass(p === page, false)}>
              {p}
            </button>
          );
        })}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className={pageBtnClass(false, page >= totalPages)}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
