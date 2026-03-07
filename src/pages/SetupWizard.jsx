import { useState } from 'react'

const STEPS = [
  { title: 'Company Details', icon: '🏢' },
  { title: 'Contact & Address', icon: '📍' },
  { title: 'Industry & Tax', icon: '⚙️' },
  { title: 'Bank & Payment', icon: '🏦' },
  { title: 'API & Email', icon: '🔌' },
]

export default function SetupWizard({ onComplete }) {
  const [step, setStep] = useState(0)
  const [data, setData] = useState({
    currency: 'GBP', Corporation_tax_rate: '20', payment_terms: '30', country: 'United Kingdom',
    vat_registered: 'yes', cis_registered: 'no', cis_rate: '20',
  })
  const [errors, setErrors] = useState({})
  const [logoPreview, setLogoPreview] = useState(null)

  const set = (k, v) => { setData(d => ({ ...d, [k]: v })); setErrors(e => ({ ...e, [k]: false })) }

  const REQUIRED = [['name'], ['address', 'city', 'email'], [], [], ['anthropic_key']]

  const validate = () => {
    const errs = {}
    ;(REQUIRED[step] || []).forEach(f => { if (!data[f]?.trim()) errs[f] = true })
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const next = () => { if (validate()) setStep(s => s + 1) }
  const back = () => setStep(s => s - 1)

  const handleLogo = e => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { setLogoPreview(ev.target.result); set('logo', ev.target.result) }
    reader.readAsDataURL(file)
  }

  const finish = () => { if (validate()) onComplete({ ...data, logo: logoPreview || data.logo }) }

  const I = ({ k, label, placeholder, type = 'text', required, options }) => (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, color: errors[k] ? '#dc2626' : '#64748b', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}{required && ' *'}</label>
      {type === 'select'
        ? <select value={data[k] || ''} onChange={e => set(k, e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${errors[k] ? '#dc2626' : '#e2e8f0'}`, background: '#f8fafc', fontSize: 14, outline: 'none' }}>
            {(options || []).map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
          </select>
        : <input type={type} value={data[k] || ''} onChange={e => set(k, e.target.value)} placeholder={placeholder}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${errors[k] ? '#dc2626' : '#e2e8f0'}`, background: '#f8fafc', fontSize: 14, outline: 'none', fontFamily: 'inherit' }} />}
      {errors[k] && <div style={{ fontSize: 11, color: '#dc2626', marginTop: 3 }}>Required</div>}
    </div>
  )

  const YesNo = ({ k, label, hint }) => (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      <div style={{ display: 'flex', gap: 8 }}>
        {['yes', 'no'].map(v => (
          <button key={v} onClick={() => set(k, v)} style={{
            flex: 1, padding: '9px', borderRadius: 8, border: `1.5px solid ${data[k] === v ? '#1a1a2e' : '#e2e8f0'}`,
            background: data[k] === v ? '#1a1a2e' : '#f8fafc',
            color: data[k] === v ? '#e2b96a' : '#64748b', fontWeight: 700, cursor: 'pointer', fontSize: 13,
          }}>{v === 'yes' ? '✅ Yes' : '❌ No'}</button>
        ))}
      </div>
      {hint && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{hint}</div>}
    </div>
  )

  const renderStep = () => {
    if (step === 0) return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Logo */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', padding: '12px 14px', border: '2px dashed #e2e8f0', borderRadius: 10 }}>
          {logoPreview
            ? <img src={logoPreview} alt="logo" style={{ height: 44, objectFit: 'contain', borderRadius: 6 }} />
            : <div style={{ width: 44, height: 44, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🖼️</div>}
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#334155' }}>{logoPreview ? 'Change logo' : 'Upload company logo'}</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Shown on all invoices & quotes</div>
          </div>
          <input type="file" accept="image/*" onChange={handleLogo} style={{ display: 'none' }} />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <I k="name" label="Company Name" required placeholder="Acme Ltd" />
          <I k="crn" label="Company Reg. No (CRN)" placeholder="12345678" />
        </div>
      </div>
    )

    if (step === 1) return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <I k="email" label="Email" required placeholder="invoices@company.com" type="email" />
        <I k="phone" label="Phone" placeholder="+44 20 1234 5678" />
        <I k="fax" label="Fax" placeholder="+44 20 1234 5679" />
        <I k="website" label="Website" placeholder="www.company.com" />
        <div style={{ gridColumn: '1/-1' }}><I k="address" label="Street Address" required placeholder="123 Business Road" /></div>
        <I k="city" label="City" required placeholder="London" />
        <I k="postcode" label="Postcode" placeholder="EC1A 1BB" />
        <I k="country" label="Country" placeholder="United Kingdom" />
      </div>
    )

    if (step === 2) return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <I k="currency" label="Default Currency" type="select" options={['GBP','USD','EUR','RON']} />
          <I k="payment_terms" label="Payment Terms (days)" placeholder="30" type="number" />
        </div>

        <YesNo k="vat_registered" label="Is your company registered for VAT?" hint="If yes, VAT will be applied to invoices" />

        {data.vat_registered === 'yes' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, padding: '14px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0' }}>
            <I k="vat" label="VAT Number" placeholder="GB123456789" />
            <I k="tax_rate" label="VAT Rate (%)" placeholder="20" type="number" />
          </div>
        )}

        <YesNo k="cis_registered" label="Does your company operate under CIS (Construction Industry Scheme)?" hint="UK Construction Industry Scheme — applies CIS deduction to labour items" />

        {data.cis_registered === 'yes' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, padding: '14px', background: '#fefce8', borderRadius: 10, border: '1px solid #fde68a' }}>
            <I k="cis" label="CIS Number" placeholder="CIS123456" />
            <I k="cis_rate" label="CIS Deduction Rate (%)" placeholder="20" type="number" />
          </div>
        )}
      </div>
    )

    if (step === 3) return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <I k="bank_name" label="Bank Name" placeholder="Barclays Business" />
        <I k="bank_account" label="Account Number" placeholder="12345678" />
        <I k="bank_sort" label="Sort Code" placeholder="20-00-00" />
        <I k="bank_iban" label="IBAN" placeholder="GB29 NWBK 6016 1331 9268 19" />
      </div>
    )

    if (step === 4) return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: errors.anthropic_key ? '#dc2626' : '#64748b', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Anthropic API Key *</label>
          <input type="password" value={data.anthropic_key || ''} onChange={e => set('anthropic_key', e.target.value)} placeholder="sk-ant-..."
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${errors.anthropic_key ? '#dc2626' : '#e2e8f0'}`, background: '#f8fafc', fontSize: 14, outline: 'none', fontFamily: 'inherit' }} />
          {errors.anthropic_key && <div style={{ fontSize: 11, color: '#dc2626', marginTop: 3 }}>Required for AI features</div>}
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Get yours free at <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{ color: '#6366f1' }}>console.anthropic.com</a></div>
        </div>
        <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14, border: '1px solid #e2e8f0' }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#334155', marginBottom: 10 }}>✉️ EmailJS (optional — for sending invoices by email)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <I k="emailjs_service" label="Service ID" placeholder="service_xxxxxx" />
            <I k="emailjs_template" label="Template ID" placeholder="template_xxxxxx" />
            <div style={{ gridColumn: '1/-1' }}><I k="emailjs_public" label="Public Key" placeholder="xxxxxxxxxxxxxxxxxxx" type="password" /></div>
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Set up at <a href="https://emailjs.com" target="_blank" rel="noreferrer" style={{ color: '#6366f1' }}>emailjs.com</a> — free plan: 200 emails/month</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 580 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 12, letterSpacing: '0.3em', color: '#e2b96a', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>Invoice AI Pro</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 34, fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>Set Up Your<br/>Company Profile</h1>
          <p style={{ color: '#64748b', marginTop: 10, fontSize: 13 }}>Complete once — your data stays private in your browser</p>
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 28, justifyContent: 'center' }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, background: i < step ? '#e2b96a' : i === step ? '#fff' : '#ffffff22', color: i <= step ? '#1a1a2e' : '#ffffff55', fontWeight: 700, transition: 'all 0.3s' }}>
                {i < step ? '✓' : i + 1}
              </div>
              {i < STEPS.length - 1 && <div style={{ width: 28, height: 1, background: i < step ? '#e2b96a' : '#ffffff22' }} />}
            </div>
          ))}
        </div>

        <div style={{ background: '#fff', borderRadius: 20, padding: 32, boxShadow: '0 32px 80px rgba(0,0,0,0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <span style={{ fontSize: 24 }}>{STEPS[step].icon}</span>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Step {step + 1} of {STEPS.length}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e', fontFamily: "'Playfair Display', serif" }}>{STEPS[step].title}</div>
            </div>
          </div>

          {renderStep()}

          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            {step > 0 && (
              <button onClick={back} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'transparent', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>← Back</button>
            )}
            <button onClick={step === STEPS.length - 1 ? finish : next} style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', color: '#e2b96a', fontWeight: 700, cursor: 'pointer', fontSize: 14, letterSpacing: '0.05em' }}>
              {step === STEPS.length - 1 ? '🚀 Launch My Dashboard' : 'Continue →'}
            </button>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 11, color: '#ffffff33' }}>All data stored locally — never sent to any server</div>
      </div>
    </div>
  )
}
