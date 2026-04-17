import { Icons } from "./icons";

export default function InvoiceSagaLogo({ height = 24, dark = false }) {
  const iconSize = Math.max(20, Math.round(height * 1.15));
  const textSize = Math.max(12, Math.round(height * 0.54));
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={[
          "rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0",
          dark ? "bg-white/15" : "bg-[var(--text-primary)]",
        ].join(" ")}
        style={{ width: iconSize, height: iconSize }}
      >
        <Icons.Receipt />
      </div>
      <span
        className={[
          "font-bold tracking-wider",
          dark ? "text-white" : "text-[var(--text-primary)]",
        ].join(" ")}
        style={{ fontSize: textSize }}
      >
        InvoiceSaga
      </span>
    </div>
  );
}
