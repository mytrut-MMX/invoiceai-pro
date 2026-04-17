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
      <button style={tab === 'frontend-lead' ? s.tabActive : s.tab} onClick={() => setTab('frontend-lead')}>
        Frontend Lead
      </button>
      <button style={tab === 'data-ledger-lead' ? s.tabActive : s.tab} onClick={() => setTab('data-ledger-lead')}>
        Data & Ledger Lead
      </button>
      <button style={tab === 'backend-integrations-lead' ? s.tabActive : s.tab} onClick={() => setTab('backend-integrations-lead')}>
        Backend & Integrations Lead
      </button>
      <button style={tab === 'security-trust-lead' ? s.tabActive : s.tab} onClick={() => setTab('security-trust-lead')}>
        Security & Trust Lead
      </button>
      <button style={tab === 'qa-regression-agent' ? s.tabActive : s.tab} onClick={() => setTab('qa-regression-agent')}>
        QA Regression
      </button>
      <button style={tab === 'release-gate-agent' ? s.tabActive : s.tab} onClick={() => setTab('release-gate-agent')}>
        Release Gate
      </button>
    </div>
  );
}
