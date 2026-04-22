import { useContext, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CUR_SYM, PDF_TEMPLATES } from "../../constants";
import { AppCtx } from "../../context/AppContext";
import { Icons } from "../icons";
import { Btn, StatusBadge } from "../atoms";
import SendDocumentModal from "../../modals/SendDocumentModal";
import { fmt, fmtDate, getDocumentSentStatus, markDocumentAsSent } from "../../utils/helpers";
import { calcTotals } from "../../utils/calcTotals";
import { useCISSettings } from "../../hooks/useCISSettings";
import { getDefaultTemplate } from "../../utils/InvoiceTemplateSchema";
import { usePagination } from "../../hooks/usePagination";
import Pagination from "../shared/Pagination";

const STATUSES = ["Draft", "Sent", "Overdue", "Paid", "Void", "Partial"];

// 6-color deterministic avatar palette
const AVATAR_BG = [
  "bg-indigo-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-sky-500",
  "bg-violet-500",
];
const avatarBgFor = (name = "") => AVATAR_BG[(name.charCodeAt(0) || 0) % AVATAR_BG.length];

function daysDiff(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0);
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((d - t) / 86400000);
}

function DueDateCell({ dueDate, status }) {
  const diff = daysDiff(dueDate);
  const isInactive = status === "Paid" || status === "Void" || status === "Draft";
  let hint = null;
  if (!isInactive && diff !== null) {
    if (diff < 0)       hint = { text: `${Math.abs(diff)}d overdue`, className: "text-[var(--danger-600)]" };
    else if (diff === 0) hint = { text: "Due today",                  className: "text-[var(--warning-600)]" };
    else if (diff <= 3)  hint = { text: `Due in ${diff}d`,            className: "text-[var(--warning-600)]" };
  }
  return (
    <div>
      <div className="text-sm text-[var(--text-secondary)]">{fmtDate(dueDate)}</div>
      {hint && (
        <div className={`text-[10px] font-semibold mt-0.5 tracking-wide ${hint.className}`}>
          {hint.text}
        </div>
      )}
    </div>
  );
}

function ActionBtn({ onClick, title, icon, tone = "neutral" }) {
  const toneCls = tone === "danger"
    ? "hover:border-[var(--danger-100)] hover:text-[var(--danger-600)]"
    : "hover:border-[var(--brand-600)] hover:text-[var(--brand-600)]";
  return (
    <button
      onClick={onClick}
      title={title}
      className={[
        "flex items-center justify-center bg-white border border-[var(--border-subtle)] rounded-[var(--radius-md)] p-1.5 cursor-pointer text-[var(--text-tertiary)] transition-colors duration-150",
        toneCls,
      ].join(" ")}
    >
      {icon}
    </button>
  );
}

export default function InvoiceListView({ onNewInvoice, onViewInvoice, onEditInvoice, onDeleteInvoice }) {
  const { invoices, orgSettings, pdfTemplate, companyLogo, companyLogoSize, footerText, invoiceTemplateConfig } = useContext(AppCtx);
  const { cisEnabled, cisDefaultRate } = useCISSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const isVat = orgSettings?.vatReg === "Yes";
  const currSym = CUR_SYM[orgSettings?.currency || "GBP"] || "£";

  const [showSendModal,    setShowSendModal]    = useState(false);
  const [sendDocumentType, setSendDocumentType] = useState("invoice");
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const search       = searchParams.get("q") || "";
  const filterStatus = searchParams.get("status") || "All";
  // Source filter is client-side only (no URL persistence). Kept separate from
  // status pills because it partitions on issued-vs-received, not workflow state.
  const [source, setSource] = useState("all");

  const setSearch = (v) => setSearchParams(p => {
    const n = new URLSearchParams(p); v ? n.set("q", v) : n.delete("q"); return n;
  }, { replace: true });

  const setFilterStatus = (v) => setSearchParams(p => {
    const n = new URLSearchParams(p);
    v && v !== "All" ? n.set("status", v) : n.delete("status");
    return n;
  }, { replace: true });

  const filtered = useMemo(() => invoices.filter(inv => {
    const matchSearch = !search ||
      inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || filterStatus.split(",").includes(inv.status);
    const matchSource =
      source === "all" ? true
      : source === "received" ? !!inv.received_as_self_bill
      : !inv.received_as_self_bill; // "issued"
    return matchSearch && matchStatus && matchSource;
  }), [invoices, search, filterStatus, source]);

  const metrics = useMemo(() => {
    const overdueInvs = invoices.filter(i => i.status === "Overdue");
    return {
      unpaid:       invoices.filter(i => ["Sent", "Partial", "Overdue"].includes(i.status)).reduce((s, i) => s + Number(i.total || 0), 0),
      overdueAmt:   overdueInvs.reduce((s, i) => s + Number(i.total || 0), 0),
      overdueCount: overdueInvs.length,
      collected:    invoices.filter(i => i.status === "Paid").reduce((s, i) => s + Number(i.total || 0), 0),
      outstanding:  invoices.filter(i => ["Sent", "Partial"].includes(i.status)).reduce((s, i) => s + Number(i.total || 0), 0),
    };
  }, [invoices]);

  const statusCounts = useMemo(() => {
    const counts = { All: invoices.length };
    for (const s of STATUSES) counts[s] = invoices.filter(i => i.status === s).length;
    return counts;
  }, [invoices]);

  const hasFilters = !!search || filterStatus !== "All" || source !== "all";
  const { page, setPage, totalPages, paginatedItems, totalItems, pageSize } = usePagination(filtered, 25);

  const clearFilters = () => { setSearch(""); setFilterStatus("All"); setSource("all"); };

  const SOURCE_OPTS = [
    { value: "all",      label: "All" },
    { value: "issued",   label: "Issued by me" },
    { value: "received", label: "Self-bill (received)" },
  ];

  const summaryCards = [
    { label: "Unpaid",      value: fmt(currSym, metrics.unpaid),      tone: "info" },
    { label: "Overdue",     value: fmt(currSym, metrics.overdueAmt),  tone: "danger",
      sub: metrics.overdueCount > 0 ? `${metrics.overdueCount} invoice${metrics.overdueCount !== 1 ? "s" : ""}` : null },
    { label: "Collected",   value: fmt(currSym, metrics.collected),   tone: "success" },
    { label: "Outstanding", value: fmt(currSym, metrics.outstanding), tone: metrics.outstanding > 0 ? "warning" : "neutral" },
  ];

  const toneColor = {
    info:    "text-[var(--info-600)]",
    danger:  "text-[var(--danger-600)]",
    success: "text-[var(--success-600)]",
    warning: "text-[var(--warning-600)]",
    neutral: "text-[var(--text-primary)]",
  };

  return (
    <div className="bg-[var(--surface-page)] min-h-screen">
      {/* Send modal */}
      {showSendModal && selectedDocument && (() => {
        const doc = selectedDocument;
        const totals = calcTotals(
          doc.line_items || [],
          doc.discount_type || "percent",
          doc.discount_value || "",
          doc.shipping || "",
          isVat,
          doc.customer,
          cisEnabled,
          cisDefaultRate
        );
        const selectedDocData = {
          docNumber: doc.invoice_number,
          customer: doc.customer,
          issueDate: doc.issue_date,
          dueDate: doc.due_date,
          paymentTerms: doc.payment_terms,
          items: doc.line_items || [],
          ...totals,
          notes: doc.notes || "",
          terms: doc.terms || "",
          status: doc.status,
          poNumber: doc.po_number || "",
          docType: "invoice",
        };
        const activeTemplate = doc.template || pdfTemplate || "classic";
        const tplDef = PDF_TEMPLATES.find(t => t.id === activeTemplate) || PDF_TEMPLATES[0];
        return (
          <SendDocumentModal
            documentType={sendDocumentType}
            document={{ ...doc, invoiceNumber: doc.invoice_number, dueDate: doc.due_date, currency: orgSettings?.currency || "GBP" }}
            company={{ ...orgSettings, companyName: orgSettings?.companyName || orgSettings?.name }}
            customer={selectedCustomer || {}}
            onClose={() => setShowSendModal(false)}
            onSent={() => {
              setShowSendModal(false);
              if (doc.id) markDocumentAsSent(doc.id);
            }}
            docData={selectedDocData}
            currSymbol={currSym}
            isVat={isVat}
            pdfTemplate={activeTemplate}
            accentColor={tplDef?.defaultAccent}
            footerText={footerText || ""}
            invoiceTemplate={getDefaultTemplate()}
            orgSettings={{ ...orgSettings, logo: companyLogo, logoSize: Number(invoiceTemplateConfig?.logoSize || companyLogoSize || 52) }}
          />
        );
      })()}

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-3 mb-5 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)] m-0">Invoices</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1 m-0">
              {invoices.length} invoice{invoices.length !== 1 ? "s" : ""} · accounts receivable
            </p>
          </div>
          <Btn onClick={onNewInvoice} variant="primary" icon={<Icons.Plus />}>New invoice</Btn>
        </div>

        {/* Summary strip */}
        {invoices.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {summaryCards.map(m => (
              <div
                key={m.label}
                className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-4"
              >
                <div className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
                  {m.label}
                </div>
                <div className={`text-lg font-semibold tabular-nums leading-tight ${toneColor[m.tone]}`}>
                  {m.value}
                </div>
                {m.sub && (
                  <div className="text-[11px] text-[var(--danger-600)] font-semibold mt-1">{m.sub}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Main card (toolbar + table + pagination) */}
        <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] overflow-hidden">
          {/* Toolbar */}
          <div className="p-3 flex items-center gap-2 flex-wrap border-b border-[var(--border-subtle)]">
            {/* Search */}
            <div className="flex items-center gap-2 flex-1 min-w-[160px] h-9 px-3 bg-[var(--surface-sunken)] border border-[var(--border-subtle)] rounded-[var(--radius-md)]">
              <span className="text-[var(--text-tertiary)] flex flex-shrink-0">
                <Icons.Search />
              </span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by number or customer…"
                className="flex-1 min-w-0 border-none outline-none bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  title="Clear search"
                  className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] bg-transparent border-none cursor-pointer flex flex-shrink-0 p-0"
                >
                  <Icons.X />
                </button>
              )}
            </div>

            {/* Status filter pills */}
            <div className="inline-flex gap-1 flex-wrap">
              {["All", ...STATUSES].map(s => {
                const active = filterStatus === s || filterStatus.split(",").includes(s);
                const cnt = statusCounts[s] || 0;
                return (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={[
                      "inline-flex items-center gap-1 h-7 px-2.5 rounded-[var(--radius-md)] text-xs transition-colors duration-150 cursor-pointer",
                      active
                        ? "bg-[var(--text-primary)] text-white border border-[var(--text-primary)] font-semibold"
                        : "bg-white text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--surface-sunken)]",
                    ].join(" ")}
                  >
                    {s}
                    {cnt > 0 && s !== "All" && (
                      <span
                        className={[
                          "text-[10px] font-semibold rounded-full px-1.5 leading-4",
                          active ? "bg-white/20 text-white" : "bg-[var(--surface-sunken)] text-[var(--text-secondary)]",
                        ].join(" ")}
                      >
                        {cnt}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Source segmented control (issued vs customer-issued self-bill). */}
            <div className="inline-flex rounded-[var(--radius-md)] border border-[var(--border-subtle)] overflow-hidden">
              {SOURCE_OPTS.map((opt, i) => {
                const active = source === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setSource(opt.value)}
                    className={[
                      "h-7 px-2.5 text-xs transition-colors duration-150 cursor-pointer border-none",
                      i > 0 ? "border-l border-l-[var(--border-subtle)]" : "",
                      active
                        ? "bg-[var(--text-primary)] text-white font-semibold"
                        : "bg-white text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]",
                    ].join(" ")}
                    title={opt.value === "received" ? "Invoices imported via received self-bill" : undefined}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer px-2 py-1 rounded-[var(--radius-sm)] whitespace-nowrap transition-colors duration-150"
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
                  <Th>Invoice</Th>
                  <Th>Customer</Th>
                  <Th>Issued</Th>
                  <Th>Due</Th>
                  <Th align="right">Amount</Th>
                  {cisEnabled && <Th align="right">CIS</Th>}
                  <Th>Status</Th>
                  <Th align="right" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={cisEnabled ? 8 : 7}>
                      <EmptyState
                        hasAnyInvoices={invoices.length > 0}
                        onNewInvoice={onNewInvoice}
                        onClearFilters={clearFilters}
                      />
                    </td>
                  </tr>
                ) : paginatedItems.map(inv => {
                  const isOverdue = inv.status === "Overdue";
                  const sentStatus = getDocumentSentStatus(inv.id);
                  const custName = inv.customer?.name || "—";
                  const avatarCls = avatarBgFor(custName);
                  return (
                    <tr
                      key={inv.id}
                      onClick={() => onViewInvoice(inv)}
                      className={[
                        "border-b border-[var(--border-subtle)] last:border-0 cursor-pointer hover:bg-[var(--surface-sunken)] transition-colors duration-150",
                        isOverdue ? "border-l-[3px] border-l-[var(--danger-600)]" : "border-l-[3px] border-l-transparent",
                      ].join(" ")}
                    >
                      {/* Invoice # */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-medium text-[var(--brand-600)]">{inv.invoice_number}</span>
                          {inv.received_as_self_bill && (
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 rounded bg-[var(--warning-50)] border border-[var(--warning-100)] text-[var(--warning-700)] text-[10px] font-semibold"
                              title="Customer-issued self-bill — imported from their PDF"
                            >
                              Self-Bill (received)
                            </span>
                          )}
                        </div>
                        {inv.po_number && (
                          <div className="text-xs text-[var(--text-tertiary)] mt-0.5">PO: {inv.po_number}</div>
                        )}
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4 min-w-[160px]">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-[30px] h-[30px] rounded-full ${avatarCls} text-white font-semibold text-xs flex items-center justify-center flex-shrink-0`}
                          >
                            {custName[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm text-[var(--text-primary)] font-medium truncate max-w-[180px]">
                              {custName}
                            </div>
                            {inv.customer?.type && (
                              <div className="text-xs text-[var(--text-tertiary)]">{inv.customer.type}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Issued */}
                      <td className="py-3 px-4 text-sm text-[var(--text-secondary)] whitespace-nowrap">
                        {fmtDate(inv.issue_date)}
                      </td>

                      {/* Due */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <DueDateCell dueDate={inv.due_date} status={inv.status} />
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-sm font-medium text-[var(--text-primary)] text-right tabular-nums whitespace-nowrap">
                        {fmt(currSym, inv.total || 0)}
                      </td>

                      {/* CIS deduction (conditional) */}
                      {cisEnabled && (
                        <td className="py-3 px-4 text-sm text-right tabular-nums whitespace-nowrap">
                          {Number(inv.cisDeduction || 0) > 0 ? (
                            <span className="text-[var(--warning-700)]">
                              {fmt(currSym, inv.cisDeduction)}
                            </span>
                          ) : (
                            <span className="text-[var(--text-tertiary)]">—</span>
                          )}
                        </td>
                      )}

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <StatusBadge status={inv.status || "Draft"} />
                          {sentStatus && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[var(--success-50)] border border-[var(--success-100)] text-[var(--success-700)] text-[10px] font-semibold">
                              Sent
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3 px-4 whitespace-nowrap"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <ActionBtn
                            onClick={() => {
                              setSelectedDocument({ ...inv, invoiceNumber: inv.invoice_number, dueDate: inv.due_date, currency: orgSettings?.currency || "GBP" });
                              setSelectedCustomer(inv.customer || null);
                              setSendDocumentType(inv.status === "Paid" ? "payment_confirmation" : "invoice");
                              setShowSendModal(true);
                            }}
                            title={inv.status === "Paid" ? "Send receipt" : "Send invoice"}
                            icon={<Icons.Send />}
                          />
                          <ActionBtn
                            onClick={() => onEditInvoice(inv)}
                            title="Edit invoice"
                            icon={<Icons.Edit />}
                          />
                          <ActionBtn
                            onClick={() => onDeleteInvoice(inv)}
                            title="Delete invoice"
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

          {/* Pagination */}
          {filtered.length > 0 && totalPages > 1 && (
            <div className="px-4 border-t border-[var(--border-subtle)]">
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                totalItems={totalItems}
                pageSize={pageSize}
              />
            </div>
          )}

          {/* Footer count */}
          {filtered.length > 0 && (
            <div className="border-t border-[var(--border-subtle)] px-4 py-2 text-xs text-[var(--text-tertiary)] text-right">
              {hasFilters ? `${filtered.length} of ${invoices.length}` : invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Th({ children, align = "left" }) {
  const alignCls = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <th
      className={`py-2.5 px-4 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider whitespace-nowrap ${alignCls}`}
    >
      {children}
    </th>
  );
}

function EmptyState({ hasAnyInvoices, onNewInvoice, onClearFilters }) {
  if (!hasAnyInvoices) {
    return (
      <div className="py-16 px-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--surface-sunken)] text-[var(--text-tertiary)] mb-3">
          <Icons.Invoices />
        </div>
        <div className="text-base font-semibold text-[var(--text-primary)] mb-1">No invoices yet</div>
        <div className="text-sm text-[var(--text-secondary)] mb-5">
          Create your first invoice to start getting paid
        </div>
        <Btn variant="primary" icon={<Icons.Plus />} onClick={onNewInvoice}>New invoice</Btn>
      </div>
    );
  }
  return (
    <div className="py-16 px-6 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--surface-sunken)] text-[var(--text-tertiary)] mb-3">
        <Icons.Search />
      </div>
      <div className="text-base font-semibold text-[var(--text-primary)] mb-1">
        No invoices match your filters
      </div>
      <div className="text-sm text-[var(--text-secondary)] mb-5">
        Try adjusting your search or status filter
      </div>
      <Btn variant="outline" onClick={onClearFilters}>Clear filters</Btn>
    </div>
  );
}
