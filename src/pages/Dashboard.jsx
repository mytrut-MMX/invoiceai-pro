import { useState } from 'react'
import { fmt, STATUS } from '../store/index.js'
import InvoiceEditor from '../components/InvoiceEditor.jsx'
import { InvoicePreview, exportToPDF } from '../components/InvoicePreview.jsx'
import AIChat from '../components/AIChat.jsx'

const NAV = [
  { id: 'dashboard', icon: '⊞', label: 'Dashboard' },
  { id: 'invoices', icon: '📄', label: 'Invoices' },
  { id: 'clients', icon: '👥', label: 'Clients' },
  { id: 'products', icon: '📦', label: 'Products' },
  { id: 'settings', icon: '⚙️', label: 'Settings' },
]

export default function Dashboard({ store }) {
  const { company, invoices, setInvoices, clients, setClients, products, setProducts, settings, setSettings, templateImg, setTemplateImg, genId, today, due, nextInvoiceNum } = store
  const [page, setPage] = useState('dashboard')
  const [showEditor, setShowEditor] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState(null)
  const [previewInvoice, setPreviewInvoice] = useState(null)
  const [showAI, setShowAI] = useState(false)
  const [aiDraft, setAiDraft] = useState(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  // Stats
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0)
  const totalDue = invoices.filter(i => ['sent','partial'].includes(i.status)).reduce((s, i) => s + (i.total || 0), 0)
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + (i.total || 0), 0)
  const thisMonth = invoices.filter(i => i.date?.startsWith(new Date().toISOString().slice(0,7)))

  const saveInvoice = (data) => {
    const calc = () => {
      const sub = (data.items || []).reduce((s, i) => s + (Number(i.qty) * Number(i.unit_price) || 0), 0)
      const taxAmt = sub * (Number(data.tax_rate) / 100)
      const total = sub + taxAmt - (Number(data.discount) || 0)
      return { subtotal: sub, tax_amount: taxAmt, total }
    }
    const totals = calc()
    if (editingInvoice) {
      setInvoices(prev => prev.map(i => i.id === editingInvoice.id ? { ...i, ...data, ...totals } : i))
    } else {
      const newInv = { id: genId(), number: nextInvoiceNum(), date: today(), due_date: due(company.payment_terms), ...data, ...totals }
      setInvoices(prev => [newInv, ...prev])
    }
    setShowEditor(false); setEditingInvoice(null); setAiDraft(null)
  }

  const deleteInvoice = id => { if (confirm('Delete this invoice?')) setInvoices(prev => prev.filter(i => i.id !== id)) }

  const sendEmail = async (invoice) => {
    if (!settings.emailjs_service || !settings.emailjs_public) {
      alert('Configure EmailJS in Settings first.'); return
    }
    try {
      const emailjs = await import('@emailjs/browser')
      await emailjs.default.send(settings.emailjs_service, settings.emailjs_template, {
        to_email: invoice.client_email,
        to_name: invoice.client_name,
        from_name: company.name,
        invoice_number: invoice.number,
        amount: fmt(invoice.total, invoice.currency || company.currency),
        due_date: invoice.due_date,
        company_email: company.email,
      }, settings.emailjs_public)
      setInvoices(prev => prev.map(i => i.id === invoice.id ? { ...i, status: 'sent', sent_at: today() } : i))
      alert(`✅ Invoice ${invoice.number} sent to ${invoice.client_email}`)
    } catch (err) { alert('Email error: ' + err.message) }
  }

  const openNewFromAI = draft => {
    setAiDraft(draft); setEditingInvoice(null); setShowEditor(true); setShowAI(false)
  }

  const filteredInvoices = invoices.filter(inv => {
    const matchSearch = !search || inv.number?.toLowerCase().includes(search.toLowerCase()) || inv.client_name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || inv.status === filterStatus
    return matchSearch && matchStatus
  })

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'DM Sans', sans-serif", background: '#f7f4ef' }}>
      {/* Sidebar */}
      <div style={{ width: 220, background: '#1a1a2e', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100 }}>
        <div style={{ padding: '24px 20px 20px' }}>
          {company.logo
            ? <img src={company.logo} alt="" style={{ height: 36, objectFit: 'contain', marginBottom: 6 }} />
            : <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 900, color: '#e2b96a' }}>{company.name}</div>}
          <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>Invoice Management</div>
        </div>

        <nav style={{ flex: 1, padding: '0 10px' }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px',
              borderRadius: 8, border: 'none', cursor: 'pointer', marginBottom: 2, textAlign: 'left',
              background: page === n.id ? '#e2b96a15' : 'transparent',
              color: page === n.id ? '#e2b96a' : '#94a3b8',
              fontWeight: page === n.id ? 700 : 400, fontSize: 14,
              borderLeft: page === n.id ? '3px solid #e2b96a' : '3px solid transparent',
            }}>
              <span style={{ fontSize: 16 }}>{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: 14 }}>
          <button onClick={() => setShowAI(!showAI)} style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 12px',
            borderRadius: 8, border: '1px solid #e2b96a44', cursor: 'pointer',
            background: showAI ? '#e2b96a22' : 'transparent',
            color: '#e2b96a', fontWeight: 700, fontSize: 13,
          }}>✨ AI Assistant</button>
        </div>
      </div>

      {/* Main */}
      <div style={{ marginLeft: 220, flex: 1, padding: 28, minHeight: '100vh' }}>

        {/* ── DASHBOARD ── */}
        {page === 'dashboard' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
              <div>
                <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, fontWeight: 900, color: '#1a1a2e' }}>Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'} 👋</h1>
                <div style={{ color: '#64748b', marginTop: 2 }}>Here's your financial overview</div>
              </div>
              <button onClick={() => { setEditingInvoice(null); setAiDraft(null); setShowEditor(true) }} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#1a1a2e', color: '#e2b96a', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                + New Invoice
              </button>
            </div>

            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
              {[
                { label: 'Total Paid', value: fmt(totalPaid, company.currency), icon: '✅', color: '#16a34a', bg: '#dcfce7' },
                { label: 'Outstanding', value: fmt(totalDue, company.currency), icon: '📤', color: '#2563eb', bg: '#dbeafe' },
                { label: 'Overdue', value: fmt(totalOverdue, company.currency), icon: '⚠️', color: '#dc2626', bg: '#fee2e2' },
                { label: 'This Month', value: thisMonth.length + ' invoices', icon: '📅', color: '#7c3aed', bg: '#ede9fe' },
              ].map(s => (
                <div key={s.label} style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #f1f5f9', borderTop: `3px solid ${s.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{s.label}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                    </div>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{s.icon}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent invoices */}
            <div style={{ background: '#fff', borderRadius: 14, padding: 22, border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a2e', fontFamily: "'Playfair Display',serif" }}>Recent Invoices</div>
                <button onClick={() => setPage('invoices')} style={{ fontSize: 13, color: '#2563eb', background: 'transparent', border: 'none', cursor: 'pointer' }}>View all →</button>
              </div>
              <InvoiceTable invoices={invoices.slice(0, 6)} company={company} onEdit={i => { setEditingInvoice(i); setShowEditor(true) }} onPreview={setPreviewInvoice} onDelete={deleteInvoice} onEmail={sendEmail} onStatusChange={(id, st) => setInvoices(p => p.map(i => i.id === id ? { ...i, status: st } : i))} />
            </div>
          </div>
        )}

        {/* ── INVOICES ── */}
        {page === 'invoices' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 900, color: '#1a1a2e' }}>Invoices</h1>
              <button onClick={() => { setEditingInvoice(null); setAiDraft(null); setShowEditor(true) }} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#1a1a2e', color: '#e2b96a', fontWeight: 700, cursor: 'pointer' }}>+ New Invoice</button>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by number or client…"
                style={{ flex: 1, padding: '9px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: 13, outline: 'none' }} />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                style={{ padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: 13, outline: 'none' }}>
                <option value="all">All Status</option>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
              <InvoiceTable invoices={filteredInvoices} company={company} onEdit={i => { setEditingInvoice(i); setShowEditor(true) }} onPreview={setPreviewInvoice} onDelete={deleteInvoice} onEmail={sendEmail} onStatusChange={(id, st) => setInvoices(p => p.map(i => i.id === id ? { ...i, status: st } : i))} />
              {filteredInvoices.length === 0 && <div style={{ padding: '60px 0', textAlign: 'center', color: '#94a3b8' }}>No invoices found</div>}
            </div>
          </div>
        )}

        {/* ── CLIENTS ── */}
        {page === 'clients' && <ClientsPage clients={clients} setClients={setClients} genId={genId} invoices={invoices} company={company} fmt={fmt} />}

        {/* ── PRODUCTS ── */}
        {page === 'products' && <ProductsPage products={products} setProducts={setProducts} genId={genId} company={company} fmt={fmt} />}

        {/* ── SETTINGS ── */}
        {page === 'settings' && <SettingsPage company={company} settings={settings} setSettings={setSettings} templateImg={templateImg} setTemplateImg={setTemplateImg} store={store} />}
      </div>

      {/* AI Panel */}
      {showAI && (
        <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 340, zIndex: 200, padding: 16, background: '#f7f4ef', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>AI Assistant</div>
            <button onClick={() => setShowAI(false)} style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>×</button>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <AIChat company={company} clients={clients} products={products} invoices={invoices} onCreateInvoice={openNewFromAI} apiKey={settings.anthropic_key} />
          </div>
        </div>
      )}

      {/* Invoice Editor */}
      {showEditor && (
        <InvoiceEditor
          invoice={editingInvoice ? { ...editingInvoice } : aiDraft ? { number: nextInvoiceNum(), date: today(), due_date: due(company.payment_terms), status: 'draft', currency: company.currency, tax_rate: Number(company.tax_rate) || 20, ...aiDraft } : null}
          clients={clients} products={products} company={company}
          onSave={saveInvoice} onClose={() => { setShowEditor(false); setEditingInvoice(null); setAiDraft(null) }}
        />
      )}

      {/* Invoice Preview Modal */}
      {previewInvoice && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,15,30,0.9)', zIndex: 1100, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <button onClick={() => window.print()} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#fff', color: '#1a1a2e', fontWeight: 700, cursor: 'pointer' }}>🖨️ Print</button>
            <button onClick={() => exportToPDF(previewInvoice, company, templateImg)} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#e2b96a', color: '#1a1a2e', fontWeight: 700, cursor: 'pointer' }}>📥 Save PDF</button>
            <button onClick={() => sendEmail(previewInvoice)} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>✉️ Send Email</button>
            <button onClick={() => setPreviewInvoice(null)} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #ffffff33', background: 'transparent', color: '#fff', cursor: 'pointer' }}>✕ Close</button>
          </div>
          <InvoicePreview invoice={previewInvoice} company={company} templateImg={templateImg} />
        </div>
      )}
    </div>
  )
}

// ── Invoice Table ─────────────────────────────────────────────────────────────
function InvoiceTable({ invoices, company, onEdit, onPreview, onDelete, onEmail, onStatusChange }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
          {['Invoice', 'Client', 'Date', 'Due', 'Amount', 'Status', 'Actions'].map(h => (
            <th key={h} style={{ padding: '11px 14px', textAlign: h === 'Amount' ? 'right' : 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {invoices.map(inv => {
          const sc = STATUS[inv.status] || STATUS.draft
          const isOverdue = inv.status !== 'paid' && inv.due_date && new Date(inv.due_date) < new Date()
          return (
            <tr key={inv.id} style={{ borderBottom: '1px solid #f8fafc' }} onMouseEnter={e => e.currentTarget.style.background='#fafaf8'} onMouseLeave={e => e.currentTarget.style.background='#fff'}>
              <td style={{ padding: '11px 14px', fontWeight: 700, color: '#1a1a2e', fontSize: 13 }}>{inv.number}</td>
              <td style={{ padding: '11px 14px', fontSize: 13 }}>
                <div style={{ fontWeight: 500 }}>{inv.client_name || '—'}</div>
                {inv.client_company && <div style={{ fontSize: 11, color: '#94a3b8' }}>{inv.client_company}</div>}
              </td>
              <td style={{ padding: '11px 14px', fontSize: 13, color: '#64748b' }}>{inv.date}</td>
              <td style={{ padding: '11px 14px', fontSize: 13, color: isOverdue ? '#dc2626' : '#64748b', fontWeight: isOverdue ? 700 : 400 }}>{inv.due_date}</td>
              <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 700, fontSize: 14 }}>{fmt(inv.total || 0, inv.currency || company.currency)}</td>
              <td style={{ padding: '11px 14px' }}>
                <select value={inv.status} onChange={e => onStatusChange(inv.id, e.target.value)}
                  style={{ padding: '3px 8px', borderRadius: 20, border: 'none', background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 700, cursor: 'pointer', appearance: 'none', paddingRight: 8 }}>
                  {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </td>
              <td style={{ padding: '11px 14px' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[['👁', () => onPreview(inv), '#f1f5f9', '#334155'], ['✏️', () => onEdit(inv), '#f1f5f9', '#334155'], ['✉️', () => onEmail(inv), '#dbeafe', '#2563eb'], ['🗑', () => onDelete(inv.id), '#fee2e2', '#dc2626']].map(([icon, fn, bg, color]) => (
                    <button key={icon} onClick={fn} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: bg, color, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</button>
                  ))}
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ── Clients Page ──────────────────────────────────────────────────────────────
function ClientsPage({ clients, setClients, genId, invoices, company, fmt }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', contact: '', email: '', phone: '', address: '', vat: '', notes: '' })
  const [editing, setEditing] = useState(null)

  const saveClient = () => {
    if (!form.name) return alert('Company name is required')
    if (editing) {
      setClients(p => p.map(c => c.id === editing ? { ...c, ...form } : c))
    } else {
      setClients(p => [...p, { id: genId(), ...form, created_at: new Date().toISOString().split('T')[0] }])
    }
    setForm({ name: '', contact: '', email: '', phone: '', address: '', vat: '', notes: '' })
    setShowForm(false); setEditing(null)
  }

  const editClient = c => { setForm(c); setEditing(c.id); setShowForm(true) }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 900, color: '#1a1a2e' }}>Clients</h1>
        <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm({ name: '', contact: '', email: '', phone: '', address: '', vat: '', notes: '' }) }}
          style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#1a1a2e', color: '#e2b96a', fontWeight: 700, cursor: 'pointer' }}>+ Add Client</button>
      </div>

      {showForm && (
        <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #e2e8f0', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: '#1a1a2e', fontFamily: "'Playfair Display',serif" }}>{editing ? 'Edit Client' : 'New Client'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[['Company Name *', 'name'], ['Contact Person', 'contact'], ['Email', 'email'], ['Phone', 'phone'], ['VAT Number', 'vat']].map(([l, k]) => (
              <div key={k}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l}</label>
                <input value={form[k] || ''} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none', background: '#f8fafc' }} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Address</label>
            <textarea value={form.address || ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} rows={2} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', background: '#f8fafc' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14, justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowForm(false); setEditing(null) }} style={{ padding: '9px 18px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: 'transparent', color: '#64748b', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
            <button onClick={saveClient} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#1a1a2e', color: '#e2b96a', fontWeight: 700, cursor: 'pointer' }}>{editing ? 'Save Changes' : 'Add Client'}</button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {clients.map(c => {
          const cInv = invoices.filter(i => i.client_company === c.name || i.client_email === c.email)
          const cTotal = cInv.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0)
          return (
            <div key={c.id} style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#334155' }}>
                  {c.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  <button onClick={() => editClient(c)} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: '#f1f5f9', cursor: 'pointer', fontSize: 13 }}>✏️</button>
                  <button onClick={() => { if (confirm('Delete client?')) setClients(p => p.filter(cl => cl.id !== c.id)) }} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: '#fee2e2', cursor: 'pointer', fontSize: 13 }}>🗑</button>
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e' }}>{c.name}</div>
              {c.contact && <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>{c.contact}</div>}
              {c.email && <div style={{ fontSize: 12, color: '#2563eb', marginTop: 3 }}>{c.email}</div>}
              {c.vat && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>VAT: {c.vat}</div>}
              <div style={{ display: 'flex', gap: 10, marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Invoices</div>
                  <div style={{ fontWeight: 700, color: '#334155' }}>{cInv.length}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Paid</div>
                  <div style={{ fontWeight: 700, color: '#16a34a' }}>{fmt(cTotal, company.currency)}</div>
                </div>
              </div>
            </div>
          )
        })}
        {clients.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>No clients yet — add your first client above</div>}
      </div>
    </div>
  )
}

// ── Products Page ─────────────────────────────────────────────────────────────
function ProductsPage({ products, setProducts, genId, company, fmt }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', price: '', unit: '', category: '', tax_rate: '', sku: '' })
  const [editing, setEditing] = useState(null)

  const save = () => {
    if (!form.name || !form.price) return alert('Name and price are required')
    if (editing) {
      setProducts(p => p.map(pr => pr.id === editing ? { ...pr, ...form, price: Number(form.price) } : pr))
    } else {
      setProducts(p => [...p, { id: genId(), ...form, price: Number(form.price) }])
    }
    setForm({ name: '', description: '', price: '', unit: '', category: '', tax_rate: '', sku: '' })
    setShowForm(false); setEditing(null)
  }

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 900, color: '#1a1a2e' }}>Products & Services</h1>
        <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm({ name: '', description: '', price: '', unit: '', category: '', tax_rate: '', sku: '' }) }}
          style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#1a1a2e', color: '#e2b96a', fontWeight: 700, cursor: 'pointer' }}>+ Add Product/Service</button>
      </div>

      {showForm && (
        <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #e2e8f0', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, fontFamily: "'Playfair Display',serif", color: '#1a1a2e' }}>{editing ? 'Edit' : 'New'} Product / Service</div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            {[['Name *', 'name'], ['Price *', 'price', 'number'], ['Unit', 'unit', 'text', 'hrs / item / day'], ['Category', 'category'], ['SKU', 'sku']].map(([l, k, t, ph]) => (
              <div key={k}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l}</label>
                <input type={t || 'text'} value={form[k] || ''} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} placeholder={ph || ''} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none', background: '#f8fafc' }} />
              </div>
            ))}
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</label>
            <textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', background: '#f8fafc' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14, justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowForm(false); setEditing(null) }} style={{ padding: '9px 18px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: 'transparent', color: '#64748b', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
            <button onClick={save} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#1a1a2e', color: '#e2b96a', fontWeight: 700, cursor: 'pointer' }}>{editing ? 'Save' : 'Add'}</button>
          </div>
        </div>
      )}

      {categories.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {categories.map(cat => <span key={cat} style={{ padding: '4px 12px', borderRadius: 20, background: '#f1f5f9', color: '#64748b', fontSize: 12, fontWeight: 600 }}>{cat}</span>)}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
        {products.map(p => (
          <div key={p.id} style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{p.category || 'Service'}</div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => { setForm({ ...p, price: String(p.price) }); setEditing(p.id); setShowForm(true) }} style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: '#f1f5f9', cursor: 'pointer', fontSize: 12 }}>✏️</button>
                <button onClick={() => { if (confirm('Delete?')) setProducts(pr => pr.filter(x => x.id !== p.id)) }} style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: '#fee2e2', cursor: 'pointer', fontSize: 12 }}>🗑</button>
              </div>
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e' }}>{p.name}</div>
            {p.description && <div style={{ fontSize: 12, color: '#64748b', marginTop: 3, lineHeight: 1.5 }}>{p.description}</div>}
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 18, color: '#1a1a2e' }}>{fmt(p.price, company.currency)}</div>
              {p.unit && <div style={{ fontSize: 11, color: '#94a3b8', background: '#f1f5f9', padding: '3px 8px', borderRadius: 20 }}>per {p.unit}</div>}
            </div>
            {p.sku && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>SKU: {p.sku}</div>}
          </div>
        ))}
        {products.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>No products yet — add your first product or service</div>}
      </div>
    </div>
  )
}

// ── Settings Page ─────────────────────────────────────────────────────────────
function SettingsPage({ company, settings, setSettings, templateImg, setTemplateImg, store }) {
  const [s, setS] = useState(settings)
  const [saved, setSaved] = useState(false)

  const save = () => { setSettings(s); setSaved(true); setTimeout(() => setSaved(false), 2000) }

  const handleTemplate = e => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setTemplateImg(ev.target.result)
    reader.readAsDataURL(file)
  }

  const F = ({ label, k, placeholder, type = 'text', hint }) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      <input type={type} value={s[k] || ''} onChange={e => setS(p => ({ ...p, [k]: e.target.value }))} placeholder={placeholder}
        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: 13, outline: 'none' }} />
      {hint && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>{hint}</div>}
    </div>
  )

  return (
    <div>
      <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 900, color: '#1a1a2e', marginBottom: 24 }}>Settings</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* EmailJS */}
        <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #f1f5f9' }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 18, fontFamily: "'Playfair Display',serif", color: '#1a1a2e' }}>✉️ EmailJS Configuration</div>
          <F label="Service ID" k="emailjs_service" placeholder="service_xxxxxx" hint="From emailjs.com → Email Services" />
          <F label="Template ID" k="emailjs_template" placeholder="template_xxxxxx" hint="From emailjs.com → Email Templates" />
          <F label="Public Key" k="emailjs_public" placeholder="xxxxxxxxxxxxxxxxxxx" type="password" hint="From emailjs.com → Account → General" />
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 12, fontSize: 12, color: '#92400e', marginTop: 4 }}>
            💡 Your EmailJS template should include variables: <code>to_email</code>, <code>to_name</code>, <code>invoice_number</code>, <code>amount</code>, <code>due_date</code>, <code>from_name</code>
          </div>
        </div>

        {/* AI Key */}
        <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #f1f5f9' }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 18, fontFamily: "'Playfair Display',serif", color: '#1a1a2e' }}>✨ AI Configuration</div>
          <F label="Anthropic API Key" k="anthropic_key" placeholder="sk-ant-..." type="password" hint="Get yours at console.anthropic.com" />
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 12, fontSize: 12, color: '#166534', marginTop: 4 }}>
            🔒 Your API key is stored locally in your browser and used only for AI chat features.
          </div>
        </div>

        {/* Invoice Template */}
        <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #f1f5f9', gridColumn: '1 / -1' }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 18, fontFamily: "'Playfair Display',serif", color: '#1a1a2e' }}>🎨 Invoice Template</div>
          <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>
            Upload your own branded template as a background image. It will appear as a subtle watermark behind all invoices. For best results, use a high-resolution PNG or PDF converted to PNG (A4, 794×1123px).
          </p>
          <label style={{ display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', padding: '16px 20px', border: '2px dashed #e2e8f0', borderRadius: 12 }}>
            {templateImg
              ? <img src={templateImg} alt="template" style={{ height: 80, borderRadius: 6, objectFit: 'contain', border: '1px solid #e2e8f0' }} />
              : <div style={{ width: 80, height: 80, borderRadius: 10, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>📄</div>}
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#334155' }}>{templateImg ? 'Template uploaded ✓ — click to change' : 'Upload invoice template'}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>PNG, JPG, PDF → PNG recommended</div>
              {templateImg && <button onClick={e => { e.preventDefault(); setTemplateImg(null) }} style={{ marginTop: 6, padding: '3px 10px', borderRadius: 6, border: 'none', background: '#fee2e2', color: '#dc2626', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Remove template</button>}
            </div>
            <input type="file" accept="image/*" onChange={handleTemplate} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={save} style={{ padding: '11px 28px', borderRadius: 10, border: 'none', background: saved ? '#16a34a' : '#1a1a2e', color: saved ? '#fff' : '#e2b96a', fontWeight: 700, cursor: 'pointer', fontSize: 14, transition: 'all 0.3s' }}>
          {saved ? '✅ Saved!' : '💾 Save Settings'}
        </button>
      </div>
    </div>
  )
}
