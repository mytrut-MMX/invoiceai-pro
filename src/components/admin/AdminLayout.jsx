import { s } from './adminShared';
import AdminSidebar from './AdminSidebar';

export default function AdminLayout({ section, setSection, userCount, contactCount, orchestratorCount, children }) {
  return (
    <div style={s.adminLayout}>
      <AdminSidebar
        section={section}
        setSection={setSection}
        userCount={userCount}
        contactCount={contactCount}
        orchestratorCount={orchestratorCount}
      />
      <div style={s.adminContent}>{children}</div>
    </div>
  );
}
