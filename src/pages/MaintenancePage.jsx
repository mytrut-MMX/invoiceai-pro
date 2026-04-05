export default function MaintenancePage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#FAFAF7", fontFamily: "system-ui, -apple-system, sans-serif", position: "relative", overflow: "hidden" }}>
      {/* Animated progress bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#F0EFE9", overflow: "hidden" }}>
        <div style={{ height: "100%", width: "40%", background: "#D97706", borderRadius: 2, animation: "maintenance-bar 3s ease-in-out infinite" }} />
      </div>

      {/* Logo mark */}
      <div style={{ width: 48, height: 48, borderRadius: 12, background: "#111110", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 32 }}>
        <span style={{ color: "#D97706", fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em", fontFamily: "system-ui, -apple-system, sans-serif", lineHeight: 1 }}>IS</span>
      </div>

      {/* Heading */}
      <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "2rem", fontWeight: 700, color: "#111110", margin: "0 0 12px", textAlign: "center" }}>
        We're improving things.
      </h1>

      {/* Subheading */}
      <p style={{ fontSize: 16, color: "#6B6B6B", margin: "0 0 32px", textAlign: "center", maxWidth: 420, lineHeight: 1.6, padding: "0 20px" }}>
        Back shortly — we're making InvoiceSaga better for you.
      </p>

      {/* Reload button */}
      <button
        onClick={() => window.location.reload()}
        style={{ border: "2px solid #111110", background: "transparent", color: "#111110", fontWeight: 700, fontSize: 14, padding: "10px 24px", borderRadius: 8, cursor: "pointer", fontFamily: "system-ui, -apple-system, sans-serif" }}
      >
        Reload
      </button>

      <style>{`
        @keyframes maintenance-bar {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(250%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}
