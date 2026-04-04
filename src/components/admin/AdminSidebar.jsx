import { s } from './adminShared';

const items = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'contacts', label: 'Contact' },
  { id: 'orchestrator', label: 'Orchestrator' },
];

export default function AdminSidebar({ section, setSection, userCount, contactCount, orchestratorCount }) {
  return (
    <aside style={s.sidebar}>
      <div style={s.sidebarTitle}>Navigation</div>
      <nav style={s.sidebarNav}>
        {items.map((item) => {
          const isActive = section === item.id;
          const count = item.id === 'users'
            ? userCount
            : item.id === 'contacts'
              ? contactCount
              : item.id === 'orchestrator'
                ? orchestratorCount
                : null;

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
        })}
      </nav>
    </aside>
  );
}
