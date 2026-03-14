import { useState, useRef, useEffect, useMemo, useContext } from "react";
import { ff } from "../constants";
import { Icons } from "../components/icons";
import { AppCtx } from "../context/AppContext";
import { fmt, parseCisRate } from "../utils/helpers";
import { CUR_SYM } from "../constants";

export default function HomePage({ user, onNavigate }) {
  const { invoices, orgSettings } = useContext(AppCtx);
  const [reportPeriod, setReportPeriod] = useState("this_month");
  const [aiInput, setAiInput] = useState("");
  const [messages, setMessages] = useState([{ role:"assistant", text:`Hi ${user?.name?.split(" ")[0]||"there"}  I'm your InvoicePilot assistant. Ask me anything!` }]);
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
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:1000,
          system:"You are an AI assistant for an invoicing platform called InvoicePilot. Help users with invoices, customers, VAT, CIS, payments. Be concise.",
          messages:[{ role:"user", content:msg }]
        })
      });
      const d = await res.json();
      setMessages(p=>[...p,{ role:"assistant", text:d.content?.map(i=>i.text||"").join("")||"Sorry, couldn't process that." }]);
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
      { label:"Outstanding", value:fmt(currencySymbol, outstanding), sub:`${invoices.filter(i=>["Sent","Partial"].includes(i.status)).length} invoices`, color:"#E86C4A" },
      { label:"Overdue", value:fmt(currencySymbol, overdue), sub:`${invoices.filter(i=>i.status==="Overdue").length} invoices`, color:"#C0392B" },
      { label:"Paid", value:fmt(currencySymbol, paid), sub:"Received", color:"#1A1A1A" },
      { label:"Draft", value:fmt(currencySymbol, draft), sub:"Needs action", color:"#888" },
      { label:"VAT Tracked", value: orgSettings?.vatReg === "Yes" ? fmt(currencySymbol, vatDue) : "Disabled", sub: orgSettings?.vatReg === "Yes" ? "Output VAT" : "Enable VAT in Settings", color:"#2563EB" },
      { label:"CIS Tracked", value: orgSettings?.cisReg === "Yes" ? fmt(currencySymbol, cisTracked) : "Disabled", sub: orgSettings?.cisReg === "Yes" ? "CIS deductions" : "Enable CIS in Settings", color:"#7C3AED" },
    ];
  }, [invoices, orgSettings, currencySymbol]);

  const reportSummary = useMemo(() => {
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
    return { revenue, vat, cis, reportByStatus };
  }, [periodInvoices]);

    return (
    <div style={{ padding:"clamp(14px,4vw,28px) clamp(12px,4vw,32px)", maxWidth:1100, fontFamily:ff }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:24, fontWeight:800, color:"#1A1A1A", margin:"0 0 3px" }}>
          Good morning, {user?.name?.split(" ")[0]||"there"} 👋
        </h1>
        <p style={{ color:"#888", fontSize:13, margin:0 }}>Sunday, 8 March 2026 · Financial overview</p>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12, marginBottom:24 }}>
        {stats.map(s=>(
          <div key={s.label} style={{ background:"#fff", borderRadius:12, padding:"16px 18px", border:"1px solid #EBEBEB" }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:20, fontWeight:800, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:11, color:"#AAA", marginTop:2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* AI Chat */}
      <div style={{ background:"#fff", borderRadius:14, border:"1px solid #EBEBEB", overflow:"hidden", marginBottom:24 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 18px", borderBottom:"1px solid #F0F0F0", background:"#FAFAFA" }}>
          <div style={{ width:28, height:28, background:"#1A1A1A", borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff" }}><Icons.Bot /></div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:"#1A1A1A" }}>AI Assistant</div>
            <div style={{ fontSize:11, color:"#AAA" }}>Powered by Claude</div>
          </div>
          <div style={{ marginLeft:"auto", width:7, height:7, borderRadius:"50%", background:"#16A34A" }} />
        </div>
        <div style={{ height:200, overflowY:"auto", padding:"16px 18px", display:"flex", flexDirection:"column", gap:10 }}>
          {messages.map((m,i)=>(
            <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
              {m.role==="assistant" && (
                <div style={{ width:22, height:22, background:"#1A1A1A", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", marginRight:7, marginTop:2, flexShrink:0 }}><Icons.Bot /></div>
              )}
              <div style={{ maxWidth:"72%", padding:"9px 13px", borderRadius:m.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px", background:m.role==="user"?"#1A1A1A":"#F4F4F4", color:m.role==="user"?"#fff":"#1A1A1A", fontSize:13, lineHeight:1.6, whiteSpace:"pre-wrap" }}>
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
            style={{ flex:1, padding:"9px 13px", border:"1.5px solid #E8E8E8", borderRadius:9, fontSize:13, fontFamily:ff, outline:"none", background:"#FAFAFA" }} />
          <button onClick={send} disabled={loading}
            style={{ width:36, height:36, background:loading?"#CCC":"#1A1A1A", border:"none", borderRadius:8, cursor:loading?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff" }}>
            <Icons.Send />
          </button>
        </div>
      </div>

      {/* Reports Center */}
      <div style={{ background:"#fff", borderRadius:14, border:"1px solid #EBEBEB", padding:"14px 16px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, flexWrap:"wrap", marginBottom:14 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:800, color:"#1A1A1A" }}>Reports Center</div>
            <div style={{ fontSize:12, color:"#888", marginTop:2 }}>Overview based on selected period</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:12, color:"#666", fontWeight:600 }}>Period</span>
            <select
              value={reportPeriod}
              onChange={e=>setReportPeriod(e.target.value)}
              style={{ padding:"7px 10px", border:"1.5px solid #E0E0E0", borderRadius:8, fontSize:12, fontFamily:ff, background:"#FAFAFA", outline:"none", cursor:"pointer" }}
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
            { label:"Invoices", value:periodInvoices.length, color:"#1A1A1A" },
            { label:"Revenue", value:fmt(currencySymbol, reportSummary.revenue), color:"#16A34A" },
            { label:"VAT", value:fmt(currencySymbol, reportSummary.vat), color:"#2563EB" },
            { label:"CIS", value:fmt(currencySymbol, reportSummary.cis), color:"#7C3AED" },
          ].map(card => (
            <div key={card.label} style={{ border:"1px solid #EFEFEF", borderRadius:10, padding:"10px 12px", background:"#FCFCFC" }}>
              <div style={{ fontSize:11, color:"#888", textTransform:"uppercase", fontWeight:700, letterSpacing:"0.05em" }}>{card.label}</div>
              <div style={{ fontSize:16, color:card.color, fontWeight:800, marginTop:5 }}>{card.value}</div>
            </div>
          ))}
        </div>

        <div style={{ border:"1px solid #F0F0F0", borderRadius:10, overflow:"hidden" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1.5fr 1fr 1fr", padding:"9px 12px", background:"#FAFAFA", borderBottom:"1px solid #F0F0F0", fontSize:11, color:"#888", fontWeight:700, textTransform:"uppercase" }}>
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

    </div>
  );
}
