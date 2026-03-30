import { useState } from "react";
import { ff } from "../../constants";
import { Icons } from "../../components/icons";
import { Btn, Field, Input } from "../../components/atoms";
import { supabase } from "../../lib/supabase";
import { todayStr } from "../../utils/helpers";
import { ACCT_TYPES, ACCT_LABELS } from "./shared";

const blankLine = () => ({
  id: crypto.randomUUID(), accountId: "", debit: "", credit: "", lineDesc: "",
});

export default function ManualEntryForm({ accounts, userId, onClose, onSaved }) {
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
              <input type="number" min="0" value={line.debit} onChange={e => updateLine(line.id, "debit", e.target.value)}
                placeholder="0.00"
                style={{ padding:"7px 8px", border:"1px solid #e8e8ec", borderRadius:5, fontSize:12, fontFamily:ff, outline:"none", textAlign:"right", width:"100%", boxSizing:"border-box" }} />
              <input type="number" min="0" value={line.credit} onChange={e => updateLine(line.id, "credit", e.target.value)}
                placeholder="0.00"
                style={{ padding:"7px 8px", border:"1px solid #e8e8ec", borderRadius:5, fontSize:12, fontFamily:ff, outline:"none", textAlign:"right", width:"100%", boxSizing:"border-box" }} />
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
