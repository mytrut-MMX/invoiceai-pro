import { ff } from "../../constants";

const btnStyle = (active) => ({
  padding: "5px 10px",
  border: `1px solid ${active ? "#1e6be0" : "#e8e8ec"}`,
  borderRadius: 6,
  background: active ? "#1e6be0" : "#fff",
  color: active ? "#fff" : "#374151",
  fontSize: 12,
  fontWeight: active ? 700 : 400,
  cursor: "pointer",
  fontFamily: ff,
});

export default function Pagination({ page, totalPages, onPageChange, totalItems, pageSize }) {
  if (totalPages <= 1) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", fontSize: 12, color: "#6b7280" }}>
      <span>
        Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, totalItems)} of {totalItems}
      </span>
      <div style={{ display: "flex", gap: 4 }}>
        <button onClick={() => onPageChange(page - 1)} disabled={page <= 1} style={{ ...btnStyle(false), opacity: page <= 1 ? 0.4 : 1 }}>
          ← Prev
        </button>
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
          let p;
          if (totalPages <= 7) p = i + 1;
          else if (page <= 4) p = i + 1;
          else if (page >= totalPages - 3) p = totalPages - 6 + i;
          else p = page - 3 + i;
          return (
            <button key={p} onClick={() => onPageChange(p)} style={btnStyle(p === page)}>
              {p}
            </button>
          );
        })}
        <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} style={{ ...btnStyle(false), opacity: page >= totalPages ? 0.4 : 1 }}>
          Next →
        </button>
      </div>
    </div>
  );
}
