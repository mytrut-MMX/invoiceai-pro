// SelfBillHistoryTab — audit timeline of emission_log rows for a self-billed
// invoice. Read-only list of downloads/emails/resends with signed-URL PDF
// access and a "Resend" shortcut that opens SendSelfBillModal. Reusable:
// today it's mounted as a third tab in BillFormPanel gated on b.is_self_billed;
// a future SelfBillViewPanel (Phase 4.2) will reuse the same component.

import { useState, useEffect, useContext, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { SB_INVOICES_BUCKET } from "../../constants/selfBilling";
import { Icons } from "../icons";
import { Btn } from "../atoms";
import { AppCtx } from "../../context/AppContext";
import SendSelfBillModal from "./SendSelfBillModal";

const TYPE_META = {
  download: { label: "Downloaded",     icon: Icons.Download, tone: "text-[var(--text-secondary)]" },
  email:    { label: "Emailed",        icon: Icons.Send,     tone: "text-[var(--brand-700)]" },
  resent:   { label: "Resent email",   icon: Icons.Send,     tone: "text-[var(--warning-700)]" },
  received: { label: "Received import",icon: Icons.Receipt,  tone: "text-[var(--info-600)]" },
};

const RTF = typeof Intl !== "undefined" && Intl.RelativeTimeFormat
  ? new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" }) : null;

function relativeTime(iso) {
  if (!iso) return "";
  const d = new Date(iso); const now = new Date();
  const diffSec = Math.round((d - now) / 1000);
  const abs = Math.abs(diffSec);
  const pick = (n, unit) => (RTF ? RTF.format(Math.round(n), unit) : `${Math.round(n)} ${unit}`);
  if (abs < 60)       return pick(diffSec, "second");
  if (abs < 3600)     return pick(diffSec / 60, "minute");
  if (abs < 86400)    return pick(diffSec / 3600, "hour");
  if (abs < 604800)   return pick(diffSec / 86400, "day");
  if (abs < 2629800)  return pick(diffSec / 604800, "week");
  return pick(diffSec / 2629800, "month");
}

export default function SelfBillHistoryTab({ bill }) {
  const { suppliers = [] } = useContext(AppCtx);
  const supplier = suppliers.find((s) => s.id === bill?.supplier_id) || null;
  const [rows, setRows] = useState(null); // null = loading, [] = empty
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [showResendModal, setShowResendModal] = useState(false);

  const load = useCallback(async () => {
    if (!bill?.id) return;
    setError(null);
    const { data, error: err } = await supabase
      .from("self_billing_emission_log")
      .select("id,created_at,emission_type,email_sent_to,email_resend_id,pdf_storage_path,pdf_sha256,snapshot")
      .eq("bill_id", bill.id)
      .order("created_at", { ascending: false });
    if (err) { setError(err.message || "Could not load emission history"); setRows([]); return; }
    setRows(data || []);
  }, [bill?.id]);

  useEffect(() => { load(); }, [load]);

  const handleCopy = (id) => {
    if (!id) return;
    try { navigator.clipboard?.writeText(id); } catch { /* ignore */ }
    setCopiedId(id);
    setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500);
  };

  const handleDownload = async (path) => {
    if (!path) return;
    const { data } = await supabase.storage.from(SB_INVOICES_BUCKET).createSignedUrl(path, 3600);
    if (data?.signedUrl && typeof window !== "undefined") {
      window.open(data.signedUrl, "_blank", "noopener");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Emission history</div>
          <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
            Downloads, emails, and resends of this self-billed invoice
          </div>
        </div>
        <Btn variant="primary" icon={<Icons.Send />} onClick={() => setShowResendModal(true)}>Resend</Btn>
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 bg-[var(--danger-50)] border border-[var(--danger-100)] rounded-[var(--radius-md)] text-sm text-[var(--danger-700)]">
          {error}
        </div>
      )}

      {rows === null ? (
        <div className="px-4 py-6 text-center text-sm text-[var(--text-tertiary)]">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-6 text-center">
          <div className="text-sm font-semibold text-[var(--text-primary)] mb-1">No emissions yet</div>
          <div className="text-xs text-[var(--text-tertiary)]">
            Emissions are recorded when you download, email, or resend this self-bill.
          </div>
        </div>
      ) : (
        <ul className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] divide-y divide-[var(--border-subtle)]">
          {rows.map((row) => {
            const meta = TYPE_META[row.emission_type] || { label: row.emission_type, icon: Icons.Receipt, tone: "text-[var(--text-secondary)]" };
            const Icon = meta.icon;
            const isoAbs = row.created_at ? new Date(row.created_at).toLocaleString() : "";
            return (
              <li key={row.id} className="px-4 py-3 flex items-start gap-3">
                <span className={`flex-shrink-0 mt-0.5 ${meta.tone}`}><Icon /></span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{meta.label}</span>
                    {(row.emission_type === "email" || row.emission_type === "resent") && row.email_sent_to && (
                      <span className="text-sm text-[var(--text-secondary)] truncate">→ {row.email_sent_to}</span>
                    )}
                    <span className="text-xs text-[var(--text-tertiary)]" title={isoAbs}>{relativeTime(row.created_at)}</span>
                  </div>
                  <div className="text-[11px] text-[var(--text-tertiary)] mt-1 font-mono truncate">
                    ID: {row.id}
                    {row.email_resend_id && <span> · Resend: {row.email_resend_id}</span>}
                    {row.pdf_sha256 && <span> · sha256: {String(row.pdf_sha256).slice(0, 12)}…</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button" onClick={() => handleCopy(row.id)}
                    className="h-7 px-2 text-[11px] rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-white hover:bg-[var(--surface-sunken)] cursor-pointer text-[var(--text-secondary)]"
                    title="Copy emission log ID"
                  >
                    {copiedId === row.id ? "Copied" : "Copy ID"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload(row.pdf_storage_path)}
                    disabled={!row.pdf_storage_path}
                    className="h-7 px-2 text-[11px] rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-white hover:bg-[var(--surface-sunken)] cursor-pointer text-[var(--brand-700)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                    title={row.pdf_storage_path ? "Open PDF in a new tab" : "No PDF stored for this row"}
                  >
                    <Icons.Download /> PDF
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {showResendModal && (
        <SendSelfBillModal
          bill={bill}
          supplier={supplier}
          onClose={() => setShowResendModal(false)}
          onSent={() => { setShowResendModal(false); load(); }}
        />
      )}
    </div>
  );
}
