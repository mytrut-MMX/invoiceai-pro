import { useEffect, useRef } from "react";

export function useModalA11y(open, onClose) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    // ESC to close
    const onKey = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
    };
    document.addEventListener("keydown", onKey);

    // Focus trap
    const el = overlayRef.current;
    if (!el) return () => document.removeEventListener("keydown", onKey);

    const focusable = el.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const trapFocus = (e) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    el.addEventListener("keydown", trapFocus);
    first?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      el.removeEventListener("keydown", trapFocus);
    };
  }, [open, onClose]);

  return overlayRef;
}