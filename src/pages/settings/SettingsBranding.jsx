import { useState, useEffect, useContext, useRef } from "react";
import { Icons } from "../../components/icons";
import { Field, Btn, InfoBox } from "../../components/atoms";
import Section from "../../components/settings/Section";
import { useToast } from "../../components/ui/Toast";
import { AppCtx } from "../../context/AppContext";
import { supabase } from "../../lib/supabase";

const PRESET_COLORS = [
  { hex: "#1e6be0", name: "Classic blue" },
  { hex: "#2563EB", name: "Modern blue" },
  { hex: "#16A34A", name: "Minimal green" },
  { hex: "#E86C4A", name: "Branded terracotta" },
  { hex: "#7C3AED", name: "Purple" },
  { hex: "#0891B2", name: "Teal" },
  { hex: "#DC2626", name: "Red" },
  { hex: "#1A1A1A", name: "Black" },
];

const HEX_RE = /^[0-9A-Fa-f]{6}$/;
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/svg+xml"];

const textareaCls =
  "w-full px-3 py-2 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-[var(--surface-card)] outline-none focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)] transition-colors duration-150 box-border resize-vertical font-[inherit]";

const stripHash = (v) => (v || "").replace(/^#/, "");

export default function SettingsBranding({ orgSettings, onSave }) {
  const { toast } = useToast();
  const { user } = useContext(AppCtx);
  const fileInputRef = useRef(null);

  const branding = orgSettings?.branding || {};

  const [accentColor, setAccentColor] = useState(branding.accentColor || "#1e6be0");
  const [hexInput,    setHexInput]    = useState(stripHash(branding.accentColor || "#1e6be0"));
  const [hexError,    setHexError]    = useState("");
  const [footerText,  setFooterText]  = useState(branding.footerText || "");
  const [logoUrl,     setLogoUrl]     = useState(branding.logoUrl || "");
  const [uploading,   setUploading]   = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [saveError,   setSaveError]   = useState("");

  useEffect(() => {
    const b = orgSettings?.branding || {};
    setAccentColor(b.accentColor || "#1e6be0");
    setHexInput(stripHash(b.accentColor || "#1e6be0"));
    setFooterText(b.footerText || "");
    setLogoUrl(b.logoUrl || "");
  }, [orgSettings?.branding]);

  const applyHex = (raw) => {
    const cleaned = stripHash(raw).slice(0, 6);
    setHexInput(cleaned);
    if (cleaned.length === 0) {
      setHexError("");
      return;
    }
    if (!HEX_RE.test(cleaned)) {
      setHexError("Enter a 6-character hex value");
      return;
    }
    setHexError("");
    setAccentColor(`#${cleaned.toUpperCase()}`);
  };

  const pickPreset = (hex) => {
    setAccentColor(hex);
    setHexInput(stripHash(hex));
    setHexError("");
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast({ title: "Logo must be PNG, JPEG or SVG", variant: "danger" });
      e.target.value = "";
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast({ title: "Logo must be 2MB or smaller", variant: "danger" });
      e.target.value = "";
      return;
    }
    if (!user?.id) {
      toast({ title: "Sign in to upload a logo", variant: "danger" });
      e.target.value = "";
      return;
    }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("logos")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("logos").getPublicUrl(path);
      setLogoUrl(pub?.publicUrl || "");
      toast({ title: "Logo uploaded", variant: "success" });
    } catch (err) {
      toast({
        title: err?.message
          ? `Logo upload failed: ${err.message}`
          : "Logo upload failed",
        variant: "danger",
      });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl("");
  };

  const handleSave = () => {
    if (hexInput && !HEX_RE.test(hexInput)) {
      setHexError("Enter a 6-character hex value");
      setSaveError("Please fix the errors before saving.");
      return;
    }
    setSaveError("");
    try {
      onSave({
        branding: {
          accentColor,
          footerText,
          logoUrl,
        },
      });
      setSaved(true);
      toast({ title: "Branding settings saved", variant: "success" });
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setSaveError("Something went wrong. Please try again.");
      toast({ title: "Failed to save branding settings", variant: "danger" });
    }
  };

  return (
    <>
      <Section title="Accent colour">
        <p className="text-sm text-[var(--text-secondary)] m-0 mb-3">
          Used for headers, totals and accents on your PDF invoices and quotes.
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {PRESET_COLORS.map(({ hex, name }) => {
            const active = accentColor.toLowerCase() === hex.toLowerCase();
            return (
              <button
                key={hex}
                type="button"
                title={name}
                onClick={() => pickPreset(hex)}
                className={[
                  "w-8 h-8 rounded-full cursor-pointer transition-transform duration-150",
                  active
                    ? "ring-2 ring-offset-2 ring-[var(--brand-600)] scale-110"
                    : "ring-1 ring-[var(--border-default)] hover:scale-105",
                ].join(" ")}
                style={{ backgroundColor: hex }}
              />
            );
          })}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-3.5 items-start">
          <Field label="Custom hex" hint="Six characters, e.g. 1E6BE0" error={hexError}>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-[var(--text-tertiary)]">#</span>
              <input
                type="text"
                value={hexInput}
                onChange={(e) => applyHex(e.target.value)}
                placeholder="1E6BE0"
                maxLength={6}
                className={[
                  "w-full h-9 px-3 rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-white outline-none transition-colors duration-150 box-border font-mono uppercase",
                  hexError
                    ? "border border-[var(--danger-600)] focus:shadow-[var(--focus-ring)]"
                    : "border border-[var(--border-default)] focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)]",
                ].join(" ")}
              />
            </div>
          </Field>
          <Field label="Preview">
            <div
              className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--border-default)]"
              style={{ backgroundColor: accentColor }}
              aria-label={`Accent colour preview ${accentColor}`}
            />
          </Field>
        </div>
      </Section>

      <Section title="Invoice footer">
        <Field label="Footer text" hint="Appears at the bottom of every page on your PDF invoices">
          <textarea
            value={footerText}
            onChange={(e) => setFooterText(e.target.value)}
            rows={2}
            placeholder="e.g. Thank you for your business · invoicesaga.com"
            className={textareaCls}
          />
        </Field>
      </Section>

      <Section title="Company logo">
        <div className="flex items-start gap-5 mb-3">
          <div className="w-[120px] h-[80px] rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-sunken)] flex items-center justify-center overflow-hidden flex-shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt="Company logo" className="max-w-full max-h-full object-contain" />
            ) : (
              <span className="text-xs text-[var(--text-tertiary)]">No logo</span>
            )}
          </div>
          <div className="flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              onChange={handleLogoChange}
              className="hidden"
            />
            <div className="flex items-center gap-2 mb-2">
              <Btn
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                disabled={uploading}
              >
                {uploading ? "Uploading…" : logoUrl ? "Replace logo" : "Upload logo"}
              </Btn>
              {logoUrl && (
                <Btn onClick={handleRemoveLogo} variant="ghost" disabled={uploading}>
                  Remove
                </Btn>
              )}
            </div>
            <p className="text-xs text-[var(--text-tertiary)] m-0">
              PNG, JPEG or SVG · max 2MB
            </p>
          </div>
        </div>
        <InfoBox>
          Your logo will appear on invoices and quotes. Recommended size: 200×80px. PNG or SVG preferred.
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
            Save branding settings
          </Btn>
        </div>
      </div>
    </>
  );
}
