import { Field, Textarea } from "../atoms";
import { SectionTitle } from "./InvoiceFormPanel";

export default function InvoiceTotalsPanel({
  notes, setNotes, terms, setTerms,
  discType, setDiscType, discVal, setDiscVal,
  shipping, setShipping, showShipping,
  currSym, totals, cisDefaultRate, customer,
}) {
  const vatAmount = totals.taxBreakdown.reduce((sum, tax) => sum + Number(tax.amount || 0), 0);
  const vatRate = totals.taxBreakdown.length === 1 ? totals.taxBreakdown[0].rate : "mixed";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 mb-10 items-start">
      <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] p-5">
        <SectionTitle>Notes &amp; Terms</SectionTitle>
        <Field label="Notes (shown on invoice)">
          <Textarea
            value={notes}
            onChange={setNotes}
            rows={3}
            placeholder="e.g. Thank you for your business!"
          />
        </Field>
        <Field label="Payment Terms & Conditions">
          <Textarea value={terms} onChange={setTerms} rows={3} />
        </Field>
      </div>

      <div className="bg-[var(--surface-sunken)] rounded-[var(--radius-lg)] border border-[var(--border-subtle)] p-4 min-w-[280px]">
        {/* Discount */}
        <div className="flex items-center justify-between py-1">
          <span className="text-sm text-[var(--text-secondary)]">Discount</span>
          <div className="flex items-center gap-1.5">
            <div className="inline-flex rounded-[var(--radius-sm)] border border-[var(--border-default)] overflow-hidden">
              {[["percent", "%"], ["fixed", currSym]].map(([t, l]) => {
                const active = discType === t;
                return (
                  <button
                    key={t}
                    onClick={() => setDiscType(t)}
                    className={[
                      "px-2.5 py-1 min-w-[28px] text-xs font-semibold cursor-pointer border-none transition-colors duration-150",
                      active
                        ? "bg-[var(--text-primary)] text-white"
                        : "bg-transparent text-[var(--text-tertiary)] hover:bg-white",
                    ].join(" ")}
                  >
                    {l}
                  </button>
                );
              })}
            </div>
            <input
              value={discVal}
              onChange={e => setDiscVal(e.target.value)}
              type="number"
              min="0"
              className="w-20 h-8 px-2 border border-[var(--border-default)] rounded-[var(--radius-sm)] text-sm text-right tabular-nums bg-white outline-none focus:border-[var(--brand-600)] [-moz-appearance:textfield]"
            />
          </div>
        </div>

        {showShipping && (
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-[var(--text-secondary)]">Shipping</span>
            <input
              value={shipping}
              onChange={e => setShipping(e.target.value)}
              type="number"
              min="0"
              placeholder="0.00"
              inputMode="decimal"
              className="w-24 h-8 px-2 border border-[var(--border-default)] rounded-[var(--radius-sm)] text-sm text-right tabular-nums bg-white outline-none focus:border-[var(--brand-600)] [-moz-appearance:textfield]"
            />
          </div>
        )}

        {/* Totals */}
        <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
          <div className="flex items-center justify-between py-1 text-sm">
            <span className="text-[var(--text-secondary)]">Subtotal</span>
            <span className="text-[var(--text-primary)] tabular-nums">£{totals.subtotal.toFixed(2)}</span>
          </div>

          {vatAmount > 0 && (
            <div className="flex items-center justify-between py-1 text-sm">
              <span className="text-[var(--text-secondary)]">VAT ({vatRate}%)</span>
              <span className="text-[var(--text-primary)] tabular-nums">£{vatAmount.toFixed(2)}</span>
            </div>
          )}

          {totals.hasCISItems && (
            <div className="flex items-center justify-between py-1 mt-1 pt-2 border-t border-dashed border-[var(--danger-100)] text-sm">
              <span className="text-[var(--danger-600)]">
                CIS Deduction
                <span className="text-[11px] text-[var(--text-tertiary)] ml-1.5">
                  ({totals.customerCIS?.rate || `${cisDefaultRate}% — Standard`})
                </span>
              </span>
              <span className="text-[var(--danger-600)] font-semibold tabular-nums">
                −£{totals.cisDeduction.toFixed(2)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 mt-3 border-t-2 border-[var(--text-primary)] text-base font-bold text-[var(--text-primary)]">
            <span>{totals.hasCISItems ? "Total to Pay" : "Total"}</span>
            <span className="tabular-nums">£{Math.max(0, totals.total).toFixed(2)}</span>
          </div>

          {totals.hasCISItems && (
            <div className="mt-3 p-3 bg-[var(--warning-50)] rounded-[var(--radius-md)] border border-[var(--warning-100)] text-xs text-[var(--warning-700)] leading-relaxed">
              <strong>CIS applies.</strong> £{totals.cisDeduction.toFixed(2)} will be deducted at {totals.customerCIS?.rateValue ?? 20}% and paid to HMRC on behalf of {customer?.name || "the subcontractor"}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
