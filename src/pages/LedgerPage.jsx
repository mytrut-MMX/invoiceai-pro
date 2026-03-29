import { useState, useEffect, useMemo, useContext } from "react";
import { ff, CUR_SYM } from "../constants";
import { AppCtx } from "../context/AppContext";
import { Icons } from "../components/icons";
import { Btn, Field, Input, Select } from "../components/atoms";
import { supabase, supabaseReady } from "../lib/supabase";
import { fmt, fmtDate, todayStr } from "../utils/helpers";
import { seedAccountsForUser } from "../utils/ledger/defaultAccounts";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const PERIODS = [
  { value: "this_month",   label: "This Month" },
  { value: "last_month",   label: "Last Month" },
  { value: "this_quarter", label: "This Quarter" },
  { value: "this_year",    label: "This Year" },
  { value: "custom",       label: "Custom Range" },
];

const SOURCE_OPTIONS = [
  { value: "all",             label: "All Sources" },
  { value: "invoice",         label: "Invoices" },
  { value: "payment",         label: "Payments" },
  { value: "expense",         label: "Expenses" },
  { value: "manual",          label: "Manual" },
  { value: "opening_balance", label: "Opening Balance" },
  { value: "reversal",        label: "Reversals" },
];

export const ACCT_TYPES  = ["asset", "liability", "equity", "revenue", "expense"];
export const ACCT_LABELS = {
  asset: "Assets", liability: "Liabilities", equity: "Equity",
  revenue: "Revenue", expense: "Expenses",
};
export const TYPE_COLORS = {
  asset: "#0891b2", liability: "#dc2626", equity: "#7c3aed",
  revenue: "#16a34a", expense: "#d97706",
};

// ─── DATE RANGE HELPER ────────────────────────────────────────────────────────

export function getDateRange(period, customStart, customEnd) {
  const now   = new Date();
  const y     = now.getFullYear();
  const m     = now.getMonth();           // 0-indexed
  const pad   = n => String(n).padStart(2, "0");
  const today = now.toISOString().slice(0, 10);

  switch (period) {
    case "this_month":
      return { start: `${y}-${pad(m + 1)}-01`, end: today };
    case "last_month": {
      const last = new Date(y, m, 0);     // last day of previous month
      return {
        start: `${last.getFullYear()}-${pad(last.getMonth() + 1)}-01`,
        end:   last.toISOString().slice(0, 10),
      };
    }
    case "this_quarter": {
      const qs = Math.floor(m / 3) * 3;
      return { start: `${y}-${pad(qs + 1)}-01`, end: today };
    }
    case "this_year":
      return { start: `${y}-01-01`, end: today };
    case "custom":
      return { start: customStart || `${y}-${pad(m + 1)}-01`, end: customEnd || today };
    default:
      return { start: `${y}-${pad(m + 1)}-01`, end: today };
  }
}

// ─── MANUAL ENTRY FORM ────────────────────────────────────────────────────────

const blankLine = () => ({
  id: crypto.randomUUID(), accountId: "", debit: "", credit: "", lineDesc: "",
});

export function ManualEntryForm({ accounts, userId, onClose, onSaved }) {
  const [date,        setDate]        = useState(todayStr());
  const [description, setDescription] = useState("");
  const [reference,   setReference]   = useState("");
  const [lines,       setLines]       = useState([blankLine(), blankLine()]);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");

  const totalDebit  = lines.reduce((s, l) => s + (Number(l.debit)  || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const balanced    = Math.abs(totalDebit - totalCredit) < 0.01;
  const valid       = description.trim() && balanced && totalDebit > 0 &&
    lines.every(l => l.accountId && (Number(l.debit) > 0 || Number(l.credit) > 0));

  const updateLine = (id, field, value) =>
    setLines(prev => prev.map(l => {
      if (l.id !== id) return l;
      const next = { ...l, [field]: value };
      if (field === "debit"  && value) next.credit = "";
      if (field === "credit" && value) next.debit  = "";
      return next;
    }));

  const handleSave = async () => {
    if (!valid) return;
    setSaving(true); setError("");
    try {
      const { data: entry, error: eErr } = await supabase
        .from("journal_entries")
        .insert({
          user_id:     userId,
          date,
          description: description.trim(),
          reference:   reference.trim() || null,
          source_type: "manual",
          source_id:   null,
        })
        .select("id")
        .single();
      if (eErr) throw eErr;

      const { error: lErr } = await supabase
        .from("journal_lines")
        .insert(lines.map(l => ({
          journal_entry_id: entry.id,
          account_id:       l.accountId,
          debit:            Number(l.debit)  || 0,
          credit:           Number(l.credit) || 0,
          description:      l.lineDesc || null,
        })));
      if (lErr) throw lErr;
      onSaved();
    } catch (err) {
      setError(err.message || "Failed to save entry");
    } finally {
      setSaving(false);
    }
  };

  // Overlay backdrop
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#fff", borderRadius:12, width:"100%", maxWidth:660, maxHeight:"92vh", overflowY:"auto", boxShadow:"0 8px 40px rgba(0,0,0,0.18)", fontFamily:ff }}>

        {/* Header */}
        <div style={{ padding:"16px 24px", borderBottom:"1px solid #e8e8ec", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, background:"#fff", zIndex:2 }}>
          <span style={{ fontSize:15, fontWeight:700, color:"#1a1a2e" }}>New Manual Journal Entry</span>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#6b7280", display:"flex", padding:4 }}><Icons.X /></button>
        </div>

        <div style={{ padding:"20px 24px" }}>
          {/* Top fields */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
            <Field label="Date" required>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                style={{ width:"100%", padding:"8px 10px", border:"1px solid #e8e8ec", borderRadius:5, fontSize:13, fontFamily:ff, outline:"none", boxSizing:"border-box" }} />
            </Field>
            <Field label="Reference">
              <Input value={reference} onChange={setReference} placeholder="e.g. REF-001" />
            </Field>
          </div>
          <div style={{ marginBottom:16 }}>
            <Field label="Description" required>
              <Input value={description} onChange={setDescription} placeholder="Describe this journal entry…" />
            </Field>
          </div>

          {/* Lines header */}
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 24px", gap:6, marginBottom:4, padding:"0 2px" }}>
            {["Account", "Debit", "Credit", ""].map(h => (
              <div key={h} style={{ fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.06em" }}>{h}</div>
            ))}
          </div>

          {/* Lines */}
          {lines.map(line => (
            <div key={line.id} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 24px", gap:6, marginBottom:6, alignItems:"center" }}>
              {/* Account picker */}
              <select value={line.accountId} onChange={e => updateLine(line.id, "accountId", e.target.value)}
                style={{ padding:"7px 8px", border:"1px solid #e8e8ec", borderRadius:5, fontSize:12, fontFamily:ff, outline:"none", color:line.accountId?"#1a1a2e":"#9ca3af", width:"100%", boxSizing:"border-box" }}>
                <option value="">Select account…</option>
                {ACCT_TYPES.map(type => {
                  const grp = accounts.filter(a => a.type === type);
                  return grp.length ? (
                    <optgroup key={type} label={ACCT_LABELS[type]}>
                      {grp.map(a => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
                    </optgroup>
                  ) : null;
                })}
              </select>
              {/* Debit */}
              <input type="number" min="0" value={line.debit} onChange={e => updateLine(line.id, "debit", e.target.value)}
                placeholder="0.00"
                style={{ padding:"7px 8px", border:"1px solid #e8e8ec", borderRadius:5, fontSize:12, fontFamily:ff, outline:"none", textAlign:"right", width:"100%", boxSizing:"border-box" }} />
              {/* Credit */}
              <input type="number" min="0" value={line.credit} onChange={e => updateLine(line.id, "credit", e.target.value)}
                placeholder="0.00"
                style={{ padding:"7px 8px", border:"1px solid #e8e8ec", borderRadius:5, fontSize:12, fontFamily:ff, outline:"none", textAlign:"right", width:"100%", boxSizing:"border-box" }} />
              {/* Remove */}
              <button onClick={() => lines.length > 2 && setLines(p => p.filter(l => l.id !== line.id))}
                style={{ background:"none", border:"none", cursor:lines.length>2?"pointer":"default", color:lines.length>2?"#dc2626":"#e5e7eb", display:"flex", padding:2 }}>
                <Icons.X />
              </button>
            </div>
          ))}

          {/* Add line */}
          <button onClick={() => setLines(p => [...p, blankLine()])}
            style={{ width:"100%", marginTop:4, padding:"7px 0", border:"1px dashed #d1d5db", borderRadius:6, fontSize:12, color:"#6b7280", background:"none", cursor:"pointer", fontFamily:ff }}>
            + Add Line
          </button>

          {/* Totals row */}
          <div style={{ display:"flex", gap:20, justifyContent:"flex-end", padding:"10px 0", marginTop:8, borderTop:"1px solid #f0f0f4", fontSize:12 }}>
            <span><span style={{ color:"#9ca3af" }}>Debit </span><strong>{totalDebit.toFixed(2)}</strong></span>
            <span><span style={{ color:"#9ca3af" }}>Credit </span><strong>{totalCredit.toFixed(2)}</strong></span>
            <span style={{ fontWeight:700, color:balanced?"#16a34a":"#dc2626" }}>
              {balanced ? "✓ Balanced" : `✗ Diff ${Math.abs(totalDebit - totalCredit).toFixed(2)}`}
            </span>
          </div>

          {error && <div style={{ color:"#dc2626", fontSize:12, marginBottom:10 }}>{error}</div>}

          {/* Actions */}
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:4 }}>
            <Btn variant="outline" onClick={onClose}>Cancel</Btn>
            <Btn variant="primary" onClick={handleSave} disabled={!valid || saving}>
              {saving ? "Saving…" : "Post Entry"}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ADD ACCOUNT FORM ─────────────────────────────────────────────────────────

export function AddAccountForm({ userId, onClose, onSaved }) {
  const [code,        setCode]        = useState("");
  const [name,        setName]        = useState("");
  const [type,        setType]        = useState("asset");
  const [description, setDescription] = useState("");
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");

  const valid = code.trim() && name.trim();

  const handleSave = async () => {
    if (!valid) return;
    setSaving(true); setError("");
    try {
      const { error: err } = await supabase
        .from("accounts")
        .insert({
          user_id:     userId,
          code:        code.trim(),
          name:        name.trim(),
          type,
          description: description.trim() || null,
          is_system:   false,
        });
      if (err) throw err;
      onSaved();
    } catch (err) {
      setError(err.message || "Failed to save account");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#fff", borderRadius:12, width:"100%", maxWidth:440, boxShadow:"0 8px 40px rgba(0,0,0,0.18)", fontFamily:ff }}>
        <div style={{ padding:"16px 24px", borderBottom:"1px solid #e8e8ec", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ fontSize:15, fontWeight:700, color:"#1a1a2e" }}>New Account</span>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#6b7280", display:"flex", padding:4 }}><Icons.X /></button>
        </div>
        <div style={{ padding:"20px 24px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
            <Field label="Code" required>
              <Input value={code} onChange={setCode} placeholder="e.g. 1050" />
            </Field>
            <Field label="Type" required>
              <Select value={type} onChange={setType}
                options={ACCT_TYPES.map(t => ({ value: t, label: ACCT_LABELS[t] }))} />
            </Field>
          </div>
          <div style={{ marginBottom:12 }}>
            <Field label="Account Name" required>
              <Input value={name} onChange={setName} placeholder="e.g. Petty Cash" />
            </Field>
          </div>
          <div style={{ marginBottom:16 }}>
            <Field label="Description">
              <Input value={description} onChange={setDescription} placeholder="Optional note" />
            </Field>
          </div>
          {error && <div style={{ color:"#dc2626", fontSize:12, marginBottom:10 }}>{error}</div>}
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <Btn variant="outline" onClick={onClose}>Cancel</Btn>
            <Btn variant="primary" onClick={handleSave} disabled={!valid || saving}>
              {saving ? "Saving…" : "Add Account"}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── JOURNAL TAB ──────────────────────────────────────────────────────────────

function EntryRow({ entry, accounts }) {
  const [open, setOpen] = useState(false);
  const lines = entry.journal_lines || [];
  const totalDebit = lines.reduce((s, l) => s + (l.debit || 0), 0);

  const sourceBadge = {
    invoice: { label: "Invoice",  bg: "#eff6ff", color: "#1d4ed8" },
    payment: { label: "Payment",  bg: "#f0fdf4", color: "#15803d" },
    expense: { label: "Expense",  bg: "#fff7ed", color: "#c2410c" },
    manual:  { label: "Manual",   bg: "#faf5ff", color: "#7e22ce" },
    opening_balance: { label: "Opening", bg: "#f1f5f9", color: "#475569" },
    reversal:        { label: "Reversal", bg: "#fef2f2", color: "#b91c1c" },
  }[entry.source_type] || { label: entry.source_type, bg: "#f3f4f6", color: "#374151" };

  return (
    <>
      <tr
        onClick={() => setOpen(o => !o)}
        style={{ cursor:"pointer", borderBottom:"1px solid #f0f0f4", transition:"background 0.1s" }}
        onMouseEnter={e => e.currentTarget.style.background = "#fafaf9"}
        onMouseLeave={e => e.currentTarget.style.background = ""}
      >
        <td style={{ padding:"10px 12px", fontSize:12, color:"#6b7280", whiteSpace:"nowrap" }}>{fmtDate(entry.date)}</td>
        <td style={{ padding:"10px 12px", fontSize:13, color:"#1a1a2e", maxWidth:260 }}>
          <div style={{ fontWeight:500 }}>{entry.description}</div>
          {entry.reference && <div style={{ fontSize:11, color:"#9ca3af", marginTop:1 }}>{entry.reference}</div>}
        </td>
        <td style={{ padding:"10px 12px" }}>
          <span style={{ fontSize:11, fontWeight:600, padding:"2px 7px", borderRadius:10, background:sourceBadge.bg, color:sourceBadge.color }}>
            {sourceBadge.label}
          </span>
        </td>
        <td style={{ padding:"10px 12px", fontSize:13, color:"#1a1a2e", textAlign:"right", fontVariantNumeric:"tabular-nums" }}>
          {fmt(totalDebit)}
        </td>
        <td style={{ padding:"10px 12px", textAlign:"center", color:"#9ca3af", fontSize:11 }}>
          {open ? "▲" : "▼"}
        </td>
      </tr>
      {open && (
        <tr style={{ background:"#fafaf9" }}>
          <td colSpan={5} style={{ padding:"0 12px 10px 32px" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr>
                  {["Account", "Description", "Debit", "Credit"].map(h => (
                    <th key={h} style={{ textAlign: h === "Debit" || h === "Credit" ? "right" : "left", padding:"4px 8px", color:"#9ca3af", fontWeight:600, textTransform:"uppercase", fontSize:10, letterSpacing:"0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map(line => {
                  const acct = line.account || accounts.find(a => a.id === line.account_id);
                  return (
                    <tr key={line.id} style={{ borderTop:"1px solid #f0f0f4" }}>
                      <td style={{ padding:"5px 8px", color:"#374151" }}>
                        {acct ? <><span style={{ color:"#9ca3af" }}>{acct.code}</span> · {acct.name}</> : line.account_id}
                      </td>
                      <td style={{ padding:"5px 8px", color:"#6b7280" }}>{line.description || "—"}</td>
                      <td style={{ padding:"5px 8px", textAlign:"right", color: line.debit > 0 ? "#1a1a2e" : "#d1d5db", fontVariantNumeric:"tabular-nums" }}>
                        {line.debit > 0 ? fmt(line.debit) : "—"}
                      </td>
                      <td style={{ padding:"5px 8px", textAlign:"right", color: line.credit > 0 ? "#1a1a2e" : "#d1d5db", fontVariantNumeric:"tabular-nums" }}>
                        {line.credit > 0 ? fmt(line.credit) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}

export function JournalTab({ entries, accounts, loading, onNewEntry, canCreateManual }) {
  const [search,      setSearch]      = useState("");
  const [sourceFilter,setSourceFilter]= useState("all");
  const [period,      setPeriod]      = useState("this_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd,   setCustomEnd]   = useState("");

  const { start, end } = useMemo(
    () => getDateRange(period, customStart, customEnd),
    [period, customStart, customEnd]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return entries.filter(e => {
      if (e.date < start || e.date > end) return false;
      if (sourceFilter !== "all" && e.source_type !== sourceFilter) return false;
      if (q && !e.description?.toLowerCase().includes(q) && !e.reference?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [entries, start, end, sourceFilter, search]);

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:16, alignItems:"center" }}>
        <Select
          value={period}
          onChange={setPeriod}
          options={PERIODS}
          style={{ minWidth:140 }}
        />
        {period === "custom" && (
          <>
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
              style={{ padding:"7px 10px", border:"1px solid #e8e8ec", borderRadius:6, fontSize:13, fontFamily:ff, outline:"none" }} />
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
              style={{ padding:"7px 10px", border:"1px solid #e8e8ec", borderRadius:6, fontSize:13, fontFamily:ff, outline:"none" }} />
          </>
        )}
        <Select
          value={sourceFilter}
          onChange={setSourceFilter}
          options={SOURCE_OPTIONS}
          style={{ minWidth:140 }}
        />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search entries…"
          style={{ flex:1, minWidth:160, padding:"7px 10px", border:"1px solid #e8e8ec", borderRadius:6, fontSize:13, fontFamily:ff, outline:"none" }}
        />
        <Btn variant="primary" onClick={onNewEntry} style={{ whiteSpace:"nowrap" }} disabled={!canCreateManual}>
          + Manual Entry
        </Btn>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign:"center", padding:40, color:"#9ca3af", fontSize:14 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:48, color:"#9ca3af" }}>
          <div style={{ fontSize:32, marginBottom:8 }}>📒</div>
          <div style={{ fontSize:14, fontWeight:500 }}>No journal entries found</div>
          <div style={{ fontSize:12, marginTop:4 }}>Try adjusting the period or filters</div>
        </div>
      ) : (
        <div style={{ overflowX:"auto", borderRadius:8, border:"1px solid #e8e8ec" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:ff }}>
            <thead>
              <tr style={{ background:"#fafaf9", borderBottom:"1px solid #e8e8ec" }}>
                {["Date", "Description", "Source", "Amount", ""].map(h => (
                  <th key={h} style={{
                    padding:"9px 12px", fontSize:11, fontWeight:700, color:"#6b7280",
                    textTransform:"uppercase", letterSpacing:"0.06em",
                    textAlign: h === "Amount" ? "right" : "left",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(entry => (
                <EntryRow key={entry.id} entry={entry} accounts={accounts} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer count */}
      {!loading && filtered.length > 0 && (
        <div style={{ marginTop:8, fontSize:12, color:"#9ca3af", textAlign:"right" }}>
          {filtered.length} entr{filtered.length === 1 ? "y" : "ies"}
        </div>
      )}
    </div>
  );
}

// ─── ACCOUNTS TAB ─────────────────────────────────────────────────────────────

function computeBalances(accounts, allEntries) {
  // Build a map: account_id -> { debit, credit }
  const map = {};
  for (const entry of allEntries) {
    for (const line of (entry.journal_lines || [])) {
      if (!map[line.account_id]) map[line.account_id] = { debit: 0, credit: 0 };
      map[line.account_id].debit  += line.debit  || 0;
      map[line.account_id].credit += line.credit || 0;
    }
  }
  return accounts.map(a => {
    const b = map[a.id] || { debit: 0, credit: 0 };
    // Normal balance: assets/expenses → debit normal; liabilities/equity/revenue → credit normal
    const normalDebit = a.type === "asset" || a.type === "expense";
    const balance = normalDebit ? b.debit - b.credit : b.credit - b.debit;
    return { ...a, totalDebit: b.debit, totalCredit: b.credit, balance };
  });
}

export function AccountsTab({ accounts, allEntries, loading, onNewAccount, onSeeded, userId }) {
  const [search,   setSearch]   = useState("");
  const [seeding,  setSeeding]  = useState(false);
  const [seedErr,  setSeedErr]  = useState("");

  const handleSeed = async () => {
    if (!userId) return;
    setSeeding(true); setSeedErr("");
    try {
      await seedAccountsForUser(userId, supabase);
      onSeeded?.();
    } catch (err) {
      setSeedErr(err.message || "Failed to initialise accounts");
    } finally {
      setSeeding(false);
    }
  };

  const withBalances = useMemo(
    () => computeBalances(accounts, allEntries),
    [accounts, allEntries]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return withBalances;
    return withBalances.filter(a =>
      a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q)
    );
  }, [withBalances, search]);

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display:"flex", gap:8, marginBottom:16, alignItems:"center" }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search accounts…"
          style={{ flex:1, padding:"7px 10px", border:"1px solid #e8e8ec", borderRadius:6, fontSize:13, fontFamily:ff, outline:"none" }}
        />
        <Btn variant="primary" onClick={onNewAccount} disabled={!userId}>+ Add Account</Btn>
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:40, color:"#9ca3af", fontSize:14 }}>Loading…</div>
      ) : accounts.length === 0 ? (
        <div style={{ textAlign:"center", padding:"48px 24px", border:"1px dashed #e8e8ec", borderRadius:12, background:"#fafaf9" }}>
          <div style={{ fontSize:36, marginBottom:12 }}>📂</div>
          <div style={{ fontSize:15, fontWeight:700, color:"#1a1a2e", marginBottom:6 }}>No accounts yet</div>
          <div style={{ fontSize:13, color:"#6b7280", marginBottom:20, maxWidth:360, margin:"0 auto 20px" }}>
            Initialise your Chart of Accounts with 20 standard double-entry accounts to get started.
          </div>
          {seedErr && <div style={{ color:"#dc2626", fontSize:12, marginBottom:10 }}>{seedErr}</div>}
          <Btn variant="primary" onClick={handleSeed} disabled={seeding || !userId}>
            {seeding ? "Initialising…" : "Initialise Chart of Accounts"}
          </Btn>
        </div>
      ) : (
        ACCT_TYPES.map(type => {
          const group = filtered.filter(a => a.type === type);
          if (group.length === 0) return null;
          const typeTotal = group.reduce((s, a) => s + a.balance, 0);
          return (
            <div key={type} style={{ marginBottom:24 }}>
              {/* Group header */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:10, height:10, borderRadius:2, background:TYPE_COLORS[type] }} />
                  <span style={{ fontSize:12, fontWeight:700, color:"#374151", textTransform:"uppercase", letterSpacing:"0.07em" }}>
                    {ACCT_LABELS[type]}
                  </span>
                  <span style={{ fontSize:11, color:"#9ca3af" }}>({group.length})</span>
                </div>
                <span style={{ fontSize:12, fontWeight:700, color:"#374151", fontVariantNumeric:"tabular-nums" }}>
                  {CUR_SYM}{fmt(Math.abs(typeTotal))}
                </span>
              </div>

              {/* Accounts table */}
              <div style={{ border:"1px solid #e8e8ec", borderRadius:8, overflow:"hidden" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:ff }}>
                  <thead>
                    <tr style={{ background:"#fafaf9", borderBottom:"1px solid #e8e8ec" }}>
                      {["Code", "Name", "Debit", "Credit", "Balance"].map(h => (
                        <th key={h} style={{
                          padding:"8px 12px", fontSize:10, fontWeight:700, color:"#9ca3af",
                          textTransform:"uppercase", letterSpacing:"0.06em",
                          textAlign: ["Debit","Credit","Balance"].includes(h) ? "right" : "left",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {group.map((a, idx) => (
                      <tr key={a.id} style={{ borderTop: idx > 0 ? "1px solid #f0f0f4" : "none" }}>
                        <td style={{ padding:"9px 12px", fontSize:12, color:"#6b7280", fontWeight:600, whiteSpace:"nowrap" }}>{a.code}</td>
                        <td style={{ padding:"9px 12px", fontSize:13, color:"#1a1a2e" }}>
                          {a.name}
                          {a.is_system && <span style={{ marginLeft:6, fontSize:10, color:"#9ca3af", border:"1px solid #e8e8ec", borderRadius:4, padding:"1px 4px" }}>system</span>}
                        </td>
                        <td style={{ padding:"9px 12px", fontSize:12, textAlign:"right", color:"#374151", fontVariantNumeric:"tabular-nums" }}>
                          {a.totalDebit > 0 ? fmt(a.totalDebit) : "—"}
                        </td>
                        <td style={{ padding:"9px 12px", fontSize:12, textAlign:"right", color:"#374151", fontVariantNumeric:"tabular-nums" }}>
                          {a.totalCredit > 0 ? fmt(a.totalCredit) : "—"}
                        </td>
                        <td style={{ padding:"9px 12px", fontSize:13, textAlign:"right", fontWeight:600, fontVariantNumeric:"tabular-nums",
                          color: a.balance >= 0 ? "#1a1a2e" : "#dc2626" }}>
                          {CUR_SYM}{fmt(Math.abs(a.balance))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── P&L TAB ──────────────────────────────────────────────────────────────────

export function PLTab({ accounts, allEntries, hasLedgerAccess }) {
  const [period,      setPeriod]      = useState("this_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd,   setCustomEnd]   = useState("");

  const { start, end } = useMemo(
    () => getDateRange(period, customStart, customEnd),
    [period, customStart, customEnd]
  );

  // Filter entries by period, then compute per-account totals
  const periodEntries = useMemo(
    () => allEntries.filter(e => e.date >= start && e.date <= end),
    [allEntries, start, end]
  );

  const balances = useMemo(
    () => computeBalances(accounts, periodEntries),
    [accounts, periodEntries]
  );

  const revenueAccounts = balances.filter(a => a.type === "revenue");
  const expenseAccounts = balances.filter(a => a.type === "expense");

  const totalRevenue  = revenueAccounts.reduce((s, a) => s + a.balance, 0);
  const totalExpenses = expenseAccounts.reduce((s, a) => s + a.balance, 0);
  const netProfit     = totalRevenue - totalExpenses;

  const Section = ({ title, rows, total, color }) => (
    <div style={{ marginBottom:24 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8, paddingBottom:6, borderBottom:"2px solid #e8e8ec" }}>
        <span style={{ fontSize:13, fontWeight:700, color:"#374151", textTransform:"uppercase", letterSpacing:"0.07em" }}>{title}</span>
        <span style={{ fontSize:13, fontWeight:700, color, fontVariantNumeric:"tabular-nums" }}>{CUR_SYM}{fmt(total)}</span>
      </div>
      {rows.length === 0 ? (
        <div style={{ fontSize:13, color:"#9ca3af", padding:"8px 0" }}>No activity in period</div>
      ) : (
        rows.filter(a => a.balance !== 0).map(a => (
          <div key={a.id} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:"1px solid #f5f5f7" }}>
            <span style={{ fontSize:13, color:"#374151" }}>
              <span style={{ color:"#9ca3af", fontSize:11, marginRight:6 }}>{a.code}</span>{a.name}
            </span>
            <span style={{ fontSize:13, color:"#1a1a2e", fontVariantNumeric:"tabular-nums" }}>{CUR_SYM}{fmt(a.balance)}</span>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div>
      {!hasLedgerAccess && (
        <div style={{ marginBottom:16, border:"1px solid #fde68a", background:"#fffbeb", borderRadius:8, padding:"12px 14px", color:"#92400e", fontSize:13 }}>
          Connect with a Supabase-authenticated account to view and post General Ledger data.
        </div>
      )}
      {/* Period picker */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:24, alignItems:"center" }}>
        <Select value={period} onChange={setPeriod} options={PERIODS} style={{ minWidth:140 }} />
        {period === "custom" && (
          <>
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
              style={{ padding:"7px 10px", border:"1px solid #e8e8ec", borderRadius:6, fontSize:13, fontFamily:ff, outline:"none" }} />
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
              style={{ padding:"7px 10px", border:"1px solid #e8e8ec", borderRadius:6, fontSize:13, fontFamily:ff, outline:"none" }} />
          </>
        )}
        <span style={{ marginLeft:"auto", fontSize:11, color:"#9ca3af", background:"#f5f5f7", padding:"4px 10px", borderRadius:20, border:"1px solid #e8e8ec" }}>
          Data source: General Ledger
        </span>
      </div>

      {/* Net profit hero */}
      <div style={{ background: netProfit >= 0 ? "#f0fdf4" : "#fef2f2", border:`1px solid ${netProfit >= 0 ? "#bbf7d0" : "#fecaca"}`, borderRadius:10, padding:"20px 24px", marginBottom:28, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:"#6b7280", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4 }}>Net Profit</div>
          <div style={{ fontSize:28, fontWeight:700, color: netProfit >= 0 ? "#15803d" : "#dc2626", fontVariantNumeric:"tabular-nums", letterSpacing:-0.5 }}>
            {netProfit < 0 ? "−" : ""}{CUR_SYM}{fmt(Math.abs(netProfit))}
          </div>
          <div style={{ fontSize:12, color:"#9ca3af", marginTop:2 }}>
            {fmtDate(start)} – {fmtDate(end)}
          </div>
        </div>
        <div style={{ fontSize:40 }}>{netProfit >= 0 ? "📈" : "📉"}</div>
      </div>

      <Section title="Revenue" rows={revenueAccounts} total={totalRevenue} color="#15803d" />
      <Section title="Expenses" rows={expenseAccounts} total={totalExpenses} color="#b45309" />

      {/* Summary line */}
      <div style={{ display:"flex", justifyContent:"space-between", padding:"12px 0", borderTop:"2px solid #1a1a2e", marginTop:4 }}>
        <span style={{ fontSize:14, fontWeight:700, color:"#1a1a2e" }}>Net Profit / Loss</span>
        <span style={{ fontSize:14, fontWeight:700, color: netProfit >= 0 ? "#15803d" : "#dc2626", fontVariantNumeric:"tabular-nums" }}>
          {netProfit < 0 ? "−" : ""}{CUR_SYM}{fmt(Math.abs(netProfit))}
        </span>
      </div>
    </div>
  );
}

// ─── MAIN LEDGER PAGE ─────────────────────────────────────────────────────────

const TABS = [
  { id: "journal",  label: "Journal" },
  { id: "accounts", label: "Chart of Accounts" },
  { id: "pl",       label: "P&L" },
];

export default function LedgerPage() {
  const { user } = useContext(AppCtx);

  const [tab,            setTab]            = useState("journal");
  const [accounts,       setAccounts]       = useState([]);
  const [entries,        setEntries]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [userId,         setUserId]         = useState(null);
  const [showManual,     setShowManual]     = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [actionError,    setActionError]    = useState("");

  // Fetch auth user id + accounts + journal entries
  const load = async () => {
    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id ??user?.id ?? null;
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

      {/* Modals */}
      {showManual && userId && (
        <ManualEntryForm
          accounts={accounts}
          userId={userId}
          onClose={() => setShowManual(false)}
          onSaved={handleSaved}
        />
      )}
      {showAddAccount && userId && (
        <AddAccountForm
          userId={userId}
          onClose={() => setShowAddAccount(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
