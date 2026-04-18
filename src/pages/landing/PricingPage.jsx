import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../router/routes';
import SharedNav from '../../components/SharedNav';
import SharedFooter from '../../components/SharedFooter';
import { Btn } from '../../components/atoms';

const faqs = [
  { q: 'Is InvoiceSaga really free to start?', a: 'Yes — no credit card needed. The Free plan gives you everything to get started. Upgrade to Pro only when you need more.' },
  { q: 'Can I cancel anytime?', a: 'Yes. Pro is month-to-month. Cancel from your account settings at any time — no questions asked.' },
  { q: 'What happens to my invoices if I downgrade?', a: 'Your invoice history is always safe. You can export everything as PDF at any time.' },
  { q: 'Do I need accounting knowledge to use InvoiceSaga?', a: 'No. InvoiceSaga is built for freelancers, not accountants. If you can fill in a form, you can send an invoice.' },
];

const FREE_FEATURES = [
  'Up to 5 active clients',
  'Unlimited invoices',
  'PDF generation',
  'Email delivery',
  'Payment status tracking',
  'InvoiceSaga branding on invoices',
];

const PRO_FEATURES = [
  'Everything in Free',
  'Unlimited active clients',
  'Remove InvoiceSaga branding',
  'Automatic payment reminders',
  'Recurring invoices',
  'Priority support',
];

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="m-0 bg-[var(--surface-page)] min-h-screen">
      <SharedNav activePage="pricing" />

      {/* Hero */}
      <section className="bg-[var(--surface-sunken)] px-[21px] sm:px-[34px] py-[55px] lg:py-[89px] text-center">
        <h1 className="text-[34px] lg:text-[55px] font-semibold text-[var(--text-primary)] mb-[21px] tracking-tight m-0">
          Simple pricing. No surprises.
        </h1>
        <p className="text-[16px] text-[var(--text-secondary)] m-0 leading-relaxed">
          Free to start. Upgrade only when you're ready.
        </p>
      </section>

      {/* Pricing cards */}
      <section className="max-w-[900px] mx-auto px-[21px] sm:px-[34px] py-[55px] lg:py-[89px]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[21px]">
          {/* FREE card */}
          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-xl)] p-[34px]">
            <div className="inline-block bg-[var(--brand-50)] text-[var(--brand-700)] rounded-[var(--radius-sm)] px-2.5 py-0.5 text-[11px] font-semibold tracking-wider uppercase mb-[13px]">
              Free forever
            </div>
            <div className="text-[34px] font-bold text-[var(--text-primary)] mb-1">£0</div>
            <div className="text-sm text-[var(--text-tertiary)] mb-[21px]">per month · always free</div>
            <ul className="list-none p-0 m-0 mb-[34px] flex flex-col gap-[13px]">
              {FREE_FEATURES.map((item) => (
                <li key={item} className="text-sm text-[var(--text-secondary)] flex items-center gap-[8px]">
                  <span className="text-[var(--brand-600)] font-bold">✓</span>{item}
                </li>
              ))}
            </ul>
            <Link to={ROUTES.SIGNUP} className="block">
              <Btn variant="outline" size="lg" className="w-full">Start free</Btn>
            </Link>
          </div>

          {/* PRO card */}
          <div className="bg-[var(--surface-dark)] border-2 border-[var(--brand-600)] rounded-[var(--radius-xl)] p-[34px] relative">
            <div className="inline-block bg-[var(--brand-600)] text-white rounded-[var(--radius-sm)] px-2.5 py-0.5 text-[11px] font-semibold tracking-wider uppercase mb-[13px]">
              Most popular
            </div>
            <div className="text-[34px] font-bold text-white mb-1">£9</div>
            <div className="text-sm text-white/50 mb-[21px]">per month · cancel anytime</div>
            <ul className="list-none p-0 m-0 mb-[34px] flex flex-col gap-[13px]">
              {PRO_FEATURES.map((item) => (
                <li key={item} className="text-sm text-white/80 flex items-center gap-[8px]">
                  <span className="text-[var(--brand-300)] font-bold">✓</span>{item}
                </li>
              ))}
            </ul>
            <Link to={ROUTES.SIGNUP} className="block">
              <Btn variant="primary" size="lg" className="w-full">Start free — upgrade later</Btn>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-[640px] mx-auto px-[21px] sm:px-[34px] pb-[55px] lg:pb-[89px]">
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-8 tracking-tight">
          Common questions
        </h2>
        <div>
          {faqs.map((faq, i) => (
            <div key={i} className="border-b border-[var(--border-subtle)]">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full bg-transparent border-none py-5 flex items-center justify-between cursor-pointer text-left gap-4"
              >
                <span className="text-[15px] font-semibold text-[var(--text-primary)]">{faq.q}</span>
                <span className="text-lg text-[var(--text-tertiary)] flex-shrink-0 leading-none">{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && (
                <div className="pb-5 text-sm text-[var(--text-secondary)] leading-relaxed">{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      <SharedFooter />
    </div>
  );
}
