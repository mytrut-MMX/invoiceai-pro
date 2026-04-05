import { PDF_TEMPLATES } from "../../constants";
import { fmt, fmtDate, formatPhoneNumber, formatSortCode } from "../../utils/helpers";
import { DEFAULT_TEMPLATE, getDefaultTemplate } from "../../utils/InvoiceTemplateSchema";

const FONT_MAP = {
  inter: "'Inter', 'Lato', 'DM Sans', 'Helvetica Neue', sans-serif",
  mono: "'Courier New', monospace",
  serif: "'Georgia', serif",
};

const FIELD_LABELS = {
  companyName: "Company",
  contactName: "Contact",
  address: "Address",
  city: "City",
  postcode: "Postcode",
  country: "Country",
  phone: "Phone",
  email: "Email",
  vatNumber: "VAT",
  registrationNumber: "Reg. No.",
  website: "Website",
  accountName: "Account Name",
  bankName: "Bank",
  accountNumber: "Account",
  sortCode: "Sort Code",
  iban: "IBAN",
  swift: "SWIFT",
  routingNumber: "Routing",
};

const sortVisibleEntries = (fields = {}) =>
  Object.entries(fields)
    .filter(([, cfg]) => cfg?.visible !== false)
    .sort((a, b) => (a?.[1]?.order ?? 999) - (b?.[1]?.order ?? 999));

const buildActiveTemplate = (templateInput) => ({
  ...DEFAULT_TEMPLATE,
  ...(templateInput || {}),
  layout: { ...DEFAULT_TEMPLATE.layout, ...(templateInput?.layout || {}) },
  sections: { ...DEFAULT_TEMPLATE.sections, ...(templateInput?.sections || {}) },
  fromFields: { ...DEFAULT_TEMPLATE.fromFields, ...(templateInput?.fromFields || {}) },
  toFields: { ...DEFAULT_TEMPLATE.toFields, ...(templateInput?.toFields || {}) },
  lineItemColumns: { ...DEFAULT_TEMPLATE.lineItemColumns, ...(templateInput?.lineItemColumns || {}) },
  totalsBlock: { ...DEFAULT_TEMPLATE.totalsBlock, ...(templateInput?.totalsBlock || {}) },
  bankFields: { ...DEFAULT_TEMPLATE.bankFields, ...(templateInput?.bankFields || {}) },
  customText: { ...DEFAULT_TEMPLATE.customText, ...(templateInput?.customText || {}) },
});

export function A4InvoiceDoc({ data, currSymbol, isVat, orgSettings, accentColor, template = "classic", footerText = "", templateConfig, invoiceTemplate, docId = "a4-invoice-doc" }) {
  const { docNumber, customer, issueDate, dueDate, paymentTerms, items, subtotal, discountAmount, shipping, taxBreakdown, cisDeduction, total, notes, terms, docType } = data;
  const isQuote = docType === "quote";
  const docLabel = isQuote ? "Quote" : "Invoice";
  const docLabelUpper = docLabel.toUpperCase();
  const sym = currSymbol || "£";
  const org = orgSettings || {};
  const tplDef = PDF_TEMPLATES.find(t => t.id === template) || PDF_TEMPLATES[0];
  const activeSchemaTemplate = buildActiveTemplate(invoiceTemplate || getDefaultTemplate());
  const accent = accentColor || activeSchemaTemplate.layout?.accentColor || templateConfig?.accentColor || tplDef.defaultAccent;
  const fontFamily = FONT_MAP[activeSchemaTemplate.layout?.fontFamily] || FONT_MAP.inter;
  const fromEntries = sortVisibleEntries(activeSchemaTemplate.fromFields);
  const toEntries = sortVisibleEntries(activeSchemaTemplate.toFields);
  const bankEntries = sortVisibleEntries(activeSchemaTemplate.bankFields);
  const visibleLineColumns = sortVisibleEntries(activeSchemaTemplate.lineItemColumns);

  const fromData = {
    companyName: org.orgName || "",
    address: org.street || "",
    city: org.city || "",
    country: org.country || "",
    phone: org.phone || "",
    email: org.email || "",
    vatNumber: org.vatNum || "",
    registrationNumber: org.crn || "",
    website: org.website || "",
  };

  const toData = {
    companyName: customer?.companyName || customer?.name || "",
    contactName: customer?.name || "",
    // Support both street1 (CustomerModal format) and street (legacy/demo format)
    address: customer?.billingAddress?.street1 || customer?.billingAddress?.street || "",
    city: customer?.billingAddress?.city || "",
    // Support both zip (CustomerModal) and postcode (legacy/demo)
    postcode: customer?.billingAddress?.zip || customer?.billingAddress?.postcode || "",
    country: customer?.billingAddress?.country || "",
    email: customer?.email || "",
    vatNumber: customer?.vatNumber || "",
    phone: customer?.phone || "",
  };

  const bankData = {
    bankName: org.bankName || "",
    accountName: org.accountName || org.orgName || "",
    accountNumber: org.bankAcc || "",
    sortCode: formatSortCode(org.bankSort || ""),
    iban: org.bankIban || "",
    swift: org.bankSwift || "",
    routingNumber: org.routingNumber || "",
  };

  const OrgBlock = ({ dark = false }) => (
    <div>
      {org.logo && <img src={org.logo} alt="logo" style={{ maxHeight: (templateConfig?.logoSize || org.logoSize || 52), maxWidth: 200, objectFit: "contain", display: "block", marginBottom: 5, marginLeft: (templateConfig?.logoPosition || "left") === "right" ? "auto" : 0, marginRight: (templateConfig?.logoPosition || "left") === "center" ? "auto" : 0 }} />}
      {(activeSchemaTemplate.sections?.fromBlock ? fromEntries : [["companyName"]]).map(([fieldKey]) => (
        <div key={fieldKey} style={{ fontSize: fieldKey === "companyName" ? "15pt" : "7.5pt", fontWeight: fieldKey === "companyName" ? 900 : 500, color: dark ? "#fff" : (fieldKey === "companyName" ? accent : "#666"), letterSpacing: fieldKey === "companyName" ? "-0.01em" : "normal", marginTop: fieldKey === "companyName" ? 0 : 2 }}>
          {fieldKey === "companyName" ? (fromData[fieldKey] || "Your Company") : <><strong>{FIELD_LABELS[fieldKey] || fieldKey}:</strong> {fromData[fieldKey] || "—"}</>}
        </div>
      ))}
    </div>
  );

  const InvoiceMetaBlock = ({ dark = false }) => (
    <div>
      <div style={{ fontSize: "7pt", fontWeight: 700, color: dark ? "rgba(255,255,255,0.5)" : "#AAA", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "3mm" }}>{docLabel} Details</div>
      {[[`${docLabel} No`, docNumber || "INV-0001"], ["Issue Date", fmtDate(issueDate)], [isQuote ? "Valid Until" : "Due Date", fmtDate(dueDate)], [isQuote ? "Validity" : "Payment Terms", paymentTerms || (isQuote ? "Valid 30 days" : "Net 30")]].map(([l, v]) => (
        <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "1.5mm 0", borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.12)" : "#F0F0F0"}` }}>
          <span style={{ fontSize: "8.5pt", color: dark ? "rgba(255,255,255,0.6)" : "#888" }}>{l}</span>
          <span style={{ fontSize: "8.5pt", fontWeight: 700, color: dark ? "#fff" : "#1A1A1A" }}>{v}</span>
        </div>
      ))}
    </div>
  );

  const BillToBlock = ({ dark = false }) => {
    const skipContact = toData.contactName && toData.companyName &&
      toData.contactName.trim().toLowerCase() === toData.companyName.trim().toLowerCase();
    return (
    <div>
      <div style={{ fontSize: "7pt", fontWeight: 700, color: dark ? "rgba(255,255,255,0.5)" : "#AAA", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "3mm" }}>Bill To</div>
      {customer ? toEntries.filter(([fieldKey]) => !(fieldKey === "contactName" && skipContact)).map(([fieldKey]) => (
        <div key={fieldKey} style={{ fontSize: "8.5pt", color: dark ? "rgba(255,255,255,0.7)" : "#555", marginTop: 2 }}>
          <strong>{FIELD_LABELS[fieldKey] || fieldKey}:</strong>{" "}
          {fieldKey === "phone" ? formatPhoneNumber(toData[fieldKey] || "") : (toData[fieldKey] || "—")}
        </div>
      )) : <div style={{ fontSize: "9pt", color: "#CCC", fontStyle: "italic" }}>No customer selected</div>}
    </div>
    );
  };

  const ItemsTable = ({ headerBg = accent, headerColor = "#fff", stripeBg = "#FAFAFA" }) => (
    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "5mm" }}>
      <thead>
        <tr style={{ background: headerBg }}>
          {visibleLineColumns.map(([colKey, colCfg], i) => (
            <th key={colKey} style={{ padding: "2.5mm 3mm", textAlign: i > 0 ? "right" : "left", fontSize: "7.5pt", fontWeight: 700, color: headerColor, letterSpacing: "0.04em" }}>{colCfg?.label || colKey}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {(items || []).filter(it => (it.name || it.description) || it.amount > 0).map((it, idx) => (
          <tr key={it.id || idx} style={{ background: idx % 2 === 0 ? stripeBg : "#fff" }}>
            {visibleLineColumns.map(([colKey], i) => {
              const isDesc = i === 0;
              const cellStyle = { padding: "2.5mm 3mm", fontSize: "9pt", textAlign: isDesc ? "left" : "right", color: isDesc ? "#1A1A1A" : "#666" };
              if (colKey === "description") return <td key={colKey} style={cellStyle}><div style={{ fontWeight: 700 }}>{it.name || `Item ${idx + 1}`}</div>{it.description && <div style={{ fontSize: "8pt", color: "#666", marginTop: 1 }}>{it.description}</div>}</td>;
              if (colKey === "quantity") return <td key={colKey} style={cellStyle}>{it.quantity}</td>;
              if (colKey === "unitPrice") return <td key={colKey} style={cellStyle}>{fmt(sym, it.rate)}</td>;
              if (colKey === "tax") return <td key={colKey} style={cellStyle}>{isVat ? `${it.tax_rate}%` : "—"}</td>;
              if (colKey === "discount") return <td key={colKey} style={cellStyle}>{fmt(sym, it.discount || 0)}</td>;
              return <td key={colKey} style={{ ...cellStyle, fontWeight: 700 }}>{fmt(sym, it.amount)}</td>;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );

  const TotalsSection = () => (
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "5mm" }}>
      <div style={{ minWidth: "62mm" }}>
        {[["Subtotal", fmt(sym, subtotal || 0)],
          ...((discountAmount || 0) > 0 ? [["Discount", `− ${fmt(sym, discountAmount)}`, "#E86C4A"]] : []),
          ...(Number(shipping) > 0 ? [["Shipping", fmt(sym, shipping)]] : []),
          ...(isVat ? (taxBreakdown || []).map(tb => [`VAT ${tb.rate}%`, fmt(sym, tb.amount)]) : []),
          ...((cisDeduction || 0) > 0 ? [[isQuote ? "CIS Deduction (Est.)" : "CIS Deduction", `− ${fmt(sym, cisDeduction)}`, "#D97706"]] : []),
        ].map(([l, v, c]) => (
          <div key={l} style={{ display: "flex", justifyContent: "space-between", gap: "8mm", padding: "1.5mm 0", borderBottom: "1px solid #F4F4F4" }}>
            <span style={{ fontSize: "8.5pt", color: "#888" }}>{l}</span>
            <span style={{ fontSize: "8.5pt", color: c || "#555" }}>{v}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", gap: "8mm", padding: "3mm 4mm 2mm", background: accent, borderRadius: 4, marginTop: 2 }}>
          <span style={{ fontSize: "10pt", fontWeight: 800, color: "#fff" }}>{isQuote ? "Quote Total" : "Total Due"}</span>
          <span style={{ fontSize: "11pt", fontWeight: 900, color: "#fff" }}>{fmt(sym, total || 0)}</span>
        </div>
      </div>
    </div>
  );

  const NotesSection = () => (templateConfig?.showNotesField === false ? false : (notes || terms)) ? (
    <div style={{ borderTop: "1px solid #EBEBEB", paddingTop: "4mm", display: "grid", gridTemplateColumns: notes && terms ? "1fr 1fr" : "1fr", gap: "6mm" }}>
      {notes && <div><div style={{ fontSize: "7pt", fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "2mm" }}>Notes</div><p style={{ fontSize: "8pt", color: "#555", margin: 0, lineHeight: 1.7 }}>{notes}</p></div>}
      {terms && <div><div style={{ fontSize: "7pt", fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "2mm" }}>Payment Terms</div><p style={{ fontSize: "8pt", color: "#555", margin: 0, lineHeight: 1.7 }}>{terms}</p></div>}
    </div>
  ) : null;

  const FooterBar = () => (
    <div style={{ position: "absolute", bottom: "10mm", left: "18mm", right: "18mm", borderTop: "1px solid #EBEBEB", paddingTop: "2.5mm" }}>
      {(activeSchemaTemplate.customText?.footerNote || footerText)
        ? <div style={{ fontSize: "7pt", color: "#888", textAlign: "center", lineHeight: 1.6 }}>{activeSchemaTemplate.customText?.footerNote || footerText}</div>
        : <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "7pt", color: "#CCC" }}>{org.orgName || ""}{org.vatNum ? ` · VAT ${org.vatNum}` : ""}{org.crn ? ` · CRN ${org.crn}` : ""}</span>
            <span style={{ fontSize: "7pt", color: "#CCC" }}>{org.email || ""}</span>
          </div>
      }
    </div>
  );

  const base = { width: "210mm", minHeight: "297mm", background: "#fff", fontFamily, boxSizing: "border-box", fontSize: "10pt", color: "#1A1A1A", position: "relative" };

  const FromBlock = ({ dark = false }) => (
    <div>
      <div style={{ fontSize: "7pt", fontWeight: 700, color: dark ? "rgba(255,255,255,0.5)" : "#AAA", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "3mm" }}>From</div>
      {fromEntries.map(([fieldKey]) => (
        <div key={fieldKey} style={{ fontSize: "8.5pt", color: dark ? "rgba(255,255,255,0.7)" : "#555", marginTop: 2 }}>
          <strong>{FIELD_LABELS[fieldKey] || fieldKey}:</strong> {fromData[fieldKey] || "—"}
        </div>
      ))}
    </div>
  );

  const BankDetailsBlock = () => activeSchemaTemplate.sections?.bankDetails && bankEntries.length > 0 ? (
    <div style={{ borderTop: "1px solid #EBEBEB", marginTop: "3mm", paddingTop: "3mm" }}>
      <div style={{ fontSize: "7pt", fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "2mm" }}>Bank Details</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2mm 6mm" }}>
        {bankEntries.map(([fieldKey]) => (
          <div key={fieldKey} style={{ fontSize: "8pt", color: "#666" }}>
            <strong>{FIELD_LABELS[fieldKey] || fieldKey}:</strong> {bankData[fieldKey] || "—"}
          </div>
        ))}
      </div>
    </div>
  ) : null;

  if (template === "modern") return (
    <div id={docId} style={{ ...base, display: "flex", flexDirection: "column", padding: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: "42% 58%" }}>
        <div style={{ background: accent, padding: "14mm 12mm 10mm 14mm", minHeight: "62mm" }}>
          <OrgBlock dark />
          {activeSchemaTemplate.sections?.toBlock && <div style={{ marginTop: "8mm" }}><BillToBlock dark /></div>}
        </div>
        <div style={{ padding: "14mm 14mm 10mm 12mm", background: "#fff" }}>
          <div style={{ fontSize: "28pt", fontWeight: 900, color: accent, letterSpacing: "-0.02em", lineHeight: 1 }}>{docLabelUpper}</div>
          <div style={{ fontSize: "12pt", fontWeight: 700, color: "#555", marginTop: 3, marginBottom: "6mm" }}>{docNumber || "INV-0001"}</div>
          <InvoiceMetaBlock />
        </div>
      </div>
      <div style={{ padding: "8mm 14mm 14mm" }}>
        <ItemsTable headerBg={`${accent}18`} headerColor={accent} stripeBg="#F0F7FF" />
        <TotalsSection /><NotesSection /><BankDetailsBlock />
      </div>
      <FooterBar />
    </div>
  );

  if (template === "minimal") return (
    <div id={docId} style={{ ...base, padding: "14mm 18mm 16mm" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8mm" }}>
        <OrgBlock />
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "10pt", fontWeight: 700, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.14em" }}>{docLabel}</div>
          <div style={{ fontSize: "18pt", fontWeight: 900, color: accent, marginTop: 1 }}>{docNumber || "INV-0001"}</div>
        </div>
      </div>
      <div style={{ height: 2, background: `linear-gradient(90deg,${accent},${accent}44)`, marginBottom: "7mm", borderRadius: 1 }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8mm", marginBottom: "7mm", paddingTop: "1mm" }}>
        {activeSchemaTemplate.sections?.toBlock ? <BillToBlock /> : <div />}
        <InvoiceMetaBlock />
      </div>
      <ItemsTable headerBg={`${accent}15`} headerColor={accent} stripeBg="#FAFAFA" />
      <TotalsSection /><NotesSection /><BankDetailsBlock /><FooterBar />
    </div>
  );

  if (template === "branded") return (
    <div id={docId} style={{ ...base, padding: 0 }}>
      <div style={{ background: `linear-gradient(135deg,${accent} 0%,${accent}BB 100%)`, padding: "12mm 18mm 8mm", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -20, right: -20, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
          <OrgBlock dark />
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "24pt", fontWeight: 900, color: "#fff" }}>{docLabelUpper}</div>
            <div style={{ fontSize: "12pt", fontWeight: 700, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>{docNumber || "INV-0001"}</div>
          </div>
        </div>
      </div>
      <div style={{ background: tplDef.defaultBg || "#FFF7F4", padding: "8mm 18mm 5mm", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10mm", borderBottom: `3px solid ${accent}` }}>
        {activeSchemaTemplate.sections?.toBlock ? <BillToBlock /> : <div />}
        <InvoiceMetaBlock />
      </div>
      <div style={{ padding: "7mm 18mm 14mm" }}>
        <ItemsTable headerBg={`${accent}22`} headerColor={accent} stripeBg="#FFFAF8" />
        <TotalsSection /><NotesSection /><BankDetailsBlock />
      </div>
      <FooterBar />
    </div>
  );

  // default: classic
  return (
    <div id={docId} style={{ ...base }}>
      <div style={{ background: accent, padding: "14mm 18mm 10mm", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <OrgBlock dark />
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "22pt", fontWeight: 900, color: "#fff", letterSpacing: "0.04em" }}>{docLabelUpper}</div>
          <div style={{ fontSize: "12pt", color: "rgba(255,255,255,0.8)", fontWeight: 700, marginTop: 2 }}>{docNumber || "INV-0001"}</div>
        </div>
      </div>
      <div style={{ padding: "8mm 18mm 14mm" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8mm", marginBottom: "8mm", paddingBottom: "6mm", borderBottom: `2px solid ${accent}` }}>
          <div style={{ marginTop: "4mm" }}>
            {activeSchemaTemplate.sections?.toBlock && <BillToBlock />}
          </div>
          <InvoiceMetaBlock />
        </div>
        <ItemsTable headerBg={accent} headerColor="#fff" stripeBg="#F8F8F8" />
        <TotalsSection /><NotesSection /><BankDetailsBlock />
      </div>
      <FooterBar />
    </div>
  );
}
