import { Link } from 'react-router-dom';
import { ROUTES } from '../router/routes';

const navStyle = {
  position: 'sticky', top: 0, zIndex: 100,
  background: '#FAFAF7', borderBottom: '1px solid #E8E6E0',
  padding: '0 2rem', display: 'flex', alignItems: 'center',
  justifyContent: 'space-between', height: 60,
};

export default function SharedNav({ activePage = '' }) {
  const linkStyle = (page) => ({
    color: activePage === page ? '#111110' : '#6B6B6B',
    fontSize: 14,
    fontWeight: activePage === page ? 500 : 400,
    textDecoration: 'none',
  });

  return (
    <nav style={navStyle}>
      <Link to={ROUTES.LANDING} style={{ fontSize: 20, fontWeight: 700, color: '#111110', letterSpacing: -0.5, textDecoration: 'none' }}>
        Invoice<span style={{ color: '#D97706' }}>Saga</span>
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <Link to={ROUTES.FEATURES} style={linkStyle('features')}>Features</Link>
        <Link to={ROUTES.PRICING} style={linkStyle('pricing')}>Pricing</Link>
        <Link to={ROUTES.TEMPLATES} style={linkStyle('templates')}>Templates</Link>
        <Link to={ROUTES.LOGIN} style={{ background: 'transparent', color: '#374151', border: '1px solid #E8E6E0', borderRadius: 6, padding: '7px 16px', fontWeight: 400, fontSize: 13, cursor: 'pointer', textDecoration: 'none' }}>Log in</Link>
        <Link to={ROUTES.SIGNUP} style={{ background: '#111110', color: '#FAFAF7', border: 'none', borderRadius: 6, padding: '7px 18px', fontWeight: 500, fontSize: 13, cursor: 'pointer', textDecoration: 'none' }}>
          Start free →
        </Link>
      </div>
    </nav>
  );
}
