import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../router/routes";
import { DEFAULT_INV_TERMS } from "../constants";
import { AppCtx } from "../context/AppContext";
import { todayStr, addDays, nextNum, newLine } from "../utils/helpers";
import InvoiceFormPanel from "../components/invoices/InvoiceFormPanel";
import InvoiceViewPanel from "../components/invoices/InvoiceViewPanel";
import InvoiceListView  from "../components/invoices/InvoiceListView";
import { saveInvoice, deleteInvoice } from "../lib/dataAccess";
import { supabase } from "../lib/supabase";
import { reverseEntry, findEntryBySource } from "../utils/ledger/ledgerService";
import { fetchUserAccounts } from "../utils/ledger/fetchUserAccounts";
import { useToast } from "../components/ui/Toast";

export default function InvoicesPage({ initialShowForm = false }) {
  const { invoices, setInvoices, quotes, setQuotes, user } = useContext(AppCtx);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [panel, setPanel] = useState(initialShowForm ? { mode: "new" } : null);

  const onSave = inv => {
    setInvoices(p => {
      const i = p.findIndex(x => x.id === inv.id);
      if (i >= 0) { const u = [...p]; u[i] = inv; return u; }
      return [inv, ...p];
    });
    if (user?.id) {
      saveInvoice(user.id, inv).then(({ error }) => {
        if (error) console.error('[Invoices] saveInvoice failed:', error);
      });
    }
  };

  const onDeleteInvoice = async (inv) => {
    if (!window.confirm(`Delete ${inv.invoice_number}?`)) return;
    if (!user?.id) return alert("You must be logged in to delete.");
    const snapshot = invoices;
    setInvoices(prev => prev.filter(x => x.id !== inv.id));
    const { error } = await deleteInvoice(user.id, inv.id);
    if (error) {
      console.error("[InvoicesPage] deleteInvoice failed:", error);
      setInvoices(snapshot);
      toast({ title: "Failed to delete invoice", description: error.message, variant: "danger" });
      return;
    }
    toast({ title: "Invoice deleted", variant: "success" });
    // Fire-and-forget ledger reversal — never blocks the UI delete path
    ;(async () => {
      try {
        const { userId } = await fetchUserAccounts();
        if (!userId) return;
        const invEntry = await findEntryBySource('invoice', inv.id);
        if (invEntry) await reverseEntry(invEntry.id, userId);
        // Payment entries use composite source_id: `${invoiceId}:${date}:${amount}`
        const { data: paymentEntries } = await supabase
          .from('journal_entries')
          .select('id')
          .eq('source_type', 'payment')
          .like('source_id', `${inv.id}:%`);
        for (const pe of paymentEntries || []) {
          await reverseEntry(pe.id, userId);
        }
      } catch (err) {
        console.error('[Ledger] invoice reversal failed:', err);
      }
    })();
  };

  const handleConvertAcceptedQuote = (quoteId) => {
    const quote = quotes.find(q => q.id === quoteId);
    if (!quote) return;
    const alreadyInvoiced = invoices.some(inv => inv.converted_from_quote === quote.quote_number);
    if (alreadyInvoiced) {
      const shouldInvoiceAgain = window.confirm("This quote has already been invoiced. Do you want to invoice it again?");
      if (!shouldInvoiceAgain) return;
    }
    setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: "Invoiced" } : q));
    toast({ title: "Quote converted to invoice", variant: "success" });
    setPanel({ mode: "edit", invoice: {
      invoice_number: nextNum("INV", invoices),
      customer: quote.customer,
      issue_date: quote.issue_date || todayStr(),
      due_date: addDays(quote.issue_date || todayStr(), 30),
      payment_terms: "Net 30",
      line_items: quote.line_items || [newLine(0)],
      discount_type: quote.discount_type || "percent",
      discount_value: quote.discount_value || "",
      shipping: quote.shipping || "",
      notes: quote.notes || "",
      terms: quote.terms || DEFAULT_INV_TERMS,
      po_number: quote.po_number || "",
      status: "Draft",
      converted_from_quote: quote.quote_number,
    }});
  };

  if (panel?.mode === "view") {
    return (
      <InvoiceViewPanel
        invoice={panel.invoice}
        onClose={() => setPanel(null)}
        onEdit={() => setPanel({ mode: "edit", invoice: panel.invoice })}
        onDelete={() => {}}
      />
    );
  }

  if (panel) {
    return (
      <InvoiceFormPanel
        existing={panel.mode === "edit" ? panel.invoice : null}
        onClose={() => { if (initialShowForm) navigate(ROUTES.INVOICES, { replace: true }); else setPanel(null); }}
        onSave={inv => { onSave(inv); if (initialShowForm) navigate(ROUTES.INVOICES, { replace: true }); else setPanel(null); }}
        onConvertFromQuote={handleConvertAcceptedQuote}
      />
    );
  }

  return (
    <InvoiceListView
      onNewInvoice={() => setPanel({ mode: "new" })}
      onViewInvoice={inv => setPanel({ mode: "view", invoice: inv })}
      onEditInvoice={inv => setPanel({ mode: "edit", invoice: inv })}
      onDeleteInvoice={onDeleteInvoice}
    />
  );
}
