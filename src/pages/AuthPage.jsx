import { useState } from "react";
import { ff } from "../constants";
import { Ic, Icons } from "../components/icons";
import { Field, Input } from "../components/atoms";

export default function AuthPage({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const STORAGE_KEY = "ai_invoice_users";
  const getUsers = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]"); } catch { return []; } };
  const saveUsers = users => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(users)); } catch {} };

  const handleSubmit = () => {
    setError("");
    if(!email || !password) { setError("Email and password are required."); return; }
    if(!/\S+@\S+\.\S+/.test(email)) { setError("Please enter a valid email address."); return; }
    if(password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    setTimeout(() => {
      const users = getUsers();
      if(mode==="register") {
        if(!name.trim()) { setError("Full name is required."); setLoading(false); return; }
        if(password !== confirmPw) { setError("Passwords do not match."); setLoading(false); return; }
        if(users.find(u=>u.email===email)) { setError("An account with this email already exists."); setLoading(false); return; }
        const newUser = { name: name.trim(), email, password, role:"Admin", createdAt: new Date().toISOString() };
        saveUsers([...users, newUser]);
        onAuth({ name: newUser.name, email: newUser.email, role:"Admin" });
      } else {
        const found = users.find(u=>u.email===email && u.password===password);
        if(!found) { setError("Incorrect email or password."); setLoading(false); return; }
        onAuth({ name: found.name, email: found.email, role: found.role||"Admin" });
      }
      setLoading(false);
    }, 600);
  };

  const eyeIcon = showPw
    ? <Ic d='<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22"/><circle cx="12" cy="12" r="3"/>' size={16} sw={2}/>
    : <Ic d='<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>' size={16} sw={2}/>;

  return (
    <div style={{ minHeight:"100vh", background:"#fff", display:"flex", alignItems:"stretch", fontFamily:ff }}>
      <div className="auth-left-panel" style={{ flex:"0 0 480px", display:"flex", flexDirection:"column", justifyContent:"center", padding:"48px 56px", borderRight:"1px solid #e8e8ec" }}>
        <div style={{ marginBottom:36 }}>
          <img src="/Invoicesaga-logo.svg" alt="InvoiceSaga" height={32} />
        </div>

        <div style={{ marginBottom:28 }}>
          <h1 style={{ fontSize:22, fontWeight:700, color:"#1a1a2e", margin:"0 0 6px" }}>
            {mode==="login" ? "Welcome back" : "Create your account"}
          </h1>
          <p style={{ fontSize:13, color:"#6b7280", margin:0 }}>
            {mode==="login"
              ? "Sign in to your InvoiceSaga account"
              : "Free forever. No credit card required."}
          </p>
        </div>

        <div style={{ display:"flex", gap:0, borderBottom:"1px solid #e8e8ec", marginBottom:24 }}>
          {[["login","Sign In"],["register","Create Account"]].map(([m,l])=>(
            <button key={m} onClick={()=>{ setMode(m); setError(""); }}
              style={{ padding:"8px 0", marginRight:24, border:"none", borderBottom:`2px solid ${mode===m?"#1e6be0":"transparent"}`, background:"none", fontSize:13, fontWeight:mode===m?600:400, color:mode===m?"#1e6be0":"#6b7280", cursor:"pointer", fontFamily:ff, transition:"all 0.15s" }}>
              {l}
            </button>
          ))}
        </div>

        {mode==="register" && (
          <Field label="Full Name" required>
            <Input value={name} onChange={setName} placeholder="e.g. Alex Morgan" />
          </Field>
        )}
        <Field label="Email Address" required>
          <Input value={email} onChange={setEmail} type="email" placeholder="you@example.com" />
        </Field>
        <Field label="Password" required>
          <div style={{ position:"relative" }}>
            <input type={showPw?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
              placeholder={mode==="register"?"Min. 8 characters":"Enter your password"}
              style={{ width:"100%", padding:"9px 38px 9px 10px", border:"1.5px solid #E0E0E0", borderRadius:6, fontSize:13, fontFamily:ff, outline:"none", boxSizing:"border-box" }} />
            <button onClick={()=>setShowPw(p=>!p)} style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#AAA", padding:2, display:"flex" }}>
              {eyeIcon}
            </button>
          </div>
        </Field>
        {mode==="register" && (
          <Field label="Confirm Password" required>
            <input type={showPw?"text":"password"} value={confirmPw} onChange={e=>setConfirmPw(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
              placeholder="Repeat password"
              style={{ width:"100%", padding:"9px 10px", border:`1.5px solid ${confirmPw&&confirmPw!==password?"#DC2626":"#E0E0E0"}`, borderRadius:6, fontSize:13, fontFamily:ff, outline:"none", boxSizing:"border-box" }} />
          </Field>
        )}

          {error && (
          <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:8, padding:"9px 12px", marginBottom:12, display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ color:"#DC2626", fontSize:12 }}><Icons.Info /></span>
            <span style={{ color:"#DC2626", fontSize:12, fontWeight:500 }}>{error}</span>
          </div>
        )}

            {mode==="register" && (
          <div style={{ background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:6, padding:"9px 12px", marginBottom:12 }}>
            <div style={{ fontSize:11, color:"#16A34A", fontWeight:600, marginBottom:4 }}>Password requirements:</div>
            {[["At least 8 characters", password.length>=8],["Passwords match", password===confirmPw&&confirmPw.length>0]].map(([t,ok])=>(
              <div key={t} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:ok?"#16A34A":"#AAA" }}>
                <span>{ok?"✓":"○"}</span>{t}
              </div>
            ))}
          </div>
        )}

            <button onClick={handleSubmit} disabled={loading}
          style={{ width:"100%", padding:"11px 0", background:loading?"#d1d5db":"#1e6be0", color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:600, cursor:loading?"not-allowed":"pointer", fontFamily:ff, marginTop:4, transition:"background 0.15s" }}
          onMouseEnter={e=>{ if(!loading) e.currentTarget.style.background="#1558c0"; }}
          onMouseLeave={e=>{ if(!loading) e.currentTarget.style.background="#1e6be0"; }}>
          {loading ? "Please wait…" : mode==="login" ? "Sign In" : "Create Account"}
        </button>

            {mode==="login" && (
          <div style={{ textAlign:"center", marginTop:16 }}>
            <span style={{ fontSize:13, color:"#6b7280" }}>Don't have an account? </span>
            <button onClick={()=>{ setMode("register"); setError(""); }}
              style={{ fontSize:13, fontWeight:600, color:"#1e6be0", background:"none", border:"none", cursor:"pointer", fontFamily:ff }}>
              Create one free
            </button>
           </div>
          )}

        <div style={{ marginTop:32, fontSize:11, color:"#9ca3af", textAlign:"center" }}>
          Your data stays private · InvoiceSaga
          </div> 
       </div>

      <div className="auth-right-panel" style={{ flex:1, background:"#f0f7ff", display:"flex", flexDirection:"column", justifyContent:"center", padding:"48px 56px" }}>
        <div style={{ maxWidth:400 }}>
          <h2 style={{ fontSize:24, fontWeight:700, color:"#1a1a2e", margin:"0 0 8px", lineHeight:1.3 }}>
            Smart invoicing for modern businesses
          </h2>
          <p style={{ fontSize:14, color:"#6b7280", margin:"0 0 36px", lineHeight:1.7 }}>
            Create professional invoices, track payments,
            and manage clients — all in one place.
          </p>

          {[
            { icon:"🧾", title:"Professional Invoices", sub:"Create and send in seconds" },
            { icon:"💳", title:"Payment Tracking", sub:"Know exactly who owes you" },
            { icon:"👥", title:"Client Management", sub:"All your customers in one place" },
            { icon:"📊", title:"Reports & Analytics", sub:"VAT, CIS, P&L at a glance" },
          ].map(item=>(
            <div key={item.title} style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20 }}>
              <div style={{ width:40, height:40, borderRadius:10, background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0, boxShadow:"0 1px 4px rgba(0,0,0,0.08)" }}>
                {item.icon}
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:"#1a1a2e" }}>{item.title}</div>
                <div style={{ fontSize:12, color:"#6b7280" }}>{item.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
