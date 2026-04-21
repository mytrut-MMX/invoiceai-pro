import { useState, useEffect, useMemo } from "react";
import { Field, Input, Textarea, Btn } from "../atoms";
import { useToast } from "../ui/Toast";
import { supabase } from "../../lib/supabase";
import {
  createDraftSba,
  supersedeAndRenew,
} from "../../lib/selfBilling/sbaService";
import { generateSbaPdf } from "../../lib/selfBilling/generateSbaPdf";
import { getSbError } from "../../lib/selfBilling/errors";
import {
  SBA_BUCKET,
  DEFAULT_SB_PREFIX,
  SBA_DEFAULT_DURATION_MONTHS,
  SBA_MAX_DURATION_MONTHS,
  SB_DIRECTION,
} from "../../constants/selfBilling";

const isoToday = () => new Date().toISOString().slice(0, 10);
const addMonths = (isoDate, months) => {
  const d = new Date(isoDate);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
};
const PREFIX_RE = /^[A-Z0-9-]{1,16}$/;

function formatAddress(a) {
  if (!a) return "";
  return [a.street1, a.street2, [a.city, a.zip].filter(Boolean).join(" "), a.country]
    .filter(Boolean).join("\n");
}

function orgProfile(orgSettings) {
  return {
    orgName: orgSettings?.orgName,
    street: orgSettings?.street,
    city: orgSettings?.city,
    postcode: orgSettings?.postcode,
    country: orgSettings?.country,
    vatNumber: orgSettings?.vatReg === "Yes" ? orgSettings?.vatNum || null : null,
  };
}

export default function CreateSbaModal({
  open, supplier, userId, orgSettings,
  existingSbaForRenewal, onClose, onCreated,
}) {
  const isRenewal = Boolean(existingSbaForRenewal);
  const { toast } = useToast();

  const defaultStart = useMemo(() => {
    if (isRenewal && existingSbaForRenewal?.end_date) {
      return addMonths(existingSbaForRenewal.end_date, 0); // day after handled below
    }
    return isoToday();
  }, [isRenewal, existingSbaForRenewal]);

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(addMonths(defaultStart, SBA_DEFAULT_DURATION_MONTHS));
  const [prefix, setPrefix] = useState(DEFAULT_SB_PREFIX);
  const [customClauses, setCustomClauses] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStartDate(defaultStart);
    setEndDate(addMonths(defaultStart, SBA_DEFAULT_DURATION_MONTHS));
    setPrefix(DEFAULT_SB_PREFIX);
    setCustomClauses("");
    setSaving(false);
  }, [open, defaultStart]);

  if (!open) return null;

  const maxEnd = addMonths(startDate, SBA_MAX_DURATION_MONTHS);
  const prefixValid = PREFIX_RE.test(prefix);
  const datesValid = endDate > startDate && endDate <= maxEnd;
  const clausesValid = customClauses.length <= 2000;
  const canSubmit = prefixValid && datesValid && clausesValid && !saving;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const customArr = customClauses.trim()
        ? customClauses.trim().split(/\n\n+/).map((body, i) => ({
            title: `Additional Clause ${i + 1}`, body: body.trim(),
          }))
        : [];
      const termsSnapshot = { invoice_prefix: prefix, custom_clauses: customArr };

      const agreement = isRenewal
        ? await supersedeAndRenew({
            userId, sbaId: existingSbaForRenewal.id,
            newStartDate: startDate, newEndDate: endDate,
            newTermsSnapshot: termsSnapshot,
          })
        : await createDraftSba({
            userId, supplierId: supplier.id,
            direction: SB_DIRECTION.ISSUED,
            startDate, endDate, termsSnapshot,
          });

      const bytes = generateSbaPdf({
        agreement,
        ourBusinessProfile: orgProfile(orgSettings),
        counterpartyName: supplier.name || supplier.legal_name || "",
        counterpartyAddress: formatAddress(supplier.billingAddress),
        counterpartyVat: supplier.vat_number || null,
      });

      const path = `${userId}/${agreement.id}/${agreement.version}_${Date.now()}.pdf`;
      const { error: uploadErr } = await supabase.storage
        .from(SBA_BUCKET)
        .upload(path, bytes, { contentType: "application/pdf", upsert: false });
      if (uploadErr) throw new Error(uploadErr.message || "Storage upload failed");

      const { error: patchErr } = await supabase
        .from("self_billing_agreements")
        .update({ agreement_pdf_path: path })
        .eq("id", agreement.id).eq("user_id", userId);
      if (patchErr) throw new Error(patchErr.message || "Failed to save PDF path");

      toast({
        title: isRenewal ? "Agreement renewed" : "Draft created",
        description: "The agreement PDF has been generated.",
        variant: "success",
      });
      onCreated?.({ ...agreement, agreement_pdf_path: path });
      onClose?.();
    } catch (err) {
      const code = err?.code || "UNKNOWN";
      const entry = getSbError(code, err?.ctx || {});
      toast({
        title: entry.title || "Could not create agreement",
        description: code === "UNKNOWN" ? (err?.message || String(err)) : entry.message,
        variant: "error",
      });
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label={isRenewal ? "Renew Self-Billing Agreement" : "Create Self-Billing Agreement"}
    >
      <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] shadow-xl w-full max-w-[560px] max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-[var(--surface-card)] border-b border-[var(--border-subtle)] px-[21px] py-3 flex items-center justify-between">
          <span className="text-lg font-semibold">
            {isRenewal ? "Renew Self-Billing Agreement" : "New Self-Billing Agreement"}
          </span>
          <Btn variant="ghost" onClick={onClose} disabled={saving}>Close</Btn>
        </div>

        <div className="p-[21px] space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date" required>
              <Input type="date" value={startDate} onChange={setStartDate} />
            </Field>
            <Field
              label="End date"
              required
              hint={`Max 24 months (to ${maxEnd})`}
              error={!datesValid ? "End must be after start and within 24 months." : undefined}
            >
              <Input
                type="date" value={endDate} onChange={setEndDate}
                aria-describedby="sba-end-hint"
              />
            </Field>
          </div>

          <Field
            label="Invoice prefix"
            hint="Uppercase letters, digits, dashes. Max 16 chars."
            error={!prefixValid ? "Invalid prefix format." : undefined}
          >
            <Input value={prefix} onChange={(v) => setPrefix(String(v).toUpperCase())} maxLength={16} />
          </Field>

          <Field
            label="Custom clauses (optional)"
            hint="Separate clauses with a blank line. Appended after the standard HMRC terms."
          >
            <Textarea
              value={customClauses}
              onChange={setCustomClauses}
              rows={5}
              maxLength={2000}
              aria-describedby="sba-custom-hint"
            />
          </Field>
          <div className="text-xs text-[var(--text-tertiary)]">
            {customClauses.length}/2000 characters
          </div>
        </div>

        <div className="sticky bottom-0 bg-[var(--surface-card)] border-t border-[var(--border-subtle)] px-[21px] py-3 flex justify-end gap-2">
          <Btn variant="outline" onClick={onClose} disabled={saving}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSubmit} disabled={!canSubmit}>
            {saving ? "Saving…" : isRenewal ? "Create renewal" : "Create draft"}
          </Btn>
        </div>
      </div>
    </div>
  );
}