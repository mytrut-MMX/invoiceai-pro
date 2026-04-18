import { useState, useContext, useEffect } from "react";
import { AppCtx } from "../../context/AppContext";
import { Icons } from "../../components/icons";
import { Field, Input, Btn } from "../../components/atoms";
import Section from "../../components/settings/Section";

const ACCENT_PRESETS = ["#E86C4A", "#2563EB", "#16A34A", "#D97706", "#9333EA", "#0891B2", "#E11D48", "#1A1A1A"];
const SIDEBAR_PRESETS = [
  { label: "Dark",    color: "#1A1A1A" },
  { label: "Slate",   color: "#1E293B" },
  { label: "Navy",    color: "#1E3A5F" },
  { label: "Forest",  color: "#1A3A2A" },
  { label: "Plum",    color: "#2D1B3D" },
  { label: "White",   color: "#FFFFFF" },
];

export default function SettingsAppearance() {
  const { appTheme, setAppTheme } = useContext(AppCtx);

  const [themeType,   setThemeType]   = useState(appTheme?.type || "solid");
  const [themeColor,  setThemeColor]  = useState(appTheme?.color || "#1A1A1A");
  const [themeColor2, setThemeColor2] = useState(appTheme?.color2 || "#333");
  const [accentColor, setAccentColor] = useState(appTheme?.accent || "#E86C4A");
  const [saved,       setSaved]       = useState(false);
  const [saveError,   setSaveError]   = useState("");

  useEffect(() => {
    setThemeType(appTheme?.type || "solid");
    setThemeColor(appTheme?.color || "#1A1A1A");
    setThemeColor2(appTheme?.color2 || "#333");
    setAccentColor(appTheme?.accent || "#E86C4A");
  }, [appTheme]);

  const handleSave = () => {
    setSaveError("");
    try {
      setAppTheme({ type: themeType, color: themeColor, color2: themeColor2, accent: accentColor });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError("Something went wrong. Please try again.");
    }
  };

  return (
    <>
      <Section title="Sidebar appearance">
        <div className="mb-4">
          <div className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2.5">
            Style
          </div>
          <div className="flex gap-2">
            {["solid", "gradient"].map(t => {
              const active = themeType === t;
              return (
                <button
                  key={t}
                  onClick={() => setThemeType(t)}
                  className={[
                    "h-8 px-4 rounded-[var(--radius-md)] text-xs font-semibold cursor-pointer transition-colors duration-150 capitalize",
                    active
                      ? "bg-[var(--brand-50)] text-[var(--brand-700)] border border-[var(--brand-600)]"
                      : "bg-white text-[var(--text-secondary)] border border-[var(--border-default)] hover:bg-[var(--surface-sunken)]",
                  ].join(" ")}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <Field label="Sidebar Presets">
            <div className="flex gap-1.5 flex-wrap">
              {SIDEBAR_PRESETS.map(p => {
                const active = themeColor === p.color;
                return (
                  <button
                    key={p.color}
                    onClick={() => setThemeColor(p.color)}
                    title={p.label}
                    className="w-7 h-7 rounded-full cursor-pointer outline-none"
                    style={{
                      background: p.color,
                      border: `2px solid ${active ? "var(--brand-600)" : "transparent"}`,
                      boxShadow: p.color === "#FFFFFF" ? "inset 0 0 0 1px var(--border-default)" : "none",
                    }}
                  />
                );
              })}
            </div>
          </Field>

          <Field label="Sidebar Colour">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={themeColor}
                onChange={e => setThemeColor(e.target.value)}
                className="w-9 h-9 border-none bg-transparent cursor-pointer rounded-[var(--radius-md)]"
              />
              <div className="flex-1">
                <Input value={themeColor} onChange={setThemeColor} placeholder="#1A1A1A" />
              </div>
            </div>
          </Field>

          {themeType === "gradient" && (
            <Field label="Gradient End Colour">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={themeColor2}
                  onChange={e => setThemeColor2(e.target.value)}
                  className="w-9 h-9 border-none bg-transparent cursor-pointer rounded-[var(--radius-md)]"
                />
                <div className="flex-1">
                  <Input value={themeColor2} onChange={setThemeColor2} placeholder="#333" />
                </div>
              </div>
            </Field>
          )}

          <Field label="Accent Colour">
            <div className="flex flex-col gap-2">
              <div className="flex gap-1 flex-wrap">
                {ACCENT_PRESETS.map(c => {
                  const active = accentColor === c;
                  return (
                    <button
                      key={c}
                      onClick={() => setAccentColor(c)}
                      className="w-6 h-6 rounded-full cursor-pointer outline-none"
                      style={{
                        background: c,
                        border: `2px solid ${active ? "var(--brand-600)" : "transparent"}`,
                      }}
                    />
                  );
                })}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={e => setAccentColor(e.target.value)}
                  className="w-9 h-9 border-none bg-transparent cursor-pointer rounded-[var(--radius-md)]"
                />
                <div className="flex-1">
                  <Input value={accentColor} onChange={setAccentColor} placeholder="#E86C4A" />
                </div>
              </div>
            </div>
          </Field>
        </div>

        {/* Preview bar */}
        <div
          className="mt-3.5 h-10 rounded-[var(--radius-lg)] flex items-center px-4 gap-3"
          style={{
            background: themeType === "gradient"
              ? `linear-gradient(90deg,${themeColor},${themeColor2})`
              : themeColor,
          }}
        >
          <div
            className="w-5 h-5 rounded-[var(--radius-sm)] flex items-center justify-center"
            style={{ background: accentColor }}
          >
            <Icons.Invoices />
          </div>
          <span
            className="text-white text-xs font-bold tracking-wider"
            style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
          >
            InvoSaga
          </span>
          <div className="ml-auto w-5 h-5 rounded-full" style={{ background: accentColor }} />
        </div>
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
            Save appearance settings
          </Btn>
        </div>
      </div>
    </>
  );
}
