/**
 * CISStatementDocument — A4 Payment and Deduction Statement.
 *
 * HMRC CIS340 Appendix E compliant layout. Pure presentation component: all
 * data comes in via props. Rendered off-screen and converted to PDF via
 * html2pdf (see generateCISStatementPdf.js).
 */

const mono = "'Courier New', monospace";

const C = {
  ink:    "#1a1a2e",
  body:   "#222",
  muted:  "#555",
  faint:  "#888",
  rule:   "#111",
  line:   "#bbb",
};

const NUM = new Intl.NumberFormat("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtNum = (v) => NUM.format(Number(v || 0));

function fmtShortDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fmtLongDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function fmtMonthYear(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function formatPeriodRange(start, end) {
  if (!start || !end) return "—";
  const s = new Date(start);
  const e = new Date(end);
  const sameYear = s.getFullYear() === e.getFullYear();
  const sDay = s.getDate();
  const eDay = e.getDate();
  const sMonth = s.toLocaleDateString("en-GB", { month: "long" });
  const eMonth = e.toLocaleDateString("en-GB", { month: "long" });
  const sYear = s.getFullYear();
  const eYear = e.getFullYear();
  if (sameYear) return `${sDay} ${sMonth} to ${eDay} ${eMonth} ${eYear}`;
  return `${sDay} ${sMonth} ${sYear} to ${eDay} ${eMonth} ${eYear}`;
}

export default function CISStatementDocument({
  contractor = {},
  subcontractor = {},
  period = {},
  amounts = {},
  invoices,
  docId = "cis-pds-pdf-doc",
}) {
  const {
    gross_amount = 0,
    materials_amount = 0,
    cis_deducted = 0,
    cis_rate_used,
  } = amounts;

  const grossN = Number(gross_amount || 0);
  const materialsN = Number(materials_amount || 0);
  const cisN = Number(cis_deducted || 0);
  const liable = Math.max(0, grossN - materialsN);
  const netPaid = grossN - cisN;

  const periodText = formatPeriodRange(period?.period_start, period?.period_end);

  const rows = Array.isArray(invoices) && invoices.length > 0
    ? invoices
    : [{
        reference: period?.label ? `Summary — ${period.label}` : "Summary",
        invoice_date: null,
        payment_date: period?.period_end,
        gross: grossN,
        materials: materialsN,
        non_cis: 0,
        labour: liable,
        cis: cisN,
        paid: netPaid,
      }];

  const sectionHeading = {
    fontSize: 12,
    fontWeight: 700,
    color: C.ink,
    paddingBottom: 2,
    marginBottom: 6,
    borderBottom: `1px solid ${C.rule}`,
  };

  const rowLine = { borderBottom: `1px solid ${C.line}` };
  const labelCell = { padding: "5px 0", fontSize: 11, color: C.body, verticalAlign: "top" };
  const valueCell = { padding: "5px 0", fontSize: 11, color: C.ink, textAlign: "right", fontVariantNumeric: "tabular-nums", verticalAlign: "top" };
  const monoVal = { fontFamily: mono };

  const invTh = { padding: "6px 6px", fontSize: 10, fontWeight: 700, color: C.body, borderBottom: `1px solid ${C.rule}`, textAlign: "left" };
  const invThRight = { ...invTh, textAlign: "right" };
  const invTd = { padding: "5px 6px", fontSize: 11, color: C.ink, borderBottom: `1px solid ${C.line}` };
  const invTdRight = { ...invTd, textAlign: "right", fontVariantNumeric: "tabular-nums" };

  return (
    <div
      id={docId}
      style={{
        width: "210mm",
        padding: "12mm 16mm",
        color: C.body,
        background: "#fff",
        boxSizing: "border-box",
        fontFamily: "system-ui, -apple-system, 'Segoe UI', Arial, sans-serif",
        fontSize: 11,
        lineHeight: 1.4,
      }}
    >
      {/* ─── HEADER STRIP ─── */}
      <div style={{ textAlign: "right", fontSize: 8, color: C.muted }}>
        CIS Payment Deduction Statement | {contractor?.name || "—"}&nbsp;&nbsp;&nbsp;&nbsp;1 of 1
      </div>

      <div style={{ height: "3mm" }} />

      <div style={{ fontSize: 20, fontWeight: 800, color: C.ink, lineHeight: 1.15 }}>
        Construction Industry Scheme
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, marginTop: "1mm" }}>
        Payment and Deduction Statement
      </div>

      <div style={{ marginTop: "6mm", fontSize: 12, fontWeight: 700, color: C.ink }}>
        {contractor?.name || "—"}
      </div>
      <div style={{ marginTop: "1mm", fontSize: 11, color: C.body }}>
        For the period {periodText}
      </div>

      <div style={{ height: "8mm" }} />

      {/* ─── CONTRACTOR DETAILS ─── */}
      <div style={sectionHeading}>Contractor details</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.ink }}>{contractor?.name || "—"}</div>
      {contractor?.address && (
        <div style={{ fontSize: 11, color: C.body, marginTop: "1mm" }}>{contractor.address}</div>
      )}

      <div style={{ height: "4mm" }} />

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          <tr style={rowLine}>
            <td style={labelCell}>Payment and deduction made in tax month ended</td>
            <td style={valueCell}>{fmtShortDate(period?.period_end)}</td>
          </tr>
          <tr style={rowLine}>
            <td style={labelCell}>Employer's PAYE reference</td>
            <td style={{ ...valueCell, ...monoVal }}>
              {contractor?.employer_paye_ref || "—"}
            </td>
          </tr>
          {contractor?.accounts_office_ref && (
            <tr style={rowLine}>
              <td style={labelCell}>Accounts Office reference</td>
              <td style={{ ...valueCell, ...monoVal }}>
                {contractor.accounts_office_ref}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ height: "8mm" }} />

      {/* ─── SUBCONTRACTOR + AMOUNTS (TWO COLUMNS) ─── */}
      <div style={sectionHeading}>Subcontractor details</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.ink }}>{subcontractor?.name || "—"}</div>
      {subcontractor?.address && (
        <div style={{ fontSize: 11, color: C.body, marginTop: "1mm" }}>{subcontractor.address}</div>
      )}

      <div style={{ height: "4mm" }} />

      <div style={{ display: "flex", gap: 28, alignItems: "flex-start" }}>
        {/* LEFT: subcontractor identifiers */}
        <div style={{ flex: 1 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr style={rowLine}>
                <td style={labelCell}>Unique taxpayers reference</td>
                <td style={{ ...valueCell, ...monoVal }}>
                  {subcontractor?.utr || "—"}
                </td>
              </tr>
              <tr style={rowLine}>
                <td style={labelCell}>Verification number</td>
                <td style={{ ...valueCell, ...monoVal }}>
                  {subcontractor?.verification_number || (cis_rate_used === "gross_0" ? "N/A" : "—")}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* RIGHT: amounts breakdown */}
        <div style={{ flex: 1 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr style={rowLine}>
                <td style={labelCell}>Gross paid (excl VAT) (A)</td>
                <td style={valueCell}>{fmtNum(grossN)}</td>
              </tr>
              <tr style={rowLine}>
                <td style={labelCell}>Less cost of materials</td>
                <td style={valueCell}>{fmtNum(materialsN)}</td>
              </tr>
              <tr style={rowLine}>
                <td style={labelCell}>Less non-CIS</td>
                <td style={valueCell}>{fmtNum(0)}</td>
              </tr>
              <tr style={rowLine}>
                <td style={labelCell}>Liable to deduction</td>
                <td style={valueCell}>{fmtNum(liable)}</td>
              </tr>
              <tr style={rowLine}>
                <td style={labelCell}>Deducted (B)</td>
                <td style={valueCell}>{fmtNum(cisN)}</td>
              </tr>
              <tr style={rowLine}>
                <td style={{ ...labelCell, fontWeight: 700, color: C.ink }}>Paid (A - B)</td>
                <td style={{ ...valueCell, fontWeight: 700 }}>{fmtNum(netPaid)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ height: "8mm" }} />

      {/* ─── SOURCE INVOICES ─── */}
      <div style={sectionHeading}>Source invoices</div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={invTh}>Reference</th>
            <th style={invTh}>Invoice date</th>
            <th style={invTh}>Payment date</th>
            <th style={invThRight}>Gross<br/>(A)</th>
            <th style={invThRight}>Materials</th>
            <th style={invThRight}>Non-CIS</th>
            <th style={invThRight}>Labour</th>
            <th style={invThRight}>CIS<br/>(B)</th>
            <th style={invThRight}>Paid<br/>(A - B)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td style={invTd}>{r.reference || "—"}</td>
              <td style={invTd}>{r.invoice_date ? fmtMonthYear(r.invoice_date) : "—"}</td>
              <td style={invTd}>{fmtLongDate(r.payment_date)}</td>
              <td style={invTdRight}>{fmtNum(r.gross)}</td>
              <td style={invTdRight}>{fmtNum(r.materials)}</td>
              <td style={invTdRight}>{fmtNum(r.non_cis)}</td>
              <td style={invTdRight}>{fmtNum(r.labour)}</td>
              <td style={invTdRight}>{fmtNum(r.cis)}</td>
              <td style={invTdRight}>{fmtNum(r.paid)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ─── FOOTER ─── */}
      <div style={{ marginTop: "30mm", paddingTop: "3mm", borderTop: `1px solid ${C.line}` }}>
        <div style={{ fontSize: 8, color: C.faint, lineHeight: 1.5 }}>
          This statement is issued under the HMRC Construction Industry Scheme (CIS340), Appendix E.
          Contractors must provide it to subcontractors within 14 days of the end of each tax month.
          Keep this record for your tax return. Generated by InvoiceSaga on {fmtShortDate(new Date())}.
        </div>
      </div>
    </div>
  );
}
