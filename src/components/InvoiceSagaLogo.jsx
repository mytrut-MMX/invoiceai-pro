import { ff } from "../constants";
import { Icons } from "./icons";

export default function InvoiceSagaLogo({ height = 24, dark = false }) {
  const iconSize = Math.max(20, Math.round(height * 1.15));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <div style={{ width: iconSize, height: iconSize, background: "#1e6be0", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icons.Invoices />
      </div>
      <span style={{ color: dark ? "#fff" : "#1a1a2e", fontSize: Math.max(12, Math.round(height * 0.54)), fontWeight: 800, letterSpacing: "0.06em", fontFamily: ff }}>
        InvoiceSaga
      </span>
    </div>
  );
}
