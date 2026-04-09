import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../router/routes";
import { ff, PDF_TEMPLATES } from "../../constants";
import { AppCtx } from "../../context/AppContext";
import { Icons } from "../../components/icons";
import { Field, Btn } from "../../components/atoms";
import { validateImageDataUrl } from "../../utils/security";
import Section from "../../components/settings/Section";

export default function SettingsTemplates({ onPreview }) {
  const navigate = useNavigate();
  const {
    pdfTemplate, setPdfTemplate,
    companyLogo, setCompanyLogo,
    companyLogoSize, setCompanyLogoSize,
    footerText, setFooterText,
  } = useContext(AppCtx);

  const [selectedTpl, setSelectedTpl] = useState(pdfTemplate || "classic");
  const [logoSize,    setLogoSize]    = useState(companyLogoSize || 52);
  const [footer,      setFooter]      = useState(footerText || "");
  const [saved,       setSaved]       = useState(false);
  const [saveError,   setSaveError]   = useState("");

  useEffect(() => {
    setSelectedTpl(pdfTemplate || "classic");
    setLogoSize(companyLogoSize || 52);
    setFooter(footerText || "");
  }, [pdfTemplate, companyLogoSize, footerText]);

  const handleSave = () => {
    setSaveError("");
    try {
      setPdfTemplate(selectedTpl);
      setCompanyLogoSize(logoSize);
      setFooterText(footer);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError("Something went wrong. Please try again.");
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target.result;
      if (validateImageDataUrl(result)) {
        setCompanyLogo(result);
      } else {
        setSaveError('Invalid image format. Please upload a PNG, JPEG, or WebP file under 2MB.');
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <Section title="PDF Invoice Templates">
        <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}>
          <Btn onClick={() => navigate(ROUTES.SETTINGS_TEMPLATES)} variant="outline" icon={<Icons.Pen />}>Open dedicated template page</Btn>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:14, marginBottom:16 }}>
          {PDF_TEMPLATES.map(tpl => {
            const sel = selectedTpl === tpl.id;
            return (
              <div key={tpl.id}
                onClick={() => setSelectedTpl(tpl.id)}
                style={{ border:`2px solid ${sel ? "#1e6be0" : "#e8e8ec"}`, borderRadius:12, overflow:"hidden", cursor:"pointer", transition:"all 0.15s", background: sel ? "#eff6ff" : "#fff" }}>
                <div style={{ height:80, background:tpl.defaultBg, borderBottom:`3px solid ${tpl.defaultAccent}`, display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
                  <div style={{ width:60, height:8, background:tpl.defaultAccent, borderRadius:4, opacity:0.8 }} />
                  <div style={{ position:"absolute", bottom:8, left:10, right:10 }}>
                    {[1,2,3].map(i => <div key={i} style={{ height:4, background:tpl.defaultAccent, borderRadius:2, opacity:0.15 + (i * 0.1), marginBottom:3, width:`${80 - i * 15}%` }} />)}
                  </div>
                </div>
                <div style={{ padding:"10px 12px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e" }}>{tpl.name}</div>
                    <div style={{ fontSize:11, color:"#AAA", marginTop:1 }}>{tpl.description}</div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); onPreview(tpl.id); }}
                    title="Preview template"
                    style={{ background:"none", border:"none", cursor:"pointer", color:"#888", padding:4, display:"flex", borderRadius:6, transition:"color 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.color = "#E86C4A"}
                    onMouseLeave={e => e.currentTarget.style.color = "#888"}>
                    <Icons.Eye />
                  </button>
                </div>
                {sel && (
                  <div style={{ padding:"0 12px 10px", display:"flex", alignItems:"center", gap:5 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:"#1e6be0" }} />
                    <span style={{ fontSize:11, color:"#1e6be0", fontWeight:700 }}>Selected</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginTop:6 }}>
          <Field label="Company Logo">
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              {companyLogo && (
                <img src={companyLogo} alt="logo" style={{ maxHeight:40, maxWidth:120, objectFit:"contain", borderRadius:4, border:"1px solid #e8e8ec", boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }} />
              )}
              <label style={{ cursor:"pointer", display:"inline-flex", alignItems:"center", gap:6, padding:"7px 12px", background:"#F5F5F5", border:"1.5px solid #E0E0E0", borderRadius:8, fontSize:12, fontWeight:600, color:"#555", fontFamily:ff }}>
                <Icons.Items /> {companyLogo ? "Change Logo" : "Upload Logo"}
                <input type="file" accept="image/*" style={{ display:"none" }} onChange={handleLogoUpload} />
              </label>
              {companyLogo && (
                <button onClick={() => setCompanyLogo(null)} style={{ background:"none", border:"none", cursor:"pointer", color:"#CCC", padding:4 }}><Icons.X /></button>
              )}
            </div>
          </Field>
          <Field label={`Logo Size: ${logoSize}px`}>
            <input type="range" min={24} max={100} value={logoSize} onChange={e => setLogoSize(Number(e.target.value))}
              style={{ width:"100%", accentColor:"#E86C4A" }} />
          </Field>
        </div>
        <Field label="Invoice Footer Text" style={{ marginTop:14 }}>
          <textarea value={footer} onChange={e => setFooter(e.target.value)} rows={2} placeholder="e.g. Thank you for your business! Registered in England & Wales No. 12345678"
            style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #E0E0E0", borderRadius:8, fontSize:13, fontFamily:ff, outline:"none", resize:"vertical", boxSizing:"border-box" }} />
        </Field>
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
              <Icons.Check /> Template settings saved.
            </div>
          )}
          <Btn onClick={handleSave} variant="primary" icon={<Icons.Save />} style={{ background: saved ? "#059669" : "#1e6be0", color:"#fff" }}>
            Save template settings
          </Btn>
        </div>
      </div>
    </>
  );
}
