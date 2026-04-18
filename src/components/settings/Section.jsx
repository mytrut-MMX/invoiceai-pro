export default function Section({ title, children }) {
  return (
    <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-subtle)] shadow-[var(--shadow-sm)] mb-4 overflow-hidden">
      <div className="px-5 py-3 border-b border-[var(--border-subtle)]">
        <h3 className="m-0 text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}
