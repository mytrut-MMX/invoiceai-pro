import { useState, useEffect, useRef } from "react";
import { Field, Btn } from "../atoms";
import { useToast } from "../ui/Toast";
import { useModalA11y } from "../../hooks/useModalA11y";

const dateInputCls =
  "w-full h-9 px-3 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-white outline-none focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)] transition-colors duration-150 box-border";

export default function ShareLinkModal({ open, onClose, docType, docNumber, defaultExpiry }) {
  const { toast } = useToast();
  const [mode, setMode] = useState("public");
  const [expiresOn, setExpiresOn] = useState(defaultExpiry || "");
  const [shareUrl, setShareUrl] = useState("");

  const prevOpen = useRef(false);
  useEffect(() => {
    if (open && !prevOpen.current) {
      setMode("public");
      setExpiresOn(defaultExpiry || "");
      setShareUrl("");
    }
    prevOpen.current = open;
  }, [open, defaultExpiry]);

  const overlayRef = useModalA11y(open, onClose);

  if (!open) return null;

  const generate = () => {
    if (!expiresOn) return;
    // AUTH-005: Use full UUID (122 bits entropy) instead of truncated 8-char segment.
    const token = crypto.randomUUID();
    const basePath = mode === "public" ? "public" : "secure";
    // AUTH-006: Client-side expiry check — not tamper-proof.
    // TODO: Move share link validation to a server-side API endpoint
    // that verifies token + expiry from database before returning document.
    const url = `${window.location.origin}/${basePath}/${docType}/${docNumber}?token=${token}&expires=${expiresOn}`;
    setShareUrl(url);
  };

  const copy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "Link copied", variant: "success" });
    } catch (err) {
      toast({ title: "Could not copy", description: err?.message, variant: "error" });
    }
  };

  const ModeBtn = ({ value, label }) => {
    const active = mode === value;
    return (
      <button
        type="button"
        onClick={() => { setMode(value); setShareUrl(""); }}
        className={[
          "flex-1 h-9 px-3 text-sm font-semibold rounded-[var(--radius-md)] border transition-colors duration-150 cursor-pointer",
          active
            ? "bg-[var(--text-primary)] text-white border-[var(--text-primary)]"
            : "bg-white text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--surface-sunken)]",
        ].join(" ")}
      >
        {label}
      </button>
    );
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label="Share link"
    >
      <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] shadow-xl w-full max-w-[480px]">
        <div className="border-b border-[var(--border-subtle)] px-[21px] py-3 flex items-center justify-between">
          <span className="text-lg font-semibold">Share link</span>
          <Btn variant="ghost" onClick={onClose}>Close</Btn>
        </div>
        <div className="p-[21px] space-y-4">
          <Field label="Visibility">
            <div className="flex gap-2">
              <ModeBtn value="public" label="Public" />
              <ModeBtn value="private" label="Private & Secure" />
            </div>
          </Field>
          <Field label="Expires on" required>
            <input
              type="date"
              value={expiresOn}
              onChange={(e) => { setExpiresOn(e.target.value); setShareUrl(""); }}
              className={dateInputCls}
            />
          </Field>
          {mode === "private" && (
            <p className="text-xs text-[var(--text-secondary)]">
              Customer will use one-time passcode.
            </p>
          )}
          {shareUrl && (
            <Field label="Link">
              <div className="flex gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.target.select()}
                  className="flex-1 h-9 px-3 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-[var(--surface-sunken)] outline-none box-border"
                />
                <Btn variant="outline" onClick={copy}>Copy</Btn>
              </div>
            </Field>
          )}
        </div>
        <div className="border-t border-[var(--border-subtle)] px-[21px] py-3 flex justify-end gap-2">
          <Btn variant="outline" onClick={onClose}>Done</Btn>
          <Btn variant="primary" onClick={generate} disabled={!expiresOn}>
            {shareUrl ? "Regenerate" : "Generate"}
          </Btn>
        </div>
      </div>
    </div>
  );
}