import { useState } from 'react'
import { fmt, STATUS } from '../store/index.js'
import InvoiceEditor from '../components/InvoiceEditor.jsx'
import { InvoiceRenderer, exportWithConfig, BUILT_IN_THEMES } from '../components/TemplateDesigner.jsx'
import TemplateDesigner from '../components/TemplateDesigner.jsx'
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
  const {
    company, invoices, setInvoices, clients, setClients,
    products, setProducts, settings, setSettings,
    genId, today, dueFromDate, nextInvoiceNum,
  } = store

  const [page, setPage] = useState('dashboard')
  const [showEditor, setShowEditor] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState(null)
  const [previewInvoice, setPreviewInvoice] = useState(null)
  const [showAI, setShowAI] = useState(false)
  const [aiDraft, setAiDraft] = useState(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [defaultDocType, setDefaultDocType] = useState('invoice')
  const [showTemplateDesigner, setShowTemplateDesigner] = useState(false)
  const [editorAsPage, setEditorAsPage] = useState(false)
  const [editorReturnPage, setEditorReturnPage] = useState('dashboard')
  
  // Active template config — stored in settings
  const templateConfig = settings.invoiceTemplateConfig || BUILT_IN_THEMES[0].config

  const allInvoicesList = invoices.filter(i => i.doc_type !== 'quote')
  const allQuotesList   = invoices.filter(i => i.doc_type === 'quote')
  const totalPaid    = allInvoicesList.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0)
  const totalDue     = allInvoicesList.filter(i => ['sent','partial'].includes(i.status)).reduce((s, i) => s + (i.total || 0), 0)
  const totalOverdue = allInvoicesList.filter(i => i.status === 'overdue').reduce((s, i) => s + (i.total || 0), 0)
  const thisMonth    = allInvoicesList.filter(i => i.date?.startsWith(new Date().toISOString().slice(0,7)))

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
      const newInv = { id: genId(), number: nextInvoiceNum(data.doc_type), date: today(), due_date: dueFromDate(today(), company.payment_terms), ...data, ...totals }
      setInvoices(prev => [newInv, ...prev])
    }
    setShowEditor(false); setEditingInvoice(null); setAiDraft(null); setEditorAsPage(false); setPage(editorReturnPage)
  }

  const deleteDoc = id => { if (confirm('Delete this document?')) setInvoices(prev => prev.filter(i => i.id !== id)) }

  const sendEmail = async (invoice) => {
    if (!settings.emailjs_service || !settings.emailjs_public) { alert('Configure EmailJS in Settings first.'); return }
    try {
      const emailjs = await import('@emailjs/browser')
      await emailjs.default.send(settings.emailjs_service, settings.emailjs_template, {
        to_email: invoice.client_email, to_name: invoice.client_name, from_name: company.name,
        invoice_number: invoice.number, amount: fmt(invoice.total, invoice.currency || company.currency),
        due_date: invoice.due_date, company_email: company.email,
      }, settings.emailjs_public)
      setInvoices(prev => prev.map(i => i.id === invoice.id ? { ...i, status: 'sent', sent_at: today() } : i))
      alert(`✅ ${invoice.doc_type === 'quote' ? 'Quote' : 'Invoice'} ${invoice.number} sent to ${invoice.client_email}`)
    } catch (err) { alert('Email error: ' + err.message) }
  }

  const openNew = (docType = 'invoice') => {
    setDefaultDocType(docType)
    setEditingInvoice(null)
    setAiDraft(null)
    setEditorReturnPage(page)
    const shouldOpenAsPage = docType === 'quote'
    setEditorAsPage(shouldOpenAsPage)
    if (shouldOpenAsPage) setPage('quote-editor')
    setShowEditor(true)
  }
  const openEdit = inv => { setEditingInvoice(inv); setAiDraft(null); setEditorReturnPage(page); setEditorAsPage(false); setShowEditor(true) }
  const openAIDraft = draft => { setAiDraft(draft); setEditingInvoice(null); setEditorReturnPage(page); setEditorAsPage(false); setShowEditor(true); setShowAI(false) }

  const filteredDocs = (docType) => invoices.filter(inv => {
    const matchType = inv.doc_type === docType || (!inv.doc_type && docType === 'invoice')
    const matchSearch = !search || inv.number?.toLowerCase().includes(search.toLowerCase()) || inv.client_name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || inv.status === filterStatus
    return matchType && matchSearch && matchStatus
  })

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'DM Sans', sans-serif", background: '#f7f4ef' }}>

      {/* Sidebar */}
      <div style={{ width: 220, background: '#1a1a2e', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100 }}>
        <div style={{ padding: '22px 20px 16px' }}>
          {company.logo
            ? <img src={company.logo} alt="" style={{ height: 34, objectFit: 'contain', marginBottom: 4 }} />
            : <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, fontWeight: 900, color: '#e2b96a' }}>{company.name}</div>}
          <div style={{ fontSize: 10, color: '#334155', marginTop: 3 }}>Invoice Management</div>
        </div>
        <nav style={{ flex: 1, padding: '0 10px' }}>
          {NAV.map(n => {
            const activePage = page === 'quote-editor' ? 'quotes' : page
            return (
            <button key={n.id} onClick={() => setPage(n.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', marginBottom: 2, textAlign: 'left', background: activePage === n.id ? '#e2b96a15' : 'transparent', color: activePage === n.id ? '#e2b96a' : '#94a3b8', fontWeight: activePage === n.id ? 700 : 400, fontSize: 14, borderLeft: activePage === n.id ? '3px solid #e2b96a' : '3px solid transparent' }}>
              <span style={{ fontSize: 15 }}>{n.icon}</span>{n.label}
              {n.id === 'invoices' && allInvoicesList.filter(i => i.status === 'overdue').length > 0 && <span style={{ marginLeft: 'auto', background: '#dc2626', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>{allInvoicesList.filter(i => i.status === 'overdue').length}</span>}
            </button>
            )
          })} 
        </nav>
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button onClick={() => setShowTemplateDesigner(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2b96a44', cursor: 'pointer', background: 'transparent', color: '#e2b96a', fontWeight: 700, fontSize: 12 }}>🎨 Template Designer</button>
          <button onClick={() => setShowAI(!showAI)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #33415544', cursor: 'pointer', background: showAI ? '#e2b96a22' : 'transparent', color: '#94a3b8', fontWeight: 600, fontSize: 12 }}>✨ AI Assistant</button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ marginLeft: 220, flex: 1, padding: 28, minHeight: '100vh', paddingRight: showAI ? 360 : 28 }}>

        {page === 'dashboard' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 26 }}>
              <div>
                <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, fontWeight: 900, color: '#1a1a2e' }}>
                  Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'} 👋
                </h1>
                <div style={{ color: '#64748b', marginTop: 2 }}>{company.name} — Financial Overview</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => openNew('quote')} style={{ padding: '9px 16px', borderRadius: 10, border: '1.5px solid #1a1a2e', background: 'transparent', color: '#1a1a2e', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>+ New Quote</button>
                <button onClick={() => openNew('invoice')} style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: '#1a1a2e', color: '#e2b96a', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>+ New Invoice</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
              {[
                { label: 'Total Paid', value: fmt(totalPaid, company.currency), icon: '✅', color: '#16a34a', bg: '#dcfce7' },
                { label: 'Outstanding', value: fmt(totalDue, company.currency), icon: '📤', color: '#2563eb', bg: '#dbeafe' },
                { label: 'Overdue', value: fmt(totalOverdue, company.currency), icon: '⚠️', color: '#dc2626', bg: '#fee2e2' },
                { label: 'This Month', value: `${thisMonth.length} invoices`, icon: '📅', color: '#7c3aed', bg: '#ede9fe' },
              ].map(s => (
                <div key={s.label} style={{ background: '#fff', borderRadius: 14, padding: 18, border: '1px solid #f1f5f9', borderTop: `3px solid ${s.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>{s.label}</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                    </div>
                    <div style={{ width: 38, height: 38, borderRadius: 9, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{s.icon}</div>
                  </div>
                </div>
              ))}
            </div>
            {/* Template preview strip */}
            <div style={{ background: '#fff', borderRadius: 14, padding: '14px 20px', border: '1px solid #f1f5f9', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: templateConfig.headerBg || '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🎨</div>
                <div>
                  <div style={{ fontWeight: 700, color: '#1a1a2e', fontSize: 13 }}>Active Template: <span style={{ color: templateConfig.accentColor || '#e2b96a' }}>{BUILT_IN_THEMES.find(t => t.id === templateConfig._themeId)?.name || 'Noir Executive'}</span></div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>Applied to all invoices & quotes</div>
                </div>
              </div>
              <button onClick={() => setShowTemplateDesigner(true)} style={{ padding: '7px 14px', borderRadius: 8, border: '1.5px solid #e2b96a', background: 'transparent', color: '#1a1a2e', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>Edit Template →</button>
            </div>
            <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a2e', fontFamily: "'Playfair Display',serif" }}>Recent Invoices</div>
                <button onClick={() => setPage('invoices')} style={{ fontSize: 13, color: '#2563eb', background: 'transparent', border: 'none', cursor: 'pointer' }}>View all →</button>
              </div>
              <DocTable docs={allInvoicesList.slice(0, 6)} company={company} onEdit={openEdit} onPreview={setPreviewInvoice} onDelete={deleteDoc} onEmail={sendEmail} onStatusChange={(id, st) => setInvoices(p => p.map(i => i.id === id ? { ...i, status: st } : i))} />
            </div>
          </div>
        )}

        {page === 'invoices' && (
          <PageWithDocs title="Invoices" docs={filteredDocs('invoice')} company={company} search={search} setSearch={setSearch} filterStatus={filterStatus} setFilterStatus={setFilterStatus} onNew={() => openNew('invoice')} onEdit={openEdit} onPreview={setPreviewInvoice} onDelete={deleteDoc} onEmail={sendEmail} setInvoices={setInvoices} newLabel="Invoice" />
        )}

        {page === 'quotes' && (
          <PageWithDocs title="Quotes" docs={filteredDocs('quote')} company={company} search={search} setSearch={setSearch} filterStatus={filterStatus} setFilterStatus={setFilterStatus} onNew={() => openNew('quote')} onEdit={openEdit} onPreview={setPreviewInvoice} onDelete={deleteDoc} onEmail={sendEmail} setInvoices={setInvoices} newLabel="Quote" />
        )}

        
         {page === 'quote-editor' && showEditor && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 900, color: '#1a1a2e', margin: 0 }}>New Quote</h1>
              <button
                onClick={() => { setShowEditor(false); setEditingInvoice(null); setAiDraft(null); setEditorAsPage(false); setPage(editorReturnPage) }}
                style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #33415533', background: '#fff', color: '#334155', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
              >
                ← Back
              </button>
            </div>
            <InvoiceEditor
              asPage
              invoice={null}
              clients={clients}
              products={products}
              company={company}
              onSave={saveInvoice}
              onClose={() => { setShowEditor(false); setEditingInvoice(null); setAiDraft(null); setEditorAsPage(false); setPage(editorReturnPage) }}
            />
          </div>
        )}
        
        {page === 'clients' && <ClientsPage clients={clients} setClients={setClients} genId={genId} invoices={invoices} company={company} />}
        {page === 'products' && <ProductsPage products={products} setProducts={setProducts} genId={genId} company={company} />}
        {page === 'settings' && <SettingsPage company={company} settings={settings} setSettings={setSettings} onOpenDesigner={() => setShowTemplateDesigner(true)} templateConfig={templateConfig} />}
      </div>

      {/* AI Panel */}
      {showAI && (
        <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 340, zIndex: 200, padding: 14, background: '#f7f4ef', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>✨ AI Assistant</div>
            <button onClick={() => setShowAI(false)} style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>×</button>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {/* SEC-005: apiKey prop removed — AIChat uses server-side key via /api/claude-proxy */}
            <AIChat company={company} clients={clients} products={products} invoices={invoices} onCreateInvoice={openAIDraft} />
          </div>
        </div>
      )}

      {/* Invoice Editor */}
      {showEditor && !editorAsPage && (
        <InvoiceEditor
          invoice={editingInvoice
            ? { ...editingInvoice }
            : aiDraft
              ? { number: nextInvoiceNum(aiDraft.doc_type || defaultDocType), date: today(), due_date: dueFromDate(today(), company.payment_terms), status: 'draft', doc_type: defaultDocType, currency: company.currency, tax_rate: company.vat_registered === 'yes' ? (Number(company.tax_rate) || 20) : 0, ...aiDraft }
              : null}
          clients={clients} products={products} company={company}
          onSave={saveInvoice}
          onClose={() => { setShowEditor(false); setEditingInvoice(null); setAiDraft(null); setEditorAsPage(false); setPage(editorReturnPage) }}
        />
      )}

      {/* Preview Modal */}
      {previewInvoice && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(8,8,18,0.95)', zIndex: 1100, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={() => window.print()} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #334155', background: '#1e1e2e', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>🖨️ Print</button>
            <button onClick={() => exportWithConfig(previewInvoice, company, templateConfig)} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#e2b96a', color: '#0f0f1a', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>📥 Save PDF</button>
            <button onClick={() => sendEmail(previewInvoice)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>✉️ Send Email</button>
            <button onClick={() => { setPreviewInvoice(null); setShowTemplateDesigner(true) }} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2b96a55', background: 'transparent', color: '#e2b96a', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>🎨 Change Template</button>
            <button onClick={() => setPreviewInvoice(null)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: 13 }}>✕ Close</button>
          </div>
          <div style={{ boxShadow: '0 40px 100px rgba(0,0,0,0.7)' }}>
            <InvoiceRenderer invoice={previewInvoice} company={company} config={templateConfig} />
          </div>
        </div>
      )}

      {/* Template Designer */}
      {showTemplateDesigner && (
        <TemplateDesigner
          company={company}
          invoices={invoices}
          initialConfig={templateConfig}
          onSave={(config) => {
            setSettings(prev => ({ ...prev, invoiceTemplateConfig: config }))
            setShowTemplateDesigner(false)
          }}
          onClose={() => setShowTemplateDesigner(false)}
        />
      )}
    </div>
  )
}

// ── Shared doc list page ──────────────────────────────────────────────────────
function PageWithDocs({ title, docs, company, search, setSearch, filterStatus, setFilterStatus, onNew, onEdit, onPreview, onDelete, onEmail, setInvoices, newLabel }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 900, color: '#1a1a2e' }}>{title}</h1>
        <button onClick={onNew} style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: '#1a1a2e', color: '#e2b96a', fontWeight: 700, cursor: 'pointer' }}>+ New {newLabel}</button>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${title.toLowerCase()}…`} style={{ flex: 1, padding: '9px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: 13, outline: 'none' }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: 13, outline: 'none' }}>
          <option value="all">All Status</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
        <DocTable docs={docs} company={company} onEdit={onEdit} onPreview={onPreview} onDelete={onDelete} onEmail={onEmail} onStatusChange={(id, st) => setInvoices(p => p.map(i => i.id === id ? { ...i, status: st } : i))} />
        {docs.length === 0 && <div style={{ padding: '60px 0', textAlign: 'center', color: '#94a3b8' }}>No {title.toLowerCase()} found</div>}
      </div>
    </div>
  )
}

function DocTable({ docs, company, onEdit, onPreview, onDelete, onEmail, onStatusChange }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
          {['Number', 'Type', 'Client', 'Date', 'Due', 'Amount', 'Status', 'Actions'].map(h => (
            <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Amount' ? 'right' : 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {docs.map(inv => {
          const sc = STATUS[inv.status] || STATUS.draft
          const isOverdue = inv.status !== 'paid' && inv.due_date && new Date(inv.due_date) < new Date()
          return (
            <tr key={inv.id} style={{ borderBottom: '1px solid #f8fafc' }}
              onMouseEnter={e => e.currentTarget.style.background='#fafaf8'}
              onMouseLeave={e => e.currentTarget.style.background='#fff'}>
              <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1a1a2e', fontSize: 13 }}>{inv.number}</td>
              <td style={{ padding: '10px 12px' }}>
                <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: inv.doc_type === 'quote' ? '#ede9fe' : '#f0fdf4', color: inv.doc_type === 'quote' ? '#7c3aed' : '#16a34a' }}>
                  {inv.doc_type === 'quote' ? 'QUOTE' : 'INVOICE'}
                </span>
              </td>
              <td style={{ padding: '10px 12px', fontSize: 13 }}>
                <div style={{ fontWeight: 500 }}>{inv.client_name || '—'}</div>
                {inv.client_company && <div style={{ fontSize: 11, color: '#94a3b8' }}>{inv.client_company}</div>}
              </td>
              <td style={{ padding: '10px 12px', fontSize: 13, color: '#64748b' }}>{inv.date}</td>
              <td style={{ padding: '10px 12px', fontSize: 13, color: isOverdue ? '#dc2626' : '#64748b', fontWeight: isOverdue ? 700 : 400 }}>{inv.due_date}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, fontSize: 14 }}>{fmt(inv.total || 0, inv.currency || company.currency)}</td>
              <td style={{ padding: '10px 12px' }}>
                <select value={inv.status} onChange={e => onStatusChange(inv.id, e.target.value)}
                  style={{ padding: '3px 8px', borderRadius: 20, border: 'none', background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </td>
              <td style={{ padding: '10px 12px' }}>
                <div style={{ display: 'flex', gap: 3 }}>
                  {[['👁', () => onPreview(inv), '#f1f5f9', '#334155'], ['✏️', () => onEdit(inv), '#f1f5f9', '#334155'], ['✉️', () => onEmail(inv), '#dbeafe', '#2563eb'], ['🗑', () => onDelete(inv.id), '#fee2e2', '#dc2626']].map(([icon, fn, bg, color]) => (
                    <button key={icon} onClick={fn} style={{ width: 27, height: 27, borderRadius: 6, border: 'none', background: bg, color, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</button>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 22 }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 900, color: '#1a1a2e' }}>Clients</h1>
        <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm({ name: '', contact: '', email: '', phone: '', address: '', vat: '' }) }} style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: '#1a1a2e', color: '#e2b96a', fontWeight: 700, cursor: 'pointer' }}>+ Add Client</button>
      </div>
      {showForm && (
        <div style={{ background: '#fff', borderRadius: 14, padding: 22, border: '1px solid #e2e8f0', marginBottom: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, fontFamily: "'Playfair Display',serif", color: '#1a1a2e' }}>{editing ? 'Edit' : 'New'} Client</div>
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
            <button onClick={save} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#1a1a2e', color: '#e2b96a', fontWeight: 700, cursor: 'pointer' }}>{editing ? 'Save' : 'Add Client'}</button>
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 14 }}>
        {clients.map(c => {
          const cInv = invoices.filter(i => i.client_email === c.email || i.client_company === c.name)
          const cPaid = cInv.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0)
          return (
            <div key={c.id} style={{ background: '#fff', borderRadius: 14, padding: 18, border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#334155' }}>{c.name?.[0]?.toUpperCase() || '?'}</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => { setForm(c); setEditing(c.id); setShowForm(true) }} style={{ width: 27, height: 27, borderRadius: 6, border: 'none', background: '#f1f5f9', cursor: 'pointer', fontSize: 12 }}>✏️</button>
                  <button onClick={() => { if (confirm('Delete?')) setClients(p => p.filter(cl => cl.id !== c.id)) }} style={{ width: 27, height: 27, borderRadius: 6, border: 'none', background: '#fee2e2', cursor: 'pointer', fontSize: 12 }}>🗑</button>
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>{c.name}</div>
              {c.contact && <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>{c.contact}</div>}
              {c.email && <div style={{ fontSize: 12, color: '#2563eb', marginTop: 2 }}>{c.email}</div>}
              {c.vat && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>VAT: {c.vat}</div>}
              <div style={{ display: 'flex', gap: 12, marginTop: 12, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                <div><div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Docs</div><div style={{ fontWeight: 700, color: '#334155' }}>{cInv.length}</div></div>
                <div><div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Paid</div><div style={{ fontWeight: 700, color: '#16a34a' }}>{fmt(cPaid, company.currency)}</div></div>
              </div>
            </div>
          )
        })}
        {clients.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>No clients yet</div>}
      </div>
    </div>
  )
}

function ProductsPage({ products, setProducts, genId, company }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', price: '', unit: 'hrs', category: '', sku: '' })
  const [editing, setEditing] = useState(null)

  const save = () => {
    if (!form.name || !form.price) return alert('Name and price required')
    if (editing) setProducts(p => p.map(pr => pr.id === editing ? { ...pr, ...form, price: Number(form.price) } : pr))
    else setProducts(p => [...p, { id: genId(), ...form, price: Number(form.price) }])
    setForm({ name: '', description: '', price: '', unit: 'hrs', category: '', sku: '' }); setShowForm(false); setEditing(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 22 }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 900, color: '#1a1a2e' }}>Products & Services</h1>
        <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm({ name: '', description: '', price: '', unit: 'hrs', category: '', sku: '' }) }} style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: '#1a1a2e', color: '#e2b96a', fontWeight: 700, cursor: 'pointer' }}>+ Add Product</button>
      </div>
      {showForm && (
        <div style={{ background: '#fff', borderRadius: 14, padding: 22, border: '1px solid #e2e8f0', marginBottom: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 12 }}>
            {[['Name *', 'name'], ['Price *', 'price', 'number'], ['Unit', 'unit'], ['Category', 'category'], ['SKU', 'sku']].map(([l, k, t]) => (
              <div key={k}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l}</label>
                <input type={t || 'text'} value={form[k] || ''} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none', background: '#f8fafc' }} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</label>
            <textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', background: '#f8fafc' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14, justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowForm(false); setEditing(null) }} style={{ padding: '9px 18px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: 'transparent', color: '#64748b', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
            <button onClick={save} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#1a1a2e', color: '#e2b96a', fontWeight: 700, cursor: 'pointer' }}>{editing ? 'Save' : 'Add'}</button>
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 14 }}>
        {products.map(p => (
          <div key={p.id} style={{ background: '#fff', borderRadius: 14, padding: 18, border: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{p.category || 'Service'}</div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => { setForm({ ...p, price: String(p.price) }); setEditing(p.id); setShowForm(true) }} style={{ width: 25, height: 25, borderRadius: 6, border: 'none', background: '#f1f5f9', cursor: 'pointer', fontSize: 11 }}>✏️</button>
                <button onClick={() => { if (confirm('Delete?')) setProducts(pr => pr.filter(x => x.id !== p.id)) }} style={{ width: 25, height: 25, borderRadius: 6, border: 'none', background: '#fee2e2', cursor: 'pointer', fontSize: 11 }}>🗑</button>
              </div>
            </div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>{p.name}</div>
            {p.description && <div style={{ fontSize: 12, color: '#64748b', marginTop: 3, lineHeight: 1.5 }}>{p.description}</div>}
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 17 }}>{fmt(p.price, company.currency)}</div>
              {p.unit && <div style={{ fontSize: 11, color: '#94a3b8', background: '#f1f5f9', padding: '2px 8px', borderRadius: 20 }}>/{p.unit}</div>}
            </div>
          </div>
        ))}
        {products.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>No products yet</div>}
      </div>
    </div>
  )
}

function SettingsPage({ company, settings, setSettings, onOpenDesigner, templateConfig }) {
  const [s, setS] = useState(settings)
  const [saved, setSaved] = useState(false)
  const save = () => { setSettings(s); setSaved(true); setTimeout(() => setSaved(false), 2000) }

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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: 22, border: '1px solid #f1f5f9' }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, fontFamily: "'Playfair Display',serif", color: '#1a1a2e' }}>✉️ EmailJS</div>
          <F label="Service ID" k="emailjs_service" placeholder="service_xxxxxx" />
          <F label="Template ID" k="emailjs_template" placeholder="template_xxxxxx" />
          <F label="Public Key" k="emailjs_public" placeholder="xxxxxxxxxxxxxxxxxxx" type="password" />
        </div>
        <div style={{ background: '#fff', borderRadius: 14, padding: 22, border: '1px solid #f1f5f9' }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, fontFamily: "'Playfair Display',serif", color: '#1a1a2e' }}>✨ AI (Anthropic)</div>
          {/* SEC-005: API key configured server-side via ANTHROPIC_API_KEY env var */}
          <div style={{ fontSize: 13, color: '#64748b', padding: '8px 0' }}>AI features use the server-configured Anthropic key. No client-side key required.</div>
        </div>

        {/* Template Designer Card */}
        <div style={{ background: '#1a1a2e', borderRadius: 14, padding: 22, border: '1px solid #334155', gridColumn: '1/-1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, fontFamily: "'Playfair Display',serif", color: '#e2b96a' }}>🎨 Invoice Template Designer</div>
              <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
                Choose from 5 professional themes · Customise colours, fonts, layout · Live preview · PDF export
              </div>
              <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                {[templateConfig?.headerBg, templateConfig?.accentColor, templateConfig?.tableHeadBg, templateConfig?.totalBoxBg].filter(Boolean).map((col, i) => (
                  <div key={i} style={{ width: 20, height: 20, borderRadius: 4, background: col, border: '1px solid #334155' }} />
                ))}
                <span style={{ fontSize: 12, color: '#475569', marginLeft: 4, alignSelf: 'center' }}>Current palette</span>
              </div>
            </div>
            <button onClick={onOpenDesigner} style={{ padding: '12px 24px', borderRadius: 10, border: 'none', background: '#e2b96a', color: '#1a1a2e', fontWeight: 700, cursor: 'pointer', fontSize: 14, whiteSpace: 'nowrap' }}>Open Designer →</button>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={save} style={{ padding: '11px 28px', borderRadius: 10, border: 'none', background: saved ? '#16a34a' : '#1a1a2e', color: saved ? '#fff' : '#e2b96a', fontWeight: 700, cursor: 'pointer', fontSize: 14, transition: 'all 0.3s' }}>
          {saved ? '✅ Saved!' : '💾 Save Settings'}
        </button>
      </div>
    </div>
  )
}
