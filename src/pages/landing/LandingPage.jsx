import React from 'react';

const s = {
  nav: { position:'sticky', top:0, zIndex:100, background:'#0F172A', borderBottom:'1px solid #1E293B', padding:'0 2rem', display:'flex', alignItems:'center', justifyContent:'space-between', height:64 },
  logo: { fontSize:20, fontWeight:700, color:'#fff', letterSpacing:-0.5 },
  logoAccent: { color:'#0EA5E9' },
  navCta: { background:'#0EA5E9', color:'#fff', border:'none', borderRadius:8, padding:'8px 20px', fontWeight:600, fontSize:14, cursor:'pointer', textDecoration:'none' },
  hero: { background:'#0F172A', padding:'96px 2rem 80px', textAlign:'center' },
  heroTag: { display:'inline-block', background:'#1E293B', color:'#0EA5E9', borderRadius:99, padding:'4px 16px', fontSize:13, fontWeight:500, marginBottom:24 },
  heroH1: { fontSize:'clamp(2rem, 5vw, 3.5rem)', fontWeight:800, color:'#fff', lineHeight:1.15, marginBottom:20, letterSpacing:-1 },
  heroSub: { fontSize:18, color:'#94A3B8', maxWidth:560, margin:'0 auto 40px', lineHeight:1.6 },
  heroBtns: { display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' },
  btnPrimary: { background:'#0EA5E9', color:'#fff', border:'none', borderRadius:10, padding:'14px 32px', fontWeight:700, fontSize:16, cursor:'pointer', textDecoration:'none', display:'inline-block' },
  btnSecondary: { background:'transparent', color:'#fff', border:'1px solid #334155', borderRadius:10, padding:'14px 32px', fontWeight:600, fontSize:16, cursor:'pointer', textDecoration:'none', display:'inline-block' },
  section: { padding:'80px 2rem', maxWidth:1100, margin:'0 auto' },
  sectionLight: { background:'#F8FAFC' },
  sectionTitle: { fontSize:'clamp(1.5rem, 3vw, 2.25rem)', fontWeight:800, color:'#0F172A', textAlign:'center', marginBottom:12, letterSpacing:-0.5 },
  sectionSub: { fontSize:16, color:'#64748B', textAlign:'center', marginBottom:56, maxWidth:520, margin:'0 auto 56px' },
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:24 },
  card: { background:'#fff', border:'1px solid #E2E8F0', borderRadius:12, padding:'28px 24px' },
  cardIcon: { fontSize:32, marginBottom:16 },
  cardTitle: { fontSize:17, fontWeight:700, color:'#0F172A', marginBottom:8 },
  cardDesc: { fontSize:14, color:'#64748B', lineHeight:1.6 },
  steps: { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:32 },
  stepNum: { width:40, height:40, borderRadius:'50%', background:'#0EA5E9', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:18, marginBottom:16 },
  stepTitle: { fontSize:16, fontWeight:700, color:'#0F172A', marginBottom:8 },
  stepDesc: { fontSize:14, color:'#64748B', lineHeight:1.6 },
  pricingGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:24, maxWidth:700, margin:'0 auto' },
  pricingCard: { background:'#fff', border:'1px solid #E2E8F0', borderRadius:16, padding:'36px 32px' },
  pricingCardPro: { background:'#0F172A', border:'2px solid #0EA5E9', borderRadius:16, padding:'36px 32px' },
  pricingBadge: { display:'inline-block', background:'#0EA5E9', color:'#fff', borderRadius:99, padding:'3px 12px', fontSize:12, fontWeight:700, marginBottom:16 },
  pricingName: { fontSize:20, fontWeight:800, color:'#0F172A', marginBottom:8 },
  pricingNamePro: { fontSize:20, fontWeight:800, color:'#fff', marginBottom:8 },
  pricingPrice: { fontSize:42, fontWeight:800, color:'#0F172A', marginBottom:4 },
  pricingPricePro: { fontSize:42, fontWeight:800, color:'#0EA5E9', marginBottom:4 },
  pricingPer: { fontSize:14, color:'#64748B', marginBottom:24 },
  pricingPerPro: { fontSize:14, color:'#94A3B8', marginBottom:24 },
  pricingList: { listStyle:'none', padding:0, margin:'0 0 32px', display:'flex', flexDirection:'column', gap:12 },
  pricingItem: { fontSize:14, color:'#374151', display:'flex', alignItems:'center', gap:8 },
  pricingItemPro: { fontSize:14, color:'#CBD5E1', display:'flex', alignItems:'center', gap:8 },
  check: { color:'#0EA5E9', fontWeight:700 },
  cta: { background:'#0F172A', padding:'80px 2rem', textAlign:'center' },
  ctaH2: { fontSize:'clamp(1.5rem, 3vw, 2.25rem)', fontWeight:800, color:'#fff', marginBottom:16 },
  ctaSub: { fontSize:16, color:'#94A3B8', marginBottom:40 },
  footer: { background:'#020617', padding:'32px 2rem', textAlign:'center', color:'#475569', fontSize:14 },
};

const features = [
  { icon:'🧾', title:'Create Invoices', desc:'Professional invoices in seconds. Customize with your logo and branding.' },
  { icon:'📧', title:'Auto Email', desc:'Send invoices automatically to clients the moment they\'re ready.' },
  { icon:'💳', title:'Track Payments', desc:'Know exactly who has paid and who hasn\'t with real-time tracking.' },
  { icon:'🔁', title:'Recurring Invoices', desc:'Set up recurring billing and never forget to invoice a client again.' },
  { icon:'📊', title:'Analytics', desc:'Get insights into your revenue, outstanding payments, and growth.' },
  { icon:'⚡', title:'Fast & Simple', desc:'No learning curve. Start invoicing in minutes, not hours.' },
];

export default function LandingPage() {
  return (
    <div style={{ fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', margin:0 }}>

      {/* Nav */}
      <nav style={s.nav}>
        <div style={s.logo}>Invoice<span style={s.logoAccent}>Saga</span></div>
        <a href="/signup" style={s.navCta}>Get started free</a>
      </nav>

      {/* Hero */}
      <section style={s.hero}>
        <div style={s.heroTag}>✨ Free to start — no credit card required</div>
        <h1 style={s.heroH1}>The simplest way to<br />invoice clients &amp; get paid faster</h1>
        <p style={s.heroSub}>Create professional invoices, automate reminders, and track payments — all in one place. Built for freelancers, agencies, and small businesses.</p>
        <div style={s.heroBtns}>
          <a href="/signup" style={s.btnPrimary}>Start for free →</a>
          <a href="/signup" style={s.btnSecondary}>See how it works</a>
        </div>
      </section>

      {/* Features */}
      <div style={s.sectionLight}>
        <div style={s.section}>
          <h2 style={s.sectionTitle}>Everything you need to get paid</h2>
          <p style={s.sectionSub}>Powerful features that save you time and help you look professional.</p>
          <div style={s.grid}>
            {features.map((f, i) => (
              <div key={i} style={s.card}>
                <div style={s.cardIcon}>{f.icon}</div>
                <div style={s.cardTitle}>{f.title}</div>
                <div style={s.cardDesc}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div style={{ background:'#fff' }}>
        <div style={s.section}>
          <h2 style={s.sectionTitle}>Up and running in 3 steps</h2>
          <p style={s.sectionSub}>No setup headaches. You'll be sending invoices in under 5 minutes.</p>
          <div style={s.steps}>
            {[
              { n:1, title:'Create your account', desc:'Sign up free and set up your business profile in minutes.' },
              { n:2, title:'Add your clients', desc:'Import or add clients manually. We store everything securely.' },
              { n:3, title:'Send & get paid', desc:'Create an invoice, send it, and watch the payments come in.' },
            ].map((step) => (
              <div key={step.n}>
                <div style={s.stepNum}>{step.n}</div>
                <div style={s.stepTitle}>{step.title}</div>
                <div style={s.stepDesc}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div style={s.sectionLight}>
        <div style={s.section}>
          <h2 style={s.sectionTitle}>Simple, honest pricing</h2>
          <p style={s.sectionSub}>Start free, upgrade when you need more.</p>
          <div style={s.pricingGrid}>
            <div style={s.pricingCard}>
              <div style={s.pricingName}>Free</div>
              <div style={s.pricingPrice}>$0</div>
              <div style={s.pricingPer}>forever</div>
              <ul style={s.pricingList}>
                {['Up to 5 invoices/month','2 clients','Basic templates','Email support'].map((item, i) => (
                  <li key={i} style={s.pricingItem}><span style={s.check}>✓</span>{item}</li>
                ))}
              </ul>
              <a href="/signup" style={{ ...s.btnSecondary, border:'1px solid #E2E8F0', color:'#0F172A', display:'block', textAlign:'center' }}>Get started free</a>
            </div>
            <div style={s.pricingCardPro}>
              <div style={s.pricingBadge}>Most popular</div>
              <div style={s.pricingNamePro}>Pro</div>
              <div style={s.pricingPricePro}>$19</div>
              <div style={s.pricingPerPro}>per month</div>
              <ul style={s.pricingList}>
                {['Unlimited invoices','Unlimited clients','Recurring invoices','Auto email reminders','Analytics & reports','Priority support'].map((item, i) => (
                  <li key={i} style={s.pricingItemPro}><span style={s.check}>✓</span>{item}</li>
                ))}
              </ul>
              <a href="/signup" style={{ ...s.btnPrimary, display:'block', textAlign:'center' }}>Start free trial</a>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <section style={s.cta}>
        <h2 style={s.ctaH2}>Ready to get paid faster?</h2>
        <p style={s.ctaSub}>Join thousands of freelancers and businesses already using InvoiceSaga.</p>
        <a href="/signup" style={s.btnPrimary}>Create your free account →</a>
      </section>

      {/* Footer */}
      <footer style={s.footer}>
        <div style={{ marginBottom:8 }}>
          <span style={{ color:'#0EA5E9', fontWeight:700 }}>InvoiceSaga</span>
          {' · '}
          <a href="/privacy" style={{ color:'#475569' }}>Privacy</a>
          {' · '}
          <a href="/terms" style={{ color:'#475569' }}>Terms</a>
        </div>
        <div>© {new Date().getFullYear()} InvoiceSaga. All rights reserved.</div>
      </footer>

    </div>
  );
}
