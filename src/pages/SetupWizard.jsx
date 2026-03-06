import { useState } from 'react'

const STEPS = [
  { title: 'Company Details', icon: '🏢', fields: ['name', 'crn', 'vat', 'cis'] },
  { title: 'Contact & Address', icon: '📍', fields: ['address', 'city', 'postcode', 'country', 'email', 'phone', 'fax', 'website'] },
  { title: 'Invoice Settings', icon: '⚙️', fields: ['currency', 'tax_rate', 'payment_terms', 'bank_name', 'bank_account', 'bank_sort', 'bank_iban'] },
  { title: 'API & Email', icon: '🔌', fields: ['anthropic_key', 'emailjs_service', 'emailjs_template', 'emailjs_public'] },
]

const FIELD_CONFIG = {
  name:             { label: 'Company Name *',         placeholder: 'Acme Ltd', required: true },
  crn:              { label: 'Company Reg. No (CRN)',  placeholder: '12345678' },
  vat:              { label: 'VAT Number',             placeholder: 'GB123456789' },
  cis:              { label: 'CIS Number',             placeholder: 'CIS123456' },
  address:          { label: 'Street Address *',       placeholder: '123 Business Road', required: true },
  city:             { label: 'City *',                 placeholder: 'London', required: true },
  postcode:         { label: 'Postcode',               placeholder: 'EC1A 1BB' },
  country:          { label: 'Country',                placeholder: 'United Kingdom' },
  email:            { label: 'Email *',                placeholder: 'invoices@company.com', required: true, type: 'email' },
  phone:            { label: 'Phone',                  placeholder: '+44 20 1234 5678' },
  fax:              { label: 'Fax',                    placeholder: '+44 20 1234 5679' },
  website:          { label: 'Website',                placeholder: 'www.company.com' },
  currency:         { label: 'Default Currency',       type: 'select', options: ['GBP','USD','EUR','RON'] },
  tax_rate:         { label: 'Default Tax Rate (%)',   placeholder: '20', type: 'number' },
  payment_terms:    { label: 'Payment Terms (days)',   placeholder: '30', type: 'number' },
  bank_name:        { label: 'Bank Name',              placeholder: 'Barclays Business' },
  bank_account:     { label: 'Account Number',         placeholder: '12345678' },
  bank_sort:        { label: 'Sort Code',              placeholder: '20-00-00' },
  bank_iban:        { label: 'IBAN',                   placeholder: 'GB29 NWBK 6016 1331 9268 19' },
  anthropic_key:    { label: 'Anthropic API Key *',    placeholder: 'sk-ant-...', required: true, type: 'password', hint: 'Get yours at console.anthropic.com — needed for AI features' },
  emailjs_service:  { label: 'EmailJS Service ID',     placeholder: 'service_xxxxxx', hint: 'From emailjs.com dashboard → Email Services' },
  emailjs_template: { label: 'EmailJS Template ID',    placeholder: 'template_xxxxxx', hint: 'From emailjs.com → Email Templates' },
  emailjs_public:   { label: 'EmailJS Public Key',     placeholder: 'xxxxxxxxxxxxxxxxxxx', hint: 'From emailjs.com → Account → General' },
}

export default function SetupWizard({ onComplete }) {
  const [step, setStep] = useState(0)
  const [data, setData] = useState({ currency: 'GBP', tax_rate: '20', payment_terms: '30', country: 'United Kingdom' })
  const [errors, setErrors] = useState({})
  const [logoPreview, setLogoPreview] = useState(null)

  const set = (k, v) => { setData(d => ({ ...d, [k]: v })); setErrors(e => ({ ...e, [k]: false })) }

  const validate = () => {
    const errs = {}
    STEPS[step].fields.forEach(f => {
      if (FIELD_CONFIG[f]?.required && !data[f]?.trim()) errs[f] = true
    })
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const next = () => { if (validate()) setStep(s => s + 1) }
  const back = () => setStep(s => s - 1)

  const handleLogo = e => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { setLogoPreview(ev.target.result); set('logo', ev.target.result) }
    reader.readAsDataURL(file)
  }

  const finish = () => {
    if (!validate()) return
    onComplete({ ...data, logo: logoPreview || data.logo })
  }

  const currentStep = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        {/* Logo / Title */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 13, letterSpacing: '0.3em', color: '#e2b96a', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>Invoice AI Pro</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>Set Up Your<br/>Company Profile</h1>
          <p style={{ color: '#94a3b8', marginTop: 10, fontSize: 14 }}>Complete once — your data stays private in your browser</p>
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 32, justifyContent: 'center' }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                background: i < step ? '#e2b96a' : i === step ? '#fff' : '#ffffff22',
                color: i <= step ? '#1a1a2e' : '#ffffff66',
                fontWeight: 700, transition: 'all 0.3s',
              }}>{i < step ? '✓' : i + 1}</div>
              {i < STEPS.length - 1 && <div style={{ width: 40, height: 1, background: i < step ? '#e2b96a' : '#ffffff22' }} />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: 20, padding: 36, boxShadow: '0 32px 80px rgba(0,0,0,0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
            <span style={{ fontSize: 26 }}>{currentStep.icon}</span>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Step {step + 1} of {STEPS.length}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', fontFamily: "'Playfair Display', serif" }}>{currentStep.title}</div>
            </div>
          </div>

          {/* Logo upload on step 0 */}
          {step === 0 && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Company Logo</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', padding: '12px 16px', border: '2px dashed #e2e8f0', borderRadius: 10, transition: 'border-color 0.2s' }}>
                {logoPreview
                  ? <img src={logoPreview} alt="logo" style={{ height: 48, objectFit: 'contain', borderRadius: 6 }} />
                  : <div style={{ width: 48, height: 48, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🖼️</div>}
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#334155' }}>{logoPreview ? 'Change logo' : 'Upload your logo'}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>PNG, JPG, SVG — shown on all invoices</div>
                </div>
                <input type="file" accept="image/*" onChange={handleLogo} style={{ display: 'none' }} />
              </label>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: currentStep.fields.length > 4 ? '1fr 1fr' : '1fr', gap: '14px 16px' }}>
            {currentStep.fields.map(f => {
              const cfg = FIELD_CONFIG[f] || {}
              const err = errors[f]
              return (
                <div key={f} style={{ gridColumn: ['address','bank_iban','anthropic_key','emailjs_service','emailjs_template','emailjs_public'].includes(f) ? '1 / -1' : 'auto' }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: err ? '#dc2626' : '#64748b', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {cfg.label || f}
                  </label>
                  {cfg.type === 'select' ? (
                    <select value={data[f] || ''} onChange={e => set(f, e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${err ? '#dc2626' : '#e2e8f0'}`, background: '#f8fafc', fontSize: 14, outline: 'none', color: '#1e293b' }}>
                      {cfg.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      type={cfg.type || 'text'}
                      value={data[f] || ''}
                      onChange={e => set(f, e.target.value)}
                      placeholder={cfg.placeholder || ''}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${err ? '#dc2626' : '#e2e8f0'}`, background: '#f8fafc', fontSize: 14, outline: 'none', color: '#1e293b', fontFamily: 'inherit' }}
                    />
                  )}
                  {cfg.hint && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{cfg.hint}</div>}
                  {err && <div style={{ fontSize: 11, color: '#dc2626', marginTop: 3 }}>This field is required</div>}
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
            {step > 0 && (
              <button onClick={back} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'transparent', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                ← Back
              </button>
            )}
            <button onClick={isLast ? finish : next} style={{
              flex: 2, padding: '12px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #1a1a2e, #0f3460)',
              color: '#e2b96a', fontWeight: 700, cursor: 'pointer', fontSize: 14, letterSpacing: '0.05em',
            }}>
              {isLast ? '🚀 Launch My Dashboard' : 'Continue →'}
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#ffffff44' }}>
          All data stored locally in your browser — never sent to any server
        </div>
      </div>
    </div>
  )
}
