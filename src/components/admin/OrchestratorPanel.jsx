import { useState } from 'react';

const s = {
  label:    { display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 },
  input:    { width:'100%', padding:'11px 14px', border:'1.5px solid #E2E8F0', borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box' },
  btnSm:    { padding:'6px 14px', background:'#0EA5E9', color:'#fff', border:'none', borderRadius:6, fontSize:13, fontWeight:600, cursor:'pointer' },
  err:      { background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#DC2626', marginBottom:12 },
  sectionTitle: { fontSize:18, fontWeight:700, color:'#0F172A', marginBottom:16 },
};

export default function OrchestratorPanel({ token }) {
  const [orchTitle,     setOrchTitle]     = useState('');
  const [orchObjective, setOrchObjective] = useState('');
  const [orchRunning,   setOrchRunning]   = useState(false);
  const [orchResult,    setOrchResult]    = useState(null);
  const [orchError,     setOrchError]     = useState('');

  const runOrchestrator = async () => {
    setOrchError('');
    setOrchResult(null);

    if (!orchObjective.trim()) { setOrchError('Objective is required.'); return; }

    setOrchRunning(true);
    try {
      const res = await fetch('/api/orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title: orchTitle, objective: orchObjective, context: {} }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to run orchestrator');
      setOrchResult(json);
    } catch (e) {
      setOrchError(e.message);
    } finally {
      setOrchRunning(false);
    }
  };

  return (
    <div style={{ background:'#fff', border:'1px solid #E2E8F0', borderRadius:12, padding:'20px 24px', marginBottom:24 }}>
      <div style={s.sectionTitle}>Run Executive Orchestrator</div>

      {orchError && <div style={{ ...s.err, marginBottom:16 }}>{orchError}</div>}

      <div style={{ marginBottom:12 }}>
        <label style={s.label}>Title</label>
        <input type="text" value={orchTitle} onChange={e => setOrchTitle(e.target.value)}
          placeholder="Example: Expenses module upgrade" style={s.input} />
      </div>

      <div style={{ marginBottom:16 }}>
        <label style={s.label}>Objective</label>
        <textarea value={orchObjective} onChange={e => setOrchObjective(e.target.value)}
          placeholder="Describe the objective for the agent..."
          style={{ ...s.input, minHeight:120, resize:'vertical' }} />
      </div>

      <button style={s.btnSm} onClick={runOrchestrator} disabled={orchRunning}>
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
  );
}
