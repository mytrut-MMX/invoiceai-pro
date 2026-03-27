import { useState } from 'react'
import { validateUkCrn } from '../utils/helpers'

const STEPS = [
  { title: 'Company Details' },
  { title: 'Contact & Address' },
  { title: 'Industry & Tax' },
  { title: 'Bank & Payment' },
  { title: 'Integrations' },
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

  // SEC-005: anthropic_key removed from required — server-side ANTHROPIC_API_KEY env var is used
  const REQUIRED = [['name'], ['address', 'city', 'email'], [], [], []]

  const validate = () => {
    const errs = {}
    ;(REQUIRED[step] || []).forEach(f => { if (!data[f]?.trim()) errs[f] = true })
    if (step === 0 && data.crn && !validateUkCrn(data.crn)) errs.crn = true
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const next = () => { if (validate()) setStep(s => s + 1) }
  const back = () => setStep(s => s - 1)

  const handleLogo = e => {
    const file = e.target.files[0]; if (!file) return
    // XSS-004: Validate MIME type is an image
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = ev => {
      const result = ev.target.result
      if (typeof result === 'string' && result.startsWith('data:image/')) {
        setLogoPreview(result); set('logo', result)
      }
    }
    reader.readAsDataURL(file)
  }

  const finish = () => { if (validate()) onComplete({ ...data, logo: logoPreview || data.logo }) }

  const I = ({ k, label, placeholder, type = 'text', required, options }) => (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, color: errors[k] ? '#dc2626' : '#64748b', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}{required && ' *'}</label>
      {type === 'select'
        ? <select value={data[k] || ''} onChange={e => set(k, e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${errors[k] ? '#dc2626' : '#e2e8f0'}`, background: '#FFFFFF', fontSize: 14, outline: 'none' }}>
            {(options || []).map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
          </select>
        : <input type={type} value={data[k] || ''} onChange={e => set(k, e.target.value)} placeholder={placeholder}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${errors[k] ? '#dc2626' : '#e2e8f0'}`, background: '#FFFFFF', fontSize: 14, outline: 'none', fontFamily: 'inherit' }} />}
      {errors[k] && <div style={{ fontSize: 11, color: '#dc2626', marginTop: 3 }}>Required</div>}
    </div>
  )

  const YesNo = ({ k, label, hint }) => (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      <div style={{ display: 'flex', gap: 8 }}>
        {['yes', 'no'].map(v => (
          <button key={v} onClick={() => set(k, v)} style={{
            flex: 1, padding: '9px', borderRadius: 8,
            background: data[k] === v ? '#111110' : '#FAFAF7',
            color: data[k] === v ? '#FAFAF7' : '#6B6B6B',
            border: `1.5px solid ${data[k] === v ? '#111110' : '#E8E6E0'}`,
            fontWeight: 700, cursor: 'pointer', fontSize: 13,
          }}>{v === 'yes' ? 'Yes' : 'No'}</button>
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
            : <div style={{ width: 44, height: 44, borderRadius: 8, background: '#F5F4F0', border: '1px solid #E8E6E0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9A9A9A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              </div>}
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#334155' }}>{logoPreview ? 'Change logo' : 'Upload company logo'}</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Shown on all invoices & quotes</div>
          </div>
          <input type="file" accept="image/*" onChange={handleLogo} style={{ display: 'none' }} />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <I k="name" label="Company Name" required placeholder="Acme Ltd" />
          <I k="crn" label="Company Reg. No (CRN)" placeholder="12345678 or SC123456" />
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
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#15803d' }}>
          — <strong>AI features</strong> are powered by the server-configured Anthropic key — no setup needed here.
        </div>
        <div style={{ background: '#FAFAF7', borderRadius: 8, padding: 16, border: '1px solid #E8E6E0' }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#334155', marginBottom: 10 }}>EmailJS (optional — for sending invoices by email)</div>
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
    <div style={{ minHeight: '100vh', background: '#FAFAF7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 580 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 400, color: '#111110', lineHeight: 1.2, margin: '0 0 8px' }}>Set up your company</h1>
          <p style={{ color: '#6B6B6B', marginTop: 0, fontSize: 13 }}>Complete once — your data stays private in your browser</p>
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 28, justifyContent: 'center' }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, background: i < step ? '#111110' : i === step ? '#111110' : '#E8E6E0', color: i <= step ? '#FAFAF7' : '#9A9A9A', fontWeight: 700, transition: 'all 0.3s' }}>
                {i < step ? '✓' : i + 1}
              </div>
              {i < STEPS.length - 1 && <div style={{ width: 28, height: 1, background: i < step ? '#111110' : '#E8E6E0' }} />}
            </div>
          ))}
        </div>

        <div style={{ background: '#FFFFFF', borderRadius: 12, padding: 32, border: '1px solid #E8E6E0', boxShadow: '0 2px 24px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 11, color: '#9A9A9A', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Step {step + 1} of {STEPS.length}</div>
              <div style={{ fontSize: 17, fontWeight: 400, color: '#111110', fontFamily: 'Georgia, serif' }}>{STEPS[step].title}</div>
            </div>
          </div>

          {renderStep()}

          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            {step > 0 && (
              <button onClick={back} style={{ flex: 1, padding: '11px', borderRadius: 8, border: '1.5px solid #E8E6E0', background: 'transparent', color: '#6B6B6B', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>← Back</button>
            )}
            <button onClick={step === STEPS.length - 1 ? finish : next} style={{ flex: 2, padding: '11px', borderRadius: 8, border: 'none', background: '#111110', color: '#FAFAF7', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
              {step === STEPS.length - 1 ? 'Launch dashboard →' : 'Continue →'}
            </button>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 11, color: '#9A9A9A' }}>All data stored locally — never sent to any server</div>
      </div>
    </div>
  )
}
