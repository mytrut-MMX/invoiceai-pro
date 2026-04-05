import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../router/routes';
import SharedNav from '../../components/SharedNav';

const articles = [
  {
    tag: 'Guide',
    title: 'How to write a freelance invoice (step by step)',
    excerpt: 'A clear, no-jargon walkthrough of everything your invoice needs — from your business details to payment terms. Get it right the first time so you get paid on time.',
    to: ROUTES.BLOG_POST_INVOICE_GUIDE,
  },
  {
    tag: 'Getting paid',
    title: 'How to chase a late payment without losing the client',
    excerpt: 'Late payments are part of freelancing, but awkward emails don\'t have to be. Here\'s a step-by-step approach to following up firmly and professionally.',
    to: ROUTES.BLOG_POST_LATE_PAYMENT,
  },
  {
    tag: 'Template',
    title: 'Free freelance invoice template — download and customise',
    excerpt: 'Stop starting from scratch every time. Grab a clean, professional invoice template and make it yours in minutes.',
    to: ROUTES.BLOG_POST_TEMPLATE,
  },
];

export default function BlogPage() {
  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', margin: 0, background: '#FAFAF7', minHeight: '100vh' }}>
      <SharedNav activePage="blog" />

      {/* Hero */}
      <section style={{ background: '#F5F4F0', padding: '80px 2rem 56px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 400, color: '#111110', margin: '0 0 16px', letterSpacing: -0.5 }}>
          Invoicing advice for freelancers
        </h1>
        <p style={{ fontSize: 16, color: '#6B6B6B', margin: 0, lineHeight: 1.6 }}>
          Practical guides to help you invoice better, chase less, and get paid faster.
        </p>
      </section>

      {/* Article grid */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 2rem 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          {articles.map((a) => (
            <div key={a.title} style={{ background: '#FFFFFF', border: '1px solid #E8E6E0', borderRadius: 12, padding: '32px 28px', display: 'flex', flexDirection: 'column' }}>
              <span style={{ display: 'inline-block', alignSelf: 'flex-start', background: '#FEF3C7', color: '#92400E', borderRadius: 4, padding: '3px 10px', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 }}>
                {a.tag}
              </span>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: '#111110', margin: '0 0 12px', lineHeight: 1.4 }}>{a.title}</h2>
              <p style={{ fontSize: 14, color: '#6B6B6B', lineHeight: 1.7, margin: '0 0 24px', flex: 1 }}>{a.excerpt}</p>
              <Link to={a.to} style={{ fontSize: 14, fontWeight: 600, color: '#D97706', textDecoration: 'none' }}>
                Read article →
              </Link>
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
