/**
 * PageLoader
 *
 * Loading state shown while React.lazy() chunks are fetching or while
 * an async auth check is in progress.
 *
 * @param {string} [message]  — override the default "Loading…" label
 */
export default function PageLoader({ message = "Loading…" }) {
  return (
    <div
      role="status"
      aria-label={message}
      className="flex flex-col items-center justify-center min-h-[400px] gap-3"
    >
      <div
        aria-hidden="true"
        className="w-8 h-8 border-2 border-[var(--border-subtle)] border-t-[var(--brand-600)] rounded-full animate-spin"
      />
      <span className="text-sm text-[var(--text-tertiary)]">{message}</span>
    </div>
  );
}
