import { useState, useContext } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ROUTES } from "../router/routes";
import { ff, CUR_SYM, QUOTE_STATUSES } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Btn } from "../components/atoms";
import { moduleUi, ModuleHeader, SearchInput, EmptyState, StatusBadge } from "../components/shared/moduleListUI";
import { fmt, fmtDate, todayStr, addDays, nextNum } from "../utils/helpers";
import { calcTotals } from "../utils/calcTotals";
import { useCISSettings } from "../hooks/useCISSettings";
import QuoteFormPanel from "../components/quotes/QuoteFormPanel";
import QuoteViewPanel from "../components/quotes/QuoteViewPanel";

export default function QuotesPage({ initialShowForm = false }) {
  const { quotes, setQuotes, invoices, setInvoices, orgSettings } = useContext(AppCtx);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { cisEnabled, cisDefaultRate } = useCISSettings();
  const [panel, setPanel] = useState(initialShowForm ? { mode: "new-page" } : null);

  const search = searchParams.get("q") || "";
  const filterStatus = searchParams.get("status") || "All";

  const setSearch = (v) => setSearchParams(p => { const n = new URLSearchParams(p); v ? n.set("q", v) : n.delete("q"); return n; }, { replace: true });
  const setFilterStatus = (v) => setSearchParams(p => { const n = new URLSearchParams(p); v && v !== "All" ? n.set("status", v) : n.delete("status"); return n; }, { replace: true });

  const isNewQuotePage = panel?.mode === "new-page";
  const isViewPage = panel?.mode === "view";

  const filtered = quotes.filter(q => {
    const matchSearch = !search ||
      q.quote_number?.toLowerCase().includes(search.toLowerCase()) ||
      q.customer?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || q.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const onSave = q => setQuotes(p => {
    const i = p.findIndex(x => x.id === q.id);
    if (i >= 0) { const u = [...p]; u[i] = q; return u; }
    return [q, ...p];
  });

  const handleConvertToInvoice = (quote) => {
    const alreadyInvoiced = invoices.some(inv => inv.converted_from_quote === quote.quote_number);
    if (alreadyInvoiced) {
      const shouldInvoiceAgain = window.confirm("This quote has already been invoiced. Do you want to invoice it again?");
      if (!shouldInvoiceAgain) return;
    }
    onSave({ ...quote, status: "Invoiced" });
    const freshTotals = calcTotals(
      quote.line_items || [],
      quote.discount_type || "percent",
      quote.discount_value || "",
      quote.shipping || "",
      orgSettings?.vatReg === "Yes",
      quote.customer,
      cisEnabled,
      cisDefaultRate,
      false
    );
    const inv = {
      id: crypto.randomUUID(),
      invoice_number: nextNum("INV", invoices),
      customer: quote.customer,
      issue_date: quote.issue_date,
      due_date: addDays(quote.issue_date || todayStr(), 30),
      payment_terms: "Net 30",
      line_items: quote.line_items || [],
      discount_type: quote.discount_type,
      discount_value: quote.discount_value,
      shipping: quote.shipping,
      subtotal: freshTotals.subtotal,
      discountAmount: freshTotals.discountAmount,
      taxBreakdown: freshTotals.taxBreakdown,
      cisDeduction: freshTotals.cisDeduction,
      hasCISItems: freshTotals.hasCISItems,
      customerCIS: freshTotals.customerCIS,
      total: freshTotals.total,
      grossTotal: freshTotals.grossTotal,
      notes: quote.notes,
      terms: quote.terms,
      status: "Draft",
      converted_from_quote: quote.quote_number,
    };
    setInvoices(p => [inv, ...p]);
    setPanel(null);
    navigate(ROUTES.INVOICES, { replace: true });
  };

  const summary = {
    total: quotes.length,
    draft: quotes.filter(q => q.status === "Draft").length,
    sent: quotes.filter(q => q.status === "Sent").length,
    accepted: quotes.filter(q => q.status === "Accepted").length,
    invoiced: quotes.filter(q => q.status === "Invoiced").length,
  };
  const hasFilters = search || filterStatus !== "All";

  if (isViewPage) {
    return (
      <QuoteViewPanel
        quote={panel.quote}
        onClose={() => setPanel(null)}
        onEdit={() => setPanel({ mode: "edit", quote: panel.quote })}
        onDelete={() => { setQuotes(prev => prev.filter(x => x.id !== panel.quote.id)); setPanel(null); }}
        onConvert={() => handleConvertToInvoice(panel.quote)}
      />
    );
  }

  return (
    <div style={moduleUi.pageCanvas}>
      <div style={{ ...moduleUi.page, fontFamily: ff }}>
        <div style={moduleUi.sectionStack}>
          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 16 }}>
            {[
              { label: "Total Quotes", value: String(summary.total),    color: "#1A1A1A" },
              { label: "Draft",        value: String(summary.draft),    color: "#64748b" },
              { label: "Sent",         value: String(summary.sent),     color: "#1d4ed8" },
              { label: "Accepted",     value: String(summary.accepted), color: "#16A34A" },
              { label: "Invoiced",     value: String(summary.invoiced), color: "#7c3aed" },
            ].map(s => (
              <div key={s.label} style={moduleUi.summaryCard}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>{s.label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          <ModuleHeader
            title="Quotes"
            helper={`${quotes.length} records · monitor draft-to-invoice conversion for your sales pipeline.`}
            right={<Btn onClick={() => setPanel({ mode: "new-page" })} variant="primary" icon={<Icons.Plus />}>New Quote</Btn>}
          />

          {isNewQuotePage && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#1A1A1A" }}>New Quote</div>
                <Btn onClick={() => { if (initialShowForm) navigate(ROUTES.QUOTES, { replace: true }); else setPanel(null); }} variant="outline" icon={<Icons.ChevDown />}>← Quotes</Btn>
              </div>
              <QuoteFormPanel
                asPage
                existing={null}
                onClose={() => { if (initialShowForm) navigate(ROUTES.QUOTES, { replace: true }); else setPanel(null); }}
                onSave={q => { onSave(q); if (initialShowForm) navigate(ROUTES.QUOTES, { replace: true }); else setPanel(null); }}
                onConvertToInvoice={handleConvertToInvoice}
              />
            </div>
          )}

          {/* Table */}
          {!isNewQuotePage && (
            <>
              <div style={{ ...moduleUi.toolbar, marginTop: 12 }}>
                <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Search quotes…" />
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: "8px 10px", border: "1px solid #dbe4ee", borderRadius: 10, fontSize: 12, background: "#fff", fontFamily: ff }}>
                    {["All", ...QUOTE_STATUSES].map(s => <option key={s}>{s}</option>)}
                  </select>
                  {hasFilters && <Btn variant="ghost" size="sm" onClick={() => { setSearch(""); setFilterStatus("All"); }}>Clear filters</Btn>}
                </div>
              </div>
              <div style={{ ...moduleUi.card, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 540 }}>
                  <thead>
                    <tr style={moduleUi.tableHead}>
                      {["Quote #", "Customer", "Issue Date", "Expires", "Amount", "Status", ""].map(h => (
                        <th key={h} style={{ ...moduleUi.th, textAlign: h === "Amount" ? "right" : "left" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(q => (
                      <tr key={q.id} style={{ ...moduleUi.rowHover, cursor: "pointer" }}
                        onClick={() => setPanel({ mode: "view", quote: q })}
                        onMouseEnter={e => e.currentTarget.style.background = "#FAFAFA"}
                        onMouseLeave={e => e.currentTarget.style.background = ""}>
                        <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#1A1A1A" }}>{q.quote_number}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#4F46E522", color: "#4F46E5", fontWeight: 800, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>{q.customer?.name?.[0] || "?"}</div>
                            <span style={moduleUi.primaryText}>{q.customer?.name || "—"}</span>
                          </div>
                        </td>
                        <td style={{ ...moduleUi.td, ...moduleUi.secondaryText, fontSize: 12 }}>{fmtDate(q.issue_date)}</td>
                        <td style={{ ...moduleUi.td, ...moduleUi.secondaryText, fontSize: 12, color: q.status === "Expired" ? "#C0392B" : "#888" }}>{fmtDate(q.expiry_date)}</td>
                        <td style={{ ...moduleUi.td, ...moduleUi.moneyCell }}>{fmt(CUR_SYM[orgSettings?.currency || "GBP"] || "£", q.total || 0)}</td>
                        <td style={{ padding: "12px 16px" }}><StatusBadge status={q.status || "Draft"} /></td>
                        <td style={{ padding: "12px 16px" }} onClick={e => e.stopPropagation()}>
                          <Btn onClick={() => q.status === "Invoiced" ? window.alert("You are not allowed to edit an accepted quote.") : setPanel({ mode: "edit", quote: q })} variant="ghost" size="sm" disabled={q.status === "Invoiced"} icon={<Icons.Edit />} />
                          <Btn onClick={() => window.confirm(`Delete ${q.quote_number}?`) && setQuotes(prev => prev.filter(x => x.id !== q.id))} variant="ghost" size="sm" icon={<Icons.Trash />} />
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={7}><EmptyState icon={<Icons.Quotes />} text={quotes.length === 0 ? "No quotes yet. Create your first quote." : "No quotes match your filters."} cta={<Btn variant="outline" onClick={() => { setSearch(""); setFilterStatus("All"); }}>Clear filters</Btn>} /></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {panel && panel.mode !== "new-page" && (
            <QuoteFormPanel
              existing={panel.mode === "edit" ? panel.quote : null}
              onClose={() => setPanel(null)}
              onSave={q => { onSave(q); setPanel(null); }}
              onConvertToInvoice={handleConvertToInvoice}
            />
          )}
        </div>
      </div>
    </div>
  );
}
