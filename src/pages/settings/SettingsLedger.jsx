import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../router/routes";
import { Icons } from "../../components/icons";
import { Btn } from "../../components/atoms";
import Section from "../../components/settings/Section";

export default function SettingsLedger() {
  const navigate = useNavigate();

  return (
    <Section title="General Ledger">
      <div style={{ display:"flex", alignItems:"flex-start", gap:18, flexWrap:"wrap" }}>
        <div style={{ flex:1, minWidth:220 }}>
          <p style={{ margin:"0 0 8px", fontSize:13, color:"#374151", lineHeight:1.6 }}>
            The General Ledger provides a complete double-entry accounting view of your business —
            journal entries, chart of accounts, and a profit &amp; loss statement, all derived automatically
            from your invoices, payments, and expenses.
          </p>
          <ul style={{ margin:"0 0 16px", paddingLeft:18, fontSize:13, color:"#6b7280", lineHeight:1.8 }}>
            <li>Journal — all posted entries with expandable lines</li>
            <li>Chart of Accounts — live balances per account</li>
            <li>P&amp;L — period profit &amp; loss from ledger data</li>
          </ul>
          <Btn variant="primary" icon={<Icons.Bank />} onClick={() => navigate(ROUTES.LEDGER_JOURNAL)}>
            Open General Ledger
          </Btn>
        </div>
        <div style={{ width:56, height:56, background:"#1a1a2e", borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", flexShrink:0 }}>
          <Icons.Bank />
        </div>
      </div>
    </Section>
  );
}
