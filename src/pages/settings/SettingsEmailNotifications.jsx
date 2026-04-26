import { useState, useEffect } from "react";
import { Icons } from "../../components/icons";
import { Btn, InfoBox } from "../../components/atoms";
import Section from "../../components/settings/Section";
import { useToast } from "../../components/ui/Toast";

// ─── Notification catalogue ──────────────────────────────────────────────────

const SECTIONS = [
  {
    title: "Invoices",
    items: [
      { key: "invoiceViewed",  label: "Invoice viewed by customer", description: "Get notified when a customer opens your invoice",                  defaultValue: true  },
      { key: "invoicePaid",    label: "Payment received",           description: "Get notified when an invoice is marked as paid",                   defaultValue: true  },
      { key: "invoiceOverdue", label: "Invoice becomes overdue",    description: "Get notified when an invoice passes its due date",                 defaultValue: true  },
      { key: "reminderSent",   label: "Reminder sent",              description: "Get notified when an automatic reminder is sent to a customer",    defaultValue: false },
    ],
  },
  {
    title: "Quotes",
    items: [
      { key: "quoteAccepted",  label: "Quote accepted",             description: "Get notified when a customer accepts a quote",                     defaultValue: true  },
      { key: "quoteExpired",   label: "Quote expired",              description: "Get notified when a quote passes its expiry date",                 defaultValue: false },
    ],
  },
  {
    title: "Self-billing",
    items: [
      { key: "sbaAgreementSigned",  label: "Agreement signed",                description: "Get notified when a customer signs a self-billing agreement", defaultValue: true },
      { key: "sbInvoiceReceived",   label: "Self-billed invoice received",    description: "Get notified when you receive a self-billed invoice",        defaultValue: true },
    ],
  },
];

const DEFAULTS = SECTIONS.flatMap(s => s.items).reduce(
  (acc, { key, defaultValue }) => ({ ...acc, [key]: defaultValue }),
  {}
);

const buildState = (saved) => {
  const src = saved || {};
  return Object.keys(DEFAULTS).reduce(
    (acc, key) => ({ ...acc, [key]: src[key] ?? DEFAULTS[key] }),
    {}
  );
};

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
        "relative w-11 h-6 rounded-full border-none cursor-pointer flex-shrink-0 transition-colors duration-200",
        disabled ? "opacity-50 cursor-not-allowed" : "",
        checked ? "bg-[var(--success-600)]" : "bg-[var(--border-default)]",
      ].join(" ")}
    >
      <div
        className={[
          "absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-all duration-200",
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

export default function SettingsEmailNotifications({ orgSettings, onSave }) {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState(() => buildState(orgSettings?.emailNotifications));
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    setPrefs(buildState(orgSettings?.emailNotifications));
  }, [orgSettings?.emailNotifications]);

  const togglePref = (key) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    setSaveError("");
    try {
      onSave({ emailNotifications: prefs });
      setSaved(true);
      toast({ title: "Email notification settings saved", variant: "success" });
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setSaveError("Something went wrong. Please try again.");
      toast({ title: "Failed to save email notification settings", variant: "danger" });
    }
  };

  const accountEmail = orgSettings?.email || "";

  return (
    <>
      {SECTIONS.map(section => (
        <Section key={section.title} title={section.title}>
          {section.items.map((item, i) => (
            <ToggleRow
              key={item.key}
              label={item.label}
              description={item.description}
              checked={prefs[item.key]}
              onChange={() => togglePref(item.key)}
              last={i === section.items.length - 1}
            />
          ))}
        </Section>
      ))}

      <Section title="Delivery preferences">
        <InfoBox>
          {accountEmail
            ? <>Notifications are sent to your account email: <strong>{accountEmail}</strong></>
            : "Notifications are sent to your account email. Add an email in Organisation settings to receive them."}
        </InfoBox>
      </Section>

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
            Save notification settings
          </Btn>
        </div>
      </div>
    </>
  );
}
