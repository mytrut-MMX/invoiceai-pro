// ─── CONSTANTS ───────────────────────────────────────────────────────────────
export const TAX_RATES = [0, 5, 12.5, 20];
export const UK_VAT_RATES = [
  { value: "20",       label: "Standard (20%)",     rate: 20,   type: "standard" },
  { value: "5",        label: "Reduced (5%)",       rate: 5,    type: "reduced" },
  { value: "0",        label: "Zero-rated (0%)",    rate: 0,    type: "zero_rated" },
  { value: "exempt",   label: "Exempt",             rate: 0,    type: "exempt" },
  { value: "outside",  label: "Outside scope",      rate: 0,    type: "outside_scope" },
];
export const CUR_SYM = { GBP:"£", USD:"$", EUR:"€", AUD:"A$", CAD:"C$", CHF:"Fr", JPY:"¥", INR:"₹" };
export const PAYMENT_TERMS_OPTS = ["Due on Receipt","Net 7","Net 14","Net 30","Net 60","Net 90","Custom"];
export const RECURRING_OPTS = ["Weekly","Monthly","Quarterly","Yearly"];
export const DEFAULT_INV_TERMS = "Payment is due within the agreed payment terms. Late payments may incur interest charges.";
export const DEFAULT_QUOTE_TERMS = "This quote is valid until the expiry date shown. Prices exclude VAT unless stated. Work commences upon written acceptance.";
export const INDUSTRIES = ["Agency","Agriculture","Art and Design","Automotive","Construction / Tradesperson","Consulting","Consumer Packaged Goods","Education","Engineering","Entertainment","Financial Services","Food Services","Gardening","Gaming","Government","Health Care","Interior Design","Legal","Logistics","Manufacturing","Marketing","Non Profit","Publishing","Real Estate","Retail","Services","Technology","Telecommunications","Transport & Haulage Services","Travel/Hospitality","Web Design","Others"];
export const COUNTRIES = ["United Kingdom","Australia","Austria","Belgium","Brazil","Canada","China","Denmark","Finland","France","Germany","Ghana","Greece","Hungary","India","Indonesia","Ireland","Israel","Italy","Japan","Kenya","Malaysia","Mexico","Netherlands","New Zealand","Nigeria","Norway","Pakistan","Philippines","Poland","Portugal","Romania","Russia","Saudi Arabia","Singapore","South Africa","South Korea","Spain","Sweden","Switzerland","Taiwan","Thailand","Turkey","UAE","United States","Vietnam","Zimbabwe"];
export const CURRENCIES_LIST = ["GBP - British Pound Sterling","USD - US Dollar","EUR - Euro","AUD - Australian Dollar","CAD - Canadian Dollar","CHF - Swiss Franc","CNY - Chinese Yuan","JPY - Japanese Yen","INR - Indian Rupee","SGD - Singapore Dollar","HKD - Hong Kong Dollar","SEK - Swedish Krona","NZD - New Zealand Dollar","ZAR - South African Rand","AED - UAE Dirham","BRL - Brazilian Real"];
export const normalizeCurrencyCode = (value, fallback = "GBP") => {
  if (!value) return fallback;
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim().toUpperCase();
  const maybeCode = trimmed.split(" - ")[0];
  return /^[A-Z]{3}$/.test(maybeCode) ? maybeCode : fallback;
};
export const TIMEZONES = ["(UTC+00:00) London","(UTC+00:00) Dublin","(UTC+01:00) Amsterdam","(UTC+01:00) Berlin","(UTC+01:00) Paris","(UTC+01:00) Rome","(UTC+02:00) Athens","(UTC+02:00) Cairo","(UTC+03:00) Moscow","(UTC+04:00) Dubai","(UTC+05:30) New Delhi","(UTC+08:00) Singapore","(UTC+09:00) Tokyo","(UTC+10:00) Sydney","(UTC-05:00) New York","(UTC-06:00) Chicago","(UTC-08:00) Los Angeles"];
export const UK_COUNTIES = ["Avon","Bedfordshire","Berkshire","Bristol","Buckinghamshire","Cambridgeshire","Cheshire","Cornwall","Cumbria","Derbyshire","Devon","Dorset","Durham","East Sussex","Essex","Gloucestershire","Greater London","Greater Manchester","Hampshire","Hertfordshire","Kent","Lancashire","Leicestershire","Lincolnshire","Merseyside","Norfolk","North Yorkshire","Northamptonshire","Nottinghamshire","Oxfordshire","Somerset","Staffordshire","Suffolk","Surrey","Tyne and Wear","Warwickshire","West Midlands","West Sussex","West Yorkshire","Wiltshire","Worcestershire"];
export const SALUTATIONS = ["Mr","Mrs","Ms","Dr","Prof","Mx","Rev"];
export const ITEM_UNITS = ["hrs","days","qty","kg","m","m²","m³","l","pcs","flat rate"];
export const ITEM_TYPES = ["Service","Material","Labour","Equipment","Other"];
export const CIS_RATES = ["20%","30%","0% (gross payment)","Flat rate"];
export const CIS_DEDUCTION_RATES = [
  { label: "20% — Standard", value: 20 },
  { label: "30% — Higher (unverified)", value: 30 },
  { label: "0% — Gross payment", value: 0 },
];
export const CIS_DEFAULT_SETTINGS = {
  enabled: false,
  contractorUTR: "",
  contractorName: "",
  employerRef: "",
  defaultRate: 20,
};
export const ACCOUNT_CATEGORIES = [
  "Sales","Services","Consulting","Design & Creative","Development & IT",
  "Marketing","Labour","Materials","Equipment Hire","Subcontractors",
  "Expenses","Travel & Subsistence","Office Supplies","Software & Subscriptions",
  "Professional Fees","Advertising","Utilities","Rent & Rates","Other Income","Other",
];
export const QUOTE_STATUSES = ["Draft","Sent","Accepted","Declined","Expired","Invoiced"];
export const PDF_TEMPLATES = [
  { id:"classic",  name:"Classic",  description:"Clean header, ruled lines",        defaultAccent:"#1e6be0", defaultBg:"#fff" },
  { id:"modern",   name:"Modern",   description:"Bold colour band, split layout",    defaultAccent:"#2563EB", defaultBg:"#EFF6FF" },
  { id:"minimal",  name:"Minimal",  description:"Clean typography, accent line",     defaultAccent:"#16A34A", defaultBg:"#fff" },
  { id:"branded",  name:"Branded",  description:"Rich terracotta, premium feel",     defaultAccent:"#E86C4A", defaultBg:"#FFF7F4" },
];
export const PAYMENT_METHODS = ["Bank Transfer","Card","Cash","Cheque","PayPal","Stripe","Direct Debit","Crypto","Other"];
export const EXPENSE_CATEGORIES = [
  { code:"100", name:"Advertising",             hmrc_sa_code:"advertising_entertainment" },
  { code:"110", name:"Automobile",              hmrc_sa_code:"travel_motor" },
  { code:"261", name:"Meals & Subsistence",     hmrc_sa_code:"travel_motor" },
  { code:"300", name:"Equipment",               hmrc_sa_code:"capital_allowances" },
  { code:"315", name:"Subcontractor Labour",    hmrc_sa_code:"staff_costs" },
  { code:"316", name:"Subcontractor Materials", hmrc_sa_code:"cost_of_goods" },
  { code:"404", name:"Bank Charges",            hmrc_sa_code:"financial_charges" },
  { code:"420", name:"Client Entertainment",    hmrc_sa_code:"advertising_entertainment" },
  { code:"430", name:"Fuel",                    hmrc_sa_code:"travel_motor" },
  { code:"440", name:"Insurance",               hmrc_sa_code:"premises_costs" },
  { code:"460", name:"IT & Software",           hmrc_sa_code:"admin_office" },
  { code:"480", name:"Office Supplies",         hmrc_sa_code:"admin_office" },
  { code:"490", name:"Postage & Courier",       hmrc_sa_code:"admin_office" },
  { code:"500", name:"Professional Services",   hmrc_sa_code:"professional_fees" },
  { code:"510", name:"Rent & Rates",            hmrc_sa_code:"premises_costs" },
  { code:"520", name:"Repairs & Maintenance",   hmrc_sa_code:"repairs_maintenance" },
  { code:"530", name:"Stationery",              hmrc_sa_code:"admin_office" },
  { code:"540", name:"Subscriptions",           hmrc_sa_code:"admin_office" },
  { code:"550", name:"Travel",                  hmrc_sa_code:"travel_motor" },
  { code:"560", name:"Utilities",               hmrc_sa_code:"premises_costs" },
  { code:"570", name:"Wages & Salaries",        hmrc_sa_code:"staff_costs" },
  { code:"999", name:"Other",                   hmrc_sa_code:"other_expenses" },
];
export const EXPENSE_STATUSES = ["Draft","Submitted","Approved","Reimbursed"];
export const BILL_STATUSES = ["Draft", "Awaiting Approval", "Approved", "Paid", "Overdue", "Void"];
export const BILL_CATEGORIES = [
  "Cost of Goods", "Subcontractor", "Rent & Rates", "Utilities",
  "Insurance", "Professional Services", "IT & Software", "Travel",
  "Office Supplies", "Equipment", "Marketing", "Other",
];

// ─── Suppliers (Phase 1) ──────────────────────────────────────────────────

export const SUPPLIER_TYPES = ["Business", "Individual"];

export const CIS_RATES_SUPPLIER = [
  { value: "gross_0",       label: "Gross (0%)",       rate: 0  },
  { value: "standard_20",   label: "Standard (20%)",   rate: 20 },
  { value: "unverified_30", label: "Unverified (30%)", rate: 30 },
];

export const CIS_TRADER_TYPES = [
  { value: "sole_trader", label: "Sole Trader" },
  { value: "company",     label: "Limited Company" },
  { value: "partnership", label: "Partnership" },
  { value: "trust",       label: "Trust" },
];
