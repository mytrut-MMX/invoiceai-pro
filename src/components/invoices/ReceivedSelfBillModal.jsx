// ReceivedSelfBillModal — overlay modal to import a customer-issued self-bill
// into invoices. Customer picker is filtered to self_billed_by_customer=true;
// PDF upload is required; tax point is auto-suggested under HMRC's 14-day rule.
//
// On save: calls importReceivedSelfBill which handles duplicate detection,
// invoice persistence, ledger posting, PDF upload, and the 'received'
// emission-log row. Errors are surfaced via getSbError(code).

import { useState, useContext, useMemo, useRef } from "react";
import { AppCtx } from "../../context/AppContext";
import { Btn, Field, Input, Select, Textarea } from "../atoms";
import { Icons } from "../icons";
import { CUR_SYM } from "../../constants";
import { todayStr } from "../../utils/helpers";
import { importReceivedSelfBill } from "../../utils/selfBilling/importReceivedSelfBill";
import { getSbError } from "../../lib/selfBilling/errors";
import { useModalA11y } from "../../hooks/useModalA11y";

const dateInputCls =
  "w-full h-9 px-3 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-white outline-none focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)] transition-colors duration-150 box-border";

const VAT_RATES = [
  { value: 0, label: "0% — zero-rated" },
  { value: 5, label: "5% — reduced" },
  { value: 20, label: "20% — standard" },
];

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// HMRC VAT 700/62 §6: invoice date is the tax point when it falls within 14
// days of the basic tax point (supply date); otherwise the supply date is.
function suggestTaxPoint(issueDate, supplyDate) {
  if (!issueDate || !supplyDate) return issueDate || "";
  const a = new Date(issueDate).getTime();
  const b = new Date(supplyDate).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return issueDate;
  const days = Math.abs(Math.round((a - b) / 86400000));
  return days <= 14 ? issueDate : supplyDate;
}

export default function ReceivedSelfBillModal({ onClose, onSaved, initialCustomerId = null }) {
  const { user, customers = [], orgSettings } = useContext(AppCtx);
  const overlayRef = useModalA11y(true, onClose);
  const currSym = CUR_SYM[orgSettings?.currency || "GBP"] || "£";
  const fileInputRef = useRef(null);

  const eligibleCustomers = useMemo(
    () => (customers || []).filter((c) => c?.self_billed_by_customer === true),
    [customers],
  );

  const [customerId, setCustomerId] = useState(initialCustomerId || "");
  const [customerSbRef, setCustomerSbRef] = useState("");
  const [issueDate, setIssueDate] = useState(todayStr());
  const [supplyDate, setSupplyDate] = useState(todayStr());
  const [taxPoint, setTaxPoint] = useState(todayStr());
  const [taxPointTouched, setTaxPointTouched] = useState(false);
  const [lineItems, setLineItems] = useState([{ description: "", amount: "" }]);
  const [vatRate, setVatRate] = useState(20);
  const [vatAmount, setVatAmount] = useState("");
  const [vatAmountTouched, setVatAmountTouched] = useState(false);
  const [notes, setNotes] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfError, setPdfError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const netAmount = useMemo(
    () => round2(lineItems.reduce((s, li) => s + (Number(li.amount) || 0), 0)),
    [lineItems],
  );
  const computedVat = useMemo(
    () => round2((netAmount * (Number(vatRate) || 0)) / 100),
    [netAmount, vatRate],
  );
  const effectiveVat = vatAmountTouched ? (Number(vatAmount) || 0) : computedVat;
  const totalAmount = useMemo(() => round2(netAmount + effectiveVat), [netAmount, effectiveVat]);

  // Auto-suggest tax point unless the user has overridden it.
  const suggestedTaxPoint = useMemo(
    () => suggestTaxPoint(issueDate, supplyDate),
    [issueDate, supplyDate],
  );
  if (!taxPointTouched && suggestedTaxPoint && suggestedTaxPoint !== taxPoint) {
    // Note: safe inline effect — React will re-render once and stabilize.
    setTaxPoint(suggestedTaxPoint);
  }

  const updateLine = (idx, patch) => {
    setLineItems((prev) => prev.map((li, i) => (i === idx ? { ...li, ...patch } : li)));
  };
  const addLine = () => setLineItems((prev) => [...prev, { description: "", amount: "" }]);
  const removeLine = (idx) => {
    setLineItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  };

  const handlePdfChange = (e) => {
    const f = e.target.files?.[0];
    setPdfError("");
    if (!f) { setPdfFile(null); return; }
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setPdfError("File must be a PDF.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setPdfError("PDF must be ≤ 10 MB.");
      return;
    }
    setPdfFile(f);
  };

  const canSave = !saving && customerId && customerSbRef.trim()
    && lineItems.some((li) => Number(li.amount) > 0)
    && pdfFile && !pdfError && totalAmount > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true); setSaveError(null);
    try {
      const pdfBytes = new Uint8Array(await pdfFile.arrayBuffer());
      const invoice = await importReceivedSelfBill({
        userId: user.id, customerId,
        customerSbRef: customerSbRef.trim(),
        issueDate, supplyDate, taxPoint,
        lineItems: lineItems
          .filter((li) => Number(li.amount) > 0)
          .map((li) => ({ description: li.description, amount: Number(li.amount) })),
        vatRate: Number(vatRate) || 0,
        vatAmount: effectiveVat,
        totalAmount,
        notes: notes.trim() || null,
        pdfBytes,
      });
      onSaved?.(invoice);
      onClose();
    } catch (err) {
      const code = err?.code || "SBA_NOT_ACTIVE";
      const resolved = getSbError(code, err?.ctx || {});
      setSaveError({
        code,
        title: resolved.title || "Could not import",
        message: err?.message || resolved.message,
        userAction: resolved.userAction,
      });
      setSaving(false);
    }
  };

  if (eligibleCustomers.length === 0) {
    return (
      <div ref={overlayRef} className="fixed inset-0 bg-black/50 z-[3000] flex items-center justify-center p-4" onMouseDown={onClose}>
        <div className="bg-[var(--surface-card)] rounded-[var(--radius-xl)] shadow-[var(--shadow-popover)] w-full max-w-[520px] p-6 border border-[var(--border-subtle)]" onMouseDown={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold m-0">Import received self-bill</h2>
            <button onClick={onClose} className="bg-transparent border-none cursor-pointer text-[var(--text-tertiary)]"><Icons.X /></button>
          </div>
          <p className="text-sm text-[var(--text-secondary)] m-0">
            No customers have self-billing arrangements set up. Enable on a customer from
            <span className="font-semibold"> Customers → Edit → Self-Billing Arrangement.</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={overlayRef} className="fixed inset-0 bg-black/50 z-[3000] flex items-center justify-center p-4" onMouseDown={onClose}>
      <div
        className="bg-[var(--surface-card)] rounded-[var(--radius-xl)] shadow-[var(--shadow-popover)] w-full max-w-[720px] max-h-[90vh] overflow-y-auto border border-[var(--border-subtle)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] sticky top-0 bg-[var(--surface-card)] z-10">
          <div>
            <h2 className="text-lg font-semibold m-0">Import received self-bill</h2>
            <p className="text-xs text-[var(--text-tertiary)] m-0 mt-0.5">Customer-issued invoice under a received-direction agreement</p>
          </div>
          <button onClick={onClose} className="bg-transparent border-none cursor-pointer text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"><Icons.X /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Customer" required>
              <Select
                value={customerId} onChange={setCustomerId}
                placeholder="Select customer"
                options={eligibleCustomers.map((c) => ({ value: c.id, label: c.name || c.company || "—" }))}
              />
            </Field>
            <Field label="Customer's self-bill reference" required>
              <Input value={customerSbRef} onChange={setCustomerSbRef} placeholder="e.g. SB-2026-0042" />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Issue date" required>
              <input value={issueDate} onChange={(e) => setIssueDate(e.target.value)} type="date" className={dateInputCls} />
            </Field>
            <Field label="Supply date" required>
              <input value={supplyDate} onChange={(e) => setSupplyDate(e.target.value)} type="date" className={dateInputCls} />
            </Field>
            <Field label="Tax point" hint={taxPointTouched ? undefined : "Auto-suggested by 14-day rule"}>
              <input value={taxPoint} onChange={(e) => { setTaxPoint(e.target.value); setTaxPointTouched(true); }} type="date" className={dateInputCls} />
            </Field>
          </div>

          <div className="border border-[var(--border-subtle)] rounded-[var(--radius-md)]">
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-subtle)]">Line items</div>
            <div className="p-3 space-y-2">
              {lineItems.map((li, idx) => (
                <div key={idx} className="flex items-end gap-2">
                  <div className="flex-1">
                    <Field label={idx === 0 ? "Description" : undefined}>
                      <Input value={li.description} onChange={(v) => updateLine(idx, { description: v })} placeholder="Work description" />
                    </Field>
                  </div>
                  <div className="w-32">
                    <Field label={idx === 0 ? `Amount (${currSym})` : undefined}>
                      <Input value={li.amount} onChange={(v) => updateLine(idx, { amount: v })} type="number" placeholder="0.00" />
                    </Field>
                  </div>
                  <button
                    type="button" onClick={() => removeLine(idx)}
                    disabled={lineItems.length <= 1}
                    className="h-9 w-9 flex items-center justify-center bg-transparent border border-[var(--border-subtle)] rounded-[var(--radius-md)] text-[var(--text-tertiary)] hover:text-[var(--danger-600)] hover:border-[var(--danger-100)] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Remove line"
                  >
                    <Icons.X />
                  </button>
                </div>
              ))}
              <button type="button" onClick={addLine} className="text-sm text-[var(--brand-600)] bg-transparent border-none cursor-pointer font-medium px-1 py-1">+ Add line</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="VAT rate">
              <Select value={vatRate} onChange={(v) => setVatRate(Number(v))} options={VAT_RATES.map((r) => ({ value: r.value, label: r.label }))} />
            </Field>
            <Field label="VAT amount" hint={vatAmountTouched ? "Edited" : "Auto from lines × rate"}>
              <Input
                value={vatAmountTouched ? vatAmount : computedVat.toFixed(2)}
                onChange={(v) => { setVatAmount(v); setVatAmountTouched(true); }}
                type="number" placeholder="0.00"
              />
            </Field>
            <Field label="Total (inc. VAT)">
              <div className="h-9 px-3 flex items-center bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm font-semibold text-[var(--text-primary)] tabular-nums">
                {currSym}{totalAmount.toFixed(2)}
              </div>
            </Field>
          </div>

          <Field label="Notes">
            <Textarea value={notes} onChange={setNotes} placeholder="Optional internal notes" />
          </Field>

          <Field label="PDF of the customer's self-bill" required>
            <input
              ref={fileInputRef} type="file" accept="application/pdf,.pdf"
              onChange={handlePdfChange}
              className="block w-full text-sm text-[var(--text-secondary)] file:mr-3 file:h-9 file:px-3 file:border file:border-[var(--border-default)] file:rounded-[var(--radius-md)] file:bg-[var(--surface-sunken)] file:text-[var(--text-primary)] file:cursor-pointer file:text-sm"
            />
            {pdfFile && !pdfError && (
              <div className="mt-1 text-[11px] text-[var(--text-tertiary)]">{pdfFile.name} · {(pdfFile.size / 1024).toFixed(0)} KB</div>
            )}
            {pdfError && <div className="mt-1 text-[11px] text-[var(--danger-600)]">{pdfError}</div>}
          </Field>

          {saveError && (
            <div className="px-3 py-2 bg-[var(--danger-50)] border border-[var(--danger-100)] rounded-[var(--radius-md)] text-sm text-[var(--danger-700)]">
              <div className="font-semibold">{saveError.title}</div>
              <div>{saveError.message}</div>
              {saveError.userAction && (
                <div className="text-[11px] text-[var(--danger-600)] mt-1">{saveError.userAction}</div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[var(--border-subtle)] sticky bottom-0 bg-[var(--surface-card)]">
          <Btn variant="outline" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSave} disabled={!canSave}>
            {saving ? "Importing..." : "Import self-bill"}
          </Btn>
        </div>
      </div>
    </div>
  );
}
