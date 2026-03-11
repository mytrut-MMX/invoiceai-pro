import { fmt } from '../store/index.js'

export function TemplateSelector({ templates, selectedId, onSelect, onAdd, onRemove }) {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <div onClick={() => onSelect('default')} style={{ width: 110, cursor: 'pointer', borderRadius: 8, overflow: 'hidden', border: `2px solid ${selectedId === 'default' ? '#e2b96a' : '#e2e8f0'}` }}>
        <div style={{ height: 75, background: 'linear-gradient(135deg,#1a1a2e,#0f3460)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>📄</div>
        <div style={{ padding: '5px 8px', fontSize: 11, fontWeight: 600, color: '#334155', textAlign: 'center' }}>Default</div>
        {selectedId === 'default' && <div style={{ background: '#e2b96a', height: 3 }} />}
      </div>
      {(templates || []).map(t => (
        <div key={t.id} style={{ width: 110, cursor: 'pointer', borderRadius: 8, overflow: 'hidden', border: `2px solid ${selectedId === t.id ? '#e2b96a' : '#e2e8f0'}`, position: 'relative' }}>
          <div onClick={() => onSelect(t.id)} style={{ height: 75, overflow: 'hidden' }}>
            <img src={t.data} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div onClick={() => onSelect(t.id)} style={{ padding: '5px 8px', fontSize: 11, fontWeight: 600, color: '#334155', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
          {selectedId === t.id && <div style={{ background: '#e2b96a', height: 3 }} />}
          <button onClick={e => { e.stopPropagation(); onRemove(t.id) }} style={{ position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: '50%', border: 'none', background: '#dc2626', color: '#fff', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
      ))}
      <label style={{ width: 110, height: 108, cursor: 'pointer', borderRadius: 8, border: '2px dashed #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, color: '#94a3b8', fontSize: 12 }}>
        <span style={{ fontSize: 22 }}>+</span>
        <span style={{ textAlign: 'center', lineHeight: 1.3 }}>Add Template</span>
        <input type="file" accept="image/*" onChange={onAdd} style={{ display: 'none' }} multiple />
      </label>
    </div>
  )
}

// Default template customiser component
export function DefaultTemplateEditor({ config, onChange }) {
  const set = (k, v) => onChange({ ...config, [k]: v })
  const C = ({ label, k }) => (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      <input type="color" value={config[k] || '#000000'} onChange={e => set(k, e.target.value)} style={{ width: '100%', height: 36, borderRadius: 6, border: '1.5px solid #e2e8f0', cursor: 'pointer', padding: 2 }} />
    </div>
  )
  const T = ({ label, k, placeholder }) => (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      <input type="text" value={config[k] || ''} onChange={e => set(k, e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none', background: '#f8fafc' }} />
    </div>
  )
  const S = ({ label, k, options }) => (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      <select value={config[k] || ''} onChange={e => set(k, e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none', background: '#f8fafc' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14 }}>
      <C label="Header Background" k="primaryColor" />
      <C label="Accent / Title Color" k="accentColor" />
      <C label="Body Text Color" k="textColor" />
      <C label="Muted Text Color" k="mutedColor" />
      <T label="Invoice Title" k="invoiceTitle" placeholder="INVOICE" />
      <T label="Quote Title" k="quoteTitle" placeholder="QUOTE" />
      <S label="Header Style" k="headerStyle" options={[{ value: 'dark', label: 'Dark Header' }, { value: 'light', label: 'Light Header' }, { value: 'none', label: 'No Header BG' }]} />
      <S label="Logo Position" k="logoPosition" options={[{ value: 'left', label: 'Logo Left' }, { value: 'right', label: 'Logo Right' }, { value: 'center', label: 'Logo Center' }]} />
      <S label="Font Family" k="fontFamily" options={[{ value: 'DM Sans', label: 'DM Sans' }, { value: 'Georgia', label: 'Georgia' }, { value: 'Helvetica', label: 'Helvetica' }, { value: 'Arial', label: 'Arial' }, { value: 'Verdana', label: 'Verdana' }]} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Options</label>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={!!config.showBorder} onChange={e => set('showBorder', e.target.checked)} />
          Show table border
        </label>
      </div>
      <C label="Border / Line Color" k="borderColor" />
    </div>
  )
}

export function InvoicePreview({ invoice, company, template, defaultTemplateConfig, style = {} }) {
  const isQuote = invoice.doc_type === 'quote'
  const cur = invoice.currency || company.currency || 'GBP'
  const hasCustomTemplate = template && template.id !== 'default' && template.data

  // Default template config with fallbacks
  const tc = defaultTemplateConfig || {}
  const primary   = tc.primaryColor  || '#1a1a2e'
  const accent    = tc.accentColor   || '#e2b96a'
  const textCol   = tc.textColor     || '#1e293b'
  const muted     = tc.mutedColor    || '#64748b'
  const fontFam   = tc.fontFamily    || 'DM Sans'
  const hdrStyle  = tc.headerStyle   || 'dark'
  const logoPos   = tc.logoPosition  || 'left'
  const invTitle  = tc.invoiceTitle  || 'INVOICE'
  const quoTitle  = tc.quoteTitle    || 'QUOTE'
  const showBrd   = tc.showBorder !== false
  const borderCol = tc.borderColor   || '#e2e8f0'

  const hdrBg = hdrStyle === 'dark' ? primary : hdrStyle === 'light' ? '#f8fafc' : 'transparent'
  const hdrTextCol = hdrStyle === 'dark' ? accent : primary
  const hdrSubCol  = hdrStyle === 'dark' ? (accent + '99') : muted

  // Calculations
  const items = invoice.items || []
  const netTotal = items.reduce((s, i) => s + (Number(i.qty) * Number(i.unit_price) || 0), 0)
  const discount = Number(invoice.discount) || 0
  const netAfterDiscount = netTotal - discount
  const vatTotal = items.reduce((s, i) => {
    const lineNet = Number(i.qty) * Number(i.unit_price) || 0
    const vr = Number(i.vat_rate ?? invoice.tax_rate ?? (company.vat_registered === 'yes' ? (company.tax_rate || 20) : 0))
    return s + lineNet * vr / 100
  }, 0)
  const grossInvoice = netAfterDiscount + vatTotal
  const isCIS = company.cis_registered === 'yes'
  const cisRate = Number(company.cis_rate) || 20
  const cisItemsList = items.filter(i => !i.non_cis)
  const nonCisItemsList = items.filter(i => i.non_cis)
  const cisNet = cisItemsList.reduce((s, i) => s + (Number(i.qty) * Number(i.unit_price) || 0), 0)
  const nonCisNet = nonCisItemsList.reduce((s, i) => s + (Number(i.qty) * Number(i.unit_price) || 0), 0)
  const cisDeduction = isCIS ? cisNet * cisRate / 100 : 0
  const totalDue = grossInvoice - cisDeduction

  const metaBg  = hasCustomTemplate ? 'rgba(248,250,252,0.85)' : '#f8fafc'
  const rowE    = hasCustomTemplate ? 'rgba(255,255,255,0.78)' : '#fff'
  const rowO    = hasCustomTemplate ? 'rgba(248,250,252,0.78)' : '#f8fafc'

  return (
    <>
      {/* Print CSS — hides toolbar buttons, only shows invoice */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; }
          #invoice-preview { box-shadow: none !important; }
        }
      `}</style>

      <div id="invoice-preview" style={{ background: '#fff', width: 794, minHeight: 1123, fontFamily: `'${fontFam}', sans-serif`, fontSize: 13, color: textCol, position: 'relative', overflow: 'hidden', ...style }}>

        {/* Custom template background */}
        {hasCustomTemplate && (
          <img src={template.data} alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'fill', zIndex: 0, pointerEvents: 'none' }} />
        )}

        <div style={{ position: 'relative', zIndex: 1 }}>

          {/* Header */}
          <div style={{ background: hdrBg, padding: '28px 44px', display: 'flex', justifyContent: logoPos === 'center' ? 'center' : 'space-between', alignItems: 'flex-start', flexDirection: logoPos === 'center' ? 'column' : 'row', gap: logoPos === 'center' ? 12 : 0, textAlign: logoPos === 'center' ? 'center' : 'inherit' }}>
            <div>
              {company.logo
                ? <img src={company.logo} alt="logo" style={{ height: 52, objectFit: 'contain', marginBottom: 8 }} />
                : <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 900, color: hdrTextCol }}>{company.name}</div>}
              <div style={{ color: hdrSubCol, fontSize: 11, marginTop: 5, lineHeight: 1.9 }}>
                {company.address && <div>{company.address}</div>}
                {company.city && <div>{company.city}{company.postcode ? `, ${company.postcode}` : ''}</div>}
                {company.country && <div>{company.country}</div>}
                {company.email && <div>{company.email}</div>}
                {company.phone && <div>{company.phone}</div>}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 40, fontWeight: 900, color: hdrTextCol, letterSpacing: '-1px' }}>
                {isQuote ? quoTitle : invTitle}
              </div>
              <div style={{ color: hdrStyle === 'dark' ? '#fff' : textCol, fontWeight: 700, fontSize: 16, marginTop: 3 }}>{invoice.number}</div>
              {isQuote && <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>Valid for 30 days</div>}
              <div style={{ marginTop: 8, display: 'inline-block', padding: '3px 12px', borderRadius: 20, background: accent, color: primary, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {invoice.status?.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Meta row */}
          <div style={{ background: metaBg, padding: '13px 44px', display: 'flex', gap: 32, borderBottom: `1px solid ${borderCol}`, flexWrap: 'wrap' }}>
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
                <div style={{ fontSize: 10, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{l}</div>
                <div style={{ fontWeight: 600, fontSize: 12, color: textCol }}>{v || '—'}</div>
              </div>
            ))}
          </div>

          {/* Bill To */}
          <div style={{ padding: '20px 44px 14px' }}>
            <div style={{ fontSize: 10, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, fontWeight: 700 }}>{isQuote ? 'Quote For' : 'Bill To'}</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: textCol }}>{invoice.client_name || '—'}</div>
            {invoice.client_company && <div style={{ color: muted, marginTop: 1 }}>{invoice.client_company}</div>}
            {invoice.client_address && <div style={{ color: muted, marginTop: 3, fontSize: 12, lineHeight: 1.6 }}>{invoice.client_address}</div>}
            {invoice.client_email && <div style={{ color: '#2563eb', marginTop: 3, fontSize: 12 }}>{invoice.client_email}</div>}
            {invoice.client_vat && <div style={{ color: muted, fontSize: 11, marginTop: 2 }}>VAT: {invoice.client_vat}</div>}
          </div>

          {/* Items Table */}
          <div style={{ padding: '0 44px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: showBrd ? `1px solid ${borderCol}` : 'none' }}>
              <thead>
                <tr style={{ background: hdrStyle === 'none' ? accent + '22' : primary }}>
                  {['#', 'Item Type', 'Description', 'Qty', 'Unit Price', 'VAT %', 'Price'].map((h, i) => (
                    <th key={h} style={{ padding: '9px 9px', textAlign: i >= 3 ? 'right' : i === 0 ? 'center' : 'left', color: hdrStyle === 'none' ? primary : accent, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => {
                  const lineNet = Number(item.qty) * Number(item.unit_price) || 0
                  const vr = Number(item.vat_rate ?? invoice.tax_rate ?? (company.vat_registered === 'yes' ? (company.tax_rate || 20) : 0))
                  const linePrice = lineNet * (1 + vr / 100)
                  return (
                    <tr key={i} style={{ background: i % 2 === 0 ? rowE : rowO, borderBottom: showBrd ? `1px solid ${borderCol}` : 'none' }}>
                      <td style={{ padding: '9px', textAlign: 'center', color: muted, fontSize: 12 }}>{i + 1}</td>
                      <td style={{ padding: '9px', fontSize: 12, color: muted, whiteSpace: 'nowrap' }}>{item.item_type || '—'}</td>
                      <td style={{ padding: '9px' }}>
                        <div style={{ fontWeight: 700, color: textCol }}>{item.name || item.description || "—"}</div>
                        {item.description && <div style={{ fontSize: 11, color: muted, marginTop: 1 }}>{item.description}</div>}
                        {item.notes && <div style={{ fontSize: 11, color: muted, marginTop: 1 }}>{item.notes}</div>}
                        {isCIS && item.non_cis && <div style={{ fontSize: 10, color: '#d97706', fontWeight: 700, marginTop: 1 }}>Non-CIS</div>}
                      </td>
                      <td style={{ padding: '9px', textAlign: 'right', color: muted }}>{item.qty} {item.unit || ''}</td>
                      <td style={{ padding: '9px', textAlign: 'right', color: textCol }}>{fmt(item.unit_price, cur)}</td>
                      <td style={{ padding: '9px', textAlign: 'right', color: muted }}>{vr}%</td>
                      <td style={{ padding: '9px', textAlign: 'right', fontWeight: 600, color: textCol }}>{fmt(linePrice, cur)}</td>
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
                { label: 'Gross Invoice', value: fmt(grossInvoice, cur), bold: true },
                isCIS && { label: 'Non-CIS Items', value: fmt(nonCisNet, cur), color: muted },
                isCIS && { label: `CIS Deduction (${cisRate}%)`, value: `−${fmt(cisDeduction, cur)}`, color: '#dc2626' },
              ].filter(Boolean).map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderTop: row.bold ? `2px solid ${textCol}` : `1px solid ${borderCol}`, marginTop: row.bold ? 4 : 0, fontWeight: row.bold ? 700 : 400, fontSize: row.bold ? 14 : 13, color: row.color || (row.bold ? textCol : muted) }}>
                  <span>{row.label}</span><span>{row.value}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '13px 16px', background: primary, borderRadius: 10, marginTop: 8 }}>
                <span style={{ color: accent, fontWeight: 700, fontSize: 14 }}>{isQuote ? 'QUOTE TOTAL' : 'TOTAL DUE'}</span>
                <span style={{ color: '#fff', fontWeight: 900, fontSize: 20 }}>{fmt(totalDue, cur)}</span>
              </div>
            </div>
          </div>

          {/* Notes & Bank */}
          <div style={{ padding: '0 44px 18px', display: 'flex', gap: 18 }}>
            {invoice.notes && (
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5, fontWeight: 700 }}>Notes</div>
                <div style={{ fontSize: 12, color: muted, lineHeight: 1.7, background: metaBg, padding: '10px 12px', borderRadius: 8, borderLeft: `3px solid ${accent}` }}>{invoice.notes}</div>
              </div>
            )}
            {company.bank_name && !isQuote && (
              <div style={{ minWidth: 210 }}>
                <div style={{ fontSize: 10, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5, fontWeight: 700 }}>Bank Details</div>
                <div style={{ fontSize: 12, color: muted, lineHeight: 2, background: metaBg, padding: '10px 12px', borderRadius: 8 }}>
                  {company.bank_name && <div><strong style={{ color: textCol }}>Bank:</strong> {company.bank_name}</div>}
                  {company.bank_account && <div><strong style={{ color: textCol }}>Account:</strong> {company.bank_account}</div>}
                  {company.bank_sort && <div><strong style={{ color: textCol }}>Sort Code:</strong> {company.bank_sort}</div>}
                  {company.bank_iban && <div><strong style={{ color: textCol }}>IBAN:</strong> {company.bank_iban}</div>}
                </div>
              </div>
            )}
          </div>

          {/* Footnote */}
          {invoice.footnote && (
            <div style={{ margin: '0 44px 18px', padding: '11px 14px', background: hasCustomTemplate ? 'rgba(255,251,235,0.92)' : '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12, color: '#92400e', lineHeight: 1.7 }}>
              📌 {invoice.footnote}
            </div>
          )}

          {/* Footer */}
          <div style={{ borderTop: `1px solid ${borderCol}`, padding: '12px 44px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: metaBg }}>
            <div style={{ fontSize: 11, color: muted, display: 'flex', gap: 14 }}>
              {company.email && <span>{company.email}</span>}
              {company.phone && <span>{company.phone}</span>}
              {company.website && <span>{company.website}</span>}
            </div>
            <div style={{ fontSize: 10, color: borderCol }}>Invoice AI Pro</div>
          </div>
        </div>
      </div>
    </>
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
