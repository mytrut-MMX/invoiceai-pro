// Single source of truth for company logo URL/size.
// Canonical: orgSettings.branding.logoUrl
// Legacy fallbacks (read-only — migrated on first load): logo, company_logo, ai_invoice_logo

const LEGACY_URL_KEYS = ["logo", "company_logo"];
const LEGACY_SIZE_KEYS = ["logoSize", "company_logo_size"];

/**
 * Returns the active company logo URL.
 * Empty string when none is set or branding.showLogo is explicitly false.
 */
export function getCompanyLogoUrl(orgSettings) {
  if (!orgSettings) return "";
  const branding = orgSettings.branding || {};
  if (branding.showLogo === false) return "";
  if (branding.logoUrl) return branding.logoUrl;
  for (const k of LEGACY_URL_KEYS) {
    if (orgSettings[k]) return orgSettings[k];
  }
  if (typeof localStorage !== "undefined") {
    const ls = localStorage.getItem("ai_invoice_logo");
    if (ls) return ls;
  }
  return "";
}

/** Returns the configured logo height (px) for HTML preview. Defaults 52. */
export function getCompanyLogoSize(orgSettings, override) {
  if (override) return Number(override) || 52;
  if (!orgSettings) return 52;
  const branding = orgSettings.branding || {};
  if (branding.logoSize) return Number(branding.logoSize) || 52;
  for (const k of LEGACY_SIZE_KEYS) {
    if (orgSettings[k]) return Number(orgSettings[k]) || 52;
  }
  if (typeof localStorage !== "undefined") {
    const ls = localStorage.getItem("ai_invoice_logo_size");
    if (ls) return Number(ls) || 52;
  }
  return 52;
}

/**
 * Whether the logo should be rendered globally.
 * Used by document generators as the top-level gate.
 */
export function isLogoEnabled(orgSettings) {
  if (!orgSettings) return false;
  const branding = orgSettings.branding || {};
  if (branding.showLogo === false) return false;
  return Boolean(getCompanyLogoUrl(orgSettings));
}

/**
 * One-time migration: copy legacy fields into branding.* if branding.logoUrl is empty.
 * Returns the migrated orgSettings (does NOT mutate input).
 * Caller is responsible for persisting via saveBusinessData.
 *
 * Returns { orgSettings, migrated: true } if anything changed, else { orgSettings, migrated: false }.
 */
export function migrateLegacyLogo(orgSettings) {
  if (!orgSettings) return { orgSettings, migrated: false };
  const branding = orgSettings.branding || {};
  if (branding.logoUrl) return { orgSettings, migrated: false };

  let legacyUrl = "";
  for (const k of LEGACY_URL_KEYS) {
    if (orgSettings[k]) { legacyUrl = orgSettings[k]; break; }
  }
  if (!legacyUrl && typeof localStorage !== "undefined") {
    legacyUrl = localStorage.getItem("ai_invoice_logo") || "";
  }
  if (!legacyUrl) return { orgSettings, migrated: false };

  let legacySize;
  for (const k of LEGACY_SIZE_KEYS) {
    if (orgSettings[k]) { legacySize = Number(orgSettings[k]); break; }
  }
  if (!legacySize && typeof localStorage !== "undefined") {
    const ls = localStorage.getItem("ai_invoice_logo_size");
    if (ls) legacySize = Number(ls);
  }

  return {
    orgSettings: {
      ...orgSettings,
      branding: {
        ...branding,
        logoUrl: legacyUrl,
        ...(legacySize ? { logoSize: legacySize } : {}),
        showLogo: branding.showLogo !== false,
      },
    },
    migrated: true,
  };
}