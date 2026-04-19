import { useState, useEffect } from 'react';
import { s, markTaskCompleted, specToPrompt } from './adminShared';

const SECTION_ID = 'release-gate-agent';

const VERDICT_COLORS = {
  go:             { bg: '#F0FDF4', border: '#86EFAC', text: '#166534' },
  conditional_go: { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E' },
  no_go:          { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B' },
  blocked:        { bg: '#F1F5F9', border: '#CBD5E1', text: '#475569' },
};

const STATUS_COLORS = {
  verified: '#16A34A',
  missing:  '#DC2626',
  changed:  '#F59E0B',
  unused:   '#94A3B8',
};

const CONTEXT_COLORS = {
  vercel:      '#0EA5E9',
  supabase:    '#16A34A',
  third_party: '#F59E0B',
  ci:          '#94A3B8',
};

const SIGNOFF_COLORS = {
  approved:     '#16A34A',
  pending:      '#F59E0B',
  rejected:     '#DC2626',
  not_required: '#94A3B8',
};

const RISK_LEVEL_COLORS = {
  low:    '#0EA5E9',
  medium: '#F59E0B',
  high:   '#DC2626',
};

export default function ReleaseGateAgentPanel({ token, prefillTask, setPrefillTask, onTaskCompleted }) {
  const [objectiveId,     setObjectiveId]     = useState('');
  const [taskId,          setTaskId]          = useState('');
  const [taskTitle,       setTaskTitle]       = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [contextText,     setContextText]     = useState('{}');
  const [running,         setRunning]         = useState(false);
  const [result,          setResult]          = useState(null);
  const [error,           setError]           = useState('');
  const [copied,          setCopied]          = useState(false);

  useEffect(() => {
    if (!prefillTask || prefillTask.targetSection !== SECTION_ID) return;
    setObjectiveId(prefillTask.objectiveId || '');
    setTaskId(prefillTask.taskId || '');
    setTaskTitle(prefillTask.taskTitle || '');
    setTaskDescription(prefillTask.taskDescription || '');
    setContextText(JSON.stringify(prefillTask.context || {}, null, 2));
    setError('');
    setResult(null);
    if (setPrefillTask) setPrefillTask(null);
  }, [prefillTask, setPrefillTask]);

  const runReleaseGateAgent = async () => {
    setError('');
    setResult(null);

    if (!objectiveId.trim())     { setError('objective_id is required.');     return; }
    if (!taskId.trim())          { setError('task_id is required.');          return; }
    if (!taskTitle.trim())       { setError('task_title is required.');       return; }
    if (!taskDescription.trim()) { setError('task_description is required.'); return; }

    let parsedContext;
    try {
      parsedContext = JSON.parse(contextText);
      if (!parsedContext || typeof parsedContext !== 'object' || Array.isArray(parsedContext)) {
        setError('context must be a JSON object.');
        return;
      }
    } catch {
      setError('context must be valid JSON.');
      return;
    }

    setRunning(true);
    try {
      const res = await fetch('/api/release-gate-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          objective_id:     objectiveId.trim(),
          task_id:          taskId.trim(),
          task_title:       taskTitle.trim(),
          task_description: taskDescription.trim(),
          context:          parsedContext,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) throw new Error(json.error || 'Failed to run Release Gate Agent');
      setResult(json);
      await markTaskCompleted(taskId.trim(), token);
      if (onTaskCompleted) onTaskCompleted();
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  const spec = result?.data;
  const verdictColors = VERDICT_COLORS[spec?.go_no_go_verdict?.verdict] || VERDICT_COLORS.blocked;

  const copyAsCCPrompt = async () => {
    try { await navigator.clipboard.writeText(specToPrompt('Release Gate Agent', spec)); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ background:'#fff', border:'1px solid #E2E8F0', borderRadius:12, padding:'20px 24px', marginBottom:24 }}>
      <div style={s.sectionTitle}>Run Release Gate Agent</div>

      {error && <div style={{ ...s.err, marginBottom:16 }}>{error}</div>}

      <div style={{ marginBottom:12 }}>
        <label style={s.label}>objective_id</label>
        <input type="text" value={objectiveId} onChange={e => setObjectiveId(e.target.value)}
          placeholder="e.g. OBJ-123" style={s.input} />
      </div>

      <div style={{ marginBottom:12 }}>
        <label style={s.label}>task_id</label>
        <input type="text" value={taskId} onChange={e => setTaskId(e.target.value)}
          placeholder="e.g. TASK-1" style={s.input} />
      </div>

      <div style={{ marginBottom:12 }}>
        <label style={s.label}>task_title</label>
        <input type="text" value={taskTitle} onChange={e => setTaskTitle(e.target.value)}
          placeholder="Short title for the task" style={s.input} />
      </div>

      <div style={{ marginBottom:12 }}>
        <label style={s.label}>task_description</label>
        <textarea value={taskDescription} onChange={e => setTaskDescription(e.target.value)}
          placeholder="Describe the release gate task in detail..."
          style={{ ...s.input, minHeight:120, resize:'vertical' }} />
      </div>

      <div style={{ marginBottom:16 }}>
        <label style={s.label}>context (JSON)</label>
        <textarea value={contextText} onChange={e => setContextText(e.target.value)}
          placeholder='{"key": "value"}'
          style={{ ...s.input, minHeight:100, resize:'vertical', fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace' }} />
      </div>

      <button style={s.btnSm} onClick={runReleaseGateAgent} disabled={running}>
        {running ? 'Running…' : 'Run Release Gate Agent'}
      </button>

      {spec && (
        <div style={{ marginTop:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, marginBottom:12, flexWrap:'wrap' }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#0F172A' }}>Release Gate Agent Spec</div>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              {copied && <span style={{ fontSize:12, color:'#16A34A', fontWeight:600 }}>Prompt copied — paste into Claude Code</span>}
              <button style={s.btnSm} onClick={copyAsCCPrompt}>Copy as CC Prompt</button>
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8 }}>Summary</div>
            <div style={{ background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:8, padding:'12px 14px' }}>
              <div style={{ fontSize:13, color:'#0F172A', marginBottom:6 }}>
                <strong>Goal:</strong> {spec.summary?.task_goal || '—'}
              </div>
              <div style={{ fontSize:13, color:'#0F172A', marginBottom:6 }}>
                <strong>Type:</strong> {spec.summary?.task_type || '—'}
              </div>
              <div style={{ fontSize:13, color:'#0F172A' }}>
                <strong>Complexity:</strong> {spec.summary?.complexity || '—'}
              </div>
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8 }}>Scope</div>
            <div style={{ background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:8, padding:'12px 14px' }}>
              <div style={{ fontSize:13, color:'#0F172A', marginBottom:6 }}>
                <strong>Goal:</strong> {spec.scope?.goal || '—'}
              </div>
              <div style={{ fontSize:13, color:'#0F172A', marginBottom:6 }}>
                <strong>In scope:</strong> {spec.scope?.in_scope?.length ? spec.scope.in_scope.join(', ') : 'None'}
              </div>
              <div style={{ fontSize:13, color:'#0F172A', marginBottom:6 }}>
                <strong>Out of scope:</strong> {spec.scope?.out_of_scope?.length ? spec.scope.out_of_scope.join(', ') : 'None'}
              </div>
              <div style={{ fontSize:13, color:'#0F172A' }}>
                <strong>Assumptions:</strong> {spec.scope?.assumptions?.length ? spec.scope.assumptions.join(', ') : 'None'}
              </div>
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8 }}>Go/No-Go Verdict</div>
            <div style={{ background: verdictColors.bg, border:`1px solid ${verdictColors.border}`, borderRadius:8, padding:'14px 16px' }}>
              <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', marginBottom:10 }}>
                <span style={{
                  display:'inline-block',
                  padding:'4px 10px',
                  borderRadius:999,
                  background:'#fff',
                  border:`1px solid ${verdictColors.border}`,
                  fontSize:12,
                  fontWeight:700,
                  color: verdictColors.text,
                  textTransform:'uppercase',
                  letterSpacing:0.5,
                }}>{spec.go_no_go_verdict?.verdict || '—'}</span>
                <span style={{
                  display:'inline-block',
                  padding:'4px 10px',
                  borderRadius:999,
                  background:'#fff',
                  border:'1px solid #E2E8F0',
                  fontSize:11,
                  fontWeight:700,
                  color:'#475569',
                }}>Confidence: {spec.go_no_go_verdict?.confidence || '—'}</span>
              </div>
              <div style={{ fontSize:13, color: verdictColors.text, marginBottom:10 }}>
                <strong>Rationale:</strong> {spec.go_no_go_verdict?.rationale || '—'}
              </div>

              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:12, fontWeight:700, color: verdictColors.text, marginBottom:6 }}>Blocking issues</div>
                {spec.go_no_go_verdict?.blocking_issues?.length ? (
                  <div style={{ display:'grid', gap:6 }}>
                    {spec.go_no_go_verdict.blocking_issues.map((b, i) => (
                      <div key={i} style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:6, padding:'8px 10px', fontSize:12, color:'#991B1B' }}>
                        {b}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize:12, color: verdictColors.text }}>None</div>
                )}
              </div>

              <div>
                <div style={{ fontSize:12, fontWeight:700, color: verdictColors.text, marginBottom:6 }}>Non-blocking issues</div>
                {spec.go_no_go_verdict?.non_blocking_issues?.length ? (
                  <div style={{ display:'grid', gap:6 }}>
                    {spec.go_no_go_verdict.non_blocking_issues.map((n, i) => (
                      <div key={i} style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:6, padding:'8px 10px', fontSize:12, color:'#92400E' }}>
                        {n}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize:12, color: verdictColors.text }}>None</div>
                )}
              </div>
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8 }}>Env Verification</div>
            <div style={{ display:'grid', gap:8 }}>
              {(spec.env_verification || []).map((e, i) => (
                <div key={i} style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', borderRadius:8, padding:'10px 12px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', gap:12, marginBottom:6, flexWrap:'wrap', alignItems:'center' }}>
                    <span style={{ fontSize:12, fontWeight:700, color:'#0F172A', fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{e.variable}</span>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      <span style={{
                        display:'inline-block',
                        padding:'2px 8px',
                        borderRadius:999,
                        background:'#fff',
                        border:`1px solid ${CONTEXT_COLORS[e.context] || '#E2E8F0'}`,
                        fontSize:11,
                        fontWeight:700,
                        color: CONTEXT_COLORS[e.context] || '#475569',
                      }}>{e.context || '—'}</span>
                      <span style={{
                        display:'inline-block',
                        padding:'2px 8px',
                        borderRadius:999,
                        background:'#fff',
                        border:`1px solid ${STATUS_COLORS[e.status] || '#E2E8F0'}`,
                        fontSize:11,
                        fontWeight:700,
                        color: STATUS_COLORS[e.status] || '#475569',
                      }}>{e.status || '—'}</span>
                    </div>
                  </div>
                  <div style={{ fontSize:12, color:'#64748B' }}>
                    <strong>Notes:</strong> {e.notes || '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8 }}>Migration State</div>
            <div style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', borderRadius:8, padding:'10px 12px' }}>
              <div style={{ fontSize:13, color:'#0F172A', marginBottom:6 }}>
                <strong>Applied migrations verified:</strong>{' '}
                <span style={{ color: spec.migration_state?.applied_migrations_verified ? '#16A34A' : '#DC2626', fontWeight:700 }}>
                  {spec.migration_state?.applied_migrations_verified ? 'Yes' : 'No'}
                </span>
              </div>
              <div style={{ fontSize:13, color:'#0F172A', marginBottom:6 }}>
                <strong>Drift detected:</strong>{' '}
                <span style={{ color: spec.migration_state?.drift_detected ? '#DC2626' : '#16A34A', fontWeight:700 }}>
                  {spec.migration_state?.drift_detected ? 'Yes' : 'No'}
                </span>
              </div>
              <div style={{ fontSize:12, color:'#64748B', marginBottom:8 }}>
                <strong>Drift details:</strong> {spec.migration_state?.drift_details || '—'}
              </div>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:6 }}>Pending migrations</div>
                {spec.migration_state?.pending_migrations?.length ? (
                  <div style={{ display:'grid', gap:6 }}>
                    {spec.migration_state.pending_migrations.map((m, i) => (
                      <div key={i} style={{ background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:6, padding:'8px 10px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', gap:12, marginBottom:4, flexWrap:'wrap', alignItems:'center' }}>
                          <span style={{ fontSize:12, fontWeight:700, color:'#0F172A', fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{m.file}</span>
                          <span style={{ fontSize:11, fontWeight:700, color: RISK_LEVEL_COLORS[m.risk_level] || '#0EA5E9' }}>{m.risk_level}</span>
                        </div>
                        <div style={{ fontSize:12, color:'#64748B' }}>{m.description}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize:12, color:'#64748B' }}>None</div>
                )}
              </div>
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8 }}>Rollback Plan</div>
            <div style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', borderRadius:8, padding:'10px 12px' }}>
              <div style={{ marginBottom:10 }}>
                <span style={{
                  display:'inline-block',
                  padding:'4px 10px',
                  borderRadius:999,
                  background:'#F1F5F9',
                  border:'1px solid #CBD5E1',
                  fontSize:11,
                  fontWeight:700,
                  color:'#475569',
                  textTransform:'uppercase',
                  letterSpacing:0.5,
                }}>{spec.rollback_plan?.strategy || '—'}</span>
              </div>
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:4 }}>Steps</div>
                {spec.rollback_plan?.steps?.length ? (
                  <ol style={{ margin:0, paddingLeft:18 }}>
                    {spec.rollback_plan.steps.map((step, j) => (
                      <li key={j} style={{ fontSize:12, color:'#0F172A', marginBottom:2 }}>{step}</li>
                    ))}
                  </ol>
                ) : (
                  <div style={{ fontSize:12, color:'#64748B' }}>None</div>
                )}
              </div>
              <div style={{ fontSize:13, color:'#0F172A', marginBottom:6 }}>
                <strong>Estimated downtime:</strong> {spec.rollback_plan?.estimated_downtime_minutes ?? '—'} minutes
              </div>
              <div style={{ fontSize:13, color:'#0F172A', marginBottom:6 }}>
                <strong>Data implications:</strong> {spec.rollback_plan?.data_implications || '—'}
              </div>
              <div style={{ fontSize:13, color:'#0F172A' }}>
                <strong>Requires migration down:</strong>{' '}
                <span style={{ color: spec.rollback_plan?.requires_migration_down ? '#DC2626' : '#16A34A', fontWeight:700 }}>
                  {spec.rollback_plan?.requires_migration_down ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8 }}>Sign-offs</div>
            <div style={{ display:'grid', gap:8 }}>
              {(spec.sign_offs || []).map((so, i) => (
                <div key={i} style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', borderRadius:8, padding:'10px 12px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', gap:12, marginBottom:6, flexWrap:'wrap', alignItems:'center' }}>
                    <span style={{ fontSize:12, fontWeight:700, color:'#0F172A' }}>{so.agent_or_role}</span>
                    <span style={{
                      display:'inline-block',
                      padding:'2px 8px',
                      borderRadius:999,
                      background:'#fff',
                      border:`1px solid ${SIGNOFF_COLORS[so.status] || '#E2E8F0'}`,
                      fontSize:11,
                      fontWeight:700,
                      color: SIGNOFF_COLORS[so.status] || '#475569',
                    }}>{so.status || '—'}</span>
                  </div>
                  <div style={{ fontSize:12, color:'#64748B' }}>
                    <strong>Condition:</strong> {so.condition || '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8 }}>Affected Files</div>
            <div style={{ display:'grid', gap:8 }}>
              {(spec.affected_files || []).map((f, i) => (
                <div key={i} style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', borderRadius:8, padding:'10px 12px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', gap:12, marginBottom:4, flexWrap:'wrap' }}>
                    <span style={{ fontSize:12, fontWeight:700, color:'#0F172A' }}>{f.path}</span>
                    <span style={{ fontSize:11, fontWeight:700, color:'#0EA5E9' }}>{f.change_type}</span>
                  </div>
                  <div style={{ fontSize:12, color:'#64748B' }}>{f.reason}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8 }}>Risks</div>
            <div style={{ display:'grid', gap:8 }}>
              {(spec.risks || []).map((r, i) => (
                <div key={i} style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, padding:'10px 12px', fontSize:13, color:'#991B1B' }}>
                  {r}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8 }}>Handoff</div>
            <div style={{ background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:8, padding:'12px 14px' }}>
              <div style={{ fontSize:13, color:'#0F172A', marginBottom:6 }}>
                <strong>Next agent:</strong> {spec.handoff?.recommended_next_agent || '—'}
              </div>
              <div style={{ fontSize:13, color:'#0F172A', marginBottom:6 }}>
                <strong>Implementation notes:</strong> {spec.handoff?.implementation_notes?.length ? spec.handoff.implementation_notes.join('; ') : 'None'}
              </div>
              <div style={{ fontSize:13, color:'#0F172A' }}>
                <strong>QA focus:</strong> {spec.handoff?.qa_focus?.length ? spec.handoff.qa_focus.join('; ') : 'None'}
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8 }}>Status</div>
            <div style={{ background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:8, padding:'12px 14px', fontSize:13, color:'#0F172A' }}>
              {spec.status || '—'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
