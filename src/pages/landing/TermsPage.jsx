import React from 'react';
import LegalLayout, { Section, P, UL, InfoCard } from './LegalLayout';

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" lastUpdated="1 January 2025">

      <InfoCard color="#8B5CF6">
        <strong>Please read these terms carefully.</strong> By creating an account or using InvoiceSaga, you agree to be bound by these Terms of Service.
      </InfoCard>

      <Section title="1. Acceptance of Terms">
        <P>These Terms of Service ("Terms") govern your access to and use of the InvoiceSaga platform ("Service") operated by InvoiceSaga Ltd ("Company", "we", "us"). By registering for or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.</P>
      </Section>

      <Section title="2. Eligibility">
        <P>You must be at least 18 years old and capable of entering into a legally binding agreement to use InvoiceSaga. By using the Service, you represent and warrant that you meet these requirements. If you are using InvoiceSaga on behalf of a business, you represent that you have authority to bind that business to these Terms.</P>
      </Section>

      <Section title="3. Your Account">
        <UL items={[
          'You are responsible for maintaining the confidentiality of your account credentials.',
          'You must provide accurate and complete registration information.',
          'You are responsible for all activity that occurs under your account.',
          'You must notify us immediately at security@invoicesaga.com if you suspect unauthorised access.',
          'We reserve the right to suspend or terminate accounts that violate these Terms.',
        ]} />
      </Section>

      <Section title="4. Acceptable Use">
        <P>You agree not to use InvoiceSaga to:</P>
        <UL items={[
          'Violate any applicable law or regulation',
          'Create fraudulent invoices or engage in financial fraud',
          'Upload malware, viruses, or harmful code',
          'Attempt to gain unauthorised access to our systems or other users\' accounts',
          'Harvest or scrape data from the platform',
          'Resell or sublicense access to the Service without our written consent',
          'Use the Service in a way that could damage, disable, or impair it',
        ]} />
      </Section>

      <Section title="5. Subscription & Payments">
        <P>InvoiceSaga offers free and paid subscription plans. For paid plans:</P>
        <UL items={[
          'Fees are billed monthly or annually in advance.',
          'All fees are non-refundable except where required by law.',
          'We may change pricing with 30 days\' notice. Continued use constitutes acceptance.',
          'Failure to pay may result in suspension of your account.',
          'Prices shown exclude VAT/taxes where applicable.',
        ]} />
      </Section>

      <Section title="6. Your Data & Content">
        <P>You retain full ownership of all data and content you enter into InvoiceSaga (invoices, client information, etc.). By using the Service, you grant us a limited licence to store and process your data solely to provide the Service. We will not use your data for any other purpose. On account closure, you can export your data before deletion.</P>
      </Section>

      <Section title="7. Intellectual Property">
        <P>InvoiceSaga and all associated software, design, trademarks, and content are the exclusive property of InvoiceSaga Ltd. Nothing in these Terms grants you any rights in our intellectual property other than the right to use the Service as described herein.</P>
      </Section>

      <Section title="8. Availability & Uptime">
        <P>We aim to maintain 99.9% uptime but do not guarantee uninterrupted availability. Scheduled maintenance will be announced in advance where possible. We are not liable for losses arising from service interruptions, except where caused by our gross negligence.</P>
      </Section>

      <Section title="9. Limitation of Liability">
        <P>To the maximum extent permitted by law, InvoiceSaga Ltd shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill, arising from your use of or inability to use the Service.</P>
        <P>Our total aggregate liability for any claim arising from these Terms or use of the Service shall not exceed the total fees paid by you in the 12 months preceding the claim.</P>
      </Section>

      <Section title="10. Disclaimers">
        <P>The Service is provided "as is" and "as available" without warranties of any kind, express or implied. We do not warrant that the Service will be error-free or that defects will be corrected. InvoiceSaga does not provide legal, tax, or financial advice. You are responsible for ensuring your invoices and records comply with applicable laws and regulations in your jurisdiction.</P>
      </Section>

      <Section title="11. Termination">
        <P>You may close your account at any time from your account settings. We may terminate or suspend your access immediately, without notice, if you breach these Terms. Upon termination, your right to use the Service ceases immediately. Sections relating to intellectual property, disclaimers, limitation of liability, and governing law survive termination.</P>
      </Section>

      <Section title="12. Governing Law">
        <P>These Terms are governed by the laws of England and Wales. Any dispute arising from these Terms shall be subject to the exclusive jurisdiction of the courts of England and Wales.</P>
      </Section>

      <Section title="13. Changes to Terms">
        <P>We may modify these Terms at any time. We will provide at least 14 days' notice of material changes via email or in-app notification. Continued use after the effective date constitutes acceptance of the updated Terms.</P>
      </Section>

      <Section title="14. Contact">
        <P>For questions about these Terms: <strong>legal@invoicesaga.com</strong></P>
      </Section>

    </LegalLayout>
  );
}
