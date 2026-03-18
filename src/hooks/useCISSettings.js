export function useCISSettings() {
  const raw = localStorage.getItem("invoicesaga_settings");
  const settings = raw ? JSON.parse(raw) : {};

  return {
    cisEnabled: settings?.cis?.enabled ?? false,
    cisDefaultRate: settings?.cis?.defaultRate ?? 20,
    contractorName: settings?.cis?.contractorName ?? "",
    contractorUTR: settings?.cis?.contractorUTR ?? "",
    employerRef: settings?.cis?.employerRef ?? "",
  };
}
