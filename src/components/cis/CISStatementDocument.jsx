/**
 * CISStatementDocument — A4 Payment and Deduction Statement.
 *
 * HMRC CIS340 Appendix E compliant layout. Pure presentation component: all
 * data comes in via props. Rendered off-screen and converted to PDF via
 * html2pdf (see generateCISStatementPdf.js).
 */

const mono = "'Courier New', monospace";

const C = {
  heading: "#1a1a2e",
  body:    "#374151",
  muted:   "#6b7280",
  faint:   "#9ca3af",
  border:  "#e2e8f0",
  lightBg: "#f8fafc",
  accent:  "#1e6be0",
  negative:"#dc2626",
};

const GBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const fmtGBP = (v) => GBP.format(Number(v || 0));

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function displayRate(rate) {
  switch (rate) {
    case "standard_20":   return "20%";
    case "unverified_30": return "30%";
    case "gross_0":       return "0%";
    default:              return rate || "—";
  }
}

export default function CISStatementDocument({
  contractor = {},
  subcontractor = {},
  period = {},
  amounts = {},
  docId = "cis-pds-pdf-doc",
}) {
  const {
    gross_amount = 0,
    materials_amount = 0,
    cis_deducted = 0,
    cis_rate_used,
  } = amounts;

  const liable = Math.max(0, Number(gross_amount || 0) - Number(materials_amount || 0));

  const thStyle = { padding: "10px 12px", fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1.5px solid ${C.border}`, textAlign: "left" };
  const tdLabel = { padding: "10px 12px", fontSize: 12, color: C.body, borderBottom: `1px solid #f1f5f9` };
  const tdVal   = { ...tdLabel, textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600, color: C.heading };

  return (
    <div id={docId} style={{ width: "210mm", minHeight: "297mm", padding: "18mm 16mm", color: C.body, background: "#fff", boxSizing: "border-box" }}>

      {/* ─── HEADER ─── */}
      <div style={{ borderBottom: `2px solid ${C.heading}`, paddingBottom: 14, marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.heading, letterSpacing: "0.02em" }}>
          Payment and Deduction Statement
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
          Construction Industry Scheme
        </div>
      </div>

      {/* ─── CONTRACTOR + STATEMENT META ─── */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 20, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Contractor</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.heading }}>{contractor?.name || "—"}</div>
          <div style={{ fontSize: 11, color: C.body, marginTop: 4 }}>
            UTR: <span style={{ fontFamily: mono, fontWeight: 600, color: C.heading }}>{contractor?.utr || "—"}</span>
          </div>
          {contractor?.employer_paye_ref && (
            <div style={{ fontSize: 11, color: C.body, marginTop: 2 }}>
              Employer PAYE ref: <span style={{ fontFamily: mono, fontWeight: 600, color: C.heading }}>{contractor.employer_paye_ref}</span>
            </div>
          )}
          {contractor?.accounts_office_ref && (
            <div style={{ fontSize: 11, color: C.body, marginTop: 2 }}>
              Accounts Office ref: <span style={{ fontFamily: mono, fontWeight: 600, color: C.heading }}>{contractor.accounts_office_ref}</span>
            </div>
          )}
        </div>
        <div style={{ textAlign: "right", minWidth: 220 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Statement</div>
          <div style={{ fontSize: 11, color: C.body }}>
            Tax month ending: <strong style={{ color: C.heading }}>{fmtDate(period?.period_end)}</strong>
          </div>
          {period?.label && (
            <div style={{ fontSize: 11, color: C.body, marginTop: 2 }}>
              Period: <strong style={{ color: C.heading }}>{period.label}</strong>
            </div>
          )}
          <div style={{ fontSize: 11, color: C.body, marginTop: 2 }}>
            Date issued: <strong style={{ color: C.heading }}>{fmtDate(new Date())}</strong>
          </div>
        </div>
      </div>

      {/* ─── SUBCONTRACTOR ─── */}
      <div style={{ background: C.lightBg, borderRadius: 6, border: `1px solid ${C.border}`, padding: "14px 16px", marginBottom: 22 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Subcontractor</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.heading }}>{subcontractor?.name || "—"}</div>
        <div style={{ display: "flex", gap: 30, marginTop: 6, flexWrap: "wrap" }}>
          <div style={{ fontSize: 11, color: C.body }}>
            UTR: <span style={{ fontFamily: mono, fontWeight: 600, color: C.heading }}>{subcontractor?.utr || "—"}</span>
          </div>
          <div style={{ fontSize: 11, color: C.body }}>
            Verification number: <span style={{ fontFamily: mono, fontWeight: 600, color: C.heading }}>
              {subcontractor?.verification_number || (cis_rate_used === "gross_0" ? "N/A (gross payment)" : "—")}
            </span>
          </div>
        </div>
        {subcontractor?.address && (
          <div style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>{subcontractor.address}</div>
        )}
      </div>

      {/* ─── AMOUNTS TABLE ─── */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
        <thead>
          <tr>
            <th style={thStyle}>Payment Details</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdLabel}>Gross amount paid (excluding VAT)</td>
            <td style={tdVal}>{fmtGBP(gross_amount)}</td>
          </tr>
          <tr>
            <td style={tdLabel}>Cost of materials</td>
            <td style={tdVal}>{fmtGBP(materials_amount)}</td>
          </tr>
          <tr style={{ background: C.lightBg }}>
            <td style={{ ...tdLabel, fontWeight: 700, color: C.heading }}>Amount liable to deduction</td>
            <td style={{ ...tdVal, fontWeight: 700 }}>{fmtGBP(liable)}</td>
          </tr>
          <tr>
            <td style={tdLabel}>Rate of deduction</td>
            <td style={tdVal}>{displayRate(cis_rate_used)}</td>
          </tr>
          <tr style={{ background: "#fef2f2" }}>
            <td style={{ ...tdLabel, fontWeight: 800, color: C.negative, fontSize: 13, borderBottom: `2px solid ${C.border}` }}>
              Amount of deduction
            </td>
            <td style={{ ...tdVal, fontWeight: 800, color: C.negative, fontSize: 14, borderBottom: `2px solid ${C.border}` }}>
              {fmtGBP(cis_deducted)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ─── FOOTER ─── */}
      <div style={{ marginTop: "auto", paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 9, color: C.faint, lineHeight: 1.5 }}>
          This statement is issued under the HMRC Construction Industry Scheme (CIS340), Appendix E.
          Contractors must provide it to subcontractors within 14 days of the end of each tax month.
          Keep this record for your tax return. Generated by InvoiceSaga on {fmtDate(new Date())}.
        </div>
      </div>
    </div>
  );
}
