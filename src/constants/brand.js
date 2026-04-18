// Aligned with src/styles/tokens.css. Prefer importing tokens via CSS variables
// in components — this object is kept for any non-React or build-time consumer.
export const brand = {
  colors: {
    primary:       '#1C1917',  // var(--text-primary)
    background:    '#F8F7F4',  // var(--surface-page)
    surface:       '#F1F0EC',  // var(--surface-sunken)
    border:        '#E7E5E4',  // var(--border-subtle)
    accent:        '#408BFB',  // var(--brand-600)
    accentLight:   '#EBF3FF',  // var(--brand-50)
    accentDark:    '#2D6FD9',  // var(--brand-700)
    textPrimary:   '#1C1917',  // var(--text-primary)
    textSecondary: '#57534E',  // var(--text-secondary)
    textMuted:     '#A8A29E',  // var(--text-tertiary)
    dark:          '#1C1917',  // var(--surface-dark)
  },
  fonts: {
    sans:  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    serif: 'Georgia, "Times New Roman", serif',
  },
  radii: { sm: 4, md: 6, lg: 8, xl: 12 },
  nav: {
    height: 56,
    background: '#FFFFFF',
    borderBottom: '1px solid #E7E5E4',
  },
  tagline: 'Invoicing built for freelancers',
  description: 'Professional invoices in minutes. Get paid faster.',
};
