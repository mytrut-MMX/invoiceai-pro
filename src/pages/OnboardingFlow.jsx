import { useState } from "react";
import { ff } from "../constants";
import OrgSetupPage from "./OrgSetupPage";

// ─── helpers ──────────────────────────────────────────────────────────────────
const genId = () => Math.random().toString(36).slice(2, 10);
const today = () => new Date().toISOString().slice(0, 10);
const due30 = () => new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);

// ─── Confetti ─────────────────────────────────────────────────────────────────
function Confetti() {
  const pieces = Array.from({ length: 32 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 1.2,
    color: ["#0EA5E9","#E86C4A","#16A34A","#D97706","#9333EA","#E11D48"][i % 6],
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
          background: i < step ? "#0EA5E9" : "#E2E8F0",
          transition:"background 0.3s",
        }} />
      ))}
    </div>
  );
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────
function Card({ children, maxWidth = 520 }) {
  return (
    <div style={{ minHeight:"100vh", background:"#F8FAFC", display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:ff }}>
      <div style={{ width:"100%", maxWidth, background:"#fff", borderRadius:16, boxShadow:"0 4px 40px rgba(0,0,0,0.08)", padding:"36px 40px" }}>
        {children}
      </div>
    </div>
  );
}

// ─── Input atom ──────────────────────────────────────────────────────────────
function Input({ label, value, onChange, placeholder, type = "text", required }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:5 }}>
        {label}{required && <span style={{ color:"#E11D48" }}> *</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width:"100%", padding:"10px 12px", fontSize:14, border:"1.5px solid #E2E8F0", borderRadius:8, fontFamily:ff, outline:"none", boxSizing:"border-box", color:"#1a1a2e" }}
        onFocus={e => e.target.style.borderColor = "#0EA5E9"}
        onBlur={e => e.target.style.borderColor = "#E2E8F0"}
      />
    </div>
  );
}

function BtnPrimary({ onClick, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width:"100%", padding:"13px 0", fontSize:15, fontWeight:700,
      background: disabled ? "#E2E8F0" : "#0EA5E9",
      color: disabled ? "#94A3B8" : "#fff",
      border:"none", borderRadius:10, cursor: disabled ? "not-allowed" : "pointer",
      fontFamily:ff, transition:"background 0.2s", marginTop:8,
    }}
    onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = "#0284c7"; }}
    onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = "#0EA5E9"; }}
    >
      {children}
    </button>
  );
}

function BtnSkip({ onClick }) {
  return (
    <button onClick={onClick} style={{
      width:"100%", padding:"10px 0", fontSize:13, fontWeight:600,
      background:"transparent", color:"#94A3B8", border:"none",
      cursor:"pointer", fontFamily:ff, marginTop:4,
    }}>
      Skip for now →
    </button>
  );
}

// ─── STEP 1: Welcome ──────────────────────────────────────────────────────────
function StepWelcome({ onNext, userName }) {
  return (
    <Card>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:56, height:56, background:"#0EA5E9", borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px", fontSize:26 }}>🧾</div>
        <h1 style={{ fontSize:26, fontWeight:800, color:"#0F172A", margin:"0 0 10px", letterSpacing:-0.5 }}>
          Welcome{userName ? `, ${userName.split(" ")[0]}` : ""}!
        </h1>
        <p style={{ fontSize:15, color:"#64748B", lineHeight:1.6, margin:"0 0 32px" }}>
          Let's get you set up in under 2 minutes.<br />We'll configure your account and send your first invoice.
        </p>
        <div style={{ display:"flex", flexDirection:"column", gap:10, textAlign:"left", background:"#F8FAFC", borderRadius:10, padding:"16px 20px", marginBottom:28 }}>
          {["Set up your organization", "Add your first client", "Create your first invoice"].map((s, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, fontSize:14, color:"#374151" }}>
              <div style={{ width:22, height:22, borderRadius:"50%", background:"#0EA5E9", color:"#fff", fontSize:11, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{i + 1}</div>
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
        <div style={{ fontSize:12, fontWeight:700, color:"#0EA5E9", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>Step 2 of 3</div>
        <h2 style={{ fontSize:22, fontWeight:800, color:"#0F172A", margin:"0 0 6px" }}>Add your first client</h2>
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
        <div style={{ fontSize:12, fontWeight:700, color:"#0EA5E9", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>Step 3 of 3</div>
        <h2 style={{ fontSize:22, fontWeight:800, color:"#0F172A", margin:"0 0 6px" }}>Create your first invoice</h2>
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
          <div style={{ fontSize:56, marginBottom:16 }}>🎉</div>
          <h2 style={{ fontSize:26, fontWeight:800, color:"#0F172A", margin:"0 0 10px" }}>You're all set!</h2>
          <p style={{ fontSize:15, color:"#64748B", lineHeight:1.6, margin:"0 0 28px" }}>
            Your account is ready.{invoiceCreated ? " Your first invoice has been created as a draft." : ""}
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

  if (step === 0) return <StepWelcome onNext={() => setStep(1)} userName={user?.name} />;

  if (step === 1) return (
    <OrgSetupPage
      onComplete={handleOrgComplete}
      initialData={orgSettings}
    />
  );

  if (step === 2) return (
    <StepClient
      onNext={handleClientNext}
      onSkip={handleClientSkip}
    />
  );

  if (step === 3) return (
    <StepInvoice
      onNext={handleInvoiceNext}
      onSkip={handleInvoiceSkip}
      client={newClient}
      orgSettings={orgSettings}
      invoices={invoices}
      invoicePrefix={invoicePrefix}
      invoiceStartNum={invoiceStartNum}
    />
  );

  return <StepDone onFinish={handleFinish} invoiceCreated={invoiceCreated} />;
}
