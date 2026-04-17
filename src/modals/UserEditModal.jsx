import { useState } from "react";
import { Icons } from "../components/icons";
import { Field, Input, Select, Toggle, SlideToggle, Btn } from "../components/atoms";
import { validateImageDataUrl } from "../utils/security";

const PRESET_THEMES = [
  { label: "Default",  type: "solid",    color: "#111110", color2: "#333330", accent: "#D97706" },
  { label: "Dark",     type: "solid",    color: "#1A1A1A", color2: "#333",    accent: "#E86C4A" },
  { label: "Ocean",    type: "gradient", color: "#1E3A8A", color2: "#0891B2", accent: "#38BDF8" },
  { label: "Forest",   type: "gradient", color: "#14532D", color2: "#166534", accent: "#4ADE80" },
  { label: "Sunset",   type: "gradient", color: "#7C2D12", color2: "#E86C4A", accent: "#FDBA74" },
  { label: "Violet",   type: "gradient", color: "#4C1D95", color2: "#7C3AED", accent: "#C4B5FD" },
  { label: "Slate",    type: "solid",    color: "#334155", color2: "#475569", accent: "#94A3B8" },
  { label: "Rose",     type: "gradient", color: "#881337", color2: "#E11D48", accent: "#FDA4AF" },
  { label: "Charcoal", type: "solid",    color: "#292524", color2: "#44403C", accent: "#FCD34D" },
];

export default function UserEditModal({ user, onClose, onSave, userAvatar, setUserAvatar, appTheme, setAppTheme, sidebarPinned, setSidebarPinned, onLogout }) {
  const [name, setName] = useState(user.name || "");
  const [role, setRole] = useState(user.role || "Admin");
  const [email, setEmail] = useState(user.email || "");
  const [tab, setTab] = useState("profile");
  const [localAvatar, setLocalAvatar] = useState(userAvatar);
  const [themeType, setThemeType] = useState(appTheme?.type || "solid");
  const [themeColor, setThemeColor] = useState(appTheme?.color || "#1A1A1A");
  const [themeColor2, setThemeColor2] = useState(appTheme?.color2 || "#E86C4A");
  const [themeAccent, setThemeAccent] = useState(appTheme?.accent || "#E86C4A");
  const [pinned, setPinned] = useState(sidebarPinned);

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target.result;
      if (validateImageDataUrl(result)) setLocalAvatar(result);
    };
    reader.readAsDataURL(file);
  };

  const previewBg = themeType === "gradient"
    ? `linear-gradient(160deg,${themeColor},${themeColor2})`
    : themeColor;

  const handleSave = () => {
    onSave({ name, role, email });
    setUserAvatar(localAvatar);
    setAppTheme({ type: themeType, color: themeColor, color2: themeColor2, accent: themeAccent });
    setSidebarPinned(pinned);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[3000] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-[520px] max-h-[92vh] shadow-[var(--shadow-popover)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-[var(--border-subtle)] px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] m-0">Profile & appearance</h2>
          <button
            onClick={onClose}
            className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] bg-transparent border-none cursor-pointer flex"
          >
            <Icons.X />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border-subtle)] px-6">
          {[["profile", "Profile"], ["appearance", "Appearance"]].map(([t, l]) => {
            const active = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={[
                  "py-3 px-4 bg-transparent border-none cursor-pointer text-sm transition-colors duration-150",
                  active
                    ? "text-[var(--text-primary)] font-semibold border-b-2 border-[var(--text-primary)] -mb-px"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]",
                ].join(" ")}
              >
                {l}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {tab === "profile" && (
            <>
              <div className="flex justify-center mb-5">
                <label className="cursor-pointer relative block">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold overflow-hidden border-[3px] border-[var(--surface-sunken)]"
                    style={{ background: themeColor }}
                  >
                    {localAvatar
                      ? <img src={localAvatar} alt="avatar" className="w-full h-full object-cover" />
                      : (name || "?")[0].toUpperCase()}
                  </div>
                  <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[var(--text-primary)] text-white flex items-center justify-center border-2 border-white">
                    <Icons.Plus />
                  </div>
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                </label>
              </div>
              {localAvatar && (
                <div className="text-center mb-4">
                  <button
                    onClick={() => setLocalAvatar(null)}
                    className="text-xs text-[var(--danger-600)] bg-transparent border-none cursor-pointer"
                  >
                    Remove photo
                  </button>
                </div>
              )}
              <Field label="Full Name" required>
                <Input value={name} onChange={setName} placeholder="Your name" />
              </Field>
              <Field label="Email">
                <Input value={email} onChange={setEmail} type="email" placeholder="email@example.com" />
              </Field>
              <Field label="Role">
                <Select value={role} onChange={setRole} options={["Admin", "Manager", "Accountant", "Viewer"]} />
              </Field>
              <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">
                <Btn onClick={() => { onClose(); onLogout?.(); }} variant="outline" icon={<Icons.X />}>Log out</Btn>
              </div>
            </>
          )}

          {tab === "appearance" && (
            <>
              {/* Sidebar preview */}
              <div className="rounded-[var(--radius-lg)] overflow-hidden mb-4 border border-[var(--border-subtle)]">
                <div className="px-3 py-3 flex items-center gap-2.5" style={{ background: previewBg }}>
                  <div
                    className="w-6 h-6 rounded-[var(--radius-sm)] flex items-center justify-center"
                    style={{ background: themeAccent }}
                  >
                    <Icons.Invoices />
                  </div>
                  <span className="text-white text-xs font-bold tracking-wider">InvoiceSaga</span>
                </div>
                <div className="px-2 pt-1 pb-2.5" style={{ background: previewBg }}>
                  {["Home", "Invoices", "Payments"].map(l => {
                    const active = l === "Invoices";
                    return (
                      <div
                        key={l}
                        className="flex items-center gap-2 my-0.5 px-2.5 py-1.5 rounded-[var(--radius-sm)] text-xs"
                        style={{
                          color: active ? themeAccent : "rgba(255,255,255,0.5)",
                          background: active ? `${themeAccent}22` : "none",
                        }}
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: active ? themeAccent : "rgba(255,255,255,0.2)" }}
                        />
                        {l}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Presets */}
              <div className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                Preset themes
              </div>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {PRESET_THEMES.map(p => {
                  const bg = p.type === "gradient" ? `linear-gradient(135deg,${p.color},${p.color2})` : p.color;
                  const active = themeColor === p.color && themeType === p.type;
                  return (
                    <button
                      key={p.label}
                      onClick={() => { setThemeType(p.type); setThemeColor(p.color); setThemeColor2(p.color2); setThemeAccent(p.accent); }}
                      className={[
                        "p-2 rounded-[var(--radius-md)] bg-white cursor-pointer transition-colors duration-150",
                        active ? "border-2 border-[var(--text-primary)]" : "border-2 border-[var(--border-subtle)] hover:border-[var(--border-default)]",
                      ].join(" ")}
                    >
                      <div className="h-5 rounded-[var(--radius-sm)] mb-1" style={{ background: bg }} />
                      <span className="text-[10px] font-medium text-[var(--text-secondary)]">{p.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom controls */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Style">
                  <Toggle
                    value={themeType === "gradient" ? "Gradient" : "Solid"}
                    onChange={v => setThemeType(v === "Gradient" ? "gradient" : "solid")}
                    options={["Solid", "Gradient"]}
                  />
                </Field>
                <Field label="Accent colour">
                  <div className="flex gap-1.5 items-center">
                    <input
                      type="color"
                      value={themeAccent}
                      onChange={e => setThemeAccent(e.target.value)}
                      className="w-9 h-9 rounded-[var(--radius-md)] border border-[var(--border-default)] p-0.5 cursor-pointer"
                    />
                    <span className="text-[11px] text-[var(--text-tertiary)] font-mono">{themeAccent}</span>
                  </div>
                </Field>
                <Field label={themeType === "gradient" ? "Gradient start" : "Sidebar colour"}>
                  <div className="flex gap-1.5 items-center">
                    <input
                      type="color"
                      value={themeColor}
                      onChange={e => setThemeColor(e.target.value)}
                      className="w-9 h-9 rounded-[var(--radius-md)] border border-[var(--border-default)] p-0.5 cursor-pointer"
                    />
                    <span className="text-[11px] text-[var(--text-tertiary)] font-mono">{themeColor}</span>
                  </div>
                </Field>
                {themeType === "gradient" && (
                  <Field label="Gradient end">
                    <div className="flex gap-1.5 items-center">
                      <input
                        type="color"
                        value={themeColor2}
                        onChange={e => setThemeColor2(e.target.value)}
                        className="w-9 h-9 rounded-[var(--radius-md)] border border-[var(--border-default)] p-0.5 cursor-pointer"
                      />
                      <span className="text-[11px] text-[var(--text-tertiary)] font-mono">{themeColor2}</span>
                    </div>
                  </Field>
                )}
              </div>

              <div className="mt-4">
                <div className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                  Sidebar behaviour
                </div>
                <div className="flex items-center justify-between px-3 py-2.5 bg-[var(--surface-sunken)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">Pinned sidebar</div>
                    <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">Always visible · hover to show when unpinned</div>
                  </div>
                  <SlideToggle value={pinned} onChange={setPinned} />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border-subtle)] px-6 py-4 flex gap-2 justify-end">
          <Btn onClick={onClose} variant="outline">Cancel</Btn>
          <Btn onClick={handleSave} variant="primary" disabled={!name}>Save changes</Btn>
        </div>
      </div>
    </div>
  );
}
