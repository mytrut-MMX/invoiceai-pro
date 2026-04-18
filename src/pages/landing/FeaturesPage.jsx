import { Link } from 'react-router-dom';
import { ROUTES } from '../../router/routes';
import SharedNav from '../../components/SharedNav';
import SharedFooter from '../../components/SharedFooter';
import { Btn } from '../../components/atoms';

const features = [
  { title: 'Create invoices in minutes',          desc: 'Open a new invoice, fill in your client details and line items, and hit send. Most freelancers send their first invoice in under 2 minutes.' },
  { title: 'PDF generation with your branding',   desc: 'Every invoice is exported as a clean, professional PDF with your logo and business details. No InvoiceSaga watermark on Pro.' },
  { title: 'Email delivery built in',             desc: 'Send invoices directly to clients from InvoiceSaga. No copy-pasting into Gmail. Track when they open it.' },
  { title: 'Payment status tracking',             desc: 'See at a glance which invoices are sent, viewed, paid, or overdue. No spreadsheet required.' },
  { title: 'Automatic payment reminders',         desc: 'Set it and forget it. InvoiceSaga sends polite reminders to clients before and after the due date. Pro feature.' },
  { title: 'Recurring invoices',                  desc: 'Bill the same client every month? Set up a recurring invoice and InvoiceSaga handles it automatically. Pro feature.' },
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
    <div className="m-0 bg-[var(--surface-page)] min-h-screen">
      <SharedNav activePage="features" />

      {/* Hero */}
      <section className="bg-[var(--surface-sunken)] px-[21px] sm:px-[34px] py-[55px] lg:py-[89px] text-center">
        <h1 className="text-[34px] lg:text-[55px] font-semibold text-[var(--text-primary)] mb-[21px] tracking-tight m-0">
          Everything you need to get paid. Nothing you don't.
        </h1>
        <p className="text-[16px] text-[var(--text-secondary)] m-0 leading-relaxed">
          Built for freelancers who bill clients — not for accountants.
        </p>
      </section>

      {/* Features detail */}
      <section className="max-w-[1280px] mx-auto px-[21px] sm:px-[34px] py-[55px] lg:py-[89px]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[34px]">
          {features.map((f) => (
            <div key={f.title} className="flex gap-[13px] items-start">
              <div className="w-[55px] h-[55px] rounded-[var(--radius-md)] bg-[var(--brand-600)] flex items-center justify-center flex-shrink-0">
                <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
                  <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fill="#fff" />
                </svg>
              </div>
              <div>
                <div className="text-[17px] font-semibold text-[var(--text-primary)] mt-[13px] mb-[8px]">{f.title}</div>
                <div className="text-[15px] text-[var(--text-secondary)] leading-relaxed">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section className="bg-[var(--surface-sunken)] px-[21px] sm:px-[34px] py-[55px] lg:py-[89px]">
        <h2 className="text-[34px] font-semibold text-[var(--text-primary)] text-center mb-[55px] tracking-tight m-0">
          Why not just use a spreadsheet?
        </h2>
        <div className="max-w-[720px] mx-auto rounded-[var(--radius-lg)] overflow-hidden border border-[var(--border-subtle)]">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[var(--surface-card)]">
                <th className="text-left px-5 py-3.5 text-sm font-semibold text-[var(--text-primary)] border-b border-[var(--border-subtle)]"> </th>
                <th className="text-center px-5 py-3.5 text-sm font-semibold text-[var(--text-secondary)] border-b border-[var(--border-subtle)] w-[140px]">Spreadsheet</th>
                <th className="text-center px-5 py-3.5 text-sm font-semibold text-[var(--text-primary)] border-b border-[var(--border-subtle)] w-[140px]">InvoiceSaga</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, i) => (
                <tr key={row} className={i % 2 === 0 ? 'bg-[var(--surface-sunken)]' : 'bg-[var(--surface-card)]'}>
                  <td className="px-5 py-3.5 text-sm text-[var(--text-secondary)] border-b border-[var(--border-subtle)]">{row}</td>
                  <td className="text-center px-5 py-3.5 text-base text-[var(--danger-600)] font-bold border-b border-[var(--border-subtle)]">✗</td>
                  <td className="text-center px-5 py-3.5 text-base text-[var(--brand-600)] font-bold border-b border-[var(--border-subtle)]">✓</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-[var(--surface-dark)] px-[21px] sm:px-[34px] py-[55px] lg:py-[89px] text-center">
        <h2 className="text-[34px] font-semibold text-white mb-[13px] tracking-tight m-0">
          Start sending professional invoices today.
        </h2>
        <p className="text-[15px] text-white/60 mb-[34px] m-0">
          Free to start — no credit card required.
        </p>
        <Link to={ROUTES.SIGNUP}>
          <Btn variant="primary" size="lg">Create your free account</Btn>
        </Link>
      </section>

      <SharedFooter />
    </div>
  );
}
