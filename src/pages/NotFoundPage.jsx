import { Link, useNavigate } from "react-router-dom";
import { ROUTES } from "../router/routes";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#f4f5f7",
        textAlign: "center",
        padding: "40px 20px",
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 64,
          height: 64,
          background: "#fff",
          border: "1px solid #e8e8ec",
          borderRadius: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        <svg
          width="30"
          height="30"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9ca3af"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      {/* 404 number */}
      <div
        style={{
          fontSize: 80,
          fontWeight: 800,
          color: "#e8e8ec",
          lineHeight: 1,
          marginBottom: 12,
          letterSpacing: "-0.04em",
        }}
      >
        404
      </div>

      <h1
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "#1a1a2e",
          margin: "0 0 10px",
        }}
      >
        Page not found
      </h1>

      <p
        style={{
          fontSize: 14,
          color: "#6b7280",
          maxWidth: 360,
          lineHeight: 1.65,
          margin: "0 0 32px",
        }}
      >
        The page you're looking for doesn't exist or may have been moved.
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "#fff",
            color: "#374151",
            border: "1px solid #e8e8ec",
            padding: "10px 18px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ← Go back
        </button>

        <Link
          to={ROUTES.DASHBOARD}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "#1e6be0",
            color: "#fff",
            padding: "10px 18px",
            borderRadius: 8,
            textDecoration: "none",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
