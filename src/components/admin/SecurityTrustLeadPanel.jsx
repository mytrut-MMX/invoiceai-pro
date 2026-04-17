import { useState } from 'react';
import { s } from './adminShared';

const IMPACT_COLORS = {
  low:      '#0EA5E9',
  medium:   '#F59E0B',
  high:     '#EA580C',
  critical: '#DC2626',
};

export default function SecurityTrustLeadPanel({ token }) {
  const [objectiveId,     setObjectiveId]     = useState('');
  const [taskId,          setTaskId]          = useState('');
  const [taskTitle,       setTaskTitle]       = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [contextText,     setContextText]     = useState('{}');
  const [running,         setRunning]         = useState(false);
  const [result,          setResult]          = useState(null);
  const [error,           setError]           = useState('');

  const runSecurityTrustLead = async () => {
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
      const res = await fetch('/api/security-trust-lead', {
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
      if (!res.ok || json.success === false) throw new Error(json.error || 'Failed to run Security & Trust Lead');
      setResult(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  const spec = result?.data;

  return (
    <div style={{ background:'#fff', border:'1px solid #E2E8F0', borderRadius:12, padding:'20px 24px', marginBottom:24 }}>
      <div style={s.sectionTitle}>Run Security & Trust Lead</div>

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
          placeholder="Describe the security/trust task in detail..."
          style={{ ...s.input, minHeight:120, resize:'vertical' }} />
      </div>

      <div style={{ marginBottom:16 }}>
        <label style={s.label}>context (JSON)</label>
        <textarea value={contextText} onChange={e => setContextText(e.target.value)}
          placeholder='{"key": "value"}'
          style={{ ...s.input, minHeight:100, resize:'vertical', fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace' }} />
      </div>

      <button style={s.btnSm} onClick={runSecurityTrustLead} disabled={running}>
        {running ? 'Running…' : 'Run Security & Trust Lead'}
      </button>

      {spec && (
        <div style={{ marginTop:16 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#0F172A', marginBottom:12 }}>Security & Trust Lead Spec</div>

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
            <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8 }}>Threat Model</div>
            <div style={{ display:'grid', gap:8 }}>
              {(spec.threat_model || []).map((t, i) => (
                <div key={i} style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', borderRadius:8, padding:'10px 12px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', gap:12, marginBottom:4, flexWrap:'wrap', alignItems:'center' }}>
                    <span style={{ fontSize:12, fontWeight:700, color:'#0F172A' }}>{t.threat}</span>
                    <span style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
                      <span style={{ fontSize:11, fontWeight:700, color:'#0EA5E9' }}>{t.likelihood}</span>
                      <span style={{ fontSize:11, fontWeight:700, color: IMPACT_COLORS[t.impact] || '#0EA5E9' }}>{t.impact}</span>
                    </span>
                  </div>
                  <div style={{ fontSize:12, color:'#64748B', marginBottom:4 }}>
                    <strong>Attack vector:</strong> {t.attack_vector || '—'}
                  </div>
                  <div style={{ fontSize:12, color:'#64748B' }}>
                    <strong>Mitigation:</strong> {t.mitigation || '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8 }}>Auth Impact</div>
            <div style={{ background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:8, padding:'12px 14px' }}>
              <div style={{ fontSize:13, color:'#0F172A', marginBottom:6 }}>
                <strong>Affected flows:</strong> {spec.auth_impact?.affected_flows?.length ? spec.auth_impact.affected_flows.join(', ') : 'None'}
              </div>
              <div style={{ fontSize:13, color:'#0F172A', marginBottom:6 }}>
                <strong>Session changes:</strong> {spec.auth_impact?.session_changes || '—'}
              </div>
              <div style={{ fontSize:13, color:'#0F172A', marginBottom:6 }}>
                <strong>RLS changes:</strong> {spec.auth_impact?.rls_changes || '—'}
              </div>
              <div style={{ fontSize:13, color:'#0F172A' }}>
                <strong>Token handling:</strong> {spec.auth_impact?.token_handling || '—'}
              </div>
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8 }}>Exposure Analysis</div>
            <div style={{ display:'grid', gap:8 }}>
              {(spec.exposure_analysis || []).map((e, i) => (
                <div key={i} style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', borderRadius:8, padding:'10px 12px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', gap:12, marginBottom:4, flexWrap:'wrap', alignItems:'center' }}>
                    <span style={{ fontSize:12, fontWeight:700, color:'#0F172A', fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{e.asset}</span>
                    <span style={{ fontSize:11, fontWeight:700, color:'#0EA5E9' }}>{e.asset_type}</span>
                  </div>
                  <div style={{ fontSize:12, color:'#64748B', marginBottom:4 }}>
                    <strong>Current exposure:</strong> {e.current_exposure || '—'}
                  </div>
                  <div style={{ fontSize:12, color:'#64748B', marginBottom:4 }}>
                    <strong>Desired exposure:</strong> {e.desired_exposure || '—'}
                  </div>
                  <div style={{ fontSize:12, color:'#64748B' }}>
                    <strong>Remediation:</strong> {e.remediation || '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8 }}>Headers Changes</div>
            <div style={{ display:'grid', gap:8 }}>
              {(spec.headers_changes || []).map((h, i) => (
                <div key={i} style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', borderRadius:8, padding:'10px 12px' }}>
                  <div style={{ marginBottom:4 }}>
                    <span style={{ fontSize:12, fontWeight:700, color:'#0F172A', fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{h.header}</span>
                  </div>
                  <div style={{ fontSize:12, color:'#64748B', marginBottom:4 }}>
                    <strong>Current value:</strong>{' '}
                    <span style={{ fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{h.current_value ? h.current_value : '(not set)'}</span>
                  </div>
                  <div style={{ fontSize:12, color:'#64748B', marginBottom:4 }}>
                    <strong>Proposed value:</strong>{' '}
                    <span style={{ fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{h.proposed_value || '—'}</span>
                  </div>
                  <div style={{ fontSize:12, color:'#64748B' }}>
                    <strong>Reason:</strong> {h.reason || '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8 }}>Data Handling</div>
            <div style={{ background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:8, padding:'12px 14px' }}>
              <div style={{ fontSize:13, color:'#0F172A', marginBottom:6 }}>
                <strong>PII involved:</strong> {spec.data_handling?.pii_involved ? 'Yes' : 'No'}
              </div>
              <div style={{ fontSize:13, color:'#0F172A', marginBottom:6 }}>
                <strong>Encryption at rest:</strong> {spec.data_handling?.encryption_at_rest || '—'}
              </div>
              <div style={{ fontSize:13, color:'#0F172A', marginBottom:6 }}>
                <strong>Encryption in transit:</strong> {spec.data_handling?.encryption_in_transit || '—'}
              </div>
              <div style={{ fontSize:13, color:'#0F172A' }}>
                <strong>Retention policy:</strong> {spec.data_handling?.retention_policy || '—'}
              </div>
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8 }}>Compliance Notes</div>
            <div style={{ display:'grid', gap:8 }}>
              {(spec.compliance_notes || []).map((c, i) => (
                <div key={i} style={{ background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:8, padding:'10px 12px', fontSize:13, color:'#0F172A' }}>
                  {c}
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
