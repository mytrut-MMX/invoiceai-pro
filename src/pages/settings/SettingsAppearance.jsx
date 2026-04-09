import { useState, useContext, useEffect } from "react";
import { ff } from "../../constants";
import { AppCtx } from "../../context/AppContext";
import { Icons } from "../../components/icons";
import { Field, Input, Btn } from "../../components/atoms";

const ACCENT_PRESETS = ["#E86C4A","#2563EB","#16A34A","#D97706","#9333EA","#0891B2","#E11D48","#1A1A1A"];
const SIDEBAR_PRESETS = [
  { label:"Dark",    color:"#1A1A1A" },
  { label:"Slate",   color:"#1E293B" },
  { label:"Navy",    color:"#1E3A5F" },
  { label:"Forest",  color:"#1A3A2A" },
  { label:"Plum",    color:"#2D1B3D" },
  { label:"White",   color:"#FFFFFF" },
];

// ─── Section wrapper (local copy — will be shared in Refactor-4) ──────────
function Section({ title, children }) {
  return (
    <div style={{ background:"#fff", borderRadius:10, border:"1px solid #e8e8ec", boxShadow:"0 1px 3px rgba(0,0,0,0.04)", marginBottom:18, overflow:"hidden" }}>
      <div style={{ padding:"14px 22px 12px", borderBottom:"1px solid #f0f0f4" }}>
        <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:"#1a1a2e" }}>{title}</h3>
      </div>
      <div style={{ padding:"18px 22px" }}>{children}</div>
    </div>
  );
}

export default function SettingsAppearance() {
  const { appTheme, setAppTheme } = useContext(AppCtx);

  const [themeType,   setThemeType]   = useState(appTheme?.type || "solid");
  const [themeColor,  setThemeColor]  = useState(appTheme?.color || "#1A1A1A");
  const [themeColor2, setThemeColor2] = useState(appTheme?.color2 || "#333");
  const [accentColor, setAccentColor] = useState(appTheme?.accent || "#E86C4A");
  const [saved,       setSaved]       = useState(false);
  const [saveError,   setSaveError]   = useState("");

  useEffect(() => {
    setThemeType(appTheme?.type || "solid");
    setThemeColor(appTheme?.color || "#1A1A1A");
    setThemeColor2(appTheme?.color2 || "#333");
    setAccentColor(appTheme?.accent || "#E86C4A");
  }, [appTheme]);

  const handleSave = () => {
    setSaveError("");
    try {
      setAppTheme({ type: themeType, color: themeColor, color2: themeColor2, accent: accentColor });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError("Something went wrong. Please try again.");
    }
  };

  return (
    <>
      <Section title="Sidebar Appearance">
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>Style</div>
          <div style={{ display:"flex", gap:8 }}>
            {["solid","gradient"].map(t => (
              <button key={t} onClick={() => setThemeType(t)}
                style={{ padding:"7px 16px", borderRadius:8, border:`1.5px solid ${themeType === t ? "#1e6be0" : "#e8e8ec"}`, background: themeType === t ? "#eff6ff" : "#fff", color: themeType === t ? "#1e6be0" : "#374151", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:ff, textTransform:"capitalize" }}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:14 }}>
          <Field label="Sidebar Presets">
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {SIDEBAR_PRESETS.map(p => (
                <button key={p.color} onClick={() => setThemeColor(p.color)} title={p.label}
                  style={{ width:28, height:28, borderRadius:"50%", background:p.color, border:`2px solid ${themeColor === p.color ? "#1e6be0" : "transparent"}`, cursor:"pointer", outline:"none", boxShadow: p.color === "#FFFFFF" ? "inset 0 0 0 1px #E0E0E0" : "none" }} />
              ))}
            </div>
          </Field>
          <Field label="Sidebar Colour">
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <input type="color" value={themeColor} onChange={e => setThemeColor(e.target.value)}
                style={{ width:36, height:36, border:"none", background:"none", cursor:"pointer", borderRadius:8 }} />
              <Input value={themeColor} onChange={setThemeColor} placeholder="#1A1A1A" style={{ flex:1 }} />
            </div>
          </Field>
          {themeType === "gradient" && (
            <Field label="Gradient End Colour">
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <input type="color" value={themeColor2} onChange={e => setThemeColor2(e.target.value)}
                  style={{ width:36, height:36, border:"none", background:"none", cursor:"pointer", borderRadius:8 }} />
                <Input value={themeColor2} onChange={setThemeColor2} placeholder="#333" style={{ flex:1 }} />
              </div>
            </Field>
          )}
          <Field label="Accent Colour">
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                {ACCENT_PRESETS.map(c => (
                  <button key={c} onClick={() => setAccentColor(c)}
                    style={{ width:24, height:24, borderRadius:"50%", background:c, border:`2px solid ${accentColor === c ? "#1e6be0" : "transparent"}`, cursor:"pointer", outline:"none" }} />
                ))}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)}
                  style={{ width:36, height:36, border:"none", background:"none", cursor:"pointer", borderRadius:8 }} />
                <Input value={accentColor} onChange={setAccentColor} placeholder="#E86C4A" style={{ flex:1 }} />
              </div>
            </div>
          </Field>
        </div>
        <div style={{ marginTop:14, height:42, borderRadius:10, background: themeType === "gradient" ? `linear-gradient(90deg,${themeColor},${themeColor2})` : themeColor, display:"flex", alignItems:"center", padding:"0 16px", gap:12 }}>
          <div style={{ width:22, height:22, borderRadius:6, background:accentColor, display:"flex", alignItems:"center", justifyContent:"center" }}><Icons.Invoices /></div>
          <span style={{ color:"#fff", fontSize:12, fontWeight:800, letterSpacing:"0.06em", textShadow:"0 1px 2px rgba(0,0,0,0.3)" }}>InvoSaga</span>
          <div style={{ marginLeft:"auto", width:20, height:20, borderRadius:"50%", background:accentColor }} />
        </div>
      </Section>

      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8, marginTop:16 }}>
        {saveError && (
          <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, color:"#dc2626", fontWeight:600 }}>
            <Icons.Alert /> {saveError}
          </div>
        )}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {saved && (
            <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, color:"#16A34A", fontWeight:600 }}>
              <Icons.Check /> Appearance settings saved.
            </div>
          )}
          <Btn onClick={handleSave} variant="primary" icon={<Icons.Save />} style={{ background: saved ? "#059669" : "#1e6be0", color:"#fff" }}>
            Save appearance settings
          </Btn>
        </div>
      </div>
    </>
  );
}
