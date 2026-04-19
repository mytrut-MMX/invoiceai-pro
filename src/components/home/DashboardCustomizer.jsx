import { useEffect } from "react";
import { Icons } from "../icons";
import { ToggleSwitch } from "../atoms";
import { DASHBOARD_WIDGETS } from "../../utils/dashboard/widgetRegistry";
import { useDashboardLayout } from "../../hooks/useDashboardLayout";

const WIDGET_META = Object.fromEntries(DASHBOARD_WIDGETS.map(w => [w.id, w]));

export default function DashboardCustomizer({ onClose }) {
  const { layout, toggleWidget, moveWidget, resetLayout } = useDashboardLayout();

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[3000]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside
        role="dialog"
        aria-label="Customize dashboard"
        className="absolute right-0 top-0 h-full w-full sm:w-[380px] bg-white shadow-[var(--shadow-popover)] flex flex-col"
      >
        <header className="flex items-center justify-between px-[21px] py-[13px] border-b border-[var(--border-subtle)]">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Customize dashboard</h2>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Show, hide, and reorder widgets</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-tertiary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]"
          >
            <Icons.X />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-[13px] py-[13px]">
          <ul className="flex flex-col gap-2">
            {layout.map((entry, idx) => {
              const meta = WIDGET_META[entry.id];
              if (!meta) return null;
              const canMoveUp = idx > 0;
              const canMoveDown = idx < layout.length - 1;
              return (
                <li
                  key={entry.id}
                  className="flex items-center gap-2 px-[10px] py-[8px] rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-card)]"
                >
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => moveWidget(entry.id, "up")}
                      disabled={!canMoveUp}
                      aria-label={`Move ${meta.label} up`}
                      className="w-6 h-5 flex items-center justify-center rounded-sm text-[var(--text-tertiary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    >
                      <span className="rotate-180 flex"><Icons.ChevDown /></span>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveWidget(entry.id, "down")}
                      disabled={!canMoveDown}
                      aria-label={`Move ${meta.label} down`}
                      className="w-6 h-5 flex items-center justify-center rounded-sm text-[var(--text-tertiary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    >
                      <Icons.ChevDown />
                    </button>
                  </div>
                  <span className="flex-1 text-sm text-[var(--text-primary)]">{meta.label}</span>
                  <ToggleSwitch
                    checked={entry.visible}
                    onChange={() => toggleWidget(entry.id)}
                  />
                </li>
              );
            })}
          </ul>
        </div>

        <footer className="px-[21px] py-[13px] border-t border-[var(--border-subtle)] flex items-center justify-between">
          <button
            type="button"
            onClick={resetLayout}
            className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-2"
          >
            Reset to default
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-[var(--radius-md)] bg-[var(--brand-600)] text-white text-sm font-medium hover:bg-[var(--brand-700)]"
          >
            Done
          </button>
        </footer>
      </aside>
    </div>
  );
}
