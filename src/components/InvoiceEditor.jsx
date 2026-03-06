import { useState } from 'react'
import { fmt, STATUS } from '../store/index.js'

const F = ({ label, value, onChange, type = 'text', placeholder, hint, options, style = {} }) => (
  <div style={{ marginBottom: 14, ...style }}>
    <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
    {type === 'textarea'
      ? <textarea value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: 13, outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
      : type === 'select'
      ? <select value={value || ''} onChange={e => onChange(e.target.value)}
          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: 13, outline: 'none' }}>
          {(options || []).map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
        </select>
      : <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
    }
    {hint && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>{hint}</div>}
  </div>
)

const ITEM_TYPES = ['Labour', 'Materials', 'Equipment', 'Subcontractor', 'Consultancy', 'Travel', 'Other']

export default function InvoiceEditor({ invoice, clients, products, company, onSave, onClose }) {
  const todayStr = new Date().toISOString().split('T')[0]
  const due30 = () => { const d = new Date(); d.setDate(d.getDate() + (Number(company.payment_terms) || 30)); return d.toISOString().split('T')[0] }
  const isCIS = company.cis_registered === 'yes'
  const defaultVat = company.vat_registered === 'yes' ? (Number(company.tax_rate) || 20) : 0

  const [data, setData] = useState(invoice || {
    doc_type: 'invoice',
    number: '', date: todayStr, due_date: due30(), status: 'draft',
    client_name: '', client_company: '', client_email: '', client_address: '', client_vat: '',
    po_number: '', currency: company.currency || 'GBP',
    tax_rate: defaultVat, discount: 0,
    notes: '',
    footnote: 'Thank you for your business. We do expect payment within 7 calendar days, so please process this invoice within that time. There will be a 1.5% interest charge per month on late invoices.',
    payment_terms: company.payment_terms || 30,
    items: [{ description: '', item_type: 'Labour', qty: 1, unit_price: 0, unit: 'hrs', vat_rate: defaultVat, notes: '', non_cis: false }],
    payments: [],
  })

  const set = (k, v) => setData(d => ({ ...d, [k]: v }))
  const setItem = (i, k, v) => setData(d => { const items = [...d.items]; items[i] = { ...items[i], [k]: v }; return { ...d, items } })
  const addItem = () => setData(d => ({ ...d, items: [...d.items, { description: '', item_type: 'Labour', qty: 1, unit_price: 0, unit: 'hrs', vat_rate: defaultVat, notes: '', non_cis: false }] }))
  const removeItem = i => setData(d => ({ ...d, items: d.items.filter((_, idx) => idx !== i) }))

  // Calculations
  const netTotal = data.items.reduce((s, i) => s + (Number(i.qty) * Number(i.unit_price) || 0), 0)
  const discount = Number(data.discount) || 0
  const netAfterDiscount = netTotal - discount
  const vatTotal = data.items.reduce((s, i) => {
    const lineNet = Number(i.qty) * Number(i.unit_price) || 0
    const vr = Number(i.vat_rate ?? defaultVat)
    return s + lineNet * vr / 100
  }, 0)
  const grossInvoice = netAfterDiscount + vatTotal
  const cisRate = Number(company.cis_rate) || 20
  const cisNet = data.items.filter(i => !i.non_cis).reduce((s, i) => s + (Number(i.qty) * Number(i.unit_price) || 0), 0)
  const nonCisNet = data.items.filter(i => i.non_cis).reduce((s, i) => s + (Number(i.qty) * Number(i.unit_price) || 0), 0)
  const cisDeduction = isCIS ? cisNet * cisRate / 100 : 0
  const totalDue = grossInvoice - cisDeduction

  const fillClient = clientId => {
    const c = clients.find(cl => cl.id === clientId)
    if (!c) return
    set('client_name', c.contact || c.name)
    set('client_company', c.name)
    set('client_email', c.email)
    set('client_address', c.address)
    set('client_vat', c.vat)
  }

  const addProduct = prod => {
    setData(d => {
      const items = [...d.items]
      const empty = items.findIndex(i => !i.description)
      const newItem = { description: prod.name, item_type: 'Materials', qty: 1, unit_price: prod.price, unit: prod.unit || '', vat_rate: defaultVat, notes: prod.description || '', non_cis: false }
      if (empty >= 0) items[empty] = newItem; else items.push(newItem)
      return { ...d, items }
    })
  }

  const cur = data.currency || 'GBP'

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,15,30,0.88)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 20, overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 920, boxShadow: '0 40px 100px rgba(0,0,0,0.5)', marginBottom: 20 }}>

        {/* Header */}
        <div style={{ padding: '18px 28px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1a1a2e', borderRadius: '16px 16px 0 0' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {/* Doc type toggle */}
            <div style={{ display: 'flex', background: '#0f172a', borderRadius: 8, padding: 3 }}>
              {[['invoice', '🧾 Invoice'], ['quote', '📋 Quote']].map(([t, l]) => (
                <button key={t} onClick={() => set('doc_type', t)} style={{
                  padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  background: data.doc_type === t ? '#e2b96a' : 'transparent',
                  color: data.doc_type === t ? '#1a1a2e' : '#64748b',
                }}>{l}</button>
              ))}
            </div>
            <div style={{ color: '#e2b96a', fontWeight: 700, fontSize: 16, fontFamily: "'Playfair Display',serif" }}>
              {invoice ? `Edit ${invoice.number}` : `New ${data.doc_type === 'quote' ? 'Quote' : 'Invoice'}`}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 24, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ padding: 28 }}>

          {/* Row 1: meta */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 12, marginBottom: 4 }}>
            <F label="Number" value={data.number} onChange={v => set('number', v)} placeholder="INV-2024-0001" />
            <F label="Issue Date" value={data.date} onChange={v => set('date', v)} type="date" />
            <F label={data.doc_type === 'quote' ? 'Valid Until' : 'Due Date'} value={data.due_date} onChange={v => set('due_date', v)} type="date" />
            <F label="Currency" value={data.currency} onChange={v => set('currency', v)} type="select" options={['GBP','USD','EUR','RON']} />
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</label>
              <select value={data.status} onChange={e => set('status', e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: 13, outline: 'none' }}>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>

          {/* Client */}
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px 18px', marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#334155' }}>🧑‍💼 {data.doc_type === 'quote' ? 'Quote For' : 'Bill To'}</div>
              {clients.length > 0 && (
                <select onChange={e => fillClient(e.target.value)} defaultValue=""
                  style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', fontSize: 12, color: '#64748b', cursor: 'pointer' }}>
                  <option value="">Load saved client…</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
              <F label="Contact Name" value={data.client_name} onChange={v => set('client_name', v)} placeholder="John Smith" />
              <F label="Company" value={data.client_company} onChange={v => set('client_company', v)} placeholder="Client Ltd" />
              <F label="Email" value={data.client_email} onChange={v => set('client_email', v)} placeholder="john@client.com" type="email" />
              <F label="VAT Number" value={data.client_vat} onChange={v => set('client_vat', v)} placeholder="GB123456789" />
            </div>
            <F label="Address" value={data.client_address} onChange={v => set('client_address', v)} placeholder="123 Client Street, London, EC1A 1BB" type="textarea" style={{ marginBottom: 0 }} />
            <div style={{ marginTop: 12 }}>
              <F label="PO Number (optional)" value={data.po_number} onChange={v => set('po_number', v)} placeholder="PO-12345" style={{ marginBottom: 0 }} />
            </div>
          </div>

          {/* Items */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#334155' }}>📋 Line Items</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {products.length > 0 && (
                  <select onChange={e => { const p = products.find(pr => pr.id === e.target.value); if (p) addProduct(p); e.target.value = '' }} defaultValue=""
                    style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', fontSize: 12, color: '#64748b', cursor: 'pointer' }}>
                    <option value="">Add from catalogue…</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} — {fmt(p.price, cur)}</option>)}
                  </select>
                )}
                <button onClick={addItem} style={{ padding: '5px 14px', borderRadius: 6, background: '#1a1a2e', color: '#e2b96a', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>+ Add Item</button>
              </div>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              {/* Column headers */}
              <div style={{ display: 'grid', gridTemplateColumns: isCIS ? '1.2fr 1fr 2.5fr 0.6fr 0.9fr 0.6fr 0.9fr 0.7fr 24px' : '1.2fr 1fr 2.5fr 0.6fr 0.9fr 0.6fr 0.9fr 24px', background: '#1a1a2e', padding: '8px 10px', gap: 6 }}>
                {['Item Type', 'Description', '', 'Qty', 'Unit Price', 'VAT%', 'Price', ...(isCIS ? ['Non-CIS'] : []), ''].map((h, i) => (
                  <div key={i} style={{ fontSize: 10, color: '#e2b96a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: i > 2 ? 'right' : 'left' }}>{h}</div>
                ))}
              </div>

              {data.items.map((item, i) => {
                const lineNet = Number(item.qty) * Number(item.unit_price) || 0
                const vr = Number(item.vat_rate ?? defaultVat)
                const linePrice = lineNet * (1 + vr / 100)
                return (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: isCIS ? '1.2fr 1fr 2.5fr 0.6fr 0.9fr 0.6fr 0.9fr 0.7fr 24px' : '1.2fr 1fr 2.5fr 0.6fr 0.9fr 0.6fr 0.9fr 24px', padding: '8px 10px', borderBottom: '1px solid #e2e8f0', background: i % 2 === 0 ? '#fff' : '#f8fafc', alignItems: 'center', gap: 6 }}>
                    <select value={item.item_type || 'Labour'} onChange={e => setItem(i, 'item_type', e.target.value)}
                      style={{ padding: '5px 6px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, outline: 'none', background: '#fff', width: '100%' }}>
                      {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input value={item.description} onChange={e => setItem(i, 'description', e.target.value)} placeholder="Description"
                      style={{ padding: '5px 7px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, outline: 'none', width: '100%', gridColumn: 'span 2' }} />
                    <div /> {/* spacer for the spanning description */}
                    <input type="number" value={item.qty} onChange={e => setItem(i, 'qty', e.target.value)} min="0"
                      style={{ padding: '5px 7px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, outline: 'none', textAlign: 'right', width: '100%' }} />
                    <input type="number" value={item.unit_price} onChange={e => setItem(i, 'unit_price', e.target.value)} min="0" step="0.01"
                      style={{ padding: '5px 7px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, outline: 'none', textAlign: 'right', width: '100%' }} />
                    <input type="number" value={item.vat_rate ?? defaultVat} onChange={e => setItem(i, 'vat_rate', e.target.value)} min="0" max="100"
                      style={{ padding: '5px 7px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, outline: 'none', textAlign: 'right', width: '100%' }} />
                    <div style={{ textAlign: 'right', fontWeight: 600, fontSize: 12, color: '#334155' }}>{fmt(linePrice, cur)}</div>
                    {isCIS && (
                      <div style={{ textAlign: 'right' }}>
                        <input type="checkbox" checked={!!item.non_cis} onChange={e => setItem(i, 'non_cis', e.target.checked)} title="Non-CIS item" style={{ cursor: 'pointer' }} />
                      </div>
                    )}
                    <button onClick={() => removeItem(i)} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 16, textAlign: 'center' }}>×</button>
                  </div>
                )
              })}
            </div>
            {isCIS && <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>✅ Tick "Non-CIS" for items not subject to CIS deduction (e.g. materials)</div>}
          </div>

          {/* Bottom grid: notes + summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <F label="Notes" value={data.notes} onChange={v => set('notes', v)} type="textarea" placeholder="Payment instructions, project reference, etc." />
              <F label="Footnote" value={data.footnote} onChange={v => set('footnote', v)} type="textarea" placeholder="e.g. Thank you for your business. Payment due within 30 days." hint="Appears at the bottom of the invoice" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <F label="Discount (£)" value={data.discount} onChange={v => set('discount', v)} type="number" style={{ marginBottom: 0 }} />
                <F label="Payment Terms (days)" value={data.payment_terms} onChange={v => set('payment_terms', v)} type="number" style={{ marginBottom: 0 }} />
              </div>
            </div>

            {/* Summary */}
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: 18, border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#334155', marginBottom: 14 }}>💰 Summary</div>
              {[
                ['Net Invoice', fmt(netAfterDiscount, cur)],
                discount > 0 && ['Discount', `−${fmt(discount, cur)}`],
                company.vat_registered === 'yes' && [`VAT`, fmt(vatTotal, cur)],
                ['Gross Invoice', fmt(grossInvoice, cur), true],
                isCIS && ['Non-CIS Items', fmt(nonCisNet, cur)],
                isCIS && [`CIS Deduction (${cisRate}%)`, `−${fmt(cisDeduction, cur)}`],
              ].filter(Boolean).map(([l, v, bold]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: bold ? '2px solid #1a1a2e' : '1px solid #e2e8f0', marginTop: bold ? 4 : 0, fontWeight: bold ? 700 : 400, fontSize: bold ? 14 : 13, color: bold ? '#1a1a2e' : '#64748b' }}>
                  <span>{l}</span><span>{v}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', background: '#1a1a2e', borderRadius: 8, marginTop: 10 }}>
                <span style={{ color: '#e2b96a', fontWeight: 700 }}>{data.doc_type === 'quote' ? 'QUOTE TOTAL' : 'TOTAL DUE'}</span>
                <span style={{ color: '#fff', fontWeight: 900, fontSize: 18 }}>{fmt(totalDue, cur)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '10px 22px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: 'transparent', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button onClick={() => onSave({ ...data })} style={{ padding: '10px 28px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#1a1a2e,#0f3460)', color: '#e2b96a', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
              {invoice ? '💾 Save Changes' : `✅ Create ${data.doc_type === 'quote' ? 'Quote' : 'Invoice'}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
