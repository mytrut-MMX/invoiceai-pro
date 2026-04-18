import { useState, useContext, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Ic, Icons } from "../icons";
import InvoiceSagaLogo from "../InvoiceSagaLogo";
import { ROUTES } from "../../router/routes";
import { AppCtx } from "../../context/AppContext";
import { useBusinessType } from "../../hooks/useBusinessType";

// ─── NAVIGATION DEFINITION ───────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    id: "home",
    items: [
      { id: "home", label: "Dashboard", icon: Icons.Home, route: ROUTES.DASHBOARD, match: ROUTES.DASHBOARD },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    items: [
      { id: "invoices",  label: "Invoices",  icon: Icons.Invoices,  route: ROUTES.INVOICES,  match: "/invoices",  addRoute: ROUTES.INVOICES_NEW },
      { id: "payments",  label: "Payments",  icon: Icons.Payments,  route: ROUTES.PAYMENTS,  match: "/payments",  addRoute: ROUTES.PAYMENTS_NEW },
      { id: "quotes",    label: "Quotes",    icon: Icons.Quotes,    route: ROUTES.QUOTES,    match: "/quotes",    addRoute: ROUTES.QUOTES_NEW },
      { id: "customers", label: "Customers", icon: Icons.Customers, route: ROUTES.CUSTOMERS, match: "/customers", addRoute: ROUTES.CUSTOMERS_NEW },
      { id: "items",     label: "Products",  icon: Icons.Items,     route: ROUTES.ITEMS,     match: "/items",     addRoute: ROUTES.ITEMS_NEW },
    ],
  },
  {
    id: "purchases",
    label: "Purchases",
    items: [
      { id: "bills",     label: "Bills",     icon: Icons.Receipt,   route: ROUTES.BILLS,     match: "/bills",     addRoute: ROUTES.BILLS_NEW },
      { id: "suppliers", label: "Suppliers", icon: Icons.Customers, route: ROUTES.SUPPLIERS, match: "/suppliers", addRoute: ROUTES.SUPPLIERS_NEW },
      { id: "expenses",  label: "Expenses",  icon: Icons.Expenses,  route: ROUTES.EXPENSES,  match: "/expenses",  addRoute: ROUTES.EXPENSES_NEW },
    ],
  },
  {
    id: "people",
    label: "People",
    items: [
      { id: "employees", label: "Employees", icon: Icons.Customers, route: ROUTES.EMPLOYEES, match: "/employees" },
      { id: "payroll",   label: "Payroll",   icon: Icons.Payments,  route: ROUTES.PAYROLL,   match: "/payroll" },
    ],
  },
  {
    id: "accounting",
    label: "Accounting",
    items: [
      { id: "ledger",           label: "Ledger",           icon: Icons.Invoices, route: ROUTES.LEDGER_JOURNAL,  match: "/ledger" },
      { id: "vat-return",       label: "VAT returns",      icon: Icons.Invoices, route: ROUTES.VAT_RETURN,      match: "/vat-return" },
      { id: "itsa",             label: "Self assessment",  icon: Icons.Receipt,  route: ROUTES.ITSA,            match: "/self-assessment", entityGate: "sole_trader" },
      { id: "corporation-tax",  label: "Corporation tax",  icon: Icons.Receipt,  route: ROUTES.CORPORATION_TAX, match: "/corporation-tax",  entityGate: "ltd" },
      { id: "cis-statements",   label: "CIS statements",   icon: Icons.Receipt,  route: ROUTES.CIS_STATEMENTS,  match: "/cis/statements" },
    ],
  },
];

const SETTINGS_ITEM = {
  id: "settings", label: "Settings", icon: Icons.Settings,
  route: ROUTES.SETTINGS_GENERAL, match: "/settings",
};

const MOB_NAV = [
  { id: "home",     label: "Home",     icon: Icons.Home,     route: ROUTES.DASHBOARD,       match: ROUTES.DASHBOARD },
  { id: "invoices", label: "Invoices", icon: Icons.Invoices, route: ROUTES.INVOICES,        match: "/invoices" },
  { id: "bills",    label: "Bills",    icon: Icons.Receipt,  route: ROUTES.BILLS,           match: "/bills" },
  { id: "more",     label: "More",     icon: Icons.Settings, route: ROUTES.SETTINGS_GENERAL, match: "/settings" },
];

const CREATE_ITEMS = [
  {
    group: "Sales",
    items: [
      { label: "Invoice",  route: ROUTES.INVOICES_NEW },
      { label: "Quote",    route: ROUTES.QUOTES_NEW },
      { label: "Customer", route: ROUTES.CUSTOMERS_NEW },
    ],
  },
  {
    group: "Purchases",
    items: [
      { label: "Bill",     route: ROUTES.BILLS_NEW },
      { label: "Supplier", route: ROUTES.SUPPLIERS_NEW },
      { label: "Expense",  route: ROUTES.EXPENSES_NEW },
    ],
  },
];

export const SIDEBAR_FULL = 220;
export const SIDEBAR_ICON = 56;

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function isActive(pathname, match) {
  if (match === ROUTES.DASHBOARD) return pathname === ROUTES.DASHBOARD;
  return pathname.startsWith(match);
}

function useVisibleGroups() {
  const ctx = useContext(AppCtx);
  const { isLtd, isSoleTrader, loading: entityLoading } = useBusinessType();
  const isVatRegistered = ctx?.orgSettings?.vatReg === "Yes";
  const isCisEnabled    = ctx?.orgSettings?.cis?.enabled ?? (ctx?.orgSettings?.cisReg === "Yes");

  function filterItem(item) {
    if (item.id === "vat-return"     && !isVatRegistered) return false;
    if (item.id === "cis-statements" && !isCisEnabled)    return false;
    if (item.entityGate) {
      if (entityLoading)                                   return false;
      if (item.entityGate === "ltd"         && !isLtd)         return false;
      if (item.entityGate === "sole_trader" && !isSoleTrader)  return false;
    }
    return true;
  }

  return NAV_GROUPS
    .map(group => ({ ...group, items: group.items.filter(filterItem) }))
    .filter(group => group.items.length > 0);
}

// ─── NAV ITEM (internal) ─────────────────────────────────────────────────────

function NavItem({ item, collapsed, pathname, navigate }) {
  const { id, label, icon: Icon, route, match, addRoute } = item;
  const on    = isActive(pathname, match);
  const onAdd = addRoute && pathname === addRoute;

  if (collapsed) {
    return (
      <button
        key={id}
        onClick={() => navigate(route)}
        title={label}
        className={[
          "relative w-full flex items-center justify-center py-3 border-none cursor-pointer rounded-[var(--radius-md)] mb-0.5 transition-all duration-200",
          on
            ? "bg-[var(--brand-50)] text-[var(--brand-700)]"
            : "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]",
        ].join(" ")}
      >
        <Icon />
        {on && (
          <div className="absolute left-0 top-1/4 bottom-1/4 w-[3px] rounded-r-[3px] bg-[var(--brand-600)]" />
        )}
      </button>
    );
  }

  return (
    <div className="relative mb-0.5 group">
      <button
        onClick={() => navigate(route)}
        className={[
          "relative w-full flex items-center gap-[10px] px-[13px] py-[7px] rounded-[var(--radius-md)] border-none cursor-pointer transition-all duration-200 text-[12.5px] text-left",
          addRoute ? "pr-8" : "",
          on
            ? "bg-[var(--brand-50)] text-[var(--brand-700)] font-medium"
            : "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]",
        ].join(" ")}
      >
        <span className="w-[18px] h-[18px] flex items-center justify-center flex-shrink-0">
          <Icon />
        </span>
        <span className="truncate flex-1">{label}</span>
        {on && (
          <div className="absolute left-0 top-1/4 bottom-1/4 w-[3px] rounded-r-[3px] bg-[var(--brand-600)]" />
        )}
      </button>
      {addRoute && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); navigate(onAdd ? route : addRoute); }}
          title={onAdd ? label : `New ${label.replace(/s$/, "")}`}
          className={[
            "absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-[var(--radius-sm)] border-none cursor-pointer flex items-center justify-center p-0 transition-all duration-200",
            "opacity-0 group-hover:opacity-100",
            onAdd
              ? "bg-[var(--brand-600)] text-white"
              : "bg-[var(--brand-100)] text-[var(--brand-700)] hover:bg-[var(--brand-600)] hover:text-white",
          ].join(" ")}
        >
          <Icons.Plus />
        </button>
      )}
    </div>
  );
}

// ─── TOP BAR (desktop) ───────────────────────────────────────────────────────

export function TopBar({ user, userAvatar, onUserClick, onLogout, onMenuOpen, collapsed, onCollapsedChange, onSearchClick }) {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!createOpen) return;
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setCreateOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [createOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    function handleKey(e) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  return (
    <div className="h-[52px] flex items-center px-3 gap-2 bg-[var(--surface-dark)] border-b border-white/10 flex-shrink-0">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuOpen}
        className="lg:hidden flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200 border-none bg-transparent cursor-pointer flex-shrink-0"
        title="Open menu"
      >
        <Ic d='<rect x="3" y="5" width="18" height="2" rx="1"/><rect x="3" y="11" width="18" height="2" rx="1"/><rect x="3" y="17" width="18" height="2" rx="1"/>' size={20} />
      </button>

      {/* Desktop sidebar toggle */}
      <button
        onClick={() => onCollapsedChange?.(!collapsed)}
        className="hidden lg:flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200 border-none bg-transparent cursor-pointer flex-shrink-0"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <Ic d='<rect x="3" y="5" width="18" height="2" rx="1"/><rect x="3" y="11" width="18" height="2" rx="1"/><rect x="3" y="17" width="18" height="2" rx="1"/>' size={18} />
      </button>

      {/* Logo */}
      <div className="flex-shrink-0 mr-1">
        <InvoiceSagaLogo height={22} dark />
      </div>

      {/* Search trigger (desktop only) */}
      <button
        onClick={onSearchClick}
        className="hidden lg:flex flex-1 max-w-sm items-center gap-2 h-8 px-3 rounded-[var(--radius-md)] bg-[var(--surface-dark-2)] border border-white/10 text-[var(--text-tertiary)] text-[13px] cursor-pointer hover:border-white/20 transition-all duration-200"
      >
        <Icons.Search />
        <span className="flex-1 text-left">Search invoices, customers...</span>
        <kbd className="text-[11px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded border border-white/10 font-sans">⌘K</kbd>
      </button>

      {/* Right zone */}
      <div className="ml-auto flex items-center gap-1">
        {/* + Create (desktop) */}
        <div className="relative hidden lg:block" ref={dropdownRef}>
          <button
            onClick={() => setCreateOpen(v => !v)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-md)] bg-[var(--brand-600)] hover:bg-[var(--brand-700)] text-white text-[13px] font-semibold cursor-pointer transition-all duration-200 border-none"
          >
            <Icons.Plus />
            Create
          </button>
          {createOpen && (
            <div className="absolute right-0 top-[calc(100%+6px)] w-44 bg-[var(--surface-overlay)] rounded-[var(--radius-lg)] shadow-[var(--shadow-popover)] border border-[var(--border-subtle)] py-1 z-50">
              {CREATE_ITEMS.map((section, si) => (
                <div key={section.group}>
                  {si > 0 && <div className="my-1 border-t border-[var(--border-subtle)]" />}
                  <div className="px-3 py-1 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.06em]">
                    {section.group}
                  </div>
                  {section.items.map(item => (
                    <button
                      key={item.label}
                      onClick={() => { navigate(item.route); setCreateOpen(false); }}
                      className="w-full text-left px-3 py-2 text-[13px] text-[var(--text-primary)] hover:bg-[var(--surface-sunken)] transition-colors duration-150 cursor-pointer border-none bg-transparent"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notification bell */}
        <button
          title="Notifications"
          className="flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] text-white/50 hover:text-white hover:bg-white/10 transition-all duration-200 border-none bg-transparent cursor-pointer"
        >
          <Ic d='<path fill-rule="evenodd" clip-rule="evenodd" d="M5.25 9a6.75 6.75 0 1113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 11-7.48 0 24.585 24.585 0 01-4.831-1.244.75.75 0 01-.298-1.205A8.217 8.217 0 005.25 9.75V9zm4.502 8.9a2.25 2.25 0 104.496 0 25.057 25.057 0 01-4.496 0z"/>' size={18} />
        </button>

        {/* Help */}
        <button
          title="Help"
          className="hidden lg:flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] text-white/50 hover:text-white hover:bg-white/10 transition-all duration-200 border-none bg-transparent cursor-pointer"
        >
          <Ic d='<path fill-rule="evenodd" clip-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm11.378-3.917c-.89-.777-2.366-.777-3.255 0a.75.75 0 01-.988-1.129c1.454-1.272 3.776-1.272 5.23 0 1.513 1.324 1.513 3.518 0 4.842a3.75 3.75 0 01-.837.552c-.676.328-1.028.774-1.028 1.152v.75a.75.75 0 01-1.5 0v-.75c0-1.279 1.06-2.107 1.875-2.502.182-.088.351-.199.503-.331.83-.727.83-1.857 0-2.584zM12 18a.75.75 0 100-1.5.75.75 0 000 1.5z"/>' size={18} />
        </button>

        {/* Settings gear */}
        <button
          onClick={() => navigate(ROUTES.SETTINGS_GENERAL)}
          aria-label="Settings"
          title="Settings"
          className="flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] text-white/50 hover:text-white hover:bg-white/10 transition-all duration-200 border-none bg-transparent cursor-pointer focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          <Ic d='<path fill-rule="evenodd" clip-rule="evenodd" d="M11.0779 2.25C10.1613 2.25 9.37909 2.91265 9.22841 3.81675L9.04974 4.88873C9.02959 5.00964 8.93542 5.1498 8.75311 5.23747C8.40905 5.40292 8.07967 5.5938 7.7674 5.8076C7.60091 5.92159 7.43259 5.9332 7.31769 5.89015L6.29851 5.50833C5.44019 5.18678 4.4752 5.53289 4.01692 6.32666L3.09493 7.92358C2.63665 8.71736 2.8194 9.72611 3.52704 10.3087L4.36756 11.0006C4.46219 11.0785 4.53629 11.2298 4.52119 11.4307C4.50706 11.6188 4.49988 11.8086 4.49988 12C4.49988 12.1915 4.50707 12.3814 4.52121 12.5695C4.53632 12.7704 4.46221 12.9217 4.36758 12.9996L3.52704 13.6916C2.8194 14.2741 2.63665 15.2829 3.09493 16.0767L4.01692 17.6736C4.4752 18.4674 5.44019 18.8135 6.29851 18.4919L7.31791 18.11C7.43281 18.067 7.60113 18.0786 7.76761 18.1925C8.07982 18.4063 8.40913 18.5971 8.75311 18.7625C8.93542 18.8502 9.02959 18.9904 9.04974 19.1113L9.22841 20.1832C9.37909 21.0874 10.1613 21.75 11.0779 21.75H12.9219C13.8384 21.75 14.6207 21.0874 14.7713 20.1832L14.95 19.1113C14.9702 18.9904 15.0643 18.8502 15.2466 18.7625C15.5907 18.5971 15.9201 18.4062 16.2324 18.1924C16.3988 18.0784 16.5672 18.0668 16.6821 18.1098L17.7012 18.4917C18.5596 18.8132 19.5246 18.4671 19.9828 17.6733L20.9048 16.0764C21.3631 15.2826 21.1804 14.2739 20.4727 13.6913L19.6322 12.9994C19.5376 12.9215 19.4635 12.7702 19.4786 12.5693C19.4927 12.3812 19.4999 12.1914 19.4999 12C19.4999 11.8085 19.4927 11.6186 19.4785 11.4305C19.4634 11.2296 19.5375 11.0783 19.6322 11.0004L20.4727 10.3084C21.1804 9.72587 21.3631 8.71711 20.9048 7.92334L19.9828 6.32642C19.5246 5.53264 18.5596 5.18654 17.7012 5.50809L16.6818 5.89C16.5669 5.93304 16.3986 5.92144 16.2321 5.80746C15.9199 5.59371 15.5906 5.40289 15.2466 5.23747C15.0643 5.1498 14.9702 5.00964 14.95 4.88873L14.7713 3.81675C14.6207 2.91265 13.8384 2.25 12.9219 2.25H11.0779ZM12 15.75C14.0711 15.75 15.75 14.0711 15.75 12C15.75 9.92893 14.0711 8.25 12 8.25C9.92893 8.25 8.25 9.92893 8.25 12C8.25 14.0711 9.92893 15.75 12 15.75Z"/>' size={20} />
        </button>

        {/* User avatar dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            aria-label="User menu"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="w-8 h-8 rounded-full bg-[var(--brand-600)] flex items-center justify-center text-white text-[13px] font-bold border-none cursor-pointer overflow-hidden flex-shrink-0 hover:ring-2 hover:ring-white/30 transition-all duration-200 ml-1 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            {userAvatar
              ? <img src={userAvatar} alt="avatar" className="w-full h-full object-cover" />
              : (user?.name || "?")[0].toUpperCase()}
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+6px)] w-64 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-popover)] z-[2000] py-1"
            >
              <div className="flex items-center gap-3 px-3 py-3">
                <div className="w-10 h-10 rounded-full bg-[var(--brand-600)] flex items-center justify-center text-white text-[14px] font-bold overflow-hidden flex-shrink-0">
                  {userAvatar
                    ? <img src={userAvatar} alt="avatar" className="w-full h-full object-cover" />
                    : (user?.name || "?")[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{user?.name}</div>
                  {user?.email && (
                    <div className="text-xs text-[var(--text-secondary)] truncate">{user.email}</div>
                  )}
                </div>
              </div>
              <div className="border-t border-[var(--border-subtle)]" />
              <button
                role="menuitem"
                onClick={() => { setMenuOpen(false); navigate(ROUTES.SETTINGS_GENERAL); }}
                className="w-full text-left px-3 py-2 text-[13px] text-[var(--text-primary)] hover:bg-[var(--surface-sunken)] border-none bg-transparent cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                Settings
              </button>
              <button
                role="menuitem"
                onClick={() => { setMenuOpen(false); onLogout?.(); }}
                className="w-full text-left px-3 py-2 text-[13px] text-[var(--text-primary)] hover:bg-[var(--surface-sunken)] border-none bg-transparent cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────

export function Sidebar({ collapsed = false, onCollapsedChange }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const visibleGroups = useVisibleGroups();

  return (
    <div
      className="flex-shrink-0 flex flex-col bg-[var(--surface-card)] border-r border-[var(--border-subtle)] overflow-hidden transition-all duration-200"
      style={{ width: collapsed ? SIDEBAR_ICON : SIDEBAR_FULL }}
    >
      {/* Scrollable nav */}
      <nav className="flex-1 overflow-y-auto py-[13px] px-[8px]">
        {visibleGroups.map(group => (
          <div key={group.id} className="mb-[21px]">
            {!collapsed && group.label && (
              <div className="px-[13px] py-1 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.06em] mb-[5px] select-none">
                {group.label}
              </div>
            )}
            {group.items.map(item => (
              <NavItem
                key={item.id}
                item={item}
                collapsed={collapsed}
                pathname={pathname}
                navigate={navigate}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="flex-shrink-0 border-t border-[var(--border-subtle)] flex justify-center p-2">
        <button
          onClick={() => onCollapsedChange?.(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex items-center justify-center w-10 h-10 rounded-[var(--radius-md)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-sunken)] border-none bg-transparent cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 512 512"
            fill="currentColor"
            className={`transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
          >
            <path fillRule="evenodd" clipRule="evenodd" d="M294.6 166.6a24 24 0 0 1 33.9 0l73.4 73.4a24 24 0 0 1 0 33.9l-73.4 73.4a24 24 0 0 1-33.9-33.9L327.2 280H176a24 24 0 0 1 0-48h151.2l-32.6-32.6a24 24 0 0 1 0-33.9z" />
            <path fillRule="evenodd" clipRule="evenodd" d="M112 152a16 16 0 0 1 16-16h8a16 16 0 0 1 0 32h-8a16 16 0 0 1-16-16zm0 104a16 16 0 0 1 16-16h8a16 16 0 0 1 0 32h-8a16 16 0 0 1-16-16zm0 104a16 16 0 0 1 16-16h8a16 16 0 0 1 0 32h-8a16 16 0 0 1-16-16z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── MOBILE TOP BAR ───────────────────────────────────────────────────────────

export function MobileTopBar({ onMenuOpen, user, userAvatar, onUserClick }) {
  return (
    <div className="h-[52px] flex items-center px-4 gap-3 bg-[var(--surface-dark)] border-b border-white/10 flex-shrink-0">
      <button
        onClick={onMenuOpen}
        className="flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200 border-none bg-transparent cursor-pointer flex-shrink-0"
        title="Open menu"
      >
        <Ic d='<rect x="3" y="5" width="18" height="2" rx="1"/><rect x="3" y="11" width="18" height="2" rx="1"/><rect x="3" y="17" width="18" height="2" rx="1"/>' size={20} />
      </button>

      <div className="flex-1 flex justify-center">
        <InvoiceSagaLogo height={22} dark />
      </div>

      <button
        onClick={onUserClick}
        title="Edit profile"
        className="w-8 h-8 rounded-full bg-[var(--brand-600)] flex items-center justify-center text-white text-[13px] font-bold border-none cursor-pointer overflow-hidden flex-shrink-0"
      >
        {userAvatar
          ? <img src={userAvatar} alt="avatar" className="w-full h-full object-cover" />
          : (user?.name || "?")[0].toUpperCase()}
      </button>
    </div>
  );
}

// ─── MOBILE BOTTOM NAV ────────────────────────────────────────────────────────

export function MobileBottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div className="h-[60px] flex items-center justify-around bg-[var(--surface-dark)] border-t border-white/10 flex-shrink-0">
      {MOB_NAV.slice(0, 2).map(({ id, label, icon: Icon, route, match }) => {
        const on = isActive(pathname, match);
        return (
          <button
            key={id}
            onClick={() => navigate(route)}
            className={`flex flex-col items-center gap-0.5 border-none bg-transparent cursor-pointer px-4 py-1 min-w-[52px] transition-colors duration-150 ${on ? "text-[var(--brand-500)]" : "text-white/50"}`}
          >
            <Icon />
            <span className={`text-[10px] ${on ? "font-semibold" : "font-normal"}`}>{label}</span>
          </button>
        );
      })}

      {/* Center + Create */}
      <button
        onClick={() => navigate(ROUTES.INVOICES_NEW)}
        title="Create invoice"
        className="flex items-center justify-center w-12 h-12 rounded-full bg-[var(--brand-600)] text-white border-none cursor-pointer shadow-[var(--shadow-md)] -mt-5"
      >
        <Icons.Plus />
      </button>

      {MOB_NAV.slice(2).map(({ id, label, icon: Icon, route, match }) => {
        const on = isActive(pathname, match);
        return (
          <button
            key={id}
            onClick={() => navigate(route)}
            className={`flex flex-col items-center gap-0.5 border-none bg-transparent cursor-pointer px-4 py-1 min-w-[52px] transition-colors duration-150 ${on ? "text-[var(--brand-500)]" : "text-white/50"}`}
          >
            <Icon />
            <span className={`text-[10px] ${on ? "font-semibold" : "font-normal"}`}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── MOBILE DRAWER ────────────────────────────────────────────────────────────

export function MobileDrawer({ onClose, user, userAvatar, onUserClick, onLogout }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const visibleGroups = useVisibleGroups();

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/50 z-[300]" />
      <div className="fixed top-0 left-0 bottom-0 w-[260px] z-[301] flex flex-col bg-[var(--surface-card)] shadow-[var(--shadow-popover)]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--border-subtle)] flex-shrink-0">
          <InvoiceSagaLogo height={22} />
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-[var(--radius-md)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-sunken)] border-none bg-transparent cursor-pointer transition-all duration-200"
          >
            <Icons.X />
          </button>
        </div>

        {/* Grouped nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {visibleGroups.map(group => (
            <div key={group.id} className="mb-3">
              {group.label && (
                <div className="px-3 py-1 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.06em] mb-1 select-none">
                  {group.label}
                </div>
              )}
              {group.items.map(item => {
                const on = isActive(pathname, item.match);
                return (
                  <button
                    key={item.id}
                    onClick={() => { navigate(item.route); onClose(); }}
                    className={[
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)] border-none cursor-pointer text-[13px] text-left mb-0.5 transition-all duration-150",
                      on
                        ? "bg-[var(--brand-50)] text-[var(--brand-700)] font-medium"
                        : "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]",
                    ].join(" ")}
                  >
                    <span className="w-[18px] h-[18px] flex items-center justify-center flex-shrink-0">
                      <item.icon />
                    </span>
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Settings */}
          <div className="pt-2 border-t border-[var(--border-subtle)]">
            <button
              onClick={() => { navigate(SETTINGS_ITEM.route); onClose(); }}
              className={[
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)] border-none cursor-pointer text-[13px] text-left transition-all duration-150",
                isActive(pathname, SETTINGS_ITEM.match)
                  ? "bg-[var(--brand-50)] text-[var(--brand-700)] font-medium"
                  : "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]",
              ].join(" ")}
            >
              <span className="w-[18px] h-[18px] flex items-center justify-center flex-shrink-0">
                <Icons.Settings />
              </span>
              Settings
            </button>
          </div>
        </nav>

        {/* User footer */}
        <div className="flex-shrink-0 border-t border-[var(--border-subtle)] p-3 flex items-center gap-2">
          <button
            onClick={() => { onUserClick(); onClose(); }}
            className="w-8 h-8 rounded-full bg-[var(--brand-600)] flex items-center justify-center text-white text-[13px] font-bold border-none cursor-pointer overflow-hidden flex-shrink-0"
          >
            {userAvatar
              ? <img src={userAvatar} alt="avatar" className="w-full h-full object-cover" />
              : (user?.name || "?")[0].toUpperCase()}
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-[var(--text-primary)] truncate">{user?.name}</div>
            <div className="text-[11px] text-[var(--text-tertiary)]">{user?.role}</div>
          </div>
          <button
            onClick={() => { onLogout?.(); onClose(); }}
            className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-1 rounded-[var(--radius-sm)] hover:bg-[var(--surface-sunken)] border-none bg-transparent cursor-pointer transition-all duration-200 flex-shrink-0"
          >
            Log out
          </button>
        </div>
      </div>
    </>
  );
}
