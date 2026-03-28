import { useState, useRef, useEffect, useMemo, useContext } from "react";
import { ff } from "../constants";
import { Icons } from "../components/icons";
import { AppCtx } from "../context/AppContext";
import { fmt, parseCisRate } from "../utils/helpers";
import { CUR_SYM } from "../constants";

export default function HomePage({ user, onNavigate }) {
  const { invoices, expenses, payments, orgSettings } = useContext(AppCtx);
  const [reportPeriod, setReportPeriod] = useState("this_month");
  const [aiInput, setAiInput] = useState("");
  const [messages, setMessages] = useState([{ role:"assistant", text:`Hi ${user?.name?.split(" ")[0]||"there"}  I'm your InvoiceSaga assistant. Ask me anything!` }]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({ behavior:"smooth" }); },[messages]);

  const send = async () => {
    if(!aiInput.trim()||loading) return;
    const msg = aiInput.trim();
    setAiInput("");
    setMessages(p=>[...p,{ role:"user", text:msg }]);
    setLoading(true);
    try {
      const res = await fetch("/api/claude-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: "You are an AI assistant for an invoicing platform called InvoiceSaga. Help users with invoices, customers, VAT, CIS, payments. Be concise.",
          messages: [{ role: "user", content: msg }]
        })
      });
      const data = await res.json();
      setMessages(p=>[...p,{ role:"assistant", text:data.content?.[0]?.text || "Sorry, couldn't process that." }]);
    } catch {
      setMessages(p=>[...p,{ role:"assistant", text:"Connection issue. Please try again." }]);
    }
    setLoading(false);
  };

  const currencySymbol = CUR_SYM[orgSettings?.currency||"GBP"] || "£";
  const periodInvoices = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const inRange = (invoiceDate) => {
      const d = invoiceDate ? new Date(invoiceDate) : null;
      if (!d || Number.isNaN(d.getTime())) return reportPeriod === "all_time";
      if (reportPeriod === "this_month") return d >= startOfMonth && d < startOfNextMonth;
      if (reportPeriod === "last_month") return d >= startOfLastMonth && d < startOfMonth;
      if (reportPeriod === "this_quarter") return d >= startOfQuarter && d < startOfNextMonth;
      if (reportPeriod === "this_year") return d >= startOfYear;
      return true;
    };

    return invoices.filter(inv => inRange(inv.issue_date));
  }, [invoices, reportPeriod]);

  const stats = useMemo(() => {
    const outstanding = invoices.filter(i=>["Sent","Partial"].includes(i.status)).reduce((sum,i)=>sum+Number(i.total||0),0);
    const overdue = invoices.filter(i=>i.status==="Overdue").reduce((sum,i)=>sum+Number(i.total||0),0);
    const paid = invoices.filter(i=>i.status==="Paid").reduce((sum,i)=>sum+Number(i.total||0),0);
    const draft = invoices.filter(i=>i.status==="Draft").reduce((sum,i)=>sum+Number(i.total||0),0);
    const vatDue = orgSettings?.vatReg === "Yes"
      ? invoices.reduce((sum, inv)=>sum + (inv.taxBreakdown||[]).reduce((t,tx)=>t+Number(tx.amount||0),0),0)
      : 0;
    const cisRate = parseCisRate(orgSettings?.cisRate, 20) / 100;
    const cisTracked = orgSettings?.cisReg === "Yes"
      ? invoices.reduce((sum, inv)=> sum + Number(inv.cisDeduction || (Number(inv.subtotal||0) * cisRate)), 0)
      : 0;

    return [
     { label:"Outstanding", value:fmt(currencySymbol, outstanding), sub:`${invoices.filter(i=>["Sent","Partial"].includes(i.status)).length} invoices`, color:"#1e6be0" },
      { label:"Overdue", value:fmt(currencySymbol, overdue), sub:`${invoices.filter(i=>i.status==="Overdue").length} invoices`, color:"#dc2626" },
      { label:"Paid", value:fmt(currencySymbol, paid), sub:"Received", color:"#059669" },
      { label:"Draft", value:fmt(currencySymbol, draft), sub:"Needs action", color:"#6b7280" },
      { label:"VAT Tracked", value: orgSettings?.vatReg === "Yes" ? fmt(currencySymbol, vatDue) : "Disabled", sub: orgSettings?.vatReg === "Yes" ? "Output VAT" : "Enable VAT in Settings", color:"#2563EB" },
      { label:"CIS Tracked", value: orgSettings?.cisReg === "Yes" ? fmt(currencySymbol, cisTracked) : "Disabled", sub: orgSettings?.cisReg === "Yes" ? "CIS deductions" : "Enable CIS in Settings", color:"#7C3AED" },
    ];
  }, [invoices, orgSettings, currencySymbol]);

  const reportSummary = useMemo(() => {
    const now = new Date();
    const startOfMonth    = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth= new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startOfLastMonth= new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfQuarter  = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const startOfYear     = new Date(now.getFullYear(), 0, 1);
    const inRange = (dateStr) => {
      const d = dateStr ? new Date(dateStr) : null;
      if (!d || Number.isNaN(d.getTime())) return reportPeriod === "all_time";
      if (reportPeriod === "this_month")    return d >= startOfMonth && d < startOfNextMonth;
      if (reportPeriod === "last_month")    return d >= startOfLastMonth && d < startOfMonth;
      if (reportPeriod === "this_quarter")  return d >= startOfQuarter && d < startOfNextMonth;
      if (reportPeriod === "this_year")     return d >= startOfYear;
      return true;
    };

    const revenue = periodInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
    const vat = periodInvoices.reduce((sum, inv)=>sum + (inv.taxBreakdown||[]).reduce((t,tx)=>t+Number(tx.amount||0),0),0);
    const cis = periodInvoices.reduce((sum, inv)=>sum + Number(inv.cisDeduction || 0), 0);
    const reportByStatus = periodInvoices.reduce((acc, inv) => {
      const key = inv.status || "Draft";
      if (!acc[key]) acc[key] = { count: 0, amount: 0 };
      acc[key].count += 1;
      acc[key].amount += Number(inv.total || 0);
      return acc;
    }, {});

    const totalExpenses = (expenses || [])
      .filter(e => inRange(e.date))
      .reduce((sum, e) => sum + Number(e.total || 0), 0);
    const netProfit = revenue - totalExpenses;

    return { revenue, vat, cis, reportByStatus, totalExpenses, netProfit };
  }, [periodInvoices, expenses, reportPeriod]);

  const cashFlow = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    const d30   = new Date(today); d30.setDate(today.getDate() + 30);
    const d60   = new Date(today); d60.setDate(today.getDate() + 60);
    const d90   = new Date(today); d90.setDate(today.getDate() + 90);

    const buckets = { overdue:0, next30:0, next60:0, next90:0 };

    invoices
      .filter(inv => (inv.status === "Sent" || inv.status === "Partial" || inv.status === "Overdue") && inv.due_date)
      .forEach(inv => {
        const due = new Date(inv.due_date); due.setHours(0,0,0,0);
        const paid = (payments || [])
          .filter(p => p.invoice_id === inv.id)
          .reduce((s, p) => s + Number(p.amount || 0), 0);
        const outstanding = Math.max(0, Number(inv.total || 0) - paid);
        if (outstanding === 0) return;
        if (due < today)      buckets.overdue += outstanding;
        else if (due <= d30)  buckets.next30  += outstanding;
        else if (due <= d60)  buckets.next60  += outstanding;
        else if (due <= d90)  buckets.next90  += outstanding;
      });

    const total = buckets.overdue + buckets.next30 + buckets.next60 + buckets.next90;
    return { ...buckets, total };
  }, [invoices, payments]);

    return (
    <div style={{ padding:"clamp(14px,4vw,28px) clamp(12px,4vw,32px)", maxWidth:1100, fontFamily:ff, background:"#f4f5f7", minHeight:"100vh" }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:20, fontWeight:700, color:"#1a1a2e", margin:"0 0 3px" }}>
          Good morning, {user?.name?.split(" ")[0]||"there"} 👋
        </h1>
        <p style={{ color:"#6b7280", fontSize:12, margin:0 }}>Sunday, 8 March 2026 · Financial overview</p>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12, marginBottom:24 }}>
        {stats.map(s=>(
          <div key={s.label} style={{ background:"#fff", borderRadius:12, padding:"16px 18px", border:"1px solid #e8e8ec", boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize:11, fontWeight:600, color:"#6b7280", letterSpacing:"0.06em", marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:20, fontWeight:800, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:11, color:"#AAA", marginTop:2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* AI Chat */}
      <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e8e8ec", boxShadow:"0 1px 3px rgba(0,0,0,0.04)", overflow:"hidden", marginBottom:24 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 18px", borderBottom:"1px solid #F0F0F0", background:"#f9fafb" }}>
          <div style={{ width:28, height:28, background:"#1e6be0", borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff" }}><Icons.Bot /></div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:"#059669" }}>AI Assistant</div>
            <div style={{ fontSize:11, color:"#AAA" }}>Powered by Claude</div>
          </div>
          <div style={{ marginLeft:"auto", width:7, height:7, borderRadius:"50%", background:"#16A34A" }} />
        </div>
        <div style={{ height:200, overflowY:"auto", padding:"16px 18px", display:"flex", flexDirection:"column", gap:10 }}>
          {messages.map((m,i)=>(
            <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
              {m.role==="assistant" && (
                <div style={{ width:22, height:22, background:"#1e6be0", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", marginRight:7, marginTop:2, flexShrink:0 }}><Icons.Bot /></div>
              )}
              <div style={{ maxWidth:"72%", padding:"9px 13px", borderRadius:m.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px", background:m.role==="user"?"#1e6be0":"#F4F4F4", color:m.role==="user"?"#fff":"#1A1A1A", fontSize:13, lineHeight:1.6, whiteSpace:"pre-wrap" }}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display:"flex", gap:4, padding:"9px 13px", background:"#F4F4F4", borderRadius:"14px 14px 14px 4px", width:"fit-content" }}>
              {[0,1,2].map(i=><div key={i} style={{ width:6, height:6, borderRadius:"50%", background:"#CCC", animation:`pulse 1.2s ${i*0.2}s infinite` }} />)}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div style={{ padding:"8px 12px", borderTop:"1px solid #F0F0F0", display:"flex", gap:7 }}>
          <input value={aiInput} onChange={e=>setAiInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}
            placeholder="Ask about invoices, VAT, CIS…"
            style={{ flex:1, padding:"9px 13px", border:"1.5px solid #E8E8E8", borderRadius:9, fontSize:13, fontFamily:ff, outline:"none", background:"#f9fafb" }} />
          <button onClick={send} disabled={loading}
            style={{ width:36, height:36, background:loading?"#e5e7eb":"#1e6be0", border:"none", borderRadius:8, cursor:loading?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff" }}>
            <Icons.Send />
          </button>
        </div>
      </div>

      {/* Reports Center */}
      <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e8e8ec", boxShadow:"0 1px 3px rgba(0,0,0,0.04)", padding:"14px 16px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, flexWrap:"wrap", marginBottom:14 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:800, color:"#059669" }}>Reports Center</div>
            <div style={{ fontSize:12, color:"#6b7280", marginTop:2 }}>Overview based on selected period</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:12, color:"#666", fontWeight:600 }}>Period</span>
            <select
              value={reportPeriod}
              onChange={e=>setReportPeriod(e.target.value)}
              style={{ padding:"7px 10px", border:"1px solid #e8e8ec", borderRadius:7, fontSize:12, fontFamily:ff, background:"#f9fafb", outline:"none", cursor:"pointer" }}
            >
              <option value="this_month">This month</option>
              <option value="last_month">Last month</option>
              <option value="this_quarter">This quarter</option>
              <option value="this_year">This year</option>
              <option value="all_time">All time</option>
            </select>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:10, marginBottom:14 }}>
          {[
            { label:"Invoices", value:periodInvoices.length, color:"#059669" },
            { label:"Revenue", value:fmt(currencySymbol, reportSummary.revenue), color:"#16A34A" },
            { label:"VAT", value:fmt(currencySymbol, reportSummary.vat), color:"#2563EB" },
            { label:"CIS", value:fmt(currencySymbol, reportSummary.cis), color:"#7C3AED" },
            { label:"Expenses", value:fmt(currencySymbol, reportSummary.totalExpenses), color:"#DC2626" },
            { label:"Net Profit", value:fmt(currencySymbol, reportSummary.netProfit), color:reportSummary.netProfit >= 0 ? "#16A34A" : "#DC2626" },
          ].map(card => (
            <div key={card.label} style={{ border:"1px solid #EFEFEF", borderRadius:10, padding:"10px 12px", background:"#FCFCFC" }}>
              <div style={{ fontSize:11, color:"#6b7280", textTransform:"uppercase", fontWeight:700, letterSpacing:"0.05em" }}>{card.label}</div>
              <div style={{ fontSize:16, color:card.color, fontWeight:800, marginTop:5 }}>{card.value}</div>
            </div>
          ))}
        </div>

        <div style={{ border:"1px solid #e8e8ec", borderRadius:8, overflow:"hidden" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1.5fr 1fr 1fr", padding:"9px 12px", background:"#f9fafb", borderBottom:"1px solid #F0F0F0", fontSize:11, color:"#6b7280", fontWeight:700, textTransform:"uppercase" }}>
            <span>Status</span><span style={{ textAlign:"center" }}>Count</span><span style={{ textAlign:"right" }}>Amount</span>
          </div>
          {Object.keys(reportSummary.reportByStatus).length === 0 ? (
            <div style={{ padding:"12px", fontSize:12, color:"#AAA", textAlign:"center" }}>No invoices in selected period.</div>
          ) : Object.entries(reportSummary.reportByStatus).map(([status, row]) => (
            <div key={status} style={{ display:"grid", gridTemplateColumns:"1.5fr 1fr 1fr", padding:"9px 12px", borderBottom:"1px solid #F7F7F7", fontSize:12, color:"#333" }}>
              <span>{status}</span>
              <span style={{ textAlign:"center" }}>{row.count}</span>
              <span style={{ textAlign:"right", fontWeight:700 }}>{fmt(currencySymbol, row.amount)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cash Flow Forecast */}
      <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e8e8ec", boxShadow:"0 1px 3px rgba(0,0,0,0.04)", padding:"14px 16px", marginTop:16 }}>
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:15, fontWeight:800, color:"#1A1A1A" }}>Cash Flow Forecast</div>
          <div style={{ fontSize:12, color:"#6b7280", marginTop:2 }}>Outstanding invoices by due date · net of payments received</div>
        </div>

        {cashFlow.total === 0 ? (
          <div style={{ fontSize:13, color:"#AAA", textAlign:"center", padding:"20px 0" }}>No outstanding invoices.</div>
        ) : (<>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:10, marginBottom:16 }}>
            {[
              { label:"Overdue",     value:cashFlow.overdue, color:"#DC2626", bg:"#FEF2F2", border:"#FECACA" },
              { label:"Next 30 days",value:cashFlow.next30,  color:"#D97706", bg:"#FFFBEB", border:"#FDE68A" },
              { label:"31–60 days",  value:cashFlow.next60,  color:"#2563EB", bg:"#EFF6FF", border:"#BFDBFE" },
              { label:"61–90 days",  value:cashFlow.next90,  color:"#475569", bg:"#F8FAFC", border:"#E2E8F0" },
            ].map(b => (
              <div key={b.label} style={{ border:`1px solid ${b.border}`, borderRadius:10, padding:"12px 14px", background:b.bg }}>
                <div style={{ fontSize:11, color:b.color, textTransform:"uppercase", fontWeight:700, letterSpacing:"0.05em", marginBottom:6 }}>{b.label}</div>
                <div style={{ fontSize:18, fontWeight:800, color:b.color }}>{fmt(currencySymbol, b.value)}</div>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {[
              { label:"Overdue",     value:cashFlow.overdue, color:"#DC2626" },
              { label:"Next 30 days",value:cashFlow.next30,  color:"#D97706" },
              { label:"31–60 days",  value:cashFlow.next60,  color:"#2563EB" },
              { label:"61–90 days",  value:cashFlow.next90,  color:"#475569" },
            ].filter(b => b.value > 0).map(b => (
              <div key={b.label} style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:90, fontSize:11, color:"#6b7280", fontWeight:600, flexShrink:0, textAlign:"right" }}>{b.label}</div>
                <div style={{ flex:1, background:"#F1F5F9", borderRadius:4, height:10, overflow:"hidden" }}>
                  <div style={{ width:`${Math.round((b.value / cashFlow.total) * 100)}%`, height:"100%", background:b.color, borderRadius:4, transition:"width 0.4s ease" }} />
                </div>
                <div style={{ width:80, fontSize:12, fontWeight:700, color:b.color, textAlign:"right", flexShrink:0 }}>{fmt(currencySymbol, b.value)}</div>
              </div>
            ))}
          </div>
        </>)}
      </div>

    </div>
  );
}
