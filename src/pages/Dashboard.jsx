import { useState } from 'react'
import { fmt, STATUS, DEFAULT_ITEM_TYPES, DEFAULT_EMAIL_COLUMNS } from '../store/index.js'
import InvoiceEditor from '../components/InvoiceEditor.jsx'
import { InvoicePreview, TemplateSelector, DefaultTemplateEditor, exportToPDF } from '../components/InvoicePreview.jsx'
import AIChat from '../components/AIChat.jsx'

const NAV = [
  { id: 'dashboard', icon: '⊞', label: 'Dashboard' },
  { id: 'invoices',  icon: '🧾', label: 'Invoices' },
  { id: 'quotes',    icon: '📋', label: 'Quotes' },
  { id: 'clients',   icon: '👥', label: 'Clients' },
  { id: 'products',  icon: '📦', label: 'Products' },
  { id: 'settings',  icon: '⚙️', label: 'Settings' },
]

export default function Dashboard({ store }) {
  const { company, invoices, setInvoices, clients, setClients, products, setProducts, settings, setSettings, templates, setTemplates, selectedTemplateId, setSelectedTemplateId, selectedTemplate, genId, today, dueFromDate, nextInvoiceNum, getItemTypes, getEmailColumns } = store

  const [page, setPage] = useState('dashboard')
  const [showEditor, setShowEditor] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState(null)
  const [previewInvoice, setPreviewInvoice] = useState(null)
  const [showAI, setShowAI] = useState(false)
  const [aiDraft, setAiDraft] = useState(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [defaultDocType, setDefaultDocType] = useState('invoice')

  const itemTypes = getItemTypes()
  const defaultTemplateConfig = settings.defaultTemplate || {}

  const allInvoicesList = invoices.filter(i => i.doc_type !== 'quote')
  const allQuotesList   = invoices.filter(i => i.doc_type === 'quote')
  const totalPaid   = allInvoicesList.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0)
  const totalDue    = allInvoicesList.filter(i => ['sent','partial'].includes(i.status)).reduce((s, i) => s + (i.total || 0), 0)
  const totalOverdue= allInvoicesList.filter(i => i.status === 'overdue').reduce((s, i) => s + (i.total || 0), 0)
  const thisMonth   = allInvoicesList.filter(i => i.date?.startsWith(new Date().toISOString().slice(0,7)))

  const calcTotals = (data) => {
    const items = data.items || []
    const netTotal = items.reduce((s, i) => s + (Number(i.qty) * Number(i.unit_price) || 0), 0)
    const discount = Number(data.discount) || 0
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
    const cisDeduction = isCIS ? cisNet * cisRate / 100 : 0
    const total = grossInvoice - cisDeduction
    return { subtotal: netTotal, net_after_discount: netAfterDiscount, vat_amount: vatTotal, gross: grossInvoice, cis_deduction: cisDeduction, total }
  }

  const saveInvoice = (data) => {
    const totals = calcTotals(data)
    if (editingInvoice) {
      setInvoices(prev => prev.map(i => i.id === editingInvoice.id ? { ...i, ...data, ...totals } : i))
    } else {
      const newInv = {
        id: genId(),
        number: nextInvoiceNum(data.doc_type),
        date: today(),
        due_date: dueFromDate(today(), company.payment_terms),
        ...data, ...totals
      }
      setInvoices(prev => [newInv, ...prev])
    }
    setShowEditor(false); setEditingInvoice(null); setAiDraft(null)
  }

  const deleteDoc = id => { if (confirm('Delete this document?')) setInvoices(prev => prev.filter(i => i.id !== id)) }

  const sendEmail = async (invoice) => {
    if (!settings.emailjs_service || !settings.emailjs_public) { alert('Configure EmailJS in Settings first.'); return }
    try {
      const emailjs = await import('@emailjs/browser')
      const emailCols = getEmailColumns().filter(c => c.enabled)
      const templateParams = {
        to_email: invoice.client_email,
        to_name: invoice.client_name,
        from_name: company.name,
        invoice_number: invoice.number,
        amount: fmt(invoice.total, invoice.currency || company.currency),
        due_date: invoice.due_date,
        company_email: company.email,
      }
      // Add any custom email columns
      emailCols.forEach(col => {
        if (invoice[col.key] !== undefined) templateParams[col.key] = invoice[col.key]
      })
      await emailjs.default.send(settings.emailjs_service, settings.emailjs_template, templateParams, settings.emailjs_public)
      setInvoices(prev => prev.map(i => i.id === invoice.id ? { ...i, status: 'sent', sent_at: today() } : i))
      alert(`✅ ${invoice.doc_type === 'quote' ? 'Quote' : 'Invoice'} ${invoice.number} sent to ${invoice.client_email}`)
    } catch (err) { alert('Email error: ' + err.message) }
  }

  const openNew = (docType = 'invoice') => { setDefaultDocType(docType); setEditingInvoice(null); setAiDraft(null); setShowEditor(true) }
  const openEdit = inv => { setEditingInvoice(inv); setAiDraft(null); setShowEditor(true) }
  const openAIDraft = draft => { setAiDraft(draft); setEditingInvoice(null); setShowEditor(true); setShowAI(false) }

  const filteredDocs = (docType) => invoices.filter(inv => {
    const matchType = inv.doc_type === docType || (!inv.doc_type && docType === 'invoice')
    const matchSearch = !search || inv.number?.toLowerCase().includes(search.toLowerCase()) || inv.client_name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || inv.status === filterStatus
    return matchType && matchSearch && matchStatus
  })

  const addTemplate = async (e) => {
    const files = Array.from(e.target.files)
    for (const file of files) {
      if (!file.type.startsWith('image/')) { alert(`${file.name}: only image files (PNG/JPG). Convert PDF to image first.`); continue }
      await new Promise(resolve => {
        const reader = new FileReader()
        reader.onload = ev => {
          const newT = { id: genId(), name: file.name.replace(/\.[^/.]+$/, ''), data: ev.target.result }
          setTemplates(prev => [...prev, newT])
          setSelectedTemplateId(newT.id)
          resolve()
        }
        reader.readAsDataURL(file)
      })
    }
    e.target.value = ''
  }

  const removeTemplate = id => { setTemplates(prev => prev.filter(t => t.id !== id)); if (selectedTemplateId === id) setSelectedTemplateId('default') }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'DM Sans', sans-serif", background: '#f7f4ef' }}>

      {/* Sidebar */}
      <div style={{ width: 220, background: '#1a1a2e', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100 }}>
        <div style={{ padding: '20px 18px 14px' }}>
          {company.logo
            ? <img src={company.logo} alt="" style={{ height: 32, objectFit: 'contain', marginBottom: 3 }} />
            : <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 900, color: '#e2b96a' }}>{company.name}</div>}
          <div style={{ fontSize: 10, color: '#334155', marginTop: 3 }}>Invoice Management</div>
        </div>
        <nav style={{ flex: 1, padding: '0 10px' }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', marginBottom: 2, textAlign: 'left', background: page === n.id ? '#e2b96a15' : 'transparent', color: page === n.id ? '#e2b96a' : '#94a3b8', fontWeight: page === n.id ? 700 : 400, fontSize: 13, borderLeft: page === n.id ? '3px solid #e2b96a' : '3px solid transparent' }}>
              <span style={{ fontSize: 14 }}>{n.icon}</span>{n.label}
              {n.id === 'invoices' && allInvoicesList.filter(i => i.status === 'overdue').length > 0 &&
                <span style={{ marginLeft: 'auto', background: '#dc2626', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>{allInvoicesList.filter(i => i.status === 'overdue').length}</span>}
            </button>
          ))}
        </nav>
        <div style={{ padding: 10 }}>
          <button onClick={() => setShowAI(!showAI)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2b96a44', cursor: 'pointer', background: showAI ? '#e2b96a22' : 'transparent', color: '#e2b96a', fontWeight: 700, fontSize: 12 }}>✨ AI Assistant</button>
        </div>
      </div>

      {/* Main */}
      <div style={{ marginLeft: 220, flex: 1, padding: 26, minHeight: '100vh', paddingRight: showAI ? 356 : 26 }}>

        {/* DASHBOARD */}
        {page === 'dashboard' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 900, color: '#1a1a2e' }}>Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'} 👋</h1>
                <div style={{ color: '#64748b', marginTop: 2, fontSize: 13 }}>{company.name} — Financial Overview</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => openNew('quote')} style={{ padding: '8px 14px', borderRadius: 9, border: '1.5px solid #1a1a2e', background: 'transparent', color: '#1a1a2e', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>+ New Quote</button>
                <button onClick={() => openNew('invoice')} style={{ padding: '8px 16px', borderRadius: 9, border: 'none', background: '#1a1a2e', color: '#e2b96a', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>+ New Invoice</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
              {[
                { label: 'Total Paid', value: fmt(totalPaid, company.currency), icon: '✅', color: '#16a34a', bg: '#dcfce7' },
                { label: 'Outstanding', value: fmt(totalDue, company.currency), icon: '📤', color: '#2563eb', bg: '#dbeafe' },
                { label: 'Overdue', value: fmt(totalOverdue, company.currency), icon: '⚠️', color: '#dc2626', bg: '#fee2e2' },
                { label: 'This Month', value: `${thisMonth.length} invoices`, icon: '📅', color: '#7c3aed', bg: '#ede9fe' },
              ].map(s => (
                <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #f1f5f9', borderTop: `3px solid ${s.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontSize: 19, fontWeight: 800, color: s.color }}>{s.value}</div>
                    </div>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>{s.icon}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: '#fff', borderRadius: 12, padding: 18, border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e', fontFamily: "'Playfair Display',serif" }}>Recent Invoices</div>
                <button onClick={() => setPage('invoices')} style={{ fontSize: 13, color: '#2563eb', background: 'transparent', border: 'none', cursor: 'pointer' }}>View all →</button>
              </div>
              <DocTable docs={allInvoicesList.slice(0, 6)} company={company} onEdit={openEdit} onPreview={setPreviewInvoice} onDelete={deleteDoc} onEmail={sendEmail} onStatusChange={(id, st) => setInvoices(p => p.map(i => i.id === id ? { ...i, status: st } : i))} />
            </div>
          </div>
        )}

        {page === 'invoices' && <PageWithDocs title="Invoices" docs={filteredDocs('invoice')} docType="invoice" company={company} search={search} setSearch={setSearch} filterStatus={filterStatus} setFilterStatus={setFilterStatus} onNew={() => openNew('invoice')} onEdit={openEdit} onPreview={setPreviewInvoice} onDelete={deleteDoc} onEmail={sendEmail} setInvoices={setInvoices} />}
        {page === 'quotes' && <PageWithDocs title="Quotes" docs={filteredDocs('quote')} docType="quote" company={company} search={search} setSearch={setSearch} filterStatus={filterStatus} setFilterStatus={setFilterStatus} onNew={() => openNew('quote')} onEdit={openEdit} onPreview={setPreviewInvoice} onDelete={deleteDoc} onEmail={sendEmail} setInvoices={setInvoices} />}
        {page === 'clients' && <ClientsPage clients={clients} setClients={setClients} genId={genId} invoices={invoices} company={company} />}
        {page === 'products' && <ProductsPage products={products} setProducts={setProducts} genId={genId} company={company} itemTypes={itemTypes} />}
        {page === 'settings' && (
          <SettingsPage
            company={company} settings={settings} setSettings={setSettings}
            templates={templates} selectedTemplateId={selectedTemplateId}
            onSelectTemplate={setSelectedTemplateId} onAddTemplate={addTemplate} onRemoveTemplate={removeTemplate}
            invoices={invoices} genId={genId}
          />
        )}
      </div>

      {/* AI Panel */}
      {showAI && (
        <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 336, zIndex: 200, padding: 12, background: '#f7f4ef', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1a1a2e' }}>✨ AI Assistant</div>
            <button onClick={() => setShowAI(false)} style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>×</button>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <AIChat company={company} clients={clients} products={products} invoices={invoices} onCreateInvoice={openAIDraft} apiKey={settings.anthropic_key} />
          </div>
        </div>
      )}

      {/* Invoice Editor */}
      {showEditor && (
        <InvoiceEditor
          invoice={editingInvoice
            ? { ...editingInvoice }
            : aiDraft
              ? { number: nextInvoiceNum(aiDraft.doc_type || defaultDocType), date: today(), due_date: dueFromDate(today(), company.payment_terms), status: 'draft', doc_type: defaultDocType, currency: company.currency, tax_rate: company.vat_registered === 'yes' ? (Number(company.tax_rate) || 20) : 0, ...aiDraft }
              : null}
          clients={clients} products={products} company={company}
          itemTypes={itemTypes}
          onSave={saveInvoice}
          onClose={() => { setShowEditor(false); setEditingInvoice(null); setAiDraft(null) }}
        />
      )}

      {/* Preview Modal */}
      {previewInvoice && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,15,30,0.92)', zIndex: 1100, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Toolbar — hidden on print via className */}
          <div className="no-print" style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={() => window.print()} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#fff', color: '#1a1a2e', fontWeight: 700, cursor: 'pointer' }}>🖨️ Print</button>
            <button onClick={() => exportToPDF(previewInvoice, company, selectedTemplate)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#e2b96a', color: '#1a1a2e', fontWeight: 700, cursor: 'pointer' }}>📥 Save PDF</button>
            <button onClick={() => sendEmail(previewInvoice)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>✉️ Send Email</button>
            <button onClick={() => setPreviewInvoice(null)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #ffffff33', background: 'transparent', color: '#fff', cursor: 'pointer' }}>✕ Close</button>
          </div>
          <InvoicePreview invoice={previewInvoice} company={company} template={selectedTemplate} defaultTemplateConfig={settings.defaultTemplate} />
        </div>
      )}
    </div>
  )
}

function PageWithDocs({ title, docs, docType, company, search, setSearch, filterStatus, setFilterStatus, onNew, onEdit, onPreview, onDelete, onEmail, setInvoices }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 900, color: '#1a1a2e' }}>{title}</h1>
        <button onClick={onNew} style={{ padding: '8px 16px', borderRadius: 9, border: 'none', background: '#1a1a2e', color: '#e2b96a', fontWeight: 700, cursor: 'pointer' }}>+ New {docType === 'quote' ? 'Quote' : 'Invoice'}</button>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${title.toLowerCase()}…`} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: 13, outline: 'none' }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: 13, outline: 'none' }}>
          <option value="all">All Status</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
        <DocTable docs={docs} company={company} onEdit={onEdit} onPreview={onPreview} onDelete={onDelete} onEmail={onEmail} onStatusChange={(id, st) => setInvoices(p => p.map(i => i.id === id ? { ...i, status: st } : i))} />
        {docs.length === 0 && <div style={{ padding: '50px 0', textAlign: 'center', color: '#94a3b8' }}>No {title.toLowerCase()} found</div>}
      </div>
    </div>
  )
}

function DocTable({ docs, company, onEdit, onPreview, onDelete, onEmail, onStatusChange }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
          {['Number','Type','Client','Date','Due','Amount','Status','Actions'].map(h => (
            <th key={h} style={{ padding: '10px 11px', textAlign: h === 'Amount' ? 'right' : 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {docs.map(inv => {
          const sc = STATUS[inv.status] || STATUS.draft
          const isOverdue = inv.status !== 'paid' && inv.due_date && new Date(inv.due_date) < new Date()
          return (
            <tr key={inv.id} style={{ borderBottom: '1px solid #f8fafc', background: '#fff' }}
              onMouseEnter={e => e.currentTarget.style.background='#fafaf8'}
              onMouseLeave={e => e.currentTarget.style.background='#fff'}>
              <td style={{ padding: '9px 11px', fontWeight: 700, color: '#1a1a2e', fontSize: 13 }}>{inv.number}</td>
              <td style={{ padding: '9px 11px' }}>
                <span style={{ padding: '2px 7px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: inv.doc_type === 'quote' ? '#ede9fe' : '#f0fdf4', color: inv.doc_type === 'quote' ? '#7c3aed' : '#16a34a' }}>
                  {inv.doc_type === 'quote' ? 'QUOTE' : 'INV'}
                </span>
              </td>
              <td style={{ padding: '9px 11px', fontSize: 13 }}>
                <div style={{ fontWeight: 500 }}>{inv.client_name || '—'}</div>
                {inv.client_company && <div style={{ fontSize: 11, color: '#94a3b8' }}>{inv.client_company}</div>}
              </td>
              <td style={{ padding: '9px 11px', fontSize: 12, color: '#64748b' }}>{inv.date}</td>
              <td style={{ padding: '9px 11px', fontSize: 12, color: isOverdue ? '#dc2626' : '#64748b', fontWeight: isOverdue ? 700 : 400 }}>{inv.due_date}</td>
              <td style={{ padding: '9px 11px', textAlign: 'right', fontWeight: 700, fontSize: 13 }}>{fmt(inv.total || 0, inv.currency || company.currency)}</td>
              <td style={{ padding: '9px 11px' }}>
                <select value={inv.status} onChange={e => onStatusChange(inv.id, e.target.value)}
                  style={{ padding: '3px 7px', borderRadius: 20, border: 'none', background: sc.bg, color: sc.color, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                  {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </td>
              <td style={{ padding: '9px 11px' }}>
                <div style={{ display: 'flex', gap: 3 }}>
                  {[['👁', () => onPreview(inv), '#f1f5f9', '#334155'], ['✏️', () => onEdit(inv), '#f1f5f9', '#334155'], ['✉️', () => onEmail(inv), '#dbeafe', '#2563eb'], ['🗑', () => onDelete(inv.id), '#fee2e2', '#dc2626']].map(([icon, fn, bg, color]) => (
                    <button key={icon} onClick={fn} style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: bg, color, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</button>
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

function ClientsPage({ clients, setClients, genId, invoices, company }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', contact: '', email: '', phone: '', address: '', vat: '' })
  const [editing, setEditing] = useState(null)
  const save = () => {
    if (!form.name) return alert('Company name required')
    if (editing) setClients(p => p.map(c => c.id === editing ? { ...c, ...form } : c))
    else setClients(p => [...p, { id: genId(), ...form, created_at: new Date().toISOString().split('T')[0] }])
    setForm({ name: '', contact: '', email: '', phone: '', address: '', vat: '' }); setShowForm(false); setEditing(null)
  }
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 900, color: '#1a1a2e' }}>Clients</h1>
        <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm({ name: '', contact: '', email: '', phone: '', address: '', vat: '' }) }} style={{ padding: '8px 16px', borderRadius: 9, border: 'none', background: '#1a1a2e', color: '#e2b96a', fontWeight: 700, cursor: 'pointer' }}>+ Add Client</button>
      </div>
      {showForm && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0', marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[['Company Name *','name'],['Contact','contact'],['Email','email'],['Phone','phone'],['VAT Number','vat']].map(([l,k]) => (
              <div key={k}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l}</label>
                <input value={form[k]||''} onChange={e => setForm(f => ({...f,[k]:e.target.value}))} style={{ width:'100%',padding:'8px 11px',borderRadius:7,border:'1.5px solid #e2e8f0',fontSize:13,outline:'none',background:'#f8fafc' }} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Address</label>
            <textarea value={form.address||''} onChange={e => setForm(f=>({...f,address:e.target.value}))} rows={2} style={{ width:'100%',padding:'8px 11px',borderRadius:7,border:'1.5px solid #e2e8f0',fontSize:13,outline:'none',resize:'vertical',fontFamily:'inherit',background:'#f8fafc' }} />
          </div>
          <div style={{ display:'flex',gap:8,marginTop:12,justifyContent:'flex-end' }}>
            <button onClick={() => {setShowForm(false);setEditing(null)}} style={{ padding:'8px 16px',borderRadius:7,border:'1.5px solid #e2e8f0',background:'transparent',color:'#64748b',cursor:'pointer',fontWeight:600 }}>Cancel</button>
            <button onClick={save} style={{ padding:'8px 18px',borderRadius:7,border:'none',background:'#1a1a2e',color:'#e2b96a',fontWeight:700,cursor:'pointer' }}>{editing?'Save':'Add Client'}</button>
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {clients.map(c => {
          const cInv = invoices.filter(i => i.client_email === c.email || i.client_company === c.name)
          const cPaid = cInv.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0)
          return (
            <div key={c.id} style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700 }}>{c.name?.[0]?.toUpperCase()||'?'}</div>
                <div style={{ display: 'flex', gap: 3 }}>
                  <button onClick={() => { setForm(c); setEditing(c.id); setShowForm(true) }} style={{ width:25,height:25,borderRadius:6,border:'none',background:'#f1f5f9',cursor:'pointer',fontSize:11 }}>✏️</button>
                  <button onClick={() => { if(confirm('Delete?')) setClients(p => p.filter(cl => cl.id !== c.id)) }} style={{ width:25,height:25,borderRadius:6,border:'none',background:'#fee2e2',cursor:'pointer',fontSize:11 }}>🗑</button>
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
              {c.contact && <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>{c.contact}</div>}
              {c.email && <div style={{ fontSize: 12, color: '#2563eb', marginTop: 2 }}>{c.email}</div>}
              <div style={{ display: 'flex', gap: 10, marginTop: 10, paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                <div><div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase' }}>Docs</div><div style={{ fontWeight: 700 }}>{cInv.length}</div></div>
                <div><div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase' }}>Paid</div><div style={{ fontWeight: 700, color: '#16a34a' }}>{fmt(cPaid, company.currency)}</div></div>
              </div>
            </div>
          )
        })}
        {clients.length === 0 && <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'50px 0', color:'#94a3b8' }}>No clients yet</div>}
      </div>
    </div>
  )
}

function ProductsPage({ products, setProducts, genId, company, itemTypes }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name:'', description:'', price:'', unit:'hrs', category:'', sku:'', item_type: itemTypes[0] || 'Labour' })
  const [editing, setEditing] = useState(null)
  const save = () => {
    if (!form.name || !form.price) return alert('Name and price required')
    if (editing) setProducts(p => p.map(pr => pr.id === editing ? { ...pr, ...form, price: Number(form.price) } : pr))
    else setProducts(p => [...p, { id: genId(), ...form, price: Number(form.price) }])
    setForm({ name:'',description:'',price:'',unit:'hrs',category:'',sku:'',item_type:itemTypes[0]||'Labour' }); setShowForm(false); setEditing(null)
  }
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
        <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:900, color:'#1a1a2e' }}>Products & Services</h1>
        <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm({ name:'',description:'',price:'',unit:'hrs',category:'',sku:'',item_type:itemTypes[0]||'Labour' }) }} style={{ padding:'8px 16px',borderRadius:9,border:'none',background:'#1a1a2e',color:'#e2b96a',fontWeight:700,cursor:'pointer' }}>+ Add Product</button>
      </div>
      {showForm && (
        <div style={{ background:'#fff', borderRadius:12, padding:20, border:'1px solid #e2e8f0', marginBottom:16 }}>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 1fr', gap:12 }}>
            {[['Name *','name'],['Price *','price','number'],['Unit','unit'],['Category','category'],['SKU','sku']].map(([l,k,t]) => (
              <div key={k}>
                <label style={{ fontSize:11, fontWeight:600, color:'#64748b', display:'block', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.05em' }}>{l}</label>
                <input type={t||'text'} value={form[k]||''} onChange={e => setForm(f=>({...f,[k]:e.target.value}))} style={{ width:'100%',padding:'8px 11px',borderRadius:7,border:'1.5px solid #e2e8f0',fontSize:13,outline:'none',background:'#f8fafc' }} />
              </div>
            ))}
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'#64748b', display:'block', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.05em' }}>Item Type</label>
              <select value={form.item_type||''} onChange={e => setForm(f=>({...f,item_type:e.target.value}))} style={{ width:'100%',padding:'8px 11px',borderRadius:7,border:'1.5px solid #e2e8f0',fontSize:13,outline:'none',background:'#f8fafc' }}>
                {itemTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginTop:12 }}>
            <label style={{ fontSize:11, fontWeight:600, color:'#64748b', display:'block', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.05em' }}>Description</label>
            <textarea value={form.description||''} onChange={e => setForm(f=>({...f,description:e.target.value}))} rows={2} style={{ width:'100%',padding:'8px 11px',borderRadius:7,border:'1.5px solid #e2e8f0',fontSize:13,outline:'none',resize:'vertical',fontFamily:'inherit',background:'#f8fafc' }} />
          </div>
          <div style={{ display:'flex',gap:8,marginTop:12,justifyContent:'flex-end' }}>
            <button onClick={()=>{setShowForm(false);setEditing(null)}} style={{ padding:'8px 16px',borderRadius:7,border:'1.5px solid #e2e8f0',background:'transparent',color:'#64748b',cursor:'pointer',fontWeight:600 }}>Cancel</button>
            <button onClick={save} style={{ padding:'8px 18px',borderRadius:7,border:'none',background:'#1a1a2e',color:'#e2b96a',fontWeight:700,cursor:'pointer' }}>{editing?'Save':'Add'}</button>
          </div>
        </div>
      )}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:12 }}>
        {products.map(p => (
          <div key={p.id} style={{ background:'#fff', borderRadius:12, padding:16, border:'1px solid #f1f5f9' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <div style={{ fontSize:10, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:700 }}>{p.category||p.item_type||'Service'}</div>
              <div style={{ display:'flex', gap:3 }}>
                <button onClick={() => { setForm({...p,price:String(p.price)}); setEditing(p.id); setShowForm(true) }} style={{ width:24,height:24,borderRadius:6,border:'none',background:'#f1f5f9',cursor:'pointer',fontSize:11 }}>✏️</button>
                <button onClick={() => { if(confirm('Delete?')) setProducts(pr => pr.filter(x => x.id !== p.id)) }} style={{ width:24,height:24,borderRadius:6,border:'none',background:'#fee2e2',cursor:'pointer',fontSize:11 }}>🗑</button>
              </div>
            </div>
            <div style={{ fontWeight:700, fontSize:14 }}>{p.name}</div>
            {p.description && <div style={{ fontSize:12, color:'#64748b', marginTop:2, lineHeight:1.5 }}>{p.description}</div>}
            <div style={{ marginTop:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontWeight:800, fontSize:16 }}>{fmt(p.price, company.currency)}</div>
              {p.unit && <div style={{ fontSize:11, color:'#94a3b8', background:'#f1f5f9', padding:'2px 7px', borderRadius:20 }}>/{p.unit}</div>}
            </div>
          </div>
        ))}
        {products.length === 0 && <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'50px 0', color:'#94a3b8' }}>No products yet</div>}
      </div>
    </div>
  )
}

function SettingsPage({ company, settings, setSettings, templates, selectedTemplateId, onSelectTemplate, onAddTemplate, onRemoveTemplate, invoices, genId }) {
  const [s, setS] = useState(settings)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState('email')
  const [newType, setNewType] = useState('')
  const [driveConnected, setDriveConnected] = useState(false)

  const save = () => { setSettings(s); setSaved(true); setTimeout(() => setSaved(false), 2000) }

  const itemTypes = s.itemTypes || DEFAULT_ITEM_TYPES
  const emailCols = s.emailColumns || DEFAULT_EMAIL_COLUMNS

  const addItemType = () => {
    if (!newType.trim()) return
    setS(p => ({ ...p, itemTypes: [...(p.itemTypes || DEFAULT_ITEM_TYPES), newType.trim()] }))
    setNewType('')
  }
  const removeItemType = type => setS(p => ({ ...p, itemTypes: (p.itemTypes || DEFAULT_ITEM_TYPES).filter(t => t !== type) }))
  const toggleEmailCol = key => setS(p => ({ ...p, emailColumns: (p.emailColumns || DEFAULT_EMAIL_COLUMNS).map(c => c.key === key ? { ...c, enabled: !c.enabled } : c) }))
  const updateEmailColLabel = (key, label) => setS(p => ({ ...p, emailColumns: (p.emailColumns || DEFAULT_EMAIL_COLUMNS).map(c => c.key === key ? { ...c, label } : c) }))

  // Google Drive export
  const exportToGoogleDrive = async () => {
    const data = JSON.stringify({ invoices, company, exportDate: new Date().toISOString() }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `invoiceai-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click(); URL.revokeObjectURL(url)
    alert('✅ Backup downloaded! You can upload this file to Google Drive, Dropbox, or any cloud storage manually.')
  }

  const importData = (e) => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result)
        if (data.invoices) { localStorage.setItem('iai_invoices', JSON.stringify(data.invoices)) }
        if (data.company) { localStorage.setItem('iai_company', JSON.stringify(data.company)) }
        alert('✅ Data imported! Refresh the page to see your data.')
      } catch { alert('❌ Invalid backup file') }
    }
    reader.readAsText(file)
  }

  const TABS = [['email', '✉️ EmailJS'], ['ai', '✨ AI Key'], ['templates', '🎨 Templates'], ['defaultDesign', '🖌️ Default Design'], ['itemTypes', '📋 Item Types'], ['emailCols', '📧 Email Columns'], ['backup', '💾 Backup']]

  return (
    <div>
      <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:900, color:'#1a1a2e', marginBottom:20 }}>Settings</h1>
      <div style={{ display:'flex', gap:6, marginBottom:20, flexWrap:'wrap' }}>
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)} style={{ padding:'7px 14px', borderRadius:8, border:'1.5px solid #e2e8f0', background: activeTab===id ? '#1a1a2e' : '#fff', color: activeTab===id ? '#e2b96a' : '#64748b', fontWeight: activeTab===id ? 700 : 400, cursor:'pointer', fontSize:13 }}>{label}</button>
        ))}
      </div>

      <div style={{ background:'#fff', borderRadius:14, padding:24, border:'1px solid #f1f5f9' }}>

        {/* EmailJS */}
        {activeTab === 'email' && (
          <div>
            <div style={{ fontWeight:700, fontSize:15, marginBottom:16, fontFamily:"'Playfair Display',serif", color:'#1a1a2e' }}>✉️ EmailJS Configuration</div>
            {[['Service ID','emailjs_service','service_xxxxxx'],['Template ID','emailjs_template','template_xxxxxx'],['Public Key','emailjs_public','xxxxxxxxxxx','password']].map(([l,k,ph,t]) => (
              <div key={k} style={{ marginBottom:14 }}>
                <label style={{ fontSize:11, fontWeight:600, color:'#64748b', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' }}>{l}</label>
                <input type={t||'text'} value={s[k]||''} onChange={e => setS(p=>({...p,[k]:e.target.value}))} placeholder={ph} style={{ width:'100%',padding:'9px 12px',borderRadius:8,border:'1.5px solid #e2e8f0',background:'#f8fafc',fontSize:13,outline:'none' }} />
              </div>
            ))}
            <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, padding:10, fontSize:12, color:'#92400e' }}>
              💡 Template must include: <code>to_email, to_name, invoice_number, amount, due_date, from_name</code>
            </div>
          </div>
        )}

        {/* AI Key */}
        {activeTab === 'ai' && (
          <div>
            <div style={{ fontWeight:700, fontSize:15, marginBottom:16, fontFamily:"'Playfair Display',serif", color:'#1a1a2e' }}>✨ Anthropic AI Key</div>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:11, fontWeight:600, color:'#64748b', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' }}>API Key</label>
              <input type="password" value={s.anthropic_key||''} onChange={e => setS(p=>({...p,anthropic_key:e.target.value}))} placeholder="sk-ant-..." style={{ width:'100%',padding:'9px 12px',borderRadius:8,border:'1.5px solid #e2e8f0',background:'#f8fafc',fontSize:13,outline:'none' }} />
              <div style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>Get yours at <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{ color:'#6366f1' }}>console.anthropic.com</a></div>
            </div>
          </div>
        )}

        {/* Templates */}
        {activeTab === 'templates' && (
          <div>
            <div style={{ fontWeight:700, fontSize:15, marginBottom:10, fontFamily:"'Playfair Display',serif", color:'#1a1a2e' }}>🎨 Invoice Templates</div>
            <p style={{ color:'#64748b', fontSize:13, marginBottom:16 }}>Upload PNG/JPG images as full-page invoice backgrounds. Click a template to set it as active.<br /><span style={{ color:'#e2b96a', fontWeight:600 }}>To use a PDF template: screenshot each page and save as PNG.</span></p>
            <TemplateSelector templates={templates} selectedId={selectedTemplateId} onSelect={onSelectTemplate} onAdd={onAddTemplate} onRemove={onRemoveTemplate} />
            <div style={{ marginTop:10, fontSize:12, color:'#94a3b8' }}>Active: <strong style={{ color:'#334155' }}>{selectedTemplateId === 'default' ? 'Default (customisable below)' : templates.find(t => t.id === selectedTemplateId)?.name || 'Unknown'}</strong></div>
          </div>
        )}

        {/* Default Design */}
        {activeTab === 'defaultDesign' && (
          <div>
            <div style={{ fontWeight:700, fontSize:15, marginBottom:16, fontFamily:"'Playfair Display',serif", color:'#1a1a2e' }}>🖌️ Customise Default Template</div>
            <p style={{ color:'#64748b', fontSize:13, marginBottom:20 }}>These settings apply when "Default" template is active. Change colours, fonts, titles and layout.</p>
            <DefaultTemplateEditor config={s.defaultTemplate || {}} onChange={cfg => setS(p => ({ ...p, defaultTemplate: cfg }))} />
          </div>
        )}

        {/* Item Types */}
        {activeTab === 'itemTypes' && (
          <div>
            <div style={{ fontWeight:700, fontSize:15, marginBottom:16, fontFamily:"'Playfair Display',serif", color:'#1a1a2e' }}>📋 Item Types</div>
            <p style={{ color:'#64748b', fontSize:13, marginBottom:16 }}>Customise the dropdown options for "Item Type" in invoices.</p>
            <div style={{ display:'flex', gap:8, marginBottom:14 }}>
              <input value={newType} onChange={e => setNewType(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItemType()} placeholder="Add new type…" style={{ flex:1, padding:'8px 12px', borderRadius:8, border:'1.5px solid #e2e8f0', fontSize:13, outline:'none', background:'#f8fafc' }} />
              <button onClick={addItemType} style={{ padding:'8px 16px', borderRadius:8, border:'none', background:'#1a1a2e', color:'#e2b96a', fontWeight:700, cursor:'pointer' }}>+ Add</button>
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {itemTypes.map(t => (
                <div key={t} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:20, background:'#f1f5f9', border:'1px solid #e2e8f0' }}>
                  <span style={{ fontSize:13, fontWeight:500, color:'#334155' }}>{t}</span>
                  <button onClick={() => removeItemType(t)} style={{ background:'transparent', border:'none', color:'#94a3b8', cursor:'pointer', fontSize:14, lineHeight:1, padding:0 }}>×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Email Columns */}
        {activeTab === 'emailCols' && (
          <div>
            <div style={{ fontWeight:700, fontSize:15, marginBottom:10, fontFamily:"'Playfair Display',serif", color:'#1a1a2e' }}>📧 Email Template Columns</div>
            <p style={{ color:'#64748b', fontSize:13, marginBottom:16 }}>Choose which data fields are included when sending invoices by email. You can also rename column labels.</p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {emailCols.map(col => (
                <div key={col.key} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:8, background:'#f8fafc', border:'1px solid #e2e8f0' }}>
                  <input type="checkbox" checked={col.enabled} onChange={() => toggleEmailCol(col.key)} style={{ cursor:'pointer' }} />
                  <input value={col.label} onChange={e => updateEmailColLabel(col.key, e.target.value)} style={{ flex:1, padding:'5px 10px', borderRadius:6, border:'1.5px solid #e2e8f0', fontSize:13, outline:'none', background:'#fff' }} />
                  <code style={{ fontSize:11, color:'#94a3b8', background:'#f1f5f9', padding:'3px 8px', borderRadius:6 }}>{`{{${col.key}}}`}</code>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Backup & Cloud */}
        {activeTab === 'backup' && (
          <div>
            <div style={{ fontWeight:700, fontSize:15, marginBottom:10, fontFamily:"'Playfair Display',serif", color:'#1a1a2e' }}>💾 Backup & Cloud Storage</div>
            <p style={{ color:'#64748b', fontSize:13, marginBottom:20 }}>Your data is saved locally in your browser. Use these options to back it up or move it to cloud storage.</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div style={{ border:'1px solid #e2e8f0', borderRadius:12, padding:18 }}>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:6 }}>📥 Export Backup</div>
                <div style={{ fontSize:13, color:'#64748b', marginBottom:12 }}>Download all your invoices and company data as a JSON file. Upload it to Google Drive, Dropbox, OneDrive, or any cloud storage.</div>
                <button onClick={exportToGoogleDrive} style={{ width:'100%', padding:'10px', borderRadius:8, border:'none', background:'#1a1a2e', color:'#e2b96a', fontWeight:700, cursor:'pointer' }}>⬇️ Download Backup</button>
              </div>
              <div style={{ border:'1px solid #e2e8f0', borderRadius:12, padding:18 }}>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:6 }}>📤 Import Backup</div>
                <div style={{ fontSize:13, color:'#64748b', marginBottom:12 }}>Restore your data from a previously exported backup file.</div>
                <label style={{ display:'block', width:'100%' }}>
                  <div style={{ padding:'10px', borderRadius:8, background:'#f1f5f9', color:'#334155', fontWeight:700, cursor:'pointer', textAlign:'center', fontSize:13 }}>📂 Choose Backup File</div>
                  <input type="file" accept=".json" onChange={importData} style={{ display:'none' }} />
                </label>
              </div>
              <div style={{ border:'1px solid #dbeafe', borderRadius:12, padding:18, background:'#eff6ff', gridColumn:'1/-1' }}>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:6, color:'#1d4ed8' }}>☁️ Google Drive / Dropbox / OneDrive</div>
                <div style={{ fontSize:13, color:'#3b82f6', lineHeight:1.7 }}>
                  <strong>Workflow:</strong> Click "Download Backup" above → Open Google Drive / Dropbox → Upload the .json file.<br />
                  To restore on another device: Download the .json from your cloud → Use "Import Backup" above.<br /><br />
                  <strong>Auto-sync:</strong> For automatic Google Drive sync, a backend server is required. This is available as an upgrade — contact us for a hosted version with full cloud sync.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop:16, display:'flex', justifyContent:'flex-end' }}>
        <button onClick={save} style={{ padding:'10px 26px', borderRadius:10, border:'none', background: saved ? '#16a34a' : '#1a1a2e', color: saved ? '#fff' : '#e2b96a', fontWeight:700, cursor:'pointer', fontSize:14, transition:'all 0.3s' }}>
          {saved ? '✅ Saved!' : '💾 Save Settings'}
        </button>
      </div>
    </div>
  )
}
