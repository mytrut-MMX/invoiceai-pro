import { useState } from "react";
import { ff } from "../constants";
import { Ic, Icons } from "../components/icons";
import { Field, Input } from "../components/atoms";
import { supabase } from "../lib/supabase";

async function hashPassword(pw) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

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
  const getUsers = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  const saveUsers = (users) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(users) ? users : []));
    } catch {}
  };

  const saveProfileToSupabase = async (email, name) => {
    try {
      await supabase.from("profiles").upsert({ email, name }, { onConflict: "email" });
    } catch {}
  };

  const fetchNameFromSupabase = async (email) => {
    try {
      const { data } = await supabase.from("profiles").select("name").eq("email", email).single();
      return data?.name || null;
    } catch { return null; }
  };

  const handleSubmit = () => {
    setError("");
    if(!email || !password) { setError("Email and password are required."); return; }
    if(!/\S+@\S+\.\S+/.test(email)) { setError("Please enter a valid email address."); return; }
    if(password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    setTimeout(async () => {
      const users = getUsers();
      const pwHash = await hashPassword(password);
      if(mode==="register") {
        if(!name.trim()) { setError("Full name is required."); setLoading(false); return; }
        if(password !== confirmPw) { setError("Passwords do not match."); setLoading(false); return; }
        if(users.find(u=>u.email===email)) { setError("An account with this email already exists."); setLoading(false); return; }
        const newUser = { name: name.trim(), email, password: pwHash, role:"Admin", createdAt: new Date().toISOString() };
        saveUsers([...users, newUser]);
        await saveProfileToSupabase(email, name.trim());
        onAuth({ name: newUser.name, email: newUser.email, role:"Admin" });
      } else {
        // Accept both SHA-256 hash (new) and plaintext (legacy migration)
        const found = users.find(u => u.email === email && (u.password === pwHash || u.password === password));
        if(!found) { setError("Incorrect email or password."); setLoading(false); return; }
        // Migrate plaintext password to hash on first login
        if(found.password === password) {
          saveUsers(users.map(u => u.email === email ? { ...u, password: pwHash } : u));
        }
        const sbName = await fetchNameFromSupabase(email);
        onAuth({ name: sbName || found.name, email: found.email, role: found.role||"Admin" });
      }
      setLoading(false);
    }, 600);
  };

    const eyeIcon = showPw ? <Icons.EyeSlash /> : <Icons.Eye />;

  return (
     <div className="auth-page-bg" style={{ minHeight:"100vh", background:"linear-gradient(135deg, #e8f0fe 0%, #f0f7ff 50%, #e8f4fd 100%)", display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:ff }}>
      <div style={{ width:"100%", maxWidth:460 }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ margin:"0 auto 16px", display:"flex", justifyContent:"center" }}>
            <img src="/Invoicesaga-logo.svg" alt="InvoiceSaga" height={36} style={{ objectFit:"contain" }} />
          </div>
          <h1 style={{ fontSize:29, fontWeight:300, color:"#1a1a2e", lineHeight:1.3, margin:"0 0 6px", letterSpacing:"-0.01em" }}>
            Your invoicing is about to get a <span style={{ color:"#1e6be0", fontWeight:600 }}>whole lot easier</span>
          </h1>
        </div>

        <div style={{ background:"rgba(255,255,255,0.85)", borderRadius:10, boxShadow:"0 4px 24px rgba(0,0,0,0.08)", backdropFilter:"blur(8px)", padding:"28px 28px 24px" }}>
          <div style={{ display:"flex", gap:0, borderBottom:"1px solid #e8e8ec", marginBottom:24 }}>
            {[["login","Sign In"],["register","Create Account"]].map(([m,l])=>(
              <button key={m} onClick={()=>{ setMode(m); setError(""); }}
                style={{ border:"none", borderBottom:`2px solid ${mode===m?"#1e6be0":"transparent"}`, background:"none", color:mode===m?"#1e6be0":"#6b7280", fontSize:14, padding:"10px 0", marginRight:20, fontWeight:mode===m?600:400, cursor:"pointer", fontFamily:ff, transition:"all 0.15s" }}>
                {l}
              </button>
            ))}
          </div>

        {mode==="register" && (
            <Field label="Full Name" required>
              <div style={{ position:"relative", marginBottom:12 }}>
                <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:15, color:"#9ca3af" }}>🏢</span>
                <Input value={name} onChange={setName} placeholder="e.g. Alex Morgan" style={{ paddingLeft:36 }} />
              </div>
            </Field>
          )}
          <Field label="Email Address" required>
            <div style={{ position:"relative", marginBottom:12 }}>
              <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:15, color:"#9ca3af" }}>✉</span>
              <Input value={email} onChange={setEmail} type="email" placeholder="you@example.com" style={{ paddingLeft:36 }} />
            </div>
          </Field>
        <Field label="Password" required>
            <div style={{ position:"relative", marginBottom:12 }}>
              <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:15, color:"#9ca3af", zIndex:1 }}>🔒</span>
              <input type={showPw?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
                placeholder={mode==="register"?"Min. 8 characters":"Enter your password"}
                style={{ width:"100%", padding:"9px 38px 9px 36px", border:"1.5px solid #E0E0E0", borderRadius:6, fontSize:15, fontFamily:ff, outline:"none", boxSizing:"border-box" }} />
              <button onClick={()=>setShowPw(p=>!p)} style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#AAA", padding:2, display:"flex" }}>
                {eyeIcon}
              </button>
            </div>
          </Field>
          {mode==="register" && (
            <Field label="Confirm Password" required>
              <div style={{ position:"relative", marginBottom:12 }}>
                <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:15, color:"#9ca3af", zIndex:1 }}>🔒</span>
                <input type={showPw?"text":"password"} value={confirmPw} onChange={e=>setConfirmPw(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
                  placeholder="Repeat password"
                  style={{ width:"100%", padding:"9px 10px 9px 36px", border:`1.5px solid ${confirmPw&&confirmPw!==password?"#DC2626":"#E0E0E0"}`, borderRadius:6, fontSize:15, fontFamily:ff, outline:"none", boxSizing:"border-box" }} />
              </div>
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
           style={{ width:"100%", padding:0, lineHeight:"48px", height:48, background:loading?"#d1d5db":"#106cd9", color:"#fff", border:"none", borderRadius:5, fontSize:15, fontWeight:600, cursor:loading?"not-allowed":"pointer", fontFamily:ff, marginTop:4, transition:"background 0.15s" }}
          onMouseEnter={e=>{ if(!loading) e.currentTarget.style.background="#006dee"; }}
          onMouseLeave={e=>{ if(!loading) e.currentTarget.style.background="#106cd9"; }}>
          {loading ? "Please wait…" : mode==="login" ? "Sign In" : "Create Account"}
        </button>

            {mode==="login" && (
          <div style={{ textAlign:"center", marginTop:16 }}>
            <span style={{ color:"#848484", fontSize:14 }}>Don't have an account? </span>
            <button onClick={()=>{ setMode("register"); setError(""); }}
              style={{ color:"#298ff6", fontWeight:600, background:"none", border:"none", cursor:"pointer", fontFamily:ff, fontSize:14 }}>
              Create one free
            </button>
           </div>
          )}

        <div style={{ marginTop:32, color:"#9ca3af", fontSize:12, textAlign:"center" }}>
          Your data stays private · InvoiceSaga
            </div>
          </div>
        </div>
      </div>
  );
}
