import { useState, useEffect } from "react";
import { Icons } from "../../components/icons";
import { Btn, InfoBox } from "../../components/atoms";
import Section from "../../components/settings/Section";
import { useToast } from "../../components/ui/Toast";

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_SCHEDULE = [
  { days: 1,  enabled: true },
  { days: 7,  enabled: true },
  { days: 14, enabled: false },
  { days: 30, enabled: true },
];

const DEFAULT_SUBJECT = "Reminder: Invoice {invoice_number} is overdue";

const DEFAULT_BODY =
  "Dear {customer_name},\n\n" +
  "This is a friendly reminder that invoice {invoice_number} for {amount_due} " +
  "was due on {due_date}.\n\n" +
  "Please arrange payment at your earliest convenience.\n\n" +
  "Kind regards,\n{company_name}";

const MERGE_TAGS = [
  { tag: "{customer_name}",   label: "Customer name" },
  { tag: "{invoice_number}",  label: "Invoice number" },
  { tag: "{amount_due}",      label: "Amount due" },
  { tag: "{due_date}",        label: "Due date" },
  { tag: "{days_overdue}",    label: "Days overdue" },
  { tag: "{company_name}",    label: "Your company name" },
];

const INTERVAL_LABELS = {
  1:  "1 day overdue",
  7:  "7 days overdue",
  14: "14 days overdue",
  30: "30 days overdue",
};

const textareaCls =
  "w-full px-3 py-2 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-[var(--surface-card)] outline-none focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)] transition-colors duration-150 box-border resize-vertical font-[inherit]";

const inputCls =
  "w-full h-9 px-3 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-[var(--surface-card)] outline-none focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)] transition-colors duration-150 box-border";

// ─── Toggle switch ───────────────────────────────────────────────────────────

function Switch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        "relative w-11 h-6 p-0 rounded-full border-none cursor-pointer flex-shrink-0 transition-colors duration-200",
        disabled ? "opacity-50 cursor-not-allowed" : "",
        checked ? "bg-[var(--success-600)]" : "bg-[var(--border-default)]",
      ].join(" ")}
    >
      <div
        className={[
          "absolute top-1/2 -translate-y-1/2 w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-all duration-200",
          checked ? "left-[23px]" : "left-[3px]",
        ].join(" ")}
      />
    </button>
  );
}

// ─── Toggle row ──────────────────────────────────────────────────────────────

function ToggleRow({ label, description, checked, onChange, disabled, last }) {
  return (
    <div className={[
      "flex items-start justify-between py-3",
      last ? "" : "border-b border-[var(--border-subtle)]",
    ].join(" ")}>
      <div className="pr-6">
        <p className="text-sm font-medium text-[var(--text-primary)] m-0">{label}</p>
        {description && (
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 m-0">{description}</p>
        )}
      </div>
      <Switch checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SettingsReminders({ orgSettings, onSave }) {
  const { toast } = useToast();
  const reminders = orgSettings?.reminders || {};

  const [enabled,  setEnabled]  = useState(reminders.enabled ?? false);
  const [schedule, setSchedule] = useState(reminders.schedule || DEFAULT_SCHEDULE);
  const [subject,  setSubject]  = useState(reminders.subject || DEFAULT_SUBJECT);
  const [body,     setBody]     = useState(reminders.body || DEFAULT_BODY);
  const [saved,    setSaved]    = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!orgSettings?.reminders) return;
    const r = orgSettings.reminders;
    setEnabled(r.enabled ?? false);
    setSchedule(r.schedule || DEFAULT_SCHEDULE);
    setSubject(r.subject || DEFAULT_SUBJECT);
    setBody(r.body || DEFAULT_BODY);
  }, [orgSettings?.reminders]);

  const toggleInterval = (days) => {
    setSchedule(prev => prev.map(s =>
      s.days === days ? { ...s, enabled: !s.enabled } : s
    ));
  };

  const handleSave = () => {
    setSaveError("");
    try {
      onSave({
        reminders: {
          enabled,
          schedule,
          subject: subject.trim(),
          body: body.trim(),
        },
      });
      setSaved(true);
      toast({ title: "Reminder settings saved", variant: "success" });
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setSaveError("Something went wrong. Please try again.");
      toast({ title: "Failed to save reminder settings", variant: "danger" });
    }
  };

  const activeCount = schedule.filter(s => s.enabled).length;

  return (
    <>
      {/* Master toggle */}
      <Section title="Automatic reminders">
        <ToggleRow
          label="Enable automatic invoice reminders"
          description={
            enabled
              ? `Reminders will be sent at ${activeCount} interval${activeCount !== 1 ? "s" : ""} after the due date.`
              : "When enabled, overdue invoices trigger automatic email reminders to your customers."
          }
          checked={enabled}
          onChange={setEnabled}
          last
        />
        <InfoBox>
          Reminders are only sent for invoices with status "Sent" or "Viewed" that are past their due date.
          Paid, voided, and draft invoices are never chased.
        </InfoBox>
      </Section>

      {/* Schedule */}
      <Section title="Reminder schedule">
        <p className="text-sm text-[var(--text-secondary)] m-0 mb-3">
          Choose when to send reminders after an invoice becomes overdue.
        </p>
        {schedule.map((s, i) => (
          <ToggleRow
            key={s.days}
            label={INTERVAL_LABELS[s.days] || `${s.days} days overdue`}
            description={s.enabled && enabled ? "Reminder will be sent" : null}
            checked={s.enabled}
            onChange={() => toggleInterval(s.days)}
            disabled={!enabled}
            last={i === schedule.length - 1}
          />
        ))}
      </Section>

      {/* Email template */}
      <Section title="Email template">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Subject line
            </label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              disabled={!enabled}
              placeholder={DEFAULT_SUBJECT}
              className={[inputCls, !enabled ? "opacity-50" : ""].join(" ")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Message body
            </label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              disabled={!enabled}
              rows={8}
              placeholder={DEFAULT_BODY}
              className={[textareaCls, !enabled ? "opacity-50" : ""].join(" ")}
            />
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 m-0">
              Available merge tags
            </p>
            <div className="flex flex-wrap gap-1.5">
              {MERGE_TAGS.map(({ tag, label }) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--surface-sunken)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] text-xs text-[var(--text-secondary)] font-mono"
                  title={label}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Save footer */}
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
            Save reminder settings
          </Btn>
        </div>
      </div>
    </>
  );
}
