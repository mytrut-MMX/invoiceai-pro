import { useState } from 'react';
import { s } from './adminShared';

const VERDICT_COLORS = {
  clean:            { bg: '#F0FDF4', border: '#86EFAC', text: '#166534' },
  issues_found:     { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E' },
  action_required:  { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B' },
  critical_failure: { bg: '#F1F5F9', border: '#94A3B8', text: '#1E293B' },
};

const SEVERITY_COLORS = {
  low:      '#0EA5E9',
  medium:   '#F59E0B',
  high:     '#EA580C',
  critical: '#DC2626',
};

const HEALTH_COLORS = {
  healthy:  '#16A34A',
  degraded: '#F59E0B',
  at_risk:  '#EA580C',
  critical: '#DC2626',
};

const CATEGORY_COLORS = {
  balance_check:        '#0EA5E9',
  orphan_detection:     '#EA580C',
  referential_integrity:'#8B5CF6',
  rls_verification:     '#16A34A',
  data_consistency:     '#F59E0B',
  duplicate_detection:  '#DC2626',
};

const ACTION_COLORS = {
  fix_query:      '#0EA5E9',
  migration:      '#8B5CF6',
  manual_review:  '#F59E0B',
  rls_update:     '#16A34A',
  backfill:       '#06B6D4',
  delete_orphans: '#DC2626',
  no_action:      '#94A3B8',
};

const RISK_LEVEL_COLORS = {
  low:    '#0EA5E9',
  medium: '#F59E0B',
  high:   '#DC2626',
};

const sqlBlockStyle = {
  background: '#0F172A',
  color: '#E2E8F0',
  borderRadius: 6,
  padding: '10px 12px',
  fontSize: 12,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  overflowX: 'auto',
  whiteSpace: 'pre-wrap',
  margin: 0,
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

function colorBadge(label, color) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 999,
      background: '#fff',
      border: `1px solid ${color || '#E2E8F0'}`,
      fontSize: 11,
      fontWeight: 700,
      color: color || '#475569',
    }}>{label || '—'}</span>
  );
}

export default function DataIntegrityAuditorPanel({ token }) {
  const [objectiveId,     setObjectiveId]     = useState('');
  const [taskId,          setTaskId]          = useState('');
  const [taskTitle,       setTaskTitle]       = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [contextText,     setContextText]     = useState('{}');
  const [running,         setRunning]         = useState(false);
  const [result,          setResult]          = useState(null);
  const [error,           setError]           = useState('');

  const runDataIntegrityAuditor = async () => {
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
      const res = await fetch('/api/data-integrity-auditor', {
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
      if (!res.ok || json.success === false) throw new Error(json.error || 'Failed to run Data Integrity Auditor');
      setResult(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  const spec = result?.data;
  const verdictColors = VERDICT_COLORS[spec?.audit_verdict?.verdict] || VERDICT_COLORS.critical_failure;

  return (
    <div style={{ background:'#fff', border:'1px solid #E2E8F0', borderRadius:12, padding:'20px 24px', marginBottom:24 }}>
      <div style={s.sectionTitle}>Run Data Integrity Auditor</div>

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
          placeholder="Short title for the audit" style={s.input} />
      </div>

      <div style={{ marginBottom:12 }}>
        <label style={s.label}>task_description</label>
        <textarea value={taskDescription} onChange={e => setTaskDescription(e.target.value)}
          placeholder="Describe the audit scope in detail..."
          style={{ ...s.input, minHeight:120, resize:'vertical' }} />
      </div>

      <div style={{ marginBottom:16 }}>
        <label style={s.label}>context (JSON)</label>
        <textarea value={contextText} onChange={e => setContextText(e.target.value)}
          placeholder='{"key": "value"}'
          style={{ ...s.input, minHeight:100, resize:'vertical', fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace' }} />
      </div>

      <button style={s.btnSm} onClick={runDataIntegrityAuditor} disabled={running}>
        {running ? 'Running…' : 'Run Data Integrity Auditor'}
      </button>

      {spec && (
        <div style={{ marginTop:16 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#0F172A', marginBottom:12 }}>Data Integrity Auditor Spec</div>

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
            <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8 }}>Audit Verdict</div>
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
                }}>{spec.audit_verdict?.verdict || '—'}</span>
                <span style={{
                  display:'inline-block',
                  padding:'4px 10px',
                  borderRadius:999,
                  background:'#fff',
                  border:'1px solid #E2E8F0',
                  fontSize:11,
                  fontWeight:700,
                  color:'#475569',
                }}>Confidence: {spec.audit_verdict?.confidence || '—'}</span>
              </div>
              <div style={{ fontSize:13, color: verdictColors.text, marginBottom:10 }}>
                <strong>Rationale:</strong> {spec.audit_verdict?.rationale || '—'}
              </div>

              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:12, fontWeight:700, color: verdictColors.text, marginBottom:6 }}>Blocking issues</div>
                {spec.audit_verdict?.blocking_issues?.length ? (
                  <div style={{ display:'grid', gap:6 }}>
                    {spec.audit_verdict.blocking_issues.map((b, i) => (
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
                {spec.audit_verdict?.non_blocking_issues?.length ? (
                  <div style={{ display:'grid', gap:6 }}>
                    {spec.audit_verdict.non_blocking_issues.map((n, i) => (
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
            <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8 }}>Severity Map</div>
            <div style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', borderRadius:8, padding:'12px 14px' }}>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:10 }}>
                <span style={{
                  display:'inline-block', padding:'6px 12px', borderRadius:8,
                  background:'#FEF2F2', border:`1px solid ${SEVERITY_COLORS.critical}`,
                  fontSize:12, fontWeight:700, color: SEVERITY_COLORS.critical,
                }}>Critical: {spec.severity_map?.critical_count ?? 0}</span>
                <span style={{
                  display:'inline-block', padding:'6px 12px', borderRadius:8,
                  background:'#FFF7ED', border:`1px solid ${SEVERITY_COLORS.high}`,
                  fontSize:12, fontWeight:700, color: SEVERITY_COLORS.high,
                }}>High: {spec.severity_map?.high_count ?? 0}</span>
                <span style={{
                  display:'inline-block', padding:'6px 12px', borderRadius:8,
                  background:'#FFFBEB', border:`1px solid ${SEVERITY_COLORS.medium}`,
                  fontSize:12, fontWeight:700, color: SEVERITY_COLORS.medium,
                }}>Medium: {spec.severity_map?.medium_count ?? 0}</span>
                <span style={{
                  display:'inline-block', padding:'6px 12px', borderRadius:8,
                  background:'#F0F9FF', border:`1px solid ${SEVERITY_COLORS.low}`,
                  fontSize:12, fontWeight:700, color: SEVERITY_COLORS.low,
                }}>Low: {spec.severity_map?.low_count ?? 0}</span>
              </div>
              <div style={{ fontSize:13, color:'#0F172A' }}>
                <strong>Overall health:</strong>{' '}
                {colorBadge(spec.severity_map?.overall_health, HEALTH_COLORS[spec.severity_map?.overall_health])}
              </div>
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8 }}>Audit Queries</div>
            <div style={{ display:'grid', gap:8 }}>
              {(spec.audit_queries || []).map((q, i) => (
                <div key={i} style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', borderRadius:8, padding:'10px 12px' }}>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginBottom:6 }}>
                    <span style={monoBadge}>{q.query_id}</span>
                    {colorBadge(q.category, CATEGORY_COLORS[q.category])}
                  </div>
                  <div style={{ fontSize:13, color:'#0F172A', marginBottom:6 }}>{q.description}</div>
                  <pre style={{ ...sqlBlockStyle, marginBottom:6 }}>{q.sql}</pre>
                  <div style={{ fontSize:12, color:'#64748B' }}>
                    <strong>Expected:</strong> {q.expected_result}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8 }}>Findings</div>
            <div style={{ display:'grid', gap:8 }}>
              {(spec.findings || []).map((f, i) => (
                <div key={i} style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', borderRadius:8, padding:'10px 12px' }}>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginBottom:6 }}>
                    <span style={monoBadge}>{f.finding_id}</span>
                    <span style={{ ...monoBadge, background:'#fff', borderColor:'#E2E8F0', color:'#475569' }}>→ {f.related_query}</span>
                    {colorBadge(f.severity, SEVERITY_COLORS[f.severity])}
                  </div>
                  <div style={{ fontSize:13, color:'#0F172A', marginBottom:6 }}>{f.description}</div>
                  <div style={{ fontSize:12, color:'#64748B', marginBottom:6 }}>
                    <strong>Affected records:</strong> {f.affected_records}
                  </div>
                  <pre style={sqlBlockStyle}>{f.evidence}</pre>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8 }}>Remediation Plan</div>
            <div style={{ display:'grid', gap:8 }}>
              {(spec.remediation_plan || []).map((r, i) => (
                <div key={i} style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', borderRadius:8, padding:'10px 12px' }}>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginBottom:6 }}>
                    <span style={monoBadge}>{r.finding_id}</span>
                    {colorBadge(r.action, ACTION_COLORS[r.action])}
                    {colorBadge(`risk: ${r.risk_level}`, RISK_LEVEL_COLORS[r.risk_level])}
                  </div>
                  <div style={{ fontSize:13, color:'#0F172A', marginBottom:6 }}>{r.description}</div>
                  {r.sql && r.sql.trim() && (
                    <pre style={{ ...sqlBlockStyle, marginBottom:6 }}>{r.sql}</pre>
                  )}
                  <div style={{ fontSize:12, color:'#0F172A' }}>
                    <strong>Requires backup:</strong>{' '}
                    <span style={{ color: r.requires_backup ? '#DC2626' : '#16A34A', fontWeight:700 }}>
                      {r.requires_backup ? 'Yes' : 'No'}
                    </span>
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
            <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8 }}>Dependencies</div>
            <div style={{ display:'grid', gap:8 }}>
              {(spec.dependencies || []).map((d, i) => (
                <div key={i} style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', borderRadius:8, padding:'10px 12px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
                    <span style={{ fontSize:12, fontWeight:700, color:'#0F172A' }}>{d.name}</span>
                    <div style={{ display:'flex', gap:6 }}>
                      <span style={{ fontSize:11, fontWeight:700, color:'#0EA5E9' }}>{d.type}</span>
                      <span style={{ fontSize:11, fontWeight:700, color:'#475569' }}>{d.status}</span>
                    </div>
                  </div>
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
