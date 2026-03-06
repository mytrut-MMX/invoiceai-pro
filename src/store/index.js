import { useState, useEffect, useCallback } from 'react'

const KEYS = {
  company: 'iai_company',
  invoices: 'iai_invoices',
  clients: 'iai_clients',
  products: 'iai_products',
  settings: 'iai_settings',
  template: 'iai_template',
}

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
  const [settings, setSettingsRaw] = useState(() => load(KEYS.settings, { emailjs_service: '', emailjs_template: '', emailjs_public: '', anthropic_key: '' }))
  const [templateImg, setTemplateImgRaw] = useState(() => load(KEYS.template, null))

  const setCompany = useCallback(v => { save(KEYS.company, v); setCompanyRaw(v) }, [])
  const setInvoices = useCallback(v => { const next = typeof v === 'function' ? v([]) : v; save(KEYS.invoices, next); setInvoicesRaw(next) }, [])
  const setClients = useCallback(v => { const next = typeof v === 'function' ? v([]) : v; save(KEYS.clients, next); setClientsRaw(next) }, [])
  const setProducts = useCallback(v => { const next = typeof v === 'function' ? v([]) : v; save(KEYS.products, next); setProductsRaw(next) }, [])
  const setSettings = useCallback(v => { const next = typeof v === 'function' ? v({}) : v; save(KEYS.settings, next); setSettingsRaw(next) }, [])
  const setTemplateImg = useCallback(v => { save(KEYS.template, v); setTemplateImgRaw(v) }, [])

  // Fix setInvoices/clients/products to handle functional updates properly
  const setInvoicesFn = useCallback(fn => {
    setInvoicesRaw(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn
      save(KEYS.invoices, next)
      return next
    })
  }, [])
  const setClientsFn = useCallback(fn => {
    setClientsRaw(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn
      save(KEYS.clients, next)
      return next
    })
  }, [])
  const setProductsFn = useCallback(fn => {
    setProductsRaw(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn
      save(KEYS.products, next)
      return next
    })
  }, [])
  const setSettingsFn = useCallback(fn => {
    setSettingsRaw(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn
      save(KEYS.settings, next)
      return next
    })
  }, [])

  const genId = () => Math.random().toString(36).slice(2, 9).toUpperCase()
  const today = () => new Date().toISOString().split('T')[0]
  const due = (days = 30) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().split('T')[0] }
  const nextInvoiceNum = () => {
    const year = new Date().getFullYear()
    const num = invoices.filter(i => i.number.includes(String(year))).length + 1
    return `INV-${year}-${String(num).padStart(4, '0')}`
  }

  return {
    company, setCompany,
    invoices, setInvoices: setInvoicesFn,
    clients, setClients: setClientsFn,
    products, setProducts: setProductsFn,
    settings, setSettings: setSettingsFn,
    templateImg, setTemplateImg,
    genId, today, due, nextInvoiceNum,
  }
}

export const fmt = (amount, currency = 'GBP') => {
  const symbols = { GBP: '£', USD: '$', EUR: '€', RON: 'RON ' }
  const sym = symbols[currency] || currency + ' '
  return sym + Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export const STATUS = {
  draft:   { label: 'Draft',    color: '#8b8b7a', bg: '#f0ede6' },
  sent:    { label: 'Sent',     color: '#2563eb', bg: '#dbeafe' },
  paid:    { label: 'Paid',     color: '#16a34a', bg: '#dcfce7' },
  overdue: { label: 'Overdue',  color: '#dc2626', bg: '#fee2e2' },
  partial: { label: 'Partial',  color: '#d97706', bg: '#fef3c7' },
}
