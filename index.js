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
export const STATUS_COLORS = { Sent:"#2563EB", Overdue:"#C0392B", Paid:"#16A34A", Draft:"#6B7280", Void:"#9CA3AF", Accepted:"#16A34A", Declined:"#DC2626", Expired:"#9CA3AF" };
export const QUOTE_STATUSES = ["Draft","Sent","Accepted","Declined","Expired"];
export const PDF_TEMPLATES = [
  { id:"classic",  name:"Classic",  desc:"Clean header, ruled lines",          defaultAccent:"#1A1A1A", defaultBg:"#fff" },
  { id:"modern",   name:"Modern",   desc:"Bold colour band, split layout",      defaultAccent:"#2563EB", defaultBg:"#EFF6FF" },
  { id:"minimal",  name:"Minimal",  desc:"Sage green, clean typography",        defaultAccent:"#16A34A", defaultBg:"#fff" },
  { id:"branded",  name:"Branded",  desc:"Rich terracotta, premium feel",       defaultAccent:"#E86C4A", defaultBg:"#FFF7F4" },
];
export const PAYMENT_METHODS = ["Bank Transfer","Card","Cash","Cheque","PayPal","Stripe","Direct Debit","Crypto","Other"];

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
export const MOCK_CUSTOMERS = [
  { id:"c1", type:"Business", name:"Acme Corporation", companyName:"Acme Corporation", firstName:"James", lastName:"Acme", email:"billing@acme.com", phone:"+44 20 7946 0001", currency:"GBP", paymentTerms:"Net 30", billingAddress:{ street:"123 High Street", city:"London", county:"Greater London", postcode:"EC1A 1BB", country:"United Kingdom" }, shippingAddress:null, contactPersons:[], customFields:[], remarks:"", taxDetails:{ vatNumber:"", cisRegistered:false, cisRole:"", cisRate:"20%" } },
  { id:"c2", type:"Business", name:"Blue Sky Ltd", companyName:"Blue Sky Ltd", firstName:"Sara", lastName:"Blue", email:"accounts@bluesky.co.uk", phone:"+44 161 496 0002", currency:"GBP", paymentTerms:"Net 30", billingAddress:{ street:"45 Oxford Road", city:"Manchester", county:"Greater Manchester", postcode:"M1 2JA", country:"United Kingdom" }, shippingAddress:null, contactPersons:[], customFields:[], remarks:"", taxDetails:{ vatNumber:"", cisRegistered:false, cisRole:"", cisRate:"20%" } },
];

export const MOCK_ITEMS_INIT = [
  { id:"i1", name:"Web Design", type:"Service", description:"Professional website design", rate:850, unit:"flat rate", taxRate:20, cisApplicable:false, active:true },
  { id:"i2", name:"Consulting", type:"Service", description:"Business consulting", rate:120, unit:"hrs", taxRate:20, cisApplicable:true, active:true },
  { id:"i3", name:"Timber", type:"Material", description:"Construction timber", rate:45, unit:"m³", taxRate:20, cisApplicable:false, active:true },
];

export const MOCK_INV_LIST = [
  { id:"inv1", invoice_number:"INV-0001", customer_id:"c1", customer_name:"Acme Corporation", issue_date:"2026-02-01", due_date:"2026-03-03", status:"Overdue", currency:"GBP", total:3200, line_items:[], notes:"", terms:DEFAULT_INV_TERMS },
  { id:"inv2", invoice_number:"INV-0002", customer_id:"c2", customer_name:"Blue Sky Ltd", issue_date:"2026-03-01", due_date:"2026-03-31", status:"Sent", currency:"GBP", total:1120, line_items:[], notes:"", terms:DEFAULT_INV_TERMS },
  { id:"inv3", invoice_number:"INV-0003", customer_id:"c1", customer_name:"Acme Corporation", issue_date:"2026-01-15", due_date:"2026-02-14", status:"Paid", currency:"GBP", total:8400, line_items:[], notes:"", terms:DEFAULT_INV_TERMS },
];

export const MOCK_QUOTES_LIST = [
  { id:"q1", quote_number:"QUO-0001", customer_id:"c1", customer_name:"Acme Corporation", issue_date:"2026-02-15", expiry_date:"2026-03-15", status:"Accepted", currency:"GBP", total:4800, line_items:[], notes:"", terms:DEFAULT_QUOTE_TERMS },
  { id:"q2", quote_number:"QUO-0002", customer_id:"c2", customer_name:"Blue Sky Ltd", issue_date:"2026-03-01", expiry_date:"2026-04-01", status:"Sent", currency:"GBP", total:2200, line_items:[], notes:"", terms:DEFAULT_QUOTE_TERMS },
];

export const MOCK_PAYMENTS = [
  { id:"pay1", payment_number:"PAY-0001", invoice_id:"inv3", invoice_number:"INV-0003", customer_id:"c1", customer_name:"Acme Corporation", amount:8400, currency:"GBP", date:"2026-02-14", method:"Bank Transfer", reference:"BACS-20260214", notes:"Full payment received", status:"Reconciled" },
  { id:"pay2", payment_number:"PAY-0002", invoice_id:"inv2", invoice_number:"INV-0002", customer_id:"c2", customer_name:"Blue Sky Ltd", amount:500, currency:"GBP", date:"2026-03-05", method:"Card", reference:"", notes:"Partial payment", status:"Partial" },
];
