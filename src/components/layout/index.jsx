import { ff } from "../../constants";
import { Ic, Icons } from "../icons";

// ─── NAVIGATION DEFINITION ────────────────────────────────────────────────────
export const NAV = [
  { id:"home",      label:"Home",              Icon:Icons.Home },
  { id:"customers", label:"Customers",          Icon:Icons.Customers },
  { id:"items",     label:"Items",              Icon:Icons.Items },
  { id:"quotes",    label:"Quotes",             Icon:Icons.Quotes },
  { id:"invoices",  label:"Invoices",           Icon:Icons.Invoices },
  { id:"payments",  label:"Payments Received",  Icon:Icons.Payments },
  { id:"settings",  label:"Settings",           Icon:Icons.Settings },
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
export function Sidebar({ active, setActive, user, onEditUser, setMobileOpen, sidebarBg="#1A1A1A", accent="#E86C4A", pinned=true, onTogglePin, userAvatar, collapsed=false }) {
  return (
    <div style={{ width: collapsed ? SIDEBAR_ICON : SIDEBAR_FULL, height:"100%", background:sidebarBg, display:"flex", flexDirection:"column", fontFamily:ff, overflow:"hidden", transition:"width 0.22s cubic-bezier(.4,0,.2,1)" }}>
      {/* Logo */}
      <div style={{ padding: collapsed ? "16px 0" : "18px 14px 14px", borderBottom:"1px solid rgba(255,255,255,0.07)", display:"flex", alignItems:"center", justifyContent: collapsed ? "center" : "space-between", flexShrink:0 }}>
        {collapsed ? (
          <button onClick={onTogglePin} title="Expand sidebar"
            style={{ width:28, height:28, background:accent, borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", border:"none", cursor:"pointer", padding:0 }}>
            <Icons.Invoices />
          </button>
        ) : (<>
          <div style={{ display:"flex", alignItems:"center", gap:9 }}>
            <div style={{ width:28, height:28, background:accent, borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center" }}><Icons.Invoices /></div>
            <span style={{ color:"#fff", fontSize:13, fontWeight:800, letterSpacing:"0.06em" }}>AI INVOICE</span>
          </div>
          {onTogglePin && (
            <button onClick={onTogglePin} title={pinned?"Unpin sidebar":"Pin sidebar"}
              style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.4)", padding:3, display:"flex", borderRadius:5, transition:"color 0.15s" }}
              onMouseEnter={e=>e.currentTarget.style.color=accent}
              onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.4)"}>
              <Ic d={pinned
                ? '<path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>'
                : '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>'
              } size={14} sw={2}/>
            </button>
          )}
        </>)}
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding: collapsed ? "8px 0" : "10px 8px", overflowY:"auto" }}>
        {NAV.map(({ id, label, Icon })=>{
          const on = active===id;
          return collapsed ? (
            <button key={id} onClick={()=>{ setActive(id); setMobileOpen?.(false); }}
              title={label}
              style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", padding:"11px 0", border:"none", background:on?`${accent}22`:"none", color:on?accent:"rgba(255,255,255,0.45)", cursor:"pointer", marginBottom:1, position:"relative", transition:"all 0.15s" }}
              onMouseEnter={e=>{ if(!on) e.currentTarget.style.background="rgba(255,255,255,0.07)"; }}
              onMouseLeave={e=>{ if(!on) e.currentTarget.style.background="none"; }}>
              <Icon />
              {on && <div style={{ position:"absolute", right:0, top:"50%", transform:"translateY(-50%)", width:3, height:20, borderRadius:"3px 0 0 3px", background:accent }} />}
            </button>
          ) : (
            <button key={id} onClick={()=>{ setActive(id); setMobileOpen?.(false); }}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:11, padding:"10px 12px", borderRadius:8, border:"none", background:on?`${accent}22`:"none", color:on?accent:"rgba(255,255,255,0.5)", cursor:"pointer", fontSize:13, fontWeight:on?700:400, fontFamily:ff, marginBottom:2, textAlign:"left", transition:"all 0.15s" }}
              onMouseEnter={e=>{ if(!on) e.currentTarget.style.background="rgba(255,255,255,0.06)"; }}
              onMouseLeave={e=>{ if(!on) e.currentTarget.style.background="none"; }}>
              <Icon />{label}{on && <div style={{ marginLeft:"auto", width:4, height:4, borderRadius:"50%", background:accent }} />}
            </button>
          );
        })}
      </nav>

      {/* User footer */}
      <div style={{ padding: collapsed ? "10px 0 14px" : "10px 12px 14px", borderTop:"1px solid rgba(255,255,255,0.07)", display:"flex", alignItems:"center", justifyContent: collapsed ? "center" : "unset", gap:9, flexShrink:0 }}>
        <button onClick={onEditUser} title="Edit profile"
          style={{ width:32, height:32, borderRadius:"50%", background:accent, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:13, fontWeight:700, flexShrink:0, overflow:"hidden", border:"none", cursor:"pointer", padding:0 }}>
          {userAvatar ? <img src={userAvatar} alt="avatar" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : (user.name||"?")[0].toUpperCase()}
        </button>
        {!collapsed && (<>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ color:"#fff", fontSize:12, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.name}</div>
            <div style={{ color:"rgba(255,255,255,0.4)", fontSize:11 }}>{user.role}</div>
          </div>
          <button onClick={onEditUser} title="Edit profile"
            style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.3)", padding:2, display:"flex" }}
            onMouseEnter={e=>e.currentTarget.style.color=accent}
            onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.3)"}>
            <Icons.Pen />
          </button>
        </>)}
      </div>
    </div>
  );
}

// ─── MOBILE TOP BAR ───────────────────────────────────────────────────────────
export function MobileTopBar({ activePage, onMenuOpen, sidebarBg="#1A1A1A" }) {
  const page = NAV.find(n=>n.id===activePage);
  return (
    <div className="mobile-topbar" style={{ display:"none", position:"fixed", top:0, left:0, right:0, height:52, background:sidebarBg, zIndex:200, alignItems:"center", padding:"0 16px", gap:12 }}>
      <button onClick={onMenuOpen} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.7)", display:"flex", alignItems:"center", padding:4 }}>
        <Ic d='<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>' size={20} sw={2} />
      </button>
      <div style={{ display:"flex", alignItems:"center", gap:7, flex:1 }}>
        <div style={{ width:24, height:24, background:"#E86C4A", borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center" }}><Icons.Invoices /></div>
        <span style={{ color:"#fff", fontSize:13, fontWeight:800, letterSpacing:"0.06em" }}>AI INVOICE</span>
      </div>
      <span style={{ color:"rgba(255,255,255,0.5)", fontSize:12 }}>{page?.label||""}</span>
    </div>
  );
}

// ─── MOBILE BOTTOM NAV ────────────────────────────────────────────────────────
export function MobileBottomNav({ active, setActive }) {
  return (
    <div className="mobile-bottom-nav" style={{ display:"none", position:"fixed", bottom:0, left:0, right:0, height:60, background:"#1A1A1A", zIndex:200, borderTop:"1px solid rgba(255,255,255,0.08)", alignItems:"center", justifyContent:"space-around" }}>
      {MOB_NAV.map(({ id, label, Icon })=>{
        const on=active===id;
        return (
          <button key={id} onClick={()=>setActive(id)}
            style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, background:"none", border:"none", cursor:"pointer", color:on?"#E86C4A":"rgba(255,255,255,0.4)", fontFamily:ff, padding:"6px 12px", minWidth:52, transition:"color 0.15s" }}>
            <Icon />
            <span style={{ fontSize:10, fontWeight:on?700:400 }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
