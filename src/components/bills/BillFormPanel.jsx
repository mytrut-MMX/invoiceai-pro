import { useState, useContext, useMemo } from "react";
import { ff, CUR_SYM, BILL_STATUSES, BILL_CATEGORIES, CIS_RATES_SUPPLIER } from "../../constants";
import { AppCtx } from "../../context/AppContext";
import { Icons } from "../icons";
import { Field, Input, Select, Textarea, Btn } from "../atoms";
import { todayStr, addDays } from "../../utils/helpers";
import { SupplierPicker } from "../shared/SupplierPicker";
import { computeBillCis } from "../../utils/cis/computeBillCis";

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
  const [reference, setReference] = useState(b.reference || "");
  const [notes, setNotes] = useState(b.notes || "");
  const [saving, setSaving] = useState(false);

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

  const netAmount   = calc.netAmount;
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

    // Decide tax_amount: computed from calc when CIS/DRC in play, else honour manual override
    const finalTaxAmount = (isCis || reverseCharge)
      ? calc.taxAmount
      : (Number(taxAmount) || computedTax);

    const bill = {
      id: b.id || crypto.randomUUID(),

      // Supplier linkage (both id + name; name kept for backward compat + non-supplier bills)
      supplier_id: supplier?.id || null,
      supplier_name: supplier?.name || supplierName.trim(),
      supplier_email: supplierEmail.trim(),

      // Invoice meta
      bill_number: billNumber.trim(),
      bill_date: billDate,
      due_date: dueDate,
      category,
      description: description.trim(),
      reference: reference.trim(),
      notes: notes.trim(),
      status,

      // Amounts — unified via computeBillCis output
      amount: calc.netAmount,
      tax_rate: Number(taxRate) || 0,
      tax_amount: finalTaxAmount,
      total: calc.total,

      // CIS columns (migration 026)
      labour_amount:    isCis ? calc.labourAmount    : 0,
      materials_amount: isCis ? calc.materialsAmount : 0,
      cis_deduction:    calc.cisDeduction,
      cis_rate_at_posting:         isCis ? (supplier?.cis?.rate || null) : null,
      cis_verification_at_posting: isCis ? (supplier?.cis?.verification_number || null) : null,

      // DRC columns (migration 026)
      reverse_charge_applied:    isVat && reverseCharge,
      reverse_charge_vat_amount: calc.reverseChargeVatAmount,

      // Dispatch type (migration 026)
      bill_type: calc.billType,
    };
    setTimeout(() => { onSave(bill); setSaving(false); onClose(); }, 300);
  };

  // ─── Render ───
  return (
    <div style={{ padding: "clamp(14px,4vw,28px)", maxWidth: 700, fontFamily: ff }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e", margin: 0 }}>
          {isEdit ? "Edit Bill" : "New Bill"}
        </h2>
        <Btn variant="ghost" onClick={onClose}>✕</Btn>
      </div>

      {/* Supplier */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
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
            onClear={() => {
              setSupplier(null);
              setReverseCharge(false);
            }}
          />
        </Field>
        <Field label="Supplier Email">
          <Input value={supplierEmail} onChange={setSupplierEmail} type="email" placeholder="accounts@supplier.com" />
        </Field>
      </div>

      {/* Dates + Reference */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
        <Field label="Bill Number">
          <Input value={billNumber} onChange={setBillNumber} placeholder="INV-001 from supplier" />
        </Field>
        <Field label="Bill Date">
          <input value={billDate} onChange={e => setBillDate(e.target.value)} type="date"
            style={{ width: "100%", padding: "9px 10px", border: "1.5px solid #E0E0E0", borderRadius: 8, fontSize: 13, fontFamily: ff, outline: "none", boxSizing: "border-box" }} />
        </Field>
        <Field label="Due Date">
          <input value={dueDate} onChange={e => setDueDate(e.target.value)} type="date"
            style={{ width: "100%", padding: "9px 10px", border: "1.5px solid #E0E0E0", borderRadius: 8, fontSize: 13, fontFamily: ff, outline: "none", boxSizing: "border-box" }} />
        </Field>
      </div>

      {/* Category + Amount (conditional on CIS) */}
      {isCis ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <Field label="Category">
            <Select value={category} onChange={setCategory} options={BILL_CATEGORIES} />
          </Field>
          <Field label="Net Amount" required>
            <Input value={amount} onChange={setAmount} type="number" placeholder="0.00" />
          </Field>
        </div>
      )}

      {/* DRC toggle — only when org is VAT-registered */}
      {isVat && (
        <div style={{ marginBottom: 12, padding: "10px 12px", background: "#f9fafb", border: "1px solid #E0E0E0", borderRadius: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#374151" }}>
            <input
              type="checkbox"
              checked={reverseCharge}
              onChange={(e) => setReverseCharge(e.target.checked)}
              style={{ accentColor: "#1e6be0" }}
            />
            <span style={{ fontWeight: 600 }}>Domestic Reverse Charge (DRC)</span>
          </label>
          <div style={{ fontSize: 11, color: "#9ca3af", marginLeft: 22, marginTop: 2 }}>
            Supplier charges zero VAT; buyer self-accounts. Applies to CIS services since 1 Mar 2021.
          </div>
        </div>
      )}

      {/* VAT */}
      {isVat && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          <Field label="VAT Rate (%)">
            <Input value={taxRate} onChange={setTaxRate} type="number" placeholder="20" />
          </Field>
          {reverseCharge ? (
            <Field label="DRC VAT (self-accounted)">
              <div style={{ padding: "9px 10px", background: "#fef3c7", border: "1.5px solid #fde68a", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#92400e" }}>
                {currSym}{calc.reverseChargeVatAmount.toFixed(2)}
              </div>
            </Field>
          ) : (
            <Field label="VAT Amount">
              <Input value={taxAmount} onChange={setTaxAmount} type="number" placeholder="0.00" />
            </Field>
          )}
          <Field label={reverseCharge ? "Total (net of DRC)" : "Total (inc. VAT)"}>
            <div style={{ padding: "9px 10px", background: "#f9fafb", border: "1.5px solid #E0E0E0", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>
              {currSym}{totalAmount.toFixed(2)}
            </div>
          </Field>
        </div>
      )}

      {/* CIS preview card */}
      {isCis && (
        <div style={{
          marginBottom: 12, padding: "12px 14px",
          background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            CIS Deduction Preview
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, fontSize: 13 }}>
            <div>
              <div style={{ color: "#9ca3af", fontSize: 11 }}>CIS rate</div>
              <div style={{ fontWeight: 600, color: "#1a1a2e" }}>
                {supplier?.cis?.rate
                  ? (CIS_RATES_SUPPLIER.find(r => r.value === supplier.cis?.rate)?.label || supplier.cis?.rate)
                  : "—"}
              </div>
            </div>
            <div>
              <div style={{ color: "#9ca3af", fontSize: 11 }}>Labour (ex-VAT)</div>
              <div style={{ fontWeight: 600, color: "#1a1a2e" }}>{currSym}{calc.labourAmount.toFixed(2)}</div>
            </div>
            <div>
              <div style={{ color: "#9ca3af", fontSize: 11 }}>CIS deducted</div>
              <div style={{ fontWeight: 700, color: "#dc2626" }}>−{currSym}{calc.cisDeduction.toFixed(2)}</div>
            </div>
            <div>
              <div style={{ color: "#9ca3af", fontSize: 11 }}>Payable to supplier</div>
              <div style={{ fontWeight: 700, color: "#059669" }}>{currSym}{calc.amountPayable.toFixed(2)}</div>
            </div>
          </div>
          {supplier?.cis?.verification_date && (() => {
            const d = new Date(supplier.cis.verification_date);
            const twoYearsAgo = new Date();
            twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
            return d < twoYearsAgo ? (
              <div style={{ marginTop: 10, fontSize: 12, color: "#92400e" }}>
                ⚠ Supplier CIS verification is over 2 years old ({supplier.cis.verification_date}). HMRC recommends re-verification.
              </div>
            ) : null;
          })()}
        </div>
      )}

      {/* Description + Notes */}
      <Field label="Description">
        <Input value={description} onChange={setDescription} placeholder="What is this bill for?" />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
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

      {/* Actions */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
        <Btn variant="outline" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : isEdit ? "Update Bill" : "Save Bill"}
        </Btn>
      </div>
    </div>
  );
}
