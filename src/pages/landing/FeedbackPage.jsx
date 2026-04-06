import { useState } from 'react';
import SharedNav from '../../components/SharedNav';
import SharedFooter from '../../components/SharedFooter';

const s = {
  page: { background:'#FAFAF7', minHeight:'100vh', fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  hero: { background:'#F5F4F0', padding:'64px 2rem 48px', textAlign:'center', borderBottom:'1px solid #E8E6E0' },
  heroH1: { fontSize:'clamp(1.8rem, 4vw, 2.8rem)', fontWeight:400, color:'#111110', marginBottom:12, letterSpacing:-0.5, fontFamily:'Georgia, "Times New Roman", serif' },
  heroSub: { fontSize:16, color:'#6B6B6B', maxWidth:520, margin:'0 auto', lineHeight:1.6 },
  wrap: { maxWidth:900, margin:'0 auto', padding:'56px 2rem' },
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:32 },
  card: { background:'#fff', border:'1px solid #E8E6E0', borderRadius:16, padding:'32px 28px', boxShadow:'0 2px 24px rgba(0,0,0,0.06)' },
  cardTitle: { fontSize:18, fontWeight:700, color:'#0F172A', marginBottom:6 },
  cardSub: { fontSize:14, color:'#64748B', marginBottom:24, lineHeight:1.6 },
  label: { display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 },
  input: { width:'100%', padding:'10px 12px', border:'1.5px solid #E2E8F0', borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box', fontFamily:'inherit', color:'#0F172A', background:'#fff', transition:'border 0.15s' },
  textarea: { width:'100%', padding:'10px 12px', border:'1.5px solid #E2E8F0', borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box', fontFamily:'inherit', resize:'vertical', minHeight:140, color:'#0F172A', background:'#fff', transition:'border 0.15s' },
  select: { width:'100%', padding:'10px 12px', border:'1.5px solid #E2E8F0', borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box', fontFamily:'inherit', color:'#0F172A', background:'#fff', appearance:'none', cursor:'pointer' },
  btn: { width:'100%', padding:'12px', background:'#111110', color:'#FAFAF7', border:'none', borderRadius:8, fontSize:15, fontWeight:500, cursor:'pointer', marginTop:8, transition:'background 0.15s' },
  btnDisabled: { width:'100%', padding:'12px', background:'#6B6B6B', color:'#fff', border:'none', borderRadius:8, fontSize:15, fontWeight:500, cursor:'not-allowed', marginTop:8 },
  success: { background:'#ECFDF5', border:'1px solid #6EE7B7', borderRadius:10, padding:'24px 20px', textAlign:'center' },
  error: { background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#DC2626', marginBottom:12 },
  catRow: { display:'flex', alignItems:'flex-start', gap:12, marginBottom:18 },
  catIcon: { width:40, height:40, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:18, background:'#F5F4F0' },
  catLabel: { fontSize:13, fontWeight:600, color:'#374151', marginBottom:2 },
  catDesc: { fontSize:13, color:'#6B6B6B', lineHeight:1.5 },
  infoBox: { marginTop:24, padding:'16px', background:'#FEF3C7', borderRadius:10, border:'1px solid #FDE68A' },
};

const CATEGORIES = ['Feature Request', 'Bug Report', 'Complaint', 'Billing Issue', 'General Feedback'];

export default function FeedbackPage() {
  const [form, setForm] = useState({ name:'', email:'', category:'Feature Request', subject:'', message:'' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async () => {
    setError('');
    if (!form.email) { setError('Email is required.'); return; }
    if (!/\S+@\S+\.\S+/.test(form.email)) { setError('Please enter a valid email address.'); return; }
    if (!form.message || !form.message.trim()) { setError('Message is required.'); return; }
    if (form.message.length > 4000) { setError('Message is too long (max 4000 characters).'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/feedback-submit', {
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
      <SharedNav activePage="feedback" />

      <div style={s.hero}>
        <h1 style={s.heroH1}>We want to hear from you</h1>
        <p style={s.heroSub}>Something broken? Have an idea? Not happy with something? Tell us — we read and respond to every message.</p>
      </div>

      <div style={s.wrap}>
        <div style={s.grid}>

          {/* Left — How we handle feedback */}
          <div style={s.card}>
            <div style={s.cardTitle}>How we handle feedback</div>
            <div style={s.cardSub}>Every message is read by a real person. Here's what we can help with:</div>

            {[
              { icon:'💡', label:'Feature request', desc:'Got an idea? We build based on what users ask for.' },
              { icon:'🐛', label:'Bug report', desc:'Something broken? We\'ll fix it fast.' },
              { icon:'😤', label:'Complaint', desc:'Not happy? Tell us exactly what went wrong.' },
              { icon:'💬', label:'General', desc:'Anything else — we\'re listening.' },
            ].map(c => (
              <div key={c.label} style={s.catRow}>
                <div style={s.catIcon}>{c.icon}</div>
                <div>
                  <div style={s.catLabel}>{c.label}</div>
                  <div style={s.catDesc}>{c.desc}</div>
                </div>
              </div>
            ))}

            <div style={s.infoBox}>
              <div style={{ fontSize:13, fontWeight:600, color:'#92400E', marginBottom:4 }}>Response Time</div>
              <div style={{ fontSize:13, color:'#92400E', lineHeight:1.5 }}>
                We aim to respond within <strong>2 business days</strong>. For urgent billing issues contact{' '}
                <a href="mailto:support@invoicesaga.com" style={{ color:'#92400E', fontWeight:600 }}>support@invoicesaga.com</a> directly.
              </div>
            </div>
          </div>

          {/* Right — Form */}
          <div style={s.card}>
            <div style={s.cardTitle}>Send feedback</div>
            <div style={s.cardSub}>Fill in the form below and we'll get back to you.</div>

            {sent ? (
              <div style={s.success}>
                <div style={{ fontSize:32, marginBottom:10 }}>✅</div>
                <div style={{ fontSize:16, fontWeight:700, color:'#065F46', marginBottom:6 }}>Message received</div>
                <div style={{ fontSize:14, color:'#047857', lineHeight:1.6 }}>
                  Thank you, <strong>{form.name || 'friend'}</strong>. We'll be in touch within 2 business days.
                </div>
              </div>
            ) : (
              <div>
                {error && <div style={s.error}>{error}</div>}

                <div style={{ marginBottom:14 }}>
                  <label style={s.label}>Name <span style={{ color:'#9CA3AF', fontWeight:400 }}>(optional)</span></label>
                  <input style={s.input} placeholder="Your name (optional)" value={form.name} onChange={set('name')} />
                </div>

                <div style={{ marginBottom:14 }}>
                  <label style={s.label}>Email <span style={{ color:'#EF4444' }}>*</span></label>
                  <input style={s.input} type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} />
                </div>

                <div style={{ marginBottom:14 }}>
                  <label style={s.label}>Category <span style={{ color:'#EF4444' }}>*</span></label>
                  <div style={{ position:'relative' }}>
                    <select style={s.select} value={form.category} onChange={set('category')}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', color:'#9CA3AF', fontSize:12 }}>▼</span>
                  </div>
                </div>

                <div style={{ marginBottom:14 }}>
                  <label style={s.label}>Subject <span style={{ color:'#9CA3AF', fontWeight:400 }}>(optional)</span></label>
                  <input style={s.input} placeholder="Brief summary (optional)" value={form.subject} onChange={set('subject')} maxLength={200} />
                </div>

                <div style={{ marginBottom:16 }}>
                  <label style={s.label}>Message <span style={{ color:'#EF4444' }}>*</span></label>
                  <textarea style={s.textarea} placeholder="Tell us everything — the more detail the better" value={form.message} onChange={set('message')} maxLength={4000} />
                  <div style={{ fontSize:11, color:'#9CA3AF', textAlign:'right', marginTop:4 }}>{form.message.length}/4000</div>
                </div>

                <button onClick={handleSubmit} style={loading ? s.btnDisabled : s.btn} disabled={loading}>
                  {loading ? 'Sending…' : 'Send feedback →'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <SharedFooter links="full" />
    </div>
  );
}
