import { useState, useRef, useEffect } from "react";
import { ff } from "../../constants";
import { Icons } from "../icons";

export default function AIChatPanel({ user }) {
  const [aiInput, setAiInput] = useState("");
  const [messages, setMessages] = useState([{ role: "assistant", text: `Hi ${user?.name?.split(" ")[0] || "there"}  I'm your InvoiceSaga assistant. Ask me anything!` }]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!aiInput.trim() || loading) return;
    const msg = aiInput.trim();
    setAiInput("");
    setMessages(p => [...p.slice(-99), { role: "user", text: msg }]);
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
      setMessages(p => [...p.slice(-99), { role: "assistant", text: data.content?.[0]?.text || "Sorry, couldn't process that." }]);
    } catch {
      setMessages(p => [...p.slice(-99), { role: "assistant", text: "Connection issue. Please try again." }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8e8ec", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden", marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderBottom: "1px solid #F0F0F0", background: "#f9fafb" }}>
        <div style={{ width: 28, height: 28, background: "#1e6be0", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><Icons.Bot /></div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#059669" }}>AI Assistant</div>
          <div style={{ fontSize: 11, color: "#AAA" }}>Powered by Claude</div>
        </div>
        <div style={{ marginLeft: "auto", width: 7, height: 7, borderRadius: "50%", background: "#16A34A" }} />
      </div>
      <div style={{ height: 200, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            {m.role === "assistant" && (
              <div style={{ width: 22, height: 22, background: "#1e6be0", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", marginRight: 7, marginTop: 2, flexShrink: 0 }}><Icons.Bot /></div>
            )}
            <div style={{ maxWidth: "72%", padding: "9px 13px", borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: m.role === "user" ? "#1e6be0" : "#F4F4F4", color: m.role === "user" ? "#fff" : "#1A1A1A", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", gap: 4, padding: "9px 13px", background: "#F4F4F4", borderRadius: "14px 14px 14px 4px", width: "fit-content" }}>
            {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#CCC", animation: `pulse 1.2s ${i * 0.2}s infinite` }} />)}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: "8px 12px", borderTop: "1px solid #F0F0F0", display: "flex", gap: 7 }}>
        <input value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Ask about invoices, VAT, CIS…"
          style={{ flex: 1, padding: "9px 13px", border: "1.5px solid #E8E8E8", borderRadius: 9, fontSize: 13, fontFamily: ff, outline: "none", background: "#f9fafb" }} />
        <button onClick={send} disabled={loading}
          style={{ width: 36, height: 36, background: loading ? "#e5e7eb" : "#1e6be0", border: "none", borderRadius: 8, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
          <Icons.Send />
        </button>
      </div>
    </div>
  );
}
