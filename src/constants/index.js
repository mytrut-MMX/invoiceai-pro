// ─── CONSTANTS ───────────────────────────────────────────────────────────────
export const ff = "'Instrument Sans','DM Sans','Helvetica Neue',sans-serif";
export const TAX_RATES = [0, 5, 12.5, 20];
export const CUR_SYM = { GBP:"£", USD:"$", EUR:"€", AUD:"A$", CAD:"C$", CHF:"Fr", JPY:"¥", INR:"₹" };
export const PAYMENT_TERMS_OPTS = ["Due on Receipt","Net 7","Net 14","Net 30","Net 60","Net 90","Custom"];
export const RECURRING_OPTS = ["Weekly","Monthly","Quarterly","Yearly"];
export const DEFAULT_INV_TERMS = "Payment is due within the agreed payment terms. Late payments may incur interest charges.";
export const DEFAULT_QUOTE_TERMS = "This quote is valid until the expiry date shown. Prices exclude VAT unless stated. Work commences upon written acceptance.";
export const INDUSTRIES = ["Agency","Agriculture","Art and Design","Automotive","Construction","Consulting","Consumer Packaged Goods","Education","Engineering","Entertainment","Financial Services","Food Services","Gardening","Gaming","Government","Health Care","Interior Design","Legal","Logistics","Manufacturing","Marketing","Non Profit","Publishing","Real Estate","Retail","Services","Technology","Telecommunications","Travel/Hospitality","Web Design","Others"];
export const COUNTRIES = ["United Kingdom","Australia","Austria","Belgium","Brazil","Canada","China","Denmark","Finland","France","Germany","Ghana","Greece","Hungary","India","Indonesia","Ireland","Israel","Italy","Japan","Kenya","Malaysia","Mexico","Netherlands","New Zealand","Nigeria","Norway","Pakistan","Philippines","Poland","Portugal","Romania","Russia","Saudi Arabia","Singapore","South Africa","South Korea","Spain","Sweden","Switzerland","Taiwan","Thailand","Turkey","UAE","United States","Vietnam","Zimbabwe"];
export const CURRENCIES_LIST = ["GBP - British Pound Sterling","USD - US Dollar","EUR - Euro","AUD - Australian Dollar","CAD - Canadian Dollar","CHF - Swiss Franc","CNY - Chinese Yuan","JPY - Japanese Yen","INR - Indian Rupee","SGD - Singapore Dollar","HKD - Hong Kong Dollar","SEK - Swedish Krona","NZD - New Zealand Dollar","ZAR - South African Rand","AED - UAE Dirham","BRL - Brazilian Real"];
export const TIMEZONES = ["(UTC+00:00) London","(UTC+00:00) Dublin","(UTC+01:00) Amsterdam","(UTC+01:00) Berlin","(UTC+01:00) Paris","(UTC+01:00) Rome","(UTC+02:00) Athens","(UTC+02:00) Cairo","(UTC+03:00) Moscow","(UTC+04:00) Dubai","(UTC+05:30) New Delhi","(UTC+08:00) Singapore","(UTC+09:00) Tokyo","(UTC+10:00) Sydney","(UTC-05:00) New York","(UTC-06:00) Chicago","(UTC-08:00) Los Angeles"];
export const UK_COUNTIES = ["Avon","Bedfordshire","Berkshire","Bristol","Buckinghamshire","Cambridgeshire","Cheshire","Cornwall","Cumbria","Derbyshire","Devon","Dorset","Durham","East Sussex","Essex","Gloucestershire","Greater London","Greater Manchester","Hampshire","Hertfordshire","Kent","Lancashire","Leicestershire","Lincolnshire","Merseyside","Norfolk","North Yorkshire","Northamptonshire","Nottinghamshire","Oxfordshire","Somerset","Staffordshire","Suffolk","Surrey","Tyne and Wear","Warwickshire","West Midlands","West Sussex","West Yorkshire","Wiltshire","Worcestershire"];
export const SALUTATIONS = ["Mr.","Mrs.","Ms.","Miss","Dr.","Prof."];
export const ITEM_UNITS = ["hrs","days","qty","kg","m","m²","m³","l","pcs","flat rate"];
export const ITEM_TYPES = ["Service","Material","Labour","Equipment","Other"];
export const CIS_RATES = ["20%","30%","0% (gross payment)"];
export const ACCOUNT_CATEGORIES = [
  "Sales","Services","Consulting","Design & Creative","Development & IT",
  "Marketing","Labour","Materials","Equipment Hire","Subcontractors",
  "Expenses","Travel & Subsistence","Office Supplies","Software & Subscriptions",
  "Professional Fees","Advertising","Utilities","Rent & Rates","Other Income","Other",
];
export const STATUS_COLORS = { Sent:"#2563EB", Overdue:"#C0392B", Paid:"#16A34A", Draft:"#6B7280", Void:"#9CA3AF", Accepted:"#16A34A", Declined:"#DC2626", Expired:"#9CA3AF", Partial:"#D97706", Reconciled:"#16A34A", Refunded:"#DC2626", Pending:"#6B7280" };
export const QUOTE_STATUSES = ["Draft","Sent","Accepted","Declined","Expired","Invoiced"];
export const PDF_TEMPLATES = [
  { id:"classic",  name:"Classic",  description:"Clean header, ruled lines",        defaultAccent:"#1A1A1A", defaultBg:"#fff" },
  { id:"modern",   name:"Modern",   description:"Bold colour band, split layout",    defaultAccent:"#2563EB", defaultBg:"#EFF6FF" },
  { id:"minimal",  name:"Minimal",  description:"Clean typography, accent line",     defaultAccent:"#16A34A", defaultBg:"#fff" },
  { id:"branded",  name:"Branded",  description:"Rich terracotta, premium feel",     defaultAccent:"#E86C4A", defaultBg:"#FFF7F4" },
];
export const PAYMENT_METHODS = ["Bank Transfer","Card","Cash","Cheque","PayPal","Stripe","Direct Debit","Crypto","Other"];

// ─── EMPTY STARTING DATA ──────────────────────────────────────────────────────
export const MOCK_CUSTOMERS = [];
export const MOCK_ITEMS_INIT = [];
export const MOCK_INV_LIST = [];
export const MOCK_QUOTES_LIST = [];
export const MOCK_PAYMENTS = [];
