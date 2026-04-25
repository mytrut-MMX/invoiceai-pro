import { useState, useEffect } from "react";
import { Field, Input, Btn } from "../atoms";
import { useModalA11y } from "../../hooks/useModalA11y";

export default function SignSbaModal({
  open,
  onClose,
  onSign,
  signing,
  defaultName = "",
  defaultRole = "Authorised signatory",
}) {
  const [name, setName] = useState(defaultName);
  const [role, setRole] = useState(defaultRole);

  useEffect(() => {
    if (open) { setName(defaultName); setRole(defaultRole); }
  }, [open, defaultName, defaultRole]);

  const overlayRef = useModalA11y(open, onClose);

  if (!open) return null;

  const trimmedName = name.trim();
  const nameValid = trimmedName.length >= 2 && trimmedName.length <= 200;
  const canSign = nameValid && !signing;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label="Sign Self-Billing Agreement"
    >
      <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] shadow-xl w-full max-w-[440px]">
        <div className="border-b border-[var(--border-subtle)] px-[21px] py-3 flex items-center justify-between">
          <span className="text-lg font-semibold">Sign agreement</span>
          <Btn variant="ghost" onClick={onClose} disabled={signing}>Close</Btn>
        </div>
        <div className="p-[21px] space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Enter the name and role of the person signing on behalf of the self-billing
            party. This will appear on the agreement document.
          </p>
          <Field label="Full name" required>
            <Input value={name} onChange={setName} maxLength={200} placeholder="e.g. John Smith" />
          </Field>
          <Field label="Role / title">
            <Input value={role} onChange={setRole} maxLength={100} placeholder="e.g. Director, Finance Manager" />
          </Field>
        </div>
        <div className="border-t border-[var(--border-subtle)] px-[21px] py-3 flex justify-end gap-2">
          <Btn variant="outline" onClick={onClose} disabled={signing}>Cancel</Btn>
          <Btn
            variant="primary"
            onClick={() => onSign({ name: trimmedName, role: role.trim() })}
            disabled={!canSign}
          >
            {signing ? "Signing…" : "Sign & send to supplier"}
          </Btn>
        </div>
      </div>
    </div>
  );
}
