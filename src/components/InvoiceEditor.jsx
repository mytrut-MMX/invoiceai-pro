import { useState, useEffect } from 'react'
import { fmt, STATUS } from '../store/index.js'

const I = ({ label, value, onChange, type = 'text', placeholder, hint, style = {} }) => (
  <div style={{ marginBottom: 14, ...style }}>
    <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
    {type === 'textarea'
      ? <textarea value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: 13, outline: 'none', fontFamily: 'inherit', resize: 'vertical' }} />
      : <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />}
    {hint && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>{hint}</div>}
  </div>
)

export default function InvoiceEditor({ invoice, clients, products, company, onSave, onClose }) {
  const today = new Date().toISOString().split('T')[0]
  const due30 = () => { const d = new Date(); d.setDate(d.getDate() + (company.payment_terms || 30)); return d.toISOString().split('T')[0] }

  const [data, setData] = useState(invoice || {
    number: '', date: today, due_date: due30(), status: 'draft',
    client_name: '', client_company: '', client_email: '', client_address: '', client_vat: '',
    po_number: '', currency: company.currency || 'GBP', tax_rate: Number(company.tax_rate) || 20,
    discount: 0, notes: '', payment_terms: company.payment_terms || 30,
    items: [{ description: '', qty: 1, unit_price: 0, unit: '', notes: '' }],
    payments: [],
  })

  const set = (k, v) => setData(d => ({ ...d, [k]: v }))
  const setItem = (i, k, v) => setData(d => { const items = [...d.items]; items[i] = { ...items[i], [k]: v }; return { ...d, items } })
  const addItem = () => setData(d => ({ ...d, items: [...d.items, { description: '', qty: 1, unit_price: 0, unit: '', notes: '' }] }))
  const removeItem = i => setData(d => ({ ...d, items: d.items.filter((_, idx) => idx !== i) }))

  const sub = data.items.reduce((s, i) => s + (Number(i.qty) * Number(i.unit_price) || 0), 0)
  const taxAmt = sub * (Number(data.tax_rate) / 100)
  const total = sub + taxAmt - (Number(data.discount) || 0)

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
      const newItem = { description: prod.name, qty: 1, unit_price: prod.price, unit: prod.unit || '', notes: prod.description || '' }
      if (empty >= 0) { items[empty] = newItem } else { items.push(newItem) }
      return { ...d, items }
    })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,15,30,0.85)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 860, boxShadow: '0 40px 100px rgba(0,0,0,0.5)', marginBottom: 20 }}>
        {/* Header */}
        <div style={{ padding: '20px 28px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1a1a2e', borderRadius: '16px 16px 0 0' }}>
          <div>
            <div style={{ color: '#e2b96a', fontWeight: 700, fontSize: 18, fontFamily: "'Playfair Display',serif" }}>{invoice ? `Edit ${invoice.number}` : 'New Invoice'}</div>
            <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>Fill in the details below</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 24, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ padding: 28 }}>
          {/* Row 1: invoice meta */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 4 }}>
            <I label="Invoice No." value={data.number} onChange={v => set('number', v)} placeholder="INV-2024-0001" />
            <I label="Issue Date" value={data.date} onChange={v => set('date', v)} type="date" />
            <I label="Due Date" value={data.due_date} onChange={v => set('due_date', v)} type="date" />
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</label>
              <select value={data.status} onChange={e => set('status', e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: 13, outline: 'none' }}>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>

          {/* Client section */}
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px 18px', marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#334155' }}>🧑‍💼 Client Details</div>
              {clients.length > 0 && (
                <select onChange={e => fillClient(e.target.value)} defaultValue=""
                  style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', fontSize: 12, color: '#64748b', cursor: 'pointer' }}>
                  <option value="">Load from saved clients…</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <I label="Contact Name" value={data.client_name} onChange={v => set('client_name', v)} placeholder="John Smith" />
              <I label="Company Name" value={data.client_company} onChange={v => set('client_company', v)} placeholder="Client Ltd" />
              <I label="Email" value={data.client_email} onChange={v => set('client_email', v)} placeholder="john@client.com" type="email" />
              <I label="VAT Number" value={data.client_vat} onChange={v => set('client_vat', v)} placeholder="GB123456789" />
              <I label="PO Number" value={data.po_number} onChange={v => set('po_number', v)} placeholder="PO-12345" />
              <I label="Currency" value={data.currency} onChange={v => set('currency', v)} />
            </div>
            <I label="Address" value={data.client_address} onChange={v => set('client_address', v)} placeholder="123 Client Street, London, EC1A 1BB" type="textarea" style={{ marginBottom: 0 }} />
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
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} — {fmt(p.price, data.currency)}</option>)}
                  </select>
                )}
                <button onClick={addItem} style={{ padding: '5px 12px', borderRadius: 6, background: '#1a1a2e', color: '#e2b96a', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>+ Add Item</button>
              </div>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '3fr 0.7fr 1fr 0.8fr 1fr 28px', gap: 0, background: '#1a1a2e', padding: '8px 12px' }}>
                {['Description', 'Qty', 'Unit Price', 'Unit', 'Total', ''].map((h, i) => (
                  <div key={i} style={{ fontSize: 10, color: '#e2b96a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: i > 1 ? 'right' : 'left', paddingRight: i > 0 && i < 4 ? 8 : 0 }}>{h}</div>
                ))}
              </div>
              {data.items.map((item, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '3fr 0.7fr 1fr 0.8fr 1fr 28px', gap: 0, padding: '8px 12px', borderBottom: '1px solid #e2e8f0', background: i % 2 === 0 ? '#fff' : '#f8fafc', alignItems: 'center' }}>
                  <input value={item.description} onChange={e => setItem(i, 'description', e.target.value)} placeholder="Service or product description"
                    style={{ padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, outline: 'none', width: '95%' }} />
                  <input type="number" value={item.qty} onChange={e => setItem(i, 'qty', e.target.value)} min="0"
                    style={{ padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, outline: 'none', width: '90%', textAlign: 'right' }} />
                  <input type="number" value={item.unit_price} onChange={e => setItem(i, 'unit_price', e.target.value)} min="0" step="0.01"
                    style={{ padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, outline: 'none', width: '90%', textAlign: 'right' }} />
                  <input value={item.unit} onChange={e => setItem(i, 'unit', e.target.value)} placeholder="hrs"
                    style={{ padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, outline: 'none', width: '90%', textAlign: 'right' }} />
                  <div style={{ textAlign: 'right', fontWeight: 600, fontSize: 13, color: '#334155' }}>{fmt(Number(item.qty) * Number(item.unit_price) || 0, data.currency)}</div>
                  <button onClick={() => removeItem(i)} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 16, textAlign: 'center' }}>×</button>
                </div>
              ))}
            </div>
          </div>

          {/* Totals + extras */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <I label="Notes / Terms" value={data.notes} onChange={v => set('notes', v)} type="textarea" placeholder="Payment instructions, thank you message, etc." />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <I label="Tax Rate (%)" value={data.tax_rate} onChange={v => set('tax_rate', v)} type="number" />
                <I label="Discount (£)" value={data.discount} onChange={v => set('discount', v)} type="number" />
              </div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#334155', marginBottom: 14 }}>💰 Summary</div>
              {[['Subtotal', fmt(sub, data.currency)], [`Tax (${data.tax_rate}%)`, fmt(taxAmt, data.currency)], data.discount > 0 && ['Discount', `−${fmt(data.discount, data.currency)}`]].filter(Boolean).map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #e2e8f0', fontSize: 13, color: '#64748b' }}>
                  <span>{l}</span><span style={{ fontWeight: 500 }}>{v}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', background: '#1a1a2e', borderRadius: 8, marginTop: 10 }}>
                <span style={{ color: '#e2b96a', fontWeight: 700 }}>TOTAL</span>
                <span style={{ color: '#fff', fontWeight: 800, fontSize: 17 }}>{fmt(total, data.currency)}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '10px 22px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: 'transparent', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button onClick={() => onSave(data)} style={{ padding: '10px 28px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#1a1a2e,#0f3460)', color: '#e2b96a', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
              {invoice ? '💾 Save Changes' : '✅ Create Invoice'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
