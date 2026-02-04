export type Currency = "PEN" | "USD" | "EUR";

type SettingsState = {
  currency: Currency;
  projectName: string;
  taxRate: number;
  taxIncluded: boolean;
  compactMode: boolean;
  storeAddress: string;
  storePhone: string;
  storeTaxId: string;
  logoUrl: string;
  paymentMethods: string;
  invoicePrefix: string;
  invoiceNext: number;
  receiptHeader: string;
  receiptFooter: string;
  paperWidthMm: number;
  defaultWarehouseId: number | null;
};

type Listener = () => void;

const STORAGE_KEY = "bookstore_settings";

const state: SettingsState = {
  currency: "PEN",
  projectName: "Bookstore POS",
  taxRate: 0,
  taxIncluded: false,
  compactMode: false,
  storeAddress: "",
  storePhone: "",
  storeTaxId: "",
  logoUrl: "",
  paymentMethods: "CASH,CARD,TRANSFER",
  invoicePrefix: "B001",
  invoiceNext: 1,
  receiptHeader: "",
  receiptFooter: "Gracias por su compra",
  paperWidthMm: 80,
  defaultWarehouseId: null,
};

const listeners = new Set<Listener>();

let snapshot: SettingsState = { ...state };

const emit = () => {
  snapshot = { ...state };
  listeners.forEach((l) => l());
};

const load = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as Partial<SettingsState>;
    if (parsed.currency) state.currency = parsed.currency;
    if (parsed.projectName) state.projectName = parsed.projectName;
    if (typeof parsed.taxRate === "number") state.taxRate = parsed.taxRate;
    if (typeof parsed.taxIncluded === "boolean") state.taxIncluded = parsed.taxIncluded;
    if (typeof parsed.compactMode === "boolean") state.compactMode = parsed.compactMode;
    if (typeof parsed.storeAddress === "string") state.storeAddress = parsed.storeAddress;
    if (typeof parsed.storePhone === "string") state.storePhone = parsed.storePhone;
    if (typeof parsed.storeTaxId === "string") state.storeTaxId = parsed.storeTaxId;
    if (typeof parsed.logoUrl === "string") state.logoUrl = parsed.logoUrl;
    if (typeof parsed.paymentMethods === "string") state.paymentMethods = parsed.paymentMethods;
    if (typeof parsed.invoicePrefix === "string") state.invoicePrefix = parsed.invoicePrefix;
    if (typeof parsed.invoiceNext === "number") state.invoiceNext = parsed.invoiceNext;
    if (typeof parsed.receiptHeader === "string") state.receiptHeader = parsed.receiptHeader;
    if (typeof parsed.receiptFooter === "string") state.receiptFooter = parsed.receiptFooter;
    if (typeof parsed.paperWidthMm === "number") state.paperWidthMm = parsed.paperWidthMm;
    if (typeof parsed.defaultWarehouseId === "number") state.defaultWarehouseId = parsed.defaultWarehouseId;
  } catch {
    // ignore
  }
  snapshot = { ...state };
};

const persist = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

load();

export const settingsStore = {
  get: () => snapshot,
  setCurrency: (currency: Currency) => {
    state.currency = currency;
    persist();
    emit();
  },
  setProjectName: (projectName: string) => {
    state.projectName = projectName;
    persist();
    emit();
  },
  setTaxRate: (taxRate: number) => {
    state.taxRate = taxRate;
    persist();
    emit();
  },
  setTaxIncluded: (taxIncluded: boolean) => {
    state.taxIncluded = taxIncluded;
    persist();
    emit();
  },
  setCompactMode: (compactMode: boolean) => {
    state.compactMode = compactMode;
    persist();
    emit();
  },
  setStoreAddress: (storeAddress: string) => {
    state.storeAddress = storeAddress;
    persist();
    emit();
  },
  setStorePhone: (storePhone: string) => {
    state.storePhone = storePhone;
    persist();
    emit();
  },
  setStoreTaxId: (storeTaxId: string) => {
    state.storeTaxId = storeTaxId;
    persist();
    emit();
  },
  setLogoUrl: (logoUrl: string) => {
    state.logoUrl = logoUrl;
    persist();
    emit();
  },
  setPaymentMethods: (paymentMethods: string) => {
    state.paymentMethods = paymentMethods;
    persist();
    emit();
  },
  setInvoicePrefix: (invoicePrefix: string) => {
    state.invoicePrefix = invoicePrefix;
    persist();
    emit();
  },
  setInvoiceNext: (invoiceNext: number) => {
    state.invoiceNext = invoiceNext;
    persist();
    emit();
  },
  setReceiptHeader: (receiptHeader: string) => {
    state.receiptHeader = receiptHeader;
    persist();
    emit();
  },
  setReceiptFooter: (receiptFooter: string) => {
    state.receiptFooter = receiptFooter;
    persist();
    emit();
  },
  setPaperWidthMm: (paperWidthMm: number) => {
    state.paperWidthMm = paperWidthMm;
    persist();
    emit();
  },
  setDefaultWarehouseId: (defaultWarehouseId: number | null) => {
    state.defaultWarehouseId = defaultWarehouseId;
    persist();
    emit();
  },
  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
