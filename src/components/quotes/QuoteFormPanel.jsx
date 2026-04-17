import { useState, useMemo, useContext } from "react";
import { createPortal } from "react-dom";
import { CUR_SYM, DEFAULT_QUOTE_TERMS, QUOTE_STATUSES } from "../../constants";
import { AppCtx } from "../../context/AppContext";
import { Icons } from "../icons";
import { Field, Input, Textarea, Btn } from "../atoms";
import { LineItemsTable, SaveSplitBtn, A4PrintModal, CustomerPicker } from "../shared";
import { fmt, fmtDate, todayStr, addDays, nextNum, newLine } from "../../utils/helpers";
import { calcTotals } from "../../utils/calcTotals";
import ItemModal from "../../modals/ItemModal";
import { useCISSettings } from "../../hooks/useCISSettings";

const dateInputCls =
  "w-full h-9 px-3 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-white outline-none focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)] transition-colors duration-150 box-border";

const selectInputCls =
  "h-9 px-3 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm bg-white text-[var(--text-primary)] cursor-pointer outline-none focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)] transition-colors duration-150";

function SectionTitle({ children }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">
      {children}
    </div>
  );
}

function Section({ children }) {
  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] p-5 mb-4">
      {children}
    </div>
  );
}

export default function QuoteFormPanel({ existing, onClose, onSave, onConvertToInvoice, asPage = false }) {
  const { customers, catalogItems, setCatalogItems, orgSettings, quotes } = useContext(AppCtx);
  const { cisEnabled, cisDefaultRate } = useCISSettings();
  const isVat = orgSettings?.vatReg === "Yes";
  const currSym = CUR_SYM[orgSettings?.currency || "GBP"] || "£";
  const isEdit = !!existing;
  const q = existing || {};

  const [customer, setCustomer] = useState(q.customer || null);
  const [custSearch, setCustSearch] = useState(q.customer?.name || "");
  const [custOpen, setCustOpen] = useState(false);
  const [issueDate, setIssueDate] = useState(q.issue_date || todayStr());
  const [expiryDate, setExpiryDate] = useState(q.expiry_date || addDays(todayStr(), 30));
  const [items, setItems] = useState((q.line_items && q.line_items.length > 0) ? q.line_items : [newLine(0)]);
  const [discType, setDiscType] = useState(q.discount_type || "percent");
  const [discVal, setDiscVal] = useState(q.discount_value || "");
  const [shipping, setShipping] = useState(q.shipping || "");
  const showShipping = orgSettings?.deliversItems !== false;
  const [notes, setNotes] = useState(q.notes || "");
  const [terms, setTerms] = useState(q.terms || DEFAULT_QUOTE_TERMS);
  const [status, setStatus] = useState(q.status || "Draft");
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [poNumber, setPoNumber] = useState(q.po_number || "");
  const [quoteNumber, setQuoteNumber] = useState(q.quote_number || nextNum("QUO", quotes));
  const isLockedAcceptedQuote = isEdit && q.status === "Invoiced";

  const totals = useMemo(
    () => calcTotals(items, discType, discVal, showShipping ? shipping : 0, isVat, customer, cisEnabled, cisDefaultRate, true),
    [items, discType, discVal, shipping, isVat, customer, showShipping, cisEnabled, cisDefaultRate]
  );
  const vatAmount = totals.taxBreakdown.reduce((sum, tax) => sum + Number(tax.amount || 0), 0);
  const vatRate = totals.taxBreakdown.length === 1 ? totals.taxBreakdown[0].rate : "mixed";

  const docData = {
    docNumber: quoteNumber,
    customer,
    issueDate,
    dueDate: expiryDate,
    paymentTerms: `Valid until ${fmtDate(expiryDate)}`,
    items,
    ...totals,
    cisDeduction: totals.cisEstimate || totals.cisDeduction || 0,
    total: totals.hasCISItems ? totals.grossTotal - (totals.cisEstimate || 0) : totals.total,
    notes,
    terms,
    status,
    poNumber,
    docType: "quote",
  };

  const handleShare = () => {
    const visibility = window.prompt("Share visibility: Public or Private and secure?", "Public");
    if (!visibility) return;
    const expiresOn = window.prompt("Link expiration date (YYYY-MM-DD)", expiryDate || addDays(todayStr(), 30));
    if (!expiresOn) return;
    const mode = visibility.toLowerCase().includes("private") ? "private" : "public";
    const token = crypto.randomUUID();
    const basePath = mode === "public" ? "public" : "secure";
    const shareUrl = `${window.location.origin}/${basePath}/quote/${quoteNumber}?token=${token}&expires=${expiresOn}`;
    window.prompt(
      mode === "private"
        ? "Private link created. Customer will use one-time passcode. Copy link:"
        : "Public link created. Anyone with the link can access before expiry. Copy link:",
      shareUrl
    );
  };

  const buildQuote = (newStatus) => ({
    id: q.id || crypto.randomUUID(),
    quote_number: quoteNumber,
    customer, issue_date: issueDate, expiry_date: expiryDate,
    line_items: items, discount_type: discType, discount_value: discVal,
    shipping: showShipping ? shipping : "", ...totals, notes, terms, po_number: poNumber,
    status: newStatus || status,
  });

  const handleSave = (newStatus) => {
    if (isLockedAcceptedQuote) {
      window.alert("You are not allowed to edit an accepted quote.");
      return;
    }
    setSaving(true);
    setTimeout(() => { onSave(buildQuote(newStatus)); setSaving(false); onClose(); }, 400);
  };

  const handleStatusChange = (nextStatus) => {
    if (isLockedAcceptedQuote) {
      window.alert("You are not allowed to edit an accepted quote.");
      return;
    }
    setStatus(nextStatus);
    if (!isEdit) return;
    if (nextStatus === "Accepted" && q.status !== "Accepted" && window.confirm("Quote accepted. Convert it to invoice now?")) {
      const savedQuote = buildQuote("Accepted");
      onSave(savedQuote);
      onConvertToInvoice?.(savedQuote);
      onClose();
    }
  };

  const handleNewItemSaved = (item) => {
    setCatalogItems(p => [...p, item]);
    const newItem = {
      id: crypto.randomUUID(),
      name: item.name,
      description: item.description || "",
      quantity: 1,
      rate: item.rate,
      tax_rate: isVat ? (item.taxRate || 20) : 0,
      amount: item.rate,
      sort_order: items.length,
    };
    setItems(p => [...p, newItem]);
    setShowItemModal(false);
  };

  const panelContent = (
    <div
      className={asPage
        ? "relative bg-[var(--surface-page)] min-h-screen"
        : "fixed inset-0 bg-black/40 z-[900] flex justify-end"
      }
    >
      {showPrintModal && <A4PrintModal data={docData} currSymbol={currSym} isVat={isVat} onClose={() => setShowPrintModal(false)} />}
      {showItemModal && <ItemModal existing={null} onClose={() => setShowItemModal(false)} onSave={handleNewItemSaved} settings={{ cis: { enabled: cisEnabled } }} />}

      <div
        className={asPage
          ? "w-full max-w-[1280px] mx-auto bg-[var(--surface-page)] flex flex-col"
          : "w-full max-w-[960px] h-full bg-[var(--surface-page)] flex flex-col shadow-[var(--shadow-lg)] overflow-hidden"
        }
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-[var(--surface-card)] border-b border-[var(--border-subtle)] px-4 sm:px-6 py-3 flex items-center justify-between gap-2 flex-wrap">
          <button
            onClick={onClose}
            className="flex items-center gap-1 bg-transparent border-none cursor-pointer text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-150"
          >
            ← Quotes
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            {isEdit && (
              <Btn
                onClick={() => onConvertToInvoice(buildQuote("Invoiced"))}
                disabled={isLockedAcceptedQuote}
                variant="outline"
                icon={<Icons.Receipt />}
              >
                Convert to invoice
              </Btn>
            )}
            <Btn onClick={handleShare} variant="outline" icon={<Icons.Send />}>Share link</Btn>
            <Btn onClick={() => setShowPrintModal(true)} variant="outline" icon={<Icons.Receipt />}>Print / PDF</Btn>
            <SaveSplitBtn
              onSave={() => handleSave()}
              onSaveAndSend={() => handleSave("Sent")}
              onSaveAndPrint={() => handleSave()}
              saving={saving}
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
          {isLockedAcceptedQuote && (
            <div className="mb-3 px-3 py-2.5 border border-[var(--danger-100)] bg-[var(--danger-50)] rounded-[var(--radius-md)] text-sm font-semibold text-[var(--danger-700)]">
              You are not allowed to edit an accepted quote.
            </div>
          )}

          {/* Customer */}
          <Section>
            <SectionTitle>Customer</SectionTitle>
            <CustomerPicker
              customers={customers}
              value={customer}
              onChange={c => {
                setCustomer(c);
                setCustSearch(c.name);
                if (cisEnabled && !!(c?.cis?.registered || c?.taxDetails?.cisRegistered)) {
                  setItems(prev => prev.map(it => ({ ...it, cisApplicable: true })));
                }
              }}
              onClear={() => { setCustomer(null); setCustSearch(""); setCustOpen(false); }}
            />
          </Section>

          {/* Quote details */}
          <Section>
            <SectionTitle>Quote details</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Quote #">
                <Input value={quoteNumber} onChange={setQuoteNumber} />
              </Field>
              <Field label="Issue Date">
                <input
                  value={issueDate}
                  onChange={e => setIssueDate(e.target.value)}
                  type="date"
                  className={dateInputCls}
                />
              </Field>
              <Field label="Expiry Date">
                <input
                  value={expiryDate}
                  onChange={e => setExpiryDate(e.target.value)}
                  type="date"
                  className={dateInputCls}
                />
              </Field>
              <Field label="PO / Reference">
                <Input value={poNumber} onChange={setPoNumber} placeholder="Optional" />
              </Field>
            </div>
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[var(--border-subtle)]">
              <span className="text-sm font-medium text-[var(--text-secondary)]">Status</span>
              <select
                value={status}
                onChange={e => handleStatusChange(e.target.value)}
                className={selectInputCls}
              >
                {QUOTE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </Section>

          {/* Line items */}
          <Section>
            <SectionTitle>Line items</SectionTitle>
            <LineItemsTable
              items={items}
              onChange={setItems}
              currSymbol={currSym}
              catalogItems={catalogItems}
              isVat={isVat}
              onAddNewItem={() => setShowItemModal(true)}
              isCISInvoice={cisEnabled && !!(customer?.cis?.registered || customer?.taxDetails?.cisRegistered)}
            />
          </Section>

          {/* Notes + Totals */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 mb-10 items-start">
            <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] p-5">
              <SectionTitle>Notes &amp; terms</SectionTitle>
              <Field label="Notes (shown on quote)">
                <Textarea value={notes} onChange={setNotes} rows={3} placeholder="e.g. This quote is valid for 30 days." />
              </Field>
              <Field label="Terms & Conditions">
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
                            "px-2 py-0.5 text-[11px] font-semibold cursor-pointer border-none transition-colors duration-150",
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
                    className="w-16 h-7 px-2 border border-[var(--border-default)] rounded-[var(--radius-sm)] text-sm text-right tabular-nums bg-white outline-none focus:border-[var(--brand-600)] [-moz-appearance:textfield]"
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
                    className="w-24 h-7 px-2 border border-[var(--border-default)] rounded-[var(--radius-sm)] text-sm text-right tabular-nums bg-white outline-none focus:border-[var(--brand-600)] [-moz-appearance:textfield]"
                  />
                </div>
              )}

              {/* Totals */}
              <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
                <div className="flex items-center justify-between py-1 text-sm">
                  <span className="text-[var(--text-secondary)]">Subtotal</span>
                  <span className="text-[var(--text-primary)] tabular-nums">{fmt(currSym, totals.subtotal)}</span>
                </div>

                {vatAmount > 0 && (
                  <div className="flex items-center justify-between py-1 text-sm">
                    <span className="text-[var(--text-secondary)]">VAT ({vatRate}%)</span>
                    <span className="text-[var(--text-primary)] tabular-nums">{fmt(currSym, vatAmount)}</span>
                  </div>
                )}

                {totals.hasCISItems && (
                  <div className="flex items-center justify-between py-1 mt-1 pt-2 border-t border-dashed border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--warning-600)]" />
                      Est. CIS Deduction
                      <span className="text-[11px] text-[var(--text-tertiary)] ml-1">
                        ({totals.customerCIS?.rate || "20% — Standard"})
                      </span>
                    </span>
                    <span className="tabular-nums">−{fmt(currSym, totals.cisEstimate)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 mt-3 border-t-2 border-[var(--text-primary)] text-base font-bold text-[var(--text-primary)]">
                  <span>Quote total</span>
                  <span className="tabular-nums">{fmt(currSym, totals.subtotal + vatAmount - (totals.cisEstimate || 0))}</span>
                </div>

                {totals.hasCISItems && (
                  <div className="mt-3 px-3 py-2.5 bg-[var(--warning-50)] rounded-[var(--radius-md)] border border-[var(--warning-100)] text-xs text-[var(--warning-700)] leading-relaxed">
                    <strong>Note:</strong> This quote includes CIS-applicable items. If converted to an invoice, {fmt(currSym, totals.cisEstimate)} will be deducted at {totals.customerCIS?.rateValue ?? 20}% and paid directly to HMRC.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (asPage) return panelContent;
  return createPortal(panelContent, document.body);
}
