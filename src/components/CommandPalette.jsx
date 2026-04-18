import { useState, useEffect, useMemo, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../router/routes";
import { AppCtx } from "../context/AppContext";
import { Icons } from "./icons";
import { StatusBadge } from "./atoms";
import { CUR_SYM } from "../constants";
import { fmt } from "../utils/helpers";

const AVATAR_BG = [
  "bg-indigo-500", "bg-emerald-500", "bg-amber-500",
  "bg-rose-500", "bg-sky-500", "bg-violet-500",
];
const avatarBgFor = (name = "") => AVATAR_BG[(name.charCodeAt(0) || 0) % AVATAR_BG.length];

const ACTIONS = [
  { id: "go-dashboard",   label: "Go to Dashboard",    icon: Icons.Home,      route: ROUTES.DASHBOARD },
  { id: "go-invoices",    label: "Go to Invoices",     icon: Icons.Invoices,  route: ROUTES.INVOICES },
  { id: "go-customers",   label: "Go to Customers",    icon: Icons.Customers, route: ROUTES.CUSTOMERS },
  { id: "go-bills",       label: "Go to Bills",        icon: Icons.Receipt,   route: ROUTES.BILLS },
  { id: "go-quotes",      label: "Go to Quotes",       icon: Icons.Quotes,    route: ROUTES.QUOTES },
  { id: "go-expenses",    label: "Go to Expenses",     icon: Icons.Expenses,  route: ROUTES.EXPENSES },
  { id: "go-settings",    label: "Go to Settings",     icon: Icons.Settings,  route: ROUTES.SETTINGS_GENERAL },
  { id: "new-invoice",    label: "Create new invoice", icon: Icons.Plus,      route: ROUTES.INVOICES_NEW },
  { id: "new-quote",      label: "Create new quote",   icon: Icons.Plus,      route: ROUTES.QUOTES_NEW },
  { id: "new-customer",   label: "Create new customer",icon: Icons.Plus,      route: ROUTES.CUSTOMERS_NEW },
  { id: "new-bill",       label: "Create new bill",    icon: Icons.Plus,      route: ROUTES.BILLS_NEW },
  { id: "new-expense",    label: "Create new expense", icon: Icons.Plus,      route: ROUTES.EXPENSES_NEW },
  { id: "new-supplier",   label: "Create new supplier",icon: Icons.Plus,      route: ROUTES.SUPPLIERS_NEW },
];

function GroupHeader({ label }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] px-4 py-1.5">
      {label}
    </div>
  );
}

function ResultItem({ icon, leftElement, label, metadata, rightContent, active, onClick, onMouseEnter, itemRef }) {
  return (
    <button
      ref={itemRef}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={[
        "w-full flex items-center gap-3 py-2 px-4 bg-transparent border-none cursor-pointer text-left transition-colors duration-100",
        active
          ? "bg-[var(--brand-50)] text-[var(--brand-700)]"
          : "text-[var(--text-primary)] hover:bg-[var(--surface-sunken)]",
      ].join(" ")}
    >
      {leftElement ? (
        leftElement
      ) : icon ? (
        <span
          className={[
            "w-4 h-4 flex items-center justify-center flex-shrink-0",
            active ? "text-[var(--brand-700)]" : "text-[var(--text-tertiary)]",
          ].join(" ")}
        >
          {icon}
        </span>
      ) : null}
      <span className="text-sm truncate">{label}</span>
      {metadata && (
        <span className="text-xs text-[var(--text-tertiary)] ml-auto truncate max-w-[180px]">{metadata}</span>
      )}
      {rightContent && (
        <span className={metadata ? "ml-2 flex-shrink-0" : "ml-auto flex-shrink-0"}>{rightContent}</span>
      )}
    </button>
  );
}

export default function CommandPalette({ open, onClose }) {
  const { invoices = [], customers = [], orgSettings } = useContext(AppCtx);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const scrollRef = useRef(null);
  const itemRefs = useRef([]);

  const currSym = CUR_SYM[orgSettings?.currency || "GBP"] || "£";

  const filteredActions = useMemo(() => {
    if (!query) return ACTIONS;
    const q = query.toLowerCase();
    return ACTIONS.filter(a => a.label.toLowerCase().includes(q));
  }, [query]);

  const filteredInvoices = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return invoices
      .filter(inv =>
        inv.invoice_number?.toLowerCase().includes(q)
        || inv.customer?.name?.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [query, invoices]);

  const filteredCustomers = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return customers
      .filter(c =>
        c.name?.toLowerCase().includes(q)
        || c.email?.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [query, customers]);

  const flatList = useMemo(() => {
    const list = [];
    filteredActions.forEach(a => list.push({ type: "action", data: a }));
    filteredInvoices.forEach(inv => list.push({ type: "invoice", data: inv }));
    filteredCustomers.forEach(c => list.push({ type: "customer", data: c }));
    return list;
  }, [filteredActions, filteredInvoices, filteredCustomers]);

  // Reset selection when the query or open state changes
  useEffect(() => {
    setSelected(0);
  }, [query, open]);

  // Clear state when closed
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  // Keep the active item in view
  useEffect(() => {
    if (!open) return;
    const el = itemRefs.current[selected];
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [selected, open]);

  const handleSelect = (entry) => {
    if (!entry) return;
    if (entry.type === "action") {
      navigate(entry.data.route);
    } else if (entry.type === "invoice") {
      navigate(`${ROUTES.INVOICES}?q=${encodeURIComponent(entry.data.invoice_number || "")}`);
    } else if (entry.type === "customer") {
      navigate(`${ROUTES.CUSTOMERS}?q=${encodeURIComponent(entry.data.name || "")}`);
    }
    onClose();
  };

  // Keyboard navigation (bound while open)
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected(s => {
          const len = flatList.length;
          if (len === 0) return 0;
          return (s + 1) % len;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected(s => {
          const len = flatList.length;
          if (len === 0) return 0;
          return (s - 1 + len) % len;
        });
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleSelect(flatList[selected]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, flatList, selected, onClose]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const actionsCount = filteredActions.length;
  const invoicesCount = filteredInvoices.length;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[4000] flex items-start justify-center pt-[15vh] p-4"
      onMouseDown={onClose}
    >
      <div
        className="bg-[var(--surface-card)] rounded-[var(--radius-xl)] shadow-[var(--shadow-popover)] w-full max-w-[560px] overflow-hidden border border-[var(--border-subtle)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 border-b border-[var(--border-subtle)]">
          <span className="text-[var(--text-tertiary)] flex flex-shrink-0">
            <Icons.Search />
          </span>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or jump to..."
            className="flex-1 h-12 text-base text-[var(--text-primary)] bg-transparent outline-none border-none placeholder:text-[var(--text-tertiary)]"
          />
        </div>

        {/* Results */}
        <div ref={scrollRef} className="max-h-[380px] overflow-y-auto py-2">
          {flatList.length === 0 ? (
            <div className="py-8 px-4 text-center text-sm text-[var(--text-tertiary)]">
              No results for "{query}"
            </div>
          ) : (
            <>
              {filteredActions.length > 0 && (
                <div>
                  <GroupHeader label="Actions" />
                  {filteredActions.map((a, i) => {
                    const globalIndex = i;
                    const Icon = a.icon;
                    return (
                      <ResultItem
                        key={a.id}
                        itemRef={(el) => (itemRefs.current[globalIndex] = el)}
                        icon={<Icon />}
                        label={a.label}
                        active={selected === globalIndex}
                        onClick={() => handleSelect({ type: "action", data: a })}
                        onMouseEnter={() => setSelected(globalIndex)}
                      />
                    );
                  })}
                </div>
              )}

              {filteredInvoices.length > 0 && (
                <div className="mt-1">
                  <GroupHeader label="Invoices" />
                  {filteredInvoices.map((inv, i) => {
                    const globalIndex = actionsCount + i;
                    return (
                      <ResultItem
                        key={inv.id}
                        itemRef={(el) => (itemRefs.current[globalIndex] = el)}
                        icon={<Icons.Invoices />}
                        label={inv.invoice_number || "—"}
                        metadata={`${inv.customer?.name || "—"} · ${fmt(currSym, inv.total || 0)}`}
                        rightContent={<StatusBadge status={inv.status || "Draft"} />}
                        active={selected === globalIndex}
                        onClick={() => handleSelect({ type: "invoice", data: inv })}
                        onMouseEnter={() => setSelected(globalIndex)}
                      />
                    );
                  })}
                </div>
              )}

              {filteredCustomers.length > 0 && (
                <div className="mt-1">
                  <GroupHeader label="Customers" />
                  {filteredCustomers.map((c, i) => {
                    const globalIndex = actionsCount + invoicesCount + i;
                    const custName = c.name || "—";
                    const avatarCls = avatarBgFor(custName);
                    return (
                      <ResultItem
                        key={c.id}
                        itemRef={(el) => (itemRefs.current[globalIndex] = el)}
                        leftElement={
                          <div className={`w-6 h-6 rounded-full ${avatarCls} text-white font-semibold text-[11px] flex items-center justify-center flex-shrink-0`}>
                            {custName[0].toUpperCase()}
                          </div>
                        }
                        label={custName}
                        metadata={c.email || ""}
                        active={selected === globalIndex}
                        onClick={() => handleSelect({ type: "customer", data: c })}
                        onMouseEnter={() => setSelected(globalIndex)}
                      />
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border-subtle)] px-4 py-2 flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
          <span className="flex items-center gap-1">
            <kbd className="font-sans bg-[var(--surface-sunken)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[10px]">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="font-sans bg-[var(--surface-sunken)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[10px]">↵</kbd>
            open
          </span>
          <span className="flex items-center gap-1">
            <kbd className="font-sans bg-[var(--surface-sunken)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[10px]">esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
}
