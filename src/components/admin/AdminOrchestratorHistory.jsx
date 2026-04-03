import { Fragment } from 'react';
import { s, fmt } from './adminShared';

export default function AdminOrchestratorHistory({ loading, objectives, tasks, selectedObjectiveId, setSelectedObjectiveId }) {
  return (
    <div>
      <div style={s.sectionTitle}>Orchestrator History</div>

      {loading ? (
        <div style={s.emptyState}>Loading…</div>
      ) : objectives.length === 0 ? (
        <div style={s.emptyState}>
          <div style={{ fontSize:32, marginBottom:8 }}>🤖</div>
          No orchestrator runs yet.
        </div>
      ) : (
        <div style={s.tableWrap}>
          <div style={{ ...s.tableHead, gridTemplateColumns:'2fr 1fr 1fr 1fr 1.5fr' }}>
            <span style={s.tableCellHead}>Title</span>
            <span style={s.tableCellHead}>Status</span>
            <span style={s.tableCellHead}>Tasks</span>
            <span style={s.tableCellHead}>Objective ID</span>
            <span style={s.tableCellHead}>Created</span>
          </div>

          {objectives.map((obj, i) => {
            const relatedTasks = tasks.filter(t => t.objective_id === obj.id);
            const taskCount = relatedTasks.length;

            return (
              <Fragment key={obj.id || i}>
                <div
                  key={obj.id || i}
                  onClick={() => setSelectedObjectiveId(prev => prev === obj.id ? null : obj.id)}
                  style={{
                    ...s.tableRow,
                    gridTemplateColumns:'2fr 1fr 1fr 1fr 1.5fr',
                    background: i % 2 === 0 ? '#fff' : '#FAFAFA',
                    cursor:'pointer',
                  }}
                >
                  <span style={s.tableCell}>{obj.title || 'Untitled objective'}</span>
                  <span style={s.tableCell}>
                    <span style={s.pill}>{obj.status || 'pending'}</span>
                  </span>
                  <span style={s.tableCell}>{taskCount}</span>
                  <span style={{ ...s.tableCell, color:'#64748B', fontSize:12 }}>
                    {obj.id ? obj.id.slice(0, 8) : '—'}
                  </span>
                  <span style={{ ...s.tableCell, color:'#64748B' }}>{fmt(obj.created_at)}</span>
                </div>

                {selectedObjectiveId === obj.id && (
                  <div style={{ padding:'12px 20px', background:'#F8FAFC', borderBottom:'1px solid #E2E8F0' }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:8 }}>
                      Tasks
                    </div>

                    {relatedTasks.length === 0 ? (
                      <div style={{ fontSize:12, color:'#94A3B8' }}>No tasks found.</div>
                    ) : (
                      relatedTasks.map((task, idx) => (
                        <div key={task.id || idx} style={{ marginBottom:8, padding:'10px 12px', background:'#fff', border:'1px solid #E2E8F0', borderRadius:6 }}>
                          <div style={{ fontSize:13, color:'#0F172A', marginBottom:6 }}>{task.title || 'Untitled task'}</div>
                          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                            <span style={{ fontSize:11, fontWeight:700, color:'#64748B' }}>Agent: {task.agent || '—'}</span>
                            <span style={{ fontSize:11, fontWeight:700, color:'#0EA5E9' }}>Priority: {task.priority || '—'}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}
