import { useState, useRef } from 'react'
import { fmt } from '../store/index.js'

// ─── BUILT-IN THEMES ────────────────────────────────────────────────────────
export const BUILT_IN_THEMES = [
  {
    id: 'noir',
    name: 'Noir Executive',
    preview: ['#0f0f0f', '#c9a84c', '#1a1a1a'],
    config: {
      layout: 'classic',
      primaryColor: '#0f0f0f', accentColor: '#c9a84c', accentText: '#0f0f0f',
      bodyBg: '#ffffff', bodyText: '#1a1a1a', mutedText: '#6b6b6b',
      headerBg: '#0f0f0f', headerText: '#ffffff',
      tableHeadBg: '#0f0f0f', tableHeadText: '#c9a84c',
      rowEvenBg: '#ffffff', rowOddBg: '#f9f7f4',
      totalBoxBg: '#0f0f0f', totalBoxText: '#c9a84c',
      borderColor: '#e8e4de', accentBorder: '#c9a84c',
      fontTitle: 'Playfair Display', fontBody: 'DM Sans',
      logoSize: 52, logoPosition: 'left',
      headerLayout: 'split',
      showDivider: true, dividerStyle: 'thick',
      borderRadius: 0,
      showSectionLabels: true,
      footerStyle: 'minimal',
    }
  },
  {
    id: 'arctic',
    name: 'Arctic Clean',
    preview: ['#f0f4f8', '#3b82f6', '#1e293b'],
    config: {
      layout: 'modern',
      primaryColor: '#1e293b', accentColor: '#3b82f6', accentText: '#ffffff',
      bodyBg: '#f8fafc', bodyText: '#1e293b', mutedText: '#64748b',
      headerBg: '#f0f4f8', headerText: '#1e293b',
      tableHeadBg: '#3b82f6', tableHeadText: '#ffffff',
      rowEvenBg: '#ffffff', rowOddBg: '#f8fafc',
      totalBoxBg: '#1e293b', totalBoxText: '#ffffff',
      borderColor: '#e2e8f0', accentBorder: '#3b82f6',
      fontTitle: 'Sora', fontBody: 'Sora',
      logoSize: 48, logoPosition: 'left',
      headerLayout: 'left-heavy',
      showDivider: true, dividerStyle: 'thin',
      borderRadius: 8,
      showSectionLabels: true,
      footerStyle: 'colored',
    }
  },
  {
    id: 'verde',
    name: 'Verde & Gold',
    preview: ['#064e3b', '#d4af37', '#f9fafb'],
    config: {
      layout: 'classic',
      primaryColor: '#064e3b', accentColor: '#d4af37', accentText: '#064e3b',
      bodyBg: '#ffffff', bodyText: '#111827', mutedText: '#6b7280',
      headerBg: '#064e3b', headerText: '#ffffff',
      tableHeadBg: '#064e3b', tableHeadText: '#d4af37',
      rowEvenBg: '#ffffff', rowOddBg: '#f0fdf4',
      totalBoxBg: '#064e3b', totalBoxText: '#d4af37',
      borderColor: '#d1fae5', accentBorder: '#d4af37',
      fontTitle: 'Cormorant Garamond', fontBody: 'DM Sans',
      logoSize: 56, logoPosition: 'left',
      headerLayout: 'split',
      showDivider: true, dividerStyle: 'double',
      borderRadius: 2,
      showSectionLabels: true,
      footerStyle: 'branded',
    }
  },
  {
    id: 'slate',
    name: 'Slate Modern',
    preview: ['#334155', '#f97316', '#f1f5f9'],
    config: {
      layout: 'sidebar',
      primaryColor: '#334155', accentColor: '#f97316', accentText: '#ffffff',
      bodyBg: '#f1f5f9', bodyText: '#0f172a', mutedText: '#64748b',
      headerBg: '#334155', headerText: '#ffffff',
      tableHeadBg: '#475569', tableHeadText: '#f1f5f9',
      rowEvenBg: '#ffffff', rowOddBg: '#f8fafc',
      totalBoxBg: '#334155', totalBoxText: '#f97316',
      borderColor: '#cbd5e1', accentBorder: '#f97316',
      fontTitle: 'Space Grotesk', fontBody: 'Space Grotesk',
      logoSize: 46, logoPosition: 'left',
      headerLayout: 'stacked',
      showDivider: false, dividerStyle: 'none',
      borderRadius: 12,
      showSectionLabels: true,
      footerStyle: 'minimal',
    }
  },
  {
    id: 'ivory',
    name: 'Ivory Luxury',
    preview: ['#faf7f2', '#8b6914', '#2d1a00'],
    config: {
      layout: 'classic',
      primaryColor: '#2d1a00', accentColor: '#8b6914', accentText: '#ffffff',
      bodyBg: '#faf7f2', bodyText: '#2d1a00', mutedText: '#7a6440',
      headerBg: '#faf7f2', headerText: '#2d1a00',
      tableHeadBg: '#2d1a00', tableHeadText: '#c9a84c',
      rowEvenBg: '#faf7f2', rowOddBg: '#f5f0e8',
      totalBoxBg: '#2d1a00', totalBoxText: '#c9a84c',
      borderColor: '#e8ddc8', accentBorder: '#8b6914',
      fontTitle: 'Cormorant Garamond', fontBody: 'Crimson Text',
      logoSize: 60, logoPosition: 'center',
      headerLayout: 'centered',
      showDivider: true, dividerStyle: 'ornamental',
      borderRadius: 0,
      showSectionLabels: true,
      footerStyle: 'elegant',
    }
  },
]

const GOOGLE_FONTS = [
  'DM Sans','Sora','Space Grotesk','Inter','Outfit',
  'Playfair Display','Cormorant Garamond','Crimson Text',
  'Lato','Nunito','Poppins','Raleway','Montserrat',
]

const FONT_URL = (fonts) => {
  const names = [...new Set(fonts)].filter(Boolean)
  return `https://fonts.googleapis.com/css2?${names.map(f => `family=${encodeURIComponent(f)}:wght@400;500;600;700;900`).join('&')}&display=swap`
}

// ─── INVOICE RENDERER ────────────────────────────────────────────────────────
export function InvoiceRenderer({ invoice, company, config, scale = 1 }) {
  const c = config
  const isQuote = invoice.doc_type === 'quote'
  const cur = invoice.currency || company.currency || 'GBP'

  // Load Google Fonts
  const fontsLink = FONT_URL([c.fontTitle, c.fontBody])

  // Calculations
  const items = invoice.items || []
  const netTotal = items.reduce((s, i) => s + (Number(i.qty) * Number(i.unit_price) || 0), 0)
  const discount = Number(invoice.discount) || 0
  const netAfterDiscount = netTotal - discount
  const vatTotal = items.reduce((s, i) => {
    const lineNet = Number(i.qty) * Number(i.unit_price) || 0
    const vr = Number(i.vat_rate ?? (company.vat_registered === 'yes' ? (company.tax_rate || 20) : 0))
    return s + lineNet * vr / 100
  }, 0)
  const grossInvoice = netAfterDiscount + vatTotal
  const isCIS = company.cis_registered === 'yes'
  const cisRate = Number(company.cis_rate) || 20
  const cisNet = items.filter(i => !i.non_cis).reduce((s, i) => s + (Number(i.qty) * Number(i.unit_price) || 0), 0)
  const nonCisNet = items.filter(i => i.non_cis).reduce((s, i) => s + (Number(i.qty) * Number(i.unit_price) || 0), 0)
  const cisDeduction = isCIS ? cisNet * cisRate / 100 : 0
  const totalDue = grossInvoice - cisDeduction

  const br = c.borderRadius || 0
  const ff = (role) => `'${role === 'title' ? c.fontTitle : c.fontBody}', sans-serif`

  // Divider
  const Divider = () => {
    if (!c.showDivider) return null
    if (c.dividerStyle === 'ornamental') return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
        <div style={{ flex: 1, height: 1, background: c.accentBorder }} />
        <span style={{ color: c.accentColor, fontSize: 10 }}>◆</span>
        <div style={{ flex: 1, height: 1, background: c.accentBorder }} />
      </div>
    )
    if (c.dividerStyle === 'double') return (
      <div style={{ padding: '4px 0' }}>
        <div style={{ height: 2, background: c.accentBorder, marginBottom: 2 }} />
        <div style={{ height: 1, background: c.borderColor }} />
      </div>
    )
    if (c.dividerStyle === 'thick') return <div style={{ height: 3, background: c.accentColor, margin: '0' }} />
    return <div style={{ height: 1, background: c.borderColor }} />
  }

  // Meta fields
  const metaFields = [
    { label: 'Issue Date', value: invoice.date },
    { label: isQuote ? 'Valid Until' : 'Due Date', value: invoice.due_date },
    { label: 'Terms', value: `${invoice.payment_terms || company.payment_terms || 30} days` },
    company.vat_registered === 'yes' && company.vat && { label: 'VAT No.', value: company.vat },
    company.crn && { label: 'CRN', value: company.crn },
    isCIS && company.cis && { label: 'CIS No.', value: company.cis },
    invoice.po_number && { label: 'PO No.', value: invoice.po_number },
  ].filter(Boolean)

  // ── HEADER layouts ──
  const LogoBlock = () => (
    <div style={{ textAlign: c.logoPosition === 'center' ? 'center' : 'left' }}>
      {company.logo
        ? <img src={company.logo} alt="logo" style={{ height: c.logoSize || 48, objectFit: 'contain', display: 'block', margin: c.logoPosition === 'center' ? '0 auto 8px' : '0 0 8px' }} />
        : <div style={{ fontFamily: ff('title'), fontSize: 22, fontWeight: 900, color: c.headerText, marginBottom: 6 }}>{company.name}</div>
      }
      <div style={{ color: c.headerText + 'bb', fontSize: 10, lineHeight: 1.8, textAlign: c.logoPosition === 'center' ? 'center' : 'left' }}>
        {company.address && <div>{company.address}</div>}
        {company.city && <div>{company.city}{company.postcode ? `, ${company.postcode}` : ''}</div>}
        {company.email && <div>{company.email}</div>}
        {company.phone && <div>{formatPhoneNumber(company.phone)}</div>}
      </div>
    </div>
  )

  const DocTitleBlock = ({ align = 'right' }) => (
    <div style={{ textAlign: align }}>
      <div style={{ fontFamily: ff('title'), fontSize: 38, fontWeight: 900, color: c.accentColor, letterSpacing: '-0.5px', lineHeight: 1 }}>
        {isQuote ? (c.quoteTitle || 'QUOTE') : (c.invoiceTitle || 'INVOICE')}
      </div>
      <div style={{ fontFamily: ff('body'), fontWeight: 700, fontSize: 14, color: c.headerText + 'cc', marginTop: 6 }}>{invoice.number}</div>
      {isQuote && <div style={{ fontSize: 10, color: c.headerText + '88', marginTop: 2 }}>Valid 30 days</div>}
      <div style={{ marginTop: 8, display: 'inline-block', padding: '3px 12px', borderRadius: 20, background: c.accentColor, color: c.accentText, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        {invoice.status?.toUpperCase() || 'DRAFT'}
      </div>
    </div>
  )

  const renderHeader = () => {
    if (c.headerLayout === 'centered') return (
      <div style={{ background: c.headerBg, padding: '28px 44px 20px', textAlign: 'center' }}>
        <LogoBlock />
        <div style={{ margin: '14px 0 6px' }}>
          <Divider />
        </div>
        <DocTitleBlock align="center" />
      </div>
    )
    if (c.headerLayout === 'stacked') return (
      <div style={{ background: c.headerBg, padding: '28px 44px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <LogoBlock />
          <div style={{ textAlign: 'right', color: c.headerText + '88', fontSize: 11, lineHeight: 1.8 }}>
            {company.city && <div>{company.city}{company.postcode ? `, ${company.postcode}` : ''}</div>}
            {company.email && <div>{company.email}</div>}
          </div>
        </div>
        <div style={{ borderTop: `2px solid ${c.accentBorder}`, paddingTop: 14 }}>
          <DocTitleBlock align="left" />
        </div>
      </div>
    )
    if (c.headerLayout === 'left-heavy') return (
      <div style={{ background: c.headerBg, padding: '28px 44px 20px', display: 'flex', gap: 32, alignItems: 'flex-start' }}>
        <div style={{ flex: 2 }}>
          <LogoBlock />
        </div>
        <div style={{ flex: 1, textAlign: 'right' }}>
          <DocTitleBlock />
        </div>
      </div>
    )
    // default: split
    return (
      <div style={{ background: c.headerBg, padding: '28px 44px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <LogoBlock />
        <DocTitleBlock />
      </div>
    )
  }

  const renderFooter = () => {
    const base = { borderTop: `1px solid ${c.borderColor}`, padding: '12px 44px', fontFamily: ff('body') }
    if (c.footerStyle === 'colored') return (
      <div style={{ ...base, background: c.primaryColor, borderTop: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 11, color: '#ffffff88', display: 'flex', gap: 14 }}>
          {company.email && <span>{company.email}</span>}
          {company.phone && <span>{formatPhoneNumber(company.phone)}</span>}
        </div>
        <div style={{ fontSize: 9, color: '#ffffff44' }}>Invoice AI Pro</div>
      </div>
    )
    if (c.footerStyle === 'elegant') return (
      <div style={{ ...base, background: c.bodyBg, textAlign: 'center' }}>
        <Divider />
        <div style={{ fontSize: 11, color: c.mutedText, marginTop: 8, display: 'flex', justifyContent: 'center', gap: 18 }}>
          {company.email && <span>{company.email}</span>}
          {company.phone && <span>{formatPhoneNumber(company.phone)}</span>}
          {company.website && <span>{company.website}</span>}
        </div>
      </div>
    )
    if (c.footerStyle === 'branded') return (
      <div style={{ ...base, background: c.bodyBg, display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 10, color: c.mutedText }}>
          {company.name} {company.crn && `· CRN: ${company.crn}`} {company.vat && `· VAT: ${company.vat}`}
        </div>
        <div style={{ fontSize: 10, color: c.accentColor, fontWeight: 700 }}>Invoice AI Pro</div>
      </div>
    )
    return (
      <div style={{ ...base, background: c.bodyBg, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 11, color: c.mutedText, display: 'flex', gap: 14 }}>
          {company.email && <span>{company.email}</span>}
          {company.phone && <span>{formatPhoneNumber(company.phone)}</span>}
        </div>
        <div style={{ fontSize: 9, color: c.borderColor }}>Invoice AI Pro</div>
      </div>
    )
  }

  return (
    <div id="invoice-render-target" style={{ background: c.bodyBg, width: 794, minHeight: 1123, fontFamily: ff('body'), fontSize: 12, color: c.bodyText, position: 'relative' }}>
      <style>{`@import url('${fontsLink}');`}</style>

      {renderHeader()}
      <Divider />

      {/* Meta strip */}
      <div style={{ background: c.rowOddBg, padding: '12px 44px', display: 'flex', gap: 28, flexWrap: 'wrap', borderBottom: `1px solid ${c.borderColor}` }}>
        {metaFields.map(({ label, value }) => (
          <div key={label}>
            <div style={{ fontSize: 9, color: c.mutedText, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 2 }}>{label}</div>
            <div style={{ fontWeight: 600, fontSize: 12, color: c.bodyText }}>{value || '—'}</div>
          </div>
        ))}
      </div>

      {/* Bill To */}
      <div style={{ padding: '18px 44px 14px' }}>
        {c.showSectionLabels && <div style={{ fontSize: 9, color: c.mutedText, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 8 }}>{isQuote ? 'Quote For' : 'Bill To'}</div>}
        <div style={{ fontWeight: 700, fontSize: 14, color: c.bodyText }}>{invoice.client_name || 'Client Name'}</div>
        {invoice.client_company && <div style={{ color: c.mutedText, marginTop: 1, fontSize: 12 }}>{invoice.client_company}</div>}
        {invoice.client_address && <div style={{ color: c.mutedText, marginTop: 3, fontSize: 11, lineHeight: 1.6 }}>{invoice.client_address}</div>}
        {invoice.client_email && <div style={{ color: c.accentColor, marginTop: 3, fontSize: 11 }}>{invoice.client_email}</div>}
        {invoice.client_vat && <div style={{ color: c.mutedText, fontSize: 10, marginTop: 2 }}>VAT: {invoice.client_vat}</div>}
      </div>

      {/* Items table */}
      <div style={{ padding: '0 44px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', borderRadius: br, overflow: 'hidden' }}>
          <thead>
            <tr style={{ background: c.tableHeadBg }}>
              {['#', 'Item Type', 'Description', 'Qty', 'Unit Price', 'VAT%', 'Price'].map((h, i) => (
                <th key={h} style={{ padding: '8px 9px', textAlign: i >= 3 ? 'right' : i === 0 ? 'center' : 'left', color: c.tableHeadText, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap', fontFamily: ff('body') }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const lineNet = Number(item.qty) * Number(item.unit_price) || 0
              const vr = Number(item.vat_rate ?? (company.vat_registered === 'yes' ? (company.tax_rate || 20) : 0))
              const linePrice = lineNet * (1 + vr / 100)
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? c.rowEvenBg : c.rowOddBg, borderBottom: `1px solid ${c.borderColor}` }}>
                  <td style={{ padding: '9px', textAlign: 'center', color: c.mutedText, fontSize: 11 }}>{i + 1}</td>
                  <td style={{ padding: '9px', fontSize: 11, color: c.mutedText, whiteSpace: 'nowrap' }}>{item.item_type || '—'}</td>
                  <td style={{ padding: '9px' }}>
                    <div style={{ fontWeight: 500, fontSize: 12 }}>{item.description}</div>
                    {item.notes && <div style={{ fontSize: 10, color: c.mutedText, marginTop: 1 }}>{item.notes}</div>}
                    {isCIS && item.non_cis && <div style={{ fontSize: 9, color: '#d97706', fontWeight: 700, marginTop: 1 }}>Non-CIS</div>}
                  </td>
                  <td style={{ padding: '9px', textAlign: 'right', color: c.mutedText, fontSize: 11 }}>{item.qty} {item.unit || ''}</td>
                  <td style={{ padding: '9px', textAlign: 'right', fontSize: 12 }}>{fmt(item.unit_price, cur)}</td>
                  <td style={{ padding: '9px', textAlign: 'right', color: c.mutedText, fontSize: 11 }}>{vr}%</td>
                  <td style={{ padding: '9px', textAlign: 'right', fontWeight: 700, fontSize: 12 }}>{fmt(linePrice, cur)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div style={{ padding: '16px 44px', display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: 300 }}>
          {[
            { label: 'Net Invoice', value: fmt(netAfterDiscount, cur) },
            discount > 0 && { label: 'Discount', value: `−${fmt(discount, cur)}`, color: '#16a34a' },
            company.vat_registered === 'yes' && { label: 'VAT', value: fmt(vatTotal, cur) },
            { label: 'Gross Invoice', value: fmt(grossInvoice, cur), bold: true, topBorder: true },
            isCIS && { label: 'Non-CIS Items', value: fmt(nonCisNet, cur), color: c.mutedText },
            isCIS && { label: `CIS Deduction (${cisRate}%)`, value: `−${fmt(cisDeduction, cur)}`, color: '#dc2626' },
          ].filter(Boolean).map((row, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderTop: row.topBorder ? `2px solid ${c.primaryColor}` : `1px solid ${c.borderColor}`, marginTop: row.topBorder ? 4 : 0, fontWeight: row.bold ? 700 : 400, fontSize: row.bold ? 13 : 12, color: row.color || (row.bold ? c.bodyText : c.mutedText), fontFamily: ff('body') }}>
              <span>{row.label}</span><span>{row.value}</span>
            </div>
          ))}
          {/* Total Due box */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: c.totalBoxBg, borderRadius: br + 4, marginTop: 8 }}>
            <span style={{ color: c.totalBoxText, fontWeight: 700, fontSize: 13, fontFamily: ff('body') }}>{isQuote ? 'QUOTE TOTAL' : 'TOTAL DUE'}</span>
            <span style={{ color: c.totalBoxText, fontWeight: 900, fontSize: 19, fontFamily: ff('title') }}>{fmt(totalDue, cur)}</span>
          </div>
        </div>
      </div>

      {/* Notes + Bank */}
      <div style={{ padding: '0 44px 18px', display: 'flex', gap: 18 }}>
        {invoice.notes && (
          <div style={{ flex: 1 }}>
            {c.showSectionLabels && <div style={{ fontSize: 9, color: c.mutedText, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 6 }}>Notes</div>}
            <div style={{ fontSize: 11, color: c.mutedText, lineHeight: 1.7, background: c.rowOddBg, padding: '9px 12px', borderRadius: br, borderLeft: `3px solid ${c.accentColor}` }}>{invoice.notes}</div>
          </div>
        )}
        {company.bank_name && !isQuote && (
          <div style={{ minWidth: 210 }}>
            {c.showSectionLabels && <div style={{ fontSize: 9, color: c.mutedText, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 6 }}>Bank Details</div>}
            <div style={{ fontSize: 11, color: c.mutedText, lineHeight: 1.9, background: c.rowOddBg, padding: '9px 12px', borderRadius: br }}>
              <div><b style={{ color: c.bodyText }}>Bank:</b> {company.bank_name}</div>
              {company.bank_account && <div><b style={{ color: c.bodyText }}>Account:</b> {company.bank_account}</div>}
              {company.bank_sort && <div><b style={{ color: c.bodyText }}>Sort:</b> {company.bank_sort}</div>}
              {company.bank_iban && <div><b style={{ color: c.bodyText }}>IBAN:</b> {company.bank_iban}</div>}
            </div>
          </div>
        )}
      </div>

      {/* Footnote */}
      {invoice.footnote && (
        <div style={{ margin: '0 44px 18px', padding: '10px 14px', background: c.rowOddBg, border: `1px solid ${c.accentBorder}`, borderLeft: `4px solid ${c.accentColor}`, borderRadius: br, fontSize: 11, color: c.mutedText, lineHeight: 1.7, fontFamily: ff('body') }}>
          {invoice.footnote}
        </div>
      )}

      {renderFooter()}
    </div>
  )
}

// ─── THEME CARD ──────────────────────────────────────────────────────────────
function ThemeCard({ theme, selected, onSelect }) {
  return (
    <div onClick={() => onSelect(theme.id)} style={{ cursor: 'pointer', borderRadius: 12, overflow: 'hidden', border: `2px solid ${selected ? theme.config.accentColor : '#e2e8f0'}`, transition: 'all 0.2s', boxShadow: selected ? `0 0 0 3px ${theme.config.accentColor}33` : 'none', background: '#fff' }}>
      {/* Mini preview */}
      <div style={{ height: 60, background: theme.config.headerBg, position: 'relative', display: 'flex', alignItems: 'center', padding: '0 12px', justifyContent: 'space-between' }}>
        <div>
          <div style={{ width: 36, height: 6, borderRadius: 3, background: theme.config.headerText + '66', marginBottom: 4 }} />
          <div style={{ width: 24, height: 4, borderRadius: 2, background: theme.config.headerText + '44' }} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'serif', fontSize: 13, fontWeight: 900, color: theme.config.accentColor, letterSpacing: '-0.3px' }}>INV</div>
          <div style={{ width: 28, height: 3, borderRadius: 2, background: theme.config.headerText + '44', marginTop: 3, marginLeft: 'auto' }} />
        </div>
      </div>
      <div style={{ background: theme.config.tableHeadBg, height: 12, display: 'flex', alignItems: 'center', padding: '0 8px', gap: 4 }}>
        {[30, 60, 30, 25].map((w, i) => <div key={i} style={{ width: w, height: 3, borderRadius: 2, background: theme.config.tableHeadText + '88' }} />)}
      </div>
      {[0, 1].map(r => (
        <div key={r} style={{ background: r % 2 === 0 ? theme.config.rowEvenBg : theme.config.rowOddBg, height: 10, display: 'flex', alignItems: 'center', padding: '0 8px', gap: 4 }}>
          {[30, 60, 30, 25].map((w, i) => <div key={i} style={{ width: w, height: 2, borderRadius: 1, background: theme.config.bodyText + '33' }} />)}
        </div>
      ))}
      <div style={{ background: theme.config.totalBoxBg, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 8px', gap: 4 }}>
        <div style={{ width: 30, height: 3, borderRadius: 2, background: theme.config.totalBoxText + '88' }} />
        <div style={{ width: 20, height: 3, borderRadius: 2, background: theme.config.accentColor }} />
      </div>
      <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#334155' }}>{theme.name}</span>
        {selected && <span style={{ fontSize: 14, color: theme.config.accentColor }}>✓</span>}
      </div>
    </div>
  )
}

// ─── COLOR PICKER ────────────────────────────────────────────────────────────
function ColorRow({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
      <span style={{ fontSize: 12, color: '#64748b' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{value}</span>
        <label style={{ width: 26, height: 26, borderRadius: 6, border: '2px solid #e2e8f0', overflow: 'hidden', cursor: 'pointer', background: value }}>
          <input type="color" value={value} onChange={e => onChange(e.target.value)} style={{ opacity: 0, width: 0, height: 0 }} />
        </label>
      </div>
    </div>
  )
}

// ─── MAIN TEMPLATE DESIGNER ──────────────────────────────────────────────────
export default function TemplateDesigner({ company, invoices, onSave, onClose, initialConfig }) {
  const sampleInvoice = invoices?.[0] || {
    doc_type: 'invoice', number: 'INV-2025-0001',
    date: '2025-06-01', due_date: '2025-07-01', status: 'sent',
    client_name: 'John Smith', client_company: 'Acme Construction Ltd',
    client_email: 'john@acme.com', client_address: '45 Builder Street, London, EC1A 1BB',
    payment_terms: 30, currency: company.currency || 'GBP',
    footnote: 'Thank you for your business. Payment due within 30 days.',
    notes: 'Project reference: ACME-2025-Q2',
    items: [
      { description: 'Scaffolding erection', item_type: 'Labour', qty: 8, unit: 'hrs', unit_price: 45, vat_rate: 20, non_cis: false },
      { description: 'Steel tubes & fittings', item_type: 'Materials', qty: 1, unit: 'lot', unit_price: 320, vat_rate: 20, non_cis: true },
      { description: 'Site supervision', item_type: 'Labour', qty: 4, unit: 'hrs', unit_price: 65, vat_rate: 20, non_cis: false },
    ],
    discount: 0,
  }

  const [selectedThemeId, setSelectedThemeId] = useState(() => {
    if (initialConfig?._themeId) return initialConfig._themeId
    return 'noir'
  })
  const [config, setConfig] = useState(() => {
    if (initialConfig) return initialConfig
    return { ...BUILT_IN_THEMES[0].config }
  })
  const [activeTab, setActiveTab] = useState('themes')
  const [saving, setSaving] = useState(false)
  const previewRef = useRef(null)

  const applyTheme = (themeId) => {
    const t = BUILT_IN_THEMES.find(t => t.id === themeId)
    if (t) { setConfig({ ...t.config, _themeId: themeId }); setSelectedThemeId(themeId) }
  }

  const setC = (key, val) => setConfig(prev => ({ ...prev, [key]: val }))

  const handleSave = () => {
    setSaving(true)
    setTimeout(() => { onSave({ ...config, _themeId: selectedThemeId }); setSaving(false) }, 300)
  }

  const tabs = [
    { id: 'themes', label: '🎨 Themes' },
    { id: 'colors', label: '🖌 Colors' },
    { id: 'fonts', label: '✍️ Fonts' },
    { id: 'layout', label: '⬜ Layout' },
    { id: 'fields', label: '👁 Fields' },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(8,8,18,0.95)', zIndex: 2000, display: 'flex', flexDirection: 'column', fontFamily: "'DM Sans', sans-serif" }}>

      {/* Top bar */}
      <div style={{ background: '#0f0f1a', borderBottom: '1px solid #1e1e2e', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 900, color: '#e2b96a' }}>Template Designer</div>
          <div style={{ fontSize: 12, color: '#475569', background: '#1a1a2e', padding: '3px 10px', borderRadius: 20 }}>Live Preview</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          <button onClick={handleSave} style={{ padding: '7px 20px', borderRadius: 8, border: 'none', background: saving ? '#16a34a' : '#e2b96a', color: '#0f0f1a', fontWeight: 700, cursor: 'pointer', fontSize: 13, transition: 'all 0.3s' }}>
            {saving ? '✅ Saved!' : '💾 Save Template'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── LEFT PANEL ── */}
        <div style={{ width: 320, background: '#0f0f1a', borderRight: '1px solid #1e1e2e', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #1e1e2e', padding: '0 8px' }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ flex: 1, padding: '10px 4px', border: 'none', background: 'transparent', color: activeTab === t.id ? '#e2b96a' : '#475569', fontSize: 11, fontWeight: activeTab === t.id ? 700 : 400, cursor: 'pointer', borderBottom: activeTab === t.id ? '2px solid #e2b96a' : '2px solid transparent', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

            {/* THEMES */}
            {activeTab === 'themes' && (
              <div>
                <div style={{ fontSize: 11, color: '#475569', marginBottom: 12 }}>Choose a base theme — then fine-tune with other tabs.</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {BUILT_IN_THEMES.map(t => <ThemeCard key={t.id} theme={t} selected={selectedThemeId === t.id} onSelect={applyTheme} />)}
                </div>
              </div>
            )}

            {/* COLORS */}
            {activeTab === 'colors' && (
              <div>
                <div style={{ fontSize: 11, color: '#475569', marginBottom: 12 }}>Tweak individual colors after picking a theme.</div>
                <div style={{ background: '#161625', borderRadius: 10, padding: '12px 14px' }}>
                  {[
                    ['Header Background', 'headerBg'],
                    ['Header Text', 'headerText'],
                    ['Accent Color', 'accentColor'],
                    ['Accent Text', 'accentText'],
                    ['Page Background', 'bodyBg'],
                    ['Body Text', 'bodyText'],
                    ['Muted Text', 'mutedText'],
                    ['Table Head Background', 'tableHeadBg'],
                    ['Table Head Text', 'tableHeadText'],
                    ['Row Even Background', 'rowEvenBg'],
                    ['Row Odd Background', 'rowOddBg'],
                    ['Total Box Background', 'totalBoxBg'],
                    ['Total Box Text', 'totalBoxText'],
                    ['Border Color', 'borderColor'],
                    ['Accent Border', 'accentBorder'],
                  ].map(([label, key]) => (
                    <ColorRow key={key} label={label} value={config[key] || '#000000'} onChange={v => setC(key, v)} />
                  ))}
                </div>
              </div>
            )}

            {/* FONTS */}
            {activeTab === 'fonts' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: '#161625', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Title Font</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {GOOGLE_FONTS.map(f => (
                      <button key={f} onClick={() => setC('fontTitle', f)} style={{ padding: '7px 8px', borderRadius: 7, border: `1.5px solid ${config.fontTitle === f ? '#e2b96a' : '#1e1e2e'}`, background: config.fontTitle === f ? '#e2b96a15' : '#0f0f1a', color: config.fontTitle === f ? '#e2b96a' : '#64748b', cursor: 'pointer', fontSize: 12, textAlign: 'left', fontFamily: `'${f}', sans-serif` }}>{f}</button>
                    ))}
                  </div>
                </div>
                <div style={{ background: '#161625', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Body Font</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {GOOGLE_FONTS.map(f => (
                      <button key={f} onClick={() => setC('fontBody', f)} style={{ padding: '7px 8px', borderRadius: 7, border: `1.5px solid ${config.fontBody === f ? '#e2b96a' : '#1e1e2e'}`, background: config.fontBody === f ? '#e2b96a15' : '#0f0f1a', color: config.fontBody === f ? '#e2b96a' : '#64748b', cursor: 'pointer', fontSize: 12, textAlign: 'left', fontFamily: `'${f}', sans-serif` }}>{f}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* LAYOUT */}
            {activeTab === 'layout' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Logo size */}
                <div style={{ background: '#161625', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Logo</div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: '#64748b' }}>Logo Height</span>
                      <span style={{ fontSize: 12, color: '#e2b96a', fontWeight: 700 }}>{config.logoSize || 48}px</span>
                    </div>
                    <input type="range" min={24} max={100} value={config.logoSize || 48} onChange={e => setC('logoSize', Number(e.target.value))} style={{ width: '100%', accentColor: '#e2b96a' }} />
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>Logo Alignment</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['left', 'center'].map(p => (
                      <button key={p} onClick={() => setC('logoPosition', p)} style={{ flex: 1, padding: '6px', borderRadius: 7, border: `1.5px solid ${config.logoPosition === p ? '#e2b96a' : '#1e1e2e'}`, background: config.logoPosition === p ? '#e2b96a15' : '#0f0f1a', color: config.logoPosition === p ? '#e2b96a' : '#64748b', cursor: 'pointer', fontSize: 12, textTransform: 'capitalize' }}>{p}</button>
                    ))}
                  </div>
                </div>

                {/* Header layout */}
                <div style={{ background: '#161625', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Header Layout</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {[['split', 'Split (classic)'], ['left-heavy', 'Left heavy'], ['centered', 'Centered'], ['stacked', 'Stacked']].map(([v, l]) => (
                      <button key={v} onClick={() => setC('headerLayout', v)} style={{ padding: '7px 8px', borderRadius: 7, border: `1.5px solid ${config.headerLayout === v ? '#e2b96a' : '#1e1e2e'}`, background: config.headerLayout === v ? '#e2b96a15' : '#0f0f1a', color: config.headerLayout === v ? '#e2b96a' : '#64748b', cursor: 'pointer', fontSize: 11 }}>{l}</button>
                    ))}
                  </div>
                </div>

                {/* Dividers */}
                <div style={{ background: '#161625', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Dividers</div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 10 }}>
                    <input type="checkbox" checked={!!config.showDivider} onChange={e => setC('showDivider', e.target.checked)} style={{ accentColor: '#e2b96a' }} />
                    <span style={{ fontSize: 12, color: '#64748b' }}>Show section dividers</span>
                  </label>
                  {config.showDivider && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {[['thin', 'Thin'], ['thick', 'Thick'], ['double', 'Double'], ['ornamental', 'Ornamental']].map(([v, l]) => (
                        <button key={v} onClick={() => setC('dividerStyle', v)} style={{ padding: '6px', borderRadius: 7, border: `1.5px solid ${config.dividerStyle === v ? '#e2b96a' : '#1e1e2e'}`, background: config.dividerStyle === v ? '#e2b96a15' : '#0f0f1a', color: config.dividerStyle === v ? '#e2b96a' : '#64748b', cursor: 'pointer', fontSize: 11 }}>{l}</button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Border radius */}
                <div style={{ background: '#161625', borderRadius: 10, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>Corner Radius</span>
                    <span style={{ fontSize: 12, color: '#e2b96a', fontWeight: 700 }}>{config.borderRadius || 0}px</span>
                  </div>
                  <input type="range" min={0} max={16} value={config.borderRadius || 0} onChange={e => setC('borderRadius', Number(e.target.value))} style={{ width: '100%', accentColor: '#e2b96a' }} />
                </div>

                {/* Footer style */}
                <div style={{ background: '#161625', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Footer Style</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {[['minimal', 'Minimal'], ['colored', 'Colored'], ['branded', 'Branded'], ['elegant', 'Elegant']].map(([v, l]) => (
                      <button key={v} onClick={() => setC('footerStyle', v)} style={{ padding: '6px', borderRadius: 7, border: `1.5px solid ${config.footerStyle === v ? '#e2b96a' : '#1e1e2e'}`, background: config.footerStyle === v ? '#e2b96a15' : '#0f0f1a', color: config.footerStyle === v ? '#e2b96a' : '#64748b', cursor: 'pointer', fontSize: 11 }}>{l}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* FIELDS */}
            {activeTab === 'fields' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: '#161625', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Labels & Text</div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '6px 0', borderBottom: '1px solid #1e1e2e' }}>
                    <input type="checkbox" checked={!!config.showSectionLabels} onChange={e => setC('showSectionLabels', e.target.checked)} style={{ accentColor: '#e2b96a' }} />
                    <span style={{ fontSize: 12, color: '#64748b' }}>Show section labels (Bill To, Notes…)</span>
                  </label>
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Invoice Title</div>
                      <input value={config.invoiceTitle || 'INVOICE'} onChange={e => setC('invoiceTitle', e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid #1e1e2e', background: '#0f0f1a', color: '#e2e8f0', fontSize: 13, outline: 'none' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Quote Title</div>
                      <input value={config.quoteTitle || 'QUOTE'} onChange={e => setC('quoteTitle', e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid #1e1e2e', background: '#0f0f1a', color: '#e2e8f0', fontSize: 13, outline: 'none' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PREVIEW ── */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#12121f', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 20px' }}>
          <div style={{ fontSize: 11, color: '#334155', marginBottom: 14, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Preview — A4 (794×1123px)</div>
          <div ref={previewRef} style={{ transform: 'scale(0.72)', transformOrigin: 'top center', boxShadow: '0 32px 80px rgba(0,0,0,0.6)', marginBottom: -340 }}>
            <InvoiceRenderer invoice={sampleInvoice} company={company} config={config} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── PDF Export using configured template ────────────────────────────────────
export async function exportWithConfig(invoice, company, config) {
  const { default: jsPDF } = await import('jspdf')
  const { default: html2canvas } = await import('html2canvas')
  const el = document.getElementById('invoice-render-target')
  if (!el) return
  const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: config.bodyBg || '#ffffff', logging: false })
  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [794, 1123] })
  pdf.addImage(imgData, 'PNG', 0, 0, 794, 1123)
  pdf.save(`${invoice.number}.pdf`)
}
