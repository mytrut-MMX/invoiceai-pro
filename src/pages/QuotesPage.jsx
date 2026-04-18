import { useState, useContext } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ROUTES } from "../router/routes";
import { CUR_SYM, QUOTE_STATUSES } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Btn, StatusBadge } from "../components/atoms";
import { fmt, fmtDate, todayStr, addDays, nextNum } from "../utils/helpers";
import { calcTotals } from "../utils/calcTotals";
import { useCISSettings } from "../hooks/useCISSettings";
import QuoteFormPanel from "../components/quotes/QuoteFormPanel";
import QuoteViewPanel from "../components/quotes/QuoteViewPanel";
import { useToast } from "../components/ui/Toast";

const AVATAR_BG = [
  "bg-indigo-500", "bg-emerald-500", "bg-amber-500",
  "bg-rose-500", "bg-sky-500", "bg-violet-500",
];
const avatarBgFor = (name = "") => AVATAR_BG[(name.charCodeAt(0) || 0) % AVATAR_BG.length];

function Th({ children, align = "left" }) {
  const alignCls = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <th className={`py-2.5 px-4 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider whitespace-nowrap ${alignCls}`}>
      {children}
    </th>
  );
}

function ActionBtn({ onClick, title, icon, tone = "neutral", disabled }) {
  const toneCls = tone === "danger"
    ? "hover:border-[var(--danger-100)] hover:text-[var(--danger-600)]"
    : "hover:border-[var(--brand-600)] hover:text-[var(--brand-600)]";
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`flex items-center justify-center bg-white border border-[var(--border-subtle)] rounded-[var(--radius-md)] p-1.5 cursor-pointer text-[var(--text-tertiary)] transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${toneCls}`}
    >
      {icon}
    </button>
  );
}

function SummaryCard({ label, value, tone = "neutral" }) {
  const toneCls = {
    info:    "text-[var(--info-600)]",
    success: "text-[var(--success-600)]",
    warning: "text-[var(--warning-600)]",
    brand:   "text-[var(--brand-700)]",
    muted:   "text-[var(--text-tertiary)]",
    neutral: "text-[var(--text-primary)]",
  }[tone] || "text-[var(--text-primary)]";
  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-4">
      <div className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-lg font-semibold tabular-nums leading-tight ${toneCls}`}>{value}</div>
    </div>
  );
}

function EmptyState({ icon, title, message, cta }) {
  return (
    <div className="py-16 px-6 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--surface-sunken)] text-[var(--text-tertiary)] mb-3">
        {icon}
      </div>
      <div className="text-base font-semibold text-[var(--text-primary)] mb-1">{title}</div>
      {message && <div className="text-sm text-[var(--text-secondary)] mb-5">{message}</div>}
      {cta}
    </div>
  );
}

export default function QuotesPage({ initialShowForm = false }) {
  const { quotes, setQuotes, invoices, setInvoices, orgSettings } = useContext(AppCtx);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { cisEnabled, cisDefaultRate } = useCISSettings();
  const [panel, setPanel] = useState(initialShowForm ? { mode: "new-page" } : null);

  const currSym = CUR_SYM[orgSettings?.currency || "GBP"] || "£";
  const search = searchParams.get("q") || "";
  const filterStatus = searchParams.get("status") || "All";

  const setSearch = (v) => setSearchParams(p => {
    const n = new URLSearchParams(p); v ? n.set("q", v) : n.delete("q"); return n;
  }, { replace: true });
  const setFilterStatus = (v) => setSearchParams(p => {
    const n = new URLSearchParams(p); v && v !== "All" ? n.set("status", v) : n.delete("status"); return n;
  }, { replace: true });

  const isNewQuotePage = panel?.mode === "new-page";
  const isViewPage = panel?.mode === "view";

  const filtered = quotes.filter(q => {
    const matchSearch = !search ||
      q.quote_number?.toLowerCase().includes(search.toLowerCase()) ||
      q.customer?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || q.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const onSave = q => {
    setQuotes(p => {
      const i = p.findIndex(x => x.id === q.id);
      if (i >= 0) { const u = [...p]; u[i] = q; return u; }
      return [q, ...p];
    });
    toast({ title: "Quote saved", variant: "success" });
  };

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
        onDelete={() => {
          if (!window.confirm(`Delete ${panel.quote.quote_number}?`)) return;
          setQuotes(prev => prev.filter(x => x.id !== panel.quote.id));
          toast({ title: "Quote deleted", variant: "success" });
          setPanel(null);
        }}
        onConvert={() => handleConvertToInvoice(panel.quote)}
      />
    );
  }

  if (panel && panel.mode !== "new-page") {
    return (
      <QuoteFormPanel
        existing={panel.mode === "edit" ? panel.quote : null}
        onClose={() => setPanel(null)}
        onSave={q => { onSave(q); setPanel(null); }}
        onConvertToInvoice={handleConvertToInvoice}
      />
    );
  }

  if (isNewQuotePage) {
    return (
      <QuoteFormPanel
        asPage
        existing={null}
        onClose={() => { if (initialShowForm) navigate(ROUTES.QUOTES, { replace: true }); else setPanel(null); }}
        onSave={q => { onSave(q); if (initialShowForm) navigate(ROUTES.QUOTES, { replace: true }); else setPanel(null); }}
        onConvertToInvoice={handleConvertToInvoice}
      />
    );
  }

  return (
    <div className="bg-[var(--surface-page)] min-h-screen">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-3 mb-5 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)] m-0">Quotes</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1 m-0">
              {quotes.length} record{quotes.length !== 1 ? "s" : ""} · monitor draft-to-invoice conversion for your sales pipeline
            </p>
          </div>
          <Btn onClick={() => setPanel({ mode: "new-page" })} variant="primary" icon={<Icons.Plus />}>New quote</Btn>
        </div>

        {/* Summary strip */}
        {quotes.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
            <SummaryCard label="Total"    value={String(summary.total)}    tone="neutral" />
            <SummaryCard label="Draft"    value={String(summary.draft)}    tone="muted" />
            <SummaryCard label="Sent"     value={String(summary.sent)}     tone="info" />
            <SummaryCard label="Accepted" value={String(summary.accepted)} tone="success" />
            <SummaryCard label="Invoiced" value={String(summary.invoiced)} tone="brand" />
          </div>
        )}

        {/* Main card */}
        <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] overflow-hidden">
          {/* Toolbar */}
          <div className="p-3 flex items-center gap-2 flex-wrap border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2 flex-1 min-w-[160px] h-9 px-3 bg-[var(--surface-sunken)] border border-[var(--border-subtle)] rounded-[var(--radius-md)]">
              <span className="text-[var(--text-tertiary)] flex flex-shrink-0"><Icons.Search /></span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search quotes…"
                className="flex-1 min-w-0 border-none outline-none bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
              />
              {search && (
                <button onClick={() => setSearch("")} title="Clear" className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] bg-transparent border-none cursor-pointer flex flex-shrink-0 p-0">
                  <Icons.X />
                </button>
              )}
            </div>
            <div className="inline-flex gap-1 flex-wrap">
              {["All", ...QUOTE_STATUSES].map(s => {
                const active = filterStatus === s;
                return (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={[
                      "inline-flex items-center h-7 px-2.5 rounded-[var(--radius-md)] text-xs transition-colors duration-150 cursor-pointer",
                      active
                        ? "bg-[var(--text-primary)] text-white border border-[var(--text-primary)] font-semibold"
                        : "bg-white text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--surface-sunken)]",
                    ].join(" ")}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            {hasFilters && (
              <button
                onClick={() => { setSearch(""); setFilterStatus("All"); }}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer px-2 py-1 whitespace-nowrap"
              >
                Clear
              </button>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[720px]">
              <thead>
                <tr className="bg-[var(--surface-sunken)] border-b border-[var(--border-subtle)]">
                  <Th>Quote #</Th>
                  <Th>Customer</Th>
                  <Th>Issue Date</Th>
                  <Th>Expires</Th>
                  <Th align="right">Amount</Th>
                  <Th>Status</Th>
                  <Th align="right" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      {quotes.length === 0 ? (
                        <EmptyState
                          icon={<Icons.Quotes />}
                          title="No quotes yet"
                          message="Create your first quote to start building a sales pipeline"
                          cta={<Btn variant="primary" icon={<Icons.Plus />} onClick={() => setPanel({ mode: "new-page" })}>New quote</Btn>}
                        />
                      ) : (
                        <EmptyState
                          icon={<Icons.Search />}
                          title="No quotes match your filters"
                          cta={<Btn variant="outline" onClick={() => { setSearch(""); setFilterStatus("All"); }}>Clear filters</Btn>}
                        />
                      )}
                    </td>
                  </tr>
                ) : filtered.map(q => {
                  const custName = q.customer?.name || "—";
                  const avatarCls = avatarBgFor(custName);
                  return (
                    <tr
                      key={q.id}
                      onClick={() => setPanel({ mode: "view", quote: q })}
                      className="border-b border-[var(--border-subtle)] last:border-0 cursor-pointer hover:bg-[var(--surface-sunken)] transition-colors duration-150"
                    >
                      <td className="py-3 px-4 text-sm font-medium text-[var(--brand-600)] whitespace-nowrap">{q.quote_number}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-[30px] h-[30px] rounded-full ${avatarCls} text-white font-semibold text-xs flex items-center justify-center flex-shrink-0`}>
                            {custName[0].toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[180px]">{custName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-[var(--text-secondary)] whitespace-nowrap">{fmtDate(q.issue_date)}</td>
                      <td className={`py-3 px-4 text-sm whitespace-nowrap ${q.status === "Expired" ? "text-[var(--danger-600)]" : "text-[var(--text-secondary)]"}`}>
                        {fmtDate(q.expiry_date)}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-[var(--text-primary)] text-right tabular-nums whitespace-nowrap">
                        {fmt(currSym, q.total || 0)}
                      </td>
                      <td className="py-3 px-4"><StatusBadge status={q.status || "Draft"} /></td>
                      <td className="py-3 px-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <ActionBtn
                            onClick={() => q.status === "Invoiced" ? window.alert("You are not allowed to edit an accepted quote.") : setPanel({ mode: "edit", quote: q })}
                            title="Edit quote"
                            icon={<Icons.Edit />}
                            disabled={q.status === "Invoiced"}
                          />
                          <ActionBtn
                            onClick={() => {
                              if (!window.confirm(`Delete ${q.quote_number}?`)) return;
                              setQuotes(prev => prev.filter(x => x.id !== q.id));
                              toast({ title: "Quote deleted", variant: "success" });
                            }}
                            title="Delete quote"
                            icon={<Icons.Trash />}
                            tone="danger"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
