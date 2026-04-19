import { useState } from "react";
import { Icons } from "../icons";
import { Btn, Field, Input, Select } from "../atoms";
import { useToast } from "../ui/Toast";
import { transferBetweenAccounts } from "../../utils/ledger/transferBetweenAccounts";

export default function PayCreditCardModal({ ccAccount, assetAccounts, userId, onClose, onSuccess }) {
  const { toast } = useToast();
  const _d = new Date();
  const today = `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,'0')}-${String(_d.getDate()).padStart(2,'0')}`;

  const [fromId,  setFromId]  = useState(assetAccounts[0]?.id || "");
  const [amount,  setAmount]  = useState("");
  const [date,    setDate]    = useState(today);
  const [memo,    setMemo]    = useState("");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  const amountNum = parseFloat(amount);
  const valid = fromId && amount && amountNum > 0 && date;

  const handleSubmit = async () => {
    if (!valid) return;
    setSaving(true); setError("");
    const { error: err } = await transferBetweenAccounts({
      fromAccountId: fromId,
      toAccountId:   ccAccount.id,
      amount:        amountNum,
      date,
      memo:          memo || `Payment to ${ccAccount.name}`,
      userId,
    });
    setSaving(false);
    if (err) {
      setError(err);
      toast({ title: "Transfer failed", description: err, variant: "danger" });
      return;
    }
    toast({ title: "Payment recorded", description: `£${amountNum.toFixed(2)} paid to ${ccAccount.name}`, variant: "success" });
    onSuccess?.();
    onClose();
  };

  const fromOptions = assetAccounts.map(a => ({ value: a.id, label: `${a.code} – ${a.name}` }));

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:600, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#fff", borderRadius:12, width:"100%", maxWidth:420, boxShadow:"0 8px 40px rgba(0,0,0,0.18)" }}>
        <div style={{ padding:"16px 24px", borderBottom:"1px solid #e8e8ec", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:"#1a1a2e" }}>Pay Credit Card</div>
            <div style={{ fontSize:12, color:"#6b7280", marginTop:2 }}>{ccAccount.code} – {ccAccount.name}</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#6b7280", display:"flex", padding:4 }}><Icons.X /></button>
        </div>
        <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:14 }}>
          <Field label="From Account" required>
            {fromOptions.length === 0
              ? <div style={{ fontSize:13, color:"#dc2626" }}>No asset accounts found.</div>
              : <Select value={fromId} onChange={setFromId} options={fromOptions} />
            }
          </Field>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Amount" required>
              <Input value={amount} onChange={setAmount} placeholder="0.00" type="number" min="0.01" step="0.01" />
            </Field>
            <Field label="Date" required>
              <Input value={date} onChange={setDate} type="date" />
            </Field>
          </div>
          <Field label="Memo">
            <Input value={memo} onChange={setMemo} placeholder={`Payment to ${ccAccount.name}`} />
          </Field>
          {error && <div style={{ color:"#dc2626", fontSize:12 }}>{error}</div>}
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:4 }}>
            <Btn variant="outline" onClick={onClose}>Cancel</Btn>
            <Btn variant="primary" onClick={handleSubmit} disabled={!valid || saving}>
              {saving ? "Posting…" : "Record Payment"}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
