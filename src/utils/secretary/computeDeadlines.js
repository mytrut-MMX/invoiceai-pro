import { isWorkingDay, nextWorkingDay, previousWorkingDay } from "./bankHolidays";

// ─── Helpers ────────────────────────────────────────────────────────────────

function toISO(date) {
  return date.toISOString().slice(0, 10);
}

function daysBetween(fromISO, toISO_) {
  const from = new Date(fromISO + "T00:00:00Z");
  const to   = new Date(toISO_  + "T00:00:00Z");
  return Math.round((to - from) / (24 * 60 * 60 * 1000));
}

function severityFor(daysUntil) {
  if (daysUntil <= 7) return "critical";
  if (daysUntil <= 30) return "warning";
  return "info";
}

function addMonths(dateISO, months) {
  const d = new Date(dateISO + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + months);
  return toISO(d);
}

function addDays(dateISO, days) {
  const d = new Date(dateISO + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return toISO(d);
}

function lastDayOfMonth(year, month1Indexed) {
  const d = new Date(Date.UTC(year, month1Indexed, 0));
  return toISO(d);
}

function isLimitedCompany(orgSettings) {
  return Boolean(orgSettings?.crn?.trim());
}

function isSoleTrader(orgSettings) {
  return !isLimitedCompany(orgSettings);
}

// ─── VAT stagger group → period ends ────────────────────────────────────────
// Stagger 1: Mar, Jun, Sep, Dec   (default if vatStaggerGroup missing)
// Stagger 2: Apr, Jul, Oct, Jan
// Stagger 3: May, Aug, Nov, Feb

const STAGGER_END_MONTHS = {
  1: [3, 6, 9, 12],
  2: [4, 7, 10, 1],
  3: [5, 8, 11, 2],
};

function computeVatPeriodEnds(orgSettings, today) {
  const stagger = orgSettings?.vatStaggerGroup || 1;
  const endMonths = STAGGER_END_MONTHS[stagger] || STAGGER_END_MONTHS[1];
  const todayDate = new Date(today + "T00:00:00Z");
  const ends = [];

  for (let yearOffset = -1; yearOffset <= 1; yearOffset++) {
    for (const month of endMonths) {
      const year = todayDate.getUTCFullYear() + yearOffset;
      ends.push(lastDayOfMonth(year, month));
    }
  }

  ends.sort();
  return ends;
}

// ─── Generators ─────────────────────────────────────────────────────────────

function vatDeadlines(orgSettings, today, calendar) {
  if (orgSettings?.vatReg !== "Yes") return [];
  const out = [];
  const ends = computeVatPeriodEnds(orgSettings, today);

  for (const periodEnd of ends) {
    // VAT due: "1 month and 7 days after period end" per HMRC.
    // For period end 31 Mar, gov.uk publishes 7 May as the deadline.
    // Naive setUTCMonth(+1) on day 31 overflows last-day-of-month, so use 37 days.
    const dueRaw = addDays(periodEnd, 37);
    // Payment rolls to PREVIOUS working day if non-working.
    const dueEffective = isWorkingDay(dueRaw, calendar) ? dueRaw : previousWorkingDay(dueRaw, calendar);
    const daysUntil = daysBetween(today, dueEffective);

    if (daysUntil < -60 || daysUntil > 365) continue;

    out.push({
      id: `vat-${periodEnd}`,
      obligation: "vat_return",
      title: `VAT return — ${formatVatPeriod(periodEnd)}`,
      description: `Submit VAT return and pay any VAT owed for period ending ${periodEnd}.`,
      due_date: dueEffective,
      due_date_raw: dueRaw,
      days_until: daysUntil,
      severity: severityFor(daysUntil),
      category: "vat",
      action_label: "Open VAT module",
      action_route: "/vat-return",
      source_url: "https://www.gov.uk/vat-returns/deadlines",
    });
  }
  return out;
}

function formatVatPeriod(periodEndISO) {
  const d = new Date(periodEndISO + "T00:00:00Z");
  const month = d.getUTCMonth() + 1;
  const year = d.getUTCFullYear();
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `Q ending ${months[month - 1]} ${year}`;
}

// ─── Self Assessment ────────────────────────────────────────────────────────

function saDeadlines(orgSettings, today, calendar) {
  if (!isSoleTrader(orgSettings) && !orgSettings?.directorSelfAssessment) return [];
  const out = [];
  const todayDate = new Date(today + "T00:00:00Z");
  const currentYear = todayDate.getUTCFullYear();

  for (let offset = -1; offset <= 1; offset++) {
    const taxYearEnd = `${currentYear + offset}-04-05`;
    const filingDueRaw = `${currentYear + offset + 1}-01-31`;
    // SA filing rolls forward
    const filingDueEffective = isWorkingDay(filingDueRaw, calendar)
      ? filingDueRaw
      : nextWorkingDay(filingDueRaw, calendar);
    const filingDays = daysBetween(today, filingDueEffective);

    if (filingDays >= -60 && filingDays <= 365) {
      out.push({
        id: `sa-filing-${taxYearEnd}`,
        obligation: "sa_return",
        title: `Self Assessment — tax year ${currentYear + offset - 1}/${(currentYear + offset).toString().slice(-2)}`,
        description: `File online Self Assessment return for tax year ending 5 April ${currentYear + offset}.`,
        due_date: filingDueEffective,
        due_date_raw: filingDueRaw,
        days_until: filingDays,
        severity: severityFor(filingDays),
        category: "sa",
        action_label: "Prepare return",
        action_route: "/itsa",
        source_url: "https://www.gov.uk/self-assessment-tax-returns/deadlines",
      });
    }

    // Balancing payment + POA1: 31 Jan, payment does NOT roll
    const balancingDays = daysBetween(today, filingDueRaw);
    if (balancingDays >= -60 && balancingDays <= 365) {
      out.push({
        id: `sa-balancing-${taxYearEnd}`,
        obligation: "sa_balancing_payment",
        title: `SA balancing payment + POA1 — ${currentYear + offset - 1}/${(currentYear + offset).toString().slice(-2)}`,
        description: `Pay balancing tax for prior year and first payment on account for current year.`,
        due_date: filingDueRaw,
        due_date_raw: filingDueRaw,
        days_until: balancingDays,
        severity: severityFor(balancingDays),
        category: "sa",
        action_label: "View SA liability",
        action_route: "/itsa",
        source_url: "https://www.gov.uk/self-assessment-tax-returns/deadlines",
      });
    }

    // POA2: 31 July
    const poa2Raw = `${currentYear + offset + 1}-07-31`;
    const poa2Days = daysBetween(today, poa2Raw);
    if (poa2Days >= -60 && poa2Days <= 365) {
      out.push({
        id: `sa-poa2-${taxYearEnd}`,
        obligation: "sa_poa2",
        title: `SA second payment on account — ${currentYear + offset - 1}/${(currentYear + offset).toString().slice(-2)}`,
        description: `Pay second payment on account for current tax year.`,
        due_date: poa2Raw,
        due_date_raw: poa2Raw,
        days_until: poa2Days,
        severity: severityFor(poa2Days),
        category: "sa",
        action_label: "View SA liability",
        action_route: "/itsa",
        source_url: "https://www.gov.uk/self-assessment-tax-returns/deadlines",
      });
    }
  }
  return out;
}

// ─── Corporation Tax + Companies House ──────────────────────────────────────

function ctAndCompaniesHouseDeadlines(orgSettings, today, calendar) {
  if (!isLimitedCompany(orgSettings)) return [];
  const out = [];
  const todayDate = new Date(today + "T00:00:00Z");
  const fyStartMonth = orgSettings?.financialYearStart || 4;
  // ARD = last day of (fyStartMonth - 1)
  const ardMonth = fyStartMonth === 1 ? 12 : fyStartMonth - 1;

  for (let offset = -1; offset <= 0; offset++) {
    const ardYear = todayDate.getUTCFullYear() + offset;
    const ardISO = lastDayOfMonth(ardYear, ardMonth);

    // CT payment: 9 months + 1 day after AP end (no roll-forward for payment)
    const ctPaymentRaw = addDays(addMonths(ardISO, 9), 1);
    const ctPaymentDays = daysBetween(today, ctPaymentRaw);
    if (ctPaymentDays >= -60 && ctPaymentDays <= 365) {
      out.push({
        id: `ct-payment-${ardISO}`,
        obligation: "ct_payment",
        title: `Corporation Tax payment — AP ending ${ardISO}`,
        description: `Pay Corporation Tax for accounting period ending ${ardISO}.`,
        due_date: ctPaymentRaw,
        due_date_raw: ctPaymentRaw,
        days_until: ctPaymentDays,
        severity: severityFor(ctPaymentDays),
        category: "ct",
        action_label: "Open CT module",
        action_route: "/corporation-tax",
        source_url: "https://www.gov.uk/corporation-tax/returns-payments-deadlines",
      });
    }

    // CT600 filing: 12 months after AP end (filing rolls forward)
    const ct600Raw = addMonths(ardISO, 12);
    const ct600Effective = isWorkingDay(ct600Raw, calendar) ? ct600Raw : nextWorkingDay(ct600Raw, calendar);
    const ct600Days = daysBetween(today, ct600Effective);
    if (ct600Days >= -60 && ct600Days <= 365) {
      out.push({
        id: `ct600-${ardISO}`,
        obligation: "ct600_filing",
        title: `CT600 filing — AP ending ${ardISO}`,
        description: `File Corporation Tax return (CT600) for accounting period ending ${ardISO}.`,
        due_date: ct600Effective,
        due_date_raw: ct600Raw,
        days_until: ct600Days,
        severity: severityFor(ct600Days),
        category: "ct",
        action_label: "Open CT module",
        action_route: "/corporation-tax",
        source_url: "https://www.gov.uk/corporation-tax/returns-payments-deadlines",
      });
    }

    // Companies House annual accounts: 9 months after ARD — NO ROLL-FORWARD
    const chRaw = addMonths(ardISO, 9);
    const chDays = daysBetween(today, chRaw);
    if (chDays >= -60 && chDays <= 365) {
      out.push({
        id: `ch-accounts-${ardISO}`,
        obligation: "ch_accounts",
        title: `Companies House annual accounts — ARD ${ardISO}`,
        description: `File annual accounts with Companies House. NO grace period for weekends or bank holidays.`,
        due_date: chRaw,
        due_date_raw: chRaw,
        days_until: chDays,
        severity: severityFor(chDays),
        category: "ch",
        action_label: "View on Companies House",
        action_route: orgSettings?.crn ? `https://find-and-update.company-information.service.gov.uk/company/${orgSettings.crn}` : "/settings?tab=org",
        source_url: "https://www.gov.uk/annual-accounts/accounts-deadlines",
      });
    }
  }

  // Confirmation Statement (skip if no incorporation date)
  if (orgSettings?.incorporationDate) {
    const incDate = orgSettings.incorporationDate;
    const csDueYear = todayDate.getUTCFullYear();
    const incMonthDay = incDate.slice(5);
    const csDueRaw = addDays(`${csDueYear}-${incMonthDay}`, 14);
    const csDays = daysBetween(today, csDueRaw);
    if (csDays >= -60 && csDays <= 365) {
      out.push({
        id: `ch-cs-${csDueRaw}`,
        obligation: "ch_confirmation_statement",
        title: `Confirmation Statement — Companies House`,
        description: `File annual confirmation statement. NO grace period.`,
        due_date: csDueRaw,
        due_date_raw: csDueRaw,
        days_until: csDays,
        severity: severityFor(csDays),
        category: "ch",
        action_label: "File Confirmation Statement",
        action_route: "https://www.gov.uk/file-an-annual-confirmation-statement",
        source_url: "https://www.gov.uk/file-an-annual-confirmation-statement",
      });
    }
  }

  return out;
}

// ─── PAYE / RTI ─────────────────────────────────────────────────────────────

function payeDeadlines(orgSettings, today, calendar) {
  if (!orgSettings?.payroll?.active) return [];
  const out = [];
  const todayDate = new Date(today + "T00:00:00Z");

  // PAYE payment: 22nd of following calendar month, electronic; rolls BACKWARD if non-working
  for (let offset = 0; offset <= 2; offset++) {
    const month = todayDate.getUTCMonth() + offset;
    const year = todayDate.getUTCFullYear() + Math.floor(month / 12);
    const adjMonth = ((month % 12) + 12) % 12;
    const dueRaw = `${year}-${String(adjMonth + 1).padStart(2, "0")}-22`;
    const dueEffective = isWorkingDay(dueRaw, calendar) ? dueRaw : previousWorkingDay(dueRaw, calendar);
    const days = daysBetween(today, dueEffective);
    if (days >= -30 && days <= 90) {
      out.push({
        id: `paye-${year}-${adjMonth + 1}`,
        obligation: "paye_payment",
        title: `PAYE/NIC payment — ${year}-${String(adjMonth + 1).padStart(2, "0")}`,
        description: `Pay PAYE and NIC owed to HMRC. Electronic payment.`,
        due_date: dueEffective,
        due_date_raw: dueRaw,
        days_until: days,
        severity: severityFor(days),
        category: "rti",
        action_label: "Open Payroll",
        action_route: "/payroll",
        source_url: "https://www.gov.uk/pay-paye-tax",
      });
    }
  }
  return out;
}

// ─── CIS ────────────────────────────────────────────────────────────────────

function cisDeadlines(orgSettings, today, calendar) {
  if (!orgSettings?.cis?.enabled) return [];
  const out = [];
  const todayDate = new Date(today + "T00:00:00Z");

  for (let offset = 0; offset <= 2; offset++) {
    const month = todayDate.getUTCMonth() + offset;
    const year = todayDate.getUTCFullYear() + Math.floor(month / 12);
    const adjMonth = ((month % 12) + 12) % 12;
    const dueRaw = `${year}-${String(adjMonth + 1).padStart(2, "0")}-19`;
    const dueEffective = isWorkingDay(dueRaw, calendar) ? dueRaw : nextWorkingDay(dueRaw, calendar);
    const days = daysBetween(today, dueEffective);
    if (days >= -30 && days <= 90) {
      out.push({
        id: `cis-${year}-${adjMonth + 1}`,
        obligation: "cis_return",
        title: `CIS300 monthly return — ${year}-${String(adjMonth + 1).padStart(2, "0")}`,
        description: `Submit CIS300 return for the previous tax month.`,
        due_date: dueEffective,
        due_date_raw: dueRaw,
        days_until: days,
        severity: severityFor(days),
        category: "cis",
        action_label: "Open CIS Statements",
        action_route: "/cis-statements",
        source_url: "https://www.gov.uk/what-you-must-do-as-a-cis-contractor",
      });
    }
  }
  return out;
}

// ─── Main export ────────────────────────────────────────────────────────────

export function computeDeadlines(orgSettings, today, calendar) {
  if (!orgSettings) return [];
  const todayISO = typeof today === "string" ? today : toISO(today);
  return [
    ...vatDeadlines(orgSettings, todayISO, calendar),
    ...saDeadlines(orgSettings, todayISO, calendar),
    ...ctAndCompaniesHouseDeadlines(orgSettings, todayISO, calendar),
    ...payeDeadlines(orgSettings, todayISO, calendar),
    ...cisDeadlines(orgSettings, todayISO, calendar),
  ];
}
