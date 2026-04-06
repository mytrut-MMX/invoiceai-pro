import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../router/routes';
import { Icons } from '../../components/icons';
import SharedNav from '../../components/SharedNav';

const s = {
  nav: { position:'sticky', top:0, zIndex:100, background:'#FAFAF7', borderBottom:'1px solid #E8E6E0', padding:'0 2rem', display:'flex', alignItems:'center', justifyContent:'space-between', height:60 },
  logo: { fontSize:20, fontWeight:700, color:'#111110', letterSpacing:-0.5 },
  logoAccent: { color:'#D97706' },
  navCta: { background:'#111110', color:'#FAFAF7', border:'none', borderRadius:6, padding:'7px 18px', fontWeight:500, fontSize:13, cursor:'pointer', textDecoration:'none' },
  navLogin: { background:'transparent', color:'#374151', border:'1px solid #E8E6E0', borderRadius:6, padding:'7px 16px', fontWeight:400, fontSize:13, cursor:'pointer', textDecoration:'none' },
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
  { icon: Icons.Invoices,  color:'#D97706', bg:'#FEF3C7', title:'Create Invoices',    desc:'Professional invoices in seconds. Customize with your logo and branding.' },
  { icon: Icons.Send,      color:'#D97706', bg:'#FEF3C7', title:'Auto Email',         desc:'Send invoices automatically to clients the moment they\'re ready.' },
  { icon: Icons.Payments,  color:'#D97706', bg:'#FEF3C7', title:'Track Payments',     desc:'Know exactly who has paid and who hasn\'t with real-time tracking.' },
  { icon: Icons.Receipt,   color:'#D97706', bg:'#FEF3C7', title:'Recurring Invoices', desc:'Set up recurring billing and never forget to invoice a client again.' },
  { icon: Icons.Bank,      color:'#D97706', bg:'#FEF3C7', title:'Analytics',          desc:'Get insights into your revenue, outstanding payments, and growth.' },
  { icon: Icons.Check,     color:'#D97706', bg:'#FEF3C7', title:'Fast & Simple',      desc:'No learning curve. Start invoicing in minutes, not hours.' },
];

const faqs = [
  { q: 'Is InvoiceSaga really free to start?', a: 'Yes — no credit card needed. The Free plan gives you everything you need to get started. Upgrade to Pro only when you need more.' },
  { q: 'How long does it take to send my first invoice?', a: 'Most users send their first invoice in under 2 minutes. Set up your profile, add a client, create the invoice — done.' },
  { q: 'Can I use InvoiceSaga as a sole trader or freelancer?', a: 'Absolutely. InvoiceSaga is built specifically for freelancers, sole traders, and solopreneurs. No accountant required.' },
  { q: 'What happens to my data?', a: 'Your data belongs to you. We never sell it, never share it, and you can export or delete it anytime.' },
];

function FaqSection() {
  const [open, setOpen] = useState(null);
  return (
    <div style={{ background:'#FAFAF7', padding:'64px 2rem' }}>
      <div style={{ maxWidth:680, margin:'0 auto' }}>
        <h2 style={{ fontSize:'clamp(1.5rem, 3vw, 2.25rem)', fontWeight:400, color:'#111110', textAlign:'center', marginBottom:48, letterSpacing:-0.5, fontFamily:'Georgia, "Times New Roman", serif' }}>Got questions?</h2>
        <div>
          {faqs.map((faq, i) => (
            <div key={i} style={{ borderBottom:'1px solid #E8E6E0' }}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                style={{ width:'100%', background:'none', border:'none', padding:'20px 0', display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', textAlign:'left', gap:16 }}
              >
                <span style={{ fontSize:15, fontWeight:600, color:'#111110', fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>{faq.q}</span>
                <span style={{ fontSize:18, color:'#9A9A9A', flexShrink:0, lineHeight:1 }}>{open === i ? '−' : '+'}</span>
              </button>
              {open === i && (
                <div style={{ paddingBottom:20, fontSize:14, color:'#6B6B6B', lineHeight:1.7, fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);

  function handleWaitlistSubmit(e) {
    e.preventDefault();
    if (!waitlistEmail.trim()) return;
    localStorage.setItem('invoicesaga_waitlist_email', waitlistEmail.trim());
    setWaitlistSubmitted(true);
  }

  return (
    <div style={{ fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', margin:0 }}>

      {/* Announcement bar */}
      <div style={{ background:'#D97706', padding:'8px 2rem', textAlign:'center', fontSize:13, fontWeight:500, color:'#fff' }}>
        Early access is open — <Link to={ROUTES.SIGNUP} style={{ color:'#fff', fontWeight:700, textDecoration:'underline' }}>Join free and lock in 40% off Pro →</Link>
      </div>

      <SharedNav />

      {/* Early access email capture */}
      <div style={{ background:'#FEF3C7', borderBottom:'1px solid #FDE68A', padding:'20px 2rem' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'center', gap:10, flexWrap:'wrap' }}>
          {waitlistSubmitted ? (
            <span style={{ fontSize:15, color:'#92400E', fontWeight:500 }}>✓ You're on the list — we'll be in touch.</span>
          ) : (
            <>
              <span style={{ fontSize:15, color:'#92400E', fontWeight:500 }}>You're early. Lock in 40% off Pro when we launch.</span>
              <form onSubmit={handleWaitlistSubmit} style={{ display:'flex', gap:10, flexWrap:'wrap', justifyContent:'center' }}>
                <input
                  type="email"
                  value={waitlistEmail}
                  onChange={(e) => setWaitlistEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={{ width:280, border:'1px solid #FDE68A', borderRadius:6, padding:'9px 14px', fontSize:14, outline:'none', fontFamily:'inherit' }}
                />
                <button type="submit" style={{ background:'#D97706', color:'#fff', border:'none', borderRadius:6, padding:'9px 18px', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                  Get early access
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Hero */}
      <section style={{ ...s.hero, textAlign:'left' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:64, alignItems:'center' }}>
          {/* Left column */}
          <div>
            <div style={s.heroTag}>✨ Invoicing built for freelancers</div>
            <h1 style={s.heroH1}>Professional invoices. Sent in minutes. Get paid faster.</h1>
            <p style={s.heroSub}>No learning curve, no bloat. Just clean invoices you can send in minutes — so you can get back to the work you actually love.</p>
            <div style={{ ...s.heroBtns, justifyContent:'flex-start' }}>
              <Link to={ROUTES.SIGNUP} style={s.btnPrimary}>Start free — no card needed</Link>
              <Link to={ROUTES.LOGIN} style={{ color:'#9A9A9A', fontSize:13, textDecoration:'none', fontWeight:400, alignSelf:'center' }}>Sign in</Link>
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

      {/* Trust bar */}
      <div style={{ background:'#fff', borderTop:'1px solid #E8E6E0', borderBottom:'1px solid #E8E6E0', padding:'16px 2rem' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'center', gap:40, flexWrap:'wrap' }}>
          {[
            '✓ Free plan — no credit card',
            '✓ Send your first invoice in 2 minutes',
            '✓ PDF invoices with your branding',
            '✓ Automatic payment reminders',
          ].map((item) => (
            <span key={item} style={{ fontSize:13, color:'#374151', fontWeight:500 }}>{item}</span>
          ))}
        </div>
      </div>

      {/* Features */}
      <div style={s.sectionLight}>
        <div style={s.section}>
          <h2 style={s.sectionTitle}>Built around how you actually work.</h2>
          <p style={s.sectionSub}>No bloat. Every feature earns its place.</p>
          {(() => {
            const [F0, F1, F2, F3, F4, F5] = features.map(f => f.icon);
            return (
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            {/* Row 1 — wide left, narrow right */}
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:20 }}>
              <div style={{ background:'#111110', border:'none', borderRadius:12, padding:'40px 36px' }}>
                <div style={{ ...s.cardIcon, background:'rgba(217,119,6,0.15)', color:'#D97706' }}>
                  <div style={{ transform:'scale(1.5)', display:'flex' }}><F0 /></div>
                </div>
                <div style={{ fontSize:18, fontWeight:600, color:'#FAFAF7', marginBottom:8 }}>{features[0].title}</div>
                <div style={{ fontSize:14, color:'#9A9A9A', lineHeight:1.6 }}>{features[0].desc}</div>
              </div>
              <div style={{ background:'#FFFFFF', border:'1px solid #E8E6E0', borderRadius:12, padding:'28px 24px' }}>
                <div style={{ ...s.cardIcon, background: features[1].bg, color: features[1].color }}>
                  <div style={{ transform:'scale(1.5)', display:'flex' }}><F1 /></div>
                </div>
                <div style={{ ...s.cardTitle, color:'#111110' }}>{features[1].title}</div>
                <div style={{ ...s.cardDesc, color:'#6B6B6B' }}>{features[1].desc}</div>
              </div>
            </div>
            {/* Row 2 — narrow left, wide right */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:20 }}>
              <div style={{ background:'#FFFFFF', border:'1px solid #E8E6E0', borderRadius:12, padding:'28px 24px' }}>
                <div style={{ ...s.cardIcon, background: features[2].bg, color: features[2].color }}>
                  <div style={{ transform:'scale(1.5)', display:'flex' }}><F2 /></div>
                </div>
                <div style={{ ...s.cardTitle, color:'#111110' }}>{features[2].title}</div>
                <div style={{ ...s.cardDesc, color:'#6B6B6B' }}>{features[2].desc}</div>
              </div>
              <div style={{ background:'#111110', border:'none', borderRadius:12, padding:'40px 36px' }}>
                <div style={{ ...s.cardIcon, background:'rgba(217,119,6,0.15)', color:'#D97706' }}>
                  <div style={{ transform:'scale(1.5)', display:'flex' }}><F3 /></div>
                </div>
                <div style={{ fontSize:18, fontWeight:600, color:'#FAFAF7', marginBottom:8 }}>{features[3].title}</div>
                <div style={{ fontSize:14, color:'#9A9A9A', lineHeight:1.6 }}>{features[3].desc}</div>
              </div>
            </div>
            {/* Row 3 — three equal */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:20 }}>
              <div style={{ background:'#FFFFFF', border:'1px solid #E8E6E0', borderRadius:12, padding:'28px 24px' }}>
                <div style={{ ...s.cardIcon, background: features[4].bg, color: features[4].color }}>
                  <div style={{ transform:'scale(1.5)', display:'flex' }}><F4 /></div>
                </div>
                <div style={{ ...s.cardTitle, color:'#111110' }}>{features[4].title}</div>
                <div style={{ ...s.cardDesc, color:'#6B6B6B' }}>{features[4].desc}</div>
              </div>
              <div style={{ background:'#FFFFFF', border:'1px solid #E8E6E0', borderRadius:12, padding:'28px 24px' }}>
                <div style={{ ...s.cardIcon, background: features[5].bg, color: features[5].color }}>
                  <div style={{ transform:'scale(1.5)', display:'flex' }}><F5 /></div>
                </div>
                <div style={{ ...s.cardTitle, color:'#111110' }}>{features[5].title}</div>
                <div style={{ ...s.cardDesc, color:'#6B6B6B' }}>{features[5].desc}</div>
              </div>
              <div style={{ background:'#FFFFFF', border:'1px solid #E8E6E0', borderRadius:12, padding:'28px 24px' }}>
                <div style={{ ...s.cardIcon, background:'#FEF3C7', color:'#D97706' }}>
                  <div style={{ transform:'scale(1.5)', display:'flex' }}><Icons.Check /></div>
                </div>
                <div style={{ ...s.cardTitle, color:'#111110' }}>PDF Export</div>
                <div style={{ ...s.cardDesc, color:'#6B6B6B' }}>Download any invoice as a professional PDF — ready to send or archive.</div>
              </div>
            </div>
          </div>
            );
          })()}
        </div>
      </div>

      {/* How it works */}
      <div id="how-it-works" style={{ background:'#fff' }}>
        <div style={s.section}>
          <h2 style={s.sectionTitle}>Three steps. Zero confusion.</h2>
          <p style={s.sectionSub}>You'll send your first invoice before finishing your coffee.</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:0, position:'relative' }}>
            {/* Connecting line */}
            <div style={{ position:'absolute', top:19, left:'16.66%', right:'16.66%', height:1, background:'#E8E6E0', zIndex:0 }} />
            {[
              { n:1, title:'Create your account', desc:'Sign up free and set up your business profile in minutes.' },
              { n:2, title:'Add your clients', desc:'Import or add clients manually. We store everything securely.' },
              { n:3, title:'Send & get paid', desc:'Create an invoice, send it, and watch the payments come in.' },
            ].map((step) => (
              <div key={step.n} style={{ position:'relative', zIndex:1, textAlign:'center', padding:'0 24px' }}>
                <div style={{ width:38, height:38, borderRadius:'50%', background: step.n===1 ? '#111110' : '#FAFAF7', border: step.n===1 ? '2px solid #111110' : '2px solid #E8E6E0', color: step.n===1 ? '#FAFAF7' : '#111110', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:600, fontSize:15, margin:'0 auto 20px', position:'relative', zIndex:2 }}>{step.n}</div>
                <div style={{ textAlign:'center', fontSize:15, fontWeight:600, color:'#111110', marginBottom:8 }}>{step.title}</div>
                <div style={{ textAlign:'center', fontSize:14, color:'#6B6B6B', lineHeight:1.6, maxWidth:200, margin:'0 auto' }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Comparison */}
      <div style={{ background:'#FAFAF7', padding:'96px 2rem' }}>
        <div style={{ maxWidth:900, margin:'0 auto' }}>
          <h2 style={s.sectionTitle}>Finally, an invoicing tool that gets out of your way.</h2>
          <p style={{ ...s.sectionSub, marginBottom:48 }}>You don't need a CFO to use InvoiceSaga.</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:16 }}>
            {[
              { label:'Spreadsheets',  items:['Manual formatting every time','No payment tracking','Looks unprofessional','No reminders'], highlight:false },
              { label:'InvoiceSaga',   items:['Invoice in under 2 minutes','Real-time payment tracking','Professional templates','Auto email reminders'], highlight:true },
              { label:'Complex tools', items:['Steep learning curve','Built for accountants','Expensive for freelancers','Features you\'ll never use'], highlight:false },
            ].map(({ label, items, highlight }) => (
              <div key={label} style={{ background: highlight ? '#111110' : '#fff', border: highlight ? 'none' : '1px solid #E8E6E0', borderRadius:12, padding:'28px 24px' }}>
                <div style={{ fontSize:15, fontWeight:700, color: highlight ? '#FAFAF7' : '#111110', marginBottom:20 }}>{label}</div>
                {items.map((item, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:14, fontSize:14, color: highlight ? '#D1D5DB' : '#6B6B6B', lineHeight:1.5 }}>
                    <span style={{ fontWeight:700, color: highlight ? '#D97706' : '#EF4444', flexShrink:0 }}>{highlight ? '✓' : '✗'}</span>
                    {item}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Social proof */}
      <div style={{ background: '#F5F4F0', padding: '80px 2rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '1.5rem', fontWeight: 400, color: '#111110', textAlign: 'center', marginBottom: 40, letterSpacing: -0.5 }}>
            Built for how freelancers actually work
          </h2>
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { headline: '2 min', sub: 'Average time to send first invoice' },
              { headline: 'Free', sub: 'Start invoicing with zero upfront cost' },
              { headline: '0 bloat', sub: 'No accounting degree required' },
            ].map(({ headline, sub }) => (
              <div key={headline} style={{ background: '#FFFFFF', border: '1px solid #E8E6E0', borderRadius: 12, padding: '28px 24px', flex: '1 1 200px', maxWidth: 280, textAlign: 'center' }}>
                <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '2.5rem', fontWeight: 400, color: '#D97706', marginBottom: 8, lineHeight: 1.1 }}>{headline}</div>
                <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: '#6B6B6B', lineHeight: 1.5 }}>{sub}</div>
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', fontSize: 14, color: '#9A9A9A', marginTop: 32, marginBottom: 0 }}>
            Early access is open — no credit card required to start.
          </p>
        </div>
      </div>

      {/* Pricing */}
      <div id="pricing" style={s.sectionLight}>
        <div style={s.section}>
          <h2 style={s.sectionTitle}>Simple, honest pricing</h2>
          <p style={s.sectionSub}>Start free, upgrade when you need more.</p>
          <div style={{ textAlign:'center', marginBottom:40, fontSize:14, color:'#9A9A9A' }}>
            <span>Free during beta · No credit card required · Cancel anytime</span>
          </div>
          <div style={s.pricingGrid}>
            <div style={s.pricingCard}>
              <div style={s.pricingName}>Free</div>
              <div style={{ ...s.pricingPrice, fontSize:36, fontWeight:400, fontFamily:'Georgia, "Times New Roman", serif' }}>Free</div>
              <div style={s.pricingPer}>always free · no card needed</div>
              <ul style={s.pricingList}>
                {['Up to 5 invoices/month','2 clients','Basic templates','Email support'].map((item, i) => (
                  <li key={i} style={s.pricingItem}><span style={s.check}>✓</span>{item}</li>
                ))}
              </ul>
              <Link to={ROUTES.SIGNUP} style={{ ...s.btnSecondary, border:'1px solid #E2E8F0', color:'#0F172A', display:'block', textAlign:'center' }}>Get started free</Link>
            </div>
            <div style={s.pricingCardPro}>
              <div style={s.pricingBadge}>Most popular</div>
              <div style={s.pricingNamePro}>Pro</div>
              <div style={s.pricingPricePro}>£9</div>
              <div style={s.pricingPerPro}>per month · cancel anytime</div>
              <ul style={s.pricingList}>
                <li style={{ color:'#94A3B8', fontSize:13, fontStyle:'italic', marginBottom:4 }}>Everything in Free, plus:</li>
                {['Unlimited invoices','Unlimited clients','Recurring invoices','Auto email reminders','Analytics & reports','Priority support'].map((item, i) => (
                  <li key={i} style={s.pricingItemPro}><span style={s.check}>✓</span>{item}</li>
                ))}
              </ul>
              <Link to={ROUTES.SIGNUP} style={{ ...s.btnPrimary, display:'block', textAlign:'center' }}>Start free trial</Link>
            </div>
          </div>
          <div style={{ textAlign:'center', marginTop:32, fontSize:13, color:'#9A9A9A' }}>
            Join during beta and lock in your price forever — no increases, ever.{' '}
            <Link to={ROUTES.SIGNUP} style={{ textDecoration:'none', color:'#D97706' }}><span style={{ color:'#D97706', fontWeight:500 }}>Join the waitlist to lock it in →</span></Link>
          </div>
        </div>
      </div>

      {/* CTA */}
      <section style={s.cta}>
        <div style={{ maxWidth:1100, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:64, alignItems:'center' }}>
          {/* Left */}
          <div>
            <div style={{ fontSize:11, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:'#6B6B6B', marginBottom:16 }}>Ready when you are</div>
            <h2 style={s.ctaH2}>Your invoices should work as hard as you do.</h2>
            <p style={s.ctaSub}>Every day without a proper invoicing system is a day you're working harder than you need to. It takes 2 minutes to start.</p>
          </div>
          {/* Right */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-start', gap:16 }}>
            <Link to={ROUTES.SIGNUP} style={s.btnPrimary}>Create your free account →</Link>
            <div style={{ fontSize:13, color:'#6B6B6B' }}>Free to start · No credit card · Cancel anytime</div>
            <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:32 }}>
              {[
                { n:'2 min',  label:'to first invoice' },
                { n:'Free',   label:'to start, always' },
                { n:'£9/mo',  label:'when you scale' },
              ].map(({ n, label }) => (
                <div key={label} style={{ textAlign:'left' }}>
                  <div style={{ fontSize:20, fontWeight:300, fontFamily:'Georgia, "Times New Roman", serif', color:'#FAFAF7' }}>{n}</div>
                  <div style={{ fontSize:12, color:'#6B6B6B' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FaqSection />

      {/* Footer */}
      <footer style={{ ...s.footer, borderTop:'1px solid #1C1C1B' }}>
        <div style={{ marginBottom:24, fontSize:16, fontWeight:600, color:'#FAFAF7' }}>Invoice<span style={{ color:'#D97706' }}>Saga</span></div>
        <div style={{ marginBottom:8 }}>
          <span style={{ color:'#D97706', fontWeight:700 }}>InvoiceSaga</span>
          {' · '}
          <Link to={ROUTES.TEMPLATES} style={{ color:'#475569', textDecoration:'none' }}>Offline Generator</Link>
          {' · '}
          <Link to={ROUTES.CONTACT}   style={{ color:'#475569', textDecoration:'none' }}>Contact</Link>
          {' · '}
          <Link to={ROUTES.PRIVACY}   style={{ color:'#475569', textDecoration:'none' }}>Privacy Policy</Link>
          {' · '}
          <Link to={ROUTES.TERMS}     style={{ color:'#475569', textDecoration:'none' }}>Terms of Service</Link>
          {' · '}
          <Link to={ROUTES.COOKIES}   style={{ color:'#475569', textDecoration:'none' }}>Cookie Policy</Link>
          {' · '}
          <Link to={ROUTES.GDPR}      style={{ color:'#475569', textDecoration:'none' }}>GDPR</Link>
          {' · '}
          <Link to={ROUTES.REFUND}    style={{ color:'#475569', textDecoration:'none' }}>Refund Policy</Link>
        </div>
        <div>© {new Date().getFullYear()} InvoiceSaga. All rights reserved.</div>
      </footer>

    </div>
  );
}
