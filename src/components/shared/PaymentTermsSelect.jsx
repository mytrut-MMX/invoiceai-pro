import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Icons } from "../icons";
import { Input } from "../atoms";
import { listPaymentTerms } from "../../lib/paymentTerms";
import { ROUTES } from "../../router/routes";

export function PaymentTermsSelect({ value, onChange }) {
  const [terms, setTerms] = useState([]);
  const [open, setOpen] = useState(false);
  const [customDays, setCustomDays] = useState(
    value?.type === "custom" ? String(value.days ?? "") : ""
  );
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    listPaymentTerms().then(({ data }) => setTerms(data || []));
  }, []);

  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleSelect = (term) => {
    setOpen(false);
    const days = term.type === "custom" ? customDays : null;
    onChange(term, days);
  };

  const handleCustomDaysChange = (days) => {
    setCustomDays(days);
    if (value?.type === "custom") onChange(value, days);
  };

  const label = value ? value.name : "Select payment terms…";
  const isCustomActive = value?.type === "custom";

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={[
            "flex-1 min-w-0 h-9 pl-3 pr-8 border rounded-[var(--radius-md)] text-sm text-left relative outline-none transition-colors duration-150 bg-white",
            "focus:shadow-[var(--focus-ring)]",
            open
              ? "border-[var(--brand-600)]"
              : "border-[var(--border-default)]",
            value
              ? "text-[var(--text-primary)]"
              : "text-[var(--text-tertiary)]",
          ].join(" ")}
        >
          <span className="block truncate">{label}</span>
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none">
            <Icons.ChevDown />
          </span>
        </button>

        {isCustomActive && (
          <div className="flex items-center gap-1.5 shrink-0">
            <Input
              type="number"
              value={customDays}
              onChange={handleCustomDaysChange}
              placeholder="days"
              style={{ width: 80 }}
            />
            <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
              days
            </span>
          </div>
        )}
      </div>

      {open && (
        <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-[2000] bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-popover)] overflow-hidden">
          <div className="max-h-60 overflow-y-auto">
            {terms.map((term) => (
              <button
                key={term.id}
                type="button"
                onClick={() => handleSelect(term)}
                className={[
                  "w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2",
                  "bg-transparent border-none cursor-pointer transition-colors duration-150",
                  "hover:bg-[var(--surface-sunken)]",
                  value?.id === term.id
                    ? "text-[var(--brand-700)] font-medium"
                    : "text-[var(--text-primary)]",
                ].join(" ")}
              >
                <span>{term.name}</span>
                {term.is_system && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 bg-[var(--neutral-50)] text-[var(--text-tertiary)] rounded-[var(--radius-sm)] border border-[var(--border-subtle)] shrink-0">
                    System
                  </span>
                )}
              </button>
            ))}
            {terms.length === 0 && (
              <div className="px-3 py-2 text-sm text-[var(--text-tertiary)]">
                No payment terms available
              </div>
            )}
          </div>
          <div className="border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate(`${ROUTES.SETTINGS}?tab=payment-terms`);
              }}
              className="w-full text-left px-3 py-2 text-sm text-[var(--brand-600)] hover:bg-[var(--brand-50)] bg-transparent border-none cursor-pointer transition-colors duration-150 font-medium"
            >
              + Configure Terms
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
