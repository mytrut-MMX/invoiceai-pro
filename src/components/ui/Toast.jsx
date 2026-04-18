import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { Icons } from "../icons";

const MAX_VISIBLE = 3;
const DEFAULT_DURATION = 4000;

const ToastContext = createContext(null);

const VARIANT_CLS = {
  success: "border-l-[var(--success-600)]",
  danger:  "border-l-[var(--danger-600)]",
  warning: "border-l-[var(--warning-600)]",
  info:    "border-l-[var(--info-600)]",
};

const VARIANT_ICON_CLS = {
  success: "text-[var(--success-600)]",
  danger:  "text-[var(--danger-600)]",
  warning: "text-[var(--warning-600)]",
  info:    "text-[var(--info-600)]",
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timeoutsRef = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = timeoutsRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timeoutsRef.current.delete(id);
    }
  }, []);

  const toast = useCallback((opts) => {
    const id = (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()
      : `t_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const next = {
      id,
      title: opts.title || "",
      description: opts.description || "",
      variant: opts.variant || "info",
      duration: typeof opts.duration === "number" ? opts.duration : DEFAULT_DURATION,
    };
    setToasts(prev => {
      const merged = [...prev, next];
      // Cap at MAX_VISIBLE — drop oldest first
      if (merged.length > MAX_VISIBLE) {
        const dropped = merged.slice(0, merged.length - MAX_VISIBLE);
        for (const d of dropped) {
          const t = timeoutsRef.current.get(d.id);
          if (t) { clearTimeout(t); timeoutsRef.current.delete(d.id); }
        }
        return merged.slice(-MAX_VISIBLE);
      }
      return merged;
    });
    if (next.duration > 0) {
      const handle = setTimeout(() => dismiss(id), next.duration);
      timeoutsRef.current.set(id, handle);
    }
    return id;
  }, [dismiss]);

  // Clear all timers on unmount
  useEffect(() => {
    return () => {
      for (const handle of timeoutsRef.current.values()) clearTimeout(handle);
      timeoutsRef.current.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // No-op safe fallback so consumers don't crash if ToastProvider isn't mounted
    return { toast: () => "", dismiss: () => {} };
  }
  return ctx;
}

function ToastViewport({ toasts, onDismiss }) {
  return (
    <div className="fixed top-4 right-4 z-[5000] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger enter animation on next tick
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const accent = VARIANT_CLS[toast.variant] || VARIANT_CLS.info;
  const iconCls = VARIANT_ICON_CLS[toast.variant] || VARIANT_ICON_CLS.info;

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        "pointer-events-auto relative bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] p-4 pr-10 min-w-[320px] max-w-[420px] border-l-4 transition-all duration-200 ease-out",
        accent,
        mounted ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0",
      ].join(" ")}
    >
      <div className="flex items-start gap-2.5">
        <span className={`flex flex-shrink-0 mt-0.5 ${iconCls}`}>
          <Icons.Info />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-[var(--text-primary)]">{toast.title}</div>
          {toast.description && (
            <div className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{toast.description}</div>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="absolute top-2 right-2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] bg-transparent border-none cursor-pointer p-1 rounded transition-colors duration-150"
        aria-label="Dismiss"
      >
        <Icons.X />
      </button>
    </div>
  );
}
