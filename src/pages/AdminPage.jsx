import { useState, useEffect, useCallback } from 'react';

const ff = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const s = {
  page: { minHeight:'100vh', background:'#F1F5F9', fontFamily:ff },
  loginWrap: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#0F172A,#1E3A5F)', padding:24 },
  loginCard: { background:'#fff', borderRadius:16, padding:'40px 36px', width:'100%', maxWidth:400, boxShadow:'0 20px 60px rgba(0,0,0,0.3)' },
  loginLogo: { textAlign:'center', marginBottom:28 },
  loginTitle: { fontSize:22, fontWeight:800, color:'#0F172A', textAlign:'center', marginBottom:6 },
  loginSub: { fontSize:14, color:'#64748B', textAlign:'center', marginBottom:28 },
  label: { display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 },
  input: { width:'100%', padding:'11px 14px', border:'1.5px solid #E2E8F0', borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box', fontFamily:ff },
  btn: { width:'100%', padding:'12px', background:'#0F172A', color:'#fff', border:'none', borderRadius:8, fontSize:15, fontWeight:700, cursor:'pointer', marginTop:8 },
  btnSm: { padding:'6px 14px', background:'#0EA5E9', color:'#fff', border:'none', borderRadius:6, fontSize:13, fontWeight:600, cursor:'pointer' },
  btnDanger: { padding:'6px 14px', background:'#EF4444', color:'#fff', border:'none', borderRadius:6, fontSize:13, fontWeight:600, cursor:'pointer' },
  err: { background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#DC2626', marginBottom:12 },
  // Layout
  header: { background:'#0F172A', padding:'0 32px', height:64, display:'flex', alignItems:'center', justifyContent:'space-between' },
  headerLogo: { fontSize:18, fontWeight:800, color:'#fff', letterSpacing:-0.5 },
  headerAccent: { color:'#0EA5E9' },
  headerRight: { display:'flex', alignItems:'center', gap:12 },
  main: { maxWidth:1200, margin:'0 auto', padding:'32px 24px' },
  // Stats
  statsGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:16, marginBottom:32 },
  statCard: { background:'#fff', border:'1px solid #E2E8F0', borderRadius:12, padding:'20px 24px' },
  statNum: { fontSize:32, fontWeight:800, color:'#0F172A', lineHeight:1.1 },
  statLabel: { fontSize:13, color:'#64748B', marginTop:4 },
  statDot: { width:10, height:10, borderRadius:'50%', display:'inline-block', marginRight:6 },
  // Tabs
  tabs: { display:'flex', gap:4, marginBottom:24, background:'#E2E8F0', borderRadius:10, padding:4, width:'fit-content' },
  tab: { padding:'8px 20px', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer', border:'none', background:'transparent', color:'#64748B', fontFamily:ff },
  tabActive: { padding:'8px 20px', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer', border:'none', background:'#fff', color:'#0F172A', fontFamily:ff, boxShadow:'0 1px 4px rgba(0,0,0,0.1)' },
  // Table
  tableWrap: { background:'#fff', border:'1px solid #E2E8F0', borderRadius:12, overflow:'hidden' },
  tableHead: { background:'#F8FAFC', borderBottom:'1px solid #E2E8F0', padding:'12px 20px', display:'grid', gap:12 },
  tableRow: { padding:'14px 20px', display:'grid', gap:12, borderBottom:'1px solid #F1F5F9', alignItems:'center' },
  tableCell: { fontSize:13, color:'#374151', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  tableCellHead: { fontSize:11, fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:0.5 },
  badge: { display:'inline-block', padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:600 },
  emptyState: { padding:'48px 24px', textAlign:'center', color:'#9CA3AF', fontSize:14 },
  msgBox: { background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#374151', whiteSpace:'pre-wrap', wordBreak:'break-word', lineHeight:1.6, maxHeight:100, overflow:'auto' },
  sectionTitle: { fontSize:18, fontWeight:700, color:'#0F172A', marginBottom:16 },
  pill: { display:'inline-block', padding:'2px 10px', borderRadius:99, fontSize:11, fontWeight:600, background:'#DBEAFE', color:'#1E40AF' },
  refreshBtn: { padding:'8px 18px', background:'#F1F5F9', color:'#374151', border:'1px solid #E2E8F0', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:ff },
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

// ── Admin Dashboard ──────────────────────────────────────────────────────────
function AdminDashboard({ onLogout, token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('users');
  const [expandedMsg, setExpandedMsg] = useState(null);
  const [orchTitle, setOrchTitle] = useState('');
  const [orchObjective, setOrchObjective] = useState('');
  const [orchRunning, setOrchRunning] = useState(false);
  const [orchResult, setOrchResult] = useState(null);
  const [orchError, setOrchError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // AUTH-001: Use signed HMAC token — password never re-transmitted
      const res = await fetch('/api/admin-data', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
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

  const users = data?.profiles || [];
  const contacts = data?.contactSubmissions || [];

  const runOrchestrator = async () => {
  setOrchError('');
  setOrchResult(null);

  if (!orchObjective.trim()) {
    setOrchError('Objective is required.');
    return;
  }

  setOrchRunning(true);

  try {
    const res = await fetch('/api/orchestrator', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: orchTitle,
        objective: orchObjective,
        context: {}
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error || 'Failed to run orchestrator');
    }

    setOrchResult(json);
  } catch (e) {
    setOrchError(e.message);
  } finally {
    setOrchRunning(false);
  }
};

  return (
    <div style={s.page}>
      {/* Header */}
      <header style={s.header}>
        <div style={s.headerLogo}>Invoice<span style={s.headerAccent}>Saga</span> <span style={{ fontSize:13, color:'#475569', fontWeight:400, marginLeft:8 }}>Admin Panel</span></div>
        <div style={s.headerRight}>
          <button style={s.refreshBtn} onClick={fetchData} disabled={loading}>{loading ? 'Loading…' : '↻ Refresh'}</button>
          <button style={s.btnDanger} onClick={onLogout}>Sign out</button>
        </div>
      </header>

      <div style={s.main}>
        {error && <div style={{ ...s.err, marginBottom:24 }}>{error}</div>}

        <div style={{ background:'#fff', border:'1px solid #E2E8F0', borderRadius:12, padding:'20px 24px', marginBottom:24 }}>
  <div style={s.sectionTitle}>Run Executive Orchestrator</div>

  {orchError && <div style={{ ...s.err, marginBottom:16 }}>{orchError}</div>}

  <div style={{ marginBottom:12 }}>
    <label style={s.label}>Title</label>
    <input
      type="text"
      value={orchTitle}
      onChange={e => setOrchTitle(e.target.value)}
      placeholder="Example: Expenses module upgrade"
      style={s.input}
    />
  </div>

  <div style={{ marginBottom:16 }}>
    <label style={s.label}>Objective</label>
    <textarea
      value={orchObjective}
      onChange={e => setOrchObjective(e.target.value)}
      placeholder="Describe the objective for the agent..."
      style={{ ...s.input, minHeight:120, resize:'vertical' }}
    />
  </div>

  <button
    style={s.btnSm}
    onClick={runOrchestrator}
    disabled={orchRunning}
  >
    {orchRunning ? 'Running…' : 'Run Orchestrator'}
  </button>

  {orchResult?.result && (
  <div style={{ marginTop:16 }}>
    <div style={{ fontSize:13, fontWeight:700, color:'#0F172A', marginBottom:12 }}>Orchestrator Result</div>

    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8 }}>Initiatives</div>
      <div style={{ display:'grid', gap:8 }}>
        {(orchResult.result.initiatives || []).map((item, i) => (
          <div key={item.id || i} style={{ background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:8, padding:'10px 12px' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#64748B', marginBottom:4 }}>{item.id}</div>
            <div style={{ fontSize:13, color:'#0F172A' }}>{item.title}</div>
          </div>
        ))}
      </div>
    </div>

    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8 }}>Tasks</div>
      <div style={{ display:'grid', gap:8 }}>
        {(orchResult.result.tasks || []).map((task, i) => (
          <div key={task.id || i} style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', borderRadius:8, padding:'12px 14px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', gap:12, marginBottom:6, flexWrap:'wrap' }}>
              <span style={{ fontSize:11, fontWeight:700, color:'#64748B' }}>{task.id}</span>
              <span style={{ fontSize:11, fontWeight:700, color:'#0EA5E9' }}>{task.agent}</span>
              <span style={{ fontSize:11, fontWeight:700, color: task.priority === 'high' ? '#DC2626' : task.priority === 'medium' ? '#D97706' : '#475569' }}>
                {task.priority}
              </span>
            </div>
            <div style={{ fontSize:13, color:'#0F172A', marginBottom:6 }}>{task.title}</div>
            <div style={{ fontSize:11, color:'#64748B' }}>
              Depends on: {task.depends_on?.length ? task.depends_on.join(', ') : 'None'}
            </div>
          </div>
        ))}
      </div>
    </div>

    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8 }}>Risks</div>
      <div style={{ display:'grid', gap:8 }}>
        {(orchResult.result.risks || []).map((risk, i) => (
          <div key={i} style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, padding:'10px 12px', fontSize:13, color:'#991B1B' }}>
            {risk}
          </div>
        ))}
      </div>
    </div>

    <div>
      <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8 }}>Status</div>
      <div style={{ background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:8, padding:'12px 14px' }}>
        <div style={{ fontSize:13, color:'#0F172A', marginBottom:6 }}>
          <strong>Overall:</strong> {orchResult.result.status?.overall_status || '—'}
        </div>
        <div style={{ fontSize:13, color:'#0F172A', marginBottom:6 }}>
          <strong>Next focus:</strong> {orchResult.result.status?.next_focus || '—'}
        </div>
        <div style={{ fontSize:13, color:'#0F172A' }}>
          <strong>Blockers:</strong> {orchResult.result.status?.blockers?.length ? orchResult.result.status.blockers.join(', ') : 'None'}
        </div>
      </div>
    </div>
  </div>
)}
</div>
        {/* Stats */}
        <div style={s.statsGrid}>
          <div style={s.statCard}>
            <div style={s.statNum}>{users.length}</div>
            <div style={s.statLabel}>Total Users</div>
          </div>
          <div style={s.statCard}>
            <div style={{ ...s.statNum, color:'#0EA5E9' }}>{todayCount(users)}</div>
            <div style={s.statLabel}>New Users Today</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statNum}>{contacts.length}</div>
            <div style={s.statLabel}>Contact Submissions</div>
          </div>
          <div style={s.statCard}>
            <div style={{ ...s.statNum, color:'#F59E0B' }}>{todayCount(contacts)}</div>
            <div style={s.statLabel}>New Messages Today</div>
          </div>
          <div style={s.statCard}>
            <div style={{ ...s.statNum, color:'#EF4444' }}>
              {contacts.filter(c => c.subject === 'Complaint').length}
            </div>
            <div style={s.statLabel}>Complaints</div>
          </div>
          <div style={s.statCard}>
            <div style={{ ...s.statNum, color:'#10B981' }}>
              {contacts.filter(c => c.subject === 'Feedback').length}
            </div>
            <div style={s.statLabel}>Feedback Messages</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={s.tabs}>
          <button style={tab === 'users' ? s.tabActive : s.tab} onClick={() => setTab('users')}>
            Users ({users.length})
          </button>
          <button style={tab === 'contacts' ? s.tabActive : s.tab} onClick={() => setTab('contacts')}>
            Contact ({contacts.length})
          </button>
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
                          <button onClick={() => setExpandedMsg(null)} style={{ fontSize:11, color:'#0EA5E9', background:'none', border:'none', cursor:'pointer', padding:'4px 0', fontFamily:ff }}>Show less</button>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontSize:13, color:'#374151', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:220 }}>{c.message}</div>
                          {c.message && c.message.length > 60 && (
                            <button onClick={() => setExpandedMsg(c.id || i)} style={{ fontSize:11, color:'#0EA5E9', background:'none', border:'none', cursor:'pointer', padding:'4px 0', fontFamily:ff }}>Read more</button>
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

// ── Password Gate ────────────────────────────────────────────────────────────
export default function AdminPage() {
  // AUTH-001: Store the HMAC-signed token (not the raw password) in state
  const [token, setToken] = useState('');
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [show, setShow] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setChecking(true);
    setError('');
    try {
      // AUTH-001: POST to /api/admin-login → receive a signed HMAC token
      // Password is sent once; subsequent data fetches use the token only
      const res = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      const json = await res.json();
      if (res.ok && json.token) {
        setToken(json.token);
        setAuthed(true);
        setPw(''); // Clear password from state immediately after use
      } else {
        setError('Incorrect password.');
        setPw('');
      }
    } catch {
      setError('Could not reach server. Try again.');
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = () => {
    setToken('');
    setAuthed(false);
    setPw('');
  };

  if (authed) return <AdminDashboard onLogout={handleLogout} token={token} />;

  return (
    <div style={s.loginWrap}>
      <div style={s.loginCard}>
        <div style={s.loginLogo}>
          <div style={{ fontSize:36, marginBottom:8 }}>🛡️</div>
        </div>
        <div style={s.loginTitle}>Admin Access</div>
        <div style={s.loginSub}>InvoiceSaga Control Panel</div>

        <form onSubmit={handleLogin}>
          {error && <div style={s.err}>{error}</div>}
          <div style={{ marginBottom:16 }}>
            <label style={s.label}>Admin Password</label>
            <div style={{ position:'relative' }}>
              <input
                type={show ? 'text' : 'password'}
                value={pw}
                onChange={e => { setPw(e.target.value); setError(''); }}
                placeholder="Enter admin password"
                style={{ ...s.input, paddingRight:44 }}
                autoFocus
              />
              <button type="button" onClick={() => setShow(p => !p)}
                style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#9CA3AF', fontSize:16, padding:4 }}>
                {show ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          <button type="submit" disabled={checking} style={{ ...s.btn, opacity: checking ? 0.7 : 1 }}>{checking ? 'Verifying…' : 'Enter Admin Panel →'}</button>
        </form>

        <div style={{ textAlign:'center', marginTop:20, fontSize:12, color:'#9CA3AF' }}>
          <a href="/" style={{ color:'#64748B', textDecoration:'none' }}>← Back to InvoiceSaga</a>
        </div>
      </div>
    </div>
  );
}
