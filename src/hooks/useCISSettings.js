import { useContext, useState, useEffect } from "react";
import { AppCtx } from "../context/AppContext";

function readCIS() {
  const legacyRaw = localStorage.getItem("invoicesaga_settings");
  const orgRaw = localStorage.getItem("ai_invoice_org");

  let legacyCis = {};
  let org = {};

  try { legacyCis = legacyRaw ? JSON.parse(legacyRaw)?.cis ?? {} : {}; } catch { legacyCis = {}; }
  try { org = orgRaw ? JSON.parse(orgRaw) ?? {} : {}; } catch { org = {}; }

  const orgCis = org?.cis ?? {};
  const enabledFromOrg = orgCis?.enabled ?? (org?.cisReg === "Yes");

  return {
    enabled: legacyCis?.enabled ?? enabledFromOrg ?? false,
    defaultRate: Number(legacyCis?.defaultRate ?? orgCis?.defaultRate ?? org?.cisRate ?? 20) || 20,
    contractorName: legacyCis?.contractorName ?? orgCis?.contractorName ?? "",
    contractorAddress: legacyCis?.contractorAddress ?? orgCis?.contractorAddress ?? org?.address ?? "",
    contractorUTR: legacyCis?.contractorUTR ?? orgCis?.contractorUTR ?? org?.cisUtrNo ?? "",
    employerRef: legacyCis?.employerRef ?? orgCis?.employerRef ?? "",
  };
}

export function useCISSettings() {
  const app = useContext(AppCtx);
  const orgCis = app?.orgSettings?.cis ?? {};
  const appDerived = app?.orgSettings ? {
    enabled: orgCis?.enabled ?? (app.orgSettings?.cisReg === "Yes"),
    defaultRate: Number(orgCis?.defaultRate ?? app.orgSettings?.cisRate ?? 20) || 20,
    contractorName: orgCis?.contractorName ?? "",
    contractorAddress: orgCis?.contractorAddress ?? app.orgSettings?.address ?? "",
    contractorUTR: orgCis?.contractorUTR ?? app.orgSettings?.cisUtrNo ?? "",
    employerRef: orgCis?.employerRef ?? "",
  } : null;

  const [cis, setCIS] = useState(() => appDerived || readCIS());

  useEffect(() => {
    if (appDerived) setCIS(appDerived);
  }, [appDerived?.enabled, appDerived?.defaultRate, appDerived?.contractorName, appDerived?.contractorAddress, appDerived?.contractorUTR, appDerived?.employerRef]);

  useEffect(() => {
    if (appDerived) return () => {};
    const handler = () => setCIS(readCIS());
    window.addEventListener("storage", handler);
    window.addEventListener("focus", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("focus", handler);
    };
  }, []);

  return {
    cisEnabled: cis?.enabled ?? false,
    cisDefaultRate: cis?.defaultRate ?? 20,
    contractorName: cis?.contractorName ?? "",
    contractorAddress: cis?.contractorAddress ?? "",
    contractorUTR: cis?.contractorUTR ?? "",
    employerRef: cis?.employerRef ?? "",
  };
}
