import { ff, s, fmt } from './adminShared';

function SubjectBadge({ subject }) {
  const colors = {
    'Feedback':        { bg:'#DCFCE7', color:'#15803D' },
    'Bug Report':      { bg:'#FEF9C3', color:'#854D0E' },
    'Complaint':       { bg:'#FEE2E2', color:'#991B1B' },
    'Billing':         { bg:'#EDE9FE', color:'#6D28D9' },
    'General Inquiry': { bg:'#DBEAFE', color:'#1E40AF' },
    'Other':           { bg:'#F1F5F9', color:'#475569' },
  };
  const c = colors[subject] || colors.Other;
  return <span style={{ ...s.badge, background:c.bg, color:c.color }}>{subject || 'General'}</span>;
}

export default function AdminContactsPanel({ loading, contacts, expandedMsg, setExpandedMsg }) {
  return (
    <div>
      <div style={s.sectionTitle}>Contact Submissions</div>
      {loading ? (
        <div style={s.emptyState}>Loading…</div>
      ) : contacts.length === 0 ? (
        <div style={s.emptyState}>
          <div style={{ fontSize:32, marginBottom:8 }}>📬</div>
          No contact submissions yet.<br />
          <span style={{ fontSize:12, marginTop:4, display:'block', color:'#CBD5E1' }}>Messages submitted via the Contact page will appear here.</span>
        </div>
      ) : (
        <div style={s.tableWrap}>
          <div style={{ ...s.tableHead, gridTemplateColumns:'1.5fr 2fr 1.2fr 2fr 1.5fr' }}>
            <span style={s.tableCellHead}>Name</span>
            <span style={s.tableCellHead}>Email</span>
            <span style={s.tableCellHead}>Subject</span>
            <span style={s.tableCellHead}>Message</span>
            <span style={s.tableCellHead}>Date</span>
          </div>
          {contacts.map((c, i) => (
            <div key={c.id || i} style={{ ...s.tableRow, gridTemplateColumns:'1.5fr 2fr 1.2fr 2fr 1.5fr', background: i%2===0?'#fff':'#FAFAFA', alignItems:'start' }}>
              <span style={s.tableCell}>{c.name || <span style={{ color:'#9CA3AF' }}>—</span>}</span>
              <span style={{ ...s.tableCell, color:'#0EA5E9', fontWeight:500 }}>{c.email}</span>
              <span style={s.tableCell}><SubjectBadge subject={c.subject} /></span>
              <div>
                {expandedMsg === (c.id || i) ? (
                  <div>
                    <div style={{ ...s.msgBox, maxHeight:'none' }}>{c.message}</div>
                    <button onClick={() => setExpandedMsg(null)} style={{ fontSize:11, color:'#0EA5E9', background:'none', border:'none', cursor:'pointer', padding:'4px 0', fontFamily:ff }}>Show less</button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize:13, color:'#374151', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:220 }}>{c.message}</div>
                    {c.message && c.message.length > 60 && (
                      <button onClick={() => setExpandedMsg(c.id || i)} style={{ fontSize:11, color:'#0EA5E9', background:'none', border:'none', cursor:'pointer', padding:'4px 0', fontFamily:ff }}>Read more</button>
                    )}
                  </div>
                )}
              </div>
              <span style={{ ...s.tableCell, color:'#64748B', fontSize:12 }}>{fmt(c.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
