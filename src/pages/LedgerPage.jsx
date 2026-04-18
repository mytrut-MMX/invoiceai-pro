import { useState, useEffect, useContext, lazy, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ff } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { supabase } from "../lib/supabase";
import { SkeletonCard } from "../components/ui/Skeleton";

const JournalTab      = lazy(() => import("./ledger/JournalTab"));
const AccountsTab     = lazy(() => import("./ledger/AccountsTab"));
const PLTab           = lazy(() => import("./ledger/PLTab"));
const ManualEntryForm = lazy(() => import("./ledger/ManualEntryForm"));
const AddAccountForm  = lazy(() => import("./ledger/AddAccountForm"));

const TABS = [
  { id: "journal",  label: "Journal" },
  { id: "accounts", label: "Chart of Accounts" },
  { id: "pl",       label: "P&L" },
];

const TabFallback = () => (
  <div className="space-y-4 p-4">
    <SkeletonCard />
    <SkeletonCard />
  </div>
);

export default function LedgerPage() {
  const { user } = useContext(AppCtx);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // Derive active tab from the URL path segment: /ledger/journal → "journal"
  const tab = pathname.split("/")[2] || "journal";
  const setTab = (t) => navigate(`/ledger/${t}`, { replace: true });
  const [accounts,       setAccounts]       = useState([]);
  const [entries,        setEntries]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [userId,         setUserId]         = useState(null);
  const [showManual,     setShowManual]     = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [actionError,    setActionError]    = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id ?? user?.id ?? null;
      setUserId(uid);
      if (!uid) { setLoading(false); return; }

      const [{ data: accts }, { data: ents }] = await Promise.all([
        supabase.from("accounts").select("*").order("code"),
        supabase.from("journal_entries")
          .select("*, journal_lines(*, account:accounts(*))")
          .order("date", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);

      setAccounts(accts || []);
      setEntries(ents  || []);
    } catch (err) {
      console.error("[LedgerPage] load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaved = () => {
    setShowManual(false);
    setShowAddAccount(false);
    load();
  };

  const requiresAuthMsg = "Please sign in with Supabase (Google/email auth) to use ledger posting features.";
  const openManualModal = () => {
    if (!userId) { setActionError(requiresAuthMsg); return; }
    setActionError("");
    setShowManual(true);
  };
  const openAddAccountModal = () => {
    if (!userId) { setActionError(requiresAuthMsg); return; }
    setActionError("");
    setShowAddAccount(true);
  };

  return (
    <div style={{ maxWidth:960, margin:"0 auto", padding:"28px 20px", fontFamily:ff }}>

      {/* Page header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:36, height:36, background:"#1a1a2e", borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff" }}>
            <Icons.Bank />
          </div>
          <div>
            <h1 style={{ fontSize:20, fontWeight:700, color:"#1a1a2e", margin:0, lineHeight:1.2 }}>General Ledger</h1>
            <div style={{ fontSize:12, color:"#9ca3af", marginTop:1 }}>Double-entry accounting</div>
          </div>
        </div>
      </div>

      {!loading && !userId && (
        <div style={{ marginBottom:20, border:"1px solid #fde68a", background:"#fffbeb", borderRadius:10, padding:"14px 16px", display:"flex", alignItems:"flex-start", gap:10 }}>
          <span style={{ fontSize:18, lineHeight:1 }}>🔐</span>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:"#92400e", marginBottom:2 }}>Supabase sign-in required</div>
            <div style={{ fontSize:12, color:"#78350f", lineHeight:1.5 }}>
              The General Ledger uses Supabase for double-entry storage. Sign out and sign back in using <strong>Google</strong> or <strong>GitHub</strong> to activate journal posting, chart of accounts, and P&amp;L.
            </div>
          </div>
        </div>
      )}

      {actionError && (
        <div style={{ marginBottom:16, border:"1px solid #fecaca", background:"#fef2f2", borderRadius:8, padding:"10px 12px", color:"#991b1b", fontSize:12 }}>
          {actionError}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:"flex", gap:2, borderBottom:"2px solid #e8e8ec", marginBottom:24 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding:"9px 18px", fontSize:13, fontWeight: tab === t.id ? 700 : 400,
              color: tab === t.id ? "#1a1a2e" : "#6b7280",
              background:"none", border:"none", cursor:"pointer", fontFamily:ff,
              borderBottom: tab === t.id ? "2px solid #1a1a2e" : "2px solid transparent",
              marginBottom:-2, transition:"all 0.15s",
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* Tab content */}
      <Suspense fallback={<TabFallback />}>
        {tab === "journal" && (
          <JournalTab
            entries={entries}
            accounts={accounts}
            loading={loading}
            onNewEntry={openManualModal}
            canCreateManual={Boolean(userId)}
          />
        )}
        {tab === "accounts" && (
          <AccountsTab
            accounts={accounts}
            allEntries={entries}
            loading={loading}
            onNewAccount={openAddAccountModal}
            userId={userId}
            onSeeded={load}
          />
        )}
        {tab === "pl" && (
          <PLTab accounts={accounts} allEntries={entries} hasLedgerAccess={Boolean(userId)} />
        )}
      </Suspense>

      {/* Modals */}
      {showManual && (
        <Suspense fallback={null}>
          <ManualEntryForm
            accounts={accounts}
            userId={userId}
            onClose={() => setShowManual(false)}
            onSaved={handleSaved}
          />
        </Suspense>
      )}
      {showAddAccount && (
        <Suspense fallback={null}>
          <AddAccountForm
            userId={userId}
            onClose={() => setShowAddAccount(false)}
            onSaved={handleSaved}
          />
        </Suspense>
      )}
    </div>
  );
}
