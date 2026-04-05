import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../router/routes';
import SharedNav from '../../components/SharedNav';

const features = [
  {
    title: 'Create invoices in minutes',
    desc: 'Open a new invoice, fill in your client details and line items, and hit send. Most freelancers send their first invoice in under 2 minutes.',
  },
  {
    title: 'PDF generation with your branding',
    desc: 'Every invoice is exported as a clean, professional PDF with your logo and business details. No InvoiceSaga watermark on Pro.',
  },
  {
    title: 'Email delivery built in',
    desc: 'Send invoices directly to clients from InvoiceSaga. No copy-pasting into Gmail. Track when they open it.',
  },
  {
    title: 'Payment status tracking',
    desc: 'See at a glance which invoices are sent, viewed, paid, or overdue. No spreadsheet required.',
  },
  {
    title: 'Automatic payment reminders',
    desc: 'Set it and forget it. InvoiceSaga sends polite reminders to clients before and after the due date. Pro feature.',
  },
  {
    title: 'Recurring invoices',
    desc: 'Bill the same client every month? Set up a recurring invoice and InvoiceSaga handles it automatically. Pro feature.',
  },
];

const comparisonRows = [
  'Looks professional to clients',
  'Tracks who has paid',
  'Sends automatic reminders',
  'PDF with your logo',
  'Takes under 2 minutes per invoice',
];

export default function FeaturesPage() {
  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', margin: 0, background: '#FAFAF7', minHeight: '100vh' }}>
      <SharedNav activePage="features" />

      {/* Hero */}
      <section style={{ background: '#F5F4F0', padding: '80px 2rem 56px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 400, color: '#111110', margin: '0 0 16px', letterSpacing: -0.5 }}>
          Everything you need to get paid. Nothing you don't.
        </h1>
        <p style={{ fontSize: 16, color: '#6B6B6B', margin: 0, lineHeight: 1.6 }}>
          Built for freelancers who bill clients — not for accountants.
        </p>
      </section>

      {/* Features detail */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 40 }}>
          {features.map((f) => (
            <div key={f.title} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fill="#fff" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 600, color: '#111110', marginBottom: 6 }}>{f.title}</div>
                <div style={{ fontSize: 15, color: '#6B6B6B', lineHeight: 1.7 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section style={{ background: '#F5F4F0', padding: '80px 2rem' }}>
        <h2 style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 28, fontWeight: 400, color: '#111110', textAlign: 'center', margin: '0 0 48px', letterSpacing: -0.5 }}>
          Why not just use a spreadsheet?
        </h2>
        <div style={{ maxWidth: 720, margin: '0 auto', borderRadius: 12, overflow: 'hidden', border: '1px solid #E8E6E0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#FFFFFF' }}>
                <th style={{ textAlign: 'left', padding: '14px 20px', fontSize: 14, fontWeight: 600, color: '#111110', borderBottom: '1px solid #E8E6E0' }}> </th>
                <th style={{ textAlign: 'center', padding: '14px 20px', fontSize: 14, fontWeight: 600, color: '#6B6B6B', borderBottom: '1px solid #E8E6E0', width: 140 }}>Spreadsheet</th>
                <th style={{ textAlign: 'center', padding: '14px 20px', fontSize: 14, fontWeight: 600, color: '#111110', borderBottom: '1px solid #E8E6E0', width: 140 }}>InvoiceSaga</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, i) => (
                <tr key={row} style={{ background: i % 2 === 0 ? '#F5F4F0' : '#FFFFFF' }}>
                  <td style={{ padding: '14px 20px', fontSize: 14, color: '#374151', borderBottom: '1px solid #E8E6E0' }}>{row}</td>
                  <td style={{ textAlign: 'center', padding: '14px 20px', fontSize: 16, color: '#EF4444', fontWeight: 700, borderBottom: '1px solid #E8E6E0' }}>✗</td>
                  <td style={{ textAlign: 'center', padding: '14px 20px', fontSize: 16, color: '#D97706', fontWeight: 700, borderBottom: '1px solid #E8E6E0' }}>✓</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ background: '#111110', padding: '80px 2rem', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '2rem', fontWeight: 400, color: '#FAFAF7', margin: '0 0 12px' }}>
          Start sending professional invoices today.
        </h2>
        <p style={{ fontSize: 15, color: '#9A9A9A', margin: '0 0 32px' }}>
          Free to start — no credit card required.
        </p>
        <Link to={ROUTES.SIGNUP} style={{ display: 'inline-block', background: '#D97706', color: '#fff', borderRadius: 8, padding: '14px 32px', fontSize: 15, fontWeight: 600, textDecoration: 'none' }}>
          Create your free account
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ background: '#0A0A09', padding: '32px 2rem', textAlign: 'center', color: '#6B6B6B', fontSize: 14, borderTop: '1px solid #1C1C1B' }}>
        <div style={{ marginBottom: 16, fontSize: 16, fontWeight: 600, color: '#FAFAF7' }}>Invoice<span style={{ color: '#D97706' }}>Saga</span></div>
        <div>© {new Date().getFullYear()} InvoiceSaga. All rights reserved.</div>
      </footer>
    </div>
  );
}
