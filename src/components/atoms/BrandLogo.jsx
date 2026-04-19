export function BrandLogo({ size = 32 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="InvoiceSaga"
      role="img"
      style={{ flexShrink: 0 }}
    >
      <rect width="32" height="32" rx="7" fill="#408BFB" />
      <text
        x="16"
        y="22"
        textAnchor="middle"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif"
        fontSize="18"
        fontWeight="800"
        fill="white"
      >
        S
      </text>
    </svg>
  );
}
