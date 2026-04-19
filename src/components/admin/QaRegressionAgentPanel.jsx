import { useState, useEffect } from 'react';
import { s, markTaskCompleted } from './adminShared';

const SECTION_ID = 'qa-regression-agent';

const VERDICT_COLORS = {
  pass:             { bg: '#F0FDF4', border: '#86EFAC', text: '#166534' },
  conditional_pass: { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E' },
  fail:             { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B' },
  blocked:          { bg: '#F1F5F9', border: '#CBD5E1', text: '#475569' },
};

const PRIORITY_COLORS = {
  low:      '#0EA5E9',
  medium:   '#F59E0B',
  high:     '#EA580C',
  critical: '#DC2626',
};

const SEVERITY_COLORS = {
  low:    '#0EA5E9',
  medium: '#F59E0B',
  high:   '#DC2626',
};

export default function QaRegressionAgentPanel({ token, prefillTask, setPrefillTask, onTaskCompleted }) {
  const [objectiveId,     setObjectiveId]     = useState('');
  const [taskId,          setTaskId]          = useState('');
  const [taskTitle,       setTaskTitle]       = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [contextText,     setContextText]     = useState('{}');
  const [running,         setRunning]         = useState(false);
  const [result,          setResult]          = useState(null);
  const [error,           setError]           = useState('');

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

  const runQaRegressionAgent = async () => {
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
      const res = await fetch('/api/qa-regression-agent', {
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
      if (!res.ok || json.success === false) throw new Error(json.error || 'Failed to run QA Regression Agent');
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
  const verdictColors = VERDICT_COLORS[spec?.verdict?.verdict] || VERDICT_COLORS.blocked;

  return (
    <div style={{ background:'#fff', border:'1px solid #E2E8F0', borderRadius:12, padding:'20px 24px', marginBottom:24 }}>
      <div style={s.sectionTitle}>Run QA Regression Agent</div>

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
          placeholder="Describe the QA/regression task in detail..."
          style={{ ...s.input, minHeight:120, resize:'vertical' }} />
      </div>

      <div style={{ marginBottom:16 }}>
        <label style={s.label}>context (JSON)</label>
        <textarea value={contextText} onChange={e => setContextText(e.target.value)}
          placeholder='{"key": "value"}'
          style={{ ...s.input, minHeight:100, resize:'vertical', fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace' }} />
      </div>

      <button style={s.btnSm} onClick={runQaRegressionAgent} disabled={running}>
        {running ? 'Running…' : 'Run QA Regression Agent'}
      </button>

      {spec && (
        <div style={{ marginTop:16 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#0F172A', marginBottom:12 }}>QA Regression Agent Spec</div>

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
            <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8 }}>Verdict</div>
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
                }}>{spec.verdict?.verdict || '—'}</span>
                <span style={{
                  display:'inline-block',
                  padding:'4px 10px',
                  borderRadius:999,
                  background:'#fff',
                  border:'1px solid #E2E8F0',
                  fontSize:11,
                  fontWeight:700,
                  color:'#475569',
                }}>Confidence: {spec.verdict?.confidence || '—'}</span>
              </div>
              <div style={{ fontSize:13, color: verdictColors.text, marginBottom:10 }}>
                <strong>Rationale:</strong> {spec.verdict?.rationale || '—'}
              </div>

              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:12, fontWeight:700, color: verdictColors.text, marginBottom:6 }}>Blocking issues</div>
                {spec.verdict?.blocking_issues?.length ? (
                  <div style={{ display:'grid', gap:6 }}>
                    {spec.verdict.blocking_issues.map((b, i) => (
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
                {spec.verdict?.non_blocking_issues?.length ? (
                  <div style={{ display:'grid', gap:6 }}>
                    {spec.verdict.non_blocking_issues.map((n, i) => (
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
            <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8 }}>Test Matrix</div>
            <div style={{ display:'grid', gap:8 }}>
              {(spec.test_matrix || []).map((m, i) => (
                <div key={i} style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', borderRadius:8, padding:'10px 12px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', gap:12, marginBottom:6, flexWrap:'wrap', alignItems:'center' }}>
                    <span style={{ fontSize:12, fontWeight:700, color:'#0F172A' }}>{m.area}</span>
                    <span style={{ fontSize:11, fontWeight:700, color:'#0EA5E9' }}>{m.test_type}</span>
                  </div>
                  <div style={{ marginBottom:6 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:4 }}>Test cases</div>
                    {m.test_cases?.length ? (
                      <ul style={{ margin:0, paddingLeft:18 }}>
                        {m.test_cases.map((tc, j) => (
                          <li key={j} style={{ fontSize:12, color:'#0F172A', marginBottom:2 }}>{tc}</li>
                        ))}
                      </ul>
                    ) : (
                      <div style={{ fontSize:12, color:'#64748B' }}>None</div>
                    )}
                  </div>
                  <div style={{ fontSize:12, color:'#64748B', marginBottom:6 }}>
                    <strong>Existing test files:</strong>{' '}
                    <span style={{ fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                      {m.existing_test_files?.length ? m.existing_test_files.join(', ') : 'None'}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:4 }}>Test files to add</div>
                    {m.test_files_to_add?.length ? (
                      <div style={{ display:'grid', gap:6 }}>
                        {m.test_files_to_add.map((f, j) => (
                          <div key={j} style={{ background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:6, padding:'8px 10px' }}>
                            <div style={{ fontSize:12, fontWeight:700, color:'#0F172A', fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace', marginBottom:4 }}>{f.path}</div>
                            <div style={{ fontSize:12, color:'#64748B', marginBottom:4 }}>
                              <strong>Purpose:</strong> {f.purpose || '—'}
                            </div>
                            <div style={{ fontSize:12, color:'#64748B' }}>
                              <strong>Covers cases:</strong> {f.covers_cases?.length ? f.covers_cases.join(', ') : 'None'}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize:12, color:'#64748B' }}>None</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8 }}>Regression Scenarios</div>
            <div style={{ display:'grid', gap:8 }}>
              {(spec.regression_scenarios || []).map((r, i) => (
                <div key={i} style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', borderRadius:8, padding:'10px 12px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', gap:12, marginBottom:6, flexWrap:'wrap', alignItems:'center' }}>
                    <span style={{ fontSize:12, fontWeight:700, color:'#0F172A' }}>{r.scenario}</span>
                    <span style={{ fontSize:11, fontWeight:700, color: PRIORITY_COLORS[r.priority] || '#0EA5E9' }}>{r.priority}</span>
                  </div>
                  <div style={{ fontSize:12, color:'#64748B', marginBottom:4 }}>
                    <strong>Affected by:</strong>{' '}
                    <span style={{ fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{r.affected_by || '—'}</span>
                  </div>
                  <div style={{ fontSize:12, color:'#64748B', marginBottom:6 }}>
                    <strong>Expected behavior:</strong> {r.expected_behavior || '—'}
                  </div>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:4 }}>Reproduction steps</div>
                    {r.reproduction_steps?.length ? (
                      <ol style={{ margin:0, paddingLeft:18 }}>
                        {r.reproduction_steps.map((step, j) => (
                          <li key={j} style={{ fontSize:12, color:'#0F172A', marginBottom:2 }}>{step}</li>
                        ))}
                      </ol>
                    ) : (
                      <div style={{ fontSize:12, color:'#64748B' }}>None</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8 }}>Coverage Gaps</div>
            <div style={{ display:'grid', gap:8 }}>
              {(spec.coverage_gaps || []).map((g, i) => (
                <div key={i} style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', borderRadius:8, padding:'10px 12px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', gap:12, marginBottom:4, flexWrap:'wrap', alignItems:'center' }}>
                    <span style={{ fontSize:12, fontWeight:700, color:'#0F172A' }}>{g.area}</span>
                    <span style={{ fontSize:11, fontWeight:700, color: SEVERITY_COLORS[g.severity] || '#0EA5E9' }}>{g.severity}</span>
                  </div>
                  <div style={{ fontSize:12, color:'#64748B', marginBottom:4 }}>
                    <strong>Gap:</strong> {g.gap_description || '—'}
                  </div>
                  <div style={{ fontSize:12, color:'#64748B' }}>
                    <strong>Recommendation:</strong> {g.recommendation || '—'}
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
