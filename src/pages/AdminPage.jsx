import { useState, useEffect, useCallback } from 'react';
import AdminLogin from '../components/admin/AdminLogin';
import AdminHeader from '../components/admin/AdminHeader';
import AdminStats from '../components/admin/AdminStats';
import AdminTabs from '../components/admin/AdminTabs';
import AdminUsersPanel from '../components/admin/AdminUsersPanel';
import AdminContactsPanel from '../components/admin/AdminContactsPanel';
import AdminOrchestratorRunner from '../components/admin/AdminOrchestratorRunner';
import AdminOrchestratorHistory from '../components/admin/AdminOrchestratorHistory';
import { s } from '../components/admin/adminShared';

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
  const [selectedObjectiveId, setSelectedObjectiveId] = useState(null);

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
  const objectives = data?.agentObjectives || [];
  const tasks = data?.agentTasks || [];

  const runOrchestrator = async () => {
  setOrchError('');
    setOrchResult(null);

    setOrchRunning(true);

  if (!orchObjective.trim()) {
    setOrchError('Objective is required.');
    return;
  }

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
          context: {},
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
      <AdminHeader onRefresh={fetchData} loading={loading} onLogout={onLogout} />

      <div style={s.main}>
        {error && <div style={{ ...s.err, marginBottom:24 }}>{error}</div>}

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

        <AdminStats users={users} contacts={contacts} />

  <AdminTabs tab={tab} setTab={setTab} userCount={users.length} contactCount={contacts.length} />

          {tab === 'users' && (
           <AdminUsersPanel loading={loading} users={users} />
        )}

        {tab === 'contacts' && (
          <AdminContactsPanel loading={loading} contacts={contacts} expandedMsg={expandedMsg} setExpandedMsg={setExpandedMsg} />
        )}

        {tab === 'orchestrator' && (
          <AdminOrchestratorHistory
            loading={loading}
            objectives={objectives}
            tasks={tasks}
            selectedObjectiveId={selectedObjectiveId}
            setSelectedObjectiveId={setSelectedObjectiveId}
          />
        )}
      </div>
    </div>
  );
}

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
