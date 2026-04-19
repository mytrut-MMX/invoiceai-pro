import { useState, useEffect, useCallback } from 'react';
import OrchestratorPanel from './OrchestratorPanel';

const s = {
  page:    { minHeight:'100vh', background:'#F1F5F9' },
  btnDanger: { padding:'6px 14px', background:'#EF4444', color:'#fff', border:'none', borderRadius:6, fontSize:13, fontWeight:600, cursor:'pointer' },
  err:     { background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#DC2626', marginBottom:12 },
  header:  { background:'#0F172A', padding:'0 32px', height:64, display:'flex', alignItems:'center', justifyContent:'space-between' },
  headerLogo:   { fontSize:18, fontWeight:800, color:'#fff', letterSpacing:-0.5 },
  headerAccent: { color:'#0EA5E9' },
  headerRight:  { display:'flex', alignItems:'center', gap:12 },
  main:    { maxWidth:1200, margin:'0 auto', padding:'32px 24px' },
  statsGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:16, marginBottom:32 },
  statCard:  { background:'#fff', border:'1px solid #E2E8F0', borderRadius:12, padding:'20px 24px' },
  statNum:   { fontSize:32, fontWeight:800, color:'#0F172A', lineHeight:1.1 },
  statLabel: { fontSize:13, color:'#64748B', marginTop:4 },
  tabs:      { display:'flex', gap:4, marginBottom:24, background:'#E2E8F0', borderRadius:10, padding:4, width:'fit-content' },
  tab:       { padding:'8px 20px', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer', border:'none', background:'transparent', color:'#64748B' },
  tabActive: { padding:'8px 20px', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer', border:'none', background:'#fff', color:'#0F172A', boxShadow:'0 1px 4px rgba(0,0,0,0.1)' },
  tableWrap:      { background:'#fff', border:'1px solid #E2E8F0', borderRadius:12, overflow:'hidden' },
  tableHead:      { background:'#F8FAFC', borderBottom:'1px solid #E2E8F0', padding:'12px 20px', display:'grid', gap:12 },
  tableRow:       { padding:'14px 20px', display:'grid', gap:12, borderBottom:'1px solid #F1F5F9', alignItems:'center' },
  tableCell:      { fontSize:13, color:'#374151', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  tableCellHead:  { fontSize:11, fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:0.5 },
  badge:      { display:'inline-block', padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:600 },
  emptyState: { padding:'48px 24px', textAlign:'center', color:'#9CA3AF', fontSize:14 },
  msgBox:     { background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#374151', whiteSpace:'pre-wrap', wordBreak:'break-word', lineHeight:1.6, maxHeight:100, overflow:'auto' },
  sectionTitle: { fontSize:18, fontWeight:700, color:'#0F172A', marginBottom:16 },
  pill:         { display:'inline-block', padding:'2px 10px', borderRadius:99, fontSize:11, fontWeight:600, background:'#DBEAFE', color:'#1E40AF' },
  refreshBtn:   { padding:'8px 18px', background:'#F1F5F9', color:'#374151', border:'1px solid #E2E8F0', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' },
};

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}

function todayCount(arr) {
  const today = new Date().toDateString();
  return arr.filter(x => x.created_at && new Date(x.created_at).toDateString() === today).length;
}

function SubjectBadge({ subject }) {
  const colors = {
    'Feedback':        { bg:'#DCFCE7', color:'#15803D' },
    'Bug Report':      { bg:'#FEF9C3', color:'#854D0E' },
    'Complaint':       { bg:'#FEE2E2', color:'#991B1B' },
    'Billing':         { bg:'#EDE9FE', color:'#6D28D9' },
    'General Inquiry': { bg:'#DBEAFE', color:'#1E40AF' },
    'Other':           { bg:'#F1F5F9', color:'#475569' },
  };
  const c = colors[subject] || colors['Other'];
  return <span style={{ ...s.badge, background:c.bg, color:c.color }}>{subject || 'General'}</span>;
}

export default function AdminDashboard({ onLogout, token }) {
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [tab,         setTab]         = useState('users');
  const [expandedMsg, setExpandedMsg] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch('/api/admin-data', { headers: { 'Authorization': `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Session expired — please log in again');
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const users    = data?.profiles           || [];
  const contacts = data?.contactSubmissions || [];

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={s.headerLogo}>Invoice<span style={s.headerAccent}>Saga</span> <span style={{ fontSize:13, color:'#475569', fontWeight:400, marginLeft:8 }}>Admin Panel</span></div>
        <div style={s.headerRight}>
          <button style={s.refreshBtn} onClick={fetchData} disabled={loading}>{loading ? 'Loading…' : '↻ Refresh'}</button>
          <button style={s.btnDanger} onClick={onLogout}>Sign out</button>
        </div>
      </header>

      <div style={s.main}>
        {error && <div style={{ ...s.err, marginBottom:24 }}>{error}</div>}

        <OrchestratorPanel token={token} />

        {/* Stats */}
        <div style={s.statsGrid}>
          <div style={s.statCard}><div style={s.statNum}>{users.length}</div><div style={s.statLabel}>Total Users</div></div>
          <div style={s.statCard}><div style={{ ...s.statNum, color:'#0EA5E9' }}>{todayCount(users)}</div><div style={s.statLabel}>New Users Today</div></div>
          <div style={s.statCard}><div style={s.statNum}>{contacts.length}</div><div style={s.statLabel}>Contact Submissions</div></div>
          <div style={s.statCard}><div style={{ ...s.statNum, color:'#F59E0B' }}>{todayCount(contacts)}</div><div style={s.statLabel}>New Messages Today</div></div>
          <div style={s.statCard}><div style={{ ...s.statNum, color:'#EF4444' }}>{contacts.filter(c => c.subject === 'Complaint').length}</div><div style={s.statLabel}>Complaints</div></div>
          <div style={s.statCard}><div style={{ ...s.statNum, color:'#10B981' }}>{contacts.filter(c => c.subject === 'Feedback').length}</div><div style={s.statLabel}>Feedback Messages</div></div>
        </div>

        {/* Tabs */}
        <div style={s.tabs}>
          <button style={tab === 'users'    ? s.tabActive : s.tab} onClick={() => setTab('users')}>Users ({users.length})</button>
          <button style={tab === 'contacts' ? s.tabActive : s.tab} onClick={() => setTab('contacts')}>Contact ({contacts.length})</button>
        </div>

        {/* Users Tab */}
        {tab === 'users' && (
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
        )}

        {/* Contacts Tab */}
        {tab === 'contacts' && (
          <div>
            <div style={s.sectionTitle}>Contact Submissions</div>
            {loading ? (
              <div style={s.emptyState}>Loading…</div>
            ) : contacts.length === 0 ? (
              <div style={s.emptyState}>
                <div style={{ fontSize:32, marginBottom:8 }}>📬</div>
                No contact submissions yet.<br />
                <span style={{ fontSize:12, marginTop:4, display:'block', color:'#CBD5E1' }}>Messages submitted via the Contact page will appear here.</span>
              </div>
            ) : (
              <div style={s.tableWrap}>
                <div style={{ ...s.tableHead, gridTemplateColumns:'1.5fr 2fr 1.2fr 2fr 1.5fr' }}>
                  <span style={s.tableCellHead}>Name</span>
                  <span style={s.tableCellHead}>Email</span>
                  <span style={s.tableCellHead}>Subject</span>
                  <span style={s.tableCellHead}>Message</span>
                  <span style={s.tableCellHead}>Date</span>
                </div>
                {contacts.map((c, i) => (
                  <div key={c.id || i} style={{ ...s.tableRow, gridTemplateColumns:'1.5fr 2fr 1.2fr 2fr 1.5fr', background: i%2===0?'#fff':'#FAFAFA', alignItems:'start' }}>
                    <span style={s.tableCell}>{c.name || <span style={{ color:'#9CA3AF' }}>—</span>}</span>
                    <span style={{ ...s.tableCell, color:'#0EA5E9', fontWeight:500 }}>{c.email}</span>
                    <span style={s.tableCell}><SubjectBadge subject={c.subject} /></span>
                    <div>
                      {expandedMsg === (c.id || i) ? (
                        <div>
                          <div style={{ ...s.msgBox, maxHeight:'none' }}>{c.message}</div>
                          <button onClick={() => setExpandedMsg(null)} style={{ fontSize:11, color:'#0EA5E9', background:'none', border:'none', cursor:'pointer', padding:'4px 0' }}>Show less</button>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontSize:13, color:'#374151', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:220 }}>{c.message}</div>
                          {c.message && c.message.length > 60 && (
                            <button onClick={() => setExpandedMsg(c.id || i)} style={{ fontSize:11, color:'#0EA5E9', background:'none', border:'none', cursor:'pointer', padding:'4px 0' }}>Read more</button>
                          )}
                        </div>
                      )}
                    </div>
                    <span style={{ ...s.tableCell, color:'#64748B', fontSize:12 }}>{fmt(c.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
