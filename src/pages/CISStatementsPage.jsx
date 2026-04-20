/**
 * CISStatementsPage — HMRC CIS Payment and Deduction Statements.
 *
 * Lists subcontractors paid in a given tax month along with gross/materials/
 * labour/CIS-deducted totals. Supports per-row and (when jszip is available)
 * bulk ZIP PDF download. Email delivery + Storage upload happen in Task 3.
 */

import { useState, useMemo, useEffect, useContext } from "react";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Btn } from "../components/atoms";
import { moduleUi, ModuleHeader, EmptyState } from "../components/shared/moduleListUI";
import * as dataAccess from "../lib/dataAccess";
import { supabase } from "../lib/supabase";
import { useCISSettings } from "../hooks/useCISSettings";
import { getTaxMonthOptions, formatPeriodDisplay } from "../utils/cis/computeTaxMonth";
import { aggregatePdsData } from "../utils/cis/aggregatePdsData";
import { generateCISStatementPdf } from "../utils/cis/generateCISStatementPdf";
import { sendCISStatement, logCISStatementDownload } from "../utils/cis/sendCISStatement";

// Bulk ZIP requires `jszip` to be present in package.json. It is NOT currently
// installed in this codebase, so the bulk-select control is rendered disabled.
// When jszip is added to dependencies, wire up the ZIP builder here.
const ZIP_AVAILABLE = false;

const GBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const fmtGBP = (v) => GBP.format(Number(v || 0));

function displayRate(rate) {
  switch (rate) {
    case "standard_20":   return "20%";
    case "unverified_30": return "30%";
    case "gross_0":       return "0%";
    default:              return rate || "—";
  }
}

function missingDetails(row) {
  const issues = [];
  if (!row.supplier?.utr) issues.push("UTR");
  if (row.cis_rate_used !== "gross_0" && !row.verification_number) issues.push("verification number");
  if (!row.supplier?.email) issues.push("email");
  return issues;
}

// Hard gate for email send. Returns { ok, missing }. The missing array is used
// for tooltip copy on the Email button.
function isRowEmailable(row) {
  const missing = [];
  const email = row?.supplier?.email;
  const utr = row?.supplier?.utr;
  if (typeof email !== "string" || !email.trim()) missing.push("email");
  if (typeof utr !== "string" || !utr.trim()) missing.push("UTR");
  const needsVerif = row?.cis_rate_used !== "gross_0";
  if (needsVerif) {
    const v = row?.verification_number;
    if (typeof v !== "string" || !v.trim()) missing.push("verification number");
  }
  return { ok: missing.length === 0, missing };
}

function formatSentAt(ts) {
  try { return new Date(ts).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
  catch { return ""; }
}

export default function CISStatementsPage() {
  const { user } = useContext(AppCtx);
  const cis = useCISSettings();

  const taxMonthOptions = useMemo(() => getTaxMonthOptions(12), []);
  // Default to the previous (last-completed) tax month: index 1 if we have it.
  const [selectedKey, setSelectedKey] = useState(() => {
    if (taxMonthOptions.length > 1) return taxMonthOptions[1].iso_key;
    return taxMonthOptions[0]?.iso_key || "";
  });

  const taxMonth = useMemo(
    () => taxMonthOptions.find(o => o.iso_key === selectedKey) || taxMonthOptions[0],
    [taxMonthOptions, selectedKey]
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bills, setBills] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [payeRef, setPayeRef] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [downloadingRowId, setDownloadingRowId] = useState(null);
  const zipAvailable = ZIP_AVAILABLE;

  // Email state (in-memory only — refreshing the page clears sent badges)
  const [emailModalRow, setEmailModalRow] = useState(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [personalMessage, setPersonalMessage] = useState("");
  const [sendingIds, setSendingIds] = useState(() => new Set());
  const [sentMap, setSentMap] = useState({});           // supplier_id -> { email, at }
  const [rowErrors, setRowErrors] = useState({});       // supplier_id -> string
  const [bulkProgress, setBulkProgress] = useState(null); // { current, total }
  const [bulkSummary, setBulkSummary] = useState(null);   // { sent, failed }

  // ─── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [billsData, suppliersData, payeRes] = await Promise.all([
          dataAccess.loadBills(user.id),
          dataAccess.loadSuppliers(user.id),
          supabase
            ? supabase.from("paye_reference").select("*").eq("user_id", user.id).maybeSingle()
            : Promise.resolve({ data: null }),
        ]);
        if (cancelled) return;
        setBills(billsData || []);
        setSuppliers(suppliersData || []);
        setPayeRef(payeRes?.data || null);
      } catch (err) {
        if (!cancelled) setError(err?.message || "Failed to load CIS data");
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // ─── Aggregate rows ─────────────────────────────────────────────────────────
  const rows = useMemo(() => {
    if (!taxMonth) return [];
    return aggregatePdsData({
      bills,
      suppliers,
      period_start: taxMonth.period_start,
      period_end: taxMonth.period_end,
    });
  }, [bills, suppliers, taxMonth]);

  // Reset selection when tax month changes or rows set changes.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [selectedKey, rows.length]);

  // Reset per-session sent/error state when tax month changes — badges are
  // scoped to the active month view.
  useEffect(() => {
    setSentMap({});
    setRowErrors({});
    setBulkSummary(null);
  }, [selectedKey]);

  const totals = useMemo(() => {
    return rows.reduce((acc, r) => {
      acc.gross += Number(r.gross_amount || 0);
      acc.labour += Number(r.labour_amount || 0);
      acc.materials += Number(r.materials_amount || 0);
      acc.cis += Number(r.cis_deducted || 0);
      return acc;
    }, { gross: 0, labour: 0, materials: 0, cis: 0 });
  }, [rows]);

  const anyMissing = useMemo(() => rows.some(r => missingDetails(r).length > 0), [rows]);

  // ─── Build contractor / subcontractor payloads ──────────────────────────────
  const contractor = useMemo(() => ({
    name: cis.contractorName || "",
    address: cis.contractorAddress || "",
    utr: cis.contractorUTR || "",
    employer_paye_ref: cis.employerRef || payeRef?.employer_paye_ref || "",
    accounts_office_ref: payeRef?.accounts_office_ref || "",
  }), [cis.contractorName, cis.contractorAddress, cis.contractorUTR, cis.employerRef, payeRef]);

  const payeMissing = !payeRef || (!payeRef.employer_paye_ref && !payeRef.accounts_office_ref);

  const buildPayload = (row) => ({
    contractor,
    subcontractor: {
      name: row.supplier?.name || "",
      utr: row.supplier?.utr || "",
      verification_number: row.verification_number || "",
    },
    period: taxMonth,
    amounts: {
      gross_amount: row.gross_amount,
      materials_amount: row.materials_amount,
      labour_amount: row.labour_amount,
      cis_deducted: row.cis_deducted,
      cis_rate_used: row.cis_rate_used,
    },
  });

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const toggleOne = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allSelected = rows.length > 0 && selectedIds.size === rows.length;
  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(rows.map(r => r.supplier.id)));
  };

  const handleDownloadRow = async (row) => {
    setDownloadingRowId(row.supplier.id);
    try {
      const res = await generateCISStatementPdf(buildPayload(row));
      if (!res.success) {
        setError(res.error || "PDF generation failed");
        return;
      }
      // Fire-and-forget audit log — do not block UX or surface errors.
      logCISStatementDownload({ contractor, row, period: taxMonth })
        .then(r => { if (!r?.success) console.warn("[cis-pds] download log failed:", r?.error); })
        .catch(err => console.warn("[cis-pds] download log threw:", err?.message));
    } finally {
      setDownloadingRowId(null);
    }
  };

  // ZIP download is disabled until `jszip` is added to dependencies.
  const handleDownloadZip = () => { /* no-op — button is disabled */ };

  // ─── Email send ────────────────────────────────────────────────────────────
  const runSend = async (row, msg) => {
    const id = row.supplier.id;
    setSendingIds(prev => { const n = new Set(prev); n.add(id); return n; });
    setRowErrors(prev => { const { [id]: _drop, ...rest } = prev; return rest; });
    try {
      const res = await sendCISStatement({
        contractor,
        row,
        period: taxMonth,
        settings: {
          fromName: contractor.name || undefined,
          personalMessage: msg || "",
        },
      });
      if (res?.success) {
        setSentMap(prev => ({ ...prev, [id]: { email: row.supplier.email, at: Date.now() } }));
        if (res.warning) {
          setRowErrors(prev => ({ ...prev, [id]: `Sent, but audit log failed: ${res.error || "unknown"}` }));
        }
        return { ok: true };
      }
      setRowErrors(prev => ({ ...prev, [id]: res?.error || "Send failed" }));
      return { ok: false, error: res?.error };
    } catch (err) {
      setRowErrors(prev => ({ ...prev, [id]: err?.message || "Send failed" }));
      return { ok: false, error: err?.message };
    } finally {
      setSendingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const handleConfirmSingleSend = async () => {
    if (!emailModalRow) return;
    const row = emailModalRow;
    const msg = personalMessage;
    setEmailModalRow(null);
    setPersonalMessage("");
    await runSend(row, msg);
  };

  const selectedRows = useMemo(
    () => rows.filter(r => selectedIds.has(r.supplier.id)),
    [rows, selectedIds]
  );
  const nonEmailableSelected = useMemo(
    () => selectedRows.filter(r => !isRowEmailable(r).ok).length,
    [selectedRows]
  );
  const bulkEmailDisabled = selectedIds.size === 0 || nonEmailableSelected > 0;

  const handleConfirmBulkSend = async () => {
    const targets = selectedRows.slice();
    const msg = personalMessage;
    setBulkModalOpen(false);
    setPersonalMessage("");
    setBulkSummary(null);
    if (targets.length === 0) return;
    setBulkProgress({ current: 0, total: targets.length });
    let sent = 0;
    let failed = 0;
    for (let i = 0; i < targets.length; i++) {
      const r = await runSend(targets[i], msg);
      if (r.ok) sent += 1; else failed += 1;
      setBulkProgress({ current: i + 1, total: targets.length });
    }
    setBulkProgress(null);
    setBulkSummary({ sent, failed });
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={moduleUi.pageCanvas}>
        <div style={{ ...moduleUi.page, maxWidth: 1320 }}>
          <div style={{ textAlign: "center", padding: "80px 24px", color: "#94a3b8", fontSize: 14 }}>
            Loading CIS statements…
          </div>
        </div>
      </div>
    );
  }

  const cols = [
    { key: "check", label: "" },
    { key: "name", label: "Subcontractor" },
    { key: "utr", label: "UTR" },
    { key: "verif", label: "Verif #" },
    { key: "gross", label: "Gross", right: true },
    { key: "materials", label: "Materials", right: true },
    { key: "labour", label: "Labour", right: true },
    { key: "rate", label: "Rate" },
    { key: "cis", label: "CIS Deducted", right: true },
    { key: "actions", label: "" },
  ];

  return (
    <div style={moduleUi.pageCanvas}>
      <div style={{ ...moduleUi.page, maxWidth: 1320 }}>
        <ModuleHeader
          title="CIS Payment and Deduction Statements"
          helper="HMRC CIS340: contractors must issue a PDS to each subcontractor within 14 days of the end of each tax month (6th → 5th)."
        />

        {/* Toolbar: tax month picker */}
        <div style={{ ...moduleUi.toolbar, marginTop: 16, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>Tax month</label>
            <select
              value={selectedKey}
              onChange={e => setSelectedKey(e.target.value)}
              style={{ padding: "8px 10px", border: "1px solid #dbe4ee", borderRadius: 10, fontSize: 13, background: "#fff" }}
            >
              {taxMonthOptions.map(o => (
                <option key={o.iso_key} value={o.iso_key}>{o.label}</option>
              ))}
            </select>
            <span style={{ fontSize: 12, color: "#64748b" }}>
              {taxMonth ? formatPeriodDisplay(taxMonth) : ""}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              title={
                selectedIds.size === 0
                  ? "Select rows to email"
                  : nonEmailableSelected > 0
                    ? `${nonEmailableSelected} of ${selectedIds.size} selected cannot be emailed (missing details)`
                    : ""
              }
              style={{ display: "inline-flex" }}
            >
              <Btn
                variant="accent"
                icon={<Icons.Send />}
                disabled={bulkEmailDisabled || bulkProgress !== null}
                onClick={() => { setBulkSummary(null); setPersonalMessage(""); setBulkModalOpen(true); }}
              >
                {`Email selected${selectedIds.size ? ` · ${selectedIds.size}` : ""}`}
              </Btn>
            </span>
            <span
              title={zipAvailable ? "" : "ZIP library unavailable"}
              style={{ display: "inline-flex" }}
            >
              <Btn
                variant="outline"
                icon={<Icons.Download />}
                disabled={!zipAvailable || selectedIds.size === 0}
                onClick={handleDownloadZip}
              >
                {`Download selected (ZIP)${selectedIds.size ? ` · ${selectedIds.size}` : ""}`}
              </Btn>
            </span>
          </div>
        </div>

        {/* Config warning: PAYE reference missing */}
        {payeMissing && (
          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#92400e" }}>
            Configure your Employer PAYE details in Settings &gt; Tax to include them on statements.
          </div>
        )}

        {/* Warning banner: missing subcontractor details */}
        {anyMissing && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#b91c1c" }}>
            Some subcontractors have missing details required for PDS. Fix in Suppliers before emailing.
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#b91c1c" }}>
            {error}
          </div>
        )}

        {/* Bulk send progress / summary */}
        {bulkProgress && (
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#1d4ed8" }}>
            Sending… {bulkProgress.current} of {bulkProgress.total}
          </div>
        )}
        {bulkSummary && !bulkProgress && (
          <div style={{
            background: bulkSummary.failed ? "#fffbeb" : "#ecfdf5",
            border: `1px solid ${bulkSummary.failed ? "#fde68a" : "#a7f3d0"}`,
            borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 12,
            color: bulkSummary.failed ? "#92400e" : "#065f46",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span>{bulkSummary.sent} sent{bulkSummary.failed ? `, ${bulkSummary.failed} failed` : ""}.</span>
            <button type="button" onClick={() => setBulkSummary(null)} style={{ border: "none", background: "none", cursor: "pointer", color: "inherit", fontSize: 11 }}>Dismiss</button>
          </div>
        )}

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 12 }}>
          {[
            { label: "Total gross paid", value: fmtGBP(totals.gross), color: "#0f172a" },
            { label: "Total labour",      value: fmtGBP(totals.labour), color: "#0f172a" },
            { label: "Total materials",   value: fmtGBP(totals.materials), color: "#0f172a" },
            { label: "Total CIS deducted",value: fmtGBP(totals.cis), color: "#dc2626" },
            { label: "Subcontractors",    value: String(rows.length), color: "#1d4ed8" },
          ].map(c => (
            <div key={c.label} style={moduleUi.summaryCard}>
              <div style={moduleUi.summaryLabel}>{c.label}</div>
              <div style={{ ...moduleUi.summaryValue, color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={{ ...moduleUi.tableCard, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 960 }}>
            <thead>
              <tr style={moduleUi.tableHead}>
                {cols.map(c => (
                  <th key={c.key} style={{ ...moduleUi.th, textAlign: c.right ? "right" : "left" }}>
                    {c.key === "check" ? (
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        disabled={rows.length === 0}
                        aria-label="Select all"
                      />
                    ) : c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const id = row.supplier.id;
                const checked = selectedIds.has(id);
                const issues = missingDetails(row);
                const emailable = isRowEmailable(row);
                const sentInfo = sentMap[id];
                const rowError = rowErrors[id];
                const isSending = sendingIds.has(id);
                return (
                  <tr key={id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOne(id)}
                        aria-label={`Select ${row.supplier.name}`}
                      />
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, color: "#0f172a" }}>{row.supplier.name || "—"}</span>
                        {sentInfo && (
                          <span
                            title={`Emailed ${sentInfo.email} on ${formatSentAt(sentInfo.at)}`}
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 7px", fontSize: 10, fontWeight: 700, color: "#065f46", background: "#d1fae5", border: "1px solid #a7f3d0", borderRadius: 999 }}
                          >
                            Sent ✓
                          </span>
                        )}
                      </div>
                      {issues.length > 0 && (
                        <div style={{ fontSize: 10, color: "#b91c1c", marginTop: 3 }}>
                          Missing: {issues.join(", ")}
                        </div>
                      )}
                      {rowError && (
                        <div style={{ fontSize: 10, color: "#b91c1c", marginTop: 3 }}>
                          {rowError}
                        </div>
                      )}
                      <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
                        {row.bill_count} bill{row.bill_count !== 1 ? "s" : ""}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12, fontFamily: "'Courier New', monospace", color: "#334155" }}>
                      {row.supplier.utr || "—"}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12, fontFamily: "'Courier New', monospace", color: "#334155" }}>
                      {row.verification_number || (row.cis_rate_used === "gross_0" ? "N/A" : "—")}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
                      {fmtGBP(row.gross_amount)}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontSize: 13, fontVariantNumeric: "tabular-nums", color: "#64748b" }}>
                      {fmtGBP(row.materials_amount)}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
                      {fmtGBP(row.labour_amount)}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "#334155" }}>
                      {displayRate(row.cis_rate_used)}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "#dc2626", fontVariantNumeric: "tabular-nums" }}>
                      {fmtGBP(row.cis_deducted)}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6, justifyContent: "flex-end" }}>
                        <Btn
                          size="sm"
                          variant="outline"
                          icon={<Icons.Download />}
                          disabled={downloadingRowId === id}
                          onClick={() => handleDownloadRow(row)}
                        >
                          {downloadingRowId === id ? "…" : "PDF"}
                        </Btn>
                        <span
                          title={emailable.ok ? "" : `Cannot email: missing ${emailable.missing.join(", ")}`}
                          style={{ display: "inline-flex" }}
                        >
                          <Btn
                            size="sm"
                            variant="accent"
                            icon={<Icons.Send />}
                            disabled={!emailable.ok || isSending}
                            onClick={() => { setPersonalMessage(""); setEmailModalRow(row); }}
                          >
                            {isSending ? "…" : "Email"}
                          </Btn>
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={cols.length}>
                    <EmptyState
                      icon={<Icons.Receipt />}
                      text="No CIS-deducted payments in this tax month."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Single-row send confirmation */}
      {emailModalRow && (
        <ConfirmSendModal
          title={`Send PDS for ${taxMonth?.label || ""} to ${emailModalRow.supplier.name}`}
          body={`Send PDS for ${taxMonth?.label || ""} to ${emailModalRow.supplier.name} at ${emailModalRow.supplier.email}?`}
          personalMessage={personalMessage}
          onPersonalMessageChange={setPersonalMessage}
          confirmLabel="Send"
          onCancel={() => { setEmailModalRow(null); setPersonalMessage(""); }}
          onConfirm={handleConfirmSingleSend}
        />
      )}

      {/* Bulk send confirmation */}
      {bulkModalOpen && (
        <ConfirmSendModal
          title="Send statements"
          body={`Send ${selectedRows.length} statement(s) for ${taxMonth?.label || ""}? This cannot be undone.`}
          personalMessage={personalMessage}
          onPersonalMessageChange={setPersonalMessage}
          confirmLabel="Send all"
          onCancel={() => { setBulkModalOpen(false); setPersonalMessage(""); }}
          onConfirm={handleConfirmBulkSend}
        />
      )}
    </div>
  );
}

// ─── Confirm modal ────────────────────────────────────────────────────────────
function ConfirmSendModal({ title, body, personalMessage, onPersonalMessageChange, confirmLabel, onCancel, onConfirm }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(17,17,16,0.55)", display: "grid", placeItems: "center", zIndex: 1500, padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 460, background: "#fff", borderRadius: 12, border: "1px solid #E8E6E0", boxShadow: "0 18px 40px rgba(17,17,16,0.2)", overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #E8E6E0", fontSize: 16, fontWeight: 700, color: "#1F2937" }}>
          {title}
        </div>
        <div style={{ padding: "14px 18px", fontSize: 13, color: "#334155" }}>
          <div style={{ marginBottom: 12 }}>{body}</div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 6 }}>
            Personal message (optional)
          </label>
          <textarea
            value={personalMessage}
            onChange={e => onPersonalMessageChange(e.target.value)}
            rows={4}
            style={{ width: "100%", boxSizing: "border-box", padding: 10, border: "1px solid #dbe4ee", borderRadius: 8, fontSize: 13, resize: "vertical" }}
          />
        </div>
        <div style={{ padding: "12px 18px", display: "flex", justifyContent: "flex-end", gap: 8, background: "#F0EFE9" }}>
          <Btn variant="outline" onClick={onCancel}>Cancel</Btn>
          <Btn variant="accent" icon={<Icons.Send />} onClick={onConfirm}>{confirmLabel}</Btn>
        </div>
      </div>
    </div>
  );
}
