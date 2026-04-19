import { Fragment, useState } from 'react';
import { s, fmt } from './adminShared';

export default function AdminOrchestratorHistory({ loading, objectives, tasks, selectedObjectiveId, setSelectedObjectiveId, token, onRefresh }) {
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const callDelete = async (body) => {
    setDeleteError('');
    setDeleting(true);
    try {
      const res = await fetch('/api/admin-data', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Delete failed');
      if (onRefresh) onRefresh();
    } catch (e) {
      setDeleteError(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteOne = (obj) => {
    const label = obj.title || obj.objective || obj.id;
    if (!window.confirm(`Delete objective "${label}" and all its tasks/logs? This cannot be undone.`)) return;
    callDelete({ objectiveId: obj.id });
  };

  const handleClearAll = () => {
    if (objectives.length === 0) return;
    if (!window.confirm(`Delete ALL ${objectives.length} objectives and their tasks/logs? This cannot be undone.`)) return;
    callDelete({ all: true });
  };

  const deleteBtnStyle = {
    padding: '4px 10px', background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FECACA',
    borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', lineHeight: 1,
  };
  const clearAllBtnStyle = {
    padding: '8px 14px', background: '#EF4444', color: '#fff', border: 'none',
    borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
  };

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div style={{ ...s.sectionTitle, marginBottom:0 }}>Orchestrator History</div>
        {objectives.length > 0 && (
          <button
            type="button"
            style={{ ...clearAllBtnStyle, opacity: deleting ? 0.6 : 1 }}
            onClick={handleClearAll}
            disabled={deleting}
          >
            Clear All
          </button>
        )}
      </div>

      {deleteError && <div style={{ ...s.err, marginBottom:12 }}>{deleteError}</div>}

      {loading ? (
        <div style={s.emptyState}>Loading…</div>
      ) : objectives.length === 0 ? (
        <div style={s.emptyState}>
          <div style={{ fontSize:32, marginBottom:8 }}>🤖</div>
          No orchestrator runs yet.
        </div>
      ) : (
        <div style={s.tableWrap}>
          <div style={{ ...s.tableHead, gridTemplateColumns:'2fr 1fr 1fr 1fr 1.5fr 60px' }}>
            <span style={s.tableCellHead}>Title</span>
            <span style={s.tableCellHead}>Status</span>
            <span style={s.tableCellHead}>Tasks</span>
            <span style={s.tableCellHead}>Objective ID</span>
            <span style={s.tableCellHead}>Created</span>
            <span style={s.tableCellHead}></span>
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
                    gridTemplateColumns:'2fr 1fr 1fr 1fr 1.5fr 60px',
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
                  <span style={{ ...s.tableCell, overflow:'visible' }}>
                    <button
                      type="button"
                      aria-label="Delete objective"
                      title="Delete"
                      style={{ ...deleteBtnStyle, opacity: deleting ? 0.6 : 1 }}
                      onClick={(e) => { e.stopPropagation(); handleDeleteOne(obj); }}
                      disabled={deleting || !obj.id}
                    >
                      ×
                    </button>
                  </span>
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
