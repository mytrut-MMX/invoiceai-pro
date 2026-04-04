import { s, todayCount } from './adminShared';

export default function AdminStats({ users, contacts }) {
  return (
    <div style={s.statsGrid}>
      <div style={s.statCard}>
        <div style={s.statNum}>{users.length}</div>
        <div style={s.statLabel}>Total Users</div>
      </div>
      <div style={s.statCard}>
        <div style={{ ...s.statNum, color:'#0EA5E9' }}>{todayCount(users)}</div>
        <div style={s.statLabel}>New Users Today</div>
      </div>
      <div style={s.statCard}>
        <div style={s.statNum}>{contacts.length}</div>
        <div style={s.statLabel}>Contact Submissions</div>
      </div>
      <div style={s.statCard}>
        <div style={{ ...s.statNum, color:'#F59E0B' }}>{todayCount(contacts)}</div>
        <div style={s.statLabel}>New Messages Today</div>
      </div>
      <div style={s.statCard}>
        <div style={{ ...s.statNum, color:'#EF4444' }}>
          {contacts.filter(c => c.subject === 'Complaint').length}
        </div>
        <div style={s.statLabel}>Complaints</div>
      </div>
      <div style={s.statCard}>
        <div style={{ ...s.statNum, color:'#10B981' }}>
          {contacts.filter(c => c.subject === 'Feedback').length}
        </div>
        <div style={s.statLabel}>Feedback Messages</div>
      </div>
    </div>
  );
}
