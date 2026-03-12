import { ff } from "../../constants";
import { Ic, Icons } from "../icons";

// ─── NAVIGATION DEFINITION ────────────────────────────────────────────────────
export const NAV = [
  { id:"home",      label:"Home",             Icon:Icons.Home },
  { id:"customers", label:"Customers",         Icon:Icons.Customers },
  { id:"items",     label:"Items",             Icon:Icons.Items },
  { id:"quotes",    label:"Quotes",            Icon:Icons.Quotes },
  { id:"invoices",  label:"Invoices",          Icon:Icons.Invoices },
  { id:"payments",  label:"Payments Received", Icon:Icons.Payments },
  { id:"settings",  label:"Settings",          Icon:Icons.Settings },
  ];

const MOB_NAV = [
  { id:"home",      label:"Home",     Icon:Icons.Home },
  { id:"invoices",  label:"Invoices", Icon:Icons.Invoices },
  { id:"quotes",    label:"Quotes",   Icon:Icons.Quotes },
  { id:"customers", label:"Clients",  Icon:Icons.Customers },
  { id:"settings",  label:"Settings", Icon:Icons.Settings },
];

export const SIDEBAR_FULL = 220;
export const SIDEBAR_ICON = 54;

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
export function Sidebar({
  activePage, onNavigate,
  user, onUserClick, onLogout,
  sidebarBg = "#1A1A1A",
  accent = "#E86C4A",
  collapsed = false,
  onCollapsedChange,
  userAvatar,
}) {
  const toggleCollapsed = () => onCollapsedChange?.(!collapsed);

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
    }}>
      {/* Logo */}
      <div style={{
        padding: collapsed ? "16px 0" : "18px 14px 14px",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        display: "flex", alignItems: "center",
        justifyContent: collapsed ? "center" : "space-between",
        flexShrink: 0,
      }}>
        {collapsed ? (
          <button onClick={toggleCollapsed} title="Expand sidebar"
            style={{ width:28, height:28, background:accent, borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", border:"none", cursor:"pointer", padding:0 }}>
            <Icons.Invoices />
          </button>
        ) : (<>
          <div style={{ display:"flex", alignItems:"center", gap:9 }}>
            <div style={{ width:28, height:28, background:accent, borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Icons.Invoices />
            </div>
            <span style={{ color:"#fff", fontSize:13, fontWeight:800, letterSpacing:"0.06em" }}>AI INVOICE</span>
          </div>
          <button onClick={toggleCollapsed} title="Collapse sidebar"
            style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.4)", padding:3, display:"flex", borderRadius:5, transition:"color 0.15s" }}
            onMouseEnter={e=>e.currentTarget.style.color=accent}
            onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.4)"}>
            <Ic d='<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>' size={14} sw={2} />
          </button>
        </>)}
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding: collapsed ? "8px 0" : "10px 8px", overflowY:"auto" }}>
        {NAV.map(({ id, label, Icon }) => {
          const on = id==="settings" ? String(activePage||"").startsWith("settings") : activePage === id;
          return collapsed ? (
            <button key={id} onClick={() => onNavigate(id)} title={label}
              style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", padding:"11px 0", border:"none", background:on?`${accent}22`:"none", color:on?accent:"rgba(255,255,255,0.45)", cursor:"pointer", marginBottom:1, position:"relative", transition:"all 0.15s" }}
              onMouseEnter={e=>{ if(!on) e.currentTarget.style.background="rgba(255,255,255,0.07)"; }}
              onMouseLeave={e=>{ if(!on) e.currentTarget.style.background="none"; }}>
              <Icon />
              {on && <div style={{ position:"absolute", right:0, top:"50%", transform:"translateY(-50%)", width:3, height:20, borderRadius:"3px 0 0 3px", background:accent }} />}
            </button>
          ) : (
            <button key={id} onClick={() => onNavigate(id)}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:11, padding:"10px 12px", borderRadius:8, border:"none", background:on?`${accent}22`:"none", color:on?accent:"rgba(255,255,255,0.5)", cursor:"pointer", fontSize:13, fontWeight:on?700:400, fontFamily:ff, marginBottom:2, textAlign:"left", transition:"all 0.15s" }}
              onMouseEnter={e=>{ if(!on) e.currentTarget.style.background="rgba(255,255,255,0.06)"; }}
              onMouseLeave={e=>{ if(!on) e.currentTarget.style.background="none"; }}>
              <Icon />
              {label}
              {on && <div style={{ marginLeft:"auto", width:4, height:4, borderRadius:"50%", background:accent }} />}
            </button>
          );
        })}
      </nav>

      {/* User footer */}
      <div style={{
        padding: collapsed ? "10px 0 14px" : "10px 12px 14px",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        display: "flex", alignItems: "center",
        justifyContent: collapsed ? "center" : "unset",
        gap: 9, flexShrink: 0,
      }}>
        <button onClick={onUserClick} title="Edit profile"
          style={{ width:32, height:32, borderRadius:"50%", background:accent, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:13, fontWeight:700, flexShrink:0, overflow:"hidden", border:"none", cursor:"pointer", padding:0 }}>
          {userAvatar
            ? <img src={userAvatar} alt="avatar" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            : (user?.name||"?")[0].toUpperCase()}
        </button>
        {!collapsed && (<>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ color:"#fff", fontSize:12, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user?.name}</div>
            <div style={{ color:"rgba(255,255,255,0.4)", fontSize:11 }}>{user?.role}</div>
          </div>
          <button onClick={onUserClick} title="Edit profile"
            style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.3)", padding:2, display:"flex" }}
            onMouseEnter={e=>e.currentTarget.style.color=accent}
            onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.3)"}>
            <Icons.Pen />
          </button>
          <button onClick={onLogout}
            style={{ border:"none", background:"rgba(255,255,255,0.08)", color:"#fff", borderRadius:8, padding:"7px 10px", fontSize:12, cursor:"pointer", fontFamily:ff }}>
            Log Out
          </button>
        </>)}
      </div>
    </div>
  );
}

// ─── MOBILE TOP BAR ───────────────────────────────────────────────────────────
export function MobileTopBar({ activePage, onMenuOpen, sidebarBg="#1A1A1A", accent="#E86C4A", user, userAvatar, onUserClick }) {
  const page = NAV.find(n => n.id === activePage);
  return (
    <div style={{
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
        <span style={{ color:"#fff", fontSize:13, fontWeight:800, letterSpacing:"0.06em" }}>AI INVOICE</span>
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
export function MobileBottomNav({ activePage, onNavigate, accent="#E86C4A" }) {
  return (
    <div style={{
      display: "flex",
      position: "fixed", bottom:0, left:0, right:0, height:60,
      background: "#1A1A1A", zIndex:200,
      borderTop: "1px solid rgba(255,255,255,0.08)",
      alignItems: "center", justifyContent: "space-around",
    }}>
      {MOB_NAV.map(({ id, label, Icon }) => {
        const on = id==="settings" ? String(activePage||"").startsWith("settings") : activePage === id;
        return (
          <button key={id} onClick={() => onNavigate(id)}
            style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, background:"none", border:"none", cursor:"pointer", color:on?accent:"rgba(255,255,255,0.4)", fontFamily:ff, padding:"6px 12px", minWidth:52, transition:"color 0.15s" }}>
            <Icon />
            <span style={{ fontSize:10, fontWeight:on?700:400 }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── MOBILE DRAWER (overlay sidebar on mobile) ────────────────────────────────
export function MobileDrawer({ activePage, onNavigate, onClose, sidebarBg="#1A1A1A", accent="#E86C4A", user, userAvatar, onUserClick, onLogout }) {
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
          <div style={{ display:"flex", alignItems:"center", gap:9 }}>
            <div style={{ width:28, height:28, background:accent, borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center" }}><Icons.Invoices /></div>
            <span style={{ color:"#fff", fontSize:13, fontWeight:800, letterSpacing:"0.06em" }}>AI INVOICE</span>
          </div>
          <button onClick={onClose}
            style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.5)", display:"flex" }}>
            <Icons.X />
          </button>
        </div>
        <nav style={{ flex:1, padding:"10px 8px", overflowY:"auto" }}>
          {NAV.map(({ id, label, Icon }) => {
            const on = id==="settings" ? String(activePage||"").startsWith("settings") : activePage === id;
            return (
              <button key={id} onClick={() => { onNavigate(id); onClose(); }}
                style={{ width:"100%", display:"flex", alignItems:"center", gap:11, padding:"10px 12px", borderRadius:8, border:"none", background:on?`${accent}22`:"none", color:on?accent:"rgba(255,255,255,0.5)", cursor:"pointer", fontSize:13, fontWeight:on?700:400, fontFamily:ff, marginBottom:2, textAlign:"left", transition:"all 0.15s" }}
                onMouseEnter={e=>{ if(!on) e.currentTarget.style.background="rgba(255,255,255,0.06)"; }}
                onMouseLeave={e=>{ if(!on) e.currentTarget.style.background="none"; }}>
                <Icon />{label}
                {on && <div style={{ marginLeft:"auto", width:4, height:4, borderRadius:"50%", background:accent }} />}
              </button>
            );
          })}
        </nav>
        <div style={{ padding:"10px 12px 14px", borderTop:"1px solid rgba(255,255,255,0.07)", display:"flex", alignItems:"center", gap:9 }}>
          <button onClick={() => { onUserClick(); onClose(); }}
            style={{ width:32, height:32, borderRadius:"50%", background:accent, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:13, fontWeight:700, border:"none", cursor:"pointer", overflow:"hidden", padding:0, flexShrink:0 }}>
            {userAvatar ? <img src={userAvatar} alt="avatar" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : (user?.name||"?")[0].toUpperCase()}
          </button>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ color:"#fff", fontSize:12, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user?.name}</div>
            <div style={{ color:"rgba(255,255,255,0.4)", fontSize:11 }}>{user?.role}</div>
          </div>
          <button onClick={() => { onLogout?.(); onClose(); }}
            style={{ border:"none", background:"rgba(255,255,255,0.08)", color:"#fff", borderRadius:8, padding:"7px 10px", fontSize:12, cursor:"pointer", fontFamily:ff }}>
            Log Out
          </button>
        </div>
      </div>
    </>
  );
}
