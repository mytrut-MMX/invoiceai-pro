import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../router/routes";
import { Icons } from "../../components/icons";
import { Btn } from "../../components/atoms";
import Section from "../../components/settings/Section";

export default function SettingsLedger() {
  const navigate = useNavigate();

  return (
    <Section title="General ledger">
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <p className="m-0 mb-2 text-sm text-[var(--text-secondary)] leading-relaxed">
            The General Ledger provides a complete double-entry accounting view of your business —
            journal entries, chart of accounts, and a profit &amp; loss statement, all derived automatically
            from your invoices, payments, and expenses.
          </p>
          <ul className="m-0 mb-4 pl-5 list-disc text-sm text-[var(--text-secondary)] leading-relaxed">
            <li>Journal — all posted entries with expandable lines</li>
            <li>Chart of Accounts — live balances per account</li>
            <li>P&amp;L — period profit &amp; loss from ledger data</li>
          </ul>
          <Btn variant="primary" icon={<Icons.Bank />} onClick={() => navigate(ROUTES.LEDGER_JOURNAL)}>
            Open general ledger
          </Btn>
        </div>
        <div className="w-14 h-14 bg-[var(--text-primary)] rounded-[var(--radius-lg)] flex items-center justify-center text-white flex-shrink-0">
          <Icons.Bank />
        </div>
      </div>
    </Section>
  );
}
