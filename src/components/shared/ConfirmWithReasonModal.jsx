import { useState, useEffect } from "react";
import { Field, Textarea, Btn } from "../atoms";
import { useModalA11y } from "../../hooks/useModalA11y";

export default function ConfirmWithReasonModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  minLength = 10,
  confirmLabel = "Confirm",
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) { setReason(""); setSubmitting(false); }
  }, [open]);

  const overlayRef = useModalA11y(open, onClose);

  if (!open) return null;

  const trimmed = reason.trim();
  const valid = trimmed.length >= minLength;

  const handleConfirm = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm(trimmed);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] shadow-xl w-full max-w-[440px]">
        <div className="border-b border-[var(--border-subtle)] px-[21px] py-3 flex items-center justify-between">
          <span className="text-lg font-semibold">{title}</span>
          <Btn variant="ghost" onClick={onClose} disabled={submitting}>Close</Btn>
        </div>
        <div className="p-[21px] space-y-4">
          {description && (
            <p className="text-sm text-[var(--text-secondary)]">{description}</p>
          )}
          <Field label="Reason" required>
            <Textarea
              value={reason}
              onChange={setReason}
              rows={4}
              placeholder={`At least ${minLength} characters`}
            />
            <div className={`mt-1 text-[11px] ${valid ? "text-[var(--text-tertiary)]" : "text-[var(--warning-700)]"}`}>
              {trimmed.length}/{minLength}
            </div>
          </Field>
        </div>
        <div className="border-t border-[var(--border-subtle)] px-[21px] py-3 flex justify-end gap-2">
          <Btn variant="outline" onClick={onClose} disabled={submitting}>Cancel</Btn>
          <Btn variant="primary" onClick={handleConfirm} disabled={!valid || submitting}>
            {submitting ? "Working…" : confirmLabel}
          </Btn>
        </div>
      </div>
    </div>
  );
}