import { useState, useEffect } from "react";

export function useCISSettings() {
  const [cis, setCIS] = useState(() => {
    const raw = localStorage.getItem("invoicesaga_settings");
    return raw ? JSON.parse(raw)?.cis ?? {} : {};
  });

  useEffect(() => {
    const handler = () => {
      const raw = localStorage.getItem("invoicesaga_settings");
      setCIS(raw ? JSON.parse(raw)?.cis ?? {} : {});
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return {
    cisEnabled:     cis?.enabled        ?? false,
    cisDefaultRate: cis?.defaultRate     ?? 20,
    contractorName: cis?.contractorName  ?? "",
    contractorUTR:  cis?.contractorUTR   ?? "",
    employerRef:    cis?.employerRef      ?? "",
  };
}
