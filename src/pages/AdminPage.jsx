import React, { useState, useEffect, useCallback, Suspense } from 'react';
import AdminLogin from '../components/admin/AdminLogin';
import AdminHeader from '../components/admin/AdminHeader';
import AdminLayout from '../components/admin/AdminLayout';
import AdminStats from '../components/admin/AdminStats';
import { s } from '../components/admin/adminShared';

const AdminUsersPanel = React.lazy(() => import('../components/admin/AdminUsersPanel'));
const AdminContactsPanel = React.lazy(() => import('../components/admin/AdminContactsPanel'));
const AdminOrchestratorRunner = React.lazy(() => import('../components/admin/AdminOrchestratorRunner'));
const AdminOrchestratorHistory = React.lazy(() => import('../components/admin/AdminOrchestratorHistory'));
const ProductWorkflowLeadPanel = React.lazy(() => import('../components/admin/ProductWorkflowLeadPanel'));
const FrontendLeadPanel = React.lazy(() => import('../components/admin/FrontendLeadPanel'));
const DataLedgerLeadPanel = React.lazy(() => import('../components/admin/DataLedgerLeadPanel'));
const BackendIntegrationsLeadPanel = React.lazy(() => import('../components/admin/BackendIntegrationsLeadPanel'));
const SecurityTrustLeadPanel = React.lazy(() => import('../components/admin/SecurityTrustLeadPanel'));
const QaRegressionAgentPanel = React.lazy(() => import('../components/admin/QaRegressionAgentPanel'));
const ReleaseGateAgentPanel = React.lazy(() => import('../components/admin/ReleaseGateAgentPanel'));
const DataIntegrityAuditorPanel = React.lazy(() => import('../components/admin/DataIntegrityAuditorPanel'));

const panelFallback = <div style={{ padding: 20, color: '#94a3b8' }}>Loading…</div>;

// ── Admin Dashboard (authenticated view) ────────────────────────────────────
function AdminDashboard({ onLogout, token }) {
  const [data,               setData]               = useState(null);
  const [loading,            setLoading]            = useState(true);
  const [error,              setError]              = useState('');
  const [section,            setSection]            = useState('overview');
  const [expandedMsg,        setExpandedMsg]        = useState(null);
  const [orchTitle,          setOrchTitle]          = useState('');
  const [orchObjective,      setOrchObjective]      = useState('');
  const [orchRunning,        setOrchRunning]        = useState(false);
  const [orchResult,         setOrchResult]         = useState(null);
  const [orchError,          setOrchError]          = useState('');
  const [selectedObjectiveId,setSelectedObjectiveId]= useState(null);
  const [prefillTask,        setPrefillTask]        = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // AUTH-001: Use signed HMAC token — password never re-transmitted
      const res  = await fetch('/api/admin-data', {
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

  useEffect(() => { fetchData(); }, [fetchData]);

  const users      = data?.profiles           || [];
  const contacts   = data?.contactSubmissions || [];
  const objectives = data?.agentObjectives    || [];
  const tasks      = data?.agentTasks         || [];

  const runOrchestrator = async () => {
    setOrchError('');
    setOrchResult(null);

    if (!orchObjective.trim()) {
      setOrchError('Objective is required.');
      return;
    }

    setOrchRunning(true);
    try {
      const res  = await fetch('/api/orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: orchTitle, objective: orchObjective, context: {} }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to run orchestrator');
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
    { label: 'Total users',         value: users.length },
    { label: 'Contact submissions', value: contacts.length },
    { label: 'Orchestrator runs',   value: objectives.length },
    { label: 'Tasks generated',     value: tasks.length },
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

          {section === 'users' && (
            <Suspense fallback={panelFallback}>
              <AdminUsersPanel loading={loading} users={users} />
            </Suspense>
          )}

          {section === 'contacts' && (
            <Suspense fallback={panelFallback}>
              <AdminContactsPanel
                loading={loading}
                contacts={contacts}
                expandedMsg={expandedMsg}
                setExpandedMsg={setExpandedMsg}
              />
            </Suspense>
          )}

          {section === 'orchestrator' && (
            <Suspense fallback={panelFallback}>
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
                  token={token}
                  onRefresh={fetchData}
                  setPrefillTask={setPrefillTask}
                  setSection={setSection}
                />
              </div>
            </Suspense>
          )}

          {section === 'product-workflow-lead' && (
            <Suspense fallback={panelFallback}>
              <ProductWorkflowLeadPanel token={token} prefillTask={prefillTask} setPrefillTask={setPrefillTask} onTaskCompleted={fetchData} />
            </Suspense>
          )}

          {section === 'frontend-lead' && (
            <Suspense fallback={panelFallback}>
              <FrontendLeadPanel token={token} prefillTask={prefillTask} setPrefillTask={setPrefillTask} onTaskCompleted={fetchData} />
            </Suspense>
          )}

          {section === 'data-ledger-lead' && (
            <Suspense fallback={panelFallback}>
              <DataLedgerLeadPanel token={token} prefillTask={prefillTask} setPrefillTask={setPrefillTask} onTaskCompleted={fetchData} />
            </Suspense>
          )}

          {section === 'backend-integrations-lead' && (
            <Suspense fallback={panelFallback}>
              <BackendIntegrationsLeadPanel token={token} prefillTask={prefillTask} setPrefillTask={setPrefillTask} onTaskCompleted={fetchData} />
            </Suspense>
          )}

          {section === 'security-trust-lead' && (
            <Suspense fallback={panelFallback}>
              <SecurityTrustLeadPanel token={token} prefillTask={prefillTask} setPrefillTask={setPrefillTask} onTaskCompleted={fetchData} />
            </Suspense>
          )}

          {section === 'qa-regression-agent' && (
            <Suspense fallback={panelFallback}>
              <QaRegressionAgentPanel token={token} prefillTask={prefillTask} setPrefillTask={setPrefillTask} onTaskCompleted={fetchData} />
            </Suspense>
          )}

          {section === 'release-gate-agent' && (
            <Suspense fallback={panelFallback}>
              <ReleaseGateAgentPanel token={token} prefillTask={prefillTask} setPrefillTask={setPrefillTask} onTaskCompleted={fetchData} />
            </Suspense>
          )}

          {section === 'data-integrity-auditor' && (
            <Suspense fallback={panelFallback}>
              <DataIntegrityAuditorPanel token={token} prefillTask={prefillTask} setPrefillTask={setPrefillTask} onTaskCompleted={fetchData} />
            </Suspense>
          )}
        </AdminLayout>
      </div>
    </div>
  );
}

// ── Password Gate ────────────────────────────────────────────────────────────
export default function AdminPage() {
  // AUTH-001: Store the HMAC-signed token (not the raw password) in state
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
      const res  = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      const json = await res.json();
      if (res.ok && json.token) {
        setToken(json.token);
        setAuthed(true);
        setPw('');
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
