import { s, fmtDate } from './adminShared';

export default function AdminUsersPanel({ loading, users }) {
  return (
    <div>
      <div style={s.sectionTitle}>Registered Users</div>
      {loading ? (
        <div style={s.emptyState}>Loading…</div>
      ) : users.length === 0 ? (
        <div style={s.emptyState}>
          <div style={{ fontSize:32, marginBottom:8 }}>👥</div>
          No users yet — or Supabase not configured.<br />
          <span style={{ fontSize:12, marginTop:4, display:'block', color:'#CBD5E1' }}>Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in Vercel env vars.</span>
        </div>
      ) : (
        <div style={s.tableWrap}>
          <div style={{ ...s.tableHead, gridTemplateColumns:'2fr 2fr 1fr 1.5fr' }}>
            <span style={s.tableCellHead}>Name</span>
            <span style={s.tableCellHead}>Email</span>
            <span style={s.tableCellHead}>Role</span>
            <span style={s.tableCellHead}>Joined</span>
          </div>
          {users.map((u, i) => (
            <div key={u.id || i} style={{ ...s.tableRow, gridTemplateColumns:'2fr 2fr 1fr 1.5fr', background: i%2===0?'#fff':'#FAFAFA' }}>
              <span style={s.tableCell}>{u.name || <span style={{ color:'#9CA3AF' }}>—</span>}</span>
              <span style={{ ...s.tableCell, color:'#0EA5E9', fontWeight:500 }}>{u.email}</span>
              <span style={s.tableCell}><span style={s.pill}>{u.role || 'User'}</span></span>
              <span style={{ ...s.tableCell, color:'#64748B' }}>{fmtDate(u.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
