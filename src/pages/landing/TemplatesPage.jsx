import { useEffect } from 'react';
import './TemplatesPage.css';

const features = [
  { icon: '📄', title: 'Quote & Invoice Modes',    desc: 'Switch between Quote and Invoice with one click. Convert a quote to an invoice instantly when the job is done.' },
  { icon: '⬇️',  title: 'Save as PDF',             desc: 'Export a pixel-perfect PDF directly from your browser. No extra software or printing required.' },
  { icon: '🌍', title: 'Multi-Currency',           desc: 'Choose from dozens of currencies. Amounts are formatted correctly and displayed on your document.' },
  { icon: '🏷️', title: 'Tax & Discount',          desc: 'Add VAT/GST rates, apply percentage or fixed discounts, and see totals update in real time.' },
  { icon: '🖼️', title: 'Logo Upload',             desc: 'Upload your company logo and it appears on every document. Resize it to match your brand.' },
  { icon: '💾', title: 'Autosave Draft',           desc: 'Your work is saved automatically to your browser. Come back later and pick up exactly where you left off.' },
  { icon: '📅', title: 'Due Dates & Terms',        desc: 'Set issue dates, due dates, and payment terms. Add notes and custom footer text to every document.' },
  { icon: '🔒', title: '100% Offline',             desc: "It's a single .html file. Your data never leaves your device — no servers, no accounts, no tracking." },
  { icon: '⚡', title: 'Instant & Lightweight',   desc: 'Opens in any browser on any device. No install, no loading screens. Ready the moment you open it.' },
];

const steps = [
  { n: 1, title: 'Purchase once',        desc: "Pay once and you'll receive the .html file instantly. No subscription, no renewal, ever." },
  { n: 2, title: 'Open in your browser', desc: 'Double-click the file to open it. Works in Chrome, Firefox, Safari, Edge — any modern browser.' },
  { n: 3, title: 'Fill in your details', desc: 'Enter your company info, client details, line items, currency, and any notes.' },
  { n: 4, title: 'Save & send',          desc: 'Export a polished PDF with one click. Send it to your client directly from your downloads folder.' },
];

const included = [
  'Fill in all company & client details',
  'Add unlimited line items',
  'Switch Quote / Invoice mode',
  'Multi-currency, logo, VAT & discount',
  'Live document preview',
];

const lockedInDemo = ['Save as PDF', 'Print document', 'Download & keep the file'];

const pricingFeatures = [
  'Full invoice & quote generator',
  'Save as PDF — unlimited',
  'Print & download',
  'Works 100% offline',
  'Logo, multi-currency, VAT, discounts',
  'Autosave draft in browser',
  'Single .html file — no install needed',
  'Instant delivery after purchase',
];

export default function TemplatesPage() {
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('tp-visible'); obs.unobserve(e.target); }
      }),
      { threshold: 0.12 }
    );
    document.querySelectorAll('.tp-reveal').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="tp-root">

      {/* NAV */}
      <nav className="tp-nav">
        <a href="/" className="tp-nav-logo">Invoice<span>Saga</span></a>
        <div className="tp-nav-links">
          <a href="#features"     className="tp-nav-link">Features</a>
          <a href="#how-it-works" className="tp-nav-link">How it works</a>
          <a href="#pricing"      className="tp-nav-link">Pricing</a>
          <a href="/demo"       className="tp-nav-link tp-nav-cta">Try Demo →</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="tp-hero">
        <div className="tp-hero-badge">
          <span className="tp-badge-dot" />
          No login · No subscription · 100% offline
        </div>
        <h1>Create beautiful<br /><em>invoices &amp; quotes</em><br />in seconds</h1>
        <p className="tp-hero-sub">
          A single HTML file that lives in your browser. Fill in your details, generate a professional PDF — done.
        </p>
        <div className="tp-hero-actions">
          <a href="/demo" className="tp-btn-primary">▶ Try the Live Demo</a>
          <a href="#pricing" className="tp-btn-secondary">See Pricing</a>
        </div>
        <p className="tp-hero-note">✓ No account required &nbsp;·&nbsp; ✓ Works without internet &nbsp;·&nbsp; ✓ One-time purchase</p>

        {/* Browser Mockup */}
        <div className="tp-mockup">
          <div className="tp-mockup-bar">
            <span className="tp-dot tp-dot-r" /><span className="tp-dot tp-dot-y" /><span className="tp-dot tp-dot-g" />
            <div className="tp-mockup-url">🔒 invoicesaga.com/demo</div>
          </div>
          <div className="tp-mockup-content">
            <div className="tp-mock-topbar">
              <div>
                <div className="tp-mock-title">InvoiceSaga</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Offline, single-file, editable generator</div>
              </div>
              <div className="tp-mock-btns">
                <div className="tp-mock-btn" style={{ width: 90 }} />
                <div className="tp-mock-btn tp-mock-btn-blue" style={{ width: 80 }} />
                <div className="tp-mock-btn tp-mock-btn-green" style={{ width: 70 }} />
              </div>
            </div>
            <div className="tp-mock-grid">
              <div className="tp-mock-card">
                <div className="tp-mock-label" />
                <div className="tp-mock-input" />
                <div className="tp-mock-input" style={{ marginTop: 4 }} />
                <div className="tp-mock-row" style={{ marginTop: 4 }}>
                  <div className="tp-mock-input" /><div className="tp-mock-input" />
                </div>
              </div>
              <div className="tp-mock-card">
                <div className="tp-mock-label" style={{ width: '50%' }} />
                <div className="tp-mock-input" />
                <div className="tp-mock-input" style={{ marginTop: 4 }} />
                <div className="tp-mock-row" style={{ marginTop: 4 }}>
                  <div className="tp-mock-input" /><div className="tp-mock-amount" />
                </div>
              </div>
            </div>
            <div className="tp-mock-total-row">
              <div className="tp-mock-total-label">TOTAL DUE</div>
              <div className="tp-mock-total-value">$2,450.00</div>
            </div>
          </div>
          <div className="tp-mockup-overlay">
            <a href="/demo" className="tp-btn-primary" style={{ fontSize: 13, padding: '11px 22px' }}>Open Full Demo →</a>
            <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>Fully interactive · No signup needed</span>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="tp-section" id="features">
        <p className="tp-section-label tp-reveal">Everything you need</p>
        <h2 className="tp-section-title tp-reveal">Built for freelancers &amp; small businesses</h2>
        <div className="tp-features-grid">
          {features.map((f, i) => (
            <div key={i} className="tp-feature-card tp-reveal">
              <div className="tp-feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="tp-how-section" id="how-it-works">
        <div className="tp-how-inner">
          <p className="tp-section-label tp-reveal">Simple by design</p>
          <h2 className="tp-section-title tp-reveal">From zero to invoice in under a minute</h2>
          <div className="tp-steps">
            {steps.map(s => (
              <div key={s.n} className="tp-step tp-reveal">
                <div className="tp-step-num">{s.n}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEMO CTA */}
      <div className="tp-demo-cta-wrap">
        <div className="tp-demo-cta-text tp-reveal">
          <h2>Try it before you buy it</h2>
          <p>
            The live demo is fully functional — fill in your details, add line items, change the currency and preview the result.
            PDF export is unlocked in the full version.
          </p>
          <a href="/demo" className="tp-btn-primary">▶ Open Live Demo</a>
        </div>
        <div className="tp-demo-cta-visual tp-reveal">
          <p className="tp-dcv-label">Demo vs Full version</p>
          <ul className="tp-dcv-list">
            {included.map((item, i) => (
              <li key={i}><span className="tp-dcv-icon tp-dcv-icon-yes">✓</span>{item}</li>
            ))}
            <hr className="tp-dcv-divider" />
            {lockedInDemo.map((item, i) => (
              <li key={i}><span className="tp-dcv-icon tp-dcv-icon-no">🔒</span>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* PRICING */}
      <section className="tp-pricing-section" id="pricing">
        <div className="tp-pricing-inner">
          <p className="tp-section-label tp-reveal" style={{ textAlign: 'center' }}>Simple pricing</p>
          <h2 className="tp-section-title tp-reveal" style={{ textAlign: 'center', margin: '0 auto' }}>
            One price.<br />Yours forever.
          </h2>
          <div className="tp-pricing-card tp-reveal">
            <div className="tp-pricing-badge">✓ One-time purchase</div>
            <div className="tp-pricing-price"><sup>£</sup>5.99</div>
            <p className="tp-pricing-note">Pay once — use forever. No subscription, ever.</p>
            <hr className="tp-pricing-divider" />
            <ul className="tp-pricing-features">
              {pricingFeatures.map((f, i) => (
                <li key={i}><span className="tp-ck">✓</span>{f}</li>
              ))}
            </ul>
            <a href="https://invoicesaga.lemonsqueezy.com/checkout/buy/ddb25220-5d21-4641-b2b0-98cdd1b02062?embed=1" className="tp-btn-buy lemonsqueezy-button">Buy it now →</a>
            <script src="https://assets.lemonsqueezy.com/lemon.js" defer></script>
            <p className="tp-pricing-guarantee">🔒 Secure payment · Instant download · No subscription</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="tp-footer">
        <p>
          <strong>InvoiceSaga</strong> &nbsp;·&nbsp;
          <a href="/demo">Try Demo</a> &nbsp;·&nbsp;
          <a href="#pricing">Buy</a> &nbsp;·&nbsp;
          <a href="mailto:hello@invoicesaga.com">Contact</a>
        </p>
        <p>© {new Date().getFullYear()} InvoiceSaga. All rights reserved.</p>
      </footer>

    </div>
  );
}
