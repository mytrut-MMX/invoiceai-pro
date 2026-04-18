import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../router/routes';
import { Icons } from '../../components/icons';
import SharedNav from '../../components/SharedNav';
import SharedFooter from '../../components/SharedFooter';
import { Btn } from '../../components/atoms';

const features = [
  { icon: Icons.Invoices,  title: 'Create Invoices',    desc: 'Professional invoices in seconds. Customize with your logo and branding.' },
  { icon: Icons.Send,      title: 'Auto Email',         desc: "Send invoices automatically to clients the moment they're ready." },
  { icon: Icons.Payments,  title: 'Track Payments',     desc: "Know exactly who has paid and who hasn't with real-time tracking." },
  { icon: Icons.Receipt,   title: 'Recurring Invoices', desc: 'Set up recurring billing and never forget to invoice a client again.' },
  { icon: Icons.Bank,      title: 'Analytics',          desc: 'Get insights into your revenue, outstanding payments, and growth.' },
  { icon: Icons.Check,     title: 'Fast & Simple',      desc: 'No learning curve. Start invoicing in minutes, not hours.' },
];

const faqs = [
  { q: 'Is InvoiceSaga really free to start?', a: 'Yes — no credit card needed. The Free plan gives you everything you need to get started. Upgrade to Pro only when you need more.' },
  { q: 'How long does it take to send my first invoice?', a: 'Most users send their first invoice in under 2 minutes. Set up your profile, add a client, create the invoice — done.' },
  { q: 'Can I use InvoiceSaga as a sole trader or freelancer?', a: 'Absolutely. InvoiceSaga is built specifically for freelancers, sole traders, and solopreneurs. No accountant required.' },
  { q: 'What happens to my data?', a: 'Your data belongs to you. We never sell it, never share it, and you can export or delete it anytime.' },
];

function FeatureIcon({ Icon, tone = 'brand' }) {
  const cls = tone === 'dark'
    ? 'bg-[var(--brand-500)]/15 text-[var(--brand-300)]'
    : 'bg-[var(--brand-50)] text-[var(--brand-600)]';
  return (
    <div className={`w-11 h-11 rounded-[var(--radius-md)] flex items-center justify-center mb-4 ${cls}`}>
      <span className="scale-150 flex"><Icon /></span>
    </div>
  );
}

function FeatureCard({ feature, dark = false }) {
  const Icon = feature.icon;
  return dark ? (
    <div className="bg-[var(--surface-dark)] rounded-[var(--radius-lg)] px-9 py-10 h-full">
      <FeatureIcon Icon={Icon} tone="dark" />
      <div className="text-lg font-semibold text-white mb-2">{feature.title}</div>
      <div className="text-sm text-white/60 leading-relaxed">{feature.desc}</div>
    </div>
  ) : (
    <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] px-6 py-7 h-full">
      <FeatureIcon Icon={Icon} />
      <div className="text-base font-semibold text-[var(--text-primary)] mb-2">{feature.title}</div>
      <div className="text-sm text-[var(--text-secondary)] leading-relaxed">{feature.desc}</div>
    </div>
  );
}

function FaqSection() {
  const [open, setOpen] = useState(null);
  return (
    <div className="bg-[var(--surface-page)] px-6 py-16">
      <div className="max-w-[680px] mx-auto">
        <h2 className="text-2xl sm:text-3xl font-semibold text-[var(--text-primary)] text-center mb-12 tracking-tight">
          Got questions?
        </h2>
        <div>
          {faqs.map((faq, i) => (
            <div key={i} className="border-b border-[var(--border-subtle)]">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full bg-transparent border-none py-5 flex items-center justify-between cursor-pointer text-left gap-4"
              >
                <span className="text-[15px] font-semibold text-[var(--text-primary)]">{faq.q}</span>
                <span className="text-lg text-[var(--text-tertiary)] flex-shrink-0 leading-none">{open === i ? '−' : '+'}</span>
              </button>
              {open === i && (
                <div className="pb-5 text-sm text-[var(--text-secondary)] leading-relaxed">{faq.a}</div>
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
    <div className="m-0">
      {/* Announcement bar */}
      <div className="bg-[var(--brand-600)] px-6 py-2 text-center text-[13px] font-medium text-white">
        Early access is open —{' '}
        <Link to={ROUTES.SIGNUP} className="text-white font-bold underline">
          Join free and lock in 40% off Pro →
        </Link>
      </div>

      <SharedNav />

      {/* Early access email capture */}
      <div className="bg-[var(--brand-50)] border-b border-[var(--brand-100)] px-6 py-5">
        <div className="max-w-[1100px] mx-auto flex items-center justify-center gap-2.5 flex-wrap">
          {waitlistSubmitted ? (
            <span className="text-[15px] text-[var(--brand-700)] font-medium">
              ✓ You're on the list — we'll be in touch.
            </span>
          ) : (
            <>
              <span className="text-[15px] text-[var(--brand-700)] font-medium">
                You're early. Lock in 40% off Pro when we launch.
              </span>
              <form onSubmit={handleWaitlistSubmit} className="flex gap-2.5 flex-wrap justify-center">
                <input
                  type="email"
                  value={waitlistEmail}
                  onChange={(e) => setWaitlistEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-[280px] border border-[var(--brand-200)] bg-white rounded-[var(--radius-md)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--brand-500)] focus:ring-2 focus:ring-[var(--brand-100)]"
                />
                <button
                  type="submit"
                  className="bg-[var(--brand-600)] hover:bg-[var(--brand-700)] text-white border-none rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-semibold cursor-pointer transition-colors duration-150"
                >
                  Get early access
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Hero */}
      <section className="bg-[var(--surface-page)] px-6 pt-24 pb-20">
        <div className="max-w-[1100px] mx-auto grid gap-16 items-center grid-cols-1 lg:grid-cols-2">
          {/* Left column */}
          <div>
            <div className="inline-block bg-[var(--brand-50)] text-[var(--brand-700)] rounded-[var(--radius-sm)] px-3 py-1 text-xs font-medium mb-6 tracking-wide">
              ✨ Invoicing built for freelancers
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-[var(--text-primary)] leading-[1.1] mb-5 tracking-tight">
              Professional invoices. Sent in minutes. Get paid faster.
            </h1>
            <p className="text-lg text-[var(--text-secondary)] max-w-[560px] mb-10 leading-relaxed">
              No learning curve, no bloat. Just clean invoices you can send in minutes — so you can get back to the work you actually love.
            </p>
            <div className="flex gap-3 flex-wrap items-center">
              <Link to={ROUTES.SIGNUP}>
                <Btn variant="primary" size="lg">Start free — no card needed</Btn>
              </Link>
              <Link
                to={ROUTES.LOGIN}
                className="text-[var(--text-tertiary)] text-[13px] no-underline font-normal hover:text-[var(--text-secondary)] transition-colors"
              >
                Sign in
              </Link>
            </div>
          </div>

          {/* Right column — invoice mockup */}
          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-8 shadow-[0_2px_40px_rgba(0,0,0,0.06)]">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">Alex Chen</div>
                <div className="text-xs text-[var(--text-tertiary)] mt-0.5">Freelance Designer</div>
              </div>
              <div className="bg-[var(--success-50)] text-[var(--success-700)] rounded-[var(--radius-sm)] px-2.5 py-0.5 text-[11px] font-semibold tracking-wide">
                PAID
              </div>
            </div>
            <div className="border-t border-[var(--border-subtle)] my-5" />
            <div className="w-full flex flex-col gap-2.5">
              {[
                { desc: 'Brand Identity Design', amt: '$2,400' },
                { desc: 'UI Kit — 5 screens',    amt: '$1,250' },
                { desc: 'Strategy Session',       amt: '$350'   },
              ].map(({ desc, amt }) => (
                <div key={desc} className="flex justify-between">
                  <span className="text-[13px] text-[var(--text-secondary)]">{desc}</span>
                  <span className="text-[13px] text-[var(--text-primary)] font-medium">{amt}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-[var(--border-subtle)] my-5" />
            <div className="flex justify-between items-baseline">
              <span className="text-[13px] text-[var(--text-tertiary)]">Total</span>
              <span className="text-xl font-semibold text-[var(--text-primary)]">$4,000</span>
            </div>
            <div className="mt-6 bg-[var(--brand-50)] rounded-[var(--radius-md)] px-3.5 py-2.5 text-[13px] text-[var(--brand-700)]">
              💸 Payment received · just now
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <div className="bg-[var(--surface-card)] border-y border-[var(--border-subtle)] px-6 py-4">
        <div className="max-w-[1100px] mx-auto flex items-center justify-center gap-10 flex-wrap">
          {[
            '✓ Free plan — no credit card',
            '✓ Send your first invoice in 2 minutes',
            '✓ PDF invoices with your branding',
            '✓ Automatic payment reminders',
          ].map((item) => (
            <span key={item} className="text-[13px] text-[var(--text-secondary)] font-medium">{item}</span>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="bg-[var(--surface-sunken)]">
        <div className="max-w-[1100px] mx-auto px-6 py-24">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-[var(--text-primary)] text-center mb-3 tracking-tight">
            Built around how you actually work.
          </h2>
          <p className="text-base text-[var(--text-secondary)] text-center mb-14 max-w-[520px] mx-auto">
            No bloat. Every feature earns its place.
          </p>

          <div className="flex flex-col gap-5">
            {/* Row 1 — wide left, narrow right */}
            <div className="grid gap-5 grid-cols-1 lg:grid-cols-[2fr_1fr]">
              <FeatureCard feature={features[0]} dark />
              <FeatureCard feature={features[1]} />
            </div>
            {/* Row 2 — narrow left, wide right */}
            <div className="grid gap-5 grid-cols-1 lg:grid-cols-[1fr_2fr]">
              <FeatureCard feature={features[2]} />
              <FeatureCard feature={features[3]} dark />
            </div>
            {/* Row 3 — three equal */}
            <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard feature={features[4]} />
              <FeatureCard feature={features[5]} />
              <FeatureCard feature={{ icon: Icons.Check, title: 'PDF Export', desc: 'Download any invoice as a professional PDF — ready to send or archive.' }} />
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div id="how-it-works" className="bg-[var(--surface-card)]">
        <div className="max-w-[1100px] mx-auto px-6 py-24">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-[var(--text-primary)] text-center mb-3 tracking-tight">
            Three steps. Zero confusion.
          </h2>
          <p className="text-base text-[var(--text-secondary)] text-center mb-14 max-w-[520px] mx-auto">
            You'll send your first invoice before finishing your coffee.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 relative">
            {/* Connecting line (desktop only) */}
            <div className="hidden sm:block absolute top-[19px] left-[16.66%] right-[16.66%] h-px bg-[var(--border-subtle)] z-0" />
            {[
              { n: 1, title: 'Create your account', desc: 'Sign up free and set up your business profile in minutes.' },
              { n: 2, title: 'Add your clients', desc: 'Import or add clients manually. We store everything securely.' },
              { n: 3, title: 'Send & get paid', desc: 'Create an invoice, send it, and watch the payments come in.' },
            ].map((step) => (
              <div key={step.n} className="relative z-[1] text-center px-6 mb-8 sm:mb-0">
                <div
                  className={`w-[38px] h-[38px] rounded-full flex items-center justify-center font-semibold text-[15px] mx-auto mb-5 relative z-[2] ${
                    step.n === 1
                      ? 'bg-[var(--surface-dark)] border-2 border-[var(--surface-dark)] text-white'
                      : 'bg-[var(--surface-page)] border-2 border-[var(--border-subtle)] text-[var(--text-primary)]'
                  }`}
                >
                  {step.n}
                </div>
                <div className="text-[15px] font-semibold text-[var(--text-primary)] mb-2">{step.title}</div>
                <div className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-[200px] mx-auto">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Comparison */}
      <div className="bg-[var(--surface-page)] px-6 py-24">
        <div className="max-w-[900px] mx-auto">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-[var(--text-primary)] text-center mb-3 tracking-tight">
            Finally, an invoicing tool that gets out of your way.
          </h2>
          <p className="text-base text-[var(--text-secondary)] text-center mb-12 max-w-[520px] mx-auto">
            You don't need a CFO to use InvoiceSaga.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Spreadsheets',  items: ['Manual formatting every time', 'No payment tracking', 'Looks unprofessional', 'No reminders'], highlight: false },
              { label: 'InvoiceSaga',   items: ['Invoice in under 2 minutes', 'Real-time payment tracking', 'Professional templates', 'Auto email reminders'], highlight: true },
              { label: 'Complex tools', items: ['Steep learning curve', 'Built for accountants', 'Expensive for freelancers', "Features you'll never use"], highlight: false },
            ].map(({ label, items, highlight }) => (
              <div
                key={label}
                className={`rounded-[var(--radius-lg)] px-6 py-7 ${
                  highlight
                    ? 'bg-[var(--surface-dark)]'
                    : 'bg-[var(--surface-card)] border border-[var(--border-subtle)]'
                }`}
              >
                <div className={`text-[15px] font-bold mb-5 ${highlight ? 'text-white' : 'text-[var(--text-primary)]'}`}>
                  {label}
                </div>
                {items.map((item, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2.5 mb-3.5 text-sm leading-snug ${
                      highlight ? 'text-white/75' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    <span
                      className={`font-bold flex-shrink-0 ${
                        highlight ? 'text-[var(--brand-300)]' : 'text-[var(--danger-600)]'
                      }`}
                    >
                      {highlight ? '✓' : '✗'}
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Social proof */}
      <div className="bg-[var(--surface-sunken)] px-6 py-20">
        <div className="max-w-[900px] mx-auto">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)] text-center mb-10 tracking-tight">
            Built for how freelancers actually work
          </h2>
          <div className="flex gap-6 justify-center flex-wrap">
            {[
              { headline: '2 min',    sub: 'Average time to send first invoice' },
              { headline: 'Free',     sub: 'Start invoicing with zero upfront cost' },
              { headline: '0 bloat',  sub: 'No accounting degree required' },
            ].map(({ headline, sub }) => (
              <div
                key={headline}
                className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] px-6 py-7 flex-1 min-w-[200px] max-w-[280px] text-center"
              >
                <div className="text-4xl font-semibold text-[var(--brand-600)] mb-2 leading-tight">{headline}</div>
                <div className="text-sm text-[var(--text-secondary)] leading-snug">{sub}</div>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-[var(--text-tertiary)] mt-8 m-0">
            Early access is open — no credit card required to start.
          </p>
        </div>
      </div>

      {/* Pricing */}
      <div id="pricing" className="bg-[var(--surface-sunken)]">
        <div className="max-w-[1100px] mx-auto px-6 py-24">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-[var(--text-primary)] text-center mb-3 tracking-tight">
            Simple, honest pricing
          </h2>
          <p className="text-base text-[var(--text-secondary)] text-center mb-4 max-w-[520px] mx-auto">
            Start free, upgrade when you need more.
          </p>
          <div className="text-center mb-10 text-sm text-[var(--text-tertiary)]">
            Free during beta · No credit card required · Cancel anytime
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-[700px] mx-auto">
            {/* Free */}
            <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-xl)] p-9">
              <div className="text-lg font-semibold text-[var(--text-primary)] mb-2">Free</div>
              <div className="text-4xl font-semibold text-[var(--text-primary)] mb-1">Free</div>
              <div className="text-sm text-[var(--text-tertiary)] mb-6">always free · no card needed</div>
              <ul className="list-none p-0 m-0 mb-8 flex flex-col gap-3">
                {['Up to 5 invoices/month', '2 clients', 'Basic templates', 'Email support'].map((item, i) => (
                  <li key={i} className="text-sm text-[var(--text-secondary)] flex items-center gap-2">
                    <span className="text-[var(--brand-600)] font-bold">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link to={ROUTES.SIGNUP} className="block">
                <Btn variant="outline" size="lg" className="w-full">Get started free</Btn>
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-[var(--surface-dark)] border-2 border-[var(--brand-600)] rounded-[var(--radius-xl)] p-9 relative">
              <div className="inline-block bg-[var(--brand-600)] text-white rounded-[var(--radius-sm)] px-2.5 py-0.5 text-[11px] font-semibold mb-4 tracking-wider">
                Most popular
              </div>
              <div className="text-lg font-semibold text-white mb-2">Pro</div>
              <div className="text-4xl font-semibold text-white mb-1">£9</div>
              <div className="text-sm text-white/50 mb-6">per month · cancel anytime</div>
              <ul className="list-none p-0 m-0 mb-8 flex flex-col gap-3">
                <li className="text-[13px] italic text-white/50 mb-1">Everything in Free, plus:</li>
                {['Unlimited invoices', 'Unlimited clients', 'Recurring invoices', 'Auto email reminders', 'Analytics & reports', 'Priority support'].map((item, i) => (
                  <li key={i} className="text-sm text-white/80 flex items-center gap-2">
                    <span className="text-[var(--brand-300)] font-bold">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link to={ROUTES.SIGNUP} className="block">
                <Btn variant="primary" size="lg" className="w-full">Start free trial</Btn>
              </Link>
            </div>
          </div>
          <div className="text-center mt-8 text-[13px] text-[var(--text-tertiary)]">
            Join during beta and lock in your price forever — no increases, ever.{' '}
            <Link to={ROUTES.SIGNUP} className="no-underline text-[var(--brand-600)] font-medium">
              Join the waitlist to lock it in →
            </Link>
          </div>
        </div>
      </div>

      {/* CTA */}
      <section className="bg-[var(--surface-dark)] px-6 py-24">
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            <div className="text-[11px] font-semibold tracking-widest uppercase text-white/60 mb-4">
              Ready when you are
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white mb-4 tracking-tight">
              Your invoices should work as hard as you do.
            </h2>
            <p className="text-base text-white/60 mb-10 leading-relaxed">
              Every day without a proper invoicing system is a day you're working harder than you need to. It takes 2 minutes to start.
            </p>
          </div>
          {/* Right */}
          <div className="flex flex-col items-start gap-4">
            <Link to={ROUTES.SIGNUP}>
              <Btn variant="primary" size="lg">Create your free account →</Btn>
            </Link>
            <div className="text-[13px] text-white/60">Free to start · No credit card · Cancel anytime</div>
            <div className="mt-2 flex items-center gap-8 flex-wrap">
              {[
                { n: '2 min',  label: 'to first invoice' },
                { n: 'Free',   label: 'to start, always' },
                { n: '£9/mo',  label: 'when you scale' },
              ].map(({ n, label }) => (
                <div key={label} className="text-left">
                  <div className="text-xl font-semibold text-white">{n}</div>
                  <div className="text-xs text-white/60">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <FaqSection />
      <SharedFooter />
    </div>
  );
}
