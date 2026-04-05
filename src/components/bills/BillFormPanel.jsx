import { useState, useContext, useMemo } from "react";
import { ff, CUR_SYM, BILL_STATUSES, BILL_CATEGORIES } from "../../constants";
import { AppCtx } from "../../context/AppContext";
import { Icons } from "../icons";
import { Field, Input, Select, Textarea, Btn } from "../atoms";
import { todayStr, addDays } from "../../utils/helpers";

export default function BillFormPanel({ existing, onClose, onSave }) {
  const { orgSettings } = useContext(AppCtx);
  const currSym = CUR_SYM[orgSettings?.currency || "GBP"] || "£";
  const isVat = orgSettings?.vatReg === "Yes";
  const isEdit = !!existing;
  const b = existing || {};

  // ─── State ───
  const [supplierName, setSupplierName] = useState(b.supplier_name || "");
  const [supplierEmail, setSupplierEmail] = useState(b.supplier_email || "");
  const [billNumber, setBillNumber] = useState(b.bill_number || "");
  const [billDate, setBillDate] = useState(b.bill_date || todayStr());
  const [dueDate, setDueDate] = useState(b.due_date || addDays(todayStr(), 30));
  const [category, setCategory] = useState(b.category || "Other");
  const [description, setDescription] = useState(b.description || "");
  const [amount, setAmount] = useState(b.amount || "");
  const [taxRate, setTaxRate] = useState(b.tax_rate ?? (isVat ? 20 : 0));
  const [taxAmount, setTaxAmount] = useState(b.tax_amount || "");
  const [status, setStatus] = useState(b.status || "Draft");
  const [reference, setReference] = useState(b.reference || "");
  const [notes, setNotes] = useState(b.notes || "");
  const [saving, setSaving] = useState(false);

  // ─── Calculations ───
  const netAmount = Number(amount) || 0;
  const computedTax = isVat ? (netAmount * Number(taxRate)) / 100 : 0;
  const totalAmount = netAmount + (Number(taxAmount) || computedTax);

  // Auto-calc tax when amount or rate changes
  useMemo(() => {
    if (isVat && amount) setTaxAmount((netAmount * Number(taxRate) / 100).toFixed(2));
  }, [amount, taxRate]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = () => {
    if (!supplierName.trim()) return alert("Supplier name is required.");
    if (!amount || Number(amount) <= 0) return alert("Amount is required.");
    setSaving(true);
    const bill = {
      id: b.id || crypto.randomUUID(),
      supplier_name: supplierName.trim(),
      supplier_email: supplierEmail.trim(),
      bill_number: billNumber.trim(),
      bill_date: billDate,
      due_date: dueDate,
      category,
      description: description.trim(),
      amount: netAmount,
      tax_rate: Number(taxRate),
      tax_amount: Number(taxAmount) || computedTax,
      total: totalAmount,
      status,
      reference: reference.trim(),
      notes: notes.trim(),
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
        <Field label="Supplier Name" required>
          <Input value={supplierName} onChange={setSupplierName} placeholder="e.g. Adobe, AWS" />
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

      {/* Category + Amount */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <Field label="Category">
          <Select value={category} onChange={setCategory} options={BILL_CATEGORIES} />
        </Field>
        <Field label="Net Amount" required>
          <Input value={amount} onChange={setAmount} type="number" placeholder="0.00" />
        </Field>
      </div>

      {/* VAT */}
      {isVat && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          <Field label="VAT Rate (%)">
            <Input value={taxRate} onChange={setTaxRate} type="number" placeholder="20" />
          </Field>
          <Field label="VAT Amount">
            <Input value={taxAmount} onChange={setTaxAmount} type="number" placeholder="0.00" />
          </Field>
          <Field label="Total (inc. VAT)">
            <div style={{ padding: "9px 10px", background: "#f9fafb", border: "1.5px solid #E0E0E0", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>
              {currSym}{totalAmount.toFixed(2)}
            </div>
          </Field>
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
