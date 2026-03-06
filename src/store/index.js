import { useState, useCallback } from 'react'

const KEYS = {
  company: 'iai_company',
  invoices: 'iai_invoices',
  clients: 'iai_clients',
  products: 'iai_products',
  settings: 'iai_settings',
  templates: 'iai_templates',
  selectedTemplate: 'iai_selected_template',
}

const DEFAULT_ITEM_TYPES = ['Labour', 'Materials', 'Equipment', 'Subcontractor', 'Consultancy', 'Travel', 'Other']

const DEFAULT_EMAIL_COLUMNS = [
  { key: 'number',       label: 'Invoice Number', enabled: true },
  { key: 'date',         label: 'Issue Date',      enabled: true },
  { key: 'due_date',     label: 'Due Date',        enabled: true },
  { key: 'client_name',  label: 'Client Name',     enabled: true },
  { key: 'total',        label: 'Total Amount',    enabled: true },
  { key: 'status',       label: 'Status',          enabled: true },
  { key: 'po_number',    label: 'PO Number',       enabled: false },
  { key: 'notes',        label: 'Notes',           enabled: false },
]

const load = (key, def) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def } catch { return def }
}
const save = (key, val) => {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

export const useStore = () => {
  const [company, setCompanyRaw] = useState(() => load(KEYS.company, null))
  const [invoices, setInvoicesRaw] = useState(() => load(KEYS.invoices, []))
  const [clients, setClientsRaw] = useState(() => load(KEYS.clients, []))
  const [products, setProductsRaw] = useState(() => load(KEYS.products, []))
  const [settings, setSettingsRaw] = useState(() => load(KEYS.settings, {
    emailjs_service: '', emailjs_template: '', emailjs_public: '', anthropic_key: '',
    itemTypes: DEFAULT_ITEM_TYPES,
    emailColumns: DEFAULT_EMAIL_COLUMNS,
    defaultTemplate: {
      primaryColor: '#1a1a2e',
      accentColor: '#e2b96a',
      textColor: '#1e293b',
      mutedColor: '#64748b',
      fontFamily: 'DM Sans',
      headerStyle: 'dark',
      showBorder: true,
      borderColor: '#e2e8f0',
      logoPosition: 'left',
      invoiceTitle: 'INVOICE',
      quoteTitle: 'QUOTE',
    }
  }))
  const [templates, setTemplatesRaw] = useState(() => load(KEYS.templates, []))
  const [selectedTemplateId, setSelectedTemplateIdRaw] = useState(() => load(KEYS.selectedTemplate, 'default'))

  const setCompany = useCallback(v => { save(KEYS.company, v); setCompanyRaw(v) }, [])
  const setInvoices = useCallback(fn => {
    setInvoicesRaw(prev => { const next = typeof fn === 'function' ? fn(prev) : fn; save(KEYS.invoices, next); return next })
  }, [])
  const setClients = useCallback(fn => {
    setClientsRaw(prev => { const next = typeof fn === 'function' ? fn(prev) : fn; save(KEYS.clients, next); return next })
  }, [])
  const setProducts = useCallback(fn => {
    setProductsRaw(prev => { const next = typeof fn === 'function' ? fn(prev) : fn; save(KEYS.products, next); return next })
  }, [])
  const setSettings = useCallback(fn => {
    setSettingsRaw(prev => { const next = typeof fn === 'function' ? fn(prev) : fn; save(KEYS.settings, next); return next })
  }, [])
  const setTemplates = useCallback(fn => {
    setTemplatesRaw(prev => { const next = typeof fn === 'function' ? fn(prev) : fn; save(KEYS.templates, next); return next })
  }, [])
  const setSelectedTemplateId = useCallback(v => { save(KEYS.selectedTemplate, v); setSelectedTemplateIdRaw(v) }, [])

  const genId = () => Math.random().toString(36).slice(2, 9).toUpperCase()
  const today = () => new Date().toISOString().split('T')[0]
  const dueFromDate = (fromDate, days) => {
    const d = new Date(fromDate || new Date())
    d.setDate(d.getDate() + Number(days || 30))
    return d.toISOString().split('T')[0]
  }
  const nextInvoiceNum = (type = 'invoice') => {
    const year = new Date().getFullYear()
    const prefix = type === 'quote' ? 'QUO' : 'INV'
    const relevant = invoices.filter(i => i.number?.startsWith(prefix) && i.number?.includes(String(year)))
    return `${prefix}-${year}-${String(relevant.length + 1).padStart(4, '0')}`
  }

  const selectedTemplate = selectedTemplateId === 'default'
    ? { id: 'default' }
    : (templates.find(t => t.id === selectedTemplateId) || { id: 'default' })

  // Helper: get item types from settings
  const getItemTypes = () => settings.itemTypes || DEFAULT_ITEM_TYPES
  const getEmailColumns = () => settings.emailColumns || DEFAULT_EMAIL_COLUMNS

  return {
    company, setCompany,
    invoices, setInvoices,
    clients, setClients,
    products, setProducts,
    settings, setSettings,
    templates, setTemplates,
    selectedTemplateId, setSelectedTemplateId,
    selectedTemplate,
    genId, today, dueFromDate, nextInvoiceNum,
    getItemTypes, getEmailColumns,
  }
}

export const fmt = (amount, currency = 'GBP') => {
  const symbols = { GBP: '£', USD: '$', EUR: '€', RON: 'RON ' }
  const sym = symbols[currency] || (currency + ' ')
  return sym + Number(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export const STATUS = {
  draft:   { label: 'Draft',    color: '#8b8b7a', bg: '#f0ede6' },
  sent:    { label: 'Sent',     color: '#2563eb', bg: '#dbeafe' },
  paid:    { label: 'Paid',     color: '#16a34a', bg: '#dcfce7' },
  overdue: { label: 'Overdue',  color: '#dc2626', bg: '#fee2e2' },
  partial: { label: 'Partial',  color: '#d97706', bg: '#fef3c7' },
}

export { DEFAULT_ITEM_TYPES, DEFAULT_EMAIL_COLUMNS }
