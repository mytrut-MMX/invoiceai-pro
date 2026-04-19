import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// SEC-005: apiKey prop removed — server-side ANTHROPIC_API_KEY used via /api/claude-proxy
export default function AIChat({ company, clients, products, invoices, expenses = [], bills = [], onCreateInvoice, onAction, onClose }) {
  const [aiConsent, setAiConsent] = useState(() =>
    localStorage.getItem('invoicesaga_ai_consent') === 'true'
  )
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: `Hello! I'm your Invoice AI assistant for **${company.name}**.\n\nI can help you:\n• Create invoices from natural language\n• Look up client history\n• Summarize outstanding payments\n• Draft invoice notes\n\nJust tell me what you need!`
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const outstanding = invoices.filter(i => ["Sent", "Partial"].includes(i.status))
  const overdue = invoices.filter(i => i.status === "Overdue")
  const draft = invoices.filter(i => i.status === "Draft")
  const paid = invoices.filter(i => i.status === "Paid")
  const sum = arr => arr.reduce((s, i) => s + Number(i.total || 0), 0).toFixed(2)

  const invoiceDetails = invoices.slice(0, 20).map(i => ({
    number: i.invoice_number,
    customer: i.customer?.name || i.customer?.company || "Unknown",
    status: i.status,
    total: Number(i.total || 0),
    issue_date: i.issue_date,
    due_date: i.due_date,
    payment_terms: i.payment_terms,
  }))

  const expensesByCategory = {}
  ;(expenses || []).forEach(e => {
    const cat = e.category || "Uncategorised"
    expensesByCategory[cat] = (expensesByCategory[cat] || 0) + Number(e.total || e.amount || 0)
  })
  const totalExpenses = Object.values(expensesByCategory).reduce((s, v) => s + v, 0)
  const unpaidExpenses = (expenses || []).filter(e => e.status === "Draft" || e.status === "Pending").length

  const unpaidBills = (bills || []).filter(b => !["Paid", "Void"].includes(b.status))
  const overdueBills = unpaidBills.filter(b => b.due_date && b.due_date < new Date().toISOString().slice(0, 10))
  const totalBillsDue = unpaidBills.reduce((s, b) => s + Number(b.total || 0), 0)

  const billDetails = unpaidBills.slice(0, 10).map(b => ({
    number: b.bill_number,
    supplier: b.supplier_name || "Unknown",
    status: b.status,
    total: Number(b.total || 0),
    due_date: b.due_date,
    cis_deduction: Number(b.cis_deduction || 0),
  }))

  const contextBlock = `BUSINESS SUMMARY:
- Outstanding invoices: ${outstanding.length} (£${sum(outstanding)})
- Overdue invoices: ${overdue.length} (£${sum(overdue)})
- Draft invoices: ${draft.length}
- Paid invoices (all time): ${paid.length} (£${sum(paid)})
- Unpaid bills: ${unpaidBills.length} (£${totalBillsDue.toFixed(2)})
- Overdue bills: ${overdueBills.length}
- Total expenses: £${totalExpenses.toFixed(2)}
- Active clients: ${(clients || []).length}
- Products/services: ${(products || []).length}
- VAT registered: ${company.vat ? "Yes" : "No"}
- CIS enabled: ${company.cis_enabled ? "Yes" : "No"}
- Business type: ${company.business_type}`

  const ukKnowledge = `UK ACCOUNTING KNOWLEDGE:
- VAT registration threshold: £90,000 turnover (from 1 April 2024). Deregistration threshold £88,000.
- Standard VAT rate 20%; reduced 5%; zero 0%. VAT returns typically quarterly, filed via MTD.
- Corporation Tax: 19% small profits rate (<£50k), 25% main rate (>£250k), marginal relief between £50k–£250k. Pay 9 months + 1 day after period end; file CT600 within 12 months.
- Self Assessment: file online by 31 January following tax year end (5 April); payments on account due 31 January and 31 July.
- CIS deduction rates: 20% for verified subcontractors, 30% for unverified, 0% for gross payment status. Monthly CIS300 return due by 19th.
- Standard payment terms: Net 14 / Net 30 most common; late payment interest = Bank of England base rate + 8% (Late Payment of Commercial Debts Act).`

  const systemPrompt = `You are a knowledgeable UK accounting assistant for ${company.name}, powered by InvoiceSaga.
You act as the user's personal bookkeeper — friendly, concise, and practical.

You can help with:
- Understanding their financial position (outstanding invoices, overdue payments, cash flow)
- UK tax questions (VAT, Corporation Tax, Self Assessment, CIS)
- Creating invoices from natural language descriptions
- HMRC deadline reminders
- Explaining accounting concepts in plain English
- Suggesting actions (chase overdue invoices, prepare for VAT return, etc.)

Rules:
- Always answer in the context of UK accounting law and HMRC rules
- Use the user's actual data to give personalized advice
- Be concise — max 3-4 short paragraphs per response
- If asked something outside accounting/invoicing, politely redirect
- Never make up data — if you don't have the information, say so
- Format currency as £X,XXX.XX
- When suggesting actions, be specific ("Invoice INV-042 is 15 days overdue — consider sending a reminder")

COMPANY: ${JSON.stringify({ name: company.name, currency: company.currency, vat: company.vat, tax_rate: company.tax_rate })}
CLIENTS: ${JSON.stringify(clients.slice(0, 30).map(c => ({ id: c.id, name: c.name || 'Unknown', company: c.company || null, type: c.type || null })))}
PRODUCTS/SERVICES: ${JSON.stringify(products.map(p => ({ id: p.id, name: p.name, unit: p.unit })))}

INVOICES (most recent 20):
${JSON.stringify(invoiceDetails)}

EXPENSES SUMMARY:
- Total expenses: £${totalExpenses.toFixed(2)} across ${(expenses || []).length} records
- Unpaid/draft: ${unpaidExpenses}
- By category: ${JSON.stringify(expensesByCategory)}

BILLS (unpaid, up to 10):
- Total bills due: £${totalBillsDue.toFixed(2)} across ${unpaidBills.length} bills
- Overdue bills: ${overdueBills.length}
${JSON.stringify(billDetails)}

${contextBlock}

${ukKnowledge}

When the user wants to create an invoice, respond with JSON:
{
  "action": "create_invoice",
  "message": "Your friendly response",
  "invoice": {
    "client_name": "", "client_company": "", "client_email": "",
    "items": [{"description": "", "qty": 1, "unit_price": 0, "unit": ""}],
    "tax_rate": ${company.tax_rate || 20},
    "currency": "${company.currency || 'GBP'}",
    "notes": ""
  }
}

For other queries, respond with JSON:
{ "action": "info", "message": "Your response in markdown" }

Always respond in valid JSON only, no text outside JSON.`

  const send = async () => {
    if (!input.trim() || loading) return
    const txt = input.trim()
    setInput('')
    setMessages(p => [...p, { role: 'user', content: txt }])
    setLoading(true)

    try {
      // SEC-005: Use server-side proxy (no client API key transmitted)
      // SEC-006: Send Supabase session token for server-side auth verification
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token
      if (!accessToken) throw new Error('Please sign in to use AI features.')

      const res = await fetch('/api/claude-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: systemPrompt,
          messages: messages.slice(-10).map(m => ({ role: m.role, content: m.content })).concat([{ role: 'user', content: txt }])
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const raw = data.content?.map(c => c.text || '').join('') || ''

      let parsed
      try { parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()) } catch { parsed = { action: 'info', message: raw } }

      if (parsed.action === 'create_invoice' && parsed.invoice) {
        onCreateInvoice(parsed.invoice)
        setMessages(p => [...p, { role: 'assistant', content: parsed.message + '\n\n✅ Invoice editor opened — review and save!' }])
      } else {
        setMessages(p => [...p, { role: 'assistant', content: parsed.message || raw }])
      }
    } catch (err) {
      setMessages(p => [...p, { role: 'assistant', content: `⚠️ ${err.message}` }])
    } finally {
      setLoading(false)
    }
  }

  const QUICK = [
    'What invoices are overdue?',
    'Which bills need paying?',
    'Expense breakdown this year',
    'Create invoice for new client',
    'Am I near the VAT threshold?',
  ]

  // SEC-010: AI data processing consent dialog (GDPR)
  if (!aiConsent) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        <div style={{ background: '#1a1a2e', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e2b96a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✨</div>
          <div>
            <div style={{ color: '#e2b96a', fontWeight: 700, fontSize: 13 }}>AI Assistant</div>
            <div style={{ color: '#64748b', fontSize: 11 }}>Data consent required</div>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 380, textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: 12 }}>AI Data Processing</div>
            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.7, margin: '0 0 8px' }}>
              InvoiceSaga's AI assistant processes some of your business data (client names, company names, and basic classification, invoice numbers, product names) through Anthropic's Claude API to provide helpful suggestions.
            </p>
            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.7, margin: '0 0 8px' }}>
              <strong>No email addresses are shared.</strong> Financial summaries and invoice totals are processed to provide personalized advice. Anthropic does not use your data for model training.
            </p>
            <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, margin: '0 0 20px' }}>
              By continuing, you consent to this data processing. You can revoke consent at any time in Settings.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              {onClose && <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>}
              <button onClick={() => { localStorage.setItem('invoicesaga_ai_consent', 'true'); setAiConsent(true) }}
                style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: '#1a1a2e', color: '#e2b96a', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                I understand, continue
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
      <div style={{ background: '#1a1a2e', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e2b96a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✨</div>
        <div>
          <div style={{ color: '#e2b96a', fontWeight: 700, fontSize: 13 }}>AI Assistant</div>
          <div style={{ color: '#64748b', fontSize: 11 }}>Powered by Claude</div>
        </div>
        <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: '#34d399' }} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '88%', padding: '10px 13px', borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              background: m.role === 'user' ? '#1a1a2e' : '#f8fafc',
              color: m.role === 'user' ? '#e2b96a' : '#334155',
              fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap',
              border: m.role === 'assistant' ? '1px solid #e2e8f0' : 'none',
            }}>
              {m.content.split('**').map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p)}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 4 }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#e2b96a', animation: `bounce 1s ease-in-out ${i*0.2}s infinite` }} />)}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div style={{ padding: '8px 12px', display: 'flex', gap: 5, flexWrap: 'wrap', borderTop: '1px solid #f1f5f9' }}>
        {QUICK.map(q => (
          <button key={q} onClick={() => setInput(q)} style={{ padding: '3px 10px', borderRadius: 20, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: 11, cursor: 'pointer' }}>{q}</button>
        ))}
      </div>

      <div style={{ padding: '10px 12px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask me anything about invoicing..."
          style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none', background: '#f8fafc' }} />
        <button onClick={send} disabled={loading || !input.trim()} style={{
          width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 16,
          background: loading || !input.trim() ? '#f1f5f9' : '#1a1a2e',
          color: loading || !input.trim() ? '#cbd5e1' : '#e2b96a',
        }}>→</button>
      </div>
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0);opacity:.4}50%{transform:translateY(-5px);opacity:1}}`}</style>
    </div>
  )
}
