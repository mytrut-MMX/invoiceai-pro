import { useState, useEffect } from "react";
import { ff } from "../constants";
import { Ic, Icons } from "../components/icons";
import { Field, Input } from "../components/atoms";
import { supabase, supabaseReady, signInWithGoogle, getSession, supabaseConfigError } from "../lib/supabase";
import ForgotPasswordPage from "./ForgotPasswordPage";

// AUTH-008: In-memory brute-force lockout (per email, 5 attempts → 15 min lockout)
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

function checkLockout(email) {
  const entry = loginAttempts.get(email);
  if (!entry) return false;
  if (Date.now() > entry.until) { loginAttempts.delete(email); return false; }
  return entry.count >= MAX_ATTEMPTS;
}
function recordFailure(email) {
  const entry = loginAttempts.get(email) || { count: 0, until: Date.now() + LOCKOUT_MS };
  entry.count += 1;
  entry.until = Date.now() + LOCKOUT_MS;
  loginAttempts.set(email, entry);
}
function clearAttempts(email) { loginAttempts.delete(email); }

export default function AuthPage({ onAuth }) {
  const [mode, setMode] = useState(() => window.location.pathname === "/signup" ? "register" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  // Check for an existing Supabase OAuth session on mount (e.g. after redirect back)
  useEffect(() => {
    getSession().then(session => {
      if (session?.user) {
        onAuth({
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.email,
          email: session.user.email,
          role: "Admin",
          expiresAt: Date.now() + 8 * 60 * 60 * 1000,
          provider: session.user.app_metadata?.provider || "email",
        });
      }
    });
  }, []);

  // Yahoo OAuth is not supported by Supabase Auth natively.
  // Users with Yahoo email addresses can register/login with email + password.

  const oauthErrorMessage = (provider, error) => {
    const msg = typeof error === "string" ? error : (error?.message || "");
    if (msg.toLowerCase().includes("forbidden use of secret api key in browser")) {
      return "Auth is misconfigured: browser is using a secret Supabase key. Replace it with VITE_SUPABASE_ANON_KEY.";
    }
    if (msg.toLowerCase().includes("provider is not enabled") || error?.code === 400) {
      return `${provider} sign-in is not enabled yet. Please use email and password, or contact support.`;
    }
    return msg || `${provider} sign-in failed. Please try again.`;
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) { setError(oauthErrorMessage("Google", error)); setLoading(false); }
    // on success: browser redirects to OAuth provider, then back to /auth/callback
  };

  const saveProfileToSupabase = async ({ userId, email, name }) => {
    if (!supabaseReady || !supabase) return;
    if (!userId) return;
    try {
      await supabase
        .from("profiles")
        .upsert({ user_id: userId, email, name }, { onConflict: "user_id" });
    } catch {}
  };

  const fetchNameFromSupabase = async (userId) => {
    if (!supabaseReady || !supabase) return null;
    if (!userId) return null;
    try {
      const { data } = await supabase.from("profiles").select("name").eq("user_id", userId).single();
      return data?.name || null;
    } catch { return null; }
  };

  const handleSubmit = () => {
    setError("");
    const normalizedEmail = email.trim().toLowerCase();
    if(!normalizedEmail || !password) { setError("Email and password are required."); return; }
    if(!/\S+@\S+\.\S+/.test(normalizedEmail)) { setError("Please enter a valid email address."); return; }
    if(password.length < 8) { setError("Password must be at least 8 characters."); return; }

    // AUTH-008: Check lockout before attempting
    if(checkLockout(normalizedEmail)) {
      setError("Too many failed attempts. Try again in 15 minutes.");
      return;
    }

    setLoading(true);
    setTimeout(async () => {
      if(mode==="register") {
        if(!name.trim()) { setError("Full name is required."); setLoading(false); return; }
        if(password !== confirmPw) { setError("Passwords do not match."); setLoading(false); return; }
        
        if (supabaseReady && supabase) {
          const { data, error } = await supabase.auth.signUp({
            email: normalizedEmail,
            password,
            options: { data: { full_name: name.trim() } },
          });
          if (error) {
            setError(oauthErrorMessage("Email", error));
            setLoading(false);
            return;
          }
          await saveProfileToSupabase({
            userId: data?.user?.id,
            email: normalizedEmail,
            name: name.trim(),
          });
          if (data?.user && data?.session) {
            clearAttempts(normalizedEmail);
            onAuth({
              id: data.user.id,
              name: data.user.user_metadata?.full_name || name.trim(),
              email: data.user.email,
              role: "Admin",
              expiresAt: Date.now() + 8 * 60 * 60 * 1000,
              provider: data.user.app_metadata?.provider || "email",
            });
          } else {
            setError("Account created. Please confirm your email, then sign in.");
          }
          setLoading(false);
          return;
        }

        setError("Supabase authentication is required. Configure Supabase to sign in.");
        setLoading(false);
        return;
      } else {
        if (supabaseReady && supabase) {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });
          if (error || !data?.user) {
            recordFailure(normalizedEmail);
            setError(oauthErrorMessage("Email", error || "Incorrect email or password."));
            setLoading(false);
            return;
          }
          clearAttempts(normalizedEmail);
          const sbName = await fetchNameFromSupabase(data.user.id);
          onAuth({
            id: data.user.id,
            name: sbName || data.user.user_metadata?.full_name || data.user.email,
            email: data.user.email,
            role: "Admin",
            expiresAt: Date.now() + 8 * 60 * 60 * 1000,
            provider: data.user.app_metadata?.provider || "email",
          });
          setLoading(false);
          return;
        }

        setError("Supabase authentication is required. Configure Supabase to sign in.");
        setLoading(false);
        return;
      }
      setLoading(false);
    }, 600);
  };

    const eyeIcon = showPw ? <Icons.EyeSlash /> : <Icons.Eye />;
  
  if (showForgot) {
    return (
      <ForgotPasswordPage
        onBackToLogin={() => {
          setShowForgot(false);
          setError("");
          setPassword("");
        }}
      />
    );
  }

  return (
     <div className="auth-page-bg" style={{ minHeight:'100vh', background:'#FAFAF7', display:'flex', alignItems:'center', justifyContent:'center', padding:24, fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <style>{`.auth-submit:hover:not(:disabled) { background: #333330 !important; }`}</style>
      {!supabaseReady && (
        <div style={{ position:"fixed", top:0, left:0, right:0, background:"#FEF3C7", borderBottom:"1px solid #D97706", padding:"8px 16px", display:"flex", alignItems:"center", gap:8, zIndex:999, fontSize:12, color:"#92400e" }}>
          <span>⚠️</span>
          <span><strong>Supabase not configured</strong> — {supabaseConfigError || "cloud authentication is required. Set"} {!supabaseConfigError && <><code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in your environment.</>}</span>
        </div>
      )}
      <div style={{ width:"100%", maxWidth:460 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ margin:"0 auto 16px", display:"flex", justifyContent:"center" }}>
            <img src="/Invoicesaga-logo.svg" alt="InvoiceSaga" height={36} style={{ objectFit:"contain" }} onError={e => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }} />
            <span style={{ display:'none', fontSize:20, fontWeight:700, color:'#111110', letterSpacing:-0.5, fontFamily:'Georgia, serif' }}>
              Invoice<span style={{ color:'#D97706' }}>Saga</span>
            </span>
          </div>
          <h1 style={{ fontSize:24, fontWeight:400, fontFamily:'Georgia, serif', color:'#111110', lineHeight:1.25, margin:'0 0 6px', letterSpacing:-0.3 }}>
            Your invoicing is about to get a <span>whole lot easier</span>
          </h1>
        </div>

        <div style={{ background:'#FFFFFF', borderRadius:12, border:'1px solid #E8E6E0', boxShadow:'0 2px 24px rgba(0,0,0,0.06)', padding:'32px 32px 28px' }}>
          <div style={{ display:"flex", gap:0, borderBottom:"1px solid #E8E6E0", marginBottom:24 }}>
            {[["login","Sign In"],["register","Create Account"]].map(([m,l])=>(
              <button key={m} onClick={()=>{ setMode(m); setError(""); }}
                style={{ border:"none", borderBottom:`2px solid ${mode===m?"#111110":"transparent"}`, background:"none", color:mode===m?"#111110":"#9A9A9A", fontSize:14, padding:"10px 0", marginRight:20, fontWeight:mode===m?600:400, cursor:"pointer", fontFamily:ff, transition:"all 0.15s" }}>
                {l}
              </button>
            ))}
          </div>

          {/* OAuth social buttons */}
          <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
            <button onClick={handleGoogleSignIn} disabled={loading} style={{ width:"100%", height:44, display:"flex", alignItems:"center", justifyContent:"center", gap:10, background:"#FFFFFF", color:"#374151", border:"1px solid #E8E6E0", borderRadius:8, fontSize:14, fontWeight:500, cursor:loading?"not-allowed":"pointer", fontFamily:ff }}>
              {/* Google G logo */}
              <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path fill="#EA4335" d="M24 9.5c3.14 0 5.95 1.08 8.17 2.85l6.1-6.1C34.46 3.01 29.5 1 24 1 14.82 1 7.03 6.49 3.6 14.24l7.1 5.52C12.4 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#FBBC05" d="M46.52 24.5c0-1.64-.15-3.22-.42-4.74H24v8.97h12.67c-.55 2.94-2.2 5.43-4.67 7.1l7.1 5.52C43.13 37.5 46.52 31.44 46.52 24.5z"/>
                <path fill="#34A853" d="M10.7 28.24A14.48 14.48 0 0 1 9.5 24c0-1.48.25-2.9.7-4.24l-7.1-5.52A23.94 23.94 0 0 0 0 24c0 3.87.93 7.53 2.58 10.76l7.12-6.52z" transform="translate(1)"/>
                <path fill="#4285F4" d="M24 47c5.5 0 10.12-1.82 13.5-4.96l-7.1-5.52C28.54 37.9 26.37 38.5 24 38.5c-6.26 0-11.6-4.22-13.3-9.96l-7.12 5.52C7.03 41.51 14.82 47 24 47z"/>
              </svg>
              Continue with Google
            </button>
          </div>

          {/* Divider */}
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
            <div style={{ flex:1, height:1, background:"#E8E6E0" }} />
            <span style={{ fontSize:12, color:"#9A9A9A", whiteSpace:"nowrap" }}>or continue with email</span>
            <div style={{ flex:1, height:1, background:"#E8E6E0" }} />
          </div>

        {mode==="register" && (
            <Field label="Full Name" required>
              <div style={{ position:"relative", marginBottom:12 }}>
                <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#9A9A9A', display:'flex' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </span>
                <Input value={name} onChange={setName} placeholder="e.g. Alex Morgan" style={{ paddingLeft:36 }} />
              </div>
            </Field>
          )}
          <Field label="Email Address" required>
            <div style={{ position:"relative", marginBottom:12 }}>
              <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#9A9A9A', display:'flex' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              </span>
              <Input value={email} onChange={setEmail} type="email" placeholder="you@example.com" style={{ paddingLeft:36 }} />
            </div>
          </Field>
        <Field label="Password" required>
            <div style={{ position:"relative", marginBottom:12 }}>
              <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#9A9A9A', display:'flex', zIndex:1 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </span>
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
                <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#9A9A9A', display:'flex', zIndex:1 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </span>
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

            <button onClick={handleSubmit} disabled={loading} className="auth-submit"
           style={{ width:'100%', padding:0, lineHeight:'48px', height:48, background:loading?'#E8E6E0':'#111110', color:loading?'#9A9A9A':'#FAFAF7', border:'none', borderRadius:8, fontSize:15, fontWeight:500, cursor:loading?"not-allowed":"pointer", fontFamily:ff, marginTop:4, transition:"background 0.15s" }}>
          {loading ? "Please wait…" : mode==="login" ? "Sign In" : "Create Account"}
        </button>

            {mode==="login" && (
          <div style={{ textAlign:"center", marginTop:16, display:"flex", flexDirection:"column", gap:10 }}>
            <div>
              <span style={{ color:"#848484", fontSize:14 }}>Don't have an account? </span>
              <button onClick={()=>{ setMode("register"); setError(""); }}
                style={{ color:"#D97706", fontWeight:600, background:"none", border:"none", cursor:"pointer", fontFamily:ff, fontSize:14 }}>
                Create one free
              </button>
            </div>
            <button
              onClick={() => setShowForgot(true)}
              style={{ color:"#9A9A9A", fontSize:13, background:"none", border:"none", cursor:"pointer", fontFamily:ff, lineHeight:1.4 }}
            >
              Forgot your password?
            </button>
          </div>
          )}

        <div style={{ marginTop:32, color:"#9A9A9A", fontSize:12, textAlign:"center" }}>
          Your data stays private · InvoiceSaga
            </div>
          </div>
        </div>
      </div>
  );
}
