import { useState, useContext, useMemo, useEffect, useRef } from "react";
import { CUR_SYM, DEFAULT_INV_TERMS } from "../../constants";
import { AppCtx } from "../../context/AppContext";
import { todayStr, addDays, nextNum, newLine } from "../../utils/helpers";
import { calcTotals } from "../../utils/calcTotals";
import { useCISSettings } from "../../hooks/useCISSettings";
import { postInvoiceEntry, reverseEntry, findEntryBySource } from "../../utils/ledger/ledgerService";
import { fetchUserAccounts } from "../../utils/ledger/fetchUserAccounts";
import { getDefaultTemplate, getTemplateById } from "../../utils/InvoiceTemplateSchema";
import { calculateTaxPoint } from "../../utils/taxPoint";
import { useToast } from "../ui/Toast";
import { getDefaultPaymentTerm, listPaymentTerms, computeDueDate } from "../../lib/paymentTerms";
import { getActiveSbaForCustomer } from "../../lib/selfBilling/sbaService";

export function useInvoiceForm({ existing, onClose, onSave, onConvertFromQuote }) {
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
  const [payTerms, setPayTerms] = useState(inv.payment_terms || customer?.paymentTerms || orgSettings?.invoiceDefaults?.paymentTerms || "Net 30");
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
  const [notes, setNotes] = useState(inv.notes || orgSettings?.invoiceDefaults?.notes || "");
  const [terms, setTerms] = useState(inv.terms || orgSettings?.invoiceDefaults?.terms || DEFAULT_INV_TERMS);
  const [status, setStatus] = useState(inv.status || "Draft");
  const [template, setTemplate] = useState(inv.template || orgSettings?.invoiceDefaults?.template || "classic");
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [templateId] = useState(inv.templateId || null);
  const [showPaidModal, setShowPaidModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recurringEnabled, setRecurringEnabled] = useState(inv.recurring || false);
  const [recurFreq, setRecurFreq] = useState(inv.recurring_frequency || "Monthly");
  const [recurringNextDate, setRecurringNextDate] = useState(inv.recurring_next_date || addDays(issueDate, 30));
  const [poNumber, setPoNumber] = useState(inv.po_number || "");
  const [invNumber, setInvNumber] = useState(inv.invoice_number || nextNum("INV", invoices));
  const [invNumError, setInvNumError] = useState("");
  const acceptedQuotes = useMemo(() => (quotes || []).filter(q => q.status === "Accepted"), [quotes]);
  const [selectedQuoteId, setSelectedQuoteId] = useState("");

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

  const handleShare = () => setShowShareModal(true);

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

  return {
    // Context
    customers, catalogItems, orgSettings, inv,
    // State values
    customer, custSearch, custOpen, issueDate, supplyDate, dueDate,
    payTerms, customDays, paymentTerm, items, discType, discVal,
    shipping, showShipping, notes, terms, status, template,
    invNumber, invNumError, poNumber, recurringEnabled, recurFreq,
    recurringNextDate, showPrintModal, showPaidModal, showItemModal,
    showImportSb, showShareModal, saving, sbaBlock, selectedQuoteId,
    // Setters
    setCustomer, setCustSearch, setCustOpen, setIssueDate, setSupplyDate,
    setDueDate, setItems, setDiscType, setDiscVal, setShipping,
    setNotes, setTerms, setStatus, setTemplate, setInvNumber, setInvNumError,
    setPoNumber, setRecurringEnabled, setRecurFreq, setRecurringNextDate,
    setShowPrintModal, setShowPaidModal, setShowItemModal, setShowImportSb,
    setShowShareModal,
    setPayTerms, setSbaBlock, setSelectedQuoteId,
    // Refs
    _dueDateOverridden,
    // Computed
    isEdit, isVat, currSym, totals, taxPointResult, docData,
    activeInvoiceTemplate, acceptedQuotes, cisEnabled, cisDefaultRate,
    // Handlers
    handlePaymentTermChange, handleSave, handlePaidConfirm,
    handleShare, handleNewItemSaved,
  };
}
