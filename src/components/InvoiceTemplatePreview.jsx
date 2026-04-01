import { DEFAULT_TEMPLATE } from "../utils/InvoiceTemplateSchema"

const FONT_MAP = {
  inter: "'Inter', sans-serif",
  mono: "'Courier New', monospace",
  serif: "'Georgia', serif",
}

const FIELD_LABELS = {
  companyName: "Company",
  contactName: "Contact",
  address: "Address",
  city: "City",
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
}

function isVisible(def) {
  return Boolean(def && def.visible !== false)
}

function sortedVisibleEntries(fields = {}) {
  return Object.entries(fields)
    .filter(([, cfg]) => isVisible(cfg))
    .sort((a, b) => (a[1]?.order ?? 999) - (b[1]?.order ?? 999))
}

function money(value, currency = "£") {
  const number = Number(value || 0)
  return `${currency}${number.toLocaleString("en-GB", { maximumFractionDigits: 2 })}`
}

function getInvoiceFieldValue(key, invoiceData = {}) {
  const map = {
    invoiceNumber: invoiceData.invoiceNumber,
    issueDate: invoiceData.issueDate,
    dueDate: invoiceData.dueDate,
    poNumber: invoiceData.poNumber,
    currency: invoiceData.currency || invoiceData.currencyCode || invoiceData.currencySymbol || "GBP",
    reference: invoiceData.reference,
  }
  return map[key] ?? ""
}

function getCompanyBankData() {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return {}

  const parse = (key) => {
    try {
      const value = localStorage.getItem(key)
      return value ? JSON.parse(value) : {}
    } catch {
      return {}
    }
  }

  const company = parse("ai_invoice_company")
  const org = parse("ai_invoice_org")
  const legacySettings = parse("invoicesaga_settings")

  return {
    accountName: company.accountName || org.accountName || legacySettings.accountName || "",
    bankName: company.bankName || org.bankName || legacySettings.bankName || "",
    accountNumber: company.accountNumber || company.bankAcc || org.accountNumber || org.bankAcc || legacySettings.accountNumber || legacySettings.bankAcc || "",
    sortCode: company.sortCode || company.bankSort || org.sortCode || org.bankSort || legacySettings.sortCode || legacySettings.bankSort || "",
    iban: company.iban || company.bankIban || org.iban || org.bankIban || legacySettings.iban || legacySettings.bankIban || "",
    swift: company.swift || company.bankSwift || org.swift || org.bankSwift || legacySettings.swift || legacySettings.bankSwift || "",
    routingNumber: company.routingNumber || org.routingNumber || legacySettings.routingNumber || "",
  }
}

function getLineValue(colKey, item, currency) {
  const quantity = Number(item?.quantity || 0)
  const unitPrice = Number(item?.unitPrice || 0)
  const taxRate = Number(item?.tax || 0)
  const discount = Number(item?.discount || 0)
  const base = quantity * unitPrice
  const discounted = base - discount
  const taxValue = (discounted * taxRate) / 100

  switch (colKey) {
    case "description":
      return item?.description || "-"
    case "quantity":
      return quantity
    case "unitPrice":
      return money(unitPrice, currency)
    case "tax":
      return `${taxRate}%`
    case "discount":
      return money(discount, currency)
    case "total":
      return money(item?.total ?? discounted + taxValue, currency)
    default:
      return ""
  }
}

export default function InvoiceTemplatePreview({ template, invoiceData, scale = 1 }) {
  const safeTemplate = {
    ...DEFAULT_TEMPLATE,
    ...template,
    layout: { ...DEFAULT_TEMPLATE.layout, ...(template?.layout || {}) },
    sections: { ...DEFAULT_TEMPLATE.sections, ...(template?.sections || {}) },
    fromFields: { ...DEFAULT_TEMPLATE.fromFields, ...(template?.fromFields || {}) },
    toFields: { ...DEFAULT_TEMPLATE.toFields, ...(template?.toFields || {}) },
    invoiceFields: { ...DEFAULT_TEMPLATE.invoiceFields, ...(template?.invoiceFields || {}) },
    lineItemColumns: { ...DEFAULT_TEMPLATE.lineItemColumns, ...(template?.lineItemColumns || {}) },
    totalsBlock: { ...DEFAULT_TEMPLATE.totalsBlock, ...(template?.totalsBlock || {}) },
    bankFields: { ...DEFAULT_TEMPLATE.bankFields, ...(template?.bankFields || {}) },
    customText: { ...DEFAULT_TEMPLATE.customText, ...(template?.customText || {}) },
  }

  const accentColor = safeTemplate.layout.accentColor || safeTemplate.accentColor || "#111110"
  const fontFamily = FONT_MAP[safeTemplate.layout.fontFamily] || FONT_MAP.inter
  const currencySymbol = invoiceData?.currencySymbol || invoiceData?.currency || "£"

  const fromEntries = sortedVisibleEntries(safeTemplate.fromFields)
  const toEntries = sortedVisibleEntries(safeTemplate.toFields)
  const invoiceFieldEntries = sortedVisibleEntries(safeTemplate.invoiceFields)
  const lineColumns = sortedVisibleEntries(safeTemplate.lineItemColumns)
  const invoiceBankData = invoiceData?.bank || {}
  const companyBankData = getCompanyBankData()
  const bankData = Object.keys(invoiceBankData).some((key) => Boolean(invoiceBankData[key])) ? invoiceBankData : companyBankData
  const bankEntries = Object.entries(safeTemplate.bankFields || {})
    .filter(([key, config]) => config?.visible && bankData[key])
    .sort((a, b) => (a[1]?.order ?? 999) - (b[1]?.order ?? 999))

  const logoPosition = safeTemplate.layout.logoPosition || "left"
  const headerStyle = {
    background: accentColor,
    color: "#fff",
    padding: "18px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    ...(logoPosition === "right" ? { flexDirection: "row-reverse" } : {}),
    ...(logoPosition === "center" ? { textAlign: "center" } : {}),
  }

  return (
    <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: `${100 / scale}%` }}>
      <div style={{ position: "relative", background: "#fff", border: "1px solid #DCDCDC", borderRadius: 8, overflow: "hidden", color: "#111", fontFamily }}>
        {safeTemplate.sections.watermark && invoiceData?.status === "paid" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              pointerEvents: "none",
              zIndex: 2,
            }}
          >
            <div style={{ transform: "rotate(-45deg)", fontSize: 86, fontWeight: 800, color: "rgba(17,17,16,0.12)", letterSpacing: 3 }}>
              {safeTemplate.customText.watermarkText || "PAID"}
            </div>
          </div>
        )}

        {safeTemplate.sections.header && (
          <div style={headerStyle}>
            <div style={{ flex: 1 }}>
              {logoPosition !== "none" && (
                <div style={{ width: 86, height: 46, border: "2px dashed rgba(255,255,255,0.5)", borderRadius: 8, display: "grid", placeItems: "center", fontSize: 11, marginBottom: 8 }}>
                  LOGO
                </div>
              )}
              <div style={{ fontSize: 13, opacity: 0.95 }}>{invoiceData?.from?.companyName}</div>
            </div>
            <div style={{ textAlign: logoPosition === "center" ? "center" : "right" }}>
              <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 1 }}>INVOICE</div>
              <div style={{ fontSize: 13, opacity: 0.95 }}>{invoiceData?.invoiceNumber || "-"}</div>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: "1px solid #E8E8E8" }}>
          {safeTemplate.sections.fromBlock && (
            <div style={{ padding: 16, borderRight: "1px solid #E8E8E8" }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>FROM</div>
              {fromEntries.map(([key]) => (
                <div key={key} style={{ fontSize: 13, marginBottom: 4 }}>
                  <strong>{FIELD_LABELS[key] || key}:</strong> {invoiceData?.from?.[key] || ""}
                </div>
              ))}
            </div>
          )}

          {safeTemplate.sections.toBlock && (
            <div style={{ padding: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>TO</div>
              {toEntries.map(([key]) => (
                <div key={key} style={{ fontSize: 13, marginBottom: 4 }}>
                  <strong>{FIELD_LABELS[key] || key}:</strong> {invoiceData?.to?.[key] || ""}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ borderTop: "1px solid #E8E8E8", padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
            {invoiceFieldEntries.map(([key, cfg]) => (
              <div key={key} style={{ border: "1px solid #EFEFEF", borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: 11, color: "#666" }}>{cfg?.label || key}</div>
                <div style={{ fontWeight: 700 }}>{getInvoiceFieldValue(key, invoiceData)}</div>
              </div>
            ))}
          </div>
        </div>

        {safeTemplate.customText.headerNote && (
          <div style={{ borderTop: "1px solid #E8E8E8", padding: 16, fontSize: 13 }}>{safeTemplate.customText.headerNote}</div>
        )}

        <div style={{ borderTop: "1px solid #E8E8E8", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: accentColor, color: "#fff" }}>
                {lineColumns.map(([key, cfg]) => (
                  <th key={key} style={{ textAlign: key === "description" ? "left" : "right", padding: "10px 12px", fontWeight: 700 }}>
                    {cfg?.label || key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(invoiceData?.items || []).map((item, idx) => (
                <tr key={`${item?.description || "item"}-${idx}`} style={{ borderBottom: "1px solid #EFEFEF" }}>
                  {lineColumns.map(([key]) => (
                    <td key={key} style={{ textAlign: key === "description" ? "left" : "right", padding: "10px 12px" }}>
                      {getLineValue(key, item, currencySymbol)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ borderTop: "1px solid #E8E8E8", padding: 16, display: "flex", justifyContent: "flex-end" }}>
          <div style={{ minWidth: 280, display: "grid", gap: 8 }}>
            {safeTemplate.totalsBlock.subtotal?.visible !== false && <div style={{ display: "flex", justifyContent: "space-between" }}><span>Subtotal:</span><strong>{money(invoiceData?.subtotal, currencySymbol)}</strong></div>}
            {safeTemplate.totalsBlock.discount?.visible && <div style={{ display: "flex", justifyContent: "space-between" }}><span>Discount:</span><strong>{money(invoiceData?.discount, currencySymbol)}</strong></div>}
            {safeTemplate.totalsBlock.tax?.visible !== false && <div style={{ display: "flex", justifyContent: "space-between" }}><span>Tax:</span><strong>{money(invoiceData?.tax, currencySymbol)}</strong></div>}
            {safeTemplate.totalsBlock.total?.visible !== false && (
              <div style={{ display: "flex", justifyContent: "space-between", background: accentColor, color: "#fff", padding: "8px 10px", borderRadius: 6 }}>
                <span>Total:</span>
                <strong>{money(invoiceData?.total, currencySymbol)}</strong>
              </div>
            )}
            {safeTemplate.totalsBlock.paidAmount?.visible && <div style={{ display: "flex", justifyContent: "space-between" }}><span>Paid:</span><strong>{money(invoiceData?.paidAmount, currencySymbol)}</strong></div>}
            {safeTemplate.totalsBlock.amountDue?.visible !== false && <div style={{ display: "flex", justifyContent: "space-between" }}><span>Amount Due:</span><strong>{money(invoiceData?.amountDue ?? invoiceData?.total, currencySymbol)}</strong></div>}
          </div>
        </div>

        {safeTemplate.sections.bankDetails && bankEntries.length > 0 && (
          <div style={{ borderTop: "1px solid #E8E8E8", padding: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Bank Details</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, fontSize: 13 }}>
              {bankEntries.map(([key]) => (
                <div key={key}>
                  <strong>{FIELD_LABELS[key] || key}:</strong> {bankData[key]}
                </div>
              ))}
            </div>
          </div>
        )}

        {(safeTemplate.sections.notes || safeTemplate.sections.footer) && (
          <div style={{ borderTop: "1px solid #E8E8E8", padding: 16, fontSize: 13 }}>
            {safeTemplate.sections.notes && invoiceData?.notes && <div style={{ marginBottom: safeTemplate.customText.paymentTerms ? 8 : 0 }}>{invoiceData.notes}</div>}
            {safeTemplate.customText.paymentTerms && <div><strong>Payment Terms:</strong> {safeTemplate.customText.paymentTerms}</div>}
            {safeTemplate.sections.footer && safeTemplate.customText.footerNote && <div style={{ marginTop: 8 }}>{safeTemplate.customText.footerNote}</div>}
          </div>
        )}
      </div>
    </div>
  )
}
