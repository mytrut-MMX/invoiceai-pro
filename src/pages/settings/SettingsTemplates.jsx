import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../router/routes";
import { PDF_TEMPLATES } from "../../constants";
import { AppCtx } from "../../context/AppContext";
import { Icons } from "../../components/icons";
import { Field, Btn } from "../../components/atoms";
import { validateImageDataUrl } from "../../utils/security";
import Section from "../../components/settings/Section";

export default function SettingsTemplates({ onPreview }) {
  const navigate = useNavigate();
  const {
    pdfTemplate, setPdfTemplate,
    companyLogo, setCompanyLogo,
    companyLogoSize, setCompanyLogoSize,
    footerText, setFooterText,
  } = useContext(AppCtx);

  const [selectedTpl, setSelectedTpl] = useState(pdfTemplate || "classic");
  const [logoSize,    setLogoSize]    = useState(companyLogoSize || 52);
  const [footer,      setFooter]      = useState(footerText || "");
  const [saved,       setSaved]       = useState(false);
  const [saveError,   setSaveError]   = useState("");

  useEffect(() => {
    setSelectedTpl(pdfTemplate || "classic");
    setLogoSize(companyLogoSize || 52);
    setFooter(footerText || "");
  }, [pdfTemplate, companyLogoSize, footerText]);

  const handleSave = () => {
    setSaveError("");
    try {
      setPdfTemplate(selectedTpl);
      setCompanyLogoSize(logoSize);
      setFooterText(footer);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError("Something went wrong. Please try again.");
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target.result;
      if (validateImageDataUrl(result)) {
        setCompanyLogo(result);
      } else {
        setSaveError("Invalid image format. Please upload a PNG, JPEG, or WebP file under 2MB.");
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <Section title="PDF invoice templates">
        <div className="flex justify-end mb-3">
          <Btn onClick={() => navigate(ROUTES.SETTINGS_TEMPLATES)} variant="outline" icon={<Icons.Pen />}>
            Open dedicated template page
          </Btn>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 mb-4">
          {PDF_TEMPLATES.map(tpl => {
            const sel = selectedTpl === tpl.id;
            return (
              <div
                key={tpl.id}
                onClick={() => setSelectedTpl(tpl.id)}
                className={[
                  "rounded-[var(--radius-lg)] overflow-hidden cursor-pointer transition-all duration-150",
                  sel
                    ? "border-2 border-[var(--brand-600)] bg-[var(--brand-50)]"
                    : "border-2 border-[var(--border-subtle)] bg-white hover:border-[var(--border-default)] hover:shadow-[var(--shadow-sm)]",
                ].join(" ")}
              >
                <div
                  className="h-20 flex items-center justify-center relative"
                  style={{ background: tpl.defaultBg, borderBottom: `3px solid ${tpl.defaultAccent}` }}
                >
                  <div
                    className="w-15 h-2 rounded-sm opacity-80"
                    style={{ background: tpl.defaultAccent, width: 60 }}
                  />
                  <div className="absolute left-2.5 right-2.5 bottom-2">
                    {[1, 2, 3].map(i => (
                      <div
                        key={i}
                        className="h-1 rounded-sm mb-0.5"
                        style={{
                          background: tpl.defaultAccent,
                          opacity: 0.15 + (i * 0.1),
                          width: `${80 - i * 15}%`,
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="px-3 py-2.5 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[var(--text-primary)] truncate">{tpl.name}</div>
                    <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5 truncate">{tpl.description}</div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); onPreview(tpl.id); }}
                    title="Preview template"
                    className="bg-transparent border-none cursor-pointer text-[var(--text-tertiary)] hover:text-[var(--brand-600)] p-1 flex rounded transition-colors duration-150"
                  >
                    <Icons.Eye />
                  </button>
                </div>
                {sel && (
                  <div className="px-3 pb-2.5 flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[var(--brand-600)]" />
                    <span className="text-[11px] text-[var(--brand-700)] font-semibold">Selected</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <Field label="Company Logo">
            <div className="flex items-center gap-2.5 flex-wrap">
              {companyLogo && (
                <img
                  src={companyLogo}
                  alt="logo"
                  className="max-h-10 max-w-[120px] object-contain rounded border border-[var(--border-subtle)] shadow-[var(--shadow-sm)]"
                />
              )}
              <label className="cursor-pointer inline-flex items-center gap-1.5 h-9 px-3 bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--border-subtle)] transition-colors duration-150">
                <Icons.Items /> {companyLogo ? "Change logo" : "Upload logo"}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </label>
              {companyLogo && (
                <button
                  onClick={() => setCompanyLogo(null)}
                  className="text-[var(--text-tertiary)] hover:text-[var(--danger-600)] bg-transparent border-none cursor-pointer p-1 flex transition-colors duration-150"
                >
                  <Icons.X />
                </button>
              )}
            </div>
          </Field>
          <Field label={`Logo Size: ${logoSize}px`}>
            <input
              type="range"
              min={24}
              max={100}
              value={logoSize}
              onChange={e => setLogoSize(Number(e.target.value))}
              className="w-full accent-[var(--brand-600)]"
            />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Invoice Footer Text">
            <textarea
              value={footer}
              onChange={e => setFooter(e.target.value)}
              rows={2}
              placeholder="e.g. Thank you for your business! Registered in England & Wales No. 12345678"
              className="w-full px-3 py-2 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-white outline-none focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)] resize-y box-border"
            />
          </Field>
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
            Save template settings
          </Btn>
        </div>
      </div>
    </>
  );
}
