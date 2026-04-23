import { useState, useEffect, useCallback, useContext } from "react";
import { Btn } from "../atoms";
import EmptyState from "../ui/EmptyState";
import { Skeleton } from "../ui/Skeleton";
import { useToast } from "../ui/Toast";
import { AppCtx } from "../../context/AppContext";
import { supabase } from "../../lib/supabase";
import {
  getActiveSbaForSupplier,
  listSbasForSupplier,
  signBySender,
  terminateSba,
} from "../../lib/selfBilling/sbaService";
import { getSbError } from "../../lib/selfBilling/errors";
import { SBA_BUCKET, SBA_STATUS } from "../../constants/selfBilling";
import CreateSbaModal from "./CreateSbaModal";
import SignSbaModal from "./SignSbaModal";

const STATUS_STYLE = {
  draft:               { cls: "bg-gray-100 text-gray-700",       label: "Draft" },
  pending_countersign: { cls: "bg-amber-100 text-amber-800",     label: "Pending countersign" },
  active:              { cls: "bg-emerald-100 text-emerald-800", label: "Active" },
  expired:             { cls: "bg-slate-100 text-slate-600",     label: "Expired" },
  terminated:          { cls: "bg-rose-100 text-rose-700",       label: "Terminated" },
  superseded:          { cls: "bg-slate-100 text-slate-600",     label: "Superseded" },
};

function StatusChip({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.draft;
  return <span role="status" className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

function ExpiryBadge({ endDate }) {
  const d = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000);
  const cls = d <= 7 ? "bg-rose-100 text-rose-700"
    : d <= 30 ? "bg-amber-100 text-amber-800"
    : "bg-emerald-100 text-emerald-800";
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${cls}`}>{d} days left</span>;
}

function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—"
    : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function openPdfInNewTab(toast, path) {
  if (!path) { toast({ title: "No PDF available", variant: "error" }); return; }
  supabase.storage.from(SBA_BUCKET).createSignedUrl(path, 60).then(({ data, error }) => {
    if (error || !data?.signedUrl) {
      toast({ title: "Could not open PDF", description: error?.message, variant: "error" });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  });
}

function toastError(toast, err, fallback) {
  const code = err?.code || "UNKNOWN";
  const entry = getSbError(code, err?.ctx || {});
  toast({
    title: entry.title || fallback,
    description: code === "UNKNOWN" ? (err?.message || String(err)) : entry.message,
    variant: "error",
  });
}

function CurrentCard({ sba, supplier, onSign, onTerminate, onRenew, onCopyLink, onViewPdf, onCreate, onEditClauses }) {
  if (!sba) {
    return (
      <EmptyState
        title="No active self-billing agreement"
        description={`Create an agreement to start issuing self-billed invoices to ${supplier.name || "this supplier"}.`}
        action={{ label: "Create Self-Billing Agreement", onClick: onCreate }}
      />
    );
  }
  const isDraft = sba.status === SBA_STATUS.DRAFT;
  const isPending = sba.status === SBA_STATUS.PENDING_COUNTERSIGN;
  const isActive = sba.status === SBA_STATUS.ACTIVE;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <StatusChip status={sba.status} />
        <span className="text-sm text-[var(--text-secondary)]">v{sba.version}</span>
        {isActive && sba.end_date && <ExpiryBadge endDate={sba.end_date} />}
      </div>
      <div className="text-sm">
        <div className="text-[var(--text-tertiary)] text-xs uppercase tracking-wide mb-1">Period</div>
        <div>{fmtDate(sba.start_date)} → {fmtDate(sba.end_date)}</div>
      </div>
      {sba.supersedes_id && (
        <div className="text-xs text-[var(--text-tertiary)]">
          Supersedes earlier agreement (chain v{sba.version - 1} → v{sba.version})
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        {isDraft && (
          <>
            <Btn variant="primary" onClick={onSign}>Sign &amp; send to supplier</Btn>
            <Btn variant="outline" onClick={onEditClauses}>Edit clauses</Btn>
            <Btn variant="outline" onClick={onTerminate}>Delete draft</Btn>
          </>
        )}
        {isPending && (
          <>
            <Btn variant="primary" onClick={onCopyLink} aria-label="Copy signing link">
              Copy signing link
            </Btn>
            <Btn variant="outline" onClick={onViewPdf}>View PDF</Btn>
            <Btn variant="outline" onClick={onTerminate}>Cancel agreement</Btn>
          </>
        )}
        {isActive && (
          <>
            <Btn variant="outline" onClick={onViewPdf}>View PDF</Btn>
            <Btn variant="primary" onClick={onRenew}>Renew (supersede)</Btn>
            <Btn variant="outline" onClick={onTerminate}>Terminate</Btn>
          </>
        )}
        {!isDraft && !isPending && !isActive && (
          <Btn variant="outline" onClick={onViewPdf}>View PDF</Btn>
        )}
      </div>
    </div>
  );
}

function HistoryList({ rows, onViewPdf }) {
  if (!rows.length) {
    return <div className="text-sm text-[var(--text-tertiary)] py-6 text-center">No historical agreements.</div>;
  }
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.id}
          className="flex items-center justify-between gap-2 border border-[var(--border-subtle)] rounded-[var(--radius-md)] px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[var(--surface-sunken)] text-xs font-mono">v{r.version}</span>
            <span className="text-xs text-[var(--text-secondary)] truncate">
              {fmtDate(r.start_date)} → {fmtDate(r.end_date)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <StatusChip status={r.status} />
            <button
              onClick={() => onViewPdf(r.agreement_pdf_path)}
              aria-label={`Download PDF for v${r.version}`}
              className="text-[var(--brand-600)] hover:underline text-xs"
              disabled={!r.agreement_pdf_path}
            >
              PDF
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function SupplierSelfBillingTab({ supplier, userId, orgSettings, onAgreementChange }) {
  const { toast } = useToast();
  const appCtx = useContext(AppCtx);
  // AppCtx owns the has-any-active-issued-SBA flag used to gate TopBar,
  // Sidebar, CommandPalette and the dashboard renewals widget. Every
  // mutation below has to re-seed it — the hook only re-fetches on userId
  // change, so without this call the UI would keep the stale value.
  const refreshSbaGate = () => appCtx?.refreshHasAnyActiveIssuedSba?.();
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [history, setHistory] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [editingClauses, setEditingClauses] = useState(false);
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [signingInProgress, setSigningInProgress] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId || !supplier?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const [act, all] = await Promise.all([
        getActiveSbaForSupplier({ userId, supplierId: supplier.id }),
        listSbasForSupplier({ userId, supplierId: supplier.id }),
      ]);
      // If no "active" row, show the latest non-active as current context.
      const latest = all[0] || null;
      setActive(act || latest);
      setHistory(all.filter((r) => r.id !== (act?.id || latest?.id)));
    } catch (err) {
      toastError(toast, err, "Could not load agreements");
    } finally {
      setLoading(false);
    }
  }, [userId, supplier?.id, toast]);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleSign({ name, role }) {
    setSigningInProgress(true);
    try {
      const updated = await signBySender({
        userId, sbaId: active.id,
        signedByName: name,
        signedByRole: role || "Authorised signatory",
      });
      setActive(updated);
      onAgreementChange?.(updated);
      refreshSbaGate();
      const link = `${window.location.origin}/sba/sign/${updated.signed_by_them_token}`;
      try { await navigator.clipboard.writeText(link); } catch { /* clipboard may be denied */ }
      toast({ title: "Signed & link copied", description: "Share the link with the supplier.", variant: "success" });
      setSignModalOpen(false);
    } catch (err) {
      toastError(toast, err, "Could not sign agreement");
    } finally {
      setSigningInProgress(false);
    }
  }

  async function handleCopyLink() {
    const token = active?.signed_by_them_token;
    if (!token) { toast({ title: "No link available", variant: "error" }); return; }
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/sba/sign/${token}`);
      toast({ title: "Link copied", variant: "success" });
    } catch (err) { toast({ title: "Could not copy", description: err?.message, variant: "error" }); }
  }

  async function handleTerminate() {
    const reason = window.prompt("Reason for termination (min 10 chars)?");
    if (!reason || reason.trim().length < 10) return;
    const prev = active;
    setActive({ ...active, status: "terminated" }); // optimistic
    try {
      const updated = await terminateSba({ userId, sbaId: prev.id, reason });
      setActive(updated);
      onAgreementChange?.(updated);
      refresh();
      refreshSbaGate();
      toast({ title: "Agreement terminated", variant: "success" });
    } catch (err) {
      setActive(prev); // rollback
      toastError(toast, err, "Could not terminate");
    }
  }

  if (!supplier?.id) {
    return (
      <div className="max-w-[1020px] mx-auto">
        <div className="border border-dashed border-[var(--border-subtle)] rounded-[var(--radius-md)] p-[21px] mt-[34px] text-sm text-[var(--text-secondary)]">
          Save the supplier first to manage self-billing agreements.
        </div>
      </div>
    );
  }

  const buyerNotVat = orgSettings?.vatReg !== "Yes";
  const supplierIsVat = supplier?.is_vat_registered === true;

  if (buyerNotVat && supplierIsVat) {
    return (
      <div className="max-w-[1020px] mx-auto">
        <div className="border border-dashed border-[var(--border-subtle)] rounded-[var(--radius-md)] p-[21px] mt-[34px] text-sm text-[var(--text-secondary)]">
          <div className="font-semibold text-[var(--text-primary)] mb-1">Self-billing unavailable</div>
          Your business must be VAT-registered to self-bill a VAT-registered supplier.
          Enable VAT registration in Settings → Tax first.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1020px] mx-auto">
      {supplier?.is_vat_registered !== true && (
        <div className="border border-[var(--border-default)] rounded-[var(--radius-md)] px-[21px] py-3 mb-[21px] bg-[var(--info-50)] text-sm text-[var(--info-600)]">
          <div className="font-semibold mb-1">Non-VAT supplier</div>
          Self-billed invoices to this supplier will not include VAT. You cannot claim
          input tax on these invoices. The supplier must notify you if they register
          for VAT in the future.
        </div>
      )}
      <div
        className="grid gap-[21px] mt-[34px]"
        style={{ gridTemplateColumns: "1.618fr 1fr" }}
      >
        <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-[21px]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Current Agreement</h3>
          {loading ? (
            <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-48" /><Skeleton className="h-9 w-60" /></div>
          ) : (
            <CurrentCard
              sba={active}
              supplier={supplier}
              onCreate={() => { setRenewing(false); setModalOpen(true); }}
              onSign={() => setSignModalOpen(true)}
              onCopyLink={handleCopyLink}
              onTerminate={handleTerminate}
              onRenew={() => { setRenewing(true); setModalOpen(true); }}
              onViewPdf={() => openPdfInNewTab(toast, active?.agreement_pdf_path)}
              onEditClauses={() => setEditingClauses(true)}
            />
          )}
        </div>

        <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-[21px]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">History</h3>
          {loading
            ? <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
            : <HistoryList rows={history} onViewPdf={(p) => openPdfInNewTab(toast, p)} />}
        </div>
      </div>

      <SignSbaModal
        open={signModalOpen}
        onClose={() => setSignModalOpen(false)}
        onSign={handleSign}
        signing={signingInProgress}
        defaultName={orgSettings?.orgName || ""}
        defaultRole="Authorised signatory"
      />

      <CreateSbaModal
        open={modalOpen || editingClauses}
        supplier={supplier}
        userId={userId}
        orgSettings={orgSettings}
        existingSbaForRenewal={renewing ? active : null}
        editingDraft={editingClauses ? active : null}
        onClose={() => { setModalOpen(false); setEditingClauses(false); }}
        onCreated={() => { setModalOpen(false); setEditingClauses(false); refresh(); refreshSbaGate(); }}
      />
    </div>
  );
}