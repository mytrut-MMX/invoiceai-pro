import { useState } from "react";
import { ff } from "../constants";
import { Icons } from "../components/icons";
import { Field, Input, Select, Toggle, Switch, SlideToggle, Btn } from "../components/atoms";

const PRESET_THEMES = [
  { label:"Dark",     type:"solid",    color:"#1A1A1A", color2:"#333",    accent:"#E86C4A" },
  { label:"Ocean",    type:"gradient", color:"#1E3A8A", color2:"#0891B2", accent:"#38BDF8" },
  { label:"Forest",   type:"gradient", color:"#14532D", color2:"#166534", accent:"#4ADE80" },
  { label:"Sunset",   type:"gradient", color:"#7C2D12", color2:"#E86C4A", accent:"#FDBA74" },
  { label:"Violet",   type:"gradient", color:"#4C1D95", color2:"#7C3AED", accent:"#C4B5FD" },
  { label:"Slate",    type:"solid",    color:"#334155", color2:"#475569", accent:"#94A3B8" },
  { label:"Rose",     type:"gradient", color:"#881337", color2:"#E11D48", accent:"#FDA4AF" },
  { label:"Charcoal", type:"solid",    color:"#292524", color2:"#44403C", accent:"#FCD34D" },
];

export default function UserEditModal({ user, onClose, onSave, userAvatar, setUserAvatar, appTheme, setAppTheme, sidebarPinned, setSidebarPinned, onLogout }) {
  const [name, setName] = useState(user.name||"");
  const [role, setRole] = useState(user.role||"Admin");
  const [email, setEmail] = useState(user.email||"");
  const [tab, setTab] = useState("profile");
  const [localAvatar, setLocalAvatar] = useState(userAvatar);
  const [themeType, setThemeType] = useState(appTheme?.type||"solid");
  const [themeColor, setThemeColor] = useState(appTheme?.color||"#1A1A1A");
  const [themeColor2, setThemeColor2] = useState(appTheme?.color2||"#E86C4A");
  const [themeAccent, setThemeAccent] = useState(appTheme?.accent||"#E86C4A");
  const [pinned, setPinned] = useState(sidebarPinned);

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => setLocalAvatar(ev.target.result);
    reader.readAsDataURL(file);
  };

  const previewBg = themeType==="gradient"
    ? `linear-gradient(160deg,${themeColor},${themeColor2})`
    : themeColor;

  const handleSave = () => {
    onSave({ name, role, email });
    setUserAvatar(localAvatar);
    setAppTheme({ type:themeType, color:themeColor, color2:themeColor2, accent:themeAccent });
    setSidebarPinned(pinned);
    onClose();
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:2000, padding:16 }}>
      <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:480, maxHeight:"92vh", boxShadow:"0 24px 60px rgba(0,0,0,0.2)", fontFamily:ff, display:"flex", flexDirection:"column", overflow:"hidden" }}>

        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 22px 12px", borderBottom:"1px solid #F0F0F0" }}>
          <h2 style={{ margin:0, fontSize:16, fontWeight:800, color:"#1A1A1A" }}>Profile & Appearance</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#AAA", display:"flex" }}><Icons.X /></button>
        </div>

        <div style={{ display:"flex", gap:0, padding:"0 22px", borderBottom:"1px solid #F0F0F0" }}>
          {[["profile","👤 Profile"],["appearance","🎨 Appearance"]].map(([t,l])=>(
            <button key={t} onClick={()=>setTab(t)}
              style={{ padding:"10px 16px", border:"none", borderBottom:`2px solid ${tab===t?"#1A1A1A":"transparent"}`, background:"none", fontSize:13, fontWeight:tab===t?700:400, color:tab===t?"#1A1A1A":"#888", cursor:"pointer", fontFamily:ff }}>
              {l}
            </button>
          ))}
        </div>

        <div style={{ overflowY:"auto", flex:1, padding:"18px 22px" }}>
          {tab==="profile" && (<>
            {/* Avatar */}
            <div style={{ display:"flex", justifyContent:"center", marginBottom:20 }}>
              <label style={{ cursor:"pointer", position:"relative", display:"block" }}>
                <div style={{ width:80, height:80, borderRadius:"50%", background:themeColor, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:30, fontWeight:800, overflow:"hidden", border:"3px solid #F0F0F0" }}>
                  {localAvatar
                    ? <img src={localAvatar} alt="avatar" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                    : (name||"?")[0].toUpperCase()}
                </div>
                <div style={{ position:"absolute", bottom:0, right:0, width:26, height:26, borderRadius:"50%", background:"#1A1A1A", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", border:"2px solid #fff" }}>
                  <Icons.Plus />
                </div>
                <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display:"none" }} />
              </label>
            </div>
            {localAvatar && (
              <div style={{ textAlign:"center", marginBottom:14 }}>
                <button onClick={()=>setLocalAvatar(null)} style={{ fontSize:11, color:"#DC2626", background:"none", border:"none", cursor:"pointer", fontFamily:ff }}>Remove photo</button>
              </div>
            )}
            <Field label="Full Name" required><Input value={name} onChange={setName} placeholder="Your name" /></Field>
            <Field label="Email"><Input value={email} onChange={setEmail} type="email" placeholder="email@example.com" /></Field>
            <Field label="Role"><Select value={role} onChange={setRole} options={["Admin","Manager","Accountant","Viewer"]} /></Field>
            <div style={{ marginTop:16, paddingTop:12, borderTop:"1px solid #F0F0F0" }}>
              <Btn onClick={()=>{ onClose(); onLogout?.(); }} variant="outline" icon={<Icons.X />}>Log Out</Btn>
            </div>
          </>)}

          {tab==="appearance" && (<>
            {/* Sidebar preview */}
            <div style={{ borderRadius:10, overflow:"hidden", marginBottom:16, border:"1px solid #EBEBEB" }}>
              <div style={{ background:previewBg, padding:"12px 14px", display:"flex", alignItems:"center", gap:9 }}>
                <div style={{ width:24, height:24, borderRadius:6, background:themeAccent, display:"flex", alignItems:"center", justifyContent:"center" }}><Icons.Invoices /></div>
                <span style={{ color:"#fff", fontSize:12, fontWeight:800, letterSpacing:"0.06em" }}>AI INVOICE</span>
              </div>
              <div style={{ background:previewBg, padding:"4px 8px 10px" }}>
                {["Home","Invoices","Payments"].map(l=>(
                  <div key={l} style={{ padding:"7px 10px", borderRadius:6, margin:"2px 0", color:l==="Invoices"?themeAccent:"rgba(255,255,255,0.5)", background:l==="Invoices"?`${themeAccent}22`:"none", fontSize:12, display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:5, height:5, borderRadius:"50%", background:l==="Invoices"?themeAccent:"rgba(255,255,255,0.2)" }} />{l}
                  </div>
                ))}
              </div>
            </div>

            {/* Presets */}
            <div style={{ fontSize:11, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Preset Themes</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:14 }}>
              {PRESET_THEMES.map(p=>{
                const bg = p.type==="gradient" ? `linear-gradient(135deg,${p.color},${p.color2})` : p.color;
                const active = themeColor===p.color && themeType===p.type;
                return (
                  <button key={p.label} onClick={()=>{ setThemeType(p.type); setThemeColor(p.color); setThemeColor2(p.color2); setThemeAccent(p.accent); }}
                    style={{ padding:"8px 6px", borderRadius:8, border:`2px solid ${active?"#1A1A1A":"#EBEBEB"}`, background:"#fff", cursor:"pointer", fontFamily:ff }}>
                    <div style={{ height:22, borderRadius:5, background:bg, marginBottom:4 }} />
                    <span style={{ fontSize:10, fontWeight:600, color:"#555" }}>{p.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom controls */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Field label="Style">
                <Toggle value={themeType==="gradient"?"Gradient":"Solid"} onChange={v=>setThemeType(v==="Gradient"?"gradient":"solid")} options={["Solid","Gradient"]} />
              </Field>
              <Field label="Accent Colour">
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  <input type="color" value={themeAccent} onChange={e=>setThemeAccent(e.target.value)}
                    style={{ width:36, height:34, borderRadius:7, border:"1.5px solid #E0E0E0", padding:2, cursor:"pointer" }} />
                  <span style={{ fontSize:11, color:"#AAA", fontFamily:"monospace" }}>{themeAccent}</span>
                </div>
              </Field>
              <Field label={themeType==="gradient"?"Gradient Start":"Sidebar Colour"}>
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  <input type="color" value={themeColor} onChange={e=>setThemeColor(e.target.value)}
                    style={{ width:36, height:34, borderRadius:7, border:"1.5px solid #E0E0E0", padding:2, cursor:"pointer" }} />
                  <span style={{ fontSize:11, color:"#AAA", fontFamily:"monospace" }}>{themeColor}</span>
                </div>
              </Field>
              {themeType==="gradient" && (
                <Field label="Gradient End">
                  <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                    <input type="color" value={themeColor2} onChange={e=>setThemeColor2(e.target.value)}
                      style={{ width:36, height:34, borderRadius:7, border:"1.5px solid #E0E0E0", padding:2, cursor:"pointer" }} />
                    <span style={{ fontSize:11, color:"#AAA", fontFamily:"monospace" }}>{themeColor2}</span>
                  </div>
                </Field>
              )}
            </div>

            <div style={{ marginTop:14 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Sidebar Behaviour</div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 12px", background:"#F9F9F9", borderRadius:9, border:"1px solid #EBEBEB" }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#1A1A1A" }}>Pinned Sidebar</div>
                  <div style={{ fontSize:11, color:"#AAA", marginTop:1 }}>Always visible · hover to show when unpinned</div>
                </div>
                <SlideToggle value={pinned} onChange={setPinned} />
              </div>
            </div>
          </>)}
        </div>

        <div style={{ padding:"12px 22px 16px", borderTop:"1px solid #F0F0F0", display:"flex", gap:10, justifyContent:"flex-end" }}>
          <Btn onClick={onClose} variant="outline">Cancel</Btn>
          <Btn onClick={handleSave} variant="primary" disabled={!name}>Save Changes</Btn>
        </div>
      </div>
    </div>
  );
}
