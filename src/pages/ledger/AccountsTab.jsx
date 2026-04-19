import { useState, useMemo } from "react";
import { Btn } from "../../components/atoms";
import { supabase } from "../../lib/supabase";
import { fmt } from "../../utils/helpers";
import { seedAccountsForUser } from "../../utils/ledger/defaultAccounts";
import { useCurrSym, ACCT_TYPES, ACCT_LABELS, TYPE_COLORS, computeBalances } from "./shared";

export default function AccountsTab({ accounts, allEntries, loading, onNewAccount, onSeeded, userId }) {
  const currSym = useCurrSym();
  const [search,  setSearch]  = useState("");
  const [seeding, setSeeding] = useState(false);
  const [seedErr, setSeedErr] = useState("");

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
          style={{ flex:1, padding:"7px 10px", border:"1px solid #e8e8ec", borderRadius:6, fontSize:13, outline:"none" }}
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
                  {fmt(currSym, Math.abs(typeTotal))}
                </span>
              </div>

              {/* Accounts table */}
              <div style={{ border:"1px solid #e8e8ec", borderRadius:8, overflow:"hidden" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
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
                          {a.totalDebit > 0 ? fmt(currSym, a.totalDebit) : "—"}
                        </td>
                        <td style={{ padding:"9px 12px", fontSize:12, textAlign:"right", color:"#374151", fontVariantNumeric:"tabular-nums" }}>
                          {a.totalCredit > 0 ? fmt(currSym, a.totalCredit) : "—"}
                        </td>
                        <td style={{ padding:"9px 12px", fontSize:13, textAlign:"right", fontWeight:600, fontVariantNumeric:"tabular-nums",
                          color: a.balance >= 0 ? "#1a1a2e" : "#dc2626" }}>
                          {fmt(currSym, Math.abs(a.balance))}
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
