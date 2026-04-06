import React from 'react';
import LegalLayout, { Section, P, UL, InfoCard } from './LegalLayout';

export default function RefundPolicyPage() {
  return (
    <LegalLayout title="Refund Policy" lastUpdated="1 April 2026">

      <InfoCard color="#16A34A">
        <strong>Short version:</strong> We offer a <strong>14-day full refund</strong> on
        your first payment for any paid plan. After that window, monthly subscriptions
        are non-refundable but you keep access until the end of the billing period.
        Annual subscriptions cancelled within 30 days receive a pro-rated refund for
        unused months. We'll always do our best to make things right — just email us
        at <strong>support@invoicesaga.com</strong>.
      </InfoCard>

      <Section title="1. Overview">
        <P>
          InvoiceSaga is operated by InvoiceSaga Ltd ("we", "us", "our"), registered in
          England and Wales. This Refund Policy governs all purchases of InvoiceSaga
          subscription plans made through invoicesaga.com or any InvoiceSaga-owned
          checkout page.
        </P>
        <P>
          We want invoicing to be the easiest part of your freelance business — and that
          includes how we handle billing. This policy is written in plain English so you
          know exactly where you stand before, during, and after a purchase.
        </P>
        <P>
          Nothing in this policy affects your statutory rights under the UK Consumer
          Rights Act 2015 or applicable EU consumer protection legislation.
        </P>
      </Section>

      <Section title="2. Free Plan">
        <P>
          InvoiceSaga's Free plan carries no charge. There is nothing to refund, and you
          may cancel or delete your account at any time without penalty. Your data can be
          exported before deletion — see our{' '}
          <a href="/privacy" style={{ color: '#0EA5E9' }}>Privacy Policy</a> for details.
        </P>
      </Section>

      <Section title="3. 14-Day Money-Back Guarantee">
        <P>
          If you upgrade to a paid plan for the first time and are not satisfied for any
          reason, you may request a full refund within <strong>14 calendar days</strong> of
          your initial payment. No questions asked.
        </P>
        <P>This guarantee applies to:</P>
        <UL items={[
          'Your first-ever payment on any InvoiceSaga paid plan',
          'Monthly and annual subscriptions purchased directly through invoicesaga.com',
          'Upgrades from the Free plan to Pro',
        ]} />
        <P>This guarantee does <strong>not</strong> apply to:</P>
        <UL items={[
          'Subsequent renewal charges after your first billing cycle',
          'Subscription renewals following a previous cancellation and re-subscription',
          'Purchases made through third-party marketplaces (see Section 8)',
        ]} />
        <P>
          To request your refund, email{' '}
          <strong>support@invoicesaga.com</strong> from the address associated with your
          account and include the subject line "Refund Request". We will process all
          eligible refunds within <strong>5 business days</strong> of approval. The funds
          typically appear on your original payment method within 5–10 business days
          depending on your bank or card issuer.
        </P>
      </Section>

      <Section title="4. Monthly Subscriptions — After the 14-Day Window">
        <P>
          Monthly subscriptions are billed in advance for each 30-day period. After the
          14-day money-back guarantee window has passed:
        </P>
        <UL items={[
          'Charges for the current billing period are non-refundable.',
          'You may cancel at any time from within your account settings.',
          'On cancellation, your access continues until the end of the current paid period — you will not be charged again.',
          'No partial-month refunds are issued for early cancellation within a billing cycle.',
        ]} />
        <P>
          This approach is consistent with industry-standard SaaS billing (used by Xero,
          Sage, and QuickBooks) and means you always get the full service you paid for.
        </P>
      </Section>

      <Section title="5. Annual Subscriptions">
        <P>
          Annual subscriptions are billed upfront for a full 12-month period at a
          discounted rate. The following refund terms apply:
        </P>
        <UL items={[
          'Within 14 days of purchase: full refund (covered by our 14-day guarantee above).',
          'Between 15 and 30 days of purchase: pro-rated refund for the remaining unused full months, minus any discount applied.',
          'After 30 days: no refund is issued. Access continues until the annual period expires.',
        ]} />
        <P>
          <strong>Pro-rated refund calculation example:</strong> If you cancel an annual
          plan 45 days after purchase, the refund covers the remaining 10 complete months
          at the effective monthly rate.
        </P>
        <P>
          To request a pro-rated refund for an annual plan, contact us at{' '}
          <strong>support@invoicesaga.com</strong> within 30 days of your purchase date.
        </P>
      </Section>

      <Section title="6. Plan Downgrades">
        <P>
          If you downgrade from a paid plan to the Free plan mid-cycle:
        </P>
        <UL items={[
          'Your paid features remain active until the end of your current billing period.',
          'No partial refund is issued for the remainder of the period.',
          'You will not be charged again after the downgrade takes effect.',
        ]} />
      </Section>

      <Section title="7. Service Outages and Material Failures">
        <P>
          We aim for 99.9% uptime. If InvoiceSaga experiences a verified platform-wide
          outage lasting more than <strong>4 consecutive hours</strong>, we may at our
          discretion offer a pro-rated credit or partial refund for the affected period.
        </P>
        <P>
          If we materially remove or permanently discontinue a core feature that was
          available at the time you subscribed, we will notify you at least 30 days in
          advance and offer you the right to cancel with a pro-rated refund for the
          remaining unused period of your subscription.
        </P>
        <P>
          To request a service-related refund, please email{' '}
          <strong>support@invoicesaga.com</strong> within 21 days of the incident,
          including a description of the issue and your account email address.
        </P>
      </Section>

      <Section title="8. Third-Party Purchases">
        <P>
          If you purchase an InvoiceSaga subscription through a third-party marketplace
          or reseller, that provider's refund policy applies. We are unable to process
          refunds for purchases not made directly through invoicesaga.com. Please contact
          the original point of purchase for assistance.
        </P>
      </Section>

      <Section title="9. Promotional and Discounted Plans">
        <P>
          Subscriptions purchased at a promotional, early-access, or lifetime rate are
          subject to this policy unless explicitly stated otherwise in the promotional
          offer terms. Where a discount was applied at checkout, any pro-rated refund is
          calculated at the discounted rate actually paid, not the standard list price.
        </P>
      </Section>

      <Section title="10. How to Request a Refund">
        <P>Requesting a refund is straightforward:</P>
        <UL items={[
          'Email support@invoicesaga.com from the address linked to your InvoiceSaga account.',
          'Use the subject line: "Refund Request — [your account email]".',
          'Include your reason for requesting a refund (optional but helpful so we can improve).',
          'We will respond within 2 business days to confirm eligibility.',
          'Approved refunds are processed within 5 business days.',
          'Funds typically appear on your statement within 5–10 additional business days depending on your bank.',
        ]} />
        <P>
          We do not require you to jump through hoops. If your request falls within the
          terms above, we'll approve it promptly and without fuss.
        </P>
      </Section>

      <Section title="11. Chargebacks">
        <P>
          We encourage you to contact us before initiating a chargeback with your bank or
          card provider. Most billing concerns can be resolved quickly by emailing{' '}
          <strong>support@invoicesaga.com</strong>, and we'll respond faster than a bank
          dispute timeline.
        </P>
        <P>
          Where a chargeback is initiated without prior contact and the charge was valid
          under this policy, we reserve the right to suspend or terminate the associated
          account pending resolution.
        </P>
      </Section>

      <Section title="12. Your Statutory Rights">
        <P>
          If you are a consumer based in the United Kingdom or European Union, you have
          the right to cancel a digital service contract within 14 days of purchase under
          the UK Consumer Contracts Regulations 2013 and EU Directive 2011/83/EU ("cooling
          off period"). By accessing and using InvoiceSaga immediately after purchase, you
          acknowledge that you are requesting that we begin performance of the service
          before the end of the cancellation period, and that your right to a full refund
          under statute may be reduced proportionally to the service already provided.
        </P>
        <P>
          Our 14-day money-back guarantee (Section 3) is offered in addition to, and not
          instead of, your statutory rights. Nothing in this policy limits any rights you
          have under applicable consumer protection law.
        </P>
      </Section>

      <Section title="13. Changes to This Policy">
        <P>
          We may update this Refund Policy from time to time. If we make material changes,
          we will notify you by email at least 14 days before the changes take effect.
          Continued use of a paid InvoiceSaga subscription after the effective date
          constitutes acceptance of the updated policy.
        </P>
      </Section>

      <Section title="14. Contact Us">
        <P>
          For all refund requests and billing questions, please reach out to us at:
        </P>
        <P>
          <strong>Email:</strong>{' '}
          <a href="mailto:support@invoicesaga.com" style={{ color: '#D97706' }}>
            support@invoicesaga.com
          </a>
          <br />
          <strong>Response time:</strong> Within 2 business days (Mon–Fri, 9am–5pm GMT)
          <br />
          <strong>Post:</strong> InvoiceSaga Ltd, 123 Business Park, London, EC1A 1BB,
          United Kingdom
        </P>
        <P>
          We're a small team that genuinely cares about getting this right. If something
          went wrong, we want to know — and we want to fix it.
        </P>
      </Section>

    </LegalLayout>
  );
}
