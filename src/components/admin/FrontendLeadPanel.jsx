import { useState, useEffect } from 'react';
import { s, markTaskCompleted } from './adminShared';

const SECTION_ID = 'frontend-lead';

export default function FrontendLeadPanel({ token, prefillTask, setPrefillTask, onTaskCompleted }) {
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

  const runFrontendLead = async () => {
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
      const res = await fetch('/api/frontend-architecture-lead', {
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
      if (!res.ok || json.success === false) throw new Error(json.error || 'Failed to run Frontend Lead');
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

  return (
    <div style={{ background:'#fff', border:'1px solid #E2E8F0', borderRadius:12, padding:'20px 24px', marginBottom:24 }}>
      <div style={s.sectionTitle}>Run Frontend Architecture Lead</div>

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
          placeholder="Describe the frontend task in detail..."
          style={{ ...s.input, minHeight:120, resize:'vertical' }} />
      </div>

      <div style={{ marginBottom:16 }}>
        <label style={s.label}>context (JSON)</label>
        <textarea value={contextText} onChange={e => setContextText(e.target.value)}
          placeholder='{"key": "value"}'
          style={{ ...s.input, minHeight:100, resize:'vertical', fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace' }} />
      </div>

      <button style={s.btnSm} onClick={runFrontendLead} disabled={running}>
        {running ? 'Running…' : 'Run Frontend Lead'}
      </button>

      {spec && (
        <div style={{ marginTop:16 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#0F172A', marginBottom:12 }}>Frontend Lead Spec</div>

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
            <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8 }}>Components</div>
            <div style={{ display:'grid', gap:8 }}>
              {(spec.components || []).map((c, i) => (
                <div key={i} style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', borderRadius:8, padding:'10px 12px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', gap:12, marginBottom:4, flexWrap:'wrap' }}>
                    <span style={{ fontSize:12, fontWeight:700, color:'#0F172A' }}>{c.name}</span>
                    <span style={{ fontSize:11, fontWeight:700, color:'#0EA5E9' }}>{c.role}</span>
                  </div>
                  <div style={{ fontSize:12, color:'#64748B', marginBottom:4 }}>
                    Props: {c.props?.length ? c.props.join(', ') : 'None'}
                  </div>
                  {c.state_notes && <div style={{ fontSize:12, color:'#64748B' }}>{c.state_notes}</div>}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8 }}>Dependencies</div>
            <div style={{ display:'grid', gap:8 }}>
              {(spec.dependencies || []).map((d, i) => (
                <div key={i} style={{ background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:8, padding:'10px 12px', display:'flex', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
                  <span style={{ fontSize:12, fontWeight:700, color:'#0F172A' }}>{d.name}</span>
                  <span style={{ fontSize:11, fontWeight:700, color:'#64748B' }}>{d.type}</span>
                  <span style={{ fontSize:11, fontWeight:700, color: d.status === 'blocked' ? '#DC2626' : '#475569' }}>{d.status}</span>
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
