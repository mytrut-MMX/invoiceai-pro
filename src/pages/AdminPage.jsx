import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../router/routes';
import AdminDashboard from '../components/admin/AdminDashboard';

const ff = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const s = {
  loginWrap:  { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#0F172A,#1E3A5F)', padding:24 },
  loginCard:  { background:'#fff', borderRadius:16, padding:'40px 36px', width:'100%', maxWidth:400, boxShadow:'0 20px 60px rgba(0,0,0,0.3)' },
  loginLogo:  { textAlign:'center', marginBottom:28 },
  loginTitle: { fontSize:22, fontWeight:800, color:'#0F172A', textAlign:'center', marginBottom:6 },
  loginSub:   { fontSize:14, color:'#64748B', textAlign:'center', marginBottom:28 },
  label:      { display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 },
  input:      { width:'100%', padding:'11px 14px', border:'1.5px solid #E2E8F0', borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box', fontFamily:ff },
  btn:        { width:'100%', padding:'12px', background:'#0F172A', color:'#fff', border:'none', borderRadius:8, fontSize:15, fontWeight:700, cursor:'pointer', marginTop:8 },
  err:        { background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#DC2626', marginBottom:12 },
};

// AUTH-001: Store the HMAC-signed token (not the raw password) in state
import { useState, useEffect, useCallback } from 'react';
import AdminLogin from '../components/admin/AdminLogin';
import AdminHeader from '../components/admin/AdminHeader';
import AdminLayout from '../components/admin/AdminLayout';
import AdminStats from '../components/admin/AdminStats';
import AdminUsersPanel from '../components/admin/AdminUsersPanel';
import AdminContactsPanel from '../components/admin/AdminContactsPanel';
import AdminOrchestratorRunner from '../components/admin/AdminOrchestratorRunner';
import AdminOrchestratorHistory from '../components/admin/AdminOrchestratorHistory';
import { s } from '../components/admin/adminShared';

function AdminDashboard({ onLogout, token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [section, setSection] = useState('overview');
  const [expandedMsg, setExpandedMsg] = useState(null);
  const [orchTitle, setOrchTitle] = useState('');
  const [orchObjective, setOrchObjective] = useState('');
  const [orchRunning, setOrchRunning] = useState(false);
  const [orchResult, setOrchResult] = useState(null);
  const [orchError, setOrchError] = useState('');
  const [selectedObjectiveId, setSelectedObjectiveId] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // AUTH-001: Use signed HMAC token — password never re-transmitted
      const res = await fetch('/api/admin-data', {
        headers: { Authorization: `Bearer ${token}` },
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const users = data?.profiles || [];
  const contacts = data?.contactSubmissions || [];
  const objectives = data?.agentObjectives || [];
  const tasks = data?.agentTasks || [];

  const runOrchestrator = async () => {
    setOrchError('');
    setOrchResult(null);

    setOrchRunning(true);

  if (!orchObjective.trim()) {
      setOrchError('Objective is required.');
      setOrchRunning(false);
      return;
    }

    try {
      const res = await fetch('/api/orchestrator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: orchTitle,
          objective: orchObjective,
          context: {},
        }),
      });

      const json = await res.json();

    if (!res.ok) {
        throw new Error(json.error || 'Failed to run orchestrator');
      }

      setOrchResult(json);
      setSection('orchestrator');
      fetchData();
    } catch (e) {
      setOrchError(e.message);
    } finally {
      setOrchRunning(false);
    }
  };

  const quickSummary = [
    { label: 'Total users', value: users.length },
    { label: 'Contact submissions', value: contacts.length },
    { label: 'Orchestrator runs', value: objectives.length },
    { label: 'Tasks generated', value: tasks.length },
  ];

  return (
    <div style={s.page}>
      <AdminHeader onRefresh={fetchData} loading={loading} onLogout={onLogout} />

      <div style={s.main}>
        {error && <div style={{ ...s.err, marginBottom: 24 }}>{error}</div>}

        <AdminLayout
          section={section}
          setSection={setSection}
          userCount={users.length}
          contactCount={contacts.length}
          orchestratorCount={objectives.length}
        >
          {section === 'overview' && (
            <div>
              <div style={s.sectionTitle}>Overview</div>
              <AdminStats users={users} contacts={contacts} />

              <div style={s.tableWrap}>
                <div style={s.tableHead}>
                  <span style={s.tableCellHead}>Quick Summary</span>
                </div>
                {quickSummary.map((item) => (
                  <div key={item.label} style={{ ...s.tableRow, gridTemplateColumns: '2fr 1fr' }}>
                    <span style={s.tableCell}>{item.label}</span>
                    <span style={{ ...s.tableCell, fontWeight: 700 }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'users' && <AdminUsersPanel loading={loading} users={users} />}

          {section === 'contacts' && (
            <AdminContactsPanel
              loading={loading}
              contacts={contacts}
              expandedMsg={expandedMsg}
              setExpandedMsg={setExpandedMsg}
            />
          )}

          {section === 'orchestrator' && (
            <div>
              <AdminOrchestratorRunner
                orchTitle={orchTitle}
                setOrchTitle={setOrchTitle}
                orchObjective={orchObjective}
                setOrchObjective={setOrchObjective}
                orchRunning={orchRunning}
                runOrchestrator={runOrchestrator}
                orchError={orchError}
                orchResult={orchResult}
              />

              <AdminOrchestratorHistory
                loading={loading}
                objectives={objectives}
                tasks={tasks}
                selectedObjectiveId={selectedObjectiveId}
                setSelectedObjectiveId={setSelectedObjectiveId}
              />
            </div>
          )}
        </AdminLayout>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [token,    setToken]    = useState('');
  const [authed,   setAuthed]   = useState(false);
  const [pw,       setPw]       = useState('');
  const [error,    setError]    = useState('');
  const [show,     setShow]     = useState(false);
  const [checking, setChecking] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setChecking(true);
    setError('');
    try {
      // AUTH-001: POST to /api/admin-login → receive a signed HMAC token
      // Password is sent once; subsequent data fetches use the token only
      const res  = await fetch('/api/admin-login', {
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

  const handleLogout = () => { setToken(''); setAuthed(false); setPw(''); };

  if (authed) return <AdminDashboard onLogout={handleLogout} token={token} />;

  return (
    <div style={s.loginWrap}>
      <div style={s.loginCard}>
        <div style={s.loginLogo}><div style={{ fontSize:36, marginBottom:8 }}>🛡️</div></div>
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
          <button type="submit" disabled={checking} style={{ ...s.btn, opacity: checking ? 0.7 : 1 }}>
            {checking ? 'Verifying…' : 'Enter Admin Panel →'}
          </button>
        </form>

        <div style={{ textAlign:'center', marginTop:20, fontSize:12, color:'#9CA3AF' }}>
          <Link to={ROUTES.LANDING} style={{ color:'#64748B', textDecoration:'none' }}>← Back to InvoiceSaga</Link>
        </div>
      </div>
    </div>
    <AdminLogin
      error={error}
      handleLogin={handleLogin}
      pw={pw}
      setPw={setPw}
      show={show}
      setShow={setShow}
      checking={checking}
      clearError={() => setError('')}
    />
  );
}
