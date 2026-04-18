import SharedNav from "../../components/SharedNav";
import SharedFooter from "../../components/SharedFooter";

export default function LegalLayout({ title, lastUpdated, children }) {
  return (
    <div className="bg-[var(--surface-page)] min-h-screen">
      <SharedNav />

      {/* Page header */}
      <div className="bg-[var(--surface-sunken)] border-b border-[var(--border-subtle)] px-[21px] sm:px-[34px] py-[55px] text-center">
        <h1 className="text-[34px] font-semibold text-[var(--text-primary)] tracking-tight m-0 mb-[8px]">
          {title}
        </h1>
        {lastUpdated && (
          <p className="text-sm text-[var(--text-secondary)] m-0">Last updated: {lastUpdated}</p>
        )}
      </div>

      {/* Content */}
      <main className="max-w-[800px] mx-auto px-[21px] sm:px-[34px] py-[55px]">
        {children}
      </main>

      <SharedFooter />
    </div>
  );
}

/* ─── Shared prose helpers ───────────────────────────────────────────────── */

export function Section({ title, children }) {
  return (
    <section className="mb-[34px]">
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mt-[34px] mb-[13px] pb-[8px] border-b border-[var(--border-subtle)]">
        {title}
      </h2>
      <div className="text-sm text-[var(--text-secondary)] leading-relaxed">
        {children}
      </div>
    </section>
  );
}

export function P({ children, className = "" }) {
  return <p className={`m-0 mb-[21px] ${className}`}>{children}</p>;
}

export function UL({ items }) {
  return (
    <ul className="m-0 mb-[21px] pl-6 flex flex-col gap-[5px] list-disc">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}

const TONE_TO_CLASSES = {
  // Common usages from the legal pages → token-mapped tones.
  "#D97706": { bg: "bg-[var(--warning-50)]", border: "border-[var(--warning-100)]", text: "text-[var(--warning-700)]" },
  "#0EA5E9": { bg: "bg-[var(--info-50)]",    border: "border-[var(--info-100)]",    text: "text-[var(--info-700)]" },
  "#8B5CF6": { bg: "bg-[var(--brand-50)]",   border: "border-[var(--brand-100)]",   text: "text-[var(--brand-700)]" },
  "#16A34A": { bg: "bg-[var(--success-50)]", border: "border-[var(--success-100)]", text: "text-[var(--success-700)]" },
  "#10B981": { bg: "bg-[var(--success-50)]", border: "border-[var(--success-100)]", text: "text-[var(--success-700)]" },
  "#dc2626": { bg: "bg-[var(--danger-50)]",  border: "border-[var(--danger-100)]",  text: "text-[var(--danger-700)]" },
  "#EF4444": { bg: "bg-[var(--danger-50)]",  border: "border-[var(--danger-100)]",  text: "text-[var(--danger-700)]" },
  "#F59E0B": { bg: "bg-[var(--warning-50)]", border: "border-[var(--warning-100)]", text: "text-[var(--warning-700)]" },
  "#0F172A": { bg: "bg-[var(--neutral-50)]", border: "border-[var(--border-subtle)]", text: "text-[var(--text-primary)]" },
  "#64748B": { bg: "bg-[var(--neutral-50)]", border: "border-[var(--border-subtle)]", text: "text-[var(--text-secondary)]" },
};

export function InfoCard({ children, color = "#D97706" }) {
  const tone = TONE_TO_CLASSES[color] || TONE_TO_CLASSES["#D97706"];
  return (
    <div className={`rounded-[var(--radius-lg)] border px-5 py-4 mb-3.5 text-sm leading-relaxed ${tone.bg} ${tone.border} text-[var(--text-secondary)]`}>
      {children}
    </div>
  );
}

/**
 * Right-card helper used by GdprPage to highlight individual rights.
 * Uses the same tone-to-token mapping so all colors stay consistent
 * across the legal pages.
 */
export function RightCard({ title, color, children }) {
  const tone = TONE_TO_CLASSES[color] || TONE_TO_CLASSES["#0EA5E9"];
  return (
    <div className={`bg-white border rounded-[var(--radius-md)] px-4 py-3.5 mb-3 ${tone.border} border-l-4`}>
      <div className={`text-sm font-semibold mb-1 ${tone.text}`}>{title}</div>
      <div className="text-sm text-[var(--text-secondary)] leading-relaxed">{children}</div>
    </div>
  );
}
