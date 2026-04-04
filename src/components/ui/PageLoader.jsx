import { ff } from "../../constants";

// Keyframes injected once as a <style> tag — no CSS file dependency.
const STYLES = `
  @keyframes _is_spin  { to { transform: rotate(360deg); } }
  @keyframes _is_pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
`;

/**
 * PageLoader
 *
 * Full-viewport loading screen shown while React.lazy() chunks are fetching
 * or while an async auth check is in progress.
 *
 * Matches the InvoiceSaga design language:
 *  - Brand blue (#1e6be0) primary colour
 *  - Same font stack as the app (ff from constants)
 *  - Subtle pulsing logo mark + spinner ring
 *
 * @param {string} [message]  — override the default "Loading…" label
 */
export default function PageLoader({ message = "Loading…" }) {
  return (
    <>
      <style>{STYLES}</style>

      <div
        role="status"
        aria-label={message}
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#f4f5f7",
          fontFamily: ff,
          zIndex: 9999,
          gap: 18,
        }}
      >
        {/* Pulsing logo mark */}
        <div
          style={{
            width: 48,
            height: 48,
            background: "#1e6be0",
            borderRadius: 13,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "_is_pulse 1.8s ease-in-out infinite",
            boxShadow: "0 4px 16px rgba(30,107,224,0.28)",
          }}
        >
          {/* Invoice icon */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </div>

        {/* Spinner ring */}
        <div
          aria-hidden="true"
          style={{
            width: 26,
            height: 26,
            border: "2.5px solid #e8e8ec",
            borderTopColor: "#1e6be0",
            borderRadius: "50%",
            animation: "_is_spin 0.7s linear infinite",
          }}
        />

        {/* Label */}
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#9ca3af",
            letterSpacing: "0.04em",
            marginTop: -6,
          }}
        >
          {message}
        </span>
      </div>
    </>
  );
}
