import { useState, useMemo, useContext } from "react";
import { createPortal } from "react-dom";
import { ff, CUR_SYM, DEFAULT_QUOTE_TERMS, QUOTE_STATUSES } from "../../constants";
import { AppCtx } from "../../context/AppContext";
import { Icons } from "../icons";
import { Field, Input, Textarea, Btn } from "../atoms";
import { LineItemsTable, SaveSplitBtn, A4PrintModal, CustomerPicker } from "../shared";
import { fmt, fmtDate, todayStr, addDays, nextNum, newLine } from "../../utils/helpers";
import { calcTotals } from "../../utils/calcTotals";
import ItemModal from "../../modals/ItemModal";
import { useCISSettings } from "../../hooks/useCISSettings";

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

  const totals = useMemo(() => calcTotals(items, discType, discVal, showShipping ? shipping : 0, isVat, customer, cisEnabled, cisDefaultRate, true), [items, discType, discVal, shipping, isVat, customer, showShipping, cisEnabled, cisDefaultRate]);
  const vatAmount = totals.taxBreakdown.reduce((sum, tax) => sum + Number(tax.amount || 0), 0);
  const vatRate = totals.taxBreakdown.length === 1 ? totals.taxBreakdown[0].rate : "mixed";

  const docData = { docNumber: quoteNumber, customer, issueDate, dueDate: expiryDate, paymentTerms: `Valid until ${fmtDate(expiryDate)}`, items, ...totals, cisDeduction: totals.cisEstimate || totals.cisDeduction || 0, total: totals.hasCISItems ? totals.grossTotal - (totals.cisEstimate || 0) : totals.total, notes, terms, status, poNumber, docType: "quote" };

  const handleShare = () => {
    const visibility = window.prompt("Share visibility: Public or Private and secure?", "Public");
    if (!visibility) return;
    const expiresOn = window.prompt("Link expiration date (YYYY-MM-DD)", expiryDate || addDays(todayStr(), 30));
    if (!expiresOn) return;
    const mode = visibility.toLowerCase().includes("private") ? "private" : "public";
    // AUTH-005: Use full UUID (122 bits entropy) instead of truncated 8-char segment (32 bits)
    const token = crypto.randomUUID();
    const basePath = mode === "public" ? "public" : "secure";
    // AUTH-006: Client-side expiry check — not tamper-proof.
    // TODO: Move share link validation to a server-side API endpoint
    // that verifies token + expiry from database before returning document.
    const shareUrl = `${window.location.origin}/${basePath}/quote/${quoteNumber}?token=${token}&expires=${expiresOn}`;
    window.prompt(mode === "private"
      ? "Private link created. Customer will use one-time passcode. Copy link:"
      : "Public link created. Anyone with the link can access before expiry. Copy link:", shareUrl);
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
    const newItem = { id: crypto.randomUUID(), name: item.name, description: item.description || "", quantity: 1, rate: item.rate, tax_rate: isVat ? (item.taxRate || 20) : 0, amount: item.rate, sort_order: items.length };
    setItems(p => [...p, newItem]);
    setShowItemModal(false);
  };

  const panelContent = (
    <div style={{ position: asPage ? "relative" : "fixed", inset: asPage ? "auto" : 0, background: asPage ? "transparent" : "rgba(0,0,0,0.4)", zIndex: asPage ? "auto" : 900, display: "flex", justifyContent: asPage ? "center" : "flex-end" }}>
      {showPrintModal && <A4PrintModal data={docData} currSymbol={currSym} isVat={isVat} onClose={() => setShowPrintModal(false)} />}
      {showItemModal && <ItemModal existing={null} onClose={() => setShowItemModal(false)} onSave={handleNewItemSaved} settings={{ cis: { enabled: cisEnabled } }} />}
      <div style={{ width: "100%", maxWidth: 860, height: asPage ? "auto" : "100%", minHeight: asPage ? "calc(100vh - 180px)" : "100%", background: "#f4f5f7", display: "flex", flexDirection: "column", boxShadow: asPage ? "0 12px 34px rgba(0,0,0,0.10)" : "-8px 0 40px rgba(0,0,0,0.16)", borderRadius: asPage ? 12 : 0, overflow: "hidden", fontFamily: ff }}>
        <div style={{ position: "sticky", top: 0, zIndex: 10, background: "#fff", borderBottom: "1px solid #e8e8ec", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: 13, fontFamily: ff }}>
            ← Quotes
          </button>
          <div style={{ flex: 1, minWidth: 0 }} />
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {isEdit && (
              <Btn onClick={() => onConvertToInvoice(buildQuote("Invoiced"))} disabled={isLockedAcceptedQuote} variant="outline" icon={<Icons.Receipt />}>
                Convert to Invoice
              </Btn>
            )}
            <Btn onClick={handleShare} variant="outline" icon={<Icons.Send />}>Share Link</Btn>
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
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {isLockedAcceptedQuote && (
            <div style={{ marginBottom: 12, padding: "10px 12px", border: "1px solid #FECACA", background: "#FEF2F2", borderRadius: 8, fontSize: 13, color: "#B91C1C", fontWeight: 600 }}>
              You are not allowed to edit an accepted quote.
            </div>
          )}

          {/* Customer */}
          <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e8e8ec", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", padding: "16px 18px", marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Customer</div>
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
          </div>

          {/* Quote details */}
          <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e8e8ec", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", padding: "16px 18px", marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Quote Details</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
              <Field label="Quote #"><Input value={quoteNumber} onChange={setQuoteNumber} /></Field>
              <Field label="Issue Date">
                <input value={issueDate} onChange={e => setIssueDate(e.target.value)} type="date"
                  style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #E0E0E0", borderRadius: 8, fontSize: 13, fontFamily: ff, outline: "none", boxSizing: "border-box" }} />
              </Field>
              <Field label="Expiry Date">
                <input value={expiryDate} onChange={e => setExpiryDate(e.target.value)} type="date"
                  style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #E0E0E0", borderRadius: 8, fontSize: 13, fontFamily: ff, outline: "none", boxSizing: "border-box" }} />
              </Field>
              <Field label="PO / Reference">
                <Input value={poNumber} onChange={setPoNumber} placeholder="Optional" />
              </Field>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, paddingTop: 12, borderTop: "1px solid #F0F0F0" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>Status</span>
              <select value={status} onChange={e => handleStatusChange(e.target.value)}
                style={{ padding: "5px 10px", border: "1.5px solid #E0E0E0", borderRadius: 7, fontSize: 13, fontFamily: ff, background: "#f9fafb", outline: "none", cursor: "pointer" }}>
                {QUOTE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Line items */}
          <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e8e8ec", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", padding: "16px 18px", marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Line Items</div>
            <LineItemsTable
              items={items}
              onChange={setItems}
              currSymbol={currSym}
              catalogItems={catalogItems}
              isVat={isVat}
              onAddNewItem={() => setShowItemModal(true)}
              isCISInvoice={cisEnabled && !!(customer?.cis?.registered || customer?.taxDetails?.cisRegistered)}
            />
          </div>

          {/* Totals + Notes */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 14, alignItems: "start", marginBottom: 40 }}>
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e8ec", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", padding: "16px 18px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Notes & Terms</div>
              <Field label="Notes (shown on quote)">
                <Textarea value={notes} onChange={setNotes} rows={3} placeholder="e.g. This quote is valid for 30 days." />
              </Field>
              <Field label="Terms & Conditions">
                <Textarea value={terms} onChange={setTerms} rows={3} />
              </Field>
            </div>
            <div style={{ background: "#FAFAFA", borderRadius: 10, border: "1px solid #EBEBEB", padding: "14px 16px", minWidth: 260 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0" }}>
                <span style={{ fontSize: 13, color: "#666" }}>Discount</span>
                <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                  <div style={{ display: "flex", border: "1.5px solid #E0E0E0", borderRadius: 6, overflow: "hidden" }}>
                    {[["percent", "%"], ["fixed", currSym]].map(([t, l]) => (
                      <button key={t} onClick={() => setDiscType(t)}
                        style={{ padding: "3px 8px", border: "none", background: discType === t ? "#1A1A1A" : "transparent", color: discType === t ? "#fff" : "#999", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: ff }}>{l}</button>
                    ))}
                  </div>
                  <input value={discVal} onChange={e => setDiscVal(e.target.value)} type="number" min="0"
                    style={{ width: 62, padding: "4px 6px", border: "1.5px solid #E0E0E0", borderRadius: 6, fontSize: 13, textAlign: "right", fontFamily: ff, background: "#fff", outline: "none" }} />
                </div>
              </div>
              {showShipping && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0" }}>
                  <span style={{ fontSize: 13, color: "#666" }}>Shipping</span>
                  <input value={shipping} onChange={e => setShipping(e.target.value)} type="number" min="0" placeholder="0.00" inputMode="decimal"
                    style={{ width: 86, padding: "4px 6px", border: "1.5px solid #E0E0E0", borderRadius: 6, fontSize: 13, textAlign: "right", fontFamily: ff, background: "#fff", outline: "none" }} />
                </div>
              )}

              {/* Totals */}
              <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #e8e8ec" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}>
                  <span style={{ color: "#6b7280" }}>Subtotal</span>
                  <span>{fmt(currSym, totals.subtotal)}</span>
                </div>

                {vatAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}>
                    <span style={{ color: "#6b7280" }}>VAT ({vatRate}%)</span>
                    <span>{fmt(currSym, vatAmount)}</span>
                  </div>
                )}

                {totals.hasCISItems && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 12, marginTop: 4, paddingTop: 8, borderTop: "1px dashed #e8e8ec", color: "#6b7280" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#d97706", flexShrink: 0 }} />
                      Est. CIS Deduction
                      <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 4 }}>
                        ({totals.customerCIS?.rate || "20% — Standard"})
                      </span>
                    </span>
                    <span>−{fmt(currSym, totals.cisEstimate)}</span>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", marginTop: 6, borderTop: "2px solid #e8e8ec", fontSize: 15, fontWeight: 700, color: "#1a1a2e" }}>
                  <span>Quote Total</span>
                  <span>{fmt(currSym, totals.subtotal + vatAmount - (totals.cisEstimate || 0))}</span>
                </div>

                {totals.hasCISItems && (
                  <div style={{ marginTop: 12, padding: "10px 12px", background: "#fffbeb", borderRadius: 8, border: "1px solid #fde68a", fontSize: 12, color: "#92400e", lineHeight: 1.6 }}>
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
