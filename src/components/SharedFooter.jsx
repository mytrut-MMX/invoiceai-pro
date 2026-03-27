import React from 'react';

export default function SharedFooter() {
  return (
    <footer style={{ background:'#0A0A09', padding:'32px 2rem', textAlign:'center', color:'#6B6B6B', fontSize:14, borderTop:'1px solid #1C1C1B' }}>
      <div style={{ marginBottom:8 }}>
        <span style={{ color:'#D97706', fontWeight:700 }}>InvoiceSaga</span>
        {' · '}
        <a href="/" style={{ color:'#475569', textDecoration:'none' }}>Home</a>
        {' · '}
        <a href="/templates" style={{ color:'#475569', textDecoration:'none' }}>Templates</a>
        {' · '}
        <a href="/contact" style={{ color:'#475569', textDecoration:'none' }}>Contact</a>
        {' · '}
        <a href="/privacy" style={{ color:'#475569', textDecoration:'none' }}>Privacy Policy</a>
        {' · '}
        <a href="/terms" style={{ color:'#475569', textDecoration:'none' }}>Terms of Service</a>
        {' · '}
        <a href="/cookies" style={{ color:'#475569', textDecoration:'none' }}>Cookie Policy</a>
        {' · '}
        <a href="/gdpr" style={{ color:'#475569', textDecoration:'none' }}>GDPR</a>
      </div>
      <div>© {new Date().getFullYear()} InvoiceSaga. All rights reserved.</div>
    </footer>
  );
}
