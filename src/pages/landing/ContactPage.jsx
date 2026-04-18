import { useState } from 'react';
import SharedNav from '../../components/SharedNav';
import SharedFooter from '../../components/SharedFooter';
import { Field, Input, Textarea, Select, Btn } from '../../components/atoms';

const SUBJECTS = ['General Inquiry', 'Feedback', 'Bug Report', 'Complaint', 'Billing', 'Other'];

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: 'General Inquiry', message: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.message) { setError('Email and message are required.'); return; }
    if (!/\S+@\S+\.\S+/.test(form.email)) { setError('Please enter a valid email address.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/contact-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[var(--surface-page)] min-h-screen">
      <SharedNav />

      {/* Hero */}
      <div className="bg-[var(--surface-sunken)] border-b border-[var(--border-subtle)] px-6 pt-16 pb-14 text-center">
        <h1 className="text-3xl sm:text-4xl font-semibold text-[var(--text-primary)] mb-3 tracking-tight m-0">Get in touch</h1>
        <p className="text-base text-[var(--text-secondary)] max-w-[480px] mx-auto m-0">
          We're here to help. Send us a message and we'll respond as soon as possible.
        </p>
      </div>

      <div className="max-w-[900px] mx-auto px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* Contact info */}
          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-xl)] p-8">
            <div className="text-lg font-bold text-[var(--text-primary)] mb-1.5">Contact Information</div>
            <div className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
              Reach out directly or use the form. We typically respond within 24 hours on business days.
            </div>

            {[
              { iconBg: 'bg-[var(--info-50)]',    icon: '✉️', label: 'Support & General',         href: 'mailto:support@invoicesaga.com' },
              { iconBg: 'bg-[var(--brand-50)]',   icon: '💬', label: 'Feedback & Suggestions',    href: 'mailto:support@invoicesaga.com?subject=Feedback' },
              { iconBg: 'bg-[var(--danger-50)]',  icon: '🚨', label: 'Complaints & Billing',      href: 'mailto:support@invoicesaga.com?subject=Complaint' },
            ].map(({ iconBg, icon, label, href }) => (
              <div key={label} className="flex items-start gap-3 mb-5">
                <div className={`w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0 text-lg ${iconBg}`}>{icon}</div>
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-[var(--text-secondary)] mb-0.5">{label}</div>
                  <a href={href} className="inline-flex items-center gap-2 text-[var(--brand-600)] hover:text-[var(--brand-700)] font-semibold text-[15px] no-underline">
                    support@invoicesaga.com
                  </a>
                </div>
              </div>
            ))}

            <div className="mt-8 p-4 bg-[var(--brand-50)] rounded-[var(--radius-md)] border border-[var(--brand-100)]">
              <div className="text-[13px] font-semibold text-[var(--brand-700)] mb-1">Response Time</div>
              <div className="text-[13px] text-[var(--brand-700)]">
                We aim to respond to all messages within <strong>24 hours</strong> on business days (Mon–Fri).
              </div>
            </div>
          </div>

          {/* Contact form */}
          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-xl)] p-8">
            <div className="text-lg font-bold text-[var(--text-primary)] mb-1.5">Send a Message</div>
            <div className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">Fill in the form below and we'll get back to you.</div>

            {sent ? (
              <div className="bg-[var(--success-50)] border border-[var(--success-200)] rounded-[var(--radius-lg)] p-5 text-center">
                <div className="text-3xl mb-2.5">✅</div>
                <div className="text-base font-bold text-[var(--success-700)] mb-1.5">Message sent!</div>
                <div className="text-sm text-[var(--success-700)]">
                  Thank you for reaching out. We'll reply to <strong>{form.email}</strong> as soon as possible.
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {error && (
                  <div className="bg-[var(--danger-50)] border border-[var(--danger-100)] rounded-[var(--radius-md)] px-3.5 py-2.5 text-[13px] text-[var(--danger-600)] mb-3">
                    {error}
                  </div>
                )}

                <Field label={<>Name <span className="text-[var(--text-tertiary)] font-normal">(optional)</span></>}>
                  <Input value={form.name} onChange={set('name')} placeholder="Your name" />
                </Field>

                <Field label="Email" required>
                  <Input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" />
                </Field>

                <Field label="Subject">
                  <Select value={form.subject} onChange={set('subject')} options={SUBJECTS} />
                </Field>

                <Field label="Message" required>
                  <Textarea value={form.message} onChange={set('message')} placeholder="Tell us how we can help…" rows={5} />
                </Field>

                <Btn type="submit" variant="dark" size="lg" disabled={loading} className="w-full mt-2">
                  {loading ? 'Sending…' : 'Send Message →'}
                </Btn>
              </form>
            )}
          </div>
        </div>
      </div>

      <SharedFooter />
    </div>
  );
}
