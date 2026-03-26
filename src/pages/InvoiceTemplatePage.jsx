import { useContext, useState } from "react";
import { ff, PDF_TEMPLATES } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Btn, Field, Input, Select, Checkbox } from "../components/atoms";
import { A4InvoiceDoc } from "../components/shared";
import { Icons } from "../components/icons";

export default function InvoiceTemplatesPage() {
  const { pdfTemplate, setPdfTemplate, companyLogoSize, setCompanyLogoSize, invoiceTemplateConfig, setInvoiceTemplateConfig } = useContext(AppCtx);

  const initial = invoiceTemplateConfig || {};
  const [accentColor, setAccentColor] = useState(initial.accentColor || "#E86C4A");
  const [logoPosition, setLogoPosition] = useState(initial.logoPosition || "left");
  const [showPoField, setShowPoField] = useState(initial.showPoField !== false);
  const [showNotesField, setShowNotesField] = useState(initial.showNotesField !== false);
  const [customFieldLabel, setCustomFieldLabel] = useState(initial.customFieldLabel || "Project Ref");

  const previewData = {
    docNumber: "INV-0001",
    customer: { name: "Preview Customer", companyName: "Preview Customer Ltd", email: "accounts@example.com" },
    issueDate: new Date().toISOString().slice(0,10),
    dueDate: new Date(Date.now()+14*864e5).toISOString().slice(0,10),
    paymentTerms: "Net 14",
    items: [
      { id:"1", name:"Design Sprint", description:"Discovery and wireframes", quantity:1, rate:1200, tax_rate:20, amount:1200 },
      { id:"2", name:"Development", description:"Frontend implementation", quantity:2, rate:800, tax_rate:20, amount:1600 },
    ],
    subtotal: 2800,
    discountAmount: 0,
    shipping: 0,
    taxBreakdown: [{ rate:20, amount:560 }],
    cisDeduction: 0,
    total: 3360,
    notes: "Live template preview",
    terms: "Payment due within 14 days",
    status: "Draft",
  };


  const saveTemplateSettings = () => {
    setCompanyLogoSize(Number(companyLogoSize || 52));
    setInvoiceTemplateConfig({
      accentColor,
      logoPosition,
      logoSize: Number(companyLogoSize || 52),
      showPoField,
      showNotesField,
      customFieldLabel,
    });
  };

  return (
    <>
    <style>{`
      @media (max-width: 768px) {
        .templates-grid { grid-template-columns: 1fr !important; }
      }
    `}</style>
    <div style={{ padding: "clamp(14px,4vw,28px) clamp(12px,4vw,32px)", maxWidth: 900, fontFamily: ff }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1A1A1A", margin: "0 0 16px" }}>Invoice Templates</h1>

      <div className="templates-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 340px) 1fr', gap: 28, alignItems: 'start' }}>

        {/* LEFT COLUMN — controls */}
        <div>
          <div style={{ background:'#FFFFFF', border:'1px solid #E8E6E0', borderRadius:12, padding:'20px 20px', marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', color:'#9A9A9A', marginBottom:16 }}>Template settings</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:16 }}>
              <div>
                <div style={{ fontSize:12, fontWeight:500, color:'#6B6B6B', marginBottom:8 }}>Template</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {PDF_TEMPLATES.map(t => (
                    <div key={t.id} onClick={() => setPdfTemplate(t.id)} style={{ padding:'10px 14px', borderRadius:8, border: pdfTemplate === t.id ? '1.5px solid #111110' : '1px solid #E8E6E0', background: pdfTemplate === t.id ? '#111110' : '#FAFAF7', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', transition:'all 0.15s' }}>
                      <span style={{ fontSize:13, fontWeight:500, color: pdfTemplate === t.id ? '#FAFAF7' : '#111110' }}>{t.name}</span>
                      {pdfTemplate === t.id && <span style={{ fontSize:10, fontWeight:600, color:'#D97706', letterSpacing:'0.06em' }}>ACTIVE</span>}
                    </div>
                  ))}
                </div>
              </div>
              <Field label="Logo Position">
                <Select value={logoPosition} onChange={setLogoPosition} options={["left","center","right"]} />
              </Field>
              <Field label="Accent Color">
                <div style={{ display:'flex', alignItems:'center', gap:10, background:'#FAFAF7', border:'1px solid #E8E6E0', borderRadius:8, padding:'6px 10px' }}>
                  <input type="color" value={accentColor} onChange={e=>setAccentColor(e.target.value)} style={{ width:32, height:32, border:'none', background:'none', cursor:'pointer', padding:0, borderRadius:4 }} />
                  <Input value={accentColor} onChange={setAccentColor} />
                </div>
              </Field>
              <Field label={`Logo Size: ${companyLogoSize || 52}px`}>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <input type="range" min={24} max={100} value={companyLogoSize || 52} onChange={e=>setCompanyLogoSize(Number(e.target.value))} style={{ width:'100%', accentColor:'#111110', cursor:'pointer' }} />
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#9A9A9A' }}>
                    <span>24px</span><span>100px</span>
                  </div>
                </div>
              </Field>
            </div>
          </div>

          <div style={{ background:'#FFFFFF', border:'1px solid #E8E6E0', borderRadius:12, padding:'20px 20px', marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', color:'#9A9A9A', marginBottom:16 }}>Custom Fields</div>
            <Checkbox checked={showPoField} onChange={setShowPoField} label="Show PO field in invoice metadata" />
            <Checkbox checked={showNotesField} onChange={setShowNotesField} label="Show Notes section in template" />
            <Field label="Extra field label">
              <Input value={customFieldLabel} onChange={setCustomFieldLabel} placeholder="Project Ref" />
            </Field>
          </div>

          <div style={{ display:'flex', justifyContent:'flex-start', paddingTop:4 }}>
            <Btn onClick={saveTemplateSettings} variant="primary" icon={<Icons.Save />}>Save Template Settings</Btn>
          </div>
        </div>

        {/* RIGHT COLUMN — preview */}
        <div style={{ background:'#FFFFFF', border:'1px solid #E8E6E0', borderRadius:12, padding:'20px', position:'sticky', top:24 }}>
          <div style={{ fontSize:11, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', color:'#9A9A9A', marginBottom:16, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            Live Preview
            <span style={{ fontSize:10, fontWeight:500, background:'#F5F4F0', color:'#9A9A9A', border:'1px solid #E8E6E0', borderRadius:4, padding:'2px 8px', letterSpacing:'0.04em' }}>LIVE PREVIEW</span>
          </div>
          <div style={{ background:'#F5F4F0', border:'1px solid #E8E6E0', borderRadius:8, overflow:'auto', padding:'16px 12px', minHeight:400 }}>
            <div style={{ transform:"scale(0.78)", transformOrigin:"top center", marginBottom:"-160px" }}>
              <A4InvoiceDoc data={previewData} currSymbol="£" isVat orgSettings={{ orgName:"Demo Company" }} accentColor={accentColor} template={pdfTemplate} footerText="" templateConfig={{ logoPosition, logoSize:Number(companyLogoSize||52), showNotesField, showPoField, customFieldLabel, accentColor }} />
            </div>
          </div>
        </div>

      </div>
    </div>
    </>
  );
}
