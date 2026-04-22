// BillModeSelector — segmented control to switch between a standard supplier
// bill and a buyer-issued self-billed invoice. Self-bill mode is only
// available when at least one supplier has an active 'issued' Self-Billing
// Agreement (set up from the Supplier → Self-Billing tab). When none exists,
// the segment is disabled and a tooltip explains how to enable it.

export const BILL_MODES = Object.freeze({ STANDARD: "standard", SELFBILL: "selfbill" });

const MODES = [
  { id: BILL_MODES.STANDARD, label: "Standard Bill",       sub: "Supplier-issued invoice" },
  { id: BILL_MODES.SELFBILL, label: "Self-Billed Invoice", sub: "Buyer-issued on behalf of supplier" },
];

export default function BillModeSelector({ mode, onChange, hasActiveIssuedSba }) {
  return (
    <div className="mb-5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
        Invoice mode
      </div>
      <div
        role="tablist"
        aria-label="Invoice mode"
        className="inline-flex items-stretch rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-1 gap-1 shadow-[var(--shadow-sm)]"
      >
        {MODES.map((m) => {
          const active = mode === m.id;
          const disabled = m.id === BILL_MODES.SELFBILL && !hasActiveIssuedSba;
          const tooltip = disabled
            ? "No suppliers with active self-billing agreements. Set one up from Supplier → Self-Billing tab."
            : undefined;
          const base = "flex flex-col items-start text-left px-4 py-2 rounded-[var(--radius-md)] cursor-pointer transition-colors duration-150 border-none bg-transparent";
          const activeCls = active && !disabled
            ? "bg-[var(--brand-600)] text-white shadow-[var(--shadow-sm)]"
            : "text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]";
          const disabledCls = disabled ? "opacity-50 cursor-not-allowed hover:bg-transparent" : "";
          return (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-disabled={disabled}
              disabled={disabled}
              title={tooltip}
              onClick={() => !disabled && onChange(m.id)}
              className={`${base} ${activeCls} ${disabledCls}`}
            >
              <span className="text-sm font-semibold leading-tight">{m.label}</span>
              <span className={`text-[11px] leading-tight mt-0.5 ${active && !disabled ? "text-white/80" : "text-[var(--text-tertiary)]"}`}>
                {m.sub}
              </span>
            </button>
          );
        })}
      </div>
      {!hasActiveIssuedSba && mode === BILL_MODES.STANDARD && (
        <div className="mt-2 text-[11px] text-[var(--text-tertiary)]">
          Self-billed invoices require an active agreement with the supplier. Open a supplier → Self-Billing tab to create one.
        </div>
      )}
    </div>
  );
}
