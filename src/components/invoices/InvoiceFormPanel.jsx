import { Icons } from "../icons";
import { Field, Input, Select, Btn, SlideToggle, InfoBox } from "../atoms";
import { LineItemsTable, SaveSplitBtn, PaidConfirmModal, A4PrintModal, CustomerPicker, PaymentTermsSelect } from "../shared";
import { addDays, todayStr } from "../../utils/helpers";
import ItemModal from "../../modals/ItemModal";
import { taxPointExplanation } from "../../utils/taxPoint";
import ReceivedSelfBillModal from "./ReceivedSelfBillModal";
import { useInvoiceForm } from "./useInvoiceForm";
import InvoiceTotalsPanel from "./InvoiceTotalsPanel";
import ShareLinkModal from "../shared/ShareLinkModal";

const STATUSES = ["Draft", "Sent", "Overdue", "Paid", "Void", "Partial"];

const dateInputCls =
  "w-full h-9 px-3 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-white outline-none focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)] transition-colors duration-150 box-border";

const selectInputCls =
  "h-9 px-3 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm bg-white text-[var(--text-primary)] cursor-pointer outline-none focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)] transition-colors duration-150";

export function SectionTitle({ children }) {
  return (
    <div className="text-[13px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">
      {children}
    </div>
  );
}

export function Section({ children }) {
  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] p-5 mb-4">
      {children}
    </div>
  );
}

export default function InvoiceFormPanel({ existing, onClose, onSave, onConvertFromQuote }) {
  const f = useInvoiceForm({ existing, onClose, onSave, onConvertFromQuote });
  const {
    customers, catalogItems, orgSettings, inv,
    customer, issueDate, supplyDate, dueDate,
    payTerms, paymentTerm, items, discType, discVal,
    shipping, showShipping, notes, terms, status, template,
    invNumber, invNumError, poNumber, recurringEnabled, recurFreq,
    recurringNextDate, showPrintModal, showPaidModal, showItemModal,
    showImportSb, showShareModal, saving, sbaBlock, selectedQuoteId,
    setCustomer, setCustSearch, setCustOpen, setIssueDate, setSupplyDate,
    setDueDate, setItems, setDiscType, setDiscVal, setShipping,
    setNotes, setTerms, setStatus, setInvNumber, setInvNumError,
    setPoNumber, setRecurringEnabled, setRecurFreq, setRecurringNextDate,
    setShowPrintModal, setShowPaidModal, setShowItemModal, setShowImportSb,
    setShowShareModal,
    setPayTerms, setSbaBlock, setSelectedQuoteId,
    _dueDateOverridden,
    isEdit, isVat, currSym, totals, taxPointResult, docData,
    activeInvoiceTemplate, acceptedQuotes, cisEnabled, cisDefaultRate,
    handlePaymentTermChange, handleSave, handlePaidConfirm,
    handleShare, handleNewItemSaved,
  } = f;

  return (
    <>
      {showPaidModal && (
        <PaidConfirmModal
          invoice={{ ...docData, invoice_number: docData.docNumber, currency: orgSettings?.currency || "GBP" }}
          onConfirm={handlePaidConfirm}
          onCancel={() => setShowPaidModal(false)}
        />
      )}
      {showPrintModal && (
        <A4PrintModal
          data={docData}
          currSymbol={currSym}
          isVat={isVat}
          onClose={() => setShowPrintModal(false)}
          invoiceTemplate={activeInvoiceTemplate}
        />
      )}
      {showItemModal && (
        <ItemModal
          existing={null}
          onClose={() => setShowItemModal(false)}
          onSave={handleNewItemSaved}
          settings={{ cis: { enabled: cisEnabled } }}
        />
      )}

      <div className="bg-[var(--surface-page)] min-h-screen">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-[var(--surface-card)] border-b border-[var(--border-subtle)] px-4 sm:px-6 py-3 flex items-center justify-between gap-2 flex-wrap">
          <button
            onClick={onClose}
            className="flex items-center gap-1 bg-transparent border-none cursor-pointer text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-150"
          >
            ← Invoices
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            {isEdit && status !== "Paid" && (
              <Btn onClick={() => setShowPaidModal(true)} variant="success" icon={<Icons.Check />}>Mark paid</Btn>
            )}
            <Btn onClick={() => setShowPrintModal(true)} variant="outline" icon={<Icons.Receipt />}>Print / PDF</Btn>
            <Btn onClick={handleShare} variant="outline" icon={<Icons.Send />}>Share link</Btn>
            {sbaBlock ? (
              <button
                type="button" disabled
                title="Save blocked — customer has an active self-billing agreement"
                className="h-9 px-4 rounded-[var(--radius-md)] bg-[var(--text-primary)] opacity-50 text-white text-sm font-semibold cursor-not-allowed flex items-center gap-1.5 border-none"
              >
                <Icons.Save /> Save
              </button>
            ) : (
              <SaveSplitBtn
                onSave={() => handleSave()}
                onSaveAndSend={() => handleSave("Sent")}
                onSaveAndPrint={() => { handleSave(); }}
                saving={saving}
              />
            )}
          </div>
        </div>

        {/* Body */}
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-5">
          {/* Customer section */}
          <Section>
            <SectionTitle>Customer</SectionTitle>
            <CustomerPicker
              customers={customers}
              value={customer}
              onChange={c => {
                setCustomer(c);
                setCustSearch(c.name);
                if (!isEdit || !inv.payment_terms) {
                  const nextTerms = c.paymentTerms || "Net 30";
                  setPayTerms(nextTerms);
                  const map = { "Net 30": 30, "Net 15": 15, "Net 7": 7, "Net 60": 60, "Net 90": 90, "Due on Receipt": 0 };
                  if (nextTerms === "Custom") setDueDate(addDays(issueDate, Number(c.customPaymentDays) || 30));
                  else if (map[nextTerms] !== undefined) setDueDate(addDays(issueDate, map[nextTerms]));
                }
                const isCISApplicable = cisEnabled
                  && !!(c?.cis?.registered || c?.taxDetails?.cisRegistered);
                if (isCISApplicable) {
                  setItems(prev => prev.map(it => ({ ...it, cisApplicable: true })));
                }
              }}
              onClear={() => { setCustomer(null); setCustSearch(""); setCustOpen(false); setSbaBlock(null); }}
            />
            {sbaBlock && (
              <div className="mt-2 px-3 py-2 bg-[var(--danger-50)] border border-[var(--danger-100)] rounded-[var(--radius-md)] text-sm text-[var(--danger-700)] flex items-start justify-between gap-3 flex-wrap">
                <div>
                  This customer issues self-billed invoices to you. You cannot create your own invoice while
                  Agreement <span className="font-mono">{String(sbaBlock.id).slice(0, 8)}</span> v{sbaBlock.version ?? 1} is active
                  (expires {sbaBlock.end_date}).
                </div>
                <button
                  type="button"
                  onClick={() => setShowImportSb(true)}
                  className="h-8 px-3 rounded-[var(--radius-md)] bg-[var(--danger-600)] hover:bg-[var(--danger-700)] text-white text-xs font-semibold cursor-pointer border-none whitespace-nowrap"
                >
                  Import received self-bill instead
                </button>
              </div>
            )}
            {cisEnabled && customer?.cis?.registered && (
              <div className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 bg-[var(--warning-50)] border border-[var(--warning-100)] rounded-full text-[11px] font-semibold text-[var(--warning-700)]">
                <Icons.Alert />
                CIS Registered · {customer.cis.rate || `${cisDefaultRate}%`}
              </div>
            )}
            {!isEdit && acceptedQuotes.length > 0 && (
              <div className="mt-3 p-3 border border-[var(--success-100)] rounded-[var(--radius-md)] bg-[var(--success-50)]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-[var(--success-700)]">Convert accepted quote</span>
                  <Select
                    value={selectedQuoteId}
                    onChange={setSelectedQuoteId}
                    placeholder="Choose accepted quote"
                    options={acceptedQuotes.map(q => ({
                      value: q.id,
                      label: `${q.quote_number} · ${q.customer?.name || "No customer"}`,
                    }))}
                    style={{ maxWidth: 360 }}
                  />
                </div>
              </div>
            )}
          </Section>

          {cisEnabled && customer && !customer?.cis?.registered && !customer?.taxDetails?.cisRegistered && (
            <div className="mb-4">
              <InfoBox color="var(--warning-600)">
                CIS cannot be applied — customer is not CIS registered.
              </InfoBox>
            </div>
          )}

          {/* Invoice details */}
          <Section>
            <SectionTitle>Invoice details</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Invoice #" error={invNumError || undefined}>
                <Input
                  value={invNumber}
                  onChange={v => { setInvNumber(v); if (invNumError) setInvNumError(""); }}
                  error={!!invNumError}
                />
              </Field>
              <Field label="Issue Date">
                <input
                  value={issueDate}
                  onChange={e => { _dueDateOverridden.current = false; setIssueDate(e.target.value); }}
                  type="date"
                  className={dateInputCls}
                />
              </Field>
              <Field label="Supply Date" hint="Date goods delivered or services completed">
                <input
                  value={supplyDate}
                  onChange={e => setSupplyDate(e.target.value)}
                  type="date"
                  className={dateInputCls}
                />
              </Field>
              {isVat && (
                <Field label="Tax Point" hint={taxPointExplanation(taxPointResult.rule)}>
                  <input
                    value={taxPointResult.taxPoint}
                    readOnly
                    className={`${dateInputCls} bg-[var(--surface-sunken)] text-[var(--text-secondary)]`}
                  />
                </Field>
              )}
              <Field label="Payment Terms">
                <PaymentTermsSelect
                  value={paymentTerm}
                  onChange={handlePaymentTermChange}
                />
              </Field>
              <Field label="Due Date">
                <input
                  value={dueDate}
                  onChange={e => { _dueDateOverridden.current = true; setDueDate(e.target.value); }}
                  type="date"
                  className={dateInputCls}
                />
              </Field>
              <Field label="PO Number">
                <Input value={poNumber} onChange={setPoNumber} placeholder="Optional" />
              </Field>
            </div>

            <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-[var(--border-subtle)] flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">Status</span>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className={selectInputCls}
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">Recurring</span>
                <SlideToggle value={recurringEnabled} onChange={setRecurringEnabled} />
                {recurringEnabled && (
                  <>
                    <Select
                      value={recurFreq}
                      onChange={setRecurFreq}
                      options={["Weekly", "Monthly", "Quarterly", "Annually"]}
                    />
                    <input
                      value={recurringNextDate}
                      onChange={e => setRecurringNextDate(e.target.value)}
                      type="date"
                      className={dateInputCls}
                      style={{ maxWidth: 160 }}
                    />
                  </>
                )}
              </div>
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

          <InvoiceTotalsPanel
            notes={notes} setNotes={setNotes} terms={terms} setTerms={setTerms}
            discType={discType} setDiscType={setDiscType} discVal={discVal} setDiscVal={setDiscVal}
            shipping={shipping} setShipping={setShipping} showShipping={showShipping}
            currSym={currSym} totals={totals} cisDefaultRate={cisDefaultRate} customer={customer}
          />
        </div>
      </div>
      {showImportSb && (
        <ReceivedSelfBillModal
          initialCustomerId={customer?.id || null}
          onClose={() => setShowImportSb(false)}
          onSaved={(inv) => { setShowImportSb(false); onSave?.(inv); }}
        />
      )}
      <ShareLinkModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        docType="invoice"
        docNumber={invNumber}
        defaultExpiry={dueDate || addDays(todayStr(), 30)}
      />
    </>
  );
}
