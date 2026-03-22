import React from 'react';
import LegalLayout, { Section, P, UL, InfoCard } from './LegalLayout';

function RightCard({ title, color, children }) {
  return (
    <div style={{ background: '#fff', border: `1.5px solid ${color}30`, borderLeft: `4px solid ${color}`, borderRadius: 8, padding: '14px 18px', marginBottom: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.65 }}>{children}</div>
    </div>
  );
}

export default function GdprPage() {
  return (
    <LegalLayout title="GDPR Compliance" lastUpdated="1 January 2025">

      <InfoCard color="#0EA5E9">
        <strong>InvoiceSaga is committed to GDPR compliance.</strong> We act as a <strong>data processor</strong> when processing data you enter about your clients, and as a <strong>data controller</strong> for your account and usage data. This page explains how we comply with the UK GDPR and EU GDPR.
      </InfoCard>

      <Section title="1. Scope & Applicability">
        <P>The UK General Data Protection Regulation (UK GDPR) and the EU General Data Protection Regulation (EU GDPR 2016/679) apply to the processing of personal data of individuals in the United Kingdom and European Union. InvoiceSaga is designed to help you comply with these regulations when using our platform to manage invoices and client data.</P>
      </Section>

      <Section title="2. Roles: Controller vs. Processor">
        <P><strong>InvoiceSaga as Data Controller:</strong> We are the data controller of your account information (name, email, billing details) and your usage data. We determine the purposes and means of processing this data.</P>
        <P><strong>InvoiceSaga as Data Processor:</strong> When you enter your clients' personal data into InvoiceSaga (names, addresses, email addresses), we process that data on your behalf. You remain the data controller for your clients' data. You should ensure you have a valid legal basis for storing your clients' data in our platform.</P>
        <P>A Data Processing Agreement (DPA) is available upon request for business customers who require one. Contact us at <strong>privacy@invoicesaga.com</strong>.</P>
      </Section>

      <Section title="3. Your Rights Under GDPR">
        <P>As a data subject, you have the following rights. To exercise any of them, contact us at <strong>privacy@invoicesaga.com</strong>. We will respond within <strong>30 days</strong>.</P>

        <RightCard title="Right of Access (Art. 15)" color="#0EA5E9">
          You have the right to obtain confirmation of whether we process your personal data and to receive a copy of that data, along with information about how it is processed.
        </RightCard>
        <RightCard title="Right to Rectification (Art. 16)" color="#8B5CF6">
          You have the right to correct inaccurate personal data we hold about you without undue delay. You can update most of your data directly from your account settings.
        </RightCard>
        <RightCard title="Right to Erasure (Art. 17)" color="#EF4444">
          You have the right to request deletion of your personal data ("right to be forgotten") where it is no longer necessary for the purpose it was collected, or where you withdraw consent. We will erase your data within 30 days, subject to legal retention requirements.
        </RightCard>
        <RightCard title="Right to Restriction (Art. 18)" color="#F59E0B">
          You have the right to request that we restrict the processing of your personal data in certain circumstances — for example, while a dispute about data accuracy is resolved.
        </RightCard>
        <RightCard title="Right to Data Portability (Art. 20)" color="#10B981">
          You have the right to receive your personal data in a structured, commonly used, machine-readable format (JSON or CSV) and to transmit it to another controller. You can export your data at any time from your account settings.
        </RightCard>
        <RightCard title="Right to Object (Art. 21)" color="#0F172A">
          You have the right to object to processing of your personal data based on legitimate interests. We will cease processing unless we can demonstrate compelling legitimate grounds that override your interests.
        </RightCard>
        <RightCard title="Right to Withdraw Consent (Art. 7)" color="#64748B">
          Where processing is based on your consent (e.g. marketing emails), you can withdraw consent at any time without affecting the lawfulness of processing before withdrawal.
        </RightCard>
      </Section>

      <Section title="4. Lawful Basis for Processing">
        <P>We rely on the following lawful bases under Article 6 UK/EU GDPR:</P>
        <UL items={[
          'Art. 6(1)(b) — Contract: processing necessary to perform our service agreement with you',
          'Art. 6(1)(c) — Legal obligation: retaining financial records as required by law',
          'Art. 6(1)(f) — Legitimate interests: security monitoring, fraud prevention, product improvement',
          'Art. 6(1)(a) — Consent: marketing communications (you may opt out at any time)',
        ]} />
      </Section>

      <Section title="5. International Data Transfers">
        <P>Your data is primarily stored on servers located in the United Kingdom and/or European Economic Area (EEA). If any data is transferred outside the UK/EEA, we ensure appropriate safeguards are in place, such as:</P>
        <UL items={[
          'UK adequacy regulations or EU adequacy decisions',
          'Standard Contractual Clauses (SCCs) approved by the ICO or European Commission',
          'Binding Corporate Rules where applicable',
        ]} />
      </Section>

      <Section title="6. Data Retention">
        <P>We retain personal data only for as long as necessary:</P>
        <UL items={[
          'Account data — retained for the duration of your account plus 30 days after closure',
          'Financial records — retained for 7 years as required by UK tax/accounting law',
          'Support communications — retained for 3 years',
          'Analytics data — anonymised, retained for up to 2 years',
        ]} />
        <P>You can request earlier deletion subject to legal retention obligations.</P>
      </Section>

      <Section title="7. Data Security Measures">
        <P>We implement appropriate technical and organisational measures (Article 32) including:</P>
        <UL items={[
          'TLS 1.2+ encryption for all data in transit',
          'AES-256 encryption for data at rest',
          'Role-based access controls limiting data access to authorised personnel',
          'Regular security audits and penetration testing',
          'Incident response procedures with 72-hour breach notification capability',
          'Employee data protection training',
        ]} />
      </Section>

      <Section title="8. Data Breach Notification">
        <P>In the event of a personal data breach that is likely to result in a risk to your rights and freedoms, we will notify the Information Commissioner's Office (ICO) within <strong>72 hours</strong> of becoming aware, as required by Article 33 UK GDPR. Where the breach is likely to result in a high risk, we will also notify affected individuals without undue delay (Article 34).</P>
      </Section>

      <Section title="9. Sub-Processors">
        <P>We use a limited number of sub-processors to deliver our service. We ensure all sub-processors meet GDPR standards and are bound by appropriate Data Processing Agreements. Our current sub-processors include cloud infrastructure, email delivery, and anonymised analytics providers. You may request the full list by contacting <strong>privacy@invoicesaga.com</strong>.</P>
      </Section>

      <Section title="10. Your Clients' Data">
        <P>When you use InvoiceSaga to store client information, you are the data controller for that data. You are responsible for:</P>
        <UL items={[
          'Having a valid legal basis for processing your clients\' personal data',
          'Providing your clients with appropriate privacy notices',
          'Responding to your clients\' data subject requests',
          'Ensuring you do not store data beyond what is necessary',
        ]} />
        <P>InvoiceSaga processes your clients' data strictly on your instructions and will never use it for our own purposes.</P>
      </Section>

      <Section title="11. Supervisory Authority">
        <P>If you are based in the UK, your supervisory authority is the <strong>Information Commissioner's Office (ICO)</strong>:<br />
        Website: <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" style={{ color: '#0EA5E9' }}>ico.org.uk</a><br />
        Helpline: 0303 123 1113</P>
        <P>If you are based in the EU, please contact the supervisory authority in your Member State.</P>
        <P>You have the right to lodge a complaint with your supervisory authority if you believe we have not handled your data correctly, though we encourage you to contact us first so we can resolve the matter directly.</P>
      </Section>

      <Section title="12. Contact Our Data Protection Team">
        <P>For all GDPR-related requests, Data Processing Agreements, or compliance questions:</P>
        <P><strong>Email:</strong> privacy@invoicesaga.com<br />
        <strong>Post:</strong> Data Protection Officer, InvoiceSaga Ltd, 123 Business Park, London, EC1A 1BB, United Kingdom</P>
        <P>We aim to acknowledge all requests within 5 business days and resolve them within 30 days.</P>
      </Section>

    </LegalLayout>
  );
}
