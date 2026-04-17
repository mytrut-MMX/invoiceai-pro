import { useState } from "react";
import OrgSetupPage from "./OrgSetupPage";
import { seedAccountsForUser } from "../utils/ledger/defaultAccounts";
import { supabase } from "../lib/supabase";
import { Icons } from "../components/icons";
import { Field, Input, Btn } from "../components/atoms";
import InvoiceSagaLogo from "../components/InvoiceSagaLogo";

// ─── helpers ──────────────────────────────────────────────────────────────────
const genId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
const today = () => new Date().toISOString().slice(0, 10);
const due30 = () => new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);

// ─── Confetti ─────────────────────────────────────────────────────────────────
function Confetti() {
  const pieces = Array.from({ length: 32 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 1.2,
    color: ["#4F46E5", "#059669", "#D97706", "#DC2626", "#0EA5E9", "#8B5CF6"][i % 6],
    size: 6 + Math.random() * 8,
  }));
  return (
    <div className="fixed inset-0 pointer-events-none z-[999] overflow-hidden">
      {pieces.map(p => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.left}%`,
            top: -20,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: Math.random() > 0.5 ? "50%" : 2,
            animation: `fall ${1.8 + Math.random()}s ease-in ${p.delay}s forwards`,
          }}
        />
      ))}
      <style>{"@keyframes fall { to { transform: translateY(110vh) rotate(720deg); opacity: 0; } }"}</style>
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function Progress({ step, total }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={[
            "flex-1 h-1 rounded-full transition-colors duration-300",
            i < step ? "bg-[var(--text-primary)]" : "bg-[var(--border-subtle)]",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────
function Card({ children, maxWidth = 520 }) {
  return (
    <div className="min-h-screen bg-[var(--surface-sunken)] flex items-center justify-center p-4">
      <div className="w-full" style={{ maxWidth }}>
        <div className="flex justify-center mb-6">
          <InvoiceSagaLogo height={28} />
        </div>
        <div className="bg-[var(--surface-card)] rounded-2xl shadow-[var(--shadow-lg)] p-8">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── STEP 0: Welcome ──────────────────────────────────────────────────────────
function StepWelcome({ onNext, userName }) {
  return (
    <Card>
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] leading-tight m-0 mb-2">
          Welcome{userName ? `, ${userName.split(" ")[0]}` : ""}!
        </h1>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed m-0 mb-6">
          You'll send your first invoice before you finish this setup. Three quick steps and you're ready to get paid.
        </p>
        <div className="bg-[var(--surface-sunken)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-4 mb-6 flex flex-col gap-2.5 text-left">
          {["Set up your organization", "Add your first client", "Create your first invoice"].map((s, i) => (
            <div key={i} className="flex items-center gap-2.5 text-sm text-[var(--text-secondary)]">
              <div className="w-5 h-5 rounded-full bg-[var(--text-primary)] text-white text-[10px] font-semibold flex items-center justify-center flex-shrink-0">
                {i + 1}
              </div>
              {s}
            </div>
          ))}
        </div>
        <button
          onClick={onNext}
          className="w-full h-11 bg-[var(--text-primary)] hover:bg-[var(--surface-dark-2)] text-white border-none rounded-[var(--radius-md)] text-sm font-semibold cursor-pointer transition-colors duration-150"
        >
          Let's go →
        </button>
      </div>
    </Card>
  );
}

// ─── STEP 2: First client ─────────────────────────────────────────────────────
function StepClient({ onNext, onSkip }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");

  const handleNext = () => {
    if (!name.trim()) return;
    onNext({
      id: genId(),
      name: name.trim(),
      email: email.trim(),
      companyName: company.trim(),
      billingAddress: {},
    });
  };

  return (
    <Card>
      <Progress step={2} total={3} />
      <div className="mb-5">
        <div className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">
          Step 2 of 3
        </div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] m-0 mb-1">
          Add your first client
        </h2>
        <p className="text-sm text-[var(--text-secondary)] m-0">Who do you send invoices to?</p>
      </div>
      <div className="space-y-3 mb-4">
        <Field label="Client name" required>
          <Input value={name} onChange={setName} placeholder="Jane Smith" />
        </Field>
        <Field label="Company name">
          <Input value={company} onChange={setCompany} placeholder="Acme Ltd (optional)" />
        </Field>
        <Field label="Email address">
          <Input value={email} onChange={setEmail} placeholder="jane@acme.com" type="email" />
        </Field>
      </div>
      <button
        onClick={handleNext}
        disabled={!name.trim()}
        className="w-full h-11 bg-[var(--text-primary)] hover:bg-[var(--surface-dark-2)] disabled:bg-[var(--surface-sunken)] disabled:text-[var(--text-tertiary)] disabled:cursor-not-allowed text-white border-none rounded-[var(--radius-md)] text-sm font-semibold cursor-pointer transition-colors duration-150"
      >
        Add client →
      </button>
      <button
        onClick={onSkip}
        className="w-full h-9 mt-2 bg-transparent border-none cursor-pointer text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors duration-150"
      >
        I'll do this later
      </button>
    </Card>
  );
}

// ─── STEP 3: First invoice ────────────────────────────────────────────────────
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
      customer: client || { name: "Client", email: "" },
      issueDate: today(),
      dueDate: due30(),
      paymentTerms: "Net 30",
      items: [{
        id: genId(),
        description: desc.trim(),
        quantity: 1,
        rate: parseFloat(amount),
        tax_rate: 0,
        amount: parseFloat(amount),
      }],
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
      <div className="mb-5">
        <div className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">
          Step 3 of 3
        </div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] m-0 mb-1">
          Create your first invoice
        </h2>
        <p className="text-sm text-[var(--text-secondary)] m-0">
          {client ? <>For <strong>{client.name}</strong> · </> : null}Invoice #{docNumber}
        </p>
      </div>
      <div className="space-y-3 mb-4">
        <Field label="Description" required>
          <Input value={desc} onChange={setDesc} placeholder="e.g. Web design services" />
        </Field>
        <Field label="Amount" required>
          <Input value={amount} onChange={setAmount} placeholder="0.00" type="number" />
        </Field>
      </div>
      <button
        onClick={handleNext}
        disabled={!desc.trim() || !amount}
        className="w-full h-11 bg-[var(--text-primary)] hover:bg-[var(--surface-dark-2)] disabled:bg-[var(--surface-sunken)] disabled:text-[var(--text-tertiary)] disabled:cursor-not-allowed text-white border-none rounded-[var(--radius-md)] text-sm font-semibold cursor-pointer transition-colors duration-150"
      >
        Create invoice →
      </button>
      <button
        onClick={onSkip}
        className="w-full h-9 mt-2 bg-transparent border-none cursor-pointer text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors duration-150"
      >
        I'll do this later
      </button>
    </Card>
  );
}

// ─── STEP 4: Done ─────────────────────────────────────────────────────────────
function StepDone({ onFinish, invoiceCreated }) {
  return (
    <>
      <Confetti />
      <Card>
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-[var(--success-50)] text-[var(--success-700)] flex items-center justify-center mx-auto mb-4">
            <Icons.Check />
          </div>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)] leading-tight m-0 mb-2">
            You're ready to get paid.
          </h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed m-0 mb-6">
            Your account is set up.
            {invoiceCreated ? " Your first invoice has been created as a draft." : ""}
          </p>
          <button
            onClick={onFinish}
            className="w-full h-11 bg-[var(--text-primary)] hover:bg-[var(--surface-dark-2)] text-white border-none rounded-[var(--radius-md)] text-sm font-semibold cursor-pointer transition-colors duration-150"
          >
            Go to dashboard →
          </button>
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
      {step === 0 && <StepWelcome onNext={() => setStep(1)} userName={user?.name} />}
      {step === 1 && <OrgSetupPage onComplete={handleOrgComplete} initialData={orgSettings} />}
      {step === 2 && <StepClient onNext={handleClientNext} onSkip={handleClientSkip} />}
      {step === 3 && (
        <StepInvoice
          onNext={handleInvoiceNext}
          onSkip={handleInvoiceSkip}
          client={newClient}
          orgSettings={orgSettings}
          invoices={invoices}
          invoicePrefix={invoicePrefix}
          invoiceStartNum={invoiceStartNum}
        />
      )}
      {step === 4 && <StepDone onFinish={handleFinish} invoiceCreated={invoiceCreated} />}
    </>
  );
}
