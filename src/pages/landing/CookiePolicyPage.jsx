import React from 'react';
import LegalLayout, { Section, P, UL, InfoCard } from './LegalLayout';

const tableStyle = {
  width: '100%', borderCollapse: 'collapse', fontSize: 14, marginBottom: 14,
};
const thStyle = {
  background: '#F1F5F9', padding: '10px 14px', textAlign: 'left',
  fontWeight: 700, color: '#0F172A', borderBottom: '2px solid #E2E8F0',
};
const tdStyle = {
  padding: '10px 14px', borderBottom: '1px solid #E2E8F0', color: '#374151', verticalAlign: 'top',
};

export default function CookiePolicyPage() {
  return (
    <LegalLayout title="Cookie Policy" lastUpdated="1 January 2025">

      <InfoCard color="#10B981">
        <strong>What are cookies?</strong> Cookies are small text files placed on your device by websites you visit. They are widely used to make websites work efficiently and to provide information to site owners.
      </InfoCard>

      <Section title="1. How We Use Cookies">
        <P>InvoiceSaga uses cookies and similar technologies (local storage, session storage) to operate the platform, remember your preferences, and understand how users interact with our service. We do not use cookies for advertising or behavioural tracking by third parties.</P>
      </Section>

      <Section title="2. Types of Cookies We Use">
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Category</th>
              <th style={thStyle}>Purpose</th>
              <th style={thStyle}>Duration</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdStyle}><strong>Strictly Necessary</strong></td>
              <td style={tdStyle}>Essential for the platform to function — authentication session, security tokens, CSRF protection.</td>
              <td style={tdStyle}>Session / up to 30 days</td>
            </tr>
            <tr>
              <td style={tdStyle}><strong>Functional</strong></td>
              <td style={tdStyle}>Remember your preferences — theme, sidebar state, language, notification settings.</td>
              <td style={tdStyle}>Up to 1 year</td>
            </tr>
            <tr>
              <td style={tdStyle}><strong>Analytics</strong></td>
              <td style={tdStyle}>Understand how users navigate the platform (page views, feature usage) using anonymised data. No personal identifiers are collected.</td>
              <td style={tdStyle}>Up to 2 years</td>
            </tr>
            <tr>
              <td style={{ ...tdStyle, borderBottom: 'none' }}><strong>Performance</strong></td>
              <td style={{ ...tdStyle, borderBottom: 'none' }}>Monitor errors and performance issues to improve reliability.</td>
              <td style={{ ...tdStyle, borderBottom: 'none' }}>Session</td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="3. Local Storage">
        <P>In addition to cookies, InvoiceSaga uses browser <strong>local storage</strong> to save your application data (invoices, client details, settings) locally in your browser. This data never leaves your device unless you explicitly sync it. It is not used for tracking.</P>
        <P>You can clear local storage at any time via your browser's developer tools or by logging out and clearing site data.</P>
      </Section>

      <Section title="4. Third-Party Cookies">
        <P>We use a small number of trusted third-party services that may set their own cookies:</P>
        <UL items={[
          'Analytics provider — anonymised usage statistics (no personal identifiers)',
          'Error monitoring — captures anonymised error reports to help us fix bugs',
        ]} />
        <P>We do <strong>not</strong> embed social media tracking pixels or advertising cookies.</P>
      </Section>

      <Section title="5. Managing Cookies">
        <P>You can control cookies through your browser settings:</P>
        <UL items={[
          'Chrome: Settings → Privacy and security → Cookies and other site data',
          'Firefox: Settings → Privacy & Security → Cookies and Site Data',
          'Safari: Preferences → Privacy → Manage Website Data',
          'Edge: Settings → Cookies and site permissions',
        ]} />
        <P>Please note that disabling <strong>strictly necessary</strong> cookies will prevent InvoiceSaga from functioning correctly. Disabling functional cookies means your preferences will not be saved between sessions.</P>
      </Section>

      <Section title="6. Cookie Consent">
        <P>When you first visit InvoiceSaga, we ask for your consent before placing non-essential cookies. You can change your consent preferences at any time by clicking "Cookie Settings" in the footer of the application, or by clearing your browser cookies and revisiting the site.</P>
        <P>Strictly necessary cookies are placed without requiring consent as they are essential to provide the service you have requested.</P>
      </Section>

      <Section title="7. Changes to This Policy">
        <P>We may update this Cookie Policy to reflect changes in the cookies we use or for operational, legal, or regulatory reasons. We will notify you of material changes via email or an in-app notice.</P>
      </Section>

      <Section title="8. Contact">
        <P>For questions about our use of cookies: <strong>privacy@invoicesaga.com</strong></P>
      </Section>

    </LegalLayout>
  );
}
