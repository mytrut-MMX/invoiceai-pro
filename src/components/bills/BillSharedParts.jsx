// Pure presentational building blocks shared between BillFormPanel and
// SelfBillFormPanel. No business logic, no state beyond controlled inputs.
// Extracting keeps each form panel under the per-file line cap while giving
// both the same visual footprint — the self-bill form should feel like a
// variant of the standard bill form, not a different product.

import { CIS_RATES_SUPPLIER, BILL_CATEGORIES, BILL_STATUSES } from "../../constants";
import { Field, Input, Select, Textarea } from "../atoms";
import { SupplierPicker } from "../shared/SupplierPicker";

const dateInputCls =
  "w-full h-9 px-3 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-white outline-none focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)] transition-colors duration-150 box-border";

export function FormCard({ title, children, tone = "default" }) {
  const base = "rounded-[var(--radius-lg)] p-5 mb-4";
  const cls = tone === "warning"
    ? `bg-[var(--warning-50)] border border-[var(--warning-100)] ${base}`
    : tone === "brand"
      ? `bg-[var(--brand-50)] border border-[var(--brand-100)] ${base}`
      : `bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-[var(--shadow-sm)] ${base}`;
  const labelTone = tone === "warning" ? "text-[var(--warning-700)]" : "text-[var(--text-tertiary)]";
  return (
    <div className={cls}>
      {title && (
        <div className={`text-xs font-semibold uppercase tracking-wider mb-3 ${labelTone}`}>
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

export function SupplierSection({
  suppliers, supplier, supplierEmail, onSupplierChange, onSupplierClear,
  onEmailChange, filter, label = "Supplier", emptyHint,
}) {
  const list = filter ? suppliers.filter(filter) : suppliers;
  return (
    <FormCard title="Supplier">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label={label} required>
          <SupplierPicker
            suppliers={list}
            value={supplier}
            onChange={onSupplierChange}
            onClear={onSupplierClear}
          />
          {emptyHint && list.length === 0 && (
            <div className="mt-1 text-[11px] text-[var(--text-tertiary)]">{emptyHint}</div>
          )}
        </Field>
        <Field label="Supplier Email">
          <Input value={supplierEmail} onChange={onEmailChange} type="email" placeholder="accounts@supplier.com" />
        </Field>
      </div>
    </FormCard>
  );
}

export function BillDatesRow({
  billNumber, onBillNumberChange, billDate, onBillDateChange,
  dueDate, onDueDateChange, numberLabel = "Bill Number", numberPlaceholder = "INV-001 from supplier",
  extraDate, // optional { label, value, onChange }
}) {
  const cols = extraDate ? "md:grid-cols-4" : "md:grid-cols-3";
  return (
    <div className={`grid grid-cols-1 ${cols} gap-3 mb-3`}>
      <Field label={numberLabel}>
        <Input value={billNumber} onChange={onBillNumberChange} placeholder={numberPlaceholder} />
      </Field>
      <Field label="Bill Date">
        <input value={billDate} onChange={(e) => onBillDateChange(e.target.value)} type="date" className={dateInputCls} />
      </Field>
      <Field label="Due Date">
        <input value={dueDate} onChange={(e) => onDueDateChange(e.target.value)} type="date" className={dateInputCls} />
      </Field>
      {extraDate && (
        <Field label={extraDate.label}>
          <input value={extraDate.value} onChange={(e) => extraDate.onChange(e.target.value)} type="date" className={dateInputCls} />
        </Field>
      )}
    </div>
  );
}

export function BillAmountFields({
  isCis, category, onCategoryChange,
  amount, onAmountChange,
  labourAmount, onLabourAmountChange,
  materialsAmount, onMaterialsAmountChange,
}) {
  if (isCis) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Category">
          <Select value={category} onChange={onCategoryChange} options={BILL_CATEGORIES} />
        </Field>
        <Field label="Labour" required>
          <Input value={labourAmount} onChange={onLabourAmountChange} type="number" placeholder="0.00" />
        </Field>
        <Field label="Materials">
          <Input value={materialsAmount} onChange={onMaterialsAmountChange} type="number" placeholder="0.00" />
        </Field>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Field label="Category">
        <Select value={category} onChange={onCategoryChange} options={BILL_CATEGORIES} />
      </Field>
      <Field label="Net Amount" required>
        <Input value={amount} onChange={onAmountChange} type="number" placeholder="0.00" />
      </Field>
    </div>
  );
}

export function ReverseChargeToggle({ value, onChange, label = "Domestic Reverse Charge (DRC)",
  hint = "Supplier charges zero VAT; buyer self-accounts. Applies to CIS services since 1 Mar 2021." }) {
  return (
    <div className="mt-3 px-3 py-2.5 bg-[var(--surface-sunken)] border border-[var(--border-subtle)] rounded-[var(--radius-md)]">
      <label className="flex items-center gap-2 cursor-pointer text-sm text-[var(--text-secondary)]">
        <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)}
          className="accent-[var(--brand-600)]" />
        <span className="font-semibold">{label}</span>
      </label>
      <div className="text-[11px] text-[var(--text-tertiary)] ml-6 mt-1">{hint}</div>
    </div>
  );
}

export function VatAmountRow({
  taxRate, onTaxRateChange, taxAmount, onTaxAmountChange,
  reverseCharge, reverseChargeAmount, totalAmount, currSym, readOnlyTax = false,
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
      <Field label="VAT Rate (%)">
        <Input value={taxRate} onChange={onTaxRateChange} type="number" placeholder="20" />
      </Field>
      {reverseCharge ? (
        <Field label="DRC VAT (self-accounted)">
          <div className="h-9 px-3 flex items-center bg-[var(--warning-50)] border border-[var(--warning-100)] rounded-[var(--radius-md)] text-sm font-semibold text-[var(--warning-700)] tabular-nums">
            {currSym}{Number(reverseChargeAmount || 0).toFixed(2)}
          </div>
        </Field>
      ) : readOnlyTax ? (
        <Field label="VAT Amount">
          <div className="h-9 px-3 flex items-center bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm font-semibold text-[var(--text-primary)] tabular-nums">
            {currSym}{Number(taxAmount || 0).toFixed(2)}
          </div>
        </Field>
      ) : (
        <Field label="VAT Amount">
          <Input value={taxAmount} onChange={onTaxAmountChange} type="number" placeholder="0.00" />
        </Field>
      )}
      <Field label={reverseCharge ? "Total (net of DRC)" : "Total (inc. VAT)"}>
        <div className="h-9 px-3 flex items-center bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm font-semibold text-[var(--text-primary)] tabular-nums">
          {currSym}{Number(totalAmount || 0).toFixed(2)}
        </div>
      </Field>
    </div>
  );
}

export function CisPreviewPanel({ calc, currSym, supplier }) {
  const rateLabel = supplier?.cis?.rate
    ? (CIS_RATES_SUPPLIER.find((r) => r.value === supplier.cis?.rate)?.label || supplier.cis?.rate)
    : "—";
  const staleVerification = (() => {
    if (!supplier?.cis?.verification_date) return false;
    const d = new Date(supplier.cis.verification_date);
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    return d < twoYearsAgo;
  })();
  return (
    <FormCard title="CIS deduction preview" tone="warning">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div>
          <div className="text-[11px] text-[var(--text-tertiary)]">CIS rate</div>
          <div className="font-semibold text-[var(--text-primary)]">{rateLabel}</div>
        </div>
        <div>
          <div className="text-[11px] text-[var(--text-tertiary)]">Labour (ex-VAT)</div>
          <div className="font-semibold text-[var(--text-primary)] tabular-nums">
            {currSym}{Number(calc.labourAmount || 0).toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-[var(--text-tertiary)]">CIS deducted</div>
          <div className="font-bold text-[var(--danger-600)] tabular-nums">
            −{currSym}{Number(calc.cisDeduction || 0).toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-[var(--text-tertiary)]">Payable to supplier</div>
          <div className="font-bold text-[var(--success-700)] tabular-nums">
            {currSym}{Number(calc.amountPayable || 0).toFixed(2)}
          </div>
        </div>
      </div>
      {staleVerification && (
        <div className="mt-2.5 text-xs text-[var(--warning-700)]">
          ⚠ Supplier CIS verification is over 2 years old ({supplier.cis.verification_date}). HMRC recommends re-verification.
        </div>
      )}
    </FormCard>
  );
}

export function DescriptionStatusCard({
  description, onDescriptionChange,
  reference, onReferenceChange,
  status, onStatusChange, statusOptions = BILL_STATUSES,
  notes, onNotesChange,
}) {
  return (
    <FormCard title="Description & status">
      <Field label="Description">
        <Input value={description} onChange={onDescriptionChange} placeholder="What is this bill for?" />
      </Field>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Reference">
          <Input value={reference} onChange={onReferenceChange} placeholder="PO number, ref..." />
        </Field>
        <Field label="Status">
          <Select value={status} onChange={onStatusChange} options={statusOptions} />
        </Field>
      </div>
      <Field label="Notes">
        <Textarea value={notes} onChange={onNotesChange} placeholder="Internal notes..." />
      </Field>
    </FormCard>
  );
}
