import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Icons } from "../../components/icons";
import { Field, Input, Btn } from "../../components/atoms";
import { formatSortCode, stripSortCode } from "../../utils/helpers";
import Section from "../../components/settings/Section";
import { useToast } from "../../components/ui/Toast";
import { supabase } from "../../lib/supabase";
import { invalidateAccountsCache } from "../../utils/ledger/fetchUserAccounts";
import AddAccountForm from "../ledger/AddAccountForm";
import PayCreditCardModal from "../../components/ledger/PayCreditCardModal";

// ─── Icons for account sub-types ─────────────────────────────────────────────

function SubTypeIcon({ subType }) {
  if (subType === "credit_card") return <Icons.Expenses />;
  if (subType === "cash")        return <Icons.Payments />;
  return <Icons.Bank />;
}

const SUB_TYPE_LABEL = {
  current:     "Current",
  savings:     "Savings",
  cash:        "Cash",
  credit_card: "Credit Card",
  other:       "Other",
};

// ─── Tiny inline edit modal (name / CC fields only) ───────────────────────────

function EditAccountModal({ account, onClose, onSaved }) {
  const [name,        setName]        = useState(account.name);
  const [creditLimit, setCreditLimit] = useState(account.credit_limit ?? "");
  const [stmtDay,     setStmtDay]     = useState(account.statement_day ?? "");
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");
  const isCc = account.sub_type === "credit_card";

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true); setError("");
    const patch = {
      name: name.trim(),
      ...(isCc ? {
        credit_limit:  creditLimit !== "" ? Number(creditLimit) : null,
        statement_day: stmtDay     !== "" ? Number(stmtDay)     : null,
      } : {}),
    };
    const { error: err } = await supabase.from("accounts").update(patch).eq("id", account.id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSaved();
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:700, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#fff", borderRadius:12, width:"100%", maxWidth:380, boxShadow:"0 8px 40px rgba(0,0,0,0.18)" }}>
        <div style={{ padding:"14px 20px", borderBottom:"1px solid #e8e8ec", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ fontSize:14, fontWeight:700, color:"#1a1a2e" }}>Edit — {account.code}</span>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#6b7280", display:"flex", padding:4 }}><Icons.X /></button>
        </div>
        <div style={{ padding:"18px 20px", display:"flex", flexDirection:"column", gap:12 }}>
          <Field label="Account Name" required>
            <Input value={name} onChange={setName} />
          </Field>
          {isCc && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <Field label="Credit Limit">
                <Input value={creditLimit} onChange={setCreditLimit} type="number" min="0" placeholder="e.g. 5000" />
              </Field>
              <Field label="Statement Day">
                <Input value={stmtDay} onChange={setStmtDay} type="number" min="1" max="31" placeholder="1–31" />
              </Field>
            </div>
          )}
          {error && <div style={{ color:"#dc2626", fontSize:12 }}>{error}</div>}
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <Btn variant="outline" onClick={onClose}>Cancel</Btn>
            <Btn variant="primary" onClick={handleSave} disabled={!name.trim() || saving}>
              {saving ? "Saving…" : "Save"}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Account card ─────────────────────────────────────────────────────────────

function AccountCard({ account, stats, onPay, onViewTx, onEdit, onDelete, assetAccounts, userId }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef    = useRef(null);
  const triggerRef = useRef(null);

  const s          = stats || { debit: 0, credit: 0, txCount: 0, lastDate: null };
  const isCc       = account.sub_type === "credit_card";
  const isAsset    = account.type === "asset";
  const balance    = isAsset ? s.debit - s.credit : s.credit - s.debit;
  const balFmt     = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Math.abs(balance));
  const lastDate   = s.lastDate
    ? new Date(s.lastDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "NEVER";
  const utilPct = isCc && account.credit_limit > 0
    ? Math.min(100, Math.round((balance / account.credit_limit) * 100))
    : null;

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) &&
          triggerRef.current && !triggerRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const canDelete = s.txCount === 0 && !account.is_system;

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg shadow-sm flex flex-col min-w-0">
      {/* Card body */}
      <div className="px-4 pt-4 pb-3 flex-1">
        {/* Header row */}
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[var(--brand-50)] flex items-center justify-center text-[var(--brand-600)]">
            <SubTypeIcon subType={account.sub_type} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{account.name}</span>
              {isCc && (
                <span className="text-[10px] font-bold text-[#7c3aed] bg-[#ede9fe] rounded px-1.5 py-0.5 flex-shrink-0">CC</span>
              )}
              {account.is_system && (
                <span className="text-[10px] text-[var(--text-tertiary)] border border-[var(--border-subtle)] rounded px-1 py-0.5 flex-shrink-0">system</span>
              )}
            </div>
            <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
              {account.code}{account.sub_type ? ` · ${SUB_TYPE_LABEL[account.sub_type] || account.sub_type}` : ""}
            </div>
          </div>
        </div>

        {/* Balance */}
        <div className="mb-1">
          <span className={[
            "text-[22px] font-bold tabular-nums",
            balance < 0 ? "text-[var(--danger-600)]" : "text-[var(--text-primary)]",
          ].join(" ")}>
            {balFmt}
          </span>
          {isCc && balance > 0 && (
            <span className="text-[11px] text-[var(--text-tertiary)] ml-1.5">owed</span>
          )}
        </div>

        {/* Utilisation bar (CC only) */}
        {isCc && account.credit_limit > 0 && (
          <div className="mb-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-[var(--surface-sunken)] rounded-full overflow-hidden">
              <div
                style={{ width: `${utilPct}%` }}
                className={[
                  "h-full rounded-full transition-all",
                  utilPct >= 90 ? "bg-[var(--danger-600)]" :
                  utilPct >= 70 ? "bg-[var(--warning-600,#d97706)]" : "bg-[#7c3aed]",
                ].join(" ")}
              />
            </div>
            <span className="text-[10px] text-[var(--text-tertiary)] tabular-nums whitespace-nowrap">
              {utilPct}% of {new Intl.NumberFormat("en-GB", { style:"currency", currency:"GBP" }).format(account.credit_limit)}
            </span>
          </div>
        )}

        {/* Last entry */}
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
          Last entry: <span className="text-[var(--text-secondary)]">{lastDate}</span>
        </div>
      </div>

      {/* Card footer */}
      <div className="px-4 py-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
        <span className="text-[11px] text-[var(--text-tertiary)]">
          {s.txCount} {s.txCount === 1 ? "transaction" : "transactions"}
        </span>

        {/* Actions dropdown */}
        <div className="relative">
          <button
            ref={triggerRef}
            onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
            className="flex items-center gap-1 text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-1 rounded hover:bg-[var(--surface-sunken)] transition-colors"
          >
            Actions <Icons.ChevDown />
          </button>
          {menuOpen && (
            <div
              ref={menuRef}
              className="absolute right-0 bottom-full mb-1 z-50 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg shadow-lg py-1 min-w-[160px]"
              onClick={(e) => e.stopPropagation()}
            >
              <MenuItem onClick={() => { setMenuOpen(false); onViewTx(account); }}>
                <Icons.Eye /> View transactions
              </MenuItem>
              {isCc && (
                <MenuItem onClick={() => { setMenuOpen(false); onPay(account); }}>
                  <Icons.Payments /> Pay credit card
                </MenuItem>
              )}
              <MenuItem onClick={() => { setMenuOpen(false); onEdit(account); }}>
                <Icons.Edit /> Edit
              </MenuItem>
              {canDelete && (
                <>
                  <div className="border-t border-[var(--border-subtle)] my-1" />
                  <MenuItem danger onClick={() => { setMenuOpen(false); onDelete(account); }}>
                    <Icons.Trash /> Delete
                  </MenuItem>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MenuItem({ children, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={[
        "flex items-center gap-2 w-full text-left px-3 py-1.5 text-[12px] transition-colors",
        danger
          ? "text-[var(--danger-600)] hover:bg-[var(--danger-50,#fef2f2)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SettingsBanking({ orgSettings, onSave }) {
  const { toast }  = useToast();
  const navigate   = useNavigate();
  const org        = orgSettings || {};

  // ── Bank details form state (Section 2, unchanged) ────────────────────────
  const [bankName,  setBankName]  = useState(org.bankName  || "");
  const [bankSort,  setBankSort]  = useState(formatSortCode(org.bankSort || ""));
  const [bankAcc,   setBankAcc]   = useState(org.bankAcc   || "");
  const [bankIban,  setBankIban]  = useState(org.bankIban  || "");
  const [bankSwift, setBankSwift] = useState(org.bankSwift || "");
  const [saved,     setSaved]     = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!orgSettings) return;
    setBankName(org.bankName  || "");
    setBankSort(formatSortCode(org.bankSort || ""));
    setBankAcc(org.bankAcc    || "");
    setBankIban(org.bankIban  || "");
    setBankSwift(org.bankSwift|| "");
  }, [orgSettings]); // eslint-disable-line react-hooks/exhaustive-deps

  const sortCodeError = bankSort && stripSortCode(bankSort).length !== 6 && stripSortCode(bankSort).length > 0
    ? "Sort code must be exactly 6 digits."
    : "";

  const handleSaveForm = () => {
    if (sortCodeError) { setSaveError("Please fix the sort code before saving."); return; }
    setSaveError("");
    try {
      onSave({ bankName, bankSort: stripSortCode(bankSort), bankAcc, bankIban, bankSwift });
      setSaved(true);
      toast({ title: "Bank details saved", variant: "success" });
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setSaveError("Something went wrong. Please try again.");
      toast({ title: "Failed to save bank details", variant: "danger" });
    }
  };

  // ── Accounts section state (Section 1) ───────────────────────────────────
  const [userId,      setUserId]      = useState(null);
  const [accounts,    setAccounts]    = useState([]);
  const [stats,       setStats]       = useState({});
  const [loadingAccts,setLoadingAccts]= useState(true);
  const [showAdd,     setShowAdd]     = useState(false);
  const [payModal,    setPayModal]    = useState(null);
  const [editModal,   setEditModal]   = useState(null);

  const loadAccounts = useCallback(async () => {
    if (!supabase) { setLoadingAccts(false); return; }
    setLoadingAccts(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;

      const { data: allAccts, error: acctErr } = await supabase
        .from("accounts")
        .select("*")
        .order("code");
      if (acctErr) throw acctErr;

      const filtered = (allAccts || []).filter(a =>
        (a.type === "asset" && String(a.code).startsWith("1")) ||
        a.sub_type === "credit_card"
      );
      setAccounts(filtered);

      if (filtered.length > 0) {
        const ids = filtered.map(a => a.id);
        const { data: lines } = await supabase
          .from("journal_lines")
          .select("account_id, debit, credit, journal_entries(date)")
          .in("account_id", ids);

        const map = {};
        for (const l of lines || []) {
          if (!map[l.account_id]) map[l.account_id] = { debit: 0, credit: 0, txCount: 0, lastDate: null };
          map[l.account_id].debit   += Number(l.debit  || 0);
          map[l.account_id].credit  += Number(l.credit || 0);
          map[l.account_id].txCount += 1;
          const d = l.journal_entries?.date;
          if (d && (!map[l.account_id].lastDate || d > map[l.account_id].lastDate)) {
            map[l.account_id].lastDate = d;
          }
        }
        setStats(map);
      } else {
        setStats({});
      }
    } catch (err) {
      console.error("[SettingsBanking] loadAccounts:", err);
    } finally {
      setLoadingAccts(false);
    }
  }, []);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  const handleDelete = async (account) => {
    if (!window.confirm(`Delete account "${account.name}" (${account.code})?`)) return;
    const { error: err } = await supabase.from("accounts").delete().eq("id", account.id);
    if (err) { toast({ title: "Delete failed", description: err.message, variant: "danger" }); return; }
    invalidateAccountsCache();
    toast({ title: "Account deleted", variant: "success" });
    loadAccounts();
  };

  const handleViewTx = (account) => {
    navigate(`/ledger/journal?account=${account.id}`);
  };

  const assetAccounts = accounts.filter(a => a.type === "asset");

  return (
    <>
      {/* ── Section 1: Your accounts ─────────────────────────────────────── */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] mb-4 overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <h3 className="m-0 text-sm font-semibold text-[var(--text-primary)]">Your accounts</h3>
          {userId && (
            <Btn variant="primary" onClick={() => setShowAdd(true)} icon={<Icons.Plus />}>
              New
            </Btn>
          )}
        </div>
        <div className="px-5 py-4">
          {loadingAccts ? (
            <div className="text-center py-10 text-[var(--text-tertiary)] text-sm">Loading…</div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-3xl mb-3">🏦</div>
              <div className="text-sm font-semibold text-[var(--text-primary)] mb-1">No financial accounts yet</div>
              <div className="text-xs text-[var(--text-secondary)] mb-4">
                Initialise your Chart of Accounts in the Ledger, or add a new account here.
              </div>
              {userId && (
                <Btn variant="primary" onClick={() => setShowAdd(true)}>+ New Account</Btn>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[21px]">
              {accounts.map(account => (
                <AccountCard
                  key={account.id}
                  account={account}
                  stats={stats[account.id]}
                  assetAccounts={assetAccounts}
                  userId={userId}
                  onPay={setPayModal}
                  onViewTx={handleViewTx}
                  onEdit={setEditModal}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Section 2: Bank details on invoices ──────────────────────────── */}
      <Section title="Bank details on invoices">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <Field label="Bank Name">
            <Input value={bankName} onChange={setBankName} placeholder="e.g. Barclays" />
          </Field>
          <Field label="Sort Code" error={sortCodeError}>
            <input
              type="text"
              value={bankSort}
              onChange={e => setBankSort(e.target.value.replace(/[^0-9-]/g, ""))}
              onBlur={() => setBankSort(formatSortCode(bankSort))}
              placeholder="00-00-00"
              maxLength={8}
              className={[
                "w-full h-9 px-3 rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-[var(--surface-card)] outline-none transition-colors duration-150 box-border",
                sortCodeError
                  ? "border border-[var(--danger-600)] focus:shadow-[var(--focus-ring)]"
                  : "border border-[var(--border-default)] focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)]",
              ].join(" ")}
            />
          </Field>
          <Field label="Account Number">
            <Input value={bankAcc} onChange={setBankAcc} placeholder="12345678" />
          </Field>
          <Field label="IBAN (optional)">
            <Input value={bankIban} onChange={setBankIban} />
          </Field>
          <Field label="SWIFT / BIC (optional)">
            <Input value={bankSwift} onChange={setBankSwift} />
          </Field>
        </div>
      </Section>

      <div className="flex flex-col items-end gap-2 mt-4">
        {saveError && (
          <div className="flex items-center gap-1.5 text-sm text-[var(--danger-600)] font-semibold">
            <Icons.Alert /> {saveError}
          </div>
        )}
        <div className="flex items-center gap-2.5">
          {saved && (
            <div className="flex items-center gap-1.5 text-sm text-[var(--success-700)] font-semibold">
              <Icons.Check /> Saved.
            </div>
          )}
          <Btn onClick={handleSaveForm} variant={saved ? "success" : "primary"} icon={<Icons.Save />}>
            Save bank settings
          </Btn>
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {showAdd && userId && (
        <AddAccountForm
          userId={userId}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            invalidateAccountsCache();
            loadAccounts();
          }}
        />
      )}
      {payModal && (
        <PayCreditCardModal
          ccAccount={payModal}
          assetAccounts={assetAccounts}
          userId={userId}
          onClose={() => setPayModal(null)}
          onSuccess={() => { setPayModal(null); loadAccounts(); }}
        />
      )}
      {editModal && (
        <EditAccountModal
          account={editModal}
          onClose={() => setEditModal(null)}
          onSaved={() => {
            setEditModal(null);
            invalidateAccountsCache();
            loadAccounts();
            toast({ title: "Account updated", variant: "success" });
          }}
        />
      )}
    </>
  );
}
