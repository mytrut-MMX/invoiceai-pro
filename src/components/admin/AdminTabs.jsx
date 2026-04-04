import { s } from './adminShared';

export default function AdminTabs({ tab, setTab, userCount, contactCount }) {
  return (
    <div style={s.tabs}>
      <button style={tab === 'users' ? s.tabActive : s.tab} onClick={() => setTab('users')}>
        Users ({userCount})
      </button>
      <button style={tab === 'contacts' ? s.tabActive : s.tab} onClick={() => setTab('contacts')}>
        Contact ({contactCount})
      </button>
      <button style={tab === 'orchestrator' ? s.tabActive : s.tab} onClick={() => setTab('orchestrator')}>
        Orchestrator
      </button>
    </div>
  );
}
