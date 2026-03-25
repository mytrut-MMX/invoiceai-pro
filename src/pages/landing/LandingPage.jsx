import React from 'react';
import { Icons } from '../../components/icons';

const s = {
  nav: { position:'sticky', top:0, zIndex:100, background:'#FAFAF7', borderBottom:'1px solid #E8E6E0', padding:'0 2rem', display:'flex', alignItems:'center', justifyContent:'space-between', height:60 },
  logo: { fontSize:20, fontWeight:700, color:'#111110', letterSpacing:-0.5 },
  logoAccent: { color:'#D97706' },
  navCta: { background:'#111110', color:'#FAFAF7', border:'none', borderRadius:6, padding:'7px 18px', fontWeight:500, fontSize:13, cursor:'pointer', textDecoration:'none' },
  hero: { background:'#FAFAF7', padding:'120px 2rem 100px', textAlign:'center' },
  heroTag: { display:'inline-block', background:'#FEF3C7', color:'#92400E', borderRadius:4, padding:'4px 12px', fontSize:12, fontWeight:500, marginBottom:24, letterSpacing:'0.04em' },
  heroH1: { fontSize:'clamp(2.4rem, 5vw, 4rem)', fontWeight:400, color:'#111110', lineHeight:1.1, marginBottom:20, letterSpacing:-1, fontFamily:'Georgia, "Times New Roman", serif' },
  heroSub: { fontSize:18, color:'#6B6B6B', maxWidth:560, margin:'0 auto 40px', lineHeight:1.6, fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  heroBtns: { display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' },
  btnPrimary: { background:'#111110', color:'#FAFAF7', border:'none', borderRadius:6, padding:'13px 28px', fontWeight:500, fontSize:15, cursor:'pointer', textDecoration:'none', display:'inline-block' },
  btnSecondary: { background:'transparent', color:'#6B6B6B', border:'1px solid #E8E6E0', borderRadius:6, padding:'13px 28px', fontWeight:400, fontSize:15, cursor:'pointer', textDecoration:'none', display:'inline-block' },
  section: { padding:'96px 2rem', maxWidth:1100, margin:'0 auto' },
  sectionLight: { background:'#F5F4F0' },
  sectionTitle: { fontSize:'clamp(1.5rem, 3vw, 2.25rem)', fontWeight:400, color:'#111110', textAlign:'center', marginBottom:12, letterSpacing:-0.5, fontFamily:'Georgia, "Times New Roman", serif' },
  sectionSub: { fontSize:16, color:'#6B6B6B', textAlign:'center', marginBottom:56, maxWidth:520, margin:'0 auto 56px' },
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:24 },
  card: { background:'#FFFFFF', border:'1px solid #E8E6E0', borderRadius:10, padding:'28px 24px' },
  cardIcon: { width:44, height:44, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16, fontSize:20 },
  cardTitle: { fontSize:16, fontWeight:600, color:'#111110', marginBottom:8 },
  cardDesc: { fontSize:14, color:'#6B6B6B', lineHeight:1.6 },
  steps: { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:32 },
  stepNum: { width:40, height:40, borderRadius:6, background:'#FEF3C7', color:'#92400E', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:16, marginBottom:16 },
  stepTitle: { fontSize:16, fontWeight:600, color:'#111110', marginBottom:8 },
  stepDesc: { fontSize:14, color:'#6B6B6B', lineHeight:1.6 },
  pricingGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:24, maxWidth:700, margin:'0 auto' },
  pricingCard: { background:'#FFFFFF', border:'1px solid #E8E6E0', borderRadius:12, padding:'36px 32px' },
  pricingCardPro: { background:'#111110', border:'1px solid #111110', borderRadius:12, padding:'36px 32px' },
  pricingBadge: { display:'inline-block', background:'#D97706', color:'#fff', borderRadius:4, padding:'3px 10px', fontSize:11, fontWeight:600, marginBottom:16, letterSpacing:'0.06em' },
  pricingName: { fontSize:18, fontWeight:600, color:'#111110', marginBottom:8 },
  pricingNamePro: { fontSize:18, fontWeight:600, color:'#FAFAF7', marginBottom:8 },
  pricingPrice: { fontSize:44, fontWeight:300, color:'#111110', marginBottom:4, fontFamily:'Georgia, "Times New Roman", serif' },
  pricingPricePro: { fontSize:44, fontWeight:300, color:'#FAFAF7', marginBottom:4, fontFamily:'Georgia, "Times New Roman", serif' },
  pricingPer: { fontSize:14, color:'#9A9A9A', marginBottom:24 },
  pricingPerPro: { fontSize:14, color:'#9A9A9A', marginBottom:24 },
  pricingList: { listStyle:'none', padding:0, margin:'0 0 32px', display:'flex', flexDirection:'column', gap:12 },
  pricingItem: { fontSize:14, color:'#374151', display:'flex', alignItems:'center', gap:8 },
  pricingItemPro: { fontSize:14, color:'#D1D5DB', display:'flex', alignItems:'center', gap:8 },
  check: { color:'#D97706', fontWeight:700 },
  cta: { background:'#111110', padding:'96px 2rem', textAlign:'center' },
  ctaH2: { fontSize:'clamp(1.5rem, 3vw, 2.25rem)', fontWeight:400, color:'#FAFAF7', marginBottom:16, fontFamily:'Georgia, "Times New Roman", serif' },
  ctaSub: { fontSize:16, color:'#9A9A9A', marginBottom:40 },
  footer: { background:'#0A0A09', padding:'32px 2rem', textAlign:'center', color:'#6B6B6B', fontSize:14 },
};

const features = [
  { icon: Icons.Invoices,  color:'#0EA5E9', bg:'#EFF6FF', title:'Create Invoices',    desc:'Professional invoices in seconds. Customize with your logo and branding.' },
  { icon: Icons.Send,      color:'#8B5CF6', bg:'#F5F3FF', title:'Auto Email',         desc:'Send invoices automatically to clients the moment they\'re ready.' },
  { icon: Icons.Payments,  color:'#10B981', bg:'#ECFDF5', title:'Track Payments',     desc:'Know exactly who has paid and who hasn\'t with real-time tracking.' },
  { icon: Icons.Receipt,   color:'#F59E0B', bg:'#FFFBEB', title:'Recurring Invoices', desc:'Set up recurring billing and never forget to invoice a client again.' },
  { icon: Icons.Bank,      color:'#EF4444', bg:'#FEF2F2', title:'Analytics',          desc:'Get insights into your revenue, outstanding payments, and growth.' },
  { icon: Icons.Check,     color:'#0EA5E9', bg:'#EFF6FF', title:'Fast & Simple',      desc:'No learning curve. Start invoicing in minutes, not hours.' },
];

export default function LandingPage() {
  return (
    <div style={{ fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', margin:0 }}>

      {/* Nav */}
      <nav style={s.nav}>
        <div style={s.logo}>Invoice<span style={s.logoAccent}>Saga</span></div>
        <div style={{ display:'flex', alignItems:'center', gap:24 }}>
          <a href="/templates" style={{ color:'#94A3B8', fontSize:14, fontWeight:500, textDecoration:'none' }}>Offline Generator</a>
          <a href="/signup" style={s.navCta}>Get started free</a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ ...s.hero, textAlign:'left' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', display:'grid', gridTemplateColumns:'1fr 1fr', gap:64, alignItems:'center' }}>
          {/* Left column */}
          <div>
            <div style={s.heroTag}>✨ Free to start — no credit card required</div>
            <h1 style={s.heroH1}>The quiet way to get paid.</h1>
            <p style={s.heroSub}>Professional invoices, automatic reminders, and payment tracking — without the complexity. Built for freelancers who'd rather be working.</p>
            <div style={{ ...s.heroBtns, justifyContent:'flex-start' }}>
              <a href="/signup" style={s.btnPrimary}>Start for free →</a>
              <a href="/signup" style={s.btnSecondary}>See how it works</a>
            </div>
          </div>
          {/* Right column — invoice mockup */}
          <div style={{ background:'#FFFFFF', border:'1px solid #E8E6E0', borderRadius:12, padding:32, boxShadow:'0 2px 40px rgba(0,0,0,0.06)' }}>
            {/* Header row */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:'#111110' }}>Alex Chen</div>
                <div style={{ fontSize:12, color:'#9A9A9A', marginTop:2 }}>Freelance Designer</div>
              </div>
              <div style={{ background:'#D4EDDA', color:'#155724', borderRadius:4, padding:'3px 10px', fontSize:11, fontWeight:600, letterSpacing:'0.06em' }}>PAID</div>
            </div>
            {/* Divider */}
            <div style={{ borderTop:'1px solid #E8E6E0', margin:'20px 0' }} />
            {/* Line items */}
            <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:10 }}>
              {[
                { desc:'Brand Identity Design', amt:'$2,400' },
                { desc:'UI Kit — 5 screens',    amt:'$1,250' },
                { desc:'Strategy Session',       amt:'$350'   },
              ].map(({ desc, amt }) => (
                <div key={desc} style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:13, color:'#6B6B6B' }}>{desc}</span>
                  <span style={{ fontSize:13, color:'#111110', fontWeight:500 }}>{amt}</span>
                </div>
              ))}
            </div>
            {/* Divider */}
            <div style={{ borderTop:'1px solid #E8E6E0', margin:'20px 0' }} />
            {/* Total row */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
              <span style={{ fontSize:13, color:'#9A9A9A' }}>Total</span>
              <span style={{ fontSize:20, fontFamily:'Georgia, "Times New Roman", serif', fontWeight:400, color:'#111110' }}>$4,000</span>
            </div>
            {/* Payment confirmation */}
            <div style={{ marginTop:24, background:'#FEF3C7', borderRadius:6, padding:'10px 14px', fontSize:13, color:'#92400E' }}>
              💸 Payment received · just now
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <div style={s.sectionLight}>
        <div style={s.section}>
          <h2 style={s.sectionTitle}>Built around how you actually work.</h2>
          <p style={s.sectionSub}>No bloat. Every feature earns its place.</p>
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            {/* Row 1 — wide left, narrow right */}
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:20 }}>
              <div style={{ background:'#111110', border:'none', borderRadius:12, padding:'40px 36px' }}>
                <div style={{ ...s.cardIcon, background:'rgba(217,119,6,0.15)', color:'#D97706' }}>
                  <div style={{ transform:'scale(1.5)', display:'flex' }}><features[0].icon /></div>
                </div>
                <div style={{ fontSize:18, fontWeight:600, color:'#FAFAF7', marginBottom:8 }}>{features[0].title}</div>
                <div style={{ fontSize:14, color:'#9A9A9A', lineHeight:1.6 }}>{features[0].desc}</div>
              </div>
              <div style={{ background:'#FFFFFF', border:'1px solid #E8E6E0', borderRadius:12, padding:'28px 24px' }}>
                <div style={{ ...s.cardIcon, background: features[1].bg, color: features[1].color }}>
                  <div style={{ transform:'scale(1.5)', display:'flex' }}><features[1].icon /></div>
                </div>
                <div style={{ ...s.cardTitle, color:'#111110' }}>{features[1].title}</div>
                <div style={{ ...s.cardDesc, color:'#6B6B6B' }}>{features[1].desc}</div>
              </div>
            </div>
            {/* Row 2 — narrow left, wide right */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:20 }}>
              <div style={{ background:'#FFFFFF', border:'1px solid #E8E6E0', borderRadius:12, padding:'28px 24px' }}>
                <div style={{ ...s.cardIcon, background: features[2].bg, color: features[2].color }}>
                  <div style={{ transform:'scale(1.5)', display:'flex' }}><features[2].icon /></div>
                </div>
                <div style={{ ...s.cardTitle, color:'#111110' }}>{features[2].title}</div>
                <div style={{ ...s.cardDesc, color:'#6B6B6B' }}>{features[2].desc}</div>
              </div>
              <div style={{ background:'#111110', border:'none', borderRadius:12, padding:'40px 36px' }}>
                <div style={{ ...s.cardIcon, background:'rgba(217,119,6,0.15)', color:'#D97706' }}>
                  <div style={{ transform:'scale(1.5)', display:'flex' }}><features[3].icon /></div>
                </div>
                <div style={{ fontSize:18, fontWeight:600, color:'#FAFAF7', marginBottom:8 }}>{features[3].title}</div>
                <div style={{ fontSize:14, color:'#9A9A9A', lineHeight:1.6 }}>{features[3].desc}</div>
              </div>
            </div>
            {/* Row 3 — three equal */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:20 }}>
              <div style={{ background:'#FFFFFF', border:'1px solid #E8E6E0', borderRadius:12, padding:'28px 24px' }}>
                <div style={{ ...s.cardIcon, background: features[4].bg, color: features[4].color }}>
                  <div style={{ transform:'scale(1.5)', display:'flex' }}><features[4].icon /></div>
                </div>
                <div style={{ ...s.cardTitle, color:'#111110' }}>{features[4].title}</div>
                <div style={{ ...s.cardDesc, color:'#6B6B6B' }}>{features[4].desc}</div>
              </div>
              <div style={{ background:'#FFFFFF', border:'1px solid #E8E6E0', borderRadius:12, padding:'28px 24px' }}>
                <div style={{ ...s.cardIcon, background: features[5].bg, color: features[5].color }}>
                  <div style={{ transform:'scale(1.5)', display:'flex' }}><features[5].icon /></div>
                </div>
                <div style={{ ...s.cardTitle, color:'#111110' }}>{features[5].title}</div>
                <div style={{ ...s.cardDesc, color:'#6B6B6B' }}>{features[5].desc}</div>
              </div>
              <div style={{ background:'#F5F4F0', border:'1px solid #E8E6E0', borderRadius:12, padding:'28px 24px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span style={{ fontSize:14, color:'#9A9A9A', fontStyle:'italic' }}>More features coming</span>
              </div>
            </div>
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
              <div style={s.pricingPrice}>£0</div>
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
              <div style={s.pricingPricePro}>£4.99</div>
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
          <a href="/templates" style={{ color:'#475569' }}>Offline Generator</a>
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
