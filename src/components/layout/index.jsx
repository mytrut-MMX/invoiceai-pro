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
          "relative w-full flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)] border-none cursor-pointer transition-all duration-200 text-[13px] text-left",
          addRoute ? "pr-8" : "pr-3",
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

export function TopBar({ user, userAvatar, onUserClick, onMenuOpen, collapsed, onCollapsedChange }) {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const dropdownRef = useRef(null);

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
      <button className="hidden lg:flex flex-1 max-w-sm items-center gap-2 h-8 px-3 rounded-[var(--radius-md)] bg-[var(--surface-dark-2)] border border-white/10 text-[var(--text-tertiary)] text-[13px] cursor-pointer hover:border-white/20 transition-all duration-200">
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

        {/* User avatar */}
        <button
          onClick={onUserClick}
          title="Edit profile"
          className="w-8 h-8 rounded-full bg-[var(--brand-600)] flex items-center justify-center text-white text-[13px] font-bold border-none cursor-pointer overflow-hidden flex-shrink-0 hover:ring-2 hover:ring-white/30 transition-all duration-200 ml-1"
        >
          {userAvatar
            ? <img src={userAvatar} alt="avatar" className="w-full h-full object-cover" />
            : (user?.name || "?")[0].toUpperCase()}
        </button>
      </div>
    </div>
  );
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────

export function Sidebar({ user, onUserClick, onLogout, collapsed = false, onCollapsedChange, userAvatar }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const visibleGroups = useVisibleGroups();

  return (
    <div
      className="flex-shrink-0 flex flex-col bg-[var(--surface-card)] border-r border-[var(--border-subtle)] overflow-hidden transition-all duration-200"
      style={{ width: collapsed ? SIDEBAR_ICON : SIDEBAR_FULL }}
    >
      {/* Scrollable nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {visibleGroups.map(group => (
          <div key={group.id} className="mb-3">
            {!collapsed && group.label && (
              <div className="px-3 py-1 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.06em] mb-1 select-none">
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

      {/* Settings + user footer */}
      <div className="flex-shrink-0 border-t border-[var(--border-subtle)]">
        <div className="px-2 pt-2">
          <NavItem
            item={SETTINGS_ITEM}
            collapsed={collapsed}
            pathname={pathname}
            navigate={navigate}
          />
        </div>

        <div className={`px-2 pt-2 pb-2 flex items-center gap-2 ${collapsed ? "justify-center" : ""}`}>
          <button
            onClick={onUserClick}
            title="Edit profile"
            className="w-8 h-8 rounded-full bg-[var(--brand-600)] flex items-center justify-center text-white text-[13px] font-bold border-none cursor-pointer overflow-hidden flex-shrink-0 hover:ring-2 hover:ring-[var(--brand-200)] transition-all duration-200"
          >
            {userAvatar
              ? <img src={userAvatar} alt="avatar" className="w-full h-full object-cover" />
              : (user?.name || "?")[0].toUpperCase()}
          </button>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-[var(--text-primary)] truncate">{user?.name}</div>
                <div className="text-[11px] text-[var(--text-tertiary)]">{user?.role}</div>
              </div>
              <button
                onClick={onLogout}
                className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-1 rounded-[var(--radius-sm)] hover:bg-[var(--surface-sunken)] border-none bg-transparent cursor-pointer transition-all duration-200 flex-shrink-0"
              >
                Log out
              </button>
            </>
          )}
        </div>

        {/* Collapse toggle */}
        <div className={`px-2 pb-3 flex ${collapsed ? "justify-center" : "justify-end"}`}>
          <button
            onClick={() => onCollapsedChange?.(!collapsed)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex items-center justify-center w-7 h-7 rounded-[var(--radius-md)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-sunken)] border-none bg-transparent cursor-pointer transition-all duration-200"
          >
            {collapsed
              ? <Ic d='<path fill-rule="evenodd" clip-rule="evenodd" d="M16.2803 11.4697C16.5732 11.7626 16.5732 12.2374 16.2803 12.5303L8.78033 20.0303C8.48744 20.3232 8.01256 20.3232 7.71967 20.0303C7.42678 19.7374 7.42678 19.2626 7.71967 18.9697L14.6893 12L7.71967 5.03033C7.42678 4.73744 7.42678 4.26256 7.71967 3.96967C8.01256 3.67678 8.48744 3.67678 8.78033 3.96967L16.2803 11.4697Z"/>' size={14} />
              : <Ic d='<path fill-rule="evenodd" clip-rule="evenodd" d="M7.71967 11.4697C7.42678 11.7626 7.42678 12.2374 7.71967 12.5303L15.2197 20.0303C15.5126 20.3232 15.9874 20.3232 16.2803 20.0303C16.5732 19.7374 16.5732 19.2626 16.2803 18.9697L9.31066 12L16.2803 5.03033C16.5732 4.73744 16.5732 4.26256 16.2803 3.96967C15.9874 3.67678 15.5126 3.67678 15.2197 3.96967L7.71967 11.4697Z"/>' size={14} />
            }
          </button>
        </div>
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
