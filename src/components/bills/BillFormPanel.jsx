import { useState, useContext, useMemo, useRef } from "react";
import { CUR_SYM } from "../../constants";
import { AppCtx } from "../../context/AppContext";
import { Btn } from "../atoms";
import { todayStr, addDays } from "../../utils/helpers";
import { computeBillCis } from "../../utils/cis/computeBillCis";
import { postBillEntry } from "../../utils/ledger/postBillEntry";
import { reverseEntry, findEntryBySource } from "../../utils/ledger/ledgerService";
import { fetchUserAccounts } from "../../utils/ledger/fetchUserAccounts";
import BillPaymentsTab from "./BillPaymentsTab";
import { saveBill } from "../../lib/dataAccess";
import { Icons } from "../icons";
import {
  FormCard, SupplierSection, BillDatesRow, BillAmountFields,
  ReverseChargeToggle, VatAmountRow, CisPreviewPanel, DescriptionStatusCard,
} from "./BillSharedParts";

export default function BillFormPanel({ existing, onClose, onSave }) {
  const { orgSettings, suppliers = [] } = useContext(AppCtx);
  const currSym = CUR_SYM[orgSettings?.currency || "GBP"] || "£";
  const isVat = orgSettings?.vatReg === "Yes";
  const isEdit = !!existing;
  const b = existing || {};

  // ─── State ───
  const [supplier, setSupplier] = useState(() => {
    if (!b.supplier_id) return null;
    return suppliers.find((s) => s.id === b.supplier_id) || null;
  });
  const [supplierName, setSupplierName] = useState(b.supplier_name || "");
  const [supplierEmail, setSupplierEmail] = useState(b.supplier_email || "");
  const [billNumber, setBillNumber] = useState(b.bill_number || "");
  const [billDate, setBillDate] = useState(b.bill_date || todayStr());
  const [dueDate, setDueDate] = useState(b.due_date || addDays(todayStr(), 30));
  const [category, setCategory] = useState(b.category || "Other");
  const [description, setDescription] = useState(b.description || "");
  const [amount, setAmount] = useState(b.amount || "");
  const [labourAmount, setLabourAmount] = useState(b.labour_amount ?? "");
  const [materialsAmount, setMaterialsAmount] = useState(b.materials_amount ?? "");
  const [taxRate, setTaxRate] = useState(b.tax_rate ?? (isVat ? 20 : 0));
  const [taxAmount, setTaxAmount] = useState(b.tax_amount || "");
  const [reverseCharge, setReverseCharge] = useState(b.reverse_charge_applied ?? false);
  const [status, setStatus] = useState(b.status || "Draft");
  const initialStatusRef = useRef(b.status || "Draft");
  const [reference, setReference] = useState(b.reference || "");
  const [notes, setNotes] = useState(b.notes || "");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  // ─── Derived calculations ───
  const isCis = !!supplier?.cis?.is_subcontractor;
  const effectiveLabour    = isCis ? (Number(labourAmount) || 0) : 0;
  const effectiveMaterials = isCis ? (Number(materialsAmount) || 0) : 0;
  const legacyAmount       = isCis ? 0 : (Number(amount) || 0);

  const calc = computeBillCis({
    labourAmount:    isCis ? effectiveLabour    : 0,
    materialsAmount: isCis ? effectiveMaterials : legacyAmount,
    taxRate:         Number(taxRate) || 0,
    cisRate:         isCis ? (supplier?.cis?.rate || null) : null,
    isReverseCharge: reverseCharge,
    vatRegistered:   isVat,
  });

  // Auto-calc tax when amount or rate changes (non-CIS legacy path)
  useMemo(() => {
    if (isVat && !isCis && !reverseCharge && amount) {
      setTaxAmount((((Number(amount) || 0) * Number(taxRate)) / 100).toFixed(2));
    }
  }, [amount, taxRate, isCis, reverseCharge]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSupplierChange = (s) => {
    setSupplier(s);
    if (s?.email && !supplierEmail) setSupplierEmail(s.email);
    if (typeof s?.default_reverse_charge === "boolean") setReverseCharge(s.default_reverse_charge);
    if (s?.cis?.is_subcontractor && s?.cis?.labour_only && !materialsAmount) setMaterialsAmount("0");
    if (s?.cis?.is_subcontractor && category !== "Subcontractor") setCategory("Subcontractor");
  };

  const handleSave = () => {
    const resolvedName = supplier?.name || supplierName.trim();
    if (!resolvedName) return alert("Supplier is required.");
    if (isCis) {
      const l = Number(labourAmount) || 0;
      const m = Number(materialsAmount) || 0;
      if (l + m <= 0) return alert("Enter labour and/or materials amount.");
      if (l < 0 || m < 0) return alert("Labour and materials cannot be negative.");
    } else {
      if (!amount || Number(amount) <= 0) return alert("Amount is required.");
    }
    setSaving(true);
    const finalTaxAmount = (isCis || reverseCharge)
      ? calc.taxAmount
      : (Number(taxAmount) || calc.taxAmount);
    const bill = {
      id: b.id || crypto.randomUUID(),
      supplier_id: supplier?.id || null,
      supplier_name: supplier?.name || supplierName.trim(),
      supplier_email: supplierEmail.trim(),
      bill_number: billNumber.trim(),
      bill_date: billDate, due_date: dueDate, category,
      description: description.trim(), reference: reference.trim(), notes: notes.trim(), status,
      amount: calc.netAmount, tax_rate: Number(taxRate) || 0, tax_amount: finalTaxAmount, total: calc.total,
      labour_amount:    isCis ? calc.labourAmount    : 0,
      materials_amount: isCis ? calc.materialsAmount : 0,
      cis_deduction:    calc.cisDeduction,
      cis_rate_at_posting:         isCis ? (supplier?.cis?.rate || null) : null,
      cis_verification_at_posting: isCis ? (supplier?.cis?.verification_number || null) : null,
      reverse_charge_applied:    isVat && reverseCharge,
      reverse_charge_vat_amount: calc.reverseChargeVatAmount,
      bill_type: calc.billType,
    };
    // Existing self-bills: preserve the immutable audit fields (SB number,
    // agreement id, supplier VAT snapshot). BillFormPanel doesn't expose
    // them as inputs, but re-emitting the bill with undefined here would
    // let rowToBill default them to null and clobber history.
    if (b.is_self_billed) {
      bill.is_self_billed = true;
      bill.self_bill_invoice_number    = b.self_bill_invoice_number;
      bill.self_billing_agreement_id   = b.self_billing_agreement_id;
      bill.supplier_vat_at_posting     = b.supplier_vat_at_posting;
      bill.supplier_vat_verified_at    = b.supplier_vat_verified_at;
      bill.supplier_vat_status_at_posting = b.supplier_vat_status_at_posting;
    }
    const oldStatus = initialStatusRef.current;
    const newStatus = bill.status;
    const POSTABLE = ["Approved", "Overdue", "Paid", "Partially Paid"];
    const wasPostable = POSTABLE.includes(oldStatus);
    const isPostable  = POSTABLE.includes(newStatus);

    setTimeout(() => {
      onSave(bill);
      (async () => {
        try {
          if (!wasPostable && !isPostable) return;
          const { accounts, userId } = await fetchUserAccounts();
          if (!userId) return;
          if (wasPostable) {
            const oldEntry = await findEntryBySource("bill", bill.id);
            if (oldEntry) await reverseEntry(oldEntry.id, userId);
          }
          if (isPostable) await postBillEntry(bill, supplier, accounts, userId);
        } catch (err) {
          console.error("[Ledger] bill post failed:", err);
        }
      })();
      setSaving(false);
      onClose();
    }, 300);
  };

  const handlePaymentReversed = (payment) => {
    const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
    const prevPaid    = Number(b.paid_amount || 0);
    const newPaidAmt  = Math.max(0, round2(prevPaid - Number(payment.amount || 0)));
    const outstanding = round2(Number(b.total || 0) - Number(b.cis_deduction || 0));
    const newStatus =
      newPaidAmt + 0.005 >= outstanding && outstanding > 0 ? "Paid" :
      newPaidAmt > 0 ? "Partially Paid" : "Approved";
    const updated = { ...b, paid_amount: newPaidAmt, status: newStatus, paid_date: newPaidAmt === 0 ? null : b.paid_date };
    (async () => {
      try {
        const { userId } = await fetchUserAccounts();
        if (userId) await saveBill(userId, updated);
      } catch (err) {
        console.error("[BillFormPanel] saveBill after reversal failed:", err);
      }
    })();
    onSave?.(updated);
  };

  return (
    <div className="bg-[var(--surface-page)] min-h-screen">
      <div className="max-w-[820px] mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] m-0">
            {isEdit ? "Edit bill" : "New bill"}
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] bg-transparent border-none cursor-pointer flex p-1"
          >
            <Icons.X />
          </button>
        </div>

        {isEdit && (
          <div className="flex border-b border-[var(--border-subtle)] mb-4">
            {[{ id: "details", label: "Details" }, { id: "payments", label: "Payments" }].map((t) => {
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={[
                    "py-2.5 px-4 text-sm cursor-pointer bg-transparent border-none -mb-px transition-colors duration-150",
                    active
                      ? "text-[var(--brand-600)] font-semibold border-b-2 border-[var(--brand-600)]"
                      : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] border-b-2 border-transparent",
                  ].join(" ")}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        )}

        {activeTab === "payments" && isEdit && (
          <BillPaymentsTab bill={b} onPaymentReversed={handlePaymentReversed} />
        )}

        {activeTab === "details" && (
          <>
            {b.is_self_billed && (
              <div className="mb-4 px-4 py-3 bg-[var(--warning-50)] border border-[var(--warning-100)] rounded-[var(--radius-lg)] text-sm text-[var(--warning-700)]">
                This is a self-billed invoice ({b.self_bill_invoice_number || "SB-?"}
                {b.bill_date ? ` issued ${b.bill_date}` : ""}). Edit fields with caution — the self-bill number and agreement reference are immutable.
              </div>
            )}
            <SupplierSection
              suppliers={suppliers}
              supplier={supplier}
              supplierEmail={supplierEmail}
              onSupplierChange={handleSupplierChange}
              onSupplierClear={() => { setSupplier(null); setReverseCharge(false); }}
              onEmailChange={setSupplierEmail}
            />

            <FormCard title="Bill details">
              <BillDatesRow
                billNumber={billNumber} onBillNumberChange={setBillNumber}
                billDate={billDate} onBillDateChange={setBillDate}
                dueDate={dueDate} onDueDateChange={setDueDate}
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
                  taxAmount={taxAmount} onTaxAmountChange={setTaxAmount}
                  reverseCharge={reverseCharge}
                  reverseChargeAmount={calc.reverseChargeVatAmount}
                  totalAmount={calc.total} currSym={currSym}
                />
              )}
            </FormCard>

            {isCis && <CisPreviewPanel calc={calc} currSym={currSym} supplier={supplier} />}

            <DescriptionStatusCard
              description={description} onDescriptionChange={setDescription}
              reference={reference} onReferenceChange={setReference}
              status={status} onStatusChange={setStatus}
              notes={notes} onNotesChange={setNotes}
            />

            <div className="flex justify-end gap-2 mt-4">
              <Btn variant="outline" onClick={onClose}>Cancel</Btn>
              <Btn variant="primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : isEdit ? "Update bill" : "Save bill"}
              </Btn>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
