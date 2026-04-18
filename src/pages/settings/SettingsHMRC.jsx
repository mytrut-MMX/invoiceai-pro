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

  const [vatStagger,             setVatStagger]             = useState(org.vatStagger || 1);
  const [autoGenerateVatPeriods, setAutoGenerateVatPeriods] = useState(org.autoGenerateVatPeriods !== false);
  const [itsaQuarterlyReminders, setItsaQuarterlyReminders] = useState(org.itsaQuarterlyReminders !== false);

  const [hmrcStatus,    setHmrcStatus]    = useState("loading");
  const [hmrcTokenInfo, setHmrcTokenInfo] = useState(null);
  const [hmrcLoadError, setHmrcLoadError] = useState("");
  const [hmrcBanner,    setHmrcBanner]    = useState("");

  const [saved,     setSaved]     = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!orgSettings) return;
    const o = orgSettings;
    setVatStagger(o.vatStagger || 1);
    setAutoGenerateVatPeriods(o.autoGenerateVatPeriods !== false);
    setItsaQuarterlyReminders(o.itsaQuarterlyReminders !== false);
  }, [orgSettings]);

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

  useEffect(() => { loadHMRCStatus(); }, [loadHMRCStatus]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "hmrc" && params.get("connected") === "1") {
      setHmrcBanner("Successfully connected to HMRC");
      setTimeout(() => setHmrcBanner(""), 5000);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConnectHMRC = () => {
    window.location.href = "/api/hmrc-auth?action=initiate";
  };

  const handleDisconnectHMRC = async () => {
    if (!window.confirm("Disconnect from HMRC? You will need to reconnect before your next VAT or ITSA submission.")) return;
    if (supabase) await supabase.from("hmrc_tokens").delete().eq("user_id", user.id);
    setHmrcStatus("disconnected");
    setHmrcTokenInfo(null);
  };

  const handleSave = () => {
    setSaveError("");
    try {
      onSave({
        vatStagger: Number(vatStagger),
        autoGenerateVatPeriods,
        itsaQuarterlyReminders,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError("Something went wrong. Please try again.");
    }
  };

  return (
    <>
      {hmrcBanner && (
        <div className="bg-[var(--success-50)] border border-[var(--success-100)] rounded-[var(--radius-md)] px-3.5 py-2.5 mb-4 text-sm text-[var(--success-700)] font-semibold">
          {hmrcBanner}
        </div>
      )}

      <Section title="HMRC connection">
        {hmrcStatus === "loading" && (
          <div className="py-5 text-center text-[var(--text-secondary)] text-sm">Checking connection status…</div>
        )}

        {hmrcStatus === "disconnected" && (
          <>
            <div className="mb-3.5">
              <InfoBox color="var(--warning-600)">
                Connect your InvoiceSaga account to HMRC to submit VAT returns and ITSA quarterly updates digitally.
              </InfoBox>
            </div>
            <Btn variant="primary" onClick={handleConnectHMRC}>Connect to HMRC →</Btn>
          </>
        )}

        {hmrcStatus === "connected" && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2.5 h-2.5 rounded-full bg-[var(--success-600)]" />
              <span className="text-sm font-semibold text-[var(--success-700)]">Connected to HMRC</span>
            </div>

            <div className="bg-[var(--surface-sunken)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-4 py-3 mb-4">
              {[
                { label: "VAT Number", value: org.vatNum || "—" },
                { label: "HMRC VRN", value: hmrcTokenInfo?.vrn || "—", mono: true },
                { label: "Connected since", value: hmrcTokenInfo?.created_at ? fmtDate(hmrcTokenInfo.created_at) : "—" },
                { label: "Token expires", value: hmrcTokenInfo?.expires_at ? fmtDate(hmrcTokenInfo.expires_at) : "—" },
                { label: "Scope", value: hmrcTokenInfo?.scope || "—" },
              ].map((r, idx, arr) => (
                <div
                  key={r.label}
                  className={[
                    "flex py-1.5",
                    idx < arr.length - 1 ? "border-b border-[var(--border-subtle)]" : "",
                  ].join(" ")}
                >
                  <div className="w-40 text-xs text-[var(--text-tertiary)]">{r.label}</div>
                  <div className={`text-xs font-semibold text-[var(--text-primary)] ${r.mono ? "font-mono" : ""}`}>
                    {r.value}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Btn variant="outline" onClick={handleDisconnectHMRC}>Disconnect</Btn>
              <span className="text-[11px] text-[var(--text-tertiary)]">
                Disconnecting will require re-authorisation before your next submission.
              </span>
            </div>
          </>
        )}

        {hmrcStatus === "error" && (
          <>
            <InfoBox color="var(--danger-600)">
              {hmrcLoadError || "Failed to check HMRC connection status."}
            </InfoBox>
            <div className="mt-2.5">
              <Btn variant="outline" onClick={loadHMRCStatus}>Retry</Btn>
            </div>
          </>
        )}
      </Section>

      {(org.vatReg || "No") === "Yes" ? (
        <Section title="MTD VAT configuration">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-3.5">
            <Field label="VAT Stagger Group" hint="Assigned by HMRC — printed on your VAT certificate">
              <Select
                value={String(vatStagger)}
                onChange={v => setVatStagger(Number(v))}
                options={[
                  { value: "1", label: "Stagger 1 — Jan / Apr / Jul / Oct" },
                  { value: "2", label: "Stagger 2 — Feb / May / Aug / Nov" },
                  { value: "3", label: "Stagger 3 — Mar / Jun / Sep / Dec" },
                ]}
              />
            </Field>
          </div>
          <div className="mb-3.5">
            <Field label="Auto-generate VAT periods">
              <SlideToggle value={autoGenerateVatPeriods} onChange={setAutoGenerateVatPeriods} />
            </Field>
            <div className="text-[11px] text-[var(--text-tertiary)] mt-1">
              Automatically create VAT period records each quarter.
            </div>
          </div>
        </Section>
      ) : (
        <Section title="MTD VAT configuration">
          <InfoBox>MTD VAT requires VAT registration. Enable VAT in the Tax tab first.</InfoBox>
        </Section>
      )}

      {org.bType === "Sole Trader / Freelancer" ? (
        <Section title="MTD ITSA configuration">
          <div className="mb-3.5">
            <Field label="UTR Number" hint="Set in the Tax tab under CIS settings">
              <Input value={org.cis?.contractorUTR || org.cisUtrNo || ""} readOnly />
            </Field>
          </div>
          <div className="mb-3.5">
            <div className="text-xs font-semibold text-[var(--text-primary)] mb-1.5">Qualifying income thresholds</div>
            <div className="text-xs text-[var(--text-tertiary)] leading-relaxed">
              From April 2026: <strong>£50,000</strong> · From April 2027: <strong>£30,000</strong> · From April 2028: <strong>£20,000</strong>
            </div>
          </div>
          <Field label="Quarterly Submission Reminders">
            <SlideToggle value={itsaQuarterlyReminders} onChange={setItsaQuarterlyReminders} />
          </Field>
          <div className="text-[11px] text-[var(--text-tertiary)] mt-1">
            Get reminded 7 days before each quarterly deadline.
          </div>
        </Section>
      ) : (
        <Section title="MTD ITSA configuration">
          <InfoBox>MTD ITSA applies to sole traders and landlords.</InfoBox>
        </Section>
      )}

      <div className="flex flex-col items-end gap-2 mt-4">
        {saveError && (
          <div className="flex items-center gap-1.5 text-sm text-[var(--danger-600)] font-semibold">
            <Icons.Alert /> {saveError}
          </div>
        )}
        <div className="flex items-center gap-2.5">
          {saved && (
            <div className="flex items-center gap-1.5 text-sm text-[var(--success-700)] font-semibold">
              <Icons.Check /> Saved.
            </div>
          )}
          <Btn onClick={handleSave} variant={saved ? "success" : "primary"} icon={<Icons.Save />}>
            Save HMRC settings
          </Btn>
        </div>
      </div>
    </>
  );
}
