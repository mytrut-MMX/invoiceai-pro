import { useState, useRef, useEffect } from 'react'

export default function AIChat({ company, clients, products, invoices, onCreateInvoice, onAction, apiKey }) {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: `Hello! I'm your Invoice AI assistant for **${company.name}**.\n\nI can help you:\n• Create invoices from natural language\n• Look up client history\n• Summarize outstanding payments\n• Draft invoice notes\n\nJust tell me what you need!`
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const systemPrompt = `You are an AI invoice assistant for ${company.name}.

COMPANY: ${JSON.stringify({ name: company.name, email: company.email, currency: company.currency, vat: company.vat, tax_rate: company.tax_rate })}
CLIENTS: ${JSON.stringify(clients.map(c => ({ id: c.id, name: c.name, email: c.email })))}
PRODUCTS/SERVICES: ${JSON.stringify(products.map(p => ({ id: p.id, name: p.name, price: p.price, unit: p.unit })))}
RECENT INVOICES: ${JSON.stringify(invoices.slice(0, 10).map(i => ({ number: i.number, client: i.client_name, total: i.total, status: i.status, date: i.date })))}

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
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          system: systemPrompt,
          messages: [{ role: 'user', content: txt }]
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

  const QUICK = ['Create invoice for new client', 'Show overdue invoices', 'Total outstanding amount', 'Draft payment reminder']

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
