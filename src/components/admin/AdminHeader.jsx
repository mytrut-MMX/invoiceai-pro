import { s } from './adminShared';

export default function AdminHeader({ onRefresh, loading, onLogout }) {
  return (
    <header style={s.header}>
      <div style={s.headerLogo}>Invoice<span style={s.headerAccent}>Saga</span> <span style={{ fontSize:13, color:'#475569', fontWeight:400, marginLeft:8 }}>Admin Panel</span></div>
      <div style={s.headerRight}>
        <button style={s.refreshBtn} onClick={onRefresh} disabled={loading}>{loading ? 'Loading…' : '↻ Refresh'}</button>
        <button style={s.btnDanger} onClick={onLogout}>Sign out</button>
      </div>
    </header>
  );
}
