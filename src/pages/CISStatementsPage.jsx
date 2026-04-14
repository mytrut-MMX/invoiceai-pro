/**
 * CISStatementsPage — HMRC CIS Payment and Deduction Statements.
 *
 * Lists subcontractors paid in a given tax month along with gross/materials/
 * labour/CIS-deducted totals. Supports per-row and (when jszip is available)
 * bulk ZIP PDF download. Email delivery + Storage upload happen in Task 3.
 */

import { useState, useMemo, useEffect, useContext } from "react";
import { ff } from "../constants";
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
    utr: cis.contractorUTR || "",
    employer_paye_ref: cis.employerRef || payeRef?.employer_paye_ref || "",
    accounts_office_ref: payeRef?.accounts_office_ref || "",
  }), [cis.contractorName, cis.contractorUTR, cis.employerRef, payeRef]);

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
      if (!res.success) setError(res.error || "PDF generation failed");
    } finally {
      setDownloadingRowId(null);
    }
  };

  // ZIP download is disabled until `jszip` is added to dependencies.
  const handleDownloadZip = () => { /* no-op — button is disabled */ };

  // ─── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={moduleUi.pageCanvas}>
        <div style={{ ...moduleUi.page, maxWidth: 1320, fontFamily: ff }}>
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
      <div style={{ ...moduleUi.page, maxWidth: 1320, fontFamily: ff }}>
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
              style={{ padding: "8px 10px", border: "1px solid #dbe4ee", borderRadius: 10, fontSize: 13, background: "#fff", fontFamily: ff }}
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
                      <div style={{ fontWeight: 700, color: "#0f172a" }}>{row.supplier.name || "—"}</div>
                      {issues.length > 0 && (
                        <div style={{ fontSize: 10, color: "#b91c1c", marginTop: 3 }}>
                          Missing: {issues.join(", ")}
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
                      <Btn
                        size="sm"
                        variant="outline"
                        icon={<Icons.Download />}
                        disabled={downloadingRowId === id}
                        onClick={() => handleDownloadRow(row)}
                      >
                        {downloadingRowId === id ? "…" : "PDF"}
                      </Btn>
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
    </div>
  );
}
