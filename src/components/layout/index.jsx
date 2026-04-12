import { useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ff } from "../../constants";
import { Ic, Icons } from "../icons";
import InvoiceSagaLogo from "../InvoiceSagaLogo";
import { ROUTES } from "../../router/routes";
import { AppCtx } from "../../context/AppContext";

// ─── NAVIGATION DEFINITION ────────────────────────────────────────────────────
// Each entry maps a sidebar item to its route(s).
// `route`    — the list/index page path
// `addRoute` — the "create new" page path (optional)
// `match`    — path prefix used to determine if this item is active
export const NAV = [
  { id:"home",      label:"Home",             Icon:Icons.Home,     route:ROUTES.DASHBOARD,  match:ROUTES.DASHBOARD },
  { id:"customers", label:"Customers",         Icon:Icons.Customers,route:ROUTES.CUSTOMERS,  match:"/customers", addRoute:ROUTES.CUSTOMERS_NEW },
  { id:"items",     label:"Items",             Icon:Icons.Items,    route:ROUTES.ITEMS,      match:"/items",     addRoute:ROUTES.ITEMS_NEW },
  { id:"quotes",    label:"Quotes",            Icon:Icons.Quotes,   route:ROUTES.QUOTES,     match:"/quotes",    addRoute:ROUTES.QUOTES_NEW },
  { id:"invoices",  label:"Invoices",          Icon:Icons.Invoices, route:ROUTES.INVOICES,   match:"/invoices",  addRoute:ROUTES.INVOICES_NEW },
  { id:"payments",  label:"Payments Received", Icon:Icons.Payments, route:ROUTES.PAYMENTS,   match:"/payments",  addRoute:ROUTES.PAYMENTS_NEW },
  { id:"expenses",  label:"Expenses",          Icon:Icons.Expenses, route:ROUTES.EXPENSES,   match:"/expenses",  addRoute:ROUTES.EXPENSES_NEW },
  { id:"suppliers", label:"Suppliers",         Icon:Icons.Customers,route:ROUTES.SUPPLIERS,  match:"/suppliers", addRoute:ROUTES.SUPPLIERS_NEW },
  { id:"bills",     label:"Bills",             Icon:Icons.Receipt,  route:ROUTES.BILLS,      match:"/bills",     addRoute:ROUTES.BILLS_NEW },
  { id:"employees", label:"Employees",         Icon:Icons.Customers,route:ROUTES.EMPLOYEES,  match:"/employees" },
  { id:"payroll",   label:"Payroll",           Icon:Icons.Payments, route:ROUTES.PAYROLL,    match:"/payroll" },
  { id:"vat-return",label:"VAT Returns",       Icon:Icons.Invoices, route:ROUTES.VAT_RETURN, match:"/vat-return" },
  { id:"itsa",      label:"Self Assessment",   Icon:Icons.Receipt,  route:ROUTES.ITSA,       match:"/self-assessment" },
  { id:"settings",  label:"Settings",          Icon:Icons.Settings, route:ROUTES.SETTINGS_GENERAL, match:"/settings" },
];

const MOB_NAV = [
  { id:"home",      label:"Home",     Icon:Icons.Home,     route:ROUTES.DASHBOARD,       match:ROUTES.DASHBOARD },
  { id:"invoices",  label:"Invoices", Icon:Icons.Invoices, route:ROUTES.INVOICES,        match:"/invoices" },
  { id:"quotes",    label:"Quotes",   Icon:Icons.Quotes,   route:ROUTES.QUOTES,          match:"/quotes" },
  { id:"customers", label:"Clients",  Icon:Icons.Customers,route:ROUTES.CUSTOMERS,       match:"/customers" },
  { id:"settings",  label:"Settings", Icon:Icons.Settings, route:ROUTES.SETTINGS_GENERAL,match:"/settings" },
];

export const SIDEBAR_FULL = 220;
export const SIDEBAR_ICON = 54;

// ─── helpers ──────────────────────────────────────────────────────────────────
function isDark(color = "") {
  const rgb = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  let r, g, b;
  if (rgb) { r = +rgb[1]; g = +rgb[2]; b = +rgb[3]; }
  else {
    const hex = color.replace("#", "");
    if (hex.length >= 6) { r = parseInt(hex.slice(0,2),16); g = parseInt(hex.slice(2,4),16); b = parseInt(hex.slice(4,6),16); }
    else { return false; }
  }
  return (0.299*r + 0.587*g + 0.114*b) / 255 < 0.5;
}

function isActive(pathname, match) {
  if (match === ROUTES.DASHBOARD) return pathname === ROUTES.DASHBOARD;
  return pathname.startsWith(match);
}

// Hide VAT-only entries from the sidebar when the company is not VAT registered.
// Mirrors the pattern used across the app (orgSettings?.vatReg === "Yes").
function useVisibleNav() {
  const ctx = useContext(AppCtx);
  const isVatRegistered = ctx?.orgSettings?.vatReg === "Yes";
  return isVatRegistered ? NAV : NAV.filter(item => item.id !== "vat-return");
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
export function Sidebar({
  user, onUserClick, onLogout,
  accent = "#E86C4A",
  collapsed = false,
  onCollapsedChange,
  userAvatar,
  sidebarBg = "rgb(33, 38, 60)",
}) {
  const navigate  = useNavigate();
  const { pathname } = useLocation();
  const navItems = useVisibleNav();
  const toggleCollapsed = () => onCollapsedChange?.(!collapsed);
  const dark = isDark(sidebarBg);
  const txt     = dark ? "rgba(255,255,255,0.82)" : "#374151";
  const txtOn   = dark ? "#fff"                   : "#1e6be0";
  const bgOn    = dark ? "rgba(255,255,255,0.12)" : "#e8f0fc";
  const bgHover = dark ? "rgba(255,255,255,0.07)" : "#f3f4f6";
  const border  = dark ? "rgba(255,255,255,0.10)" : "#e8e8ec";
  const iconOn  = dark ? "rgba(255,255,255,0.12)" : "#e8f0fc";
  const accentBar = accent;

  return (
    <div style={{
      width: collapsed ? SIDEBAR_ICON : SIDEBAR_FULL,
      height: "100vh",
      background: sidebarBg,
      display: "flex",
      flexDirection: "column",
      fontFamily: ff,
      overflow: "hidden",
      transition: "width 0.22s cubic-bezier(.4,0,.2,1)",
      flexShrink: 0,
      borderRight: `1px solid ${border}`,
    }}>
      {/* Logo */}
      <div style={{
        padding: collapsed ? "16px 0" : "18px 14px 14px",
        borderBottom: `1px solid ${border}`,
        display: "flex", alignItems: "center",
        justifyContent: collapsed ? "center" : "space-between",
        flexShrink: 0,
      }}>
        {collapsed ? (
          <button onClick={toggleCollapsed} title="Expand sidebar"
            style={{ width:28, height:28, background:"#1e6be0", borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", border:"none", cursor:"pointer", padding:0 }}>
            <Icons.Invoices />
          </button>
        ) : (<>
          <InvoiceSagaLogo height={24} />
          <button onClick={toggleCollapsed} title="Collapse sidebar"
            style={{ background:"none", border:"none", cursor:"pointer", color:"#9ca3af", padding:3, display:"flex", borderRadius:5, transition:"color 0.15s" }}
            onMouseEnter={e=>e.currentTarget.style.color=accent}
            onMouseLeave={e=>e.currentTarget.style.color="#9ca3af"}>
            <Ic d='<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>' size={14} sw={2} />
          </button>
        </>)}
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding: collapsed ? "8px 0" : "10px 8px", overflowY:"auto" }}>
        {navItems.map(({ id, label, Icon, route, match, addRoute }) => {
          const on = isActive(pathname, match);
          const onAdd = addRoute && pathname === addRoute;
          return collapsed ? (
            <button key={id} onClick={() => navigate(route)} title={label}
              style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", padding:"11px 0", border:"none", background:on?bgOn:"none", color:on?txtOn:txt, cursor:"pointer", marginBottom:1, position:"relative", transition:"all 0.15s" }}
              onMouseEnter={e=>{ if(!on) e.currentTarget.style.background=bgHover; }}
              onMouseLeave={e=>{ if(!on) e.currentTarget.style.background="none"; }}>
              <Icon />
              {on && <div style={{ position:"absolute", left:0, top:"25%", bottom:"25%", width:3, borderRadius:"0 3px 3px 0", background:accentBar }} />}
            </button>
          ) : (
            <div key={id} style={{ position:"relative", marginBottom:2 }}>
              <button onClick={() => navigate(route)}
                style={{ width:"100%", display:"flex", alignItems:"center", gap:11, padding:"10px 12px", paddingRight: addRoute ? 36 : 12, borderRadius:8, border:"none", background:on?bgOn:"none", color:on?txtOn:txt, cursor:"pointer", fontSize:13, fontWeight:on?700:400, fontFamily:ff, textAlign:"left", transition:"all 0.15s", position:"relative" }}
                onMouseEnter={e=>{ if(!on) e.currentTarget.style.background=bgHover; }}
                onMouseLeave={e=>{ if(!on) e.currentTarget.style.background="none"; }}>
                <span style={on ? { background:iconOn, borderRadius:7, width:24, height:24, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 } : { width:24, height:24, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <Icon />
                </span>
                {label}
                {on && <div style={{ position:"absolute", left:0, top:"25%", bottom:"25%", width:3, borderRadius:"0 3px 3px 0", background:accentBar }} />}
              </button>
              {addRoute && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); navigate(onAdd ? route : addRoute); }}
                  title={onAdd ? label : `New ${label.replace(/s$/,"")}`}
                  style={{ position:"absolute", right:6, top:"50%", transform:"translateY(-50%)", width:22, height:22, borderRadius:6, border:"none", background:onAdd?accent:bgOn, color:onAdd?"#fff":txtOn, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:0, transition:"all 0.15s", flexShrink:0, zIndex:2 }}
                  onMouseEnter={e=>{ e.currentTarget.style.background=accent; e.currentTarget.style.color="#fff"; }}
                  onMouseLeave={e=>{ e.currentTarget.style.background=onAdd?accent:bgOn; e.currentTarget.style.color=onAdd?"#fff":txtOn; }}>
                  <span style={{ pointerEvents:"none", display:"flex" }}><Icons.Plus /></span>
                </button>
              )}
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div style={{
        padding: collapsed ? "10px 0 14px" : "10px 12px 14px",
        borderTop: `1px solid ${border}`,
        display: "flex", alignItems: "center",
        justifyContent: collapsed ? "center" : "unset",
        gap: 9, flexShrink: 0,
      }}>
        <button onClick={onUserClick} title="Edit profile"
          style={{ width:32, height:32, borderRadius:"50%", background:"#1e6be0", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:13, fontWeight:700, flexShrink:0, overflow:"hidden", border:"none", cursor:"pointer", padding:0 }}>
          {userAvatar
            ? <img src={userAvatar} alt="avatar" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            : (user?.name||"?")[0].toUpperCase()}
        </button>
        {!collapsed && (<>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ color:txtOn, fontSize:12, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user?.name}</div>
            <div style={{ color:txt, fontSize:11 }}>{user?.role}</div>
          </div>
          <button onClick={onUserClick} title="Edit profile"
            style={{ background:"none", border:"none", cursor:"pointer", color:txt, padding:2, display:"flex" }}
            onMouseEnter={e=>e.currentTarget.style.color=accent}
            onMouseLeave={e=>e.currentTarget.style.color=txt}>
            <Icons.Pen />
          </button>
          <button onClick={onLogout}
            style={{ border:"none", background:bgHover, color:txtOn, borderRadius:8, padding:"7px 10px", fontSize:12, cursor:"pointer", fontFamily:ff }}>
            Log Out
          </button>
        </>)}
      </div>
    </div>
  );
}

// ─── MOBILE TOP BAR ───────────────────────────────────────────────────────────
export function MobileTopBar({ onMenuOpen, sidebarBg="rgb(33, 38, 60)", accent="#E86C4A", user, userAvatar, onUserClick }) {
  const { pathname } = useLocation();
  const navItems = useVisibleNav();
  const page = navItems.find(n => isActive(pathname, n.match));
  return (
    <div className="mobile-topbar" style={{
      display: "flex",
      position: "fixed", top:0, left:0, right:0, height:52,
      background: sidebarBg, zIndex:200,
      alignItems: "center", padding:"0 16px", gap:12,
    }}>
      <button onClick={onMenuOpen}
        style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.7)", display:"flex", alignItems:"center", padding:4 }}>
        <Ic d='<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>' size={20} sw={2} />
      </button>
      <div style={{ display:"flex", alignItems:"center", gap:7, flex:1 }}>
        <div style={{ width:24, height:24, background:accent, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Icons.Invoices />
        </div>
        <span style={{ color:"#fff", fontSize:13, fontWeight:800, letterSpacing:"0.06em" }}>InvoiceSaga</span>
      </div>
      <span style={{ color:"rgba(255,255,255,0.5)", fontSize:12 }}>{page?.label||""}</span>
      {user && (
        <button onClick={onUserClick}
          style={{ width:28, height:28, borderRadius:"50%", background:accent, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:12, fontWeight:700, border:"none", cursor:"pointer", overflow:"hidden", padding:0, flexShrink:0 }}>
          {userAvatar
            ? <img src={userAvatar} alt="avatar" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            : (user?.name||"?")[0].toUpperCase()}
        </button>
      )}
    </div>
  );
}

// ─── MOBILE BOTTOM NAV ────────────────────────────────────────────────────────
export function MobileBottomNav({ accent="#E86C4A" }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return (
    <div className="mobile-bottom-nav" style={{
      display: "flex",
      position: "fixed", bottom:0, left:0, right:0, height:60,
      background: "rgb(33, 38, 60)", zIndex:200,
      borderTop: "1px solid rgba(255,255,255,0.08)",
      alignItems: "center", justifyContent: "space-around",
    }}>
      {MOB_NAV.map(({ id, label, Icon, route, match }) => {
        const on = isActive(pathname, match);
        return (
          <button key={id} onClick={() => navigate(route)}
            style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, background:"none", border:"none", cursor:"pointer", color:on?accent:"#fff", fontFamily:ff, padding:"6px 12px", minWidth:52, transition:"color 0.15s" }}>
            <Icon />
            <span style={{ fontSize:10, fontWeight:on?700:400 }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── MOBILE DRAWER (overlay sidebar on mobile) ────────────────────────────────
export function MobileDrawer({ onClose, sidebarBg="rgb(33, 38, 60)", accent="#E86C4A", user, userAvatar, onUserClick, onLogout }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const navItems = useVisibleNav();
  return (
    <>
      <div onClick={onClose}
        style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:300 }} />
      <div style={{
        position:"fixed", top:0, left:0, bottom:0, width:240,
        background:sidebarBg, zIndex:301,
        display:"flex", flexDirection:"column", fontFamily:ff,
      }}>
        <div style={{ padding:"18px 14px 14px", borderBottom:"1px solid rgba(255,255,255,0.07)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <InvoiceSagaLogo height={22} dark />
          <button onClick={onClose}
            style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.5)", display:"flex" }}>
            <Icons.X />
          </button>
        </div>
        <nav style={{ flex:1, padding:"10px 8px", overflowY:"auto" }}>
          {navItems.map(({ id, label, Icon, route, match }) => {
            const on = isActive(pathname, match);
            return (
              <button key={id} onClick={() => { navigate(route); onClose(); }}
                style={{ width:"100%", display:"flex", alignItems:"center", gap:11, padding:"10px 12px", borderRadius:8, border:"none", background:on?"#e8f0fc":"none", color:on?"#1e6be0":"#374151", cursor:"pointer", fontSize:13, fontWeight:on?700:400, fontFamily:ff, marginBottom:2, textAlign:"left", transition:"all 0.15s" }}
                onMouseEnter={e=>{ if(!on) e.currentTarget.style.background="#f3f4f6"; }}
                onMouseLeave={e=>{ if(!on) e.currentTarget.style.background="none"; }}>
                <Icon />{label}
                {on && <div style={{ marginLeft:"auto", width:4, height:4, borderRadius:"50%", background:"#1e6be0" }} />}
              </button>
            );
          })}
        </nav>
        <div style={{ padding:"10px 12px 14px", borderTop:"1px solid rgba(255,255,255,0.07)", display:"flex", alignItems:"center", gap:9 }}>
          <button onClick={() => { onUserClick(); onClose(); }}
            style={{ width:32, height:32, borderRadius:"50%", background:"#1e6be0", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:13, fontWeight:700, border:"none", cursor:"pointer", overflow:"hidden", padding:0, flexShrink:0 }}>
            {userAvatar ? <img src={userAvatar} alt="avatar" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : (user?.name||"?")[0].toUpperCase()}
          </button>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ color:"#1a1a2e", fontSize:12, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user?.name}</div>
            <div style={{ color:"#6b7280", fontSize:11 }}>{user?.role}</div>
          </div>
          <button onClick={() => { onLogout?.(); onClose(); }}
            style={{ border:"none", background:"#f3f4f6", color:"#374151", borderRadius:8, padding:"7px 10px", fontSize:12, cursor:"pointer", fontFamily:ff }}>
            Log Out
          </button>
        </div>
      </div>
    </>
  );
}
