import { useState } from "react";
import { ff } from "../constants";
import OrgSetupPage from "./OrgSetupPage";
import { seedAccountsForUser } from "../utils/ledger/defaultAccounts";
import { supabase } from "../lib/supabase";

// ─── helpers ──────────────────────────────────────────────────────────────────
const genId = () => crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();
const today = () => new Date().toISOString().slice(0, 10);
const due30 = () => new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);

// ─── Confetti ─────────────────────────────────────────────────────────────────
function Confetti() {
  const pieces = Array.from({ length: 32 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 1.2,
    color: ["#111110","#D97706","#6B6B6B","#E8E6E0","#9A9A9A","#333330"][i % 6],
    size: 6 + Math.random() * 8,
  }));
  return (
    <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:999, overflow:"hidden" }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position:"absolute",
          left: `${p.left}%`,
          top: -20,
          width: p.size,
          height: p.size,
          background: p.color,
          borderRadius: Math.random() > 0.5 ? "50%" : 2,
          animation: `fall ${1.8 + Math.random()}s ease-in ${p.delay}s forwards`,
        }} />
      ))}
      <style>{`@keyframes fall { to { transform: translateY(110vh) rotate(720deg); opacity:0; } }`}</style>
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function Progress({ step, total }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:28 }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          flex:1, height:4, borderRadius:99,
          background: i < step ? "#111110" : "#E8E6E0",
          transition:"background 0.3s",
        }} />
      ))}
    </div>
  );
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────
function Card({ children, maxWidth = 520 }) {
  return (
    <div style={{ minHeight:"100vh", background:"#FAFAF7", display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:ff }}>
      <div style={{ width:"100%", maxWidth, background:"#FFFFFF", borderRadius:12, border:"1px solid #E8E6E0", boxShadow:"0 2px 24px rgba(0,0,0,0.06)", padding:"36px 40px" }}>
        {children}
      </div>
    </div>
  );
}

// ─── Input atom ──────────────────────────────────────────────────────────────
function Input({ label, value, onChange, placeholder, type = "text", required }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#6B6B6B", marginBottom:5 }}>
        {label}{required && <span style={{ color:"#E11D48" }}> *</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width:"100%", padding:"10px 12px", fontSize:14, border:"1.5px solid #E2E8F0", borderRadius:8, fontFamily:ff, outline:"none", boxSizing:"border-box", color:"#1a1a2e" }}
        onFocus={e => e.target.style.borderColor = "#111110"}
        onBlur={e => e.target.style.borderColor = "#E2E8F0"}
      />
    </div>
  );
}

function BtnPrimary({ onClick, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled} className="onb-btn-primary" style={{
      width:"100%", padding:"13px 0", fontSize:15, fontWeight:500,
      background: disabled ? "#E8E6E0" : "#111110",
      color: disabled ? "#9A9A9A" : "#FAFAF7",
      border:"none", borderRadius:8, cursor: disabled ? "not-allowed" : "pointer",
      fontFamily:ff, transition:"background 0.2s", marginTop:8,
    }}>
      {children}
    </button>
  );
}

function BtnSkip({ onClick }) {
  return (
    <button onClick={onClick} style={{
      width:"100%", padding:"10px 0", fontSize:13, fontWeight:600,
      background:"transparent", color:"#9A9A9A", border:"none",
      cursor:"pointer", fontFamily:ff, marginTop:4,
    }}>
      I'll do this later
    </button>
  );
}

// ─── STEP 1: Welcome ──────────────────────────────────────────────────────────
function StepWelcome({ onNext, userName }) {
  return (
    <Card>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:48, height:48, background:"#111110", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" }}>
          <span style={{ fontSize:18, fontWeight:700, color:"#D97706", letterSpacing:-0.5, fontFamily:"Georgia, serif" }}>IS</span>
        </div>
        <h1 style={{ fontSize:24, fontWeight:400, fontFamily:"Georgia, serif", color:"#111110", margin:"0 0 10px", letterSpacing:-0.3 }}>
          Welcome{userName ? `, ${userName.split(" ")[0]}` : ""}!
        </h1>
        <p style={{ fontSize:15, color:"#64748B", lineHeight:1.6, margin:"0 0 32px" }}>
          You'll send your first invoice before you finish this setup.<br />Three quick steps and you're ready to get paid.
        </p>
        <div style={{ display:"flex", flexDirection:"column", gap:10, textAlign:"left", background:"#F5F4F0", border:"1px solid #E8E6E0", borderRadius:8, padding:"14px 18px", marginBottom:28 }}>
          {["Set up your organization", "Add your first client", "Create your first invoice"].map((s, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, fontSize:14, color:"#374151" }}>
              <div style={{ width:20, height:20, borderRadius:"50%", background:"#111110", color:"#FAFAF7", fontSize:10, fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{i + 1}</div>
              {s}
            </div>
          ))}
        </div>
        <BtnPrimary onClick={onNext}>Let's go →</BtnPrimary>
      </div>
    </Card>
  );
}

// ─── STEP 3: First client ─────────────────────────────────────────────────────
function StepClient({ onNext, onSkip }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");

  const handleNext = () => {
    if (!name.trim()) return;
    onNext({ id: genId(), name: name.trim(), email: email.trim(), companyName: company.trim(), billingAddress:{} });
  };

  return (
    <Card>
      <Progress step={2} total={3} />
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:12, fontWeight:700, color:"#9A9A9A", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>Step 2 of 3</div>
        <h2 style={{ fontSize:22, fontWeight:400, fontFamily:"Georgia, serif", color:"#111110", margin:"0 0 6px" }}>Add your first client</h2>
        <p style={{ fontSize:14, color:"#64748B", margin:0 }}>Who do you send invoices to?</p>
      </div>
      <Input label="Client name" value={name} onChange={setName} placeholder="Jane Smith" required />
      <Input label="Company name" value={company} onChange={setCompany} placeholder="Acme Ltd (optional)" />
      <Input label="Email address" value={email} onChange={setEmail} placeholder="jane@acme.com" type="email" />
      <BtnPrimary onClick={handleNext} disabled={!name.trim()}>Add client →</BtnPrimary>
      <BtnSkip onClick={onSkip} />
    </Card>
  );
}

// ─── STEP 4: First invoice ────────────────────────────────────────────────────
function StepInvoice({ onNext, onSkip, client, orgSettings, invoices, invoicePrefix, invoiceStartNum }) {
  const nextNum = invoices.length + (invoiceStartNum || 1);
  const docNumber = `${invoicePrefix || "INV-"}${String(nextNum).padStart(4, "0")}`;

  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");

  const handleNext = () => {
    if (!desc.trim() || !amount) return;
    const invoice = {
      id: genId(),
      docNumber,
      type: "invoice",
      status: "Draft",
      customer: client || { name:"Client", email:"" },
      issueDate: today(),
      dueDate: due30(),
      paymentTerms: "Net 30",
      items: [{ id: genId(), description: desc.trim(), quantity: 1, rate: parseFloat(amount), tax_rate: 0, amount: parseFloat(amount) }],
      subtotal: parseFloat(amount),
      discountAmount: 0,
      shipping: 0,
      taxBreakdown: [],
      cisDeduction: 0,
      total: parseFloat(amount),
      notes: "",
      terms: orgSettings?.defaultInvTerms || "",
    };
    onNext(invoice);
  };

  return (
    <Card>
      <Progress step={3} total={3} />
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:12, fontWeight:700, color:"#9A9A9A", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>Step 3 of 3</div>
        <h2 style={{ fontSize:22, fontWeight:400, fontFamily:"Georgia, serif", color:"#111110", margin:"0 0 6px" }}>Create your first invoice</h2>
        <p style={{ fontSize:14, color:"#64748B", margin:0 }}>
          {client ? <>For <strong>{client.name}</strong> · </> : null}Invoice #{docNumber}
        </p>
      </div>
      <Input label="Description" value={desc} onChange={setDesc} placeholder="e.g. Web design services" required />
      <Input label="Amount" value={amount} onChange={setAmount} placeholder="0.00" type="number" required />
      <BtnPrimary onClick={handleNext} disabled={!desc.trim() || !amount}>Create invoice →</BtnPrimary>
      <BtnSkip onClick={onSkip} />
    </Card>
  );
}

// ─── STEP 5: Done ─────────────────────────────────────────────────────────────
function StepDone({ onFinish, invoiceCreated }) {
  return (
    <>
      <Confetti />
      <Card>
        <div style={{ textAlign:"center" }}>
          <div style={{ width:56, height:56, background:"#111110", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h2 style={{ fontSize:24, fontWeight:400, fontFamily:"Georgia, serif", color:"#111110", margin:"0 0 10px" }}>You're ready to get paid.</h2>
          <p style={{ fontSize:15, color:"#64748B", lineHeight:1.6, margin:"0 0 28px" }}>
            Your account is set up.{invoiceCreated ? " Your first invoice has been created as a draft." : ""}
          </p>
          <BtnPrimary onClick={onFinish}>Go to dashboard →</BtnPrimary>
        </div>
      </Card>
    </>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function OnboardingFlow({ user, orgSettings, onComplete, customers, setCustomers, invoices, setInvoices, invoicePrefix, invoiceStartNum }) {
  const [step, setStep] = useState(orgSettings ? 2 : 0);
  const [newClient, setNewClient] = useState(null);
  const [invoiceCreated, setInvoiceCreated] = useState(false);

  const handleOrgComplete = (data) => {
    onComplete({ orgSettings: data });
    // Fire-and-forget — seed the chart of accounts without blocking the onboarding flow.
    // Uses supabase.auth.getUser() to obtain the real auth UUID (the app's user object
    // does not carry an id field).
    if (supabase) {
      (async () => {
        try {
          const { data: authData } = await supabase.auth.getUser();
          const authUserId = authData?.user?.id;
          if (authUserId) await seedAccountsForUser(authUserId, supabase);
        } catch (err) {
          console.error("Failed to seed chart of accounts:", err);
        }
      })();
    }
    setStep(2);
  };

  const handleClientNext = (client) => {
    setCustomers(prev => [client, ...prev]);
    setNewClient(client);
    setStep(3);
  };

  const handleClientSkip = () => setStep(3);

  const handleInvoiceNext = (invoice) => {
    setInvoices(prev => [invoice, ...prev]);
    setInvoiceCreated(true);
    setStep(4);
  };

  const handleInvoiceSkip = () => setStep(4);

  const handleFinish = () => onComplete({ done: true });

  return (
    <>
      <style>{`.onb-btn-primary:hover:not(:disabled){background:#333330!important}`}</style>
      {step === 0 && <StepWelcome onNext={() => setStep(1)} userName={user?.name} />}
      {step === 1 && <OrgSetupPage onComplete={handleOrgComplete} initialData={orgSettings} />}
      {step === 2 && <StepClient onNext={handleClientNext} onSkip={handleClientSkip} />}
      {step === 3 && <StepInvoice onNext={handleInvoiceNext} onSkip={handleInvoiceSkip} client={newClient} orgSettings={orgSettings} invoices={invoices} invoicePrefix={invoicePrefix} invoiceStartNum={invoiceStartNum} />}
      {step === 4 && <StepDone onFinish={handleFinish} invoiceCreated={invoiceCreated} />}
    </>
  );
}
