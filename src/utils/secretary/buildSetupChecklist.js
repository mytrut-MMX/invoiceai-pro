// Setup checklist — flags missing/incomplete account configuration.
// Pure function: (orgSettings) → setupItem[].
// Field names verified from src/pages/settings/SettingsOrganization.jsx,
// SettingsBranding.jsx, SettingsBanking.jsx — all live at top-level on orgSettings
// (e.g. orgSettings.bankAcc, NOT orgSettings.banking.accountNumber).

function nonEmpty(s) {
  return typeof s === "string" && s.trim().length > 0;
}

export function buildSetupChecklist(orgSettings) {
  const o = orgSettings || {};
  const out = [];

  if (!nonEmpty(o.orgName)) {
    out.push({
      id: "setup-org-name",
      category: "setup",
      obligation: "setup_check",
      severity: "warning",
      title: "Add your organisation name",
      description: "Your organisation name appears on every invoice, quote, and email you send.",
      action_label: "Open Organisation settings",
      action_route: "/settings?tab=org",
    });
  }

  const addressMissing = !nonEmpty(o.street) || !nonEmpty(o.city) || !nonEmpty(o.postcode);
  if (addressMissing) {
    out.push({
      id: "setup-address",
      category: "setup",
      obligation: "setup_check",
      severity: "warning",
      title: "Complete your business address",
      description: "Street, city, and postcode are required for invoice compliance.",
      action_label: "Open Organisation settings",
      action_route: "/settings?tab=org",
    });
  }

  if (o.vatReg === "Yes" && !nonEmpty(o.vatNum)) {
    out.push({
      id: "setup-vat-number",
      category: "setup",
      obligation: "setup_check",
      severity: "warning",
      title: "Add your VAT registration number",
      description: "You're VAT-registered but haven't entered your VAT number. This appears on every invoice.",
      action_label: "Open Tax settings",
      action_route: "/settings?tab=tax",
    });
  }

  // Banking is stored at top level (bankAcc / bankIban), not under .banking.
  if (!nonEmpty(o.bankAcc) && !nonEmpty(o.bankIban)) {
    out.push({
      id: "setup-bank-details",
      category: "setup",
      obligation: "setup_check",
      severity: "info",
      title: "Add bank details",
      description: "Customers pay faster when bank details are printed on the invoice.",
      action_label: "Open Banking settings",
      action_route: "/settings?tab=bank",
    });
  }

  if (!nonEmpty(o.branding?.logoUrl)) {
    out.push({
      id: "setup-logo",
      category: "setup",
      obligation: "setup_check",
      severity: "info",
      title: "Upload your logo",
      description: "A logo on invoices and quotes makes your business look more professional.",
      action_label: "Open Branding settings",
      action_route: "/settings?tab=branding",
    });
  }

  if (!nonEmpty(o.industry)) {
    out.push({
      id: "setup-industry",
      category: "setup",
      obligation: "setup_check",
      severity: "info",
      title: "Set your industry",
      description: "Helps surface relevant deadlines, expense categories, and tips.",
      action_label: "Open Organisation settings",
      action_route: "/settings?tab=org",
    });
  }

  return out;
}
