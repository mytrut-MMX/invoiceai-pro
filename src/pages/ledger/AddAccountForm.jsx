import { useState } from "react";
import { ff } from "../../constants";
import { Icons } from "../../components/icons";
import { Btn, Field, Input, Select } from "../../components/atoms";
import { supabase } from "../../lib/supabase";
import { ACCT_TYPES, ACCT_LABELS } from "./shared";

export default function AddAccountForm({ userId, onClose, onSaved }) {
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
