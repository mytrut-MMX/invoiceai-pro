import { useState, useEffect, useCallback, useContext } from "react";
import { AppCtx } from "../../context/AppContext";
import { supabase } from "../../lib/supabase";
import { Icons } from "../../components/icons";
import { Field, Input, Select, Btn, SlideToggle, InfoBox } from "../../components/atoms";
import { fmtDate } from "../../utils/helpers";
import Section from "../../components/settings/Section";

export default function SettingsHMRC({ orgSettings, onSave }) {
  const { user } = useContext(AppCtx);
  const org = orgSettings || {};

  // ─── Persistent settings (saved via onSave) ─────────────────────────────
  const [vatStagger,             setVatStagger]             = useState(org.vatStagger || 1);
  const [autoGenerateVatPeriods, setAutoGenerateVatPeriods] = useState(org.autoGenerateVatPeriods !== false);
  const [itsaQuarterlyReminders, setItsaQuarterlyReminders] = useState(org.itsaQuarterlyReminders !== false);

  // ─── Transient connection state (local only) ────────────────────────────
  const [hmrcStatus,    setHmrcStatus]    = useState("loading");
  const [hmrcTokenInfo, setHmrcTokenInfo] = useState(null);
  const [hmrcLoadError, setHmrcLoadError] = useState("");
  const [hmrcBanner,    setHmrcBanner]    = useState("");

  // ─── Save feedback ──────────────────────────────────────────────────────
  const [saved,     setSaved]     = useState(false);
  const [saveError, setSaveError] = useState("");

  // ─── Sync from parent when orgSettings changes externally ───────────────
  useEffect(() => {
    if (!orgSettings) return;
    const o = orgSettings;
    setVatStagger(o.vatStagger || 1);
    setAutoGenerateVatPeriods(o.autoGenerateVatPeriods !== false);
    setItsaQuarterlyReminders(o.itsaQuarterlyReminders !== false);
  }, [orgSettings]);

  // ─── HMRC connection status loader ──────────────────────────────────────
  const loadHMRCStatus = useCallback(async () => {
    if (!user?.id || !supabase) return;
    setHmrcStatus("loading");
    setHmrcLoadError("");
    try {
      const { data, error } = await supabase
        .from("hmrc_tokens")
        .select("vrn, expires_at, scope, created_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (data) { setHmrcTokenInfo(data); setHmrcStatus("connected"); }
      else { setHmrcStatus("disconnected"); }
    } catch (err) {
      setHmrcLoadError(err.message || "Failed to check HMRC status");
      setHmrcStatus("error");
    }
  }, [user?.id]);

  // ─── Load status on mount (tab is already active when this component renders) ─
  useEffect(() => {
    loadHMRCStatus();
  }, [loadHMRCStatus]);

  // ─── Handle OAuth return redirect (?connected=1 param) ──────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "hmrc" && params.get("connected") === "1") {
      setHmrcBanner("Successfully connected to HMRC");
      setTimeout(() => setHmrcBanner(""), 5000);
      // Strip query params so a refresh doesn't re-trigger the banner
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── OAuth handlers ─────────────────────────────────────────────────────
  const handleConnectHMRC = () => {
    window.location.href = "/api/hmrc-auth?action=initiate";
  };

  const handleDisconnectHMRC = async () => {
    if (!window.confirm("Disconnect from HMRC? You will need to reconnect before your next VAT or ITSA submission.")) return;
    if (supabase) await supabase.from("hmrc_tokens").delete().eq("user_id", user.id);
    setHmrcStatus("disconnected");
    setHmrcTokenInfo(null);
  };

  // ─── Save handler for persistent settings ───────────────────────────────
  const handleSave = () => {
    setSaveError("");
    const partial = {
      vatStagger: Number(vatStagger),
      autoGenerateVatPeriods,
      itsaQuarterlyReminders,
    };
    try {
      onSave(partial);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError("Something went wrong. Please try again.");
    }
  };

  return (
    <>
      {hmrcBanner && (
        <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:13, color:"#16A34A", fontWeight:600 }}>{hmrcBanner}</div>
      )}

      <Section title="HMRC Connection">
        {hmrcStatus === "loading" && (
          <div style={{ padding:"20px 0", textAlign:"center", color:"#6b7280", fontSize:13 }}>Checking connection status…</div>
        )}
        {hmrcStatus === "disconnected" && (<>
          <InfoBox style={{ marginBottom:14, borderColor:"#fde68a", background:"#fffbeb", color:"#92400e" }}>
            Connect your InvoiceSaga account to HMRC to submit VAT returns and ITSA quarterly updates digitally.
          </InfoBox>
          <Btn variant="primary" onClick={handleConnectHMRC}>Connect to HMRC →</Btn>
        </>)}
        {hmrcStatus === "connected" && (<>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
            <div style={{ width:10, height:10, borderRadius:"50%", background:"#16A34A" }} />
            <span style={{ fontSize:14, fontWeight:700, color:"#16A34A" }}>Connected to HMRC</span>
          </div>
          <div style={{ background:"#f9fafb", borderRadius:8, border:"1px solid #e8e8ec", padding:"12px 16px", marginBottom:16 }}>
            {[
              { label:"VAT Number", value: org.vatNum || "—" },
              { label:"HMRC VRN", value: hmrcTokenInfo?.vrn || "—" },
              { label:"Connected since", value: hmrcTokenInfo?.created_at ? fmtDate(hmrcTokenInfo.created_at) : "—" },
              { label:"Token expires", value: hmrcTokenInfo?.expires_at ? fmtDate(hmrcTokenInfo.expires_at) : "—" },
              { label:"Scope", value: hmrcTokenInfo?.scope || "—" },
            ].map(r => (
              <div key={r.label} style={{ display:"flex", padding:"6px 0", borderBottom:"1px solid #f0f0f4" }}>
                <div style={{ width:160, fontSize:12, color:"#6b7280", fontWeight:500 }}>{r.label}</div>
                <div style={{ fontSize:12, color:"#1a1a2e", fontWeight:600, fontFamily: r.label === "HMRC VRN" ? "'Courier New', monospace" : "inherit" }}>{r.value}</div>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <Btn variant="outline" onClick={handleDisconnectHMRC}>Disconnect</Btn>
            <span style={{ fontSize:11, color:"#6b7280" }}>Disconnecting will require re-authorisation before your next submission.</span>
          </div>
        </>)}
        {hmrcStatus === "error" && (<>
          <InfoBox style={{ borderColor:"#fecaca", background:"#fef2f2", color:"#b91c1c" }}>
            {hmrcLoadError || "Failed to check HMRC connection status."}
          </InfoBox>
          <Btn variant="outline" onClick={loadHMRCStatus} style={{ marginTop:10 }}>Retry</Btn>
        </>)}
      </Section>

      {(org.vatReg || "No") === "Yes" ? (
        <Section title="MTD VAT Configuration">
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
            <Field label="VAT Stagger Group" hint="Assigned by HMRC — printed on your VAT certificate">
              <Select value={String(vatStagger)} onChange={v => setVatStagger(Number(v))}
                options={[
                  { value:"1", label:"Stagger 1 — Jan / Apr / Jul / Oct" },
                  { value:"2", label:"Stagger 2 — Feb / May / Aug / Nov" },
                  { value:"3", label:"Stagger 3 — Mar / Jun / Sep / Dec" },
                ]} />
            </Field>
          </div>
          <div style={{ marginBottom:14 }}>
            <Field label="Auto-generate VAT periods">
              <SlideToggle value={autoGenerateVatPeriods} onChange={setAutoGenerateVatPeriods} />
            </Field>
            <div style={{ fontSize:11, color:"#6b7280", marginTop:4 }}>Automatically create VAT period records each quarter.</div>
          </div>
        </Section>
      ) : (
        <Section title="MTD VAT Configuration">
          <InfoBox>MTD VAT requires VAT registration. Enable VAT in the Tax tab first.</InfoBox>
        </Section>
      )}

      {org.bType === "Sole Trader / Freelancer" ? (
        <Section title="MTD ITSA Configuration">
          <div style={{ marginBottom:14 }}>
            <Field label="UTR Number" hint="Set in the Tax tab under CIS settings">
              <Input value={org.cis?.contractorUTR || org.cisUtrNo || ""} readOnly />
            </Field>
          </div>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:600, color:"#1a1a2e", marginBottom:6 }}>Qualifying Income Thresholds</div>
            <div style={{ fontSize:12, color:"#6b7280", lineHeight:1.8 }}>
              From April 2026: <strong>£50,000</strong> · From April 2027: <strong>£30,000</strong> · From April 2028: <strong>£20,000</strong>
            </div>
          </div>
          <Field label="Quarterly Submission Reminders">
            <SlideToggle value={itsaQuarterlyReminders} onChange={setItsaQuarterlyReminders} />
          </Field>
          <div style={{ fontSize:11, color:"#6b7280", marginTop:4 }}>Get reminded 7 days before each quarterly deadline.</div>
        </Section>
      ) : (
        <Section title="MTD ITSA Configuration">
          <InfoBox>MTD ITSA applies to sole traders and landlords.</InfoBox>
        </Section>
      )}

      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8, marginTop:16 }}>
        {saveError && (
          <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, color:"#dc2626", fontWeight:600 }}>
            <Icons.Alert /> {saveError}
          </div>
        )}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {saved && (
            <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, color:"#16A34A", fontWeight:600 }}>
              <Icons.Check /> HMRC settings saved.
            </div>
          )}
          <Btn onClick={handleSave} variant="primary" icon={<Icons.Save />} style={{ background: saved ? "#059669" : "#1e6be0", color:"#fff" }}>
            Save HMRC settings
          </Btn>
        </div>
      </div>
    </>
  );
}
