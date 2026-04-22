// Self-Billing Agreement renewal alerts.
//
// Single alert per agreement; severity escalates as the expiry date
// approaches and flips to "Expired — stop issuing self-bills" once past.
// Pure compute, no DB or Date.now surprises — callers pass `today` when
// they want deterministic output (tests use a fixed date).
//
// Severity thresholds match SBA_RENEWAL_WARNING_DAYS from constants:
//   days > 30       → no alert
//   15 ≤ days ≤ 30  → info
//   8  ≤ days ≤ 14  → warning
//   1  ≤ days ≤ 7   → critical (renew now)
//   days ≤ 0        → critical "Expired — stop issuing self-bills"

function counterpartyName(sba) {
  return sba?.supplier?.name || sba?.customer?.name || "counterparty";
}

function counterpartyRoute(sba) {
  if (sba?.direction === "received" && sba?.customer_id) {
    return `/customers/${sba.customer_id}?tab=self-billing`;
  }
  if (sba?.supplier_id) {
    return `/suppliers/${sba.supplier_id}?tab=self-billing`;
  }
  // Fallback: landing tab of the self-billing settings area.
  return "/settings/self-billing";
}

function parseEndDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysUntil(end, todayMidnight) {
  return Math.round((end - todayMidnight) / 86400000);
}

export function computeSbaAlerts({ activeSbas = [], today } = {}) {
  const base = today instanceof Date ? new Date(today) : new Date();
  base.setHours(0, 0, 0, 0);
  const out = [];

  for (const sba of activeSbas || []) {
    const end = parseEndDate(sba?.end_date);
    if (!end) continue;
    const days = daysUntil(end, base);

    // Still outside the 30-day warning window — nothing to show yet.
    if (days > 30) continue;

    const name = counterpartyName(sba);
    const href = counterpartyRoute(sba);

    let severity, title, message, actionLabel;

    if (days <= 0) {
      severity = "critical";
      title = `Expired — stop issuing self-bills to ${name}`;
      message = `The agreement with ${name} ended on ${sba.end_date}. HMRC requires a fresh agreement before any further self-bills can be issued.`;
      actionLabel = "Review agreement";
    } else if (days <= 7) {
      severity = "critical";
      title = `Self-billing agreement with ${name} expires in ${days} day${days === 1 ? "" : "s"}`;
      message = `Renew now to avoid a gap in coverage. After ${sba.end_date} you cannot issue new self-bills against this agreement.`;
      actionLabel = "Renew agreement";
    } else if (days <= 14) {
      severity = "warning";
      title = `Self-billing agreement with ${name} expires in ${days} days`;
      message = `Start the renewal now. The supersede-and-renew flow keeps numbering continuous.`;
      actionLabel = "Renew agreement";
    } else {
      // 15–30 days
      severity = "info";
      title = `Self-billing agreement with ${name} expires in ${days} days`;
      message = `Heads-up: expiry is approaching. Most counterparties prefer a renewed agreement at least two weeks ahead of the end date.`;
      actionLabel = "Review agreement";
    }

    out.push({
      id: `sba_renewal_${sba.id}`,
      severity,
      title,
      message,
      actionLabel,
      actionHref: href,
      // Extra fields the widget uses — harmless when the alert is consumed
      // by the generic SmartAlerts pipeline (it ignores unknown keys).
      sbaId: sba.id,
      counterparty: name,
      direction: sba.direction || "issued",
      endDate: sba.end_date,
      daysToExpiry: days,
    });
  }

  return out;
}
