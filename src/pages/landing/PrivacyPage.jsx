import { Link } from 'react-router-dom';
import { ROUTES } from '../../router/routes';
import LegalLayout, { Section, P, UL, InfoCard } from './LegalLayout';

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="1 January 2025">

      <InfoCard>
        <strong>Summary:</strong> InvoiceSaga collects only the data needed to provide our invoicing service. We do not sell your data. All data is stored securely and you can request deletion at any time.
      </InfoCard>

      <Section title="1. Who We Are">
        <P>InvoiceSaga ("we", "us", "our") is an online invoicing platform for freelancers, agencies, and small businesses. Our registered address is InvoiceSaga Ltd, 123 Business Park, London, EC1A 1BB, United Kingdom.</P>
        <P>For privacy enquiries, contact us at: <strong>privacy@invoicesaga.com</strong></P>
      </Section>

      <Section title="2. Data We Collect">
        <P>We collect the following categories of personal data:</P>
        <UL items={[
          'Account information — name, email address, password (hashed), business name',
          'Billing & payment data — invoices you create, client details you enter, payment records',
          'Usage data — pages visited, features used, session duration (via anonymised analytics)',
          'Device & technical data — IP address, browser type, operating system',
          'Communications — support emails or messages you send us',
        ]} />
        <P>We do <strong>not</strong> collect sensitive personal data (health, biometric, financial account credentials).</P>
      </Section>

      <Section title="3. How We Use Your Data">
        <P>We use your personal data to:</P>
        <UL items={[
          'Provide and operate the InvoiceSaga service',
          'Process and store invoices, quotes, and payment records you create',
          'Send transactional emails (account verification, password reset, invoice delivery)',
          'Respond to support requests',
          'Improve and debug the platform using anonymised usage analytics',
          'Meet legal and regulatory obligations',
        ]} />
      </Section>

      <Section title="4. Legal Basis for Processing">
        <P>Under UK GDPR / EU GDPR, we rely on the following lawful bases:</P>
        <UL items={[
          'Contract performance — processing needed to deliver the service you signed up for',
          'Legitimate interests — security monitoring, fraud prevention, product improvement',
          'Legal obligation — retaining records required by law (e.g. financial records)',
          'Consent — marketing emails (you can withdraw consent at any time)',
        ]} />
      </Section>

      <Section title="5. Data Sharing">
        <P>We share your data only with trusted sub-processors necessary to operate the service:</P>
        <UL items={[
          'Cloud hosting providers (data stored in the UK/EU)',
          'Email delivery services (for sending invoices and notifications)',
          'Analytics providers (anonymised data only)',
          'Payment processors (if you use integrated payment features)',
          'AI processing — Anthropic (Claude API) for the optional AI Assistant feature (see Section 5a below)',
        ]} />
        <P>We <strong>never</strong> sell your data to third parties or share it for advertising purposes.</P>
      </Section>

      <Section title="5a. AI Assistant Data Processing">
        <P>InvoiceSaga offers an optional AI Assistant powered by Anthropic's Claude API. When you use this feature, the following <strong>minimised</strong> data is sent to Anthropic's servers:</P>
        <UL items={[
          'Your company name, currency, and tax rate',
          'Client first names and internal IDs (no email addresses or full names)',
          'Product/service names and units (no prices)',
          'Recent invoice numbers, statuses, and dates (no financial amounts)',
          'The text of your conversation with the assistant',
        ]} />
        <P><strong>Not shared:</strong> email addresses, phone numbers, bank details, full financial amounts, or any data from users who have not consented.</P>
        <P>Anthropic processes this data solely to generate responses and does <strong>not</strong> use it for model training. Data is transmitted over encrypted connections and is not retained by Anthropic beyond the API request. You must provide explicit consent before using the AI Assistant for the first time. You can revoke this consent at any time, which will disable the AI feature.</P>
        <P>Legal basis: <strong>Consent</strong> (Article 6(1)(a) GDPR). You can withdraw consent at any time by clearing your AI consent preference in the application.</P>
      </Section>

      <Section title="6. Data Retention">
        <P>We retain your account data for as long as your account is active. If you close your account, we delete your personal data within 30 days, except where we are required by law to retain certain records (e.g. financial records retained for 7 years under UK law).</P>
      </Section>

      <Section title="7. Your Rights">
        <P>Under UK/EU GDPR you have the right to:</P>
        <UL items={[
          'Access — request a copy of the data we hold about you',
          'Rectification — correct inaccurate or incomplete data',
          'Erasure — request deletion of your data ("right to be forgotten")',
          'Restriction — ask us to limit how we process your data',
          'Portability — receive your data in a machine-readable format',
          'Object — object to processing based on legitimate interests',
          'Withdraw consent — at any time for consent-based processing',
        ]} />
        <P>To exercise any of these rights, email <strong>privacy@invoicesaga.com</strong>. We will respond within 30 days. You also have the right to lodge a complaint with the Information Commissioner's Office (ICO) at ico.org.uk.</P>
      </Section>

      <Section title="8. Security">
        <P>We protect your data using industry-standard security measures including TLS encryption in transit, AES-256 encryption at rest, access controls, and regular security reviews. No method of transmission over the internet is 100% secure, but we take all reasonable steps to protect your information.</P>
      </Section>

      <Section title="9. Cookies">
        <P>We use cookies to operate the service and understand how it is used. For full details, please read our <Link to={ROUTES.COOKIES} className="text-[var(--info-600)] hover:text-[var(--info-700)]">Cookie Policy</Link>.</P>
      </Section>

      <Section title="10. Changes to This Policy">
        <P>We may update this Privacy Policy from time to time. We will notify you of significant changes by email or by displaying a notice within the application. Continued use of the service after changes constitutes acceptance of the updated policy.</P>
      </Section>

      <Section title="11. Contact">
        <P>For any privacy-related questions: <strong>privacy@invoicesaga.com</strong><br />For general enquiries: <strong>hello@invoicesaga.com</strong></P>
      </Section>

    </LegalLayout>
  );
}
