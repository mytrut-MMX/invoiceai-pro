import { Link } from "react-router-dom";

const FULL_LINKS = [
  { href: "/",              label: "Home" },
  { href: "/templates",     label: "Templates" },
  { href: "/contact",       label: "Contact" },
  { href: "/feedback",      label: "Feedback" },
  { href: "/privacy",       label: "Privacy Policy" },
  { href: "/terms",         label: "Terms of Service" },
  { href: "/cookies",       label: "Cookie Policy" },
  { href: "/gdpr",          label: "GDPR" },
  { href: "/refund-policy", label: "Refund Policy" },
];

const MIN_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms",   label: "Terms of Service" },
  { href: "/contact", label: "Contact" },
];

export default function SharedFooter({ links = "full" }) {
  const activeLinks = links === "min" ? MIN_LINKS : FULL_LINKS;
  return (
    <footer className="bg-[var(--surface-dark)] py-8 px-6">
      <div className="max-w-[1280px] mx-auto text-center">
        <div className="mb-3">
          <span className="text-[var(--brand-500)] font-bold tracking-wider text-base">InvoiceSaga</span>
        </div>
        <div className="text-sm text-white/50 leading-relaxed">
          {activeLinks.map((link, i) => (
            <span key={link.href}>
              {i > 0 && <span className="mx-2 text-white/30">·</span>}
              <Link to={link.href} className="text-white/50 hover:text-white/70 no-underline transition-colors duration-150">
                {link.label}
              </Link>
            </span>
          ))}
        </div>
        <div className="text-xs text-white/40 mt-4">© {new Date().getFullYear()} InvoiceSaga. All rights reserved.</div>
      </div>
    </footer>
  );
}
