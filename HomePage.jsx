import { useState, useRef, useEffect } from "react";
import { ff, STATUS_COLORS } from "../constants";
import { Icons } from "../components/icons";
import { Tag } from "../components/atoms";
import { fmtDate } from "../utils/helpers";

export default function HomePage({ user, onNavigate }) {
  const [aiInput, setAiInput] = useState("");
  const [messages, setMessages] = useState([{ role:"assistant", text:`Hi ${user?.name?.split(" ")[0]||"there"} 👋 I'm your AI Invoice assistant. Ask me anything!` }]);
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
          system:"You are an AI assistant for an invoicing platform called AI Invoice. Help users with invoices, customers, VAT, CIS, payments. Be concise.",
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

  const STATS = [
    { label:"Outstanding", value:"£4,320.00", sub:"3 invoices", color:"#E86C4A" },
    { label:"Overdue",     value:"£1,200.00", sub:"1 invoice",  color:"#C0392B" },
    { label:"Paid (30 days)", value:"£12,800.00", sub:"8 invoices", color:"#1A1A1A" },
    { label:"Draft",       value:"£2,500.00", sub:"2 invoices", color:"#888" },
  ];

  const RECENT = [
    { id:"INV-0001", customer:"Acme Corp",    date:"01 Mar 2026", due:"31 Mar 2026", amount:"£1,200.00", status:"Sent" },
    { id:"INV-0002", customer:"Blue Sky Ltd", date:"20 Feb 2026", due:"20 Mar 2026", amount:"£3,120.00", status:"Overdue" },
    { id:"INV-0003", customer:"Green Media",  date:"15 Feb 2026", due:"15 Mar 2026", amount:"£840.00",   status:"Paid" },
  ];

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
        {STATS.map(s=>(
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

      {/* Recent Invoices */}
      <div style={{ background:"#fff", borderRadius:14, border:"1px solid #EBEBEB", overflowX:"auto" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 18px", borderBottom:"1px solid #F0F0F0" }}>
          <span style={{ fontWeight:700, fontSize:13, color:"#1A1A1A" }}>Recent Invoices</span>
          <button onClick={()=>onNavigate?.("invoices")} style={{ fontSize:12, color:"#E86C4A", background:"none", border:"none", cursor:"pointer", fontWeight:600, fontFamily:ff }}>View all →</button>
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:500 }}>
          <thead>
            <tr style={{ background:"#FAFAFA" }}>
              {["Invoice #","Customer","Date","Due","Amount","Status"].map(h=>(
                <th key={h} style={{ padding:"8px 18px", textAlign:"left", fontSize:10, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:"0.06em", borderBottom:"1px solid #F0F0F0" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RECENT.map(inv=>(
              <tr key={inv.id} style={{ borderBottom:"1px solid #F7F7F7" }}
                onMouseEnter={e=>e.currentTarget.style.background="#FAFAFA"}
                onMouseLeave={e=>e.currentTarget.style.background=""}>
                <td style={{ padding:"11px 18px", fontSize:13, fontWeight:700, color:"#1A1A1A" }}>{inv.id}</td>
                <td style={{ padding:"11px 18px", fontSize:13, color:"#444" }}>{inv.customer}</td>
                <td style={{ padding:"11px 18px", fontSize:13, color:"#888" }}>{inv.date}</td>
                <td style={{ padding:"11px 18px", fontSize:13, color:"#888" }}>{inv.due}</td>
                <td style={{ padding:"11px 18px", fontSize:13, fontWeight:700, color:"#1A1A1A" }}>{inv.amount}</td>
                <td style={{ padding:"11px 18px" }}><Tag color={STATUS_COLORS[inv.status]}>{inv.status}</Tag></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
