import { fmt } from '../store/index.js'

// Renders a professional invoice to a DOM element (for print/PDF)
export function InvoicePreview({ invoice, company, templateImg, style = {} }) {
  const sub = invoice.items?.reduce((s, i) => s + (i.qty * i.unit_price), 0) || 0
  const taxAmt = sub * ((invoice.tax_rate || 0) / 100)
  const disc = invoice.discount || 0
  const total = sub + taxAmt - disc

  const paid = invoice.payments?.reduce((s, p) => s + p.amount, 0) || 0
  const due = total - paid

  const sc = { draft: '#8b8b7a', sent: '#2563eb', paid: '#16a34a', overdue: '#dc2626', partial: '#d97706' }

  return (
    <div id="invoice-preview" style={{ background: '#fff', width: 794, minHeight: 1123, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#1e293b', position: 'relative', ...style }}>
      {/* Custom template background */}
      {templateImg && (
        <img src={templateImg} alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.08, pointerEvents: 'none' }} />
      )}

      {/* Header */}
      <div style={{ background: '#1a1a2e', padding: '32px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          {company.logo
            ? <img src={company.logo} alt="logo" style={{ height: 52, objectFit: 'contain', marginBottom: 10 }} />
            : <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 900, color: '#e2b96a' }}>{company.name}</div>}
          <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 6, lineHeight: 1.8 }}>
            {company.address && <div>{company.address}</div>}
            {company.city && <div>{company.city}{company.postcode ? `, ${company.postcode}` : ''}</div>}
            {company.country && <div>{company.country}</div>}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 38, fontWeight: 900, color: '#e2b96a', letterSpacing: '-1px' }}>INVOICE</div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, marginTop: 4 }}>{invoice.number}</div>
          <div style={{ marginTop: 8, display: 'inline-block', padding: '3px 12px', borderRadius: 20, background: sc[invoice.status] || '#8b8b7a', color: '#fff', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {invoice.status?.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Meta row */}
      <div style={{ background: '#f8fafc', padding: '18px 48px', display: 'flex', gap: 48, borderBottom: '1px solid #e2e8f0' }}>
        <div><div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Issue Date</div><div style={{ fontWeight: 600 }}>{invoice.date || '—'}</div></div>
        <div><div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Due Date</div><div style={{ fontWeight: 600, color: invoice.status === 'overdue' ? '#dc2626' : 'inherit' }}>{invoice.due_date || '—'}</div></div>
        <div><div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Payment Terms</div><div style={{ fontWeight: 600 }}>{invoice.payment_terms || company.payment_terms || 30} days</div></div>
        {company.vat && <div><div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>VAT No.</div><div style={{ fontWeight: 600 }}>{company.vat}</div></div>}
        {company.crn && <div><div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>CRN</div><div style={{ fontWeight: 600 }}>{company.crn}</div></div>}
      </div>

      {/* Bill To / Ship To */}
      <div style={{ padding: '28px 48px', display: 'flex', gap: 48 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, fontWeight: 700 }}>Bill To</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e' }}>{invoice.client_name || '—'}</div>
          {invoice.client_company && <div style={{ color: '#64748b', marginTop: 2 }}>{invoice.client_company}</div>}
          {invoice.client_address && <div style={{ color: '#64748b', marginTop: 4, lineHeight: 1.6 }}>{invoice.client_address}</div>}
          {invoice.client_email && <div style={{ color: '#2563eb', marginTop: 4, fontSize: 12 }}>{invoice.client_email}</div>}
          {invoice.client_vat && <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>VAT: {invoice.client_vat}</div>}
        </div>
        {invoice.po_number && (
          <div>
            <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, fontWeight: 700 }}>PO Number</div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{invoice.po_number}</div>
          </div>
        )}
      </div>

      {/* Items table */}
      <div style={{ padding: '0 48px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#1a1a2e' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', color: '#e2b96a', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', borderRadius: '4px 0 0 4px' }}>#</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', color: '#e2b96a', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Description</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', color: '#e2b96a', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Qty</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', color: '#e2b96a', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Unit Price</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', color: '#e2b96a', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', borderRadius: '0 4px 4px 0' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.items || []).map((item, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                <td style={{ padding: '11px 14px', color: '#94a3b8', fontSize: 12 }}>{i + 1}</td>
                <td style={{ padding: '11px 14px' }}>
                  <div style={{ fontWeight: 500 }}>{item.description}</div>
                  {item.notes && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{item.notes}</div>}
                </td>
                <td style={{ padding: '11px 14px', textAlign: 'center', color: '#64748b' }}>{item.qty} {item.unit || ''}</td>
                <td style={{ padding: '11px 14px', textAlign: 'right' }}>{fmt(item.unit_price, invoice.currency || company.currency)}</td>
                <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 600 }}>{fmt(item.qty * item.unit_price, invoice.currency || company.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div style={{ padding: '24px 48px', display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: 280 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>
            <span>Subtotal</span><span style={{ fontWeight: 500 }}>{fmt(sub, invoice.currency || company.currency)}</span>
          </div>
          {disc > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9', color: '#16a34a' }}>
              <span>Discount</span><span>−{fmt(disc, invoice.currency || company.currency)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>
            <span>Tax ({invoice.tax_rate || 0}%)</span><span style={{ fontWeight: 500 }}>{fmt(taxAmt, invoice.currency || company.currency)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', background: '#1a1a2e', borderRadius: 8, marginTop: 6 }}>
            <span style={{ color: '#e2b96a', fontWeight: 700, fontSize: 14 }}>TOTAL DUE</span>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>{fmt(due, invoice.currency || company.currency)}</span>
          </div>
          {paid > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', color: '#16a34a', fontSize: 12, marginTop: 4 }}>
              <span>Paid</span><span>−{fmt(paid, invoice.currency || company.currency)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Notes & Bank */}
      <div style={{ padding: '0 48px 32px', display: 'flex', gap: 32 }}>
        {invoice.notes && (
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, fontWeight: 700 }}>Notes</div>
            <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7, background: '#f8fafc', padding: '10px 14px', borderRadius: 8, borderLeft: '3px solid #e2b96a' }}>{invoice.notes}</div>
          </div>
        )}
        {company.bank_name && (
          <div style={{ minWidth: 220 }}>
            <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, fontWeight: 700 }}>Bank Details</div>
            <div style={{ fontSize: 12, color: '#64748b', lineHeight: 2, background: '#f8fafc', padding: '10px 14px', borderRadius: 8 }}>
              <div><strong style={{ color: '#334155' }}>Bank:</strong> {company.bank_name}</div>
              {company.bank_account && <div><strong style={{ color: '#334155' }}>Account:</strong> {company.bank_account}</div>}
              {company.bank_sort && <div><strong style={{ color: '#334155' }}>Sort Code:</strong> {company.bank_sort}</div>}
              {company.bank_iban && <div><strong style={{ color: '#334155' }}>IBAN:</strong> {company.bank_iban}</div>}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #e2e8f0', padding: '16px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>
          {company.email && <span>{company.email}</span>}
          {company.phone && <span style={{ marginLeft: 16 }}>{company.phone}</span>}
          {company.website && <span style={{ marginLeft: 16 }}>{company.website}</span>}
        </div>
        <div style={{ fontSize: 10, color: '#cbd5e1' }}>Invoice AI Pro</div>
      </div>
    </div>
  )
}

export async function exportToPDF(invoice, company, templateImg) {
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
