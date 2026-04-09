import { useState, useContext } from "react";
import { ff } from "../../constants";
import { AppCtx } from "../../context/AppContext";
import { Icons } from "../../components/icons";
import { Btn } from "../../components/atoms";

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

export default function SettingsPayments() {
  const { customPayMethods, setCustomPayMethods } = useContext(AppCtx);
  const [newMethod, setNewMethod] = useState("");

  const addPayMethod = () => {
    const m = newMethod.trim();
    if (m && !customPayMethods.includes(m)) {
      setCustomPayMethods(p => [...p, m]);
      setNewMethod("");
    }
  };

  const removePayMethod = (m) => setCustomPayMethods(p => p.filter(x => x !== m));

  return (
    <Section title="Custom Payment Methods">
      <p style={{ margin:"0 0 12px", fontSize:13, color:"#888" }}>Add extra payment methods beyond the built-in options.</p>
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:12 }}>
        {customPayMethods.map(m => (
          <div key={m} style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 10px", background:"#f3f4f6", border:"1px solid #e8e8ec", borderRadius:20, fontSize:12, fontWeight:600, color:"#444" }}>
            {m}
            <button onClick={() => removePayMethod(m)} style={{ background:"none", border:"none", cursor:"pointer", color:"#CCC", padding:0, display:"flex" }}><Icons.X /></button>
          </div>
        ))}
        {customPayMethods.length === 0 && <span style={{ fontSize:13, color:"#CCC" }}>No custom methods added yet.</span>}
      </div>
      <div style={{ display:"flex", gap:8, maxWidth:340 }}>
        <input value={newMethod} onChange={e => setNewMethod(e.target.value)} onKeyDown={e => e.key === "Enter" && addPayMethod()} placeholder="e.g. Wise, Revolut…"
          style={{ flex:1, padding:"9px 11px", border:"1.5px solid #E0E0E0", borderRadius:7, fontSize:13, fontFamily:ff, outline:"none", boxSizing:"border-box" }} />
        <Btn onClick={addPayMethod} variant="outline" icon={<Icons.Plus />}>Add</Btn>
      </div>
    </Section>
  );
}
