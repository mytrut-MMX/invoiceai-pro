import { useState } from 'react';

const s = {
  nav: { position:'sticky', top:0, zIndex:100, background:'#FAFAF7', borderBottom:'1px solid #E8E6E0', padding:'0 2rem', display:'flex', alignItems:'center', justifyContent:'space-between', height:60 },
  logo: { fontSize:20, fontWeight:700, color:'#111110', letterSpacing:-0.5, textDecoration:'none' },
  logoAccent: { color:'#D97706' },
  navCta: { background:'#111110', color:'#FAFAF7', border:'none', borderRadius:6, padding:'7px 18px', fontWeight:500, fontSize:13, cursor:'pointer', textDecoration:'none' },
  page: { background:'#FAFAF7', minHeight:'100vh', fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  hero: { background:'#F5F4F0', padding:'64px 2rem 56px', textAlign:'center', borderBottom:'1px solid #E8E6E0' },
  heroH1: { fontSize:'clamp(1.8rem, 4vw, 2.8rem)', fontWeight:400, color:'#111110', marginBottom:12, letterSpacing:-0.5, fontFamily:'Georgia, "Times New Roman", serif' },
  heroSub: { fontSize:16, color:'#6B6B6B', maxWidth:480, margin:'0 auto' },
  wrap: { maxWidth:900, margin:'0 auto', padding:'56px 2rem' },
  grid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:32 },
  card: { background:'#fff', border:'1px solid #E2E8F0', borderRadius:16, padding:'32px 28px' },
  cardTitle: { fontSize:18, fontWeight:700, color:'#0F172A', marginBottom:6 },
  cardSub: { fontSize:14, color:'#64748B', marginBottom:24, lineHeight:1.6 },
  emailLink: { display:'inline-flex', alignItems:'center', gap:8, color:'#D97706', fontWeight:600, fontSize:15, textDecoration:'none' },
  label: { display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 },
  input: { width:'100%', padding:'10px 12px', border:'1.5px solid #E2E8F0', borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box', fontFamily:'inherit', color:'#0F172A', background:'#fff', transition:'border 0.15s' },
  textarea: { width:'100%', padding:'10px 12px', border:'1.5px solid #E2E8F0', borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box', fontFamily:'inherit', resize:'vertical', minHeight:130, color:'#0F172A', background:'#fff', transition:'border 0.15s' },
  select: { width:'100%', padding:'10px 12px', border:'1.5px solid #E2E8F0', borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box', fontFamily:'inherit', color:'#0F172A', background:'#fff', appearance:'none', cursor:'pointer' },
  btn: { width:'100%', padding:'12px', background:'#111110', color:'#fff', border:'none', borderRadius:8, fontSize:15, fontWeight:700, cursor:'pointer', marginTop:8, transition:'background 0.15s' },
  btnDisabled: { width:'100%', padding:'12px', background:'#6B6B6B', color:'#fff', border:'none', borderRadius:8, fontSize:15, fontWeight:700, cursor:'not-allowed', marginTop:8 },
  success: { background:'#ECFDF5', border:'1px solid #6EE7B7', borderRadius:10, padding:'16px 20px', textAlign:'center' },
  error: { background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#DC2626', marginBottom:12 },
  infoRow: { display:'flex', alignItems:'flex-start', gap:12, marginBottom:20 },
  infoIcon: { width:40, height:40, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:18 },
  infoText: { flex:1 },
  infoLabel: { fontSize:13, fontWeight:600, color:'#374151', marginBottom:2 },
  infoValue: { fontSize:14, color:'#D97706', fontWeight:500 },
  footer: { background:'#0A0A09', padding:'32px 2rem', textAlign:'center', color:'#6B6B6B', fontSize:14, borderTop:'1px solid #1C1C1B' },
};

const SUBJECTS = ['General Inquiry', 'Feedback', 'Bug Report', 'Complaint', 'Billing', 'Other'];

export default function ContactPage() {
  const [form, setForm] = useState({ name:'', email:'', subject:'General Inquiry', message:'' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.message) { setError('Email and message are required.'); return; }
    if (!/\S+@\S+\.\S+/.test(form.email)) { setError('Please enter a valid email address.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/contact-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      {/* Nav */}
      <nav style={s.nav}>
        <a href="/" style={{ ...s.logo, textDecoration:'none' }}>Invoice<span style={s.logoAccent}>Saga</span></a>
        <div style={{ display:'flex', alignItems:'center', gap:24 }}>
          <a href="/templates" style={{ color:'#94A3B8', fontSize:14, fontWeight:500, textDecoration:'none' }}>Offline Generator</a>
          <a href="/signup" style={s.navCta}>Get started free</a>
        </div>
      </nav>

      {/* Hero */}
      <div style={s.hero}>
        <h1 style={s.heroH1}>Get in touch</h1>
        <p style={s.heroSub}>We're here to help. Send us a message and we'll respond as soon as possible.</p>
      </div>

      <div style={s.wrap}>
        <div style={s.grid}>

          {/* Contact info */}
          <div style={s.card}>
            <div style={s.cardTitle}>Contact Information</div>
            <div style={s.cardSub}>Reach out directly or use the form. We typically respond within 24 hours on business days.</div>

            <div style={s.infoRow}>
              <div style={{ ...s.infoIcon, background:'#EFF6FF' }}>✉️</div>
              <div style={s.infoText}>
                <div style={s.infoLabel}>Support & General</div>
                <a href="mailto:support@invoicesaga.com" style={s.emailLink}>support@invoicesaga.com</a>
              </div>
            </div>

            <div style={s.infoRow}>
              <div style={{ ...s.infoIcon, background:'#FEF3C7' }}>💬</div>
              <div style={s.infoText}>
                <div style={s.infoLabel}>Feedback & Suggestions</div>
                <a href="mailto:support@invoicesaga.com?subject=Feedback" style={s.emailLink}>support@invoicesaga.com</a>
              </div>
            </div>

            <div style={s.infoRow}>
              <div style={{ ...s.infoIcon, background:'#FEE2E2' }}>🚨</div>
              <div style={s.infoText}>
                <div style={s.infoLabel}>Complaints & Billing</div>
                <a href="mailto:support@invoicesaga.com?subject=Complaint" style={s.emailLink}>support@invoicesaga.com</a>
              </div>
            </div>

            <div style={{ marginTop:32, padding:'16px', background:'#FEF3C7', borderRadius:10, border:'1px solid #FDE68A' }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#92400E', marginBottom:4 }}>Response Time</div>
              <div style={{ fontSize:13, color:'#92400E' }}>We aim to respond to all messages within <strong>24 hours</strong> on business days (Mon–Fri).</div>
            </div>
          </div>

          {/* Contact form */}
          <div style={s.card}>
            <div style={s.cardTitle}>Send a Message</div>
            <div style={s.cardSub}>Fill in the form below and we'll get back to you.</div>

            {sent ? (
              <div style={s.success}>
                <div style={{ fontSize:32, marginBottom:10 }}>✅</div>
                <div style={{ fontSize:16, fontWeight:700, color:'#065F46', marginBottom:6 }}>Message sent!</div>
                <div style={{ fontSize:14, color:'#047857' }}>Thank you for reaching out. We'll reply to <strong>{form.email}</strong> as soon as possible.</div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {error && <div style={s.error}>{error}</div>}

                <div style={{ marginBottom:14 }}>
                  <label style={s.label}>Name <span style={{ color:'#9CA3AF', fontWeight:400 }}>(optional)</span></label>
                  <input style={s.input} placeholder="Your name" value={form.name} onChange={set('name')} />
                </div>

                <div style={{ marginBottom:14 }}>
                  <label style={s.label}>Email <span style={{ color:'#EF4444' }}>*</span></label>
                  <input style={s.input} type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
                </div>

                <div style={{ marginBottom:14 }}>
                  <label style={s.label}>Subject</label>
                  <div style={{ position:'relative' }}>
                    <select style={s.select} value={form.subject} onChange={set('subject')}>
                      {SUBJECTS.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                    </select>
                    <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', color:'#9CA3AF', fontSize:12 }}>▼</span>
                  </div>
                </div>

                <div style={{ marginBottom:16 }}>
                  <label style={s.label}>Message <span style={{ color:'#EF4444' }}>*</span></label>
                  <textarea style={s.textarea} placeholder="Tell us how we can help…" value={form.message} onChange={set('message')} required />
                </div>

                <button type="submit" style={loading ? s.btnDisabled : s.btn} disabled={loading}>
                  {loading ? 'Sending…' : 'Send Message →'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={s.footer}>
        <div style={{ marginBottom:8 }}>
          <span style={{ color:'#D97706', fontWeight:700 }}>InvoiceSaga</span>
          {' · '}
          <a href="/contact" style={{ color:'#475569' }}>Contact</a>
          {' · '}
          <a href="/privacy" style={{ color:'#475569' }}>Privacy Policy</a>
          {' · '}
          <a href="/terms" style={{ color:'#475569' }}>Terms of Service</a>
          {' · '}
          <a href="/cookies" style={{ color:'#475569' }}>Cookie Policy</a>
          {' · '}
          <a href="/gdpr" style={{ color:'#475569' }}>GDPR</a>
        </div>
        <div>© {new Date().getFullYear()} InvoiceSaga. All rights reserved.</div>
      </footer>
    </div>
  );
}
