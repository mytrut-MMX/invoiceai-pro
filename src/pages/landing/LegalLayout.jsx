import React from 'react';
import SharedFooter from '../../components/SharedFooter';

const nav = {
  position: 'sticky', top: 0, zIndex: 100,
  background: '#0F172A', borderBottom: '1px solid #1E293B',
  padding: '0 2rem', display: 'flex', alignItems: 'center',
  justifyContent: 'space-between', height: 64,
};

export default function LegalLayout({ title, lastUpdated, children }) {
  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', margin: 0, background: '#F8FAFC', minHeight: '100vh' }}>

      {/* Nav */}
      <nav style={nav}>
        <a href="/" style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: -0.5, textDecoration: 'none' }}>
          Invoice<span style={{ color: '#0EA5E9' }}>Saga</span>
        </a>
        <a href="/signup" style={{ background: '#0EA5E9', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer', textDecoration: 'none' }}>
          Get started free
        </a>
      </nav>

      {/* Page header */}
      <div style={{ background: '#0F172A', padding: '56px 2rem 48px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, color: '#fff', margin: '0 0 12px', letterSpacing: -0.5 }}>{title}</h1>
        {lastUpdated && (
          <p style={{ fontSize: 14, color: '#94A3B8', margin: 0 }}>Last updated: {lastUpdated}</p>
        )}
      </div>

      {/* Content */}
      <main style={{ maxWidth: 780, margin: '0 auto', padding: '56px 2rem 80px' }}>
        {children}
      </main>

      {/* Footer */}
      <SharedFooter links="min" />
    </div>
  );
}

/* ─── Shared prose helpers ───────────────────────────────────────────────── */
export function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', margin: '0 0 12px', paddingBottom: 8, borderBottom: '1px solid #E2E8F0' }}>{title}</h2>
      <div style={{ fontSize: 15, color: '#374151', lineHeight: 1.75 }}>{children}</div>
    </section>
  );
}

export function P({ children, style }) {
  return <p style={{ margin: '0 0 14px', ...style }}>{children}</p>;
}

export function UL({ items }) {
  return (
    <ul style={{ margin: '0 0 14px', paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}

export function InfoCard({ children, color = '#0EA5E9' }) {
  return (
    <div style={{ background: color + '10', border: `1px solid ${color}30`, borderRadius: 10, padding: '16px 20px', marginBottom: 14, fontSize: 14, color: '#374151', lineHeight: 1.7 }}>
      {children}
    </div>
  );
}
