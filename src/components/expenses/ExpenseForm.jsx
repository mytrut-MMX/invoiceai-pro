import { useState, useContext, useRef, useCallback } from "react";
import { ff, CUR_SYM, TAX_RATES, EXPENSE_CATEGORIES, EXPENSE_STATUSES, PAYMENT_METHODS } from "../../constants";
import { SA_CATEGORY_LABELS, SA_CATEGORY_MAP } from "../../utils/itsa/hmrcCategoryMap";
import { postExpenseEntry } from "../../utils/ledger/ledgerService";
import { fetchUserAccounts } from "../../utils/ledger/fetchUserAccounts";
import { AppCtx } from "../../context/AppContext";
import { Field, Input, Select, Textarea, Btn, Switch } from "../atoms";
import { CustomerPicker } from "../shared";
import { fmt, todayStr } from "../../utils/helpers";
import { useCISSettings } from "../../hooks/useCISSettings";
import { validateImageDataUrl } from "../../utils/security";

const STATUS_STYLE = {
  Draft:       { color: "#6b7280", bg: "#f3f4f6" },
  Submitted:   { color: "#1e6be0", bg: "#eff6ff" },
  Approved:    { color: "#059669", bg: "#ecfdf5" },
  Reimbursed:  { color: "#7c3aed", bg: "#f5f3ff" },
};

function ExpenseSection({ title, children }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e8ec", borderRadius: 8, marginBottom: 12 }}>
      <div style={{ padding: "10px 18px", borderBottom: "1px solid #f0f0f4", fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em" }}>{title}</div>
      <div style={{ padding: "16px 18px" }}>{children}</div>
    </div>
  );
}

function ReceiptUpload({ value, onChange }) {
  const ref = useRef(null);
  const [drag, setDrag] = useState(false);
  const load = useCallback(file => {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 3 * 1024 * 1024) { alert("Max 3 MB"); return; }
    const r = new FileReader();
    r.onload = e => {
      const result = e.target.result;
      if (validateImageDataUrl(result)) onChange(result);
    };
    r.readAsDataURL(file);
  }, [onChange]);
  return (
    <div onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); load(e.dataTransfer.files[0]); }}
      style={{ border: `1.5px dashed ${drag ? "#1e6be0" : "#d1d5db"}`, borderRadius: 8,
        background: drag ? "#f0f5ff" : "#fafafa", padding: 16,
        display: "flex", alignItems: "center", gap: 16, minHeight: 80 }}>
      {value ? (
        <div style={{ position: "relative" }}>
          <img src={value} alt="receipt" style={{ maxHeight: 72, maxWidth: 130, objectFit: "contain", borderRadius: 6, border: "1px solid #e8e8ec" }} />
          <button onClick={() => onChange("")}
            style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: "#ef4444", border: "none", color: "#fff", fontSize: 12, cursor: "pointer", fontFamily: ff, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
      ) : (
        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>Drag receipt or</div>
          <button onClick={() => ref.current?.click()}
            style={{ fontSize: 12, color: "#1e6be0", background: "none", border: "none", cursor: "pointer", fontFamily: ff, fontWeight: 600 }}>browse image</button>
          <div style={{ fontSize: 11, color: "#c4c4c4", marginTop: 2 }}>JPG, PNG · max 3 MB</div>
        </div>
      )}
      {value && <button onClick={() => ref.current?.click()}
        style={{ fontSize: 12, color: "#1e6be0", background: "none", border: "1px solid #1e6be0", borderRadius: 6, cursor: "pointer", fontFamily: ff, fontWeight: 600, padding: "4px 10px" }}>Change</button>}
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }} onChange={e => load(e.target.files[0])} />
    </div>
  );
}

export default function ExpenseForm({ existing, onClose, onSave }) {
  const { orgSettings, customers, customPayMethods } = useContext(AppCtx);
  const { cisEnabled } = useCISSettings();
  const isVat = orgSettings?.vatReg === "Yes";
  const currSym = CUR_SYM[orgSettings?.currency || "GBP"] || "£";
  const e = existing || {};

  const [expType, setExpType]           = useState(e.expense_type || "regular");
  const [date, setDate]                 = useState(e.date || todayStr());
  const [category, setCategory]         = useState(e.category || "");
  const [vendor, setVendor]             = useState(e.vendor || "");
  const [description, setDescription]  = useState(e.description || "");
  const [amount, setAmount]             = useState(e.amount ?? "");
  const [taxRate, setTaxRate]           = useState(e.tax_rate ?? (isVat ? 20 : 0));
  const [status, setStatus]             = useState(e.status || "Draft");
  const [billable, setBillable]         = useState(e.billable || false);
  const [customer, setCustomer]         = useState(e.customer || null);
  const [paidThrough, setPaidThrough]   = useState(e.paid_through || "Card");
  const [receipt, setReceipt]           = useState(e.receipt || "");
  const [notes, setNotes]               = useState(e.notes || "");
  const [mileageFrom, setMileageFrom]   = useState(e.mileage_from || "");
  const [mileageTo, setMileageTo]       = useState(e.mileage_to || "");
  const [mileageKm, setMileageKm]       = useState(e.mileage_km ?? "");
  const [mileageRate, setMileageRate]   = useState(e.mileage_rate ?? 0.45);
  const [vehicle, setVehicle]           = useState(e.vehicle || "Car");

  const isSubLabour = category === "Subcontractor Labour";
  const isSubMaterial = category === "Subcontractor Materials";
  const isSubcontractorCategory = isSubLabour || isSubMaterial;
  const is_drc = isSubLabour && cisEnabled && isVat;

  const net    = expType === "mileage" ? Number(mileageKm || 0) * Number(mileageRate || 0) : Number(amount || 0);
  const drcVatAmount = is_drc ? net * Number(taxRate) / 100 : 0;
  const taxAmt = is_drc ? 0 : (isVat && expType !== "mileage" ? net * Number(taxRate) / 100 : 0);
  const total  = net + taxAmt;
  const allPay = [...PAYMENT_METHODS, ...(customPayMethods || [])];

  const handleSave = () => {
    const expenseObj = {
      id: e.id || crypto.randomUUID(),
      expense_number: e.expense_number,
      expense_type: expType,
      date, category,
      vendor: expType === "mileage" ? "" : vendor,
      description,
      amount: net,
      tax_rate:   expType === "mileage" ? 0 : Number(taxRate),
      tax_amount: taxAmt,
      total, status, billable,
      customer: billable ? customer : null,
      paid_through: paidThrough,
      receipt, notes,
      mileage_from: mileageFrom,
      mileage_to:   mileageTo,
      mileage_km:   Number(mileageKm),
      mileage_rate: Number(mileageRate),
      vehicle,
      is_cis_expense: isSubLabour && cisEnabled,
      is_drc,
      drc_vat_amount: drcVatAmount,
      created_at: e.created_at || new Date().toISOString(),
    };
    onSave(expenseObj);
    // Fire-and-forget — never blocks the UI save path
    ;(async () => {
      try {
        const { accounts, userId } = await fetchUserAccounts();
        if (!userId) return;
        await postExpenseEntry(expenseObj, accounts, userId);
      } catch (err) {
        console.error('[Ledger] expense post failed:', err);
      }
    })();
  };

  const valid = expType === "mileage" ? Number(mileageKm) > 0 : Number(amount) > 0;
  const S = ExpenseSection;
  const row2 = children => <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{children}</div>;
  const row3 = children => <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>{children}</div>;

  return (
    <div style={{ background: "#f4f5f7", minHeight: "100vh", fontFamily: ff }}>
      {/* sticky header */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: "#fff", borderBottom: "1px solid #e8e8ec", padding: "11px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: 13, fontFamily: ff }}>← Expenses</button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={onClose} variant="outline">Cancel</Btn>
          <Btn onClick={handleSave} variant="primary" disabled={!valid}>Save</Btn>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "20px 20px 48px" }}>
        {/* type toggle */}
        <S title="Expense Type">
          <div style={{ display: "flex", gap: 8 }}>
            {[["regular", "Regular Expense"], ["mileage", "Mileage"]].map(([v, l]) => (
              <button key={v} onClick={() => setExpType(v)}
                style={{ flex: 1, padding: "9px 0", borderRadius: 7, border: `1.5px solid ${expType === v ? "#1e6be0" : "#e8e8ec"}`, background: expType === v ? "#f0f5ff" : "#fafafa", color: expType === v ? "#1e6be0" : "#6b7280", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: ff }}>
                {l}
              </button>
            ))}
          </div>
        </S>

        {expType === "regular" ? (
          <S title="Expense Details">
            {row2(<>
              <Field label="Date" required>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #e8e8ec", borderRadius: 5, fontSize: 13, fontFamily: ff, outline: "none", boxSizing: "border-box" }} />
              </Field>
              <Field label="Category">
                <Select value={category} onChange={setCategory}
                  options={EXPENSE_CATEGORIES.map(c => ({ value: c.name, label: `${c.code} · ${c.name}` }))} placeholder="Select…" />
              </Field>
            </>)}
            {cisEnabled && isSubcontractorCategory && (
              <div style={{ marginTop: 8, padding: "10px 12px", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 8, fontSize: 12, color: "#92400e", lineHeight: 1.5 }}>
                <strong>For CIS compliance, track subcontractor payments as Bills.</strong> Bills support CIS verification, rate-at-posting, and CIS300 reporting. Expenses with this category are excluded from CIS300 returns.
              </div>
            )}
            {category && (() => {
              const catEntry = EXPENSE_CATEGORIES.find(c => c.name === category);
              const saCode = catEntry ? SA_CATEGORY_MAP[catEntry.code] : null;
              const saLabel = saCode ? SA_CATEGORY_LABELS[saCode] : null;
              return saLabel ? (
                <div style={{ marginTop: 4, marginBottom: 4, display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11, color: "#64748b" }}>
                  <span style={{ fontWeight: 700, color: "#475569" }}>HMRC SA:</span> {saLabel}
                </div>
              ) : null;
            })()}
            {isSubLabour && cisEnabled && (
              <div style={{ marginTop: 8, padding: "8px 12px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, fontSize: 12, color: "#92400e" }}>
                ⚠ CIS applies to labour. Deduction tracked on payment, not on expense.
              </div>
            )}
            {isSubMaterial && (
              <div style={{ marginTop: 8, padding: "8px 12px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, fontSize: 12, color: "#1e40af" }}>
                ℹ Materials are not subject to CIS deduction (HMRC CISR15080).
              </div>
            )}
            {is_drc && (
              <div style={{ marginTop: 8, padding: "8px 12px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, fontSize: 12, color: "#166534" }}>
                🔄 Domestic Reverse Charge applies (VAT Act 1994, s.55A). You self-account for VAT — subcontractor does not charge VAT. Both output and input VAT are recorded automatically.
              </div>
            )}
            <Field label={isSubcontractorCategory ? "Subcontractor / Vendor" : "Vendor / Merchant"}><Input value={vendor} onChange={setVendor} placeholder={isSubcontractorCategory ? "e.g. J Smith Bricklaying" : "e.g. Amazon, Screwfix"} /></Field>
            <Field label="Description"><Textarea value={description} onChange={setDescription} placeholder="What was this expense for?" rows={2} /></Field>
            {row2(<>
              <Field label="Net Amount" required><Input value={amount} onChange={setAmount} type="number" placeholder="0.00" align="right" /></Field>
              <Field label="Paid Through">
                <Select value={paidThrough} onChange={setPaidThrough} options={allPay.map(m => ({ value: m, label: m }))} />
              </Field>
            </>)}
            {isVat && row3(<>
              <Field label="VAT Rate"><Select value={String(taxRate)} onChange={v => setTaxRate(Number(v))} options={TAX_RATES.map(r => ({ value: String(r), label: `${r}%` }))} /></Field>
              <Field label="VAT"><Input value={fmt(currSym, taxAmt)} readOnly align="right" /></Field>
              <Field label="Total"><Input value={fmt(currSym, total)} readOnly align="right" /></Field>
            </>)}
          </S>
        ) : (
          <S title="Mileage Details">
            {row2(<>
              <Field label="Date" required>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #e8e8ec", borderRadius: 5, fontSize: 13, fontFamily: ff, outline: "none", boxSizing: "border-box" }} />
              </Field>
              <Field label="Vehicle">
                <Select value={vehicle} onChange={setVehicle} options={["Car", "Van", "Motorcycle", "Bicycle", "Other"].map(v => ({ value: v, label: v }))} />
              </Field>
            </>)}
            {row2(<>
              <Field label="From"><Input value={mileageFrom} onChange={setMileageFrom} placeholder="Start location" /></Field>
              <Field label="To"><Input value={mileageTo} onChange={setMileageTo} placeholder="End location" /></Field>
            </>)}
            {row2(<>
              <Field label="Distance (km/miles)" required><Input value={mileageKm} onChange={setMileageKm} type="number" placeholder="0" align="right" /></Field>
              <Field label="Rate per km/mile"><Input value={mileageRate} onChange={setMileageRate} type="number" placeholder="0.45" align="right" /></Field>
            </>)}
            {Number(mileageKm) > 0 && (
              <div style={{ background: "#f0f5ff", borderRadius: 7, padding: "9px 14px", fontSize: 13, color: "#1e6be0", fontWeight: 600, marginBottom: 4 }}>
                {mileageKm} × {fmt("£", mileageRate)} = <strong>{fmt(currSym, total)}</strong>
              </div>
            )}
            <Field label="Purpose"><Textarea value={description} onChange={setDescription} placeholder="Business purpose of journey" rows={2} /></Field>
          </S>
        )}

        {/* Billable */}
        <S title="Billable to Customer">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: billable ? 14 : 0 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>Charge to customer</div>
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>Include on a customer invoice</div>
            </div>
            <Switch checked={billable} onChange={setBillable} />
          </div>
          {billable && <CustomerPicker customers={customers} value={customer} onChange={setCustomer} onClear={() => setCustomer(null)} />}
        </S>

        {/* Status & Notes */}
        <S title="Status & Notes">
          <Field label="Status">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {EXPENSE_STATUSES.map(s => {
                const st = STATUS_STYLE[s] || { color: "#6b7280", bg: "#f3f4f6" };
                return (
                  <button key={s} onClick={() => setStatus(s)}
                    style={{ padding: "5px 14px", borderRadius: 20, border: `1.5px solid ${status === s ? st.color : "#e8e8ec"}`, background: status === s ? st.bg : "#fafafa", color: status === s ? st.color : "#9ca3af", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: ff }}>
                    {s}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Notes"><Textarea value={notes} onChange={setNotes} placeholder="Internal notes…" rows={2} /></Field>
        </S>

        {/* Receipt */}
        {expType === "regular" && (
          <S title="Receipt">
            <ReceiptUpload value={receipt} onChange={setReceipt} />
          </S>
        )}
      </div>
    </div>
  );
}
