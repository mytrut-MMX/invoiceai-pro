import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../router/routes';
import './TemplatesPage.css';
import SharedNav from '../../components/SharedNav';
import SharedFooter from '../../components/SharedFooter';

const compareRows = [
  { feature: 'Quote & Invoice modes',           general: true,  construction: true  },
  { feature: 'Save as PDF',                     general: true,  construction: true  },
  { feature: 'Print document',                  general: true,  construction: true  },
  { feature: 'Multi-currency',                  general: true,  construction: true  },
  { feature: 'Logo upload',                     general: true,  construction: true  },
  { feature: 'VAT / GST',                       general: true,  construction: true  },
  { feature: 'Discounts (% or fixed)',           general: true,  construction: true  },
  { feature: 'Autosave draft',                  general: true,  construction: true  },
  { feature: '100% offline',                    general: true,  construction: true  },
  { feature: 'CIS deductions (NET / GROSS)',    general: false, construction: true, highlight: true },
  { feature: 'Domestic Reverse Charge VAT',     general: false, construction: true, highlight: true },
  { feature: 'Materials & Plant / CIS Exempt lines', general: false, construction: true, highlight: true },
  { feature: 'UTR / CIS Reference number',      general: false, construction: true, highlight: true },
];

const faqs = [
  {
    q: 'What do I get after purchasing?',
    a: "You'll receive a single .html file via email immediately after payment. Open it in any browser — Chrome, Firefox, Safari, Edge — and it works instantly, no installation required.",
  },
  {
    q: 'Does it work without internet?',
    a: "Yes, completely. Once you have the file, it works 100% offline. Your data never leaves your device.",
  },
  {
    q: 'Who is the Construction template for?',
    a: "UK subcontractors and sole traders working under the Construction Industry Scheme (CIS). It handles NET (20% deduction), GROSS registration, Domestic Reverse Charge VAT, and CIS-exempt materials lines automatically.",
  },
  {
    q: 'Can I buy both templates?',
    a: "Yes — each template is a separate purchase. If you do both types of work, you can use whichever is appropriate per job.",
  },
  {
    q: 'Is there a subscription?',
    a: "No. You pay once and the file is yours forever. No renewals, no account, no monthly fees.",
  },
];

export default function TemplatesPage() {
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('tp-visible'); obs.unobserve(e.target); }
      }),
      { threshold: 0.1 }
    );
    document.querySelectorAll('.tp-reveal').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--surface-page)]">
      <SharedNav activePage="templates" />

      <div className="max-w-[960px] mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-10 lg:py-12 box-border">

      {/* PAGE HERO */}
      <section className="tp-page-hero">
        <div className="tp-breadcrumb">
          <Link to={ROUTES.LANDING}>Home</Link>
          <span>›</span>
          <span>Templates</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--text-primary)] m-0 mb-2 tracking-tight">Invoice Templates</h1>
        <p className="text-sm text-[var(--text-secondary)] m-0 mb-8 leading-relaxed">Customize your template, then download or send directly from your account.</p>
      </section>

      {/* TEMPLATES GRID */}
      <section className="tp-templates-section">
        <p className="tp-templates-count">2 templates available</p>
        <div className="tp-templates-grid">

          {/* CARD 1: General Freelancer */}
          <div className="tp-template-card">
            <div className="tp-card-preview">
              <div className="tp-preview-badge">
                <span className="tp-pbadge tp-pbadge-blue">Bestseller</span>
                <span className="tp-pbadge tp-pbadge-green">All industries</span>
              </div>
              <div className="tp-mini-topbar">
                <div>
                  <div className="tp-mini-title">InvoiceSaga</div>
                  <div className="tp-mini-subtitle">Quote / Invoice Generator</div>
                </div>
                <div className="tp-mini-btns">
                  <div className="tp-mini-btn" style={{ width: 64, background: '#0f172a' }} />
                  <div className="tp-mini-btn" style={{ width: 54, background: '#0d6efd' }} />
                  <div className="tp-mini-btn" style={{ width: 50, background: '#16a34a' }} />
                </div>
              </div>
              <div className="tp-mini-grid">
                <div className="tp-mini-card">
                  <div className="tp-mini-lbl" style={{ width: '55%' }} />
                  <div className="tp-mini-inp" />
                  <div className="tp-mini-inp" style={{ marginTop: 4 }} />
                  <div className="tp-mini-row" style={{ marginTop: 4 }}>
                    <div className="tp-mini-inp" /><div className="tp-mini-inp" />
                  </div>
                </div>
                <div className="tp-mini-card">
                  <div className="tp-mini-lbl" style={{ width: '45%' }} />
                  <div className="tp-mini-inp" />
                  <div className="tp-mini-inp" style={{ marginTop: 4 }} />
                  <div className="tp-mini-row" style={{ marginTop: 4 }}>
                    <div className="tp-mini-inp" />
                    <div className="tp-mini-inp" style={{ maxWidth: 60, background: '#f0f4fa' }} />
                  </div>
                </div>
              </div>
              <div className="tp-mini-total">
                <span className="tp-mini-total-label">TOTAL DUE</span>
                <span className="tp-mini-total-value">£ 2,450.00</span>
              </div>
            </div>
            <div className="tp-card-body">
              <div className="tp-card-tag tp-tag-general">General Purpose</div>
              <h2>Invoice &amp; Quote Generator</h2>
              <p className="tp-card-desc">The all-purpose invoice and quote tool for freelancers, consultants, and any small business. Switch between Quote and Invoice mode, export PDF, and autosave your draft.</p>
              <div className="tp-feature-pills">
                {['Quote & Invoice modes','Save as PDF','Multi-currency','Logo upload','VAT & discount','Autosave draft','100% offline','Single .html file'].map(f => (
                  <span key={f} className="tp-pill"><span className="tp-pill-ck">✓</span>{f}</span>
                ))}
              </div>
              <div className="tp-card-footer">
                <div className="tp-card-price">
                  <div className="tp-price-amount">£5.99</div>
                  <div className="tp-price-note">One-time · no subscription</div>
                </div>
                <div className="tp-card-actions">
                  {/* /demo is a standalone static product file, not a React route */}
                  <a href="/demo" className="tp-btn-demo">▶ Live Demo</a>
                  <a
                    href="https://invoicesaga.lemonsqueezy.com/checkout/buy/ddb25220-5d21-4641-b2b0-98cdd1b02062?embed=1"
                    className="tp-btn-card-buy lemonsqueezy-button"
                  >
                    Buy Now →
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 2: Construction CIS */}
          <div className="tp-template-card" style={{ animationDelay: '0.1s' }}>
            <div className="tp-card-preview">
              <div className="tp-preview-badge">
                <span className="tp-pbadge tp-pbadge-orange">UK Construction</span>
                <span className="tp-pbadge tp-pbadge-blue">CIS &amp; DRC VAT</span>
              </div>
              <div className="tp-mini-topbar">
                <div>
                  <div className="tp-mini-title">Construction Invoice</div>
                  <div className="tp-mini-subtitle">CIS &amp; Domestic Reverse Charge VAT</div>
                </div>
                <div className="tp-mini-btns">
                  <div className="tp-mini-btn" style={{ width: 64, background: '#0f172a' }} />
                  <div className="tp-mini-btn" style={{ width: 54, background: '#0d6efd' }} />
                  <div className="tp-mini-btn" style={{ width: 50, background: '#16a34a' }} />
                </div>
              </div>
              <div className="tp-mini-grid">
                <div className="tp-mini-card">
                  <div className="tp-mini-lbl" style={{ width: '60%' }} />
                  <div className="tp-mini-inp" />
                  <div className="tp-mini-row" style={{ marginTop: 4 }}>
                    <div className="tp-mini-inp" style={{ flex: 1 }} />
                    <div className="tp-mini-cis-net">NET 20%</div>
                  </div>
                </div>
                <div className="tp-mini-card">
                  <div className="tp-mini-lbl" style={{ width: '50%' }} />
                  <div className="tp-mini-contractor">Contractor (DRC applies)</div>
                  <div className="tp-mini-inp" style={{ marginTop: 4 }} />
                </div>
              </div>
              <div className="tp-mini-cis-row">
                <span className="tp-mini-cis-label">CIS Deduction (20%)</span>
                <span className="tp-mini-cis-value">- £180.00</span>
              </div>
              <div className="tp-mini-drc-box">
                ⚠ Domestic Reverse Charge — VAT Act 1994, s.55A — Customer accounts for VAT
              </div>
            </div>
            <div className="tp-card-body">
              <div className="tp-card-tag tp-tag-construction">UK Construction Industry</div>
              <h2>Construction Invoice Generator</h2>
              <p className="tp-card-desc">Purpose-built for UK subcontractors and contractors. Handles CIS deductions (NET/GROSS), Domestic Reverse Charge VAT, and CIS-exempt materials lines automatically.</p>
              <div className="tp-feature-pills">
                {['CIS NET / GROSS','DRC VAT (s.55A)','Materials CIS Exempt','UTR / CIS Ref','Save as PDF','Logo upload','100% offline','Single .html file'].map(f => (
                  <span key={f} className="tp-pill"><span className="tp-pill-ck">✓</span>{f}</span>
                ))}
              </div>
              <div className="tp-card-footer">
                <div className="tp-card-price">
                  <div className="tp-price-amount">£11.99</div>
                  <div className="tp-price-note">One-time · no subscription</div>
                </div>
                <div className="tp-card-actions">
                  {/* /demo-construction is a standalone static product file, not a React route */}
                  <a href="/demo-construction" className="tp-btn-demo">▶ Live Demo</a>
                  <a href="#" className="tp-btn-card-buy">Buy Now →</a>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section className="tp-compare-section">
        <div className="tp-compare-inner">
          <p className="tp-section-label tp-reveal">Side by side</p>
          <h2 className="tp-compare-title tp-reveal">Which template do I need?</h2>
          <table className="tp-compare-table tp-reveal">
            <thead>
              <tr>
                <th>Feature</th>
                <th className="tp-col-header">General<br /><span style={{ fontWeight: 500, color: 'var(--muted)', fontSize: 12 }}>£5.99</span></th>
                <th className="tp-col-header">Construction<br /><span style={{ fontWeight: 500, color: 'var(--muted)', fontSize: 12 }}>£11.99</span></th>
              </tr>
            </thead>
            <tbody>
              {compareRows.map((row, i) => (
                <tr key={i} style={row.highlight ? { background: '#fff7ed' } : {}}>
                  <td>{row.highlight ? <strong>{row.feature}</strong> : row.feature}</td>
                  <td>{row.general  ? <span className="tp-yes">✓</span> : <span className="tp-no">—</span>}</td>
                  <td>{row.construction ? <span className="tp-yes">✓</span> : <span className="tp-no">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="tp-faq-section">
        <h2 className="tp-faq-title tp-reveal">Common questions</h2>
        {faqs.map((item, i) => (
          <div key={i} className="tp-faq-item tp-reveal">
            <p className="tp-faq-q">{item.q}</p>
            <p className="tp-faq-a">{item.a}</p>
          </div>
        ))}
      </section>

      <script src="https://assets.lemonsqueezy.com/lemon.js" defer />
      </div>

      <SharedFooter />
    </div>
  );
}
