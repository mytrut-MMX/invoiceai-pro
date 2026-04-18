import { useState } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "../router/routes";
import InvoiceSagaLogo from "./InvoiceSagaLogo";
import { Btn } from "./atoms";
import { Icons } from "./icons";

const NAV_LINKS = [
  { id: "features",  label: "Features",  to: ROUTES.FEATURES },
  { id: "pricing",   label: "Pricing",   to: ROUTES.PRICING },
  { id: "templates", label: "Templates", to: ROUTES.TEMPLATES },
];

export default function SharedNav({ activePage = "" }) {
  const [open, setOpen] = useState(false);

  const linkCls = (id) => [
    "text-[13px] transition-colors duration-150",
    activePage === id
      ? "text-[var(--text-primary)] font-medium"
      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
  ].join(" ");

  return (
    <nav className="sticky top-0 z-50 bg-[var(--surface-card)] border-b border-[var(--border-subtle)] h-[55px]">
      <div className="max-w-[1280px] mx-auto h-full px-[13px] lg:px-[34px] flex items-center justify-between">
        <Link to={ROUTES.LANDING} className="no-underline">
          <InvoiceSagaLogo height={22} />
        </Link>

        <div className="hidden lg:flex items-center gap-[21px]">
          {NAV_LINKS.map(l => (
            <Link key={l.id} to={l.to} className={linkCls(l.id)}>{l.label}</Link>
          ))}
          <div className="flex items-center gap-[8px] ml-2">
            <Link to={ROUTES.LOGIN}>
              <Btn variant="outline" size="sm">Log in</Btn>
            </Link>
            <Link to={ROUTES.SIGNUP}>
              <Btn variant="primary" size="sm">Start free →</Btn>
            </Link>
          </div>
        </div>

        <button
          onClick={() => setOpen(o => !o)}
          className="lg:hidden flex items-center justify-center w-9 h-9 rounded-[var(--radius-md)] text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] bg-transparent border-none cursor-pointer transition-colors duration-150"
          aria-label="Toggle menu"
        >
          {open ? <Icons.X /> : <Icons.ChevDown />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-[var(--border-subtle)] bg-[var(--surface-card)] px-[13px] py-[13px] flex flex-col gap-[13px]">
          {NAV_LINKS.map(l => (
            <Link
              key={l.id}
              to={l.to}
              onClick={() => setOpen(false)}
              className={linkCls(l.id)}
            >
              {l.label}
            </Link>
          ))}
          <div className="flex flex-col gap-[8px] pt-[13px] border-t border-[var(--border-subtle)]">
            <Link to={ROUTES.LOGIN} onClick={() => setOpen(false)}>
              <Btn variant="outline" size="sm">Log in</Btn>
            </Link>
            <Link to={ROUTES.SIGNUP} onClick={() => setOpen(false)}>
              <Btn variant="primary" size="sm">Start free →</Btn>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
