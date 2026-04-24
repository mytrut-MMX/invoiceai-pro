import { useState, useContext, useMemo, useEffect, useRef } from "react";
import { CUR_SYM, DEFAULT_INV_TERMS } from "../../constants";
import { AppCtx } from "../../context/AppContext";
import { Icons } from "../icons";
import { Field, Input, Select, Textarea, Btn, SlideToggle, InfoBox } from "../atoms";
import { LineItemsTable, SaveSplitBtn, PaidConfirmModal, A4PrintModal, CustomerPicker, PaymentTermsSelect } from "../shared";
import { todayStr, addDays, nextNum, newLine } from "../../utils/helpers";
import { calcTotals } from "../../utils/calcTotals";
import ItemModal from "../../modals/ItemModal";
import { useCISSettings } from "../../hooks/useCISSettings";
import { postInvoiceEntry, reverseEntry, findEntryBySource } from "../../utils/ledger/ledgerService";
import { fetchUserAccounts } from "../../utils/ledger/fetchUserAccounts";
import { getDefaultTemplate, getTemplateById } from "../../utils/InvoiceTemplateSchema";
import { calculateTaxPoint, taxPointExplanation } from "../../utils/taxPoint";
import { useToast } from "../ui/Toast";
import { getDefaultPaymentTerm, listPaymentTerms, computeDueDate } from "../../lib/paymentTerms";
import { getActiveSbaForCustomer } from "../../lib/selfBilling/sbaService";
import ReceivedSelfBillModal from "./ReceivedSelfBillModal";

const STATUSES = ["Draft", "Sent", "Overdue", "Paid", "Void", "Partial"];

const dateInputCls =
  "w-full h-9 px-3 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-white outline-none focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)] transition-colors duration-150 box-border";

const selectInputCls =
  "h-9 px-3 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm bg-white text-[var(--text-primary)] cursor-pointer outline-none focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)] transition-colors duration-150";

function SectionTitle({ children }) {
  return (
    <div className="text-[13px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">
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

export default function InvoiceFormPanel({ existing, onClose, onSave, onConvertFromQuote }) {
  const { customers, catalogItems, setCatalogItems, orgSettings, invoices, setPayments, payments, quotes, user } = useContext(AppCtx);
  const { cisEnabled, cisDefaultRate } = useCISSettings();
  const { toast } = useToast();
  const isVat = orgSettings?.vatReg === "Yes";
  const currSym = CUR_SYM[orgSettings?.currency || "GBP"] || "£";
  const isEdit = !!existing;
  const inv = existing || {};

  const [customer, setCustomer] = useState(inv.customer || null);
  const [custSearch, setCustSearch] = useState(inv.customer?.name || "");
  const [custOpen, setCustOpen] = useState(false);
  const [issueDate, setIssueDate] = useState(inv.issue_date || todayStr());
  const [supplyDate, setSupplyDate] = useState(inv.supply_date || inv.issue_date || todayStr());
  const [payTerms, setPayTerms] = useState(inv.payment_terms || customer?.paymentTerms || "Net 30");
  const [customDays, setCustomDays] = useState(inv.custom_payment_days || "");
  const [dueDate, setDueDate] = useState(inv.due_date || addDays(todayStr(), 30));
  const [paymentTerm, setPaymentTerm] = useState(null);
  // true for edits (preserve existing due date); false for new invoices
  const _dueDateOverridden = useRef(isEdit);
  const [items, setItems] = useState((inv.line_items && inv.line_items.length > 0) ? inv.line_items : [newLine(0)]);
  const [discType, setDiscType] = useState(inv.discount_type || "percent");
  const [discVal, setDiscVal] = useState(inv.discount_value || "");
  const [shipping, setShipping] = useState(inv.shipping || "");
  const showShipping = orgSettings?.deliversItems !== false;
  const [notes, setNotes] = useState(inv.notes || "");
  const [terms, setTerms] = useState(inv.terms || DEFAULT_INV_TERMS);
  const [status, setStatus] = useState(inv.status || "Draft");
  const [template, setTemplate] = useState(inv.template || "classic");
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [templateId] = useState(inv.templateId || null);
  const [showPaidModal, setShowPaidModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recurringEnabled, setRecurringEnabled] = useState(inv.recurring || false);
  const [recurFreq, setRecurFreq] = useState(inv.recurring_frequency || "Monthly");
  const [recurringNextDate, setRecurringNextDate] = useState(inv.recurring_next_date || addDays(issueDate, 30));
  const [poNumber, setPoNumber] = useState(inv.po_number || "");
  const [invNumber, setInvNumber] = useState(inv.invoice_number || nextNum("INV", invoices));
  const [invNumError, setInvNumError] = useState("");
  const acceptedQuotes = useMemo(() => (quotes || []).filter(q => q.status === "Accepted"), [quotes]);
  const [selectedQuoteId, setSelectedQuoteId] = useState("");

  // Double-invoicing guard: if the selected customer has an active received-
  // direction SBA, block direct invoicing and route the user to the import
  // flow instead. Applies to new invoices only — edits bypass so that legacy
  // direct invoices created before the SBA was signed remain editable.
  const [sbaBlock, setSbaBlock] = useState(null);
  const [showImportSb, setShowImportSb] = useState(false);
  const [rehydrated, setRehydrated] = useState(false);

  useEffect(() => {
    if (rehydrated || !customer?.id || !customers?.length) return;
    const fresh = customers.find(c => c.id === customer.id);
    if (!fresh) return;
    setCustomer(prev => ({ ...prev, ...fresh, name: prev.name || fresh.name }));
    setRehydrated(true);
  }, [customers]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    if (isEdit || !customer?.id || !user?.id) { setSbaBlock(null); return; }
    (async () => {
      try {
        const sba = await getActiveSbaForCustomer({ userId: user.id, customerId: customer.id });
        if (!cancelled) setSbaBlock(sba || null);
      } catch { if (!cancelled) setSbaBlock(null); }
    })();
    return () => { cancelled = true; };
  }, [isEdit, customer?.id, user?.id]);

  useEffect(() => {
    if (!selectedQuoteId || !onConvertFromQuote) return;
    onConvertFromQuote(selectedQuoteId);
    setSelectedQuoteId("");
  }, [selectedQuoteId, onConvertFromQuote]);

  // Load payment term object for new invoices (default) or existing invoices (by id)
  useEffect(() => {
    if (isEdit && inv.payment_term_id) {
      listPaymentTerms().then(({ data }) => {
        const term = (data || []).find((t) => t.id === inv.payment_term_id);
        if (term) setPaymentTerm(term);
      });
    } else if (!isEdit) {
      getDefaultPaymentTerm().then(({ data }) => {
        if (!data) return;
        setPaymentTerm(data);
        setPayTerms(data.name);
        if (data.type === "custom") setCustomDays(String(data.days ?? ""));
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-recalc due date when term / customDays / issueDate changes (unless manually overridden)
  useEffect(() => {
    if (_dueDateOverridden.current || !paymentTerm || !issueDate) return;
    const effectiveTerm =
      paymentTerm.type === "custom"
        ? { ...paymentTerm, days: Number(customDays) || 0 }
        : paymentTerm;
    const due = computeDueDate(issueDate, effectiveTerm);
    setDueDate(due.toISOString().slice(0, 10));
  }, [paymentTerm, customDays, issueDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const totals = useMemo(
    () => calcTotals(items, discType, discVal, showShipping ? shipping : 0, isVat, customer, cisEnabled, cisDefaultRate),
    [items, discType, discVal, shipping, isVat, customer, showShipping, cisEnabled, cisDefaultRate]
  );
  const vatAmount = totals.taxBreakdown.reduce((sum, tax) => sum + Number(tax.amount || 0), 0);
  const vatRate = totals.taxBreakdown.length === 1 ? totals.taxBreakdown[0].rate : "mixed";
  const taxPointResult = useMemo(
    () => calculateTaxPoint(issueDate, supplyDate),
    [issueDate, supplyDate]
  );

  const handlePaymentTermChange = (term, days) => {
    setPaymentTerm(term);
    setPayTerms(term.name);
    setCustomDays(days != null ? String(days) : "");
    _dueDateOverridden.current = false;
  };

  const docData = {
    docNumber: invNumber, customer, issueDate, dueDate, paymentTerms: payTerms, items,
    ...totals, notes, terms, status, poNumber, docType: "invoice", templateId,
  };
  const activeInvoiceTemplate = getTemplateById(templateId) || getDefaultTemplate();

  const buildInvoice = (newStatus) => ({
    id: inv.id || crypto.randomUUID(),
    invoice_number: invNumber,
    customer, issue_date: issueDate, supply_date: supplyDate, tax_point: taxPointResult.taxPoint, due_date: dueDate,
    payment_terms: payTerms, custom_payment_days: customDays,
    payment_term_id: paymentTerm?.id || null,
    payment_terms_label: paymentTerm?.name || payTerms || null,
    payment_terms_days: paymentTerm?.type === "custom" ? (Number(customDays) || null) : (paymentTerm?.days ?? null),
    payment_terms_type: paymentTerm?.type || null,
    line_items: items, discount_type: discType, discount_value: discVal,
    shipping: showShipping ? shipping : "", ...totals, notes, terms, po_number: poNumber,
    status: newStatus || status, template, templateId,
    recurring: recurringEnabled, recurring_frequency: recurFreq,
    recurring_next_date: recurringEnabled ? recurringNextDate : "",
    activity: inv.activity || [],
  });

  const handleSave = (newStatus) => {
    const duplicate = invoices.some(x => x.invoice_number === invNumber && x.id !== inv.id);
    if (duplicate) {
      setInvNumError(`Invoice number "${invNumber}" already exists. Please use a unique number.`);
      toast({ title: "Duplicate invoice number", variant: "warning" });
      return;
    }
    setInvNumError("");
    setSaving(true);
    setTimeout(() => {
      const previousStatus = inv.status || "Draft";
      const nextStatus = newStatus || status;
      const savedInvoice = buildInvoice(newStatus);
      const action = !isEdit
        ? "Created"
        : nextStatus !== previousStatus
          ? `Status changed to ${nextStatus}`
          : "Updated";
      savedInvoice.activity = [
        ...(inv.activity || []),
        { action, timestamp: new Date().toISOString(), actor: user?.name || "Unknown" },
      ];
      onSave(savedInvoice);
      toast({ title: `Invoice ${invNumber} saved`, variant: "success" });
      ;(async () => {
        try {
          const { accounts, userId } = await fetchUserAccounts();
          if (!userId) return;
          if (isEdit) {
            const oldEntry = await findEntryBySource("invoice", inv.id);
            if (oldEntry) await reverseEntry(oldEntry.id, userId);
          }
          await postInvoiceEntry(savedInvoice, accounts, userId, orgSettings?.vatScheme || "Standard", orgSettings?.accountingBasis || "Accrual");
        } catch (err) {
          console.error("[Ledger] invoice post failed:", err);
        }
      })();
      if (nextStatus === "Paid" && previousStatus !== "Paid") {
        setPayments(p => [{
          id: crypto.randomUUID(),
          invoice_id: savedInvoice.id,
          invoice_number: savedInvoice.invoice_number,
          customer_name: customer?.name || "",
          amount: totals.total,
          date: todayStr(),
          method: "Bank Transfer",
          reference: "Status changed to Paid",
          status: "Reconciled",
        }, ...p]);
      }
      setSaving(false);
      onClose();
    }, 400);
  };

  const handlePaidConfirm = ({ date, method, reference }) => {
    const saved = buildInvoice("Paid");
    saved.activity = [
      ...(inv.activity || []),
      { action: "Marked Paid", timestamp: new Date().toISOString(), actor: user?.name || "Unknown" },
    ];
    onSave(saved);
    toast({ title: "Invoice marked as paid", variant: "success" });
    const existingPaid = (payments || [])
      .filter(p => p.invoice_id === saved.id)
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    if (existingPaid < totals.total) {
      const paymentAmount = existingPaid > 0 ? totals.total - existingPaid : totals.total;
      setPayments(p => [{
        id: crypto.randomUUID(),
        invoice_id: saved.id,
        invoice_number: saved.invoice_number,
        customer_name: customer?.name || "",
        amount: paymentAmount,
        date, method, reference,
        status: "Reconciled",
      }, ...p]);
    }
    setShowPaidModal(false);
    onClose();
  };

  const handleShare = () => {
    const visibility = window.prompt("Share visibility: Public or Private and secure?", "Public");
    if (!visibility) return;
    const expiresOn = window.prompt("Link expiration date (YYYY-MM-DD)", dueDate || addDays(todayStr(), 30));
    if (!expiresOn) return;
    const mode = visibility.toLowerCase().includes("private") ? "private" : "public";
    // AUTH-005: Use full UUID (122 bits entropy) instead of truncated 8-char segment (32 bits)
    const token = crypto.randomUUID();
    const basePath = mode === "public" ? "public" : "secure";
    // AUTH-006: Client-side expiry check — not tamper-proof.
    // TODO: Move share link validation to a server-side API endpoint
    // that verifies token + expiry from database before returning document.
    const shareUrl = `${window.location.origin}/${basePath}/invoice/${invNumber}?token=${token}&expires=${expiresOn}`;
    window.prompt(
      mode === "private"
        ? "Private link created. Customer will use one-time passcode. Copy link:"
        : "Public link created. Anyone with the link can access before expiry. Copy link:",
      shareUrl
    );
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
                const cisRole = c?.cis?.businessType || "";
                const isCISApplicable = cisEnabled
                  && !!(c?.cis?.registered || c?.taxDetails?.cisRegistered)
                  && (cisRole === "Contractor" || cisRole === "Both");
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
                CIS {customer.cis.businessType || "Registered"} · {customer.cis.rate || "20%"}
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

          {cisEnabled && customer && (() => {
            const reg = !!(customer?.cis?.registered || customer?.taxDetails?.cisRegistered);
            const role = customer?.cis?.businessType || "";
            if (!reg) {
              return (
                <div className="mb-4">
                  <InfoBox color="var(--warning-600)">
                    CIS cannot be applied — customer is not CIS registered.
                  </InfoBox>
                </div>
              );
            }
            if (role === "Subcontractor") {
              return (
                <div className="mb-4">
                  <InfoBox color="var(--warning-600)">
                    CIS deductions do not apply — {customer.name} is a Subcontractor. CIS deductions are made on bills, not invoices.
                  </InfoBox>
                </div>
              );
            }
            return null;
          })()}

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
              isCISInvoice={cisEnabled && !!(customer?.cis?.registered || customer?.taxDetails?.cisRegistered) && (customer?.cis?.businessType === "Contractor" || customer?.cis?.businessType === "Both")}
            />
          </Section>

          {/* Notes + Totals */}
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
                        ({totals.customerCIS?.rate || "20% — Standard"})
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
        </div>
      </div>
      {showImportSb && (
        <ReceivedSelfBillModal
          initialCustomerId={customer?.id || null}
          onClose={() => setShowImportSb(false)}
          onSaved={(inv) => { setShowImportSb(false); onSave?.(inv); }}
        />
      )}
    </>
  );
}
