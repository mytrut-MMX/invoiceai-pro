// SEO: target keyword "freelance invoice template free", meta description: "Free freelance invoice template you can customise in minutes. Covers what to include, layout tips, and how to make your invoices look professional."

import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../../router/routes';
import SharedNav from '../../../components/SharedNav';

const prose = { fontSize: 15, color: '#374151', lineHeight: 1.8, margin: '0 0 20px' };
const h2Style = { fontSize: 22, fontWeight: 600, color: '#111110', margin: '40px 0 16px', fontFamily: 'Georgia, "Times New Roman", serif' };

export default function FreelanceInvoiceTemplate() {
  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', margin: 0, background: '#FAFAF7', minHeight: '100vh' }}>
      <SharedNav activePage="blog" />

      <article style={{ maxWidth: 680, margin: '0 auto', padding: '64px 2rem 80px' }}>
        {/* Header */}
        <span style={{ display: 'inline-block', background: '#FEF3C7', color: '#92400E', borderRadius: 4, padding: '3px 10px', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 }}>
          Template
        </span>
        <h1 style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 400, color: '#111110', margin: '0 0 16px', letterSpacing: -0.5, lineHeight: 1.2 }}>
          Free freelance invoice template — download and customise
        </h1>
        <p style={{ fontSize: 16, color: '#6B6B6B', margin: '0 0 8px', lineHeight: 1.6 }}>
          Stop starting from scratch. Here's what a good freelance invoice looks like and how to make one that gets you paid.
        </p>
        <p style={{ fontSize: 13, color: '#9A9A9A', margin: '0 0 48px' }}>4 min read</p>

        {/* Body */}
        <p style={prose}>
          A freelance invoice doesn't need to be complicated. It needs to be clear, professional, and complete. Most payment delays happen not because clients are difficult, but because the invoice was missing something — a bank detail, a reference number, a due date. A solid template solves all of that before you even start.
        </p>

        <h2 style={h2Style}>What every freelance invoice must include</h2>
        <p style={prose}>
          At minimum, your invoice should have: your name and contact details, your client's name and address, a unique invoice number, the invoice date and due date, a description of the work, the amount due, and your payment details (bank account or payment link). If you're VAT-registered, you'll also need your VAT number and a breakdown of VAT charged.
        </p>

        <h2 style={h2Style}>Layout that works</h2>
        <p style={prose}>
          Put your business name and logo at the top — it immediately signals professionalism. Your details and the client's details should sit side by side or in clearly labelled blocks. The line items table is the heart of the invoice: description, quantity, rate, and amount per line. Keep the total prominent and easy to find. Payment details should be near the bottom, impossible to miss.
        </p>

        <h2 style={h2Style}>A simple template structure</h2>
        <div style={{ background: '#FFFFFF', border: '1px solid #E8E6E0', borderRadius: 10, padding: '24px 28px', margin: '0 0 24px', fontSize: 14, color: '#374151', lineHeight: 1.8 }}>
          <strong style={{ color: '#111110' }}>Your Business Name</strong><br />
          Your address · your@email.com · 07xxx xxxxxx<br /><br />
          <strong style={{ color: '#111110' }}>Bill to:</strong> Client Name, Client Address<br />
          <strong style={{ color: '#111110' }}>Invoice:</strong> INV-001 · <strong style={{ color: '#111110' }}>Date:</strong> 5 Apr 2026 · <strong style={{ color: '#111110' }}>Due:</strong> 19 Apr 2026<br /><br />
          <div style={{ borderTop: '1px solid #E8E6E0', margin: '12px 0' }} />
          Website design — homepage &amp; 3 pages · £2,400<br />
          Logo refinement · £350<br />
          <div style={{ borderTop: '1px solid #E8E6E0', margin: '12px 0' }} />
          <strong style={{ color: '#111110' }}>Total: £2,750</strong><br /><br />
          <strong style={{ color: '#111110' }}>Pay to:</strong> Sort code 12-34-56 · Account 12345678<br />
          Reference: INV-001
        </div>

        <h2 style={h2Style}>Tips for a better invoice</h2>
        <p style={prose}>
          Use consistent numbering — sequential numbers (INV-001, INV-002) make your bookkeeping simpler and look more established. Always include a due date rather than just "payment terms: 14 days" — a concrete date is harder to overlook. And add your bank details directly on the invoice. Every extra step between "I'll pay this" and actually paying it increases the chance of delay.
        </p>

        <h2 style={h2Style}>When a template isn't enough</h2>
        <p style={prose}>
          Templates are a great starting point, but they have limits. You'll still need to manually update numbers, track which invoices are paid, and remember to follow up on overdue ones. As your client list grows, a dedicated invoicing tool saves real time — it handles numbering, tracks payment status, and can send reminders automatically.
        </p>

        {/* CTA */}
        <div style={{ background: '#111110', borderRadius: 12, padding: '40px 32px', textAlign: 'center', marginTop: 56 }}>
          <h3 style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 20, fontWeight: 400, color: '#FAFAF7', margin: '0 0 12px' }}>
            Ready to send your first invoice?
          </h3>
          <p style={{ fontSize: 14, color: '#9A9A9A', margin: '0 0 24px' }}>Create a professional invoice in under 2 minutes with InvoiceSaga.</p>
          <Link to={ROUTES.SIGNUP} style={{ display: 'inline-block', background: '#D97706', color: '#fff', borderRadius: 8, padding: '12px 28px', fontSize: 15, fontWeight: 600, textDecoration: 'none' }}>
            Start free →
          </Link>
        </div>
      </article>

      {/* Footer */}
      <footer style={{ background: '#0A0A09', padding: '32px 2rem', textAlign: 'center', color: '#6B6B6B', fontSize: 14, borderTop: '1px solid #1C1C1B' }}>
        <div style={{ marginBottom: 16, fontSize: 16, fontWeight: 600, color: '#FAFAF7' }}>Invoice<span style={{ color: '#D97706' }}>Saga</span></div>
        <div>© {new Date().getFullYear()} InvoiceSaga. All rights reserved.</div>
      </footer>
    </div>
  );
}
