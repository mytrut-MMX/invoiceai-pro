import { useState, useMemo } from "react";
import { ff } from "../../constants";
import { Select } from "../../components/atoms";
import { fmt, fmtDate } from "../../utils/helpers";
import { useCurrSym, PERIODS, getDateRange, computeBalances } from "./shared";

export default function PLTab({ accounts, allEntries, hasLedgerAccess }) {
  const currSym = useCurrSym();
  const [period,      setPeriod]      = useState("this_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd,   setCustomEnd]   = useState("");

  const { start, end } = useMemo(
    () => getDateRange(period, customStart, customEnd),
    [period, customStart, customEnd]
  );

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
        <span style={{ fontSize:13, fontWeight:700, color, fontVariantNumeric:"tabular-nums" }}>{fmt(currSym, total)}</span>
      </div>
      {rows.length === 0 ? (
        <div style={{ fontSize:13, color:"#9ca3af", padding:"8px 0" }}>No activity in period</div>
      ) : (
        rows.filter(a => a.balance !== 0).map(a => (
          <div key={a.id} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:"1px solid #f5f5f7" }}>
            <span style={{ fontSize:13, color:"#374151" }}>
              <span style={{ color:"#9ca3af", fontSize:11, marginRight:6 }}>{a.code}</span>{a.name}
            </span>
            <span style={{ fontSize:13, color:"#1a1a2e", fontVariantNumeric:"tabular-nums" }}>{fmt(currSym, a.balance)}</span>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div>
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
            {netProfit < 0 ? "−" : ""}{fmt(currSym, Math.abs(netProfit))}
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
          {netProfit < 0 ? "−" : ""}{fmt(currSym, Math.abs(netProfit))}
        </span>
      </div>
    </div>
  );
}
