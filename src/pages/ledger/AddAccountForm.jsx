import { useState } from "react";
import { Icons } from "../../components/icons";
import { Btn, Field, Input, Select } from "../../components/atoms";
import { supabase } from "../../lib/supabase";
import { ACCT_TYPES, ACCT_LABELS } from "./shared";

const ASSET_SUBTYPES = [
  { value: "",             label: "— None —" },
  { value: "current",      label: "Current" },
  { value: "savings",      label: "Savings" },
  { value: "cash",         label: "Cash" },
  { value: "other",        label: "Other" },
];

const LIABILITY_SUBTYPES = [
  { value: "",             label: "— None —" },
  { value: "current",      label: "Current" },
  { value: "credit_card",  label: "Credit Card" },
  { value: "other",        label: "Other" },
];

function showSubType(type, code) {
  if (type === "liability") return true;
  if (type === "asset" && code.trim().startsWith("1")) return true;
  return false;
}

export default function AddAccountForm({ userId, onClose, onSaved }) {
  const [code,        setCode]        = useState("");
  const [name,        setName]        = useState("");
  const [type,        setType]        = useState("asset");
  const [subType,     setSubType]     = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [stmtDay,     setStmtDay]     = useState("");
  const [description, setDescription] = useState("");
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");

  const isCreditCard = subType === "credit_card";
  const subTypeOptions = type === "liability" ? LIABILITY_SUBTYPES : ASSET_SUBTYPES;

  const handleTypeChange = (val) => {
    setType(val);
    setSubType("");
    setCreditLimit("");
    setStmtDay("");
  };

  const handleSubTypeChange = (val) => {
    setSubType(val);
    if (val === "credit_card") {
      if (!code.trim()) setCode("2600");
      if (!name.trim()) setName("Credit Card");
    }
  };

  const valid = code.trim() && name.trim() &&
    (!isCreditCard || (stmtDay === "" || (Number(stmtDay) >= 1 && Number(stmtDay) <= 31)));

  const handleSave = async () => {
    if (!valid) return;
    setSaving(true); setError("");
    try {
      const row = {
        user_id:     userId,
        code:        code.trim(),
        name:        name.trim(),
        type,
        description: description.trim() || null,
        is_system:   false,
        sub_type:    subType || null,
        credit_limit: isCreditCard && creditLimit ? Number(creditLimit) : null,
        statement_day: isCreditCard && stmtDay ? Number(stmtDay) : null,
      };
      const { error: err } = await supabase.from("accounts").insert(row);
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
      <div style={{ background:"#fff", borderRadius:12, width:"100%", maxWidth:440, boxShadow:"0 8px 40px rgba(0,0,0,0.18)" }}>
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
              <Select value={type} onChange={handleTypeChange}
                options={ACCT_TYPES.map(t => ({ value: t, label: ACCT_LABELS[t] }))} />
            </Field>
          </div>

          {showSubType(type, code) && (
            <div style={{ marginBottom:12 }}>
              <Field label="Sub-type">
                <Select value={subType} onChange={handleSubTypeChange} options={subTypeOptions} />
              </Field>
            </div>
          )}

          {isCreditCard && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
              <Field label="Credit Limit (optional)">
                <Input
                  value={creditLimit}
                  onChange={setCreditLimit}
                  placeholder="e.g. 5000"
                  type="number"
                  min="0"
                />
              </Field>
              <Field label="Statement Day (1–31)" error={stmtDay && (Number(stmtDay) < 1 || Number(stmtDay) > 31) ? "Must be 1–31" : ""}>
                <Input
                  value={stmtDay}
                  onChange={setStmtDay}
                  placeholder="e.g. 28"
                  type="number"
                  min="1"
                  max="31"
                />
              </Field>
            </div>
          )}

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
