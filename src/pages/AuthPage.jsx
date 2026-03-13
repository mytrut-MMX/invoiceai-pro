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
    <div style={{ minHeight:"100vh", background:"#F7F7F5", display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:ff }}>
      <div style={{ width:"100%", maxWidth:440 }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ width:48, height:48, background:"#1A1A1A", borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>
            <div style={{ width:28, height:28, background:"#E86C4A", borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center" }}><Icons.Invoices /></div>
          </div>
          <div style={{ fontSize:20, fontWeight:800, color:"#1A1A1A", letterSpacing:"0.02em" }}>InvoicePilot</div>
          <div style={{ fontSize:13, color:"#AAA", marginTop:3 }}>Smart invoicing for modern businesses</div>
        </div>

        <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 4px 40px rgba(0,0,0,0.08)", overflow:"hidden" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", borderBottom:"1px solid #F0F0F0" }}>
            {[["login","Sign In"],["register","Create Account"]].map(([m,l])=>(
              <button key={m} onClick={()=>{ setMode(m); setError(""); }}
                style={{ padding:"20px 0", border:"none", borderBottom:`2.5px solid ${mode===m?"#1A1A1A":"transparent"}`, background:"none", fontSize:13, fontWeight:mode===m?800:500, color:mode===m?"#1A1A1A":"#AAA", cursor:"pointer", fontFamily:ff, transition:"all 0.15s" }}>
                {l}
              </button>
            ))}
          </div>

          <div style={{ padding:"30px 30px 34px" }}>
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
              style={{ width:"100%", padding:"12px 0", background:loading?"#CCC":"#1A1A1A", color:"#fff", border:"none", borderRadius:7, fontSize:14, fontWeight:700, cursor:loading?"not-allowed":"pointer", fontFamily:ff, marginTop:4, transition:"background 0.18s" }}
              onMouseEnter={e=>{ if(!loading) e.currentTarget.style.background="#E86C4A"; }}
              onMouseLeave={e=>{ if(!loading) e.currentTarget.style.background="#1A1A1A"; }}>
              {loading ? "Please wait…" : mode==="login" ? "Sign In →" : "Create Account →"}
            </button>

            {mode==="login" && (
              <div style={{ textAlign:"center", marginTop:14 }}>
                <span style={{ fontSize:12, color:"#AAA" }}>Don't have an account? </span>
                <button onClick={()=>{ setMode("register"); setError(""); }} style={{ fontSize:12, fontWeight:700, color:"#E86C4A", background:"none", border:"none", cursor:"pointer", fontFamily:ff, padding:0 }}>
                  Create one free
                </button>
              </div>
            )}
          </div>
        </div>
        <div style={{ textAlign:"center", marginTop:18, fontSize:11, color:"#CCC" }}>
          Your data stays private and secure · InvoicePilot
        </div>
      </div>
    </div>
  );
}
