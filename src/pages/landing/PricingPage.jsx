import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../router/routes';
import SharedNav from '../../components/SharedNav';

const faqs = [
  { q: 'Is InvoiceSaga really free to start?', a: 'Yes — no credit card needed. The Free plan gives you everything to get started. Upgrade to Pro only when you need more.' },
  { q: 'Can I cancel anytime?', a: 'Yes. Pro is month-to-month. Cancel from your account settings at any time — no questions asked.' },
  { q: 'What happens to my invoices if I downgrade?', a: 'Your invoice history is always safe. You can export everything as PDF at any time.' },
  { q: 'Do I need accounting knowledge to use InvoiceSaga?', a: 'No. InvoiceSaga is built for freelancers, not accountants. If you can fill in a form, you can send an invoice.' },
];

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', margin: 0, background: '#FAFAF7', minHeight: '100vh' }}>
      <SharedNav activePage="pricing" />

      {/* Hero */}
      <section style={{ background: '#F5F4F0', padding: '80px 2rem 56px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 400, color: '#111110', margin: '0 0 16px', letterSpacing: -0.5 }}>
          Simple pricing. No surprises.
        </h1>
        <p style={{ fontSize: 16, color: '#6B6B6B', margin: 0, lineHeight: 1.6 }}>
          Free to start. Upgrade only when you're ready.
        </p>
      </section>

      {/* Pricing cards */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '64px 2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>

          {/* FREE card */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E8E6E0', borderRadius: 12, padding: '36px 32px' }}>
            <div style={{ display: 'inline-block', background: '#FEF3C7', color: '#92400E', borderRadius: 4, padding: '3px 10px', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 }}>
              Free forever
            </div>
            <div style={{ fontSize: 48, fontWeight: 300, color: '#111110', fontFamily: 'Georgia, "Times New Roman", serif', marginBottom: 4 }}>£0</div>
            <div style={{ fontSize: 14, color: '#9A9A9A', marginBottom: 28 }}>per month · always free</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                'Up to 5 active clients',
                'Unlimited invoices',
                'PDF generation',
                'Email delivery',
                'Payment status tracking',
                'InvoiceSaga branding on invoices',
              ].map((item) => (
                <li key={item} style={{ fontSize: 14, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#D97706', fontWeight: 700 }}>✓</span>{item}
                </li>
              ))}
            </ul>
            <Link to={ROUTES.SIGNUP} style={{ display: 'block', textAlign: 'center', padding: '13px 28px', borderRadius: 6, border: '1px solid #E8E6E0', background: 'transparent', color: '#111110', fontSize: 15, fontWeight: 500, textDecoration: 'none' }}>
              Start free
            </Link>
          </div>

          {/* PRO card */}
          <div style={{ background: '#111110', border: '1px solid #111110', borderRadius: 12, padding: '36px 32px' }}>
            <div style={{ display: 'inline-block', background: '#D97706', color: '#fff', borderRadius: 4, padding: '3px 10px', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 }}>
              Most popular
            </div>
            <div style={{ fontSize: 48, fontWeight: 300, color: '#FAFAF7', fontFamily: 'Georgia, "Times New Roman", serif', marginBottom: 4 }}>£9</div>
            <div style={{ fontSize: 14, color: '#9A9A9A', marginBottom: 28 }}>per month · cancel anytime</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                'Everything in Free',
                'Unlimited active clients',
                'Remove InvoiceSaga branding',
                'Automatic payment reminders',
                'Recurring invoices',
                'Priority support',
              ].map((item) => (
                <li key={item} style={{ fontSize: 14, color: '#D1D5DB', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#D97706', fontWeight: 700 }}>✓</span>{item}
                </li>
              ))}
            </ul>
            <Link to={ROUTES.SIGNUP} style={{ display: 'block', textAlign: 'center', padding: '13px 28px', borderRadius: 6, border: 'none', background: '#D97706', color: '#fff', fontSize: 15, fontWeight: 500, textDecoration: 'none' }}>
              Start free — upgrade later
            </Link>
          </div>

        </div>
      </section>

      {/* FAQ */}
      <section style={{ maxWidth: 640, margin: '0 auto', padding: '0 2rem 80px' }}>
        <h2 style={{ fontSize: 22, fontWeight: 400, color: '#111110', marginBottom: 32, fontFamily: 'Georgia, "Times New Roman", serif' }}>Common questions</h2>
        <div>
          {faqs.map((faq, i) => (
            <div key={i} style={{ borderBottom: '1px solid #E8E6E0' }}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{ width: '100%', background: 'none', border: 'none', padding: '20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left', gap: 16 }}
              >
                <span style={{ fontSize: 15, fontWeight: 600, color: '#111110', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>{faq.q}</span>
                <span style={{ fontSize: 18, color: '#9A9A9A', flexShrink: 0, lineHeight: 1 }}>{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && (
                <div style={{ paddingBottom: 20, fontSize: 14, color: '#6B6B6B', lineHeight: 1.7, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#0A0A09', padding: '32px 2rem', textAlign: 'center', color: '#6B6B6B', fontSize: 14, borderTop: '1px solid #1C1C1B' }}>
        <div style={{ marginBottom: 16, fontSize: 16, fontWeight: 600, color: '#FAFAF7' }}>Invoice<span style={{ color: '#D97706' }}>Saga</span></div>
        <div>© {new Date().getFullYear()} InvoiceSaga. All rights reserved.</div>
      </footer>
    </div>
  );
}
