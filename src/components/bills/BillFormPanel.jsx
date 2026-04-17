import { useState, useContext, useMemo, useRef } from "react";
import { CUR_SYM, BILL_STATUSES, BILL_CATEGORIES, CIS_RATES_SUPPLIER } from "../../constants";
import { AppCtx } from "../../context/AppContext";
import { Field, Input, Select, Textarea, Btn } from "../atoms";
import { todayStr, addDays } from "../../utils/helpers";
import { SupplierPicker } from "../shared/SupplierPicker";
import { computeBillCis } from "../../utils/cis/computeBillCis";
import { postBillEntry } from "../../utils/ledger/postBillEntry";
import { reverseEntry, findEntryBySource } from "../../utils/ledger/ledgerService";
import { fetchUserAccounts } from "../../utils/ledger/fetchUserAccounts";
import BillPaymentsTab from "./BillPaymentsTab";
import { saveBill } from "../../lib/dataAccess";
import { Icons } from "../icons";

const dateInputCls =
  "w-full h-9 px-3 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-white outline-none focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)] transition-colors duration-150 box-border";

export default function BillFormPanel({ existing, onClose, onSave }) {
  const { orgSettings, suppliers = [] } = useContext(AppCtx);
  const currSym = CUR_SYM[orgSettings?.currency || "GBP"] || "£";
  const isVat = orgSettings?.vatReg === "Yes";
  const isEdit = !!existing;
  const b = existing || {};

  // ─── State ───
  const [supplier, setSupplier] = useState(() => {
    if (!b.supplier_id) return null;
    return suppliers.find(s => s.id === b.supplier_id) || null;
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

  const computedTax = calc.taxAmount;
  const totalAmount = calc.total;

  // Auto-calc tax when amount or rate changes (non-CIS legacy path)
  useMemo(() => {
    if (isVat && !isCis && !reverseCharge && amount) {
      setTaxAmount((((Number(amount) || 0) * Number(taxRate)) / 100).toFixed(2));
    }
  }, [amount, taxRate, isCis, reverseCharge]); // eslint-disable-line react-hooks/exhaustive-deps

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
      : (Number(taxAmount) || computedTax);

    const bill = {
      id: b.id || crypto.randomUUID(),
      supplier_id: supplier?.id || null,
      supplier_name: supplier?.name || supplierName.trim(),
      supplier_email: supplierEmail.trim(),
      bill_number: billNumber.trim(),
      bill_date: billDate,
      due_date: dueDate,
      category,
      description: description.trim(),
      reference: reference.trim(),
      notes: notes.trim(),
      status,
      amount: calc.netAmount,
      tax_rate: Number(taxRate) || 0,
      tax_amount: finalTaxAmount,
      total: calc.total,
      labour_amount:    isCis ? calc.labourAmount    : 0,
      materials_amount: isCis ? calc.materialsAmount : 0,
      cis_deduction:    calc.cisDeduction,
      cis_rate_at_posting:         isCis ? (supplier?.cis?.rate || null) : null,
      cis_verification_at_posting: isCis ? (supplier?.cis?.verification_number || null) : null,
      reverse_charge_applied:    isVat && reverseCharge,
      reverse_charge_vat_amount: calc.reverseChargeVatAmount,
      bill_type: calc.billType,
    };
    const oldStatus = initialStatusRef.current;
    const newStatus = bill.status;
    const POSTABLE = ['Approved', 'Overdue', 'Paid', 'Partially Paid'];
    const wasPostable = POSTABLE.includes(oldStatus);
    const isPostable  = POSTABLE.includes(newStatus);

    setTimeout(() => {
      onSave(bill);
      ;(async () => {
        try {
          if (!wasPostable && !isPostable) return;
          const { accounts, userId } = await fetchUserAccounts();
          if (!userId) return;
          if (wasPostable) {
            const oldEntry = await findEntryBySource('bill', bill.id);
            if (oldEntry) await reverseEntry(oldEntry.id, userId);
          }
          if (isPostable) {
            await postBillEntry(bill, supplier, accounts, userId);
          }
        } catch (err) {
          console.error('[Ledger] bill post failed:', err);
        }
      })();
      setSaving(false);
      onClose();
    }, 300);
  };

  const handlePaymentReversed = (payment) => {
    const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;
    const prevPaid    = Number(b.paid_amount || 0);
    const newPaidAmt  = Math.max(0, round2(prevPaid - Number(payment.amount || 0)));
    const outstanding = round2(Number(b.total || 0) - Number(b.cis_deduction || 0));
    const newStatus =
      newPaidAmt + 0.005 >= outstanding && outstanding > 0 ? "Paid" :
      newPaidAmt > 0                                        ? "Partially Paid" :
                                                              "Approved";
    const updated = {
      ...b,
      paid_amount: newPaidAmt,
      status: newStatus,
      paid_date: newPaidAmt === 0 ? null : b.paid_date,
    };
    ;(async () => {
      try {
        const { userId } = await fetchUserAccounts();
        if (userId) await saveBill(userId, updated);
      } catch (err) {
        console.error('[BillFormPanel] saveBill after reversal failed:', err);
      }
    })();
    onSave?.(updated);
  };

  return (
    <div className="bg-[var(--surface-page)] min-h-screen">
      <div className="max-w-[820px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
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
            {[{ id: "details", label: "Details" }, { id: "payments", label: "Payments" }].map(t => {
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
            {/* Supplier section */}
            <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] p-5 mb-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">Supplier</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Supplier" required>
                  <SupplierPicker
                    suppliers={suppliers}
                    value={supplier}
                    onChange={(s) => {
                      setSupplier(s);
                      if (s?.email && !supplierEmail) setSupplierEmail(s.email);
                      if (typeof s?.default_reverse_charge === 'boolean') {
                        setReverseCharge(s.default_reverse_charge);
                      }
                      if (s?.cis?.is_subcontractor && s?.cis?.labour_only && !materialsAmount) {
                        setMaterialsAmount("0");
                      }
                      if (s?.cis?.is_subcontractor && category !== "Subcontractor") {
                        setCategory("Subcontractor");
                      }
                    }}
                    onClear={() => { setSupplier(null); setReverseCharge(false); }}
                  />
                </Field>
                <Field label="Supplier Email">
                  <Input value={supplierEmail} onChange={setSupplierEmail} type="email" placeholder="accounts@supplier.com" />
                </Field>
              </div>
            </div>

            {/* Bill details */}
            <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] p-5 mb-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">Bill details</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <Field label="Bill Number">
                  <Input value={billNumber} onChange={setBillNumber} placeholder="INV-001 from supplier" />
                </Field>
                <Field label="Bill Date">
                  <input value={billDate} onChange={e => setBillDate(e.target.value)} type="date" className={dateInputCls} />
                </Field>
                <Field label="Due Date">
                  <input value={dueDate} onChange={e => setDueDate(e.target.value)} type="date" className={dateInputCls} />
                </Field>
              </div>

              {isCis ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Field label="Category">
                    <Select value={category} onChange={setCategory} options={BILL_CATEGORIES} />
                  </Field>
                  <Field label="Labour" required>
                    <Input value={labourAmount} onChange={setLabourAmount} type="number" placeholder="0.00" />
                  </Field>
                  <Field label="Materials">
                    <Input value={materialsAmount} onChange={setMaterialsAmount} type="number" placeholder="0.00" />
                  </Field>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Category">
                    <Select value={category} onChange={setCategory} options={BILL_CATEGORIES} />
                  </Field>
                  <Field label="Net Amount" required>
                    <Input value={amount} onChange={setAmount} type="number" placeholder="0.00" />
                  </Field>
                </div>
              )}

              {isVat && (
                <div className="mt-3 px-3 py-2.5 bg-[var(--surface-sunken)] border border-[var(--border-subtle)] rounded-[var(--radius-md)]">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-[var(--text-secondary)]">
                    <input
                      type="checkbox"
                      checked={reverseCharge}
                      onChange={e => setReverseCharge(e.target.checked)}
                      className="accent-[var(--brand-600)]"
                    />
                    <span className="font-semibold">Domestic Reverse Charge (DRC)</span>
                  </label>
                  <div className="text-[11px] text-[var(--text-tertiary)] ml-6 mt-1">
                    Supplier charges zero VAT; buyer self-accounts. Applies to CIS services since 1 Mar 2021.
                  </div>
                </div>
              )}

              {isVat && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                  <Field label="VAT Rate (%)">
                    <Input value={taxRate} onChange={setTaxRate} type="number" placeholder="20" />
                  </Field>
                  {reverseCharge ? (
                    <Field label="DRC VAT (self-accounted)">
                      <div className="h-9 px-3 flex items-center bg-[var(--warning-50)] border border-[var(--warning-100)] rounded-[var(--radius-md)] text-sm font-semibold text-[var(--warning-700)] tabular-nums">
                        {currSym}{calc.reverseChargeVatAmount.toFixed(2)}
                      </div>
                    </Field>
                  ) : (
                    <Field label="VAT Amount">
                      <Input value={taxAmount} onChange={setTaxAmount} type="number" placeholder="0.00" />
                    </Field>
                  )}
                  <Field label={reverseCharge ? "Total (net of DRC)" : "Total (inc. VAT)"}>
                    <div className="h-9 px-3 flex items-center bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm font-semibold text-[var(--text-primary)] tabular-nums">
                      {currSym}{totalAmount.toFixed(2)}
                    </div>
                  </Field>
                </div>
              )}
            </div>

            {/* CIS preview */}
            {isCis && (
              <div className="bg-[var(--warning-50)] border border-[var(--warning-100)] rounded-[var(--radius-lg)] px-4 py-3 mb-4">
                <div className="text-[11px] font-semibold text-[var(--warning-700)] uppercase tracking-wider mb-2">
                  CIS deduction preview
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <div className="text-[11px] text-[var(--text-tertiary)]">CIS rate</div>
                    <div className="font-semibold text-[var(--text-primary)]">
                      {supplier?.cis?.rate
                        ? (CIS_RATES_SUPPLIER.find(r => r.value === supplier.cis?.rate)?.label || supplier.cis?.rate)
                        : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[var(--text-tertiary)]">Labour (ex-VAT)</div>
                    <div className="font-semibold text-[var(--text-primary)] tabular-nums">{currSym}{calc.labourAmount.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[var(--text-tertiary)]">CIS deducted</div>
                    <div className="font-bold text-[var(--danger-600)] tabular-nums">−{currSym}{calc.cisDeduction.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[var(--text-tertiary)]">Payable to supplier</div>
                    <div className="font-bold text-[var(--success-700)] tabular-nums">{currSym}{calc.amountPayable.toFixed(2)}</div>
                  </div>
                </div>
                {supplier?.cis?.verification_date && (() => {
                  const d = new Date(supplier.cis.verification_date);
                  const twoYearsAgo = new Date();
                  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
                  return d < twoYearsAgo ? (
                    <div className="mt-2.5 text-xs text-[var(--warning-700)]">
                      ⚠ Supplier CIS verification is over 2 years old ({supplier.cis.verification_date}). HMRC recommends re-verification.
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            {/* Description & metadata */}
            <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] p-5 mb-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">Description & status</div>
              <Field label="Description">
                <Input value={description} onChange={setDescription} placeholder="What is this bill for?" />
              </Field>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Reference">
                  <Input value={reference} onChange={setReference} placeholder="PO number, ref..." />
                </Field>
                <Field label="Status">
                  <Select value={status} onChange={setStatus} options={BILL_STATUSES} />
                </Field>
              </div>
              <Field label="Notes">
                <Textarea value={notes} onChange={setNotes} placeholder="Internal notes..." />
              </Field>
            </div>

            {/* Actions */}
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
