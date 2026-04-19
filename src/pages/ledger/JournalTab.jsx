import { useState, useMemo } from "react";
import EmptyState from "../../components/ui/EmptyState";
import { Icons } from "../../components/icons";
import { Btn, Select } from "../../components/atoms";
import { fmt, fmtDate } from "../../utils/helpers";
import { useCurrSym, PERIODS, SOURCE_OPTIONS, getDateRange } from "./shared";

function EntryRow({ entry, accounts, currSym }) {
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
          {fmt(currSym, totalDebit)}
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
                        {line.debit > 0 ? fmt(currSym, line.debit) : "—"}
                      </td>
                      <td style={{ padding:"5px 8px", textAlign:"right", color: line.credit > 0 ? "#1a1a2e" : "#d1d5db", fontVariantNumeric:"tabular-nums" }}>
                        {line.credit > 0 ? fmt(currSym, line.credit) : "—"}
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

export default function JournalTab({ entries, accounts, loading, onNewEntry, canCreateManual, accountFilter = "", onClearAccountFilter }) {
  const currSym = useCurrSym();
  const [search,       setSearch]       = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [period,       setPeriod]       = useState(accountFilter ? "this_year" : "this_month");
  const [customStart,  setCustomStart]  = useState("");
  const [customEnd,    setCustomEnd]    = useState("");

  const { start, end } = useMemo(
    () => getDateRange(period, customStart, customEnd),
    [period, customStart, customEnd]
  );

  const filteredAccount = accounts.find(a => a.id === accountFilter);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return entries.filter(e => {
      if (e.date < start || e.date > end) return false;
      if (sourceFilter !== "all" && e.source_type !== sourceFilter) return false;
      if (q && !e.description?.toLowerCase().includes(q) && !e.reference?.toLowerCase().includes(q)) return false;
      if (accountFilter && !e.journal_lines?.some(l => l.account_id === accountFilter)) return false;
      return true;
    });
  }, [entries, start, end, sourceFilter, search, accountFilter]);

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:16, alignItems:"center" }}>
        <Select value={period} onChange={setPeriod} options={PERIODS} style={{ minWidth:140 }} />
        {period === "custom" && (
          <>
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
              style={{ padding:"7px 10px", border:"1px solid #e8e8ec", borderRadius:6, fontSize:13, outline:"none" }} />
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
              style={{ padding:"7px 10px", border:"1px solid #e8e8ec", borderRadius:6, fontSize:13, outline:"none" }} />
          </>
        )}
        <Select value={sourceFilter} onChange={setSourceFilter} options={SOURCE_OPTIONS} style={{ minWidth:140 }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search entries…"
          style={{ flex:1, minWidth:160, padding:"7px 10px", border:"1px solid #e8e8ec", borderRadius:6, fontSize:13, outline:"none" }}
        />
        <Btn variant="primary" onClick={onNewEntry} style={{ whiteSpace:"nowrap" }} disabled={!canCreateManual}>
          + Manual Entry
        </Btn>
      </div>

      {/* Account filter chip */}
      {accountFilter && (
        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:12, flexWrap:"wrap" }}>
          <span style={{ fontSize:11, fontWeight:600, color:"#6b7280", textTransform:"uppercase", letterSpacing:"0.06em" }}>Filtered by:</span>
          <span style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"3px 10px", background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:20, fontSize:12, color:"#1d4ed8", fontWeight:600 }}>
            {filteredAccount ? `${filteredAccount.code} – ${filteredAccount.name}` : accountFilter}
            <button
              onClick={onClearAccountFilter}
              style={{ background:"none", border:"none", cursor:"pointer", color:"#60a5fa", fontWeight:700, fontSize:14, lineHeight:1, padding:0, display:"flex", alignItems:"center" }}
              title="Clear account filter"
            >×</button>
          </span>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ textAlign:"center", padding:40, color:"#9ca3af", fontSize:14 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Icons.Bank}
          title="No journal entries found"
          description="Try adjusting the period or filters"
        />
      ) : (
        <div style={{ overflowX:"auto", borderRadius:8, border:"1px solid #e8e8ec" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
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
                <EntryRow key={entry.id} entry={entry} accounts={accounts} currSym={currSym} />
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
