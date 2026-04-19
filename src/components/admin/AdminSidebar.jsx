import { s } from './adminShared';

const topItems = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'contacts', label: 'Contact' },
];

const specialists = [
  { id: 'product-workflow-lead', label: 'Product Workflow' },
  { id: 'frontend-lead', label: 'Frontend Lead' },
  { id: 'data-ledger-lead', label: 'Data & Ledger Lead' },
  { id: 'backend-integrations-lead', label: 'Backend & Integrations Lead' },
  { id: 'security-trust-lead', label: 'Security & Trust Lead' },
  { id: 'qa-regression-agent', label: 'QA Regression' },
  { id: 'release-gate-agent', label: 'Release Gate' },
  { id: 'data-integrity-auditor', label: 'Data Integrity' },
];

const specialistIds = specialists.map((x) => x.id);

export default function AdminSidebar({ section, setSection, userCount, contactCount, orchestratorCount }) {
  const orchestratorExpanded = section === 'orchestrator' || specialistIds.includes(section);

  const renderTopItem = (item) => {
    const isActive = section === item.id;
    const count = item.id === 'users' ? userCount : item.id === 'contacts' ? contactCount : null;
    return (
      <button
        key={item.id}
        type="button"
        style={isActive ? s.sidebarItemActive : s.sidebarItem}
        onClick={() => setSection(item.id)}
      >
        <span>{item.label}</span>
        {count !== null && <span style={isActive ? s.sidebarBadgeActive : s.sidebarBadge}>{count}</span>}
      </button>
    );
  };

  const orchestratorActive = section === 'orchestrator';
  const subItemStyle = { ...s.sidebarItem, paddingLeft: 24, fontSize: 11 };
  const subItemActiveStyle = { ...s.sidebarItemActive, paddingLeft: 24, fontSize: 11 };

  return (
    <aside style={s.sidebar}>
      <div style={s.sidebarTitle}>Navigation</div>
      <nav style={s.sidebarNav}>
        {topItems.map(renderTopItem)}

        <button
          type="button"
          style={orchestratorActive ? s.sidebarItemActive : s.sidebarItem}
          onClick={() => setSection('orchestrator')}
          aria-expanded={orchestratorExpanded}
        >
          <span>Orchestrator</span>
          <span style={orchestratorActive ? s.sidebarBadgeActive : s.sidebarBadge}>{orchestratorCount}</span>
        </button>

        {orchestratorExpanded && specialists.map((item) => {
          const isActive = section === item.id;
          return (
            <button
              key={item.id}
              type="button"
              style={isActive ? subItemActiveStyle : subItemStyle}
              onClick={() => setSection(item.id)}
            >
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
