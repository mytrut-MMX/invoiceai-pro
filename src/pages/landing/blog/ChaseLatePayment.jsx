// SEO: target keyword "how to chase a late payment freelancer", meta description: "Professional scripts and a step-by-step timeline for chasing late invoices without damaging client relationships."

import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../../router/routes';
import SharedNav from '../../../components/SharedNav';

const prose = { fontSize: 15, color: '#374151', lineHeight: 1.8, margin: '0 0 20px' };
const h2Style = { fontSize: 22, fontWeight: 600, color: '#111110', margin: '40px 0 16px', fontFamily: 'Georgia, "Times New Roman", serif' };

export default function ChaseLatePayment() {
  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', margin: 0, background: '#FAFAF7', minHeight: '100vh' }}>
      <SharedNav activePage="blog" />

      <article style={{ maxWidth: 680, margin: '0 auto', padding: '64px 2rem 80px' }}>
        {/* Header */}
        <span style={{ display: 'inline-block', background: '#FEF3C7', color: '#92400E', borderRadius: 4, padding: '3px 10px', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 }}>
          Getting paid
        </span>
        <h1 style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 400, color: '#111110', margin: '0 0 16px', letterSpacing: -0.5, lineHeight: 1.2 }}>
          How to chase a late payment without losing the client
        </h1>
        <p style={{ fontSize: 16, color: '#6B6B6B', margin: '0 0 8px', lineHeight: 1.6 }}>
          A practical timeline and real email scripts for following up on overdue invoices — firmly, but without burning bridges.
        </p>
        <p style={{ fontSize: 13, color: '#9A9A9A', margin: '0 0 48px' }}>4 min read</p>

        {/* Body */}
        <p style={prose}>
          You finished the work. You sent the invoice. The due date came and went. Now you're staring at your inbox wondering whether to send a "friendly reminder" or light your laptop on fire. You're not alone — late payments are the single most common frustration freelancers face.
        </p>

        <h2 style={h2Style}>Why invoices go unpaid</h2>
        <p style={prose}>
          Before assuming the worst, consider the most common reasons: the invoice landed in spam, got forwarded to the wrong person, or is sitting in an approval queue. Sometimes clients genuinely forget. Rarely is it malicious — usually it's just disorganised. Your follow-up should reflect that.
        </p>

        <h2 style={h2Style}>Day 1 after the due date: the gentle nudge</h2>
        <p style={prose}>
          Send a short, warm email. Something like: "Hi [Name], just a quick note — invoice [number] was due on [date]. Wanted to make sure it didn't slip through the cracks. Happy to resend if helpful." No guilt, no passive aggression. Keep it light. Most late payments resolve at this stage.
        </p>

        <h2 style={h2Style}>Day 7: the firm follow-up</h2>
        <p style={prose}>
          If there's no response, follow up again with a slightly firmer tone. Reference the invoice number and amount, attach a copy, and ask for a specific payment date: "Could you let me know when I can expect payment?" Asking for a date creates a small commitment that's harder to ignore.
        </p>

        <h2 style={h2Style}>Day 14: the direct conversation</h2>
        <p style={prose}>
          At two weeks overdue, switch from email to a phone call or direct message. Emails are easy to ignore — a real conversation isn't. Stay calm and professional: "I want to get this sorted so we can both move forward." Offer a payment plan if the amount is large. Most people respond well to directness paired with flexibility.
        </p>

        <h2 style={h2Style}>Day 30+: escalation options</h2>
        <p style={prose}>
          If you're still unpaid after a month, you have options. A formal letter before action (a letter stating you'll pursue legal remedies) often gets immediate results. In England and Wales, the small claims court handles disputes up to £10,000 and doesn't require a solicitor. You can also charge statutory late payment interest — 8% plus the Bank of England base rate — under the Late Payment of Commercial Debts Act.
        </p>

        <h2 style={h2Style}>How to prevent it next time</h2>
        <p style={prose}>
          Set clear payment terms upfront — in your contract and on the invoice itself. Consider requesting a deposit before starting work, especially for new clients. And use automatic reminders: a polite nudge sent 3 days before the due date can prevent the problem entirely.
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
