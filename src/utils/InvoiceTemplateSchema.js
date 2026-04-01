export const TEMPLATE_STORAGE_VERSION = 1;
export const STORAGE_KEY = "ai_invoice_templates";

export const DEFAULT_TEMPLATE = {
  id: null,
  name: "Default",

  // Layout general
  layout: {
    colorScheme: "classic", // "classic" | "modern" | "minimal"
    accentColor: "#111110", // hex color pentru header/butoane
    fontFamily: "inter", // "inter" | "mono" | "serif"
    logoPosition: "left", // "left" | "center" | "right" | "none"
    logoSize: "medium", // "small" | "medium" | "large"
  },

  // Secțiuni vizibile (toggle on/off)
  sections: {
    header: true,
    fromBlock: true,
    toBlock: true,
    bankDetails: true,
    notes: true,
    footer: true,
    signature: false,
    watermark: false,
  },

  // Câmpuri din blocul "FROM" (compania ta)
  fromFields: {
    companyName: { visible: true, order: 1 },
    address: { visible: true, order: 2 },
    city: { visible: true, order: 3 },
    country: { visible: true, order: 4 },
    phone: { visible: false, order: 5 },
    email: { visible: true, order: 6 },
    vatNumber: { visible: false, order: 7 },
    registrationNumber: { visible: false, order: 8 },
    website: { visible: false, order: 9 },
  },

  // Câmpuri din blocul "TO" (clientul)
  toFields: {
    companyName: { visible: true, order: 1 },
    contactName: { visible: true, order: 2 },
    address: { visible: true, order: 3 },
    city: { visible: true, order: 4 },
    country: { visible: true, order: 5 },
    email: { visible: false, order: 6 },
    vatNumber: { visible: false, order: 7 },
    phone: { visible: false, order: 8 },
  },

  // Câmpuri din header-ul invoicei
  invoiceFields: {
    invoiceNumber: { visible: true, order: 1, label: "Invoice No." },
    issueDate: { visible: true, order: 2, label: "Issue Date" },
    dueDate: { visible: true, order: 3, label: "Due Date" },
    poNumber: { visible: false, order: 4, label: "PO Number" },
    currency: { visible: true, order: 5, label: "Currency" },
    reference: { visible: false, order: 6, label: "Reference" },
  },

  // Coloane din tabelul de itemi
  lineItemColumns: {
    description: { visible: true, order: 1, label: "Description" },
    quantity: { visible: true, order: 2, label: "Qty" },
    unitPrice: { visible: true, order: 3, label: "Unit Price" },
    tax: { visible: true, order: 4, label: "Tax" },
    discount: { visible: false, order: 5, label: "Discount" },
    total: { visible: true, order: 6, label: "Total" },
  },

  // Totals block
  totalsBlock: {
    subtotal: { visible: true },
    discount: { visible: false },
    tax: { visible: true },
    total: { visible: true },
    amountDue: { visible: true },
    paidAmount: { visible: false },
  },

  // Date bancare — fiecare cont bancar poate fi toggle-uit
  // Câmpurile per cont:
  bankFields: {
    bankName: { visible: true },
    accountName: { visible: true },
    accountNumber: { visible: true },
    sortCode: { visible: true },
    iban: { visible: false },
    swift: { visible: false },
    routingNumber: { visible: false },
  },

  // Text custom
  customText: {
    headerNote: "", // text deasupra tabelului
    footerNote: "", // ex: "Thank you for your business"
    paymentTerms: "", // ex: "Payment due within 30 days"
    watermarkText: "PAID", // apare când invoice e marcat paid
  },
};

function cloneTemplate(template) {
  return JSON.parse(JSON.stringify(template));
}

function isStorageAvailable() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function readStoragePayload() {
  if (!isStorageAvailable()) {
    return { version: TEMPLATE_STORAGE_VERSION, templates: [] };
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { version: TEMPLATE_STORAGE_VERSION, templates: [] };
  }

  try {
    const parsed = JSON.parse(raw);

    // backward compatibility: array-only format
    if (Array.isArray(parsed)) {
      return { version: TEMPLATE_STORAGE_VERSION, templates: parsed };
    }

    if (parsed && Array.isArray(parsed.templates)) {
      return {
        version: Number.isFinite(parsed.version) ? parsed.version : TEMPLATE_STORAGE_VERSION,
        templates: parsed.templates,
      };
    }
  } catch {
    // ignore parse errors and fallback to empty payload
  }

  return { version: TEMPLATE_STORAGE_VERSION, templates: [] };
}

function writeStoragePayload(templates) {
  if (!isStorageAvailable()) return;

  const payload = {
    version: TEMPLATE_STORAGE_VERSION,
    templates,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function generateTemplateId() {
  return `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getTemplates() {
  const { templates } = readStoragePayload();
  return templates;
}

export function saveTemplate(template) {
  if (!template || typeof template !== "object") return null;

  const templates = getTemplates();
  const templateToSave = cloneTemplate(template);

  if (!templateToSave.id) {
    templateToSave.id = generateTemplateId();
  }

  const index = templates.findIndex((item) => item.id === templateToSave.id);

  if (index >= 0) {
    templates[index] = templateToSave;
  } else {
    templates.push(templateToSave);
  }

  writeStoragePayload(templates);
  return templateToSave;
}

export function deleteTemplate(id) {
  if (!id) return false;

  const templates = getTemplates();
  const nextTemplates = templates.filter((template) => template.id !== id);

  if (nextTemplates.length === templates.length) {
    return false;
  }

  writeStoragePayload(nextTemplates);
  return true;
}

export function getDefaultTemplate() {
  const templates = getTemplates();
  return templates[0] || cloneTemplate(DEFAULT_TEMPLATE);
}

export function getTemplateById(id) {
  if (!id) return null;

  const templates = getTemplates();
  return templates.find((template) => template.id === id) || null;
}

export function duplicateTemplate(id) {
  const original = getTemplateById(id);
  if (!original) return null;

  const duplicate = cloneTemplate(original);
  duplicate.id = generateTemplateId();
  duplicate.name = `Copy of ${original.name || "Template"}`;

  saveTemplate(duplicate);
  return duplicate;
}
