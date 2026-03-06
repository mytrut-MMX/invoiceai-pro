import { fmt } from '../store/index.js'

// ── Template selector component ───────────────────────────────────────────────
export function TemplateSelector({ templates, selectedId, onSelect, onAdd, onRemove }) {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      {/* Default template */}
      <div onClick={() => onSelect('default')} style={{
        width: 110, cursor: 'pointer', borderRadius: 8, overflow: 'hidden',
        border: `2px solid ${selectedId === 'default' ? '#e2b96a' : '#e2e8f0'}`,
      }}>
        <div style={{ height: 75, background: 'linear-gradient(135deg,#1a1a2e,#0f3460)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>📄</div>
        <div style={{ padding: '5px 8px', fontSize: 11, fontWeight: 600, color: '#334155', textAlign: 'center' }}>Default</div>
        {selectedId === 'default' && <div style={{ background: '#e2b96a', height: 3 }} />}
      </div>

      {/* Uploaded templates */}
      {(templates || []).map(t => (
        <div key={t.id} style={{ width: 110, cursor: 'pointer', borderRadius: 8, overflow: 'hidden', border: `2px solid ${selectedId === t.id ? '#e2b96a' : '#e2e8f0'}`, position: 'relative' }}>
          <div onClick={() => onSelect(t.id)} style={{ height: 75, overflow: 'hidden' }}>
            <img src={t.data} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div onClick={() => onSelect(t.id)} style={{ padding: '5px 8px', fontSize: 11, fontWeight: 600, color: '#334155', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
          {selectedId === t.id && <div style={{ background: '#e2b96a', height: 3 }} />}
          <button onClick={e => { e.stopPropagation(); onRemove(t.id) }} style={{ position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: '50%', border: 'none', background: '#dc2626', color: '#fff', fontSize: 11, cursor: 'pointer', lineHeight: 1, display:'flex',alignItems:'center',justifyContent:'center' }}>×</button>
        </div>
      ))}

      {/* Add new */}
      <label style={{ width: 110, height: 108, cursor: 'pointer', borderRadius: 8, border: '2px dashed #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, color: '#94a3b8', fontSize: 12 }}>
        <span style={{ fontSize: 22 }}>+</span>
        <span style={{ textAlign: 'center', lineHeight: 1.3 }}>Add Template</span>
        <input type="file" accept="image/*" onChange={onAdd} style={{ display: 'none' }} multiple />
      </label>
    </div>
  )
}

// ── Main Invoice Preview ──────────────────────────────────────────────────────
export function InvoicePreview({ invoice, company, template, style = {} }) {
  const isQuote = invoice.doc_type === 'quote'
  const cur = invoice.currency || company.currency || 'GBP'
  const hasTemplate = template && template.id !== 'default' && template.data

  const items = invoice.items || []

  // Net per line
  const netTotal = items.reduce((s, i) => s + (Number(i.qty) * Number(i.unit_price) || 0), 0)
  const discount = Number(invoice.discount) || 0
  const netAfterDiscount = netTotal - discount

  // VAT per line (each item can have own vat_rate)
  const vatTotal = items.reduce((s, i) => {
    const lineNet = Number(i.qty) * Number(i.unit_price) || 0
    const vr = Number(i.vat_rate ?? invoice.tax_rate ?? (company.vat_registered === 'yes' ? (company.tax_rate || 20) : 0))
    return s + lineNet * vr / 100
  }, 0)

  const grossInvoice = netAfterDiscount + vatTotal

  // CIS
  const isCIS = company.cis_registered === 'yes'
  const cisRate = Number(company.cis_rate) || 20
  const nonCisItemsList = items.filter(i => i.non_cis)
  const cisItemsList = items.filter(i => !i.non_cis)
  const nonCisNet = nonCisItemsList.reduce((s, i) => s + (Number(i.qty) * Number(i.unit_price) || 0), 0)
  const cisNet = cisItemsList.reduce((s, i) => s + (Number(i.qty) * Number(i.unit_price) || 0), 0)
  const cisDeduction = isCIS ? cisNet * cisRate / 100 : 0
  const totalDue = grossInvoice - cisDeduction

  const hdr = hasTemplate ? 'transparent' : '#1a1a2e'
  const hdrText = hasTemplate ? '#1a1a2e' : '#e2b96a'
  const hdrSub = hasTemplate ? '#334155' : '#94a3b8'
  const rowEven = hasTemplate ? 'rgba(255,255,255,0.75)' : '#fff'
  const rowOdd = hasTemplate ? 'rgba(248,250,252,0.75)' : '#f8fafc'
  const metaBg = hasTemplate ? 'rgba(248,250,252,0.85)' : '#f8fafc'
  const footBg = hasTemplate ? 'rgba(248,250,252,0.85)' : '#f8fafc'

  return (
    <div id="invoice-preview" style={{ background: '#fff', width: 794, minHeight: 1123, fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: '#1e293b', position: 'relative', overflow: 'hidden', ...style }}>

      {/* Template full-bleed background */}
      {hasTemplate && (
        <img src={template.data} alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'fill', zIndex: 0, pointerEvents: 'none' }} />
      )}

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ── Header ── */}
        <div style={{ background: hdr, padding: '32px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            {company.logo
              ? <img src={company.logo} alt="logo" style={{ height: 54, objectFit: 'contain', marginBottom: 8 }} />
              : <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 900, color: hdrText }}>{company.name}</div>}
            <div style={{ color: hdrSub, fontSize: 11, marginTop: 6, lineHeight: 1.9 }}>
              {company.address && <div>{company.address}</div>}
              {company.city && <div>{company.city}{company.postcode ? `, ${company.postcode}` : ''}</div>}
              {company.country && <div>{company.country}</div>}
              {company.email && <div>{company.email}</div>}
              {company.phone && <div>{company.phone}</div>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 42, fontWeight: 900, color: hdrText, letterSpacing: '-1px' }}>
              {isQuote ? 'QUOTE' : 'INVOICE'}
            </div>
            <div style={{ color: hasTemplate ? '#334155' : '#fff', fontWeight: 700, fontSize: 16, marginTop: 4 }}>{invoice.number}</div>
            {isQuote && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Valid for 30 days</div>}
            <div style={{ marginTop: 8, display: 'inline-block', padding: '3px 12px', borderRadius: 20, background: '#e2b96a', color: '#1a1a2e', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {invoice.status?.toUpperCase()}
            </div>
          </div>
        </div>

        {/* ── Meta ── */}
        <div style={{ background: metaBg, padding: '14px 48px', display: 'flex', gap: 36, borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
          {[
            ['Issue Date', invoice.date],
            [isQuote ? 'Valid Until' : 'Due Date', invoice.due_date],
            ['Terms', `${invoice.payment_terms || company.payment_terms || 30} days`],
            company.vat_registered === 'yes' && company.vat && ['VAT No.', company.vat],
            company.crn && ['CRN', company.crn],
            isCIS && company.cis && ['CIS No.', company.cis],
            invoice.po_number && ['PO Number', invoice.po_number],
          ].filter(Boolean).map(([l, v]) => (
            <div key={l}>
              <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{l}</div>
              <div style={{ fontWeight: 600, fontSize: 12 }}>{v || '—'}</div>
            </div>
          ))}
        </div>

        {/* ── Bill To ── */}
        <div style={{ padding: '20px 48px 14px' }}>
          <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, fontWeight: 700 }}>{isQuote ? 'Quote For' : 'Bill To'}</div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{invoice.client_name || '—'}</div>
          {invoice.client_company && <div style={{ color: '#64748b', marginTop: 1 }}>{invoice.client_company}</div>}
          {invoice.client_address && <div style={{ color: '#64748b', marginTop: 3, fontSize: 12, lineHeight: 1.6 }}>{invoice.client_address}</div>}
          {invoice.client_email && <div style={{ color: '#2563eb', marginTop: 3, fontSize: 12 }}>{invoice.client_email}</div>}
          {invoice.client_vat && <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>VAT: {invoice.client_vat}</div>}
        </div>

        {/* ── Items Table ── */}
        <div style={{ padding: '0 48px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: hasTemplate ? 'rgba(26,26,46,0.88)' : '#1a1a2e' }}>
                {['#', 'Item Type', 'Description', 'Qty', 'Unit Price', 'VAT %', 'Price'].map((h, i) => (
                  <th key={h} style={{ padding: '9px 8px', textAlign: i >= 3 ? 'right' : i === 0 ? 'center' : 'left', color: '#e2b96a', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const lineNet = Number(item.qty) * Number(item.unit_price) || 0
                const vr = Number(item.vat_rate ?? invoice.tax_rate ?? (company.vat_registered === 'yes' ? (company.tax_rate || 20) : 0))
                const linePrice = lineNet * (1 + vr / 100)
                return (
                  <tr key={i} style={{ background: i % 2 === 0 ? rowEven : rowOdd }}>
                    <td style={{ padding: '9px 8px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>{i + 1}</td>
                    <td style={{ padding: '9px 8px', fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{item.item_type || '—'}</td>
                    <td style={{ padding: '9px 8px' }}>
                      <div style={{ fontWeight: 500 }}>{item.description}</div>
                      {item.notes && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{item.notes}</div>}
                      {isCIS && item.non_cis && <div style={{ fontSize: 10, color: '#d97706', fontWeight: 700, marginTop: 1 }}>Non-CIS</div>}
                    </td>
                    <td style={{ padding: '9px 8px', textAlign: 'right', color: '#64748b' }}>{item.qty} {item.unit || ''}</td>
                    <td style={{ padding: '9px 8px', textAlign: 'right' }}>{fmt(item.unit_price, cur)}</td>
                    <td style={{ padding: '9px 8px', textAlign: 'right', color: '#64748b' }}>{vr}%</td>
                    <td style={{ padding: '9px 8px', textAlign: 'right', fontWeight: 600 }}>{fmt(linePrice, cur)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ── Totals ── */}
        <div style={{ padding: '18px 48px', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: 310 }}>
            {[
              { label: 'Net Invoice', value: fmt(netAfterDiscount, cur) },
              discount > 0 && { label: 'Discount', value: `−${fmt(discount, cur)}`, color: '#16a34a' },
              company.vat_registered === 'yes' && { label: 'VAT', value: fmt(vatTotal, cur) },
              { label: 'Gross Invoice', value: fmt(grossInvoice, cur), bold: true, topBorder: true },
              isCIS && { label: 'Non-CIS Items', value: fmt(nonCisNet, cur), color: '#64748b' },
              isCIS && { label: `CIS Deduction (${cisRate}%)`, value: `−${fmt(cisDeduction, cur)}`, color: '#dc2626' },
            ].filter(Boolean).map((row, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderTop: row.topBorder ? '2px solid #1a1a2e' : '1px solid #f1f5f9', marginTop: row.topBorder ? 4 : 0, fontWeight: row.bold ? 700 : 400, fontSize: row.bold ? 14 : 13, color: row.color || (row.bold ? '#1a1a2e' : '#64748b') }}>
                <span>{row.label}</span><span>{row.value}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '13px 16px', background: '#1a1a2e', borderRadius: 10, marginTop: 8 }}>
              <span style={{ color: '#e2b96a', fontWeight: 700, fontSize: 14 }}>{isQuote ? 'QUOTE TOTAL' : 'TOTAL DUE'}</span>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 20 }}>{fmt(totalDue, cur)}</span>
            </div>
          </div>
        </div>

        {/* ── Notes & Bank ── */}
        <div style={{ padding: '0 48px 20px', display: 'flex', gap: 20 }}>
          {invoice.notes && (
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, fontWeight: 700 }}>Notes</div>
              <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7, background: metaBg, padding: '10px 14px', borderRadius: 8, borderLeft: '3px solid #e2b96a' }}>{invoice.notes}</div>
            </div>
          )}
          {company.bank_name && !isQuote && (
            <div style={{ minWidth: 220 }}>
              <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, fontWeight: 700 }}>Bank Details</div>
              <div style={{ fontSize: 12, color: '#64748b', lineHeight: 2, background: metaBg, padding: '10px 14px', borderRadius: 8 }}>
                <div><strong style={{ color: '#334155' }}>Bank:</strong> {company.bank_name}</div>
                {company.bank_account && <div><strong style={{ color: '#334155' }}>Account:</strong> {company.bank_account}</div>}
                {company.bank_sort && <div><strong style={{ color: '#334155' }}>Sort Code:</strong> {company.bank_sort}</div>}
                {company.bank_iban && <div><strong style={{ color: '#334155' }}>IBAN:</strong> {company.bank_iban}</div>}
              </div>
            </div>
          )}
        </div>

        {/* ── Footnote ── */}
        {invoice.footnote && (
          <div style={{ margin: '0 48px 20px', padding: '12px 16px', background: hasTemplate ? 'rgba(255,251,235,0.9)' : '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12, color: '#92400e', lineHeight: 1.7 }}>
            📌 {invoice.footnote}
          </div>
        )}

        {/* ── Footer ── */}
        <div style={{ borderTop: '1px solid #e2e8f0', padding: '13px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: footBg }}>
          <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', gap: 16 }}>
            {company.email && <span>{company.email}</span>}
            {company.phone && <span>{company.phone}</span>}
            {company.website && <span>{company.website}</span>}
          </div>
          <div style={{ fontSize: 10, color: '#cbd5e1' }}>Invoice AI Pro</div>
        </div>
      </div>
    </div>
  )
}

export async function exportToPDF(invoice, company, template) {
  const { default: jsPDF } = await import('jspdf')
  const { default: html2canvas } = await import('html2canvas')
  const el = document.getElementById('invoice-preview')
  if (!el) return
  const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [794, 1123] })
  pdf.addImage(imgData, 'PNG', 0, 0, 794, 1123)
  pdf.save(`${invoice.number}.pdf`)
}
