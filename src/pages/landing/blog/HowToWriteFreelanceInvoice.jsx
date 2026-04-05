// SEO: target keyword "how to write a freelance invoice", meta description: "Step-by-step guide to writing a freelance invoice that gets you paid on time. Covers layout, required fields, payment terms, and common mistakes."

import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../../router/routes';
import SharedNav from '../../../components/SharedNav';

const prose = { fontSize: 15, color: '#374151', lineHeight: 1.8, margin: '0 0 20px' };
const h2Style = { fontSize: 22, fontWeight: 600, color: '#111110', margin: '40px 0 16px', fontFamily: 'Georgia, "Times New Roman", serif' };

export default function HowToWriteFreelanceInvoice() {
  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', margin: 0, background: '#FAFAF7', minHeight: '100vh' }}>
      <SharedNav activePage="blog" />

      <article style={{ maxWidth: 680, margin: '0 auto', padding: '64px 2rem 80px' }}>
        {/* Header */}
        <span style={{ display: 'inline-block', background: '#FEF3C7', color: '#92400E', borderRadius: 4, padding: '3px 10px', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 }}>
          Guide
        </span>
        <h1 style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 400, color: '#111110', margin: '0 0 16px', letterSpacing: -0.5, lineHeight: 1.2 }}>
          How to write a freelance invoice (step by step)
        </h1>
        <p style={{ fontSize: 16, color: '#6B6B6B', margin: '0 0 8px', lineHeight: 1.6 }}>
          A clear walkthrough of everything your invoice needs — so you look professional and get paid without chasing.
        </p>
        <p style={{ fontSize: 13, color: '#9A9A9A', margin: '0 0 48px' }}>5 min read</p>

        {/* Body */}
        <p style={prose}>
          Sending your first invoice can feel weirdly stressful. You've done the work, the client is happy, and now you just need to… ask for the money. The good news: a proper invoice makes that conversation effortless. Here's exactly what to include.
        </p>

        <h2 style={h2Style}>1. Your business details</h2>
        <p style={prose}>
          Start with your full name (or trading name), address, email, and phone number. If you're VAT-registered, include your VAT number. This isn't optional — HMRC requires it on every invoice, and clients need it for their own bookkeeping.
        </p>

        <h2 style={h2Style}>2. Your client's details</h2>
        <p style={prose}>
          Include the client's company name and address. If you have a specific contact person, add their name too. This matters more than you'd think — large companies route invoices by name, and a missing detail can delay payment by weeks.
        </p>

        <h2 style={h2Style}>3. A unique invoice number</h2>
        <p style={prose}>
          Every invoice needs a unique sequential number. It doesn't need to be fancy — INV-001, INV-002 works perfectly. The key is that no two invoices share the same number. This helps both you and your client track payments and resolve disputes.
        </p>

        <h2 style={h2Style}>4. Line items with clear descriptions</h2>
        <p style={prose}>
          Break the work into line items. Each should have a description, quantity, unit price, and total. Be specific: "Website design — homepage and 3 inner pages" is better than "Design work". Clarity reduces questions and speeds up approval.
        </p>

        <h2 style={h2Style}>5. Payment terms</h2>
        <p style={prose}>
          State when the payment is due. "Due within 14 days" or "Net 30" are common. Include your bank details (sort code, account number) or a payment link. The easier you make it to pay, the faster the money arrives. Also mention your preferred payment method — bank transfer is standard in the UK.
        </p>

        <h2 style={h2Style}>6. Dates matter</h2>
        <p style={prose}>
          Include the invoice date (when you're sending it) and the due date. These create a clear timeline and give you something concrete to reference if you need to follow up. Without a due date, "I'll pay you soon" can stretch into months.
        </p>

        <h2 style={h2Style}>Common mistakes to avoid</h2>
        <p style={prose}>
          Don't forget to include your bank details — it's the number one reason freelancers experience payment delays. Avoid vague descriptions that invite questions. And always double-check the client's name and address — sending an invoice to the wrong department can add weeks to your wait.
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
