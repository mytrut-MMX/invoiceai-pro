import React from 'react';

const footerStyle = {
  background: '#0A0A09',
  padding: '32px 2rem',
  textAlign: 'center',
  color: '#6B6B6B',
  fontSize: 14,
  borderTop: '1px solid #1C1C1B',
};

export default function SharedFooter({ links = 'full' }) {
  const fullLinks = [

    { href: '/',          label: 'Home' },
    { href: '/templates', label: 'Templates' },
    { href: '/contact',   label: 'Contact' },
    { href: '/feedback',  label: 'Feedback' },
    { href: '/privacy',   label: 'Privacy Policy' },
    { href: '/terms',     label: 'Terms of Service' },
    { href: '/cookies',   label: 'Cookie Policy' },
    { href: '/gdpr',      label: 'GDPR' },
    { href: '/refund-policy', label: 'Refund Policy' },


  ];

  const minLinks = [
    { href: '/privacy', label: 'Privacy Policy' },

    { href: '/terms',   label: 'Terms of Service' },
    { href: '/contact', label: 'Contact' },
  ];

  const activeLinks = links === 'min' ? minLinks : fullLinks;

  return (
    <footer style={footerStyle}>
      <div style={{ marginBottom: 8 }}>
        <span style={{ color: '#D97706', fontWeight: 700 }}>InvoiceSaga</span>
      </div>
      <div style={{ marginBottom: 8 }}>
        {activeLinks.map((link, i) => (
          <span key={link.href}>
            {i > 0 && ' · '}
            <a
              href={link.href}
              style={{ color: '#475569', textDecoration: 'none' }}

   
              onMouseEnter={(e) => {
                e.target.style.color = '#6B6B6B';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = '#475569';
              }}

            >
              {link.label}
            </a>
          </span>
        ))}
      </div>
      <div>© {new Date().getFullYear()} InvoiceSaga. All rights reserved.</div>
    </footer>
  );
}
