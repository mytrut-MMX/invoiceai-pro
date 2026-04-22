// SelfBillFormPanel — buyer-issues-invoice variant. Save flow: next_selfbill_number
// RPC → saveBill (with 6 SB columns) → postSelfBilledEntry → generateSelfBilledPdf →
// SHA-256 → upload to SB_INVOICES_BUCKET → self_billing_emission_log row →
// signed URL window.open. Steps after saveBill are best-effort and don't roll back.

import { useState, useContext, useMemo, useEffect, useCallback } from "react";
import { AppCtx } from "../../context/AppContext";
import { Btn } from "../atoms";
import { Icons } from "../icons";
import { CUR_SYM } from "../../constants";
import { todayStr, addDays } from "../../utils/helpers";
import { supabase } from "../../lib/supabase";
import { saveBill } from "../../lib/dataAccess";
import { fetchUserAccounts } from "../../utils/ledger/fetchUserAccounts";
import { getActiveSbaForSupplier } from "../../lib/selfBilling/sbaService";
import { computeSelfBilledInvoice } from "../../utils/selfBilling/computeSelfBilledInvoice";
import { postSelfBilledEntry } from "../../utils/ledger/postSelfBilledEntry";
import { generateSelfBilledPdf } from "../../utils/pdf/generateSelfBilledPdf";
import {
  SELF_BILL_MARKER_TITLE, SELF_BILL_VAT_STATEMENT,
  SELF_BILL_VAT_STATEMENT_NON_VAT_SUPPLIER, SB_INVOICES_BUCKET,
} from "../../constants/selfBilling";
import { useToast } from "../ui/Toast";
import { verifySupplierVat, shouldAutoVerify } from "../../lib/selfBilling/sbaVatVerify";
import {
  FormCard, SupplierSection, BillDatesRow, BillAmountFields,
  ReverseChargeToggle, VatAmountRow, CisPreviewPanel, DescriptionStatusCard,
} from "./BillSharedParts";

const sha256Hex = async (bytes) => Array.from(new Uint8Array(
  await crypto.subtle.digest("SHA-256", bytes),
)).map((b) => b.toString(16).padStart(2, "0")).join("");

function buildLineItems({ isCis, category, amount, labour, materials, taxRate }) {
  const rt = Number(taxRate) || 0;
  const cat = category || "Subcontractor";
  if (isCis) {
    const items = [{ description: `${cat} — Labour`, quantity: 1, rate: Number(labour) || 0, taxType: "standard", taxRate: rt, cisApplicable: true }];
    if (Number(materials) > 0) items.push({ description: `${cat} — Materials`, quantity: 1, rate: Number(materials) || 0, taxType: "standard", taxRate: rt, cisApplicable: false });
    return items;
  }
  return [{ description: category || "Services", quantity: 1, rate: Number(amount) || 0, taxType: "standard", taxRate: rt, cisApplicable: false }];
}

export default function SelfBillFormPanel({ existing, onClose, onSave }) {
  const { orgSettings, suppliers = [], user } = useContext(AppCtx);
  const currSym = CUR_SYM[orgSettings?.currency || "GBP"] || "£";
  const isVat = orgSettings?.vatReg === "Yes";
  const b = existing || {};
  const { toast } = useToast();

  const [sbaSupplierIds, setSbaSupplierIds] = useState(null);
  const [supplier, setSupplier] = useState(null);
  const [agreement, setAgreement] = useState(null);
  const [supplierEmail, setSupplierEmail] = useState("");
  const [issueDate, setIssueDate] = useState(todayStr());
  const [supplyDate, setSupplyDate] = useState(todayStr());
  const [dueDate, setDueDate] = useState(addDays(todayStr(), 30));
  const [category, setCategory] = useState("Subcontractor");
  const [description, setDescription] = useState(b.description || "");
  const [amount, setAmount] = useState("");
  const [labourAmount, setLabourAmount] = useState("");
  const [materialsAmount, setMaterialsAmount] = useState("");
  const [taxRate, setTaxRate] = useState(isVat ? 20 : 0);
  const [reverseCharge, setReverseCharge] = useState(false);
  const [status, setStatus] = useState(b.status || "Draft");
  const [reference, setReference] = useState(b.reference || "");
  const [notes, setNotes] = useState(b.notes || "");
  const [saving, setSaving] = useState(false);
  const [vatCheck, setVatCheck] = useState({ status: "unchecked", verifiedAt: null, name: null, running: false });

  // Preload suppliers with an active 'issued' SBA so the picker filters cleanly.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) { setSbaSupplierIds(new Set()); return; }
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase.from("self_billing_agreements").select("supplier_id")
        .eq("user_id", user.id).eq("direction", "issued").eq("status", "active").gt("end_date", today);
      if (!cancelled) setSbaSupplierIds(new Set((data || []).map((r) => r.supplier_id).filter(Boolean)));
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Load the supplier's active agreement when selection changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supplier?.id || !user?.id) { setAgreement(null); return; }
      try {
        const sba = await getActiveSbaForSupplier({ userId: user.id, supplierId: supplier.id });
        if (!cancelled) setAgreement(sba);
      } catch { if (!cancelled) setAgreement(null); }
    })();
    return () => { cancelled = true; };
  }, [supplier?.id, user?.id]);

  // Seed + refresh supplier VAT verification. Cached fields come from the
  // supplier row (rowToSupplier populates vat_verified_at etc.); if stale,
  // fire verifySupplierVat in the background and rehydrate when it lands.
  useEffect(() => {
    let cancelled = false;
    if (!supplier?.id || !user?.id) {
      setVatCheck({ status: "unchecked", verifiedAt: null, name: null, running: false });
      return;
    }
    const stale = shouldAutoVerify(supplier);
    setVatCheck({
      status: supplier.vat_verification_status || "unchecked",
      verifiedAt: supplier.vat_verified_at || null,
      name: supplier.vat_verification_name || null,
      running: stale,
    });
    if (!stale) return;
    (async () => {
      const r = await verifySupplierVat({ userId: user.id, supplierId: supplier.id, supplier });
      if (!cancelled) setVatCheck({ status: r.status, verifiedAt: r.verifiedAt, name: r.name, running: false });
    })();
    return () => { cancelled = true; };
  }, [supplier?.id, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const isCis = !!supplier?.cis?.is_subcontractor;

  // Feed the verified HMRC status into compute so the engine applies the
  // right VAT rules (valid → include VAT; invalid/deregistered → error;
  // unchecked → warning). Error status from the HMRC call itself degrades
  // to 'unchecked' so a transient failure doesn't block save.
  const compute = useMemo(() => computeSelfBilledInvoice({
    lineItems: buildLineItems({ isCis, category, amount, labour: labourAmount, materials: materialsAmount, taxRate }),
    supplierVatStatus: vatCheck.status === "error" ? "unchecked" : (vatCheck.status || "unchecked"),
    supplierCisRate: isCis ? (supplier?.cis?.rate || null) : null,
    supplierCisLabourOnly: !!supplier?.cis?.labour_only,
    supplyDate, issueDate, applyReverseCharge: reverseCharge, ourVatRegistered: isVat,
  }), [isCis, category, amount, labourAmount, materialsAmount, taxRate, supplier, supplyDate, issueDate, reverseCharge, isVat, vatCheck.status]);

  const daysToExpiry = agreement?.end_date ? Math.ceil((new Date(agreement.end_date) - new Date()) / 86400000) : null;
  const agreementExpiringSoon = daysToExpiry !== null && daysToExpiry >= 0 && daysToExpiry <= 30;
  const blockingErrors = [
    ...(supplier && !agreement ? [{ code: "SBA_NOT_ACTIVE", message: `No active self-billing agreement with ${supplier.name}.` }] : []),
    ...compute.errors,
  ];
  const canSave = !saving && !!supplier && !!agreement && blockingErrors.length === 0 && compute.totalAmount > 0;

  const handleSupplierChange = (s) => {
    setSupplier(s);
    if (s?.email && !supplierEmail) setSupplierEmail(s.email);
    if (s?.cis?.is_subcontractor && category !== "Subcontractor") setCategory("Subcontractor");
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const userId = user.id;
    const billId = b.id || crypto.randomUUID();
    try {
      const { data: sbNumber, error: rpcErr } = await supabase.rpc("next_selfbill_number",
        { p_user_id: userId, p_supplier_id: supplier.id });
      if (rpcErr) throw new Error(`Could not allocate self-bill number: ${rpcErr.message}`);

      const rcApplies = isVat && reverseCharge && compute.vatIncluded;
      const lineItems = buildLineItems({ isCis, category, amount, labour: labourAmount, materials: materialsAmount, taxRate });
      const bill = {
        id: billId, supplier_id: supplier.id, supplier_name: supplier.name,
        supplier_email: supplierEmail.trim() || supplier.email || null,
        bill_number: sbNumber, bill_date: issueDate, due_date: dueDate, category,
        description: description.trim(), reference: reference.trim(), notes: notes.trim(), status,
        amount: compute.netAmount, tax_rate: Number(taxRate) || 0,
        tax_amount: compute.taxAmount, total: compute.totalAmount,
        labour_amount:    isCis ? Number(labourAmount) || 0 : 0,
        materials_amount: isCis ? Number(materialsAmount) || 0 : 0,
        cis_deduction:    compute.cisDeduction,
        cis_rate_at_posting:         isCis ? (supplier.cis?.rate || null) : null,
        cis_verification_at_posting: isCis ? (supplier.cis?.verification_number || null) : null,
        reverse_charge_applied: rcApplies,
        reverse_charge_vat_amount: rcApplies ? compute.taxAmount : 0,
        bill_type: isCis ? (rcApplies ? "cis_reverse_charge" : "cis") : (rcApplies ? "reverse_charge" : "standard"),
        is_self_billed: true, self_bill_invoice_number: sbNumber,
        self_billing_agreement_id: agreement.id,
        supplier_vat_at_posting: supplier.vat_number || null,
        supplier_vat_verified_at: vatCheck.verifiedAt || null,
        supplier_vat_status_at_posting: vatCheck.status || "unchecked",
      };
      const { error: saveErr } = await saveBill(userId, bill);
      if (saveErr) throw new Error(`Failed to save bill: ${saveErr.message || saveErr}`);
      onSave?.(bill);

      // Steps 3–6: best-effort. Bill + eventual ledger entry are source-of-truth.
      try {
        const { accounts } = await fetchUserAccounts();
        await postSelfBilledEntry(bill, supplier, accounts, userId);
      } catch (err) { console.error("[SelfBillFormPanel] ledger post failed:", err); }

      try {
        const bytes = generateSelfBilledPdf({
          bill: {
            self_bill_invoice_number: sbNumber, issueDate, supplyDate,
            taxPoint: compute.taxPoint, dueDate, lineItems, breakdown: compute.breakdown,
            netAmount: compute.netAmount, taxAmount: compute.taxAmount, totalAmount: compute.totalAmount,
            vatIncluded: compute.vatIncluded,
            cisDeduction: compute.cisDeduction, amountPayable: compute.amountPayable,
            cis: isCis ? { labour: Number(labourAmount) || 0, materials: Number(materialsAmount) || 0, deduction: compute.cisDeduction, rateLabel: supplier.cis?.rate } : null,
          },
          supplier: { ...supplier, vat_status: vatCheck.status || "unchecked" },
          ourBusinessProfile: orgSettings, agreement,
        });
        const hashHex = await sha256Hex(bytes);
        const path = `${userId}/${billId}/v1_${Date.now()}.pdf`;
        const { error: upErr } = await supabase.storage.from(SB_INVOICES_BUCKET)
          .upload(path, bytes, { contentType: "application/pdf", upsert: false });
        if (upErr) throw upErr;
        const vatStatement = compute.vatIncluded ? SELF_BILL_VAT_STATEMENT : SELF_BILL_VAT_STATEMENT_NON_VAT_SUPPLIER;
        await supabase.from("self_billing_emission_log").insert({
          user_id: userId, bill_id: billId, supplier_id: supplier.id,
          agreement_id: agreement.id, self_bill_number: sbNumber, emission_type: "download",
          pdf_storage_path: path, pdf_sha256: hashHex,
          snapshot: {
            net: compute.netAmount, vat: compute.taxAmount, total: compute.totalAmount,
            cisDeduction: compute.cisDeduction, lineItems,
            supplierVat: supplier.vat_number || null,
            markerTitle: SELF_BILL_MARKER_TITLE, vatStatement,
          },
        });
        const { data: urlData } = await supabase.storage.from(SB_INVOICES_BUCKET).createSignedUrl(path, 3600);
        if (urlData?.signedUrl && typeof window !== "undefined") window.open(urlData.signedUrl, "_blank", "noopener");
        toast({ title: `Self-bill ${sbNumber} saved`, description: "PDF generated and logged.", variant: "success" });
      } catch (err) {
        console.error("[SelfBillFormPanel] PDF/emission failed:", err);
        toast({ title: `Self-bill ${sbNumber} saved`, description: "PDF upload failed — retry from Bills.", variant: "warning" });
      }
      setSaving(false); onClose();
    } catch (err) {
      console.error("[SelfBillFormPanel] save failed:", err);
      toast({ title: "Could not save self-bill", description: String(err?.message || err), variant: "danger" });
      setSaving(false);
    }
  };

  const supplierFilter = useCallback((s) => sbaSupplierIds?.has(s.id) ?? false, [sbaSupplierIds]);
  const cisPreview = { labourAmount: Number(labourAmount) || 0, cisDeduction: compute.cisDeduction, amountPayable: compute.amountPayable };

  return (
    <div className="bg-[var(--surface-page)] min-h-screen">
      <div className="max-w-[820px] mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] m-0">New self-billed invoice</h2>
          <button onClick={onClose} className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] bg-transparent border-none cursor-pointer flex p-1">
            <Icons.X />
          </button>
        </div>

        <div className="bg-[var(--brand-600)] text-white rounded-[var(--radius-lg)] px-4 py-3 mb-4 flex items-center justify-between gap-3">
          <div className="text-sm">
            <span className="font-semibold">Self-Billed Invoice</span>
            <span className="opacity-80"> — issued on behalf of {supplier?.name || "…"}</span>
          </div>
          {agreement && (
            <span className="text-[11px] bg-white/15 rounded-full px-2 py-0.5 tabular-nums">
              {String(agreement.id).slice(0, 8)} v{agreement.version}{agreementExpiringSoon && <span className="ml-1">· expiring soon</span>}
            </span>
          )}
        </div>

        <SupplierSection
          suppliers={suppliers} supplier={supplier} supplierEmail={supplierEmail}
          filter={supplierFilter} onSupplierChange={handleSupplierChange}
          onSupplierClear={() => { setSupplier(null); setAgreement(null); }}
          onEmailChange={setSupplierEmail}
          label="Supplier (with active SBA)"
          emptyHint="No suppliers have an active self-billing agreement."
        />

        {supplier && (() => {
          const base = "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full -mt-2 mb-4 border";
          const days = vatCheck.verifiedAt ? Math.max(0, Math.floor((Date.now() - new Date(vatCheck.verifiedAt).getTime()) / 86400000)) : null;
          const chips = {
            running:  { cls: "bg-[var(--warning-50)] border-[var(--warning-100)] text-[var(--warning-700)]", dot: "bg-[var(--warning-600)] animate-pulse", label: "Verification stale — re-checking" },
            valid:    { cls: "bg-[var(--success-50)] border-[var(--success-100)] text-[var(--success-700)]", dot: "bg-[var(--success-600)]", label: `VAT verified${days != null ? ` ${days} day${days === 1 ? "" : "s"} ago` : ""}` },
            bad:      { cls: "bg-[var(--danger-50)] border-[var(--danger-100)] text-[var(--danger-700)]",     dot: "bg-[var(--danger-600)]",   label: `VAT ${vatCheck.status} — save blocked` },
          };
          const chip = vatCheck.running ? chips.running
            : vatCheck.status === "valid" ? chips.valid
            : (vatCheck.status === "invalid" || vatCheck.status === "deregistered") ? chips.bad
            : null;
          if (!chip) return null;
          return (
            <div className={`${base} ${chip.cls}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${chip.dot}`} />{chip.label}
            </div>
          );
        })()}

        <FormCard title="Invoice details">
          <BillDatesRow
            billNumber="(auto-allocated on save)" onBillNumberChange={() => {}}
            numberLabel="Self-Bill No." numberPlaceholder="Auto-allocated"
            billDate={issueDate} onBillDateChange={setIssueDate}
            dueDate={dueDate} onDueDateChange={setDueDate}
            extraDate={{ label: "Supply Date", value: supplyDate, onChange: setSupplyDate }}
          />
          <BillAmountFields
            isCis={isCis} category={category} onCategoryChange={setCategory}
            amount={amount} onAmountChange={setAmount}
            labourAmount={labourAmount} onLabourAmountChange={setLabourAmount}
            materialsAmount={materialsAmount} onMaterialsAmountChange={setMaterialsAmount}
          />
          {isVat && <ReverseChargeToggle value={reverseCharge} onChange={setReverseCharge} />}
          {isVat && (
            <VatAmountRow
              taxRate={taxRate} onTaxRateChange={setTaxRate}
              taxAmount={compute.taxAmount} onTaxAmountChange={() => {}} readOnlyTax
              reverseCharge={reverseCharge} reverseChargeAmount={compute.taxAmount}
              totalAmount={compute.totalAmount} currSym={currSym}
            />
          )}
        </FormCard>

        {isCis && <CisPreviewPanel calc={cisPreview} currSym={currSym} supplier={supplier} />}

        {(blockingErrors.length > 0 || compute.warnings.length > 0) && (
          <FormCard title="Compliance checks">
            {blockingErrors.map((e, i) => (
              <div key={`${e.code}-${i}`} className="mb-2 px-3 py-2 bg-[var(--danger-50)] border border-[var(--danger-100)] rounded-[var(--radius-md)] text-sm text-[var(--danger-700)]">
                <div className="font-semibold">{e.code}</div><div>{e.message}</div>
              </div>
            ))}
            {compute.warnings.map((w, i) => (
              <div key={`${w.code}-${i}`} className="inline-block mr-2 mb-1 px-2.5 py-1 bg-[var(--warning-50)] border border-[var(--warning-100)] rounded-full text-xs text-[var(--warning-700)]">{w.message}</div>
            ))}
          </FormCard>
        )}

        <DescriptionStatusCard
          description={description} onDescriptionChange={setDescription}
          reference={reference} onReferenceChange={setReference}
          status={status} onStatusChange={setStatus}
          notes={notes} onNotesChange={setNotes}
        />

        <div className="flex justify-end gap-2 mt-4">
          <Btn variant="outline" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSave} disabled={!canSave}>
            {saving ? "Saving..." : "Save & Download"}
          </Btn>
        </div>
      </div>
    </div>
  );
}
