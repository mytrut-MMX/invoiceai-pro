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

// Editable dropdown: shows select + ability to type a custom value
const ItemTypeSelect = ({ value, onChange, itemTypes }) => {
  const [custom, setCustom] = useState(false)
  const isKnown = itemTypes.includes(value)

  if (custom || (!isKnown && value)) {
    return (
      <div style={{ display: 'flex', gap: 3 }}>
        <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder="Type..."
          style={{ flex: 1, padding: '5px 7px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, outline: 'none', minWidth: 0 }} />
        <button onClick={() => setCustom(false)} title="Choose from list"
          style={{ padding: '3px 6px', border: '1px solid #e2e8f0', borderRadius: 6, background: '#f8fafc', cursor: 'pointer', fontSize: 11, color: '#64748b' }}>▾</button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 3 }}>
      <select value={value || itemTypes[0]} onChange={e => onChange(e.target.value)}
        style={{ flex: 1, padding: '5px 6px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, outline: 'none', background: '#fff', minWidth: 0 }}>
        {itemTypes.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <button onClick={() => setCustom(true)} title="Type custom value"
        style={{ padding: '3px 6px', border: '1px solid #e2e8f0', borderRadius: 6, background: '#f8fafc', cursor: 'pointer', fontSize: 11, color: '#64748b' }}>✎</button>
    </div>
  )
}

export default function InvoiceEditor({ invoice, clients, products, company, itemTypes, onSave, onClose }) {
  const todayStr = new Date().toISOString().split('T')[0]
  const isCIS = company.cis_registered === 'yes'
  const defaultVat = company.vat_registered === 'yes' ? (Number(company.tax_rate) || 20) : 0
  const terms = Number(company.payment_terms) || 30
  const allItemTypes = itemTypes && itemTypes.length > 0 ? itemTypes : ['Labour', 'Materials', 'Equipment', 'Subcontractor', 'Consultancy', 'Travel', 'Other']

  const calcDue = (fromDate, paymentTerms) => {
    const d = new Date(fromDate || todayStr)
    d.setDate(d.getDate() + Number(paymentTerms || terms))
    return d.toISOString().split('T')[0]
  }

  const [data, setData] = useState(invoice || {
    doc_type: 'invoice',
    number: '', date: todayStr, due_date: calcDue(todayStr, terms), status: 'draft',
    client_name: '', client_company: '', client_email: '', client_address: '', client_vat: '',
    po_number: '', currency: company.currency || 'GBP',
    tax_rate: defaultVat, discount: 0,
    notes: '',
    footnote: 'Thank you for your business. We do expect payment within 7 calendar days, so please process this invoice within that time. There will be a 1.5% interest charge per month on late invoices.',
    payment_terms: terms,
    items: [{ description: '', item_type: allItemTypes[0], qty: 1, unit_price: 0, unit: 'hrs', vat_rate: defaultVat, notes: '', non_cis: false }],
    payments: [],
  })

  const set = (k, v) => setData(d => ({ ...d, [k]: v }))

  // ── Auto-update due_date when issue date or payment_terms changes ──
  const setDate = (newDate) => {
    setData(d => ({
      ...d,
      date: newDate,
      due_date: calcDue(newDate, d.payment_terms)
    }))
  }
  const setPaymentTerms = (newTerms) => {
    setData(d => ({
      ...d,
      payment_terms: newTerms,
      due_date: calcDue(d.date, newTerms)
    }))
  }

  const setItem = (i, k, v) => setData(d => { const items = [...d.items]; items[i] = { ...items[i], [k]: v }; return { ...d, items } })
  const addItem = () => setData(d => ({ ...d, items: [...d.items, { description: '', item_type: allItemTypes[0], qty: 1, unit_price: 0, unit: 'hrs', vat_rate: defaultVat, notes: '', non_cis: false }] }))
  const removeItem = i => setData(d => ({ ...d, items: d.items.filter((_, idx) => idx !== i) }))

  // ── Add product from catalogue - includes item_type dropdown ──
  const addProduct = prod => {
    setData(d => {
      const items = [...d.items]
      const empty = items.findIndex(i => !i.description)
      const newItem = {
        description: prod.name,
        item_type: prod.item_type || allItemTypes[0],
        qty: 1,
        unit_price: prod.price,
        unit: prod.unit || '',
        vat_rate: defaultVat,
        notes: prod.description || '',
        non_cis: false
      }
      if (empty >= 0) items[empty] = newItem; else items.push(newItem)
      return { ...d, items }
    })
  }

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
  const cur = data.currency || 'GBP'

  const fillClient = clientId => {
    const c = clients.find(cl => cl.id === clientId)
    if (!c) return
    set('client_name', c.contact || c.name)
    set('client_company', c.name)
    set('client_email', c.email)
    set('client_address', c.address)
    set('client_vat', c.vat)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,15,30,0.88)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 20, overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 940, boxShadow: '0 40px 100px rgba(0,0,0,0.5)', marginBottom: 20 }}>

        {/* Header */}
        <div style={{ padding: '16px 26px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1a1a2e', borderRadius: '16px 16px 0 0' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ display: 'flex', background: '#0f172a', borderRadius: 8, padding: 3 }}>
              {[['invoice', '🧾 Invoice'], ['quote', '📋 Quote']].map(([t, l]) => (
                <button key={t} onClick={() => set('doc_type', t)} style={{ padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: data.doc_type === t ? '#e2b96a' : 'transparent', color: data.doc_type === t ? '#1a1a2e' : '#64748b' }}>{l}</button>
              ))}
            </div>
            <div style={{ color: '#e2b96a', fontWeight: 700, fontSize: 16, fontFamily: "'Playfair Display',serif" }}>
              {invoice ? `Edit ${invoice.number}` : `New ${data.doc_type === 'quote' ? 'Quote' : 'Invoice'}`}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 24, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ padding: 26 }}>

          {/* Row 1: meta — note: Issue Date auto-updates Due Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 12, marginBottom: 4 }}>
            <F label="Number" value={data.number} onChange={v => set('number', v)} placeholder="INV-2024-0001" />

            {/* Issue Date — triggers due date recalc */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Issue Date</label>
              <input type="date" value={data.date || ''} onChange={e => setDate(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>

            {/* Payment Terms — triggers due date recalc */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Payment Terms (days)
              </label>
              <input type="number" value={data.payment_terms || ''} onChange={e => setPaymentTerms(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>

            {/* Due Date — auto-calculated, still editable manually */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Due Date <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 400 }}>(auto)</span>
              </label>
              <input type="date" value={data.due_date || ''} onChange={e => set('due_date', e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2b96a55', background: '#fffbeb', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</label>
              <select value={data.status} onChange={e => set('status', e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: 13, outline: 'none' }}>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>

          {/* Currency row */}
          <div style={{ marginBottom: 14 }}>
            <F label="Currency" value={data.currency} onChange={v => set('currency', v)} type="select" options={['GBP','USD','EUR','RON']} style={{ marginBottom: 0 }} />
          </div>

          {/* Client */}
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <F label="Address" value={data.client_address} onChange={v => set('client_address', v)} placeholder="123 Client Street, London, EC1A 1BB" type="textarea" style={{ marginBottom: 0 }} />
              <F label="PO Number" value={data.po_number} onChange={v => set('po_number', v)} placeholder="PO-12345" style={{ marginBottom: 0 }} />
            </div>
          </div>

          {/* Items */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#334155' }}>📋 Line Items</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {products.length > 0 && (
                  <select
                    onChange={e => {
                      const p = products.find(pr => pr.id === e.target.value)
                      if (p) addProduct(p)
                      e.target.value = ''
                    }}
                    defaultValue=""
                    style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', fontSize: 12, color: '#64748b', cursor: 'pointer' }}>
                    <option value="">Add from catalogue…</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {fmt(p.price, cur)} {p.unit ? `/ ${p.unit}` : ''}
                      </option>
                    ))}
                  </select>
                )}
                <button onClick={addItem} style={{ padding: '5px 14px', borderRadius: 6, background: '#1a1a2e', color: '#e2b96a', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>+ Add Item</button>
              </div>
            </div>

            <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isCIS ? '1.4fr 2fr 0.55fr 1fr 0.55fr 1fr 0.8fr 24px' : '1.4fr 2fr 0.55fr 1fr 0.55fr 1fr 24px',
                background: '#1a1a2e', padding: '8px 10px', gap: 6
              }}>
                {['Item Type', 'Description', 'Qty', 'Unit Price', 'VAT%', 'Price', ...(isCIS ? ['Non-CIS'] : []), ''].map((h, i) => (
                  <div key={i} style={{ fontSize: 10, color: '#e2b96a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: i > 1 ? 'right' : 'left' }}>{h}</div>
                ))}
              </div>

              {data.items.map((item, i) => {
                const lineNet = Number(item.qty) * Number(item.unit_price) || 0
                const vr = Number(item.vat_rate ?? defaultVat)
                const linePrice = lineNet * (1 + vr / 100)
                return (
                  <div key={i} style={{
                    display: 'grid',
                    gridTemplateColumns: isCIS ? '1.4fr 2fr 0.55fr 1fr 0.55fr 1fr 0.8fr 24px' : '1.4fr 2fr 0.55fr 1fr 0.55fr 1fr 24px',
                    padding: '7px 10px', borderBottom: '1px solid #f1f5f9',
                    background: i % 2 === 0 ? '#fff' : '#f8fafc', alignItems: 'center', gap: 6
                  }}>
                    {/* Item Type — custom editable dropdown */}
                    <ItemTypeSelect
                      value={item.item_type || allItemTypes[0]}
                      onChange={v => setItem(i, 'item_type', v)}
                      itemTypes={allItemTypes}
                    />

                    <input value={item.description} onChange={e => setItem(i, 'description', e.target.value)} placeholder="Description"
                      style={{ padding: '5px 7px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, outline: 'none', width: '100%' }} />

                    <input type="number" value={item.qty} onChange={e => setItem(i, 'qty', e.target.value)} min="0"
                      style={{ padding: '5px 6px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, outline: 'none', textAlign: 'right', width: '100%' }} />

                    <input type="number" value={item.unit_price} onChange={e => setItem(i, 'unit_price', e.target.value)} min="0" step="0.01"
                      style={{ padding: '5px 6px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, outline: 'none', textAlign: 'right', width: '100%' }} />

                    <input type="number" value={item.vat_rate ?? defaultVat} onChange={e => setItem(i, 'vat_rate', e.target.value)} min="0" max="100"
                      style={{ padding: '5px 6px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, outline: 'none', textAlign: 'right', width: '100%' }} />

                    <div style={{ textAlign: 'right', fontWeight: 600, fontSize: 12, color: '#334155' }}>{fmt(linePrice, cur)}</div>

                    {isCIS && (
                      <div style={{ textAlign: 'right' }}>
                        <label title="Non-CIS item (e.g. materials)" style={{ cursor: 'pointer', fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
                          <input type="checkbox" checked={!!item.non_cis} onChange={e => setItem(i, 'non_cis', e.target.checked)} />
                        </label>
                      </div>
                    )}

                    <button onClick={() => removeItem(i)} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 16, textAlign: 'center', padding: 0 }}>×</button>
                  </div>
                )
              })}
            </div>
            {isCIS && <div style={{ fontSize: 11, color: '#64748b', marginTop: 5 }}>✅ Tick "Non-CIS" for items not subject to CIS deduction (e.g. materials)</div>}
          </div>

          {/* Bottom: notes + summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <div>
              <F label="Notes" value={data.notes} onChange={v => set('notes', v)} type="textarea" placeholder="Payment instructions, project reference…" />
              <F label="Footnote" value={data.footnote} onChange={v => set('footnote', v)} type="textarea" placeholder="e.g. Thank you for your business. Payment within 30 days." hint="Appears at the bottom of the invoice" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                <F label="Discount (£)" value={data.discount} onChange={v => set('discount', v)} type="number" style={{ marginBottom: 0 }} />
              </div>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#334155', marginBottom: 12 }}>💰 Summary</div>
              {[
                ['Net Invoice', fmt(netAfterDiscount, cur)],
                discount > 0 && ['Discount', `−${fmt(discount, cur)}`],
                company.vat_registered === 'yes' && ['VAT', fmt(vatTotal, cur)],
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

          <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
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
