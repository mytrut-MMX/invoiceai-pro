/**
 * CISStatementDocument — A4 Payment and Deduction Statement.
 *
 * HMRC CIS340 Appendix E compliant layout. Pure presentation component: all
 * data comes in via props. Used for on-screen preview only — the downloadable
 * PDF is built directly from data via jsPDF in generateCISStatementPdf.js.
 *
 * Layout replicated from Alliance Facade Services PDS using exact coordinates
 * extracted via pdfplumber (NimbusSans at 7.8/12.6/15.6/19.2 pt, margins 60pt,
 * line color #ccced2, row height ~29pt, column split at X=303.5 of 595pt page).
 */

const mono = "'Courier New', Courier, monospace";
const sans = "Arial, Helvetica, 'Nimbus Sans', sans-serif";

/* line color matching Alliance PDF: rgb(204,206,210) */
const LINE = "#ccced2";

/* formatting helpers */

const NUM = new Intl.NumberFormat("en-GB", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const fmt = (v) => NUM.format(Number(v || 0));

function fmtShort(d) {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtLong(d) {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function fmtMonthYear(d) {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function periodRange(start, end) {
  if (!start || !end) return "\u2014";
  const s = new Date(start);
  const e = new Date(end);
  const sDay = s.getDate();
  const eDay = e.getDate();
  const sMonth = s.toLocaleDateString("en-GB", { month: "long" });
  const eMonth = e.toLocaleDateString("en-GB", { month: "long" });
  const eYear = e.getFullYear();
  if (s.getFullYear() === eYear)
    return sDay + " " + sMonth + " to " + eDay + " " + eMonth + " " + eYear;
  return sDay + " " + sMonth + " " + s.getFullYear() + " to " + eDay + " " + eMonth + " " + eYear;
}

/* component */

export default function CISStatementDocument({
  contractor = {},
  subcontractor = {},
  period = {},
  amounts = {},
  invoices,
  docId = "cis-pds-pdf-doc",
}) {
  const grossN = Number(amounts.gross_amount || 0);
  const materialsN = Number(amounts.materials_amount || 0);
  const cisN = Number(amounts.cis_deducted || 0);
  const liable = Math.max(0, grossN - materialsN);
  const netPaid = grossN - cisN;
  const rate = amounts.cis_rate_used;

  const invRows =
    Array.isArray(invoices) && invoices.length > 0
      ? invoices
      : [
          {
            reference: period && period.label ? "Summary \u2014 " + period.label : "Summary",
            invoice_date: null,
            payment_date: period && period.period_end,
            gross: grossN,
            materials: materialsN,
            non_cis: 0,
            labour: liable,
            cis: cisN,
            paid: netPaid,
          },
        ];

  /* reusable row: label left, value right, bottom border */
  const KVRow = ({ label, value, bold, isMono }) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        borderBottom: "0.75pt solid " + LINE,
        padding: "7pt 0 8pt 0",
        fontSize: "7.8pt",
        color: "#222",
      }}
    >
      <span>{label}</span>
      <span
        style={{
          fontWeight: bold ? 700 : 400,
          fontFamily: isMono ? mono : "inherit",
          color: "#111",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </div>
  );

  /* section heading with bottom rule */
  const SectionHeading = ({ children }) => (
    <div
      style={{
        fontSize: "12.6pt",
        fontWeight: 700,
        color: "#111",
        borderBottom: "0.75pt solid " + LINE,
        paddingBottom: "4pt",
        marginBottom: "12pt",
      }}
    >
      {children}
    </div>
  );

  return (
    <div
      id={docId}
      style={{
        width: "210mm",
        padding: "16mm 21mm 14mm 21mm",
        color: "#222",
        background: "#fff",
        boxSizing: "border-box",
        fontFamily: sans,
        fontSize: "7.8pt",
        lineHeight: 1.3,
      }}
    >
      {/* TITLE BLOCK */}
      <div
        style={{
          fontSize: "19.2pt",
          fontWeight: 700,
          color: "#111",
          lineHeight: 1.1,
        }}
      >
        Construction Industry Scheme
      </div>
      <div
        style={{
          fontSize: "19.2pt",
          fontWeight: 700,
          color: "#111",
          lineHeight: 1.1,
          marginTop: "2pt",
        }}
      >
        Payment and Deduction Statement
      </div>

      {/* CONTRACTOR NAME + PERIOD (under title) */}
      <div style={{ marginTop: "12pt" }}>
        <div style={{ fontSize: "15.6pt", fontWeight: 700, color: "#111" }}>
          {contractor && contractor.name ? contractor.name : "\u2014"}
        </div>
        <div
          style={{
            fontSize: "15.6pt",
            fontWeight: 700,
            color: "#111",
            marginTop: "1pt",
          }}
        >
          {"For the period "}
          {periodRange(period && period.period_start, period && period.period_end)}
        </div>
      </div>

      {/* CONTRACTOR DETAILS */}
      <div style={{ marginTop: "27mm" }}>
        <SectionHeading>Contractor details</SectionHeading>

        <div style={{ fontSize: "7.8pt", fontWeight: 700, color: "#111" }}>
          {contractor && contractor.name ? contractor.name : "\u2014"}
        </div>
        {contractor && contractor.address && (
          <div
            style={{
              fontSize: "7.8pt",
              fontWeight: 700,
              color: "#111",
              marginTop: "3pt",
            }}
          >
            {contractor.address}
          </div>
        )}

        <div style={{ marginTop: "10pt" }}>
          <KVRow
            label="Payment and deduction made in tax month ended"
            value={fmtShort(period && period.period_end)}
          />
          <KVRow
            label="Employer\u2019s PAYE reference"
            value={contractor && contractor.employer_paye_ref ? contractor.employer_paye_ref : "\u2014"}
            isMono
          />
          {contractor && contractor.accounts_office_ref && (
            <KVRow
              label="Accounts Office reference"
              value={contractor.accounts_office_ref}
              isMono
            />
          )}
        </div>
      </div>

      {/* SUBCONTRACTOR DETAILS + AMOUNTS */}
      <div style={{ marginTop: "20pt" }}>
        <SectionHeading>Subcontractor details</SectionHeading>

        <div
          style={{
            fontSize: "7.8pt",
            fontWeight: 700,
            color: "#111",
            marginBottom: "8pt",
          }}
        >
          {subcontractor && subcontractor.name ? subcontractor.name : "\u2014"}
        </div>
        {subcontractor && subcontractor.address && (
          <div style={{ fontSize: "7.8pt", color: "#222", marginBottom: "8pt" }}>
            {subcontractor.address}
          </div>
        )}

        {/* Two columns: 48.7% each with 12pt gap (from Alliance X positions) */}
        <div style={{ display: "flex", gap: "12pt", alignItems: "flex-start" }}>
          {/* LEFT: identifiers */}
          <div style={{ flex: "0 0 48.7%" }}>
            <KVRow
              label="Unique taxpayers reference"
              value={subcontractor && subcontractor.utr ? subcontractor.utr : "\u2014"}
              isMono
            />
            <KVRow
              label="Verification number"
              value={
                subcontractor && subcontractor.verification_number
                  ? subcontractor.verification_number
                  : rate === "gross_0"
                    ? "N/A"
                    : "\u2014"
              }
              isMono
            />
          </div>

          {/* RIGHT: amounts */}
          <div style={{ flex: "0 0 48.7%" }}>
            <KVRow label="Gross paid (excl VAT) (A)" value={fmt(grossN)} />
            <KVRow label="Less cost of materials" value={fmt(materialsN)} />
            <KVRow label="Less non-CIS" value={fmt(0)} />
            <KVRow label="Liable to deduction" value={fmt(liable)} />
            <KVRow label="Deducted (B)" value={fmt(cisN)} />
            <KVRow label="Paid (A - B)" value={fmt(netPaid)} bold />
          </div>
        </div>
      </div>

      {/* SOURCE INVOICES */}
      <div style={{ marginTop: "20pt" }}>
        <SectionHeading>Source invoices</SectionHeading>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "7.8pt" }}>
          <thead>
            <tr>
              {[
                { label: "Reference", align: "left", w: "14%" },
                { label: "Invoice date", align: "left", w: "12%" },
                { label: "Payment date", align: "left", w: "14%" },
                { label: "Gross\n(A)", align: "right", w: "9%" },
                { label: "Materials", align: "right", w: "10%" },
                { label: "Non-CIS", align: "right", w: "9%" },
                { label: "Labour", align: "right", w: "10%" },
                { label: "CIS\n(B)", align: "right", w: "8%" },
                { label: "Paid\n(A - B)", align: "right", w: "10%" },
              ].map(function (col, i) {
                return (
                  <th
                    key={i}
                    style={{
                      padding: "5pt 3pt",
                      fontSize: "7.8pt",
                      fontWeight: 700,
                      color: "#111",
                      textAlign: col.align,
                      borderTop: "0.75pt solid " + LINE,
                      borderBottom: "0.75pt solid " + LINE,
                      width: col.w,
                      whiteSpace: "pre-line",
                      verticalAlign: "bottom",
                    }}
                  >
                    {col.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {invRows.map(function (r, i) {
              return (
                <tr key={i}>
                  <td style={{ padding: "5pt 3pt", borderBottom: "0.75pt solid " + LINE }}>
                    {r.reference || "\u2014"}
                  </td>
                  <td style={{ padding: "5pt 3pt", borderBottom: "0.75pt solid " + LINE }}>
                    {r.invoice_date ? fmtMonthYear(r.invoice_date) : "\u2014"}
                  </td>
                  <td style={{ padding: "5pt 3pt", borderBottom: "0.75pt solid " + LINE }}>
                    {fmtLong(r.payment_date)}
                  </td>
                  {[r.gross, r.materials, r.non_cis, r.labour, r.cis, r.paid].map(
                    function (v, j) {
                      return (
                        <td
                          key={j}
                          style={{
                            padding: "5pt 3pt",
                            textAlign: "right",
                            fontVariantNumeric: "tabular-nums",
                            borderBottom: "0.75pt solid " + LINE,
                          }}
                        >
                          {fmt(v)}
                        </td>
                      );
                    }
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* FOOTER */}
      <div
        style={{
          marginTop: "28pt",
          paddingTop: "6pt",
          borderTop: "0.75pt solid " + LINE,
          fontSize: "7.8pt",
          color: "#777",
          lineHeight: 1.4,
        }}
      >
        This statement is issued under the HMRC Construction Industry Scheme
        (CIS340), Appendix E. Contractors must provide it to subcontractors
        within 14 days of the end of each tax month. Keep this record for
        your tax return. Generated by InvoiceSaga on {fmtShort(new Date())}.
      </div>

      {/* PAGE STRIP (bottom, matching Alliance Y=787) */}
      <div
        style={{
          marginTop: "20pt",
          display: "flex",
          justifyContent: "space-between",
          fontSize: "7.8pt",
          color: "#999",
        }}
      >
        <span>
          CIS Payment Deduction Statement | {contractor && contractor.name ? contractor.name : "\u2014"}
        </span>
        <span>1 of 1</span>
      </div>
    </div>
  );
}