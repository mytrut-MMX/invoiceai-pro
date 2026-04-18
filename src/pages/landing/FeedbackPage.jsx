import { useState } from 'react';
import SharedNav from '../../components/SharedNav';
import SharedFooter from '../../components/SharedFooter';
import { Field, Input, Textarea, Select, Btn } from '../../components/atoms';

const CATEGORIES = ['Feature Request', 'Bug Report', 'Complaint', 'Billing Issue', 'General Feedback'];

const HOW_WE_HANDLE = [
  { icon: '💡', label: 'Feature request', desc: 'Got an idea? We build based on what users ask for.' },
  { icon: '🐛', label: 'Bug report',      desc: "Something broken? We'll fix it fast." },
  { icon: '😤', label: 'Complaint',       desc: 'Not happy? Tell us exactly what went wrong.' },
  { icon: '💬', label: 'General',         desc: "Anything else — we're listening." },
];

export default function FeedbackPage() {
  const [form, setForm] = useState({ name: '', email: '', category: 'Feature Request', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    setError('');
    if (!form.email) { setError('Email is required.'); return; }
    if (!/\S+@\S+\.\S+/.test(form.email)) { setError('Please enter a valid email address.'); return; }
    if (!form.message || !form.message.trim()) { setError('Message is required.'); return; }
    if (form.message.length > 4000) { setError('Message is too long (max 4000 characters).'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/feedback-submit', {
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
      <SharedNav activePage="feedback" />

      <div className="bg-[var(--surface-sunken)] border-b border-[var(--border-subtle)] px-[21px] sm:px-[34px] py-[55px] text-center">
        <h1 className="text-[34px] font-semibold text-[var(--text-primary)] mb-[13px] tracking-tight m-0">
          We want to hear from you
        </h1>
        <p className="text-[16px] text-[var(--text-secondary)] max-w-[520px] mx-auto m-0 leading-relaxed">
          Something broken? Have an idea? Not happy with something? Tell us — we read and respond to every message.
        </p>
      </div>

      <div className="max-w-[900px] mx-auto px-[21px] sm:px-[34px] py-[55px]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[21px]">

          {/* Left — How we handle feedback */}
          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-xl)] p-8 shadow-[0_2px_24px_rgba(0,0,0,0.06)]">
            <div className="text-lg font-bold text-[var(--text-primary)] mb-1.5">How we handle feedback</div>
            <div className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
              Every message is read by a real person. Here's what we can help with:
            </div>

            {HOW_WE_HANDLE.map(c => (
              <div key={c.label} className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0 text-lg bg-[var(--surface-sunken)]">
                  {c.icon}
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-[var(--text-secondary)] mb-0.5">{c.label}</div>
                  <div className="text-[13px] text-[var(--text-secondary)] leading-snug">{c.desc}</div>
                </div>
              </div>
            ))}

            <div className="mt-6 p-4 bg-[var(--brand-50)] rounded-[var(--radius-md)] border border-[var(--brand-100)]">
              <div className="text-[13px] font-semibold text-[var(--brand-700)] mb-1">Response Time</div>
              <div className="text-[13px] text-[var(--brand-700)] leading-snug">
                We aim to respond within <strong>2 business days</strong>. For urgent billing issues contact{' '}
                <a href="mailto:support@invoicesaga.com" className="text-[var(--brand-700)] font-semibold underline">
                  support@invoicesaga.com
                </a>{' '}
                directly.
              </div>
            </div>
          </div>

          {/* Right — Form */}
          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-xl)] p-8 shadow-[0_2px_24px_rgba(0,0,0,0.06)]">
            <div className="text-lg font-bold text-[var(--text-primary)] mb-1.5">Send feedback</div>
            <div className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">Fill in the form below and we'll get back to you.</div>

            {sent ? (
              <div className="bg-[var(--success-50)] border border-[var(--success-200)] rounded-[var(--radius-lg)] p-6 text-center">
                <div className="text-3xl mb-2.5">✅</div>
                <div className="text-base font-bold text-[var(--success-700)] mb-1.5">Message received</div>
                <div className="text-sm text-[var(--success-700)] leading-relaxed">
                  Thank you, <strong>{form.name || 'friend'}</strong>. We'll be in touch within 2 business days.
                </div>
              </div>
            ) : (
              <div>
                {error && (
                  <div className="bg-[var(--danger-50)] border border-[var(--danger-100)] rounded-[var(--radius-md)] px-3.5 py-2.5 text-[13px] text-[var(--danger-600)] mb-3">
                    {error}
                  </div>
                )}

                <Field label={<>Name <span className="text-[var(--text-tertiary)] font-normal">(optional)</span></>}>
                  <Input value={form.name} onChange={set('name')} placeholder="Your name (optional)" />
                </Field>

                <Field label="Email" required>
                  <Input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" />
                </Field>

                <Field label="Category" required>
                  <Select value={form.category} onChange={set('category')} options={CATEGORIES} />
                </Field>

                <Field label={<>Subject <span className="text-[var(--text-tertiary)] font-normal">(optional)</span></>}>
                  <Input value={form.subject} onChange={set('subject')} placeholder="Brief summary (optional)" maxLength={200} />
                </Field>

                <Field label="Message" required>
                  <Textarea value={form.message} onChange={set('message')} placeholder="Tell us everything — the more detail the better" rows={6} maxLength={4000} />
                  <div className="text-[11px] text-[var(--text-tertiary)] text-right mt-1">{form.message.length}/4000</div>
                </Field>

                <Btn onClick={handleSubmit} variant="dark" size="lg" disabled={loading} className="w-full mt-[34px]">
                  {loading ? 'Sending…' : 'Send feedback →'}
                </Btn>
              </div>
            )}
          </div>
        </div>
      </div>

      <SharedFooter links="full" />
    </div>
  );
}
