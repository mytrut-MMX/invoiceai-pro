import { Link } from 'react-router-dom';
import { ROUTES } from '../../router/routes';
import SharedNav from '../../components/SharedNav';
import SharedFooter from '../../components/SharedFooter';

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
    excerpt: "Late payments are part of freelancing, but awkward emails don't have to be. Here's a step-by-step approach to following up firmly and professionally.",
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
    <div className="m-0 bg-[var(--surface-page)] min-h-screen">
      <SharedNav activePage="blog" />

      {/* Hero */}
      <section className="bg-[var(--surface-sunken)] px-[21px] sm:px-[34px] py-[55px] lg:py-[89px] text-center">
        <h1 className="text-[34px] lg:text-[55px] font-semibold text-[var(--text-primary)] mb-[21px] tracking-tight m-0">
          Invoicing advice for freelancers
        </h1>
        <p className="text-[16px] text-[var(--text-secondary)] m-0 leading-relaxed">
          Practical guides to help you invoice better, chase less, and get paid faster.
        </p>
      </section>

      {/* Article grid */}
      <section className="max-w-[1280px] mx-auto px-[21px] sm:px-[34px] py-[55px] lg:py-[89px]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[21px]">
          {articles.map((a) => (
            <div
              key={a.title}
              className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-[21px] flex flex-col"
            >
              <span className="inline-block self-start bg-[var(--brand-50)] text-[var(--brand-700)] rounded-[var(--radius-sm)] px-2.5 py-0.5 text-[11px] font-semibold tracking-wider uppercase mb-[13px]">
                {a.tag}
              </span>
              <h2 className="text-lg font-semibold text-[var(--text-primary)] m-0 mt-[8px] leading-snug">
                {a.title}
              </h2>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed m-0 mt-[13px] mb-[21px] flex-1">{a.excerpt}</p>
              <Link
                to={a.to}
                className="text-sm font-semibold text-[var(--brand-600)] hover:text-[var(--brand-700)] no-underline"
              >
                Read article →
              </Link>
            </div>
          ))}
        </div>
      </section>

      <SharedFooter />
    </div>
  );
}
