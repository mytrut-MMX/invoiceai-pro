import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../router/routes";
import { Icons } from "../icons";
import { ff } from "../../constants";

const ACTIONS = [
  { label: "New Invoice",  icon: Icons.Invoices,  route: ROUTES.INVOICES_NEW,  color: "#1e6be0" },
  { label: "New Quote",    icon: Icons.Quotes,    route: ROUTES.QUOTES_NEW,    color: "#7c3aed" },
  { label: "Add Payment",  icon: Icons.Payments,  route: ROUTES.PAYMENTS_NEW,  color: "#059669" },
  { label: "Add Expense",  icon: Icons.Expenses,  route: ROUTES.EXPENSES_NEW,  color: "#d97706" },
  { label: "New Customer", icon: Icons.Customers, route: ROUTES.CUSTOMERS_NEW, color: "#0891b2" },
];

export default function QuickActionsBar() {
  const navigate = useNavigate();

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
      {ACTIONS.map(({ label, icon: Icon, route, color }) => (
        <button
          key={label}
          onClick={() => navigate(route)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "7px 14px", border: "1px solid #e8e8ec",
            borderRadius: 8, background: "#fff", cursor: "pointer",
            fontSize: 12, fontWeight: 600, fontFamily: ff,
            color: "#374151", transition: "all 0.15s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = color;
            e.currentTarget.style.color = color;
            e.currentTarget.style.background = color + "08";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = "#e8e8ec";
            e.currentTarget.style.color = "#374151";
            e.currentTarget.style.background = "#fff";
          }}
        >
          <Icon /> {label}
        </button>
      ))}
    </div>
  );
}
