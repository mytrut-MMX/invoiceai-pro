import { useState, useRef, useEffect } from "react";
import { ff } from "../../constants";

export function CustomerPicker({ customers = [], value, onChange, onClear }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const h = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = customers.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = c => { onChange(c); setSearch(""); setOpen(false); };

  const handleClear = e => {
    e.stopPropagation();
    onClear?.();
    setSearch("");
    setOpen(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleToggle = () => {
    if (value) return;
    setOpen(o => !o);
    if (!open) setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div
        onClick={handleToggle}
        style={{
          display: "flex", alignItems: "center",
          border: `1.5px solid ${open ? "#1e6be0" : value ? "#1a1a2e" : "#E0E0E0"}`,
          borderRadius: 8, background: "#fff", cursor: value ? "default" : "pointer",
          boxShadow: open ? "0 0 0 3px rgba(30,107,224,0.10)" : "none",
          transition: "border-color 0.15s, box-shadow 0.15s",
          minHeight: 42,
        }}>
        {value ? (
          <>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#E86C4A22", color: "#E86C4A", fontWeight: 800, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginLeft: 10 }}>
              {value.name?.[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0, padding: "0 8px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value.name}</div>
              {value.email && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value.email}</div>}
            </div>
            <button onClick={handleClear} title="Remove customer"
              style={{ padding: "0 12px", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex", alignItems: "center", fontSize: 16, flexShrink: 0, alignSelf: "stretch" }}>
              ×
            </button>
          </>
        ) : (
          <>
            <span style={{ display: "flex", alignItems: "center", paddingLeft: 10, color: "#9ca3af", flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.8"/><path d="M13.5 13.5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            </span>
            <input
              ref={inputRef}
              value={search}
              onChange={e => { setSearch(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onClick={e => e.stopPropagation()}
              placeholder="Select or add a customer"
              style={{ flex: 1, border: "none", outline: "none", fontSize: 13, fontFamily: ff, padding: "0 8px", background: "transparent", color: "#1a1a2e", lineHeight: "42px" }}
            />
            <span style={{ padding: "0 12px", display: "flex", alignItems: "center", color: "#9ca3af", flexShrink: 0 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 512 512"
                style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.18s" }}>
                <path d="M2.157 159.57c0 13.773 5.401 27.542 16.195 38.02l198.975 192.867c21.411 20.725 55.94 20.725 77.34 0L493.63 197.59c21.508-20.846 21.637-54.778.269-75.773-21.35-20.994-56.104-21.098-77.612-.26L256.004 276.93 95.721 121.562c-21.528-20.833-56.268-20.734-77.637.26C7.472 132.261 2.157 145.923 2.157 159.57z" fill="currentColor"/>
              </svg>
            </span>
          </>
        )}
      </div>

      {open && !value && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1.5px solid #E0E0E0", borderRadius: 9, boxShadow: "0 8px 28px rgba(0,0,0,0.12)", zIndex: 400, maxHeight: 240, overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "14px 16px", fontSize: 13, color: "#9ca3af", textAlign: "center" }}>No customers found</div>
          ) : filtered.map(c => (
            <button key={c.id}
              onMouseDown={e => { e.preventDefault(); handleSelect(c); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontFamily: ff, textAlign: "left" }}
              onMouseEnter={e => e.currentTarget.style.background = "#f4f5f7"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#E86C4A22", color: "#E86C4A", fontWeight: 800, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {c.name?.[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{c.name}</div>
                {c.email && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>{c.email}</div>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
