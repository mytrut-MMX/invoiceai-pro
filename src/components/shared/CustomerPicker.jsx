import { useState, useRef, useEffect } from "react";
import { Icons } from "../icons";

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
    !search
    || c.name?.toLowerCase().includes(search.toLowerCase())
    || c.email?.toLowerCase().includes(search.toLowerCase())
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

  const shellCls = [
    "flex items-center border rounded-[var(--radius-lg)] bg-white min-h-[42px] transition-[border-color,box-shadow] duration-150",
    open
      ? "border-[var(--brand-600)] shadow-[var(--focus-ring)]"
      : value
      ? "border-[var(--border-strong)]"
      : "border-[var(--border-default)]",
    value ? "cursor-default" : "cursor-pointer",
  ].join(" ");

  return (
    <div ref={wrapRef} className="relative">
      <div onClick={handleToggle} className={shellCls}>
        {value ? (
          <>
            <div className="w-7 h-7 rounded-full bg-[var(--brand-50)] text-[var(--brand-700)] font-semibold text-xs flex items-center justify-center flex-shrink-0 ml-2.5">
              {value.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0 px-2">
              <div className="text-sm font-semibold text-[var(--text-primary)] truncate flex items-center gap-1.5">
                {value.name}
                {value.self_billed_by_customer && (
                  <span
                    className="inline-block w-2 h-2 rounded-full bg-[var(--warning-600)] flex-shrink-0"
                    aria-label="Self-billing arrangement active"
                    title="Self-billing arrangement active — cannot invoice directly"
                  />
                )}
              </div>
              {value.email && (
                <div className="text-xs text-[var(--text-tertiary)] truncate">{value.email}</div>
              )}
            </div>
            <button
              onClick={handleClear}
              title="Remove customer"
              className="px-3 self-stretch bg-transparent border-none cursor-pointer flex items-center text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] flex-shrink-0"
            >
              <Icons.X />
            </button>
          </>
        ) : (
          <>
            <span className="flex items-center pl-3 text-[var(--text-tertiary)] flex-shrink-0">
              <Icons.Search />
            </span>
            <input
              ref={inputRef}
              value={search}
              onChange={e => { setSearch(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onClick={e => e.stopPropagation()}
              placeholder="Select or add a customer"
              className="flex-1 min-w-0 border-none outline-none text-sm bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] px-2 h-[40px]"
            />
            <span
              className={`pr-3 flex items-center text-[var(--text-tertiary)] flex-shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
            >
              <Icons.ChevDown />
            </span>
          </>
        )}
      </div>

      {open && !value && (
        <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-popover)] z-[400] max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-3.5 text-sm text-[var(--text-tertiary)] text-center">No customers found</div>
          ) : filtered.map(c => (
            <button
              key={c.id}
              onMouseDown={e => { e.preventDefault(); handleSelect(c); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 bg-transparent border-none cursor-pointer text-left hover:bg-[var(--surface-sunken)] transition-colors duration-150"
            >
              <div className="w-7 h-7 rounded-full bg-[var(--brand-50)] text-[var(--brand-700)] font-semibold text-xs flex items-center justify-center flex-shrink-0">
                {c.name?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--text-primary)] truncate flex items-center gap-1.5">
                  {c.name}
                  {c.self_billed_by_customer && (
                    <span
                      className="inline-block w-2 h-2 rounded-full bg-[var(--warning-600)] flex-shrink-0"
                      aria-label="Self-billing arrangement active"
                      title="Self-billing arrangement active — cannot invoice directly"
                    />
                  )}
                </div>
                {c.email && <div className="text-xs text-[var(--text-tertiary)] truncate">{c.email}</div>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
