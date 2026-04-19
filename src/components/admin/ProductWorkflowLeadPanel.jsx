import { useState } from 'react';
import { s } from './adminShared';

const COMPLEXITY_COLORS = {
  low:    '#0EA5E9',
  medium: '#F59E0B',
  high:   '#DC2626',
};

const DEP_STATUS_COLORS = {
  required: '#0EA5E9',
  optional: '#64748B',
  blocked:  '#DC2626',
};

const STATUS_COLORS = {
  ready_for_execution:    { bg: '#F0FDF4', border: '#86EFAC', text: '#166534' },
  needs_clarification:    { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E' },
  blocked_by_dependency:  { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B' },
};

const monoBadge = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: 999,
  background: '#F1F5F9',
  border: '1px solid #CBD5E1',
  fontSize: 11,
  fontWeight: 700,
  color: '#0F172A',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
};

export default function ProductWorkflowLeadPanel({ token }) {
  const [objectiveId,     setObjectiveId]     = useState('');
  const [taskId,          setTaskId]          = useState('');
  const [taskTitle,       setTaskTitle]       = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [contextText,     setContextText]     = useState('{}');
  const [running,         setRunning]         = useState(false);
  const [result,          setResult]          = useState(null);
  const [error,           setError]           = useState('');

  const runProductWorkflowLead = async () => {
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
      const res = await fetch('/api/product-workflow-lead', {
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
      if (!res.ok || json.success === false) throw new Error(json.error || 'Failed to run Product Workflow Lead');
      setResult(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  const spec = result?.data;
  const statusColors = STATUS_COLORS[spec?.status] || STATUS_COLORS.needs_clarification;

  return (
    <div style={{ background:'#fff', border:'1px solid #E2E8F0', borderRadius:12, padding:'20px 24px', marginBottom:24 }}>
      <div style={s.sectionTitle}>Run Product Workflow Lead</div>

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
          placeholder="Describe the task intent, success criteria, and constraints..."
          style={{ ...s.input, minHeight:120, resize:'vertical' }} />
      </div>

      <div style={{ marginBottom:16 }}>
        <label style={s.label}>context (JSON)</label>
        <textarea value={contextText} onChange={e => setContextText(e.target.value)}
          placeholder='{"key": "value"}'
          style={{ ...s.input, minHeight:100, resize:'vertical', fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace' }} />
      </div>

      <button style={s.btnSm} onClick={runProductWorkflowLead} disabled={running}>
        {running ? 'Running…' : 'Run Product Workflow Lead'}
      </button>

      {spec && (
        <div style={{ marginTop:16 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#0F172A', marginBottom:12 }}>Product Workflow Lead Spec</div>

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
                <strong>Complexity:</strong>{' '}
                <span style={{ color: COMPLEXITY_COLORS[spec.summary?.complexity] || '#475569', fontWeight:700 }}>
                  {spec.summary?.complexity || '—'}
                </span>
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
            <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8 }}>User Flow</div>
            <div style={{ display:'grid', gap:6 }}>
              {(spec.workflow?.user_flow || []).map((step, i) => (
                <div key={i} style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', borderRadius:8, padding:'10px 12px' }}>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginBottom:6 }}>
                    <span style={monoBadge}>#{step.step}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:'#0EA5E9' }}>{step.actor}</span>
                  </div>
                  <div style={{ fontSize:13, color:'#0F172A', marginBottom:4 }}>
                    <strong>Action:</strong> {step.action}
                  </div>
                  <div style={{ fontSize:12, color:'#64748B' }}>
                    <strong>Expected:</strong> {step.expected_result}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8 }}>System Flow</div>
            <div style={{ display:'grid', gap:6 }}>
              {(spec.workflow?.system_flow || []).map((step, i) => (
                <div key={i} style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', borderRadius:8, padding:'10px 12px' }}>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginBottom:6 }}>
                    <span style={monoBadge}>#{step.step}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:'#8B5CF6' }}>{step.component}</span>
                  </div>
                  <div style={{ fontSize:13, color:'#0F172A', marginBottom:4 }}>
                    <strong>Action:</strong> {step.action}
                  </div>
                  <div style={{ fontSize:12, color:'#64748B' }}>
                    <strong>Expected:</strong> {step.expected_result}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8 }}>Business Rules</div>
            <div style={{ display:'grid', gap:6 }}>
              {(spec.business_rules || []).map((r, i) => (
                <div key={i} style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', borderRadius:8, padding:'10px 12px' }}>
                  <div style={{ display:'flex', gap:8, marginBottom:6 }}>
                    <span style={monoBadge}>{r.id}</span>
                  </div>
                  <div style={{ fontSize:13, color:'#0F172A', marginBottom:4 }}>{r.rule}</div>
                  <div style={{ fontSize:12, color:'#64748B' }}>
                    <strong>Reason:</strong> {r.reason}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8 }}>Edge Cases</div>
            <div style={{ display:'grid', gap:6 }}>
              {(spec.edge_cases || []).map((e, i) => (
                <div key={i} style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', borderRadius:8, padding:'10px 12px' }}>
                  <div style={{ display:'flex', gap:8, marginBottom:6 }}>
                    <span style={monoBadge}>{e.id}</span>
                  </div>
                  <div style={{ fontSize:13, color:'#0F172A', marginBottom:4 }}>
                    <strong>Scenario:</strong> {e.scenario}
                  </div>
                  <div style={{ fontSize:12, color:'#64748B' }}>
                    <strong>Expected behavior:</strong> {e.expected_behavior}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8 }}>Acceptance Criteria</div>
            <div style={{ display:'grid', gap:6 }}>
              {(spec.acceptance_criteria || []).map((c, i) => (
                <div key={i} style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', borderRadius:8, padding:'10px 12px' }}>
                  <div style={{ display:'flex', gap:8, marginBottom:6 }}>
                    <span style={monoBadge}>{c.id}</span>
                  </div>
                  <div style={{ fontSize:13, color:'#0F172A', marginBottom:4 }}>{c.criterion}</div>
                  <div style={{ fontSize:12, color:'#64748B' }}>
                    <strong>Validation:</strong> {c.validation_method}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8 }}>Dependencies</div>
            <div style={{ display:'grid', gap:6 }}>
              {(spec.dependencies || []).map((d, i) => (
                <div key={i} style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', borderRadius:8, padding:'10px 12px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', gap:12, flexWrap:'wrap', alignItems:'center' }}>
                    <span style={{ fontSize:12, fontWeight:700, color:'#0F172A' }}>{d.name}</span>
                    <div style={{ display:'flex', gap:8 }}>
                      <span style={{ fontSize:11, fontWeight:700, color:'#0EA5E9' }}>{d.type}</span>
                      <span style={{ fontSize:11, fontWeight:700, color: DEP_STATUS_COLORS[d.status] || '#475569' }}>{d.status}</span>
                    </div>
                  </div>
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
            <div style={{ background: statusColors.bg, border:`1px solid ${statusColors.border}`, borderRadius:8, padding:'12px 14px', fontSize:13, fontWeight:700, color: statusColors.text, textTransform:'uppercase', letterSpacing:0.5 }}>
              {spec.status || '—'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
