import { Btn } from "../atoms";

/**
 * Reusable empty-state block for lists and panels.
 *
 * @param {object}   props
 * @param {React.ComponentType} [props.icon]    — Icon component (e.g. Icons.Invoices)
 * @param {string}   props.title                 — Headline text
 * @param {string}  [props.description]          — Sub-line, max ~360px wide
 * @param {{ label: string, onClick: () => void, icon?: React.ReactNode, variant?: string }} [props.action]
 *                                                — Optional CTA button
 */
export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-6">
      <div className="w-16 h-16 rounded-full bg-[var(--surface-sunken)] flex items-center justify-center mb-4">
        {Icon && (
          <span className="w-10 h-10 flex items-center justify-center text-[var(--text-tertiary)]">
            <Icon />
          </span>
        )}
      </div>
      <div className="text-base font-semibold text-[var(--text-primary)] mb-1">{title}</div>
      {description && (
        <div className="text-sm text-[var(--text-secondary)] max-w-[360px] mb-5 leading-relaxed">
          {description}
        </div>
      )}
      {action && (
        <Btn
          variant={action.variant || "primary"}
          onClick={action.onClick}
          icon={action.icon}
        >
          {action.label}
        </Btn>
      )}
    </div>
  );
}
