import { useState } from "react";
import { ff } from "../constants";
import { Ic, Icons } from "../components/icons";
import { Field, Input } from "../components/atoms";
import { supabase, supabaseReady } from "../lib/supabase";

// AUTH-002: PBKDF2-SHA256 with random salt — NIST SP 800-132 compliant
// Format stored: "pbkdf2:310000:<saltHex>:<hashHex>"
const PBKDF2_ITERATIONS = 310000;

function bytesToHex(buf) {
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
}
function hexToBytes(hex) {
  return new Uint8Array(hex.match(/.{2}/g).map(h => parseInt(h, 16)));
}

async function hashPassword(password, existingSaltHex = null) {
  const salt = existingSaltHex
    ? hexToBytes(existingSaltHex)
    : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return `pbkdf2:${PBKDF2_ITERATIONS}:${bytesToHex(salt)}:${bytesToHex(new Uint8Array(bits))}`;
}

async function verifyPassword(password, stored) {
  if (stored && stored.startsWith('pbkdf2:')) {
    const [, iterStr, saltHex, expectedHash] = stored.split(':');
    const salt = hexToBytes(saltHex);
    const keyMaterial = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: Number(iterStr), hash: 'SHA-256' },
      keyMaterial, 256
    );
    return bytesToHex(new Uint8Array(bits)) === expectedHash;
  }
  // AUTH-002: Legacy SHA-256 fallback — will be upgraded on successful login
  if (stored && /^[0-9a-f]{64}$/.test(stored)) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
    return bytesToHex(new Uint8Array(buf)) === stored;
  }
  return false;
}

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

  // AUTH-002: Migrate plaintext passwords (no hash prefix) to PBKDF2 on mount
  // SHA-256 hashes (64-char hex) are left as-is and upgraded on next successful login
  const migratePasswords = async () => {
    const users = getUsers();
    const isPbkdf2 = (pw) => pw && pw.startsWith('pbkdf2:');
    const isSha256 = (pw) => pw && /^[0-9a-f]{64}$/.test(pw);
    const isPlaintext = (pw) => pw && !isPbkdf2(pw) && !isSha256(pw);
    const needsMigration = users.some(u => isPlaintext(u.password));
    if (!needsMigration) return;
    const migrated = await Promise.all(users.map(async u => {
      if (isPlaintext(u.password)) {
        return { ...u, password: await hashPassword(u.password) };
      }
      return u;
    }));
    saveUsers(migrated);
  };

  // Run migration once on component mount
  useState(() => { migratePasswords(); });

  const saveProfileToSupabase = async (email, name) => {
    if (!supabaseReady || !supabase) return;
    try {
      await supabase.from("profiles").upsert({ email, name }, { onConflict: "email" });
    } catch {}
  };

  const fetchNameFromSupabase = async (email) => {
    if (!supabaseReady || !supabase) return null;
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

    // AUTH-008: Check lockout before attempting
    if(checkLockout(email)) {
      setError("Too many failed attempts. Try again in 15 minutes.");
      return;
    }

    setLoading(true);
    setTimeout(async () => {
      const users = getUsers();
      if(mode==="register") {
        if(!name.trim()) { setError("Full name is required."); setLoading(false); return; }
        if(password !== confirmPw) { setError("Passwords do not match."); setLoading(false); return; }
        if(users.find(u=>u.email===email)) { setError("An account with this email already exists."); setLoading(false); return; }
        // AUTH-002: Hash new passwords with PBKDF2 (not SHA-256)
        const pwHash = await hashPassword(password);
        const newUser = { name: name.trim(), email, password: pwHash, role:"Admin", createdAt: new Date().toISOString() };
        saveUsers([...users, newUser]);
        await saveProfileToSupabase(email, name.trim());
        onAuth({ name: newUser.name, email: newUser.email, role:"Admin" });
      } else {
        const found = users.find(u => u.email === email);
        if(!found || !(await verifyPassword(password, found.password))) {
          // AUTH-008: Record failure for lockout tracking
          recordFailure(email);
          setError("Incorrect email or password."); setLoading(false); return;
        }
        // AUTH-002: Upgrade SHA-256 hash to PBKDF2 on successful login
        if(found.password && !found.password.startsWith('pbkdf2:')) {
          const upgraded = await hashPassword(password);
          saveUsers(users.map(u => u.email === email ? { ...u, password: upgraded } : u));
        }
        clearAttempts(email);
        const sbName = await fetchNameFromSupabase(email);
        // AUTH-003: Add session expiry (8 hours from now)
        onAuth({
          name: sbName || found.name,
          email: found.email,
          role: found.role || "Admin",
          expiresAt: Date.now() + 8 * 60 * 60 * 1000,
        });
      }
      setLoading(false);
    }, 600);
  };

    const eyeIcon = showPw ? <Icons.EyeSlash /> : <Icons.Eye />;

  return (
     <div className="auth-page-bg" style={{ minHeight:"100vh", background:"linear-gradient(135deg, #e8f0fe 0%, #f0f7ff 50%, #e8f4fd 100%)", display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:ff }}>
      {!supabaseReady && (
        <div style={{ position:"fixed", top:0, left:0, right:0, background:"#fef3c7", borderBottom:"1px solid #f59e0b", padding:"8px 16px", display:"flex", alignItems:"center", gap:8, zIndex:999, fontSize:12, color:"#92400e" }}>
          <span>⚠️</span>
          <span><strong>Supabase not configured</strong> — accounts are saved locally only. Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in your environment.</span>
        </div>
      )}
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
