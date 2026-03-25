export type Currency = "PEN" | "USD" | "EUR";

export type PublicSettingsPatch = {
  project_name: string;
  currency: string;
  tax_rate: number;
  tax_included: boolean;
  store_address: string;
  store_phone: string;
  store_tax_id: string;
  logo_url: string;
  payment_methods: string;
  invoice_prefix: string;
  invoice_next: number;
  receipt_header: string;
  receipt_footer: string;
  paper_width_mm: number;
  default_warehouse_id?: number | null;
};

export type ThemeMode = "light" | "dark" | "system";

type SettingsState = {
  currency: Currency;
  projectName: string;
  taxRate: number;
  taxIncluded: boolean;
  compactMode: boolean;
  darkMode: ThemeMode;
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
  printTemplatesEnabled: boolean;
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
  darkMode: "system",
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
  printTemplatesEnabled: false,
  defaultWarehouseId: null,
};

const listeners = new Set<Listener>();

let snapshot: SettingsState = { ...state };

const normalizeCurrency = (currency: string): Currency => {
  if (currency === "USD" || currency === "EUR") return currency;
  return "PEN";
};

const updateState = (patch: Partial<SettingsState>) => {
  let changed = false;
  const mutableState = state as Record<keyof SettingsState, SettingsState[keyof SettingsState]>;
  const nextState = patch as Partial<Record<keyof SettingsState, SettingsState[keyof SettingsState]>>;

  (Object.keys(nextState) as Array<keyof SettingsState>).forEach((key) => {
    const nextValue = nextState[key];
    if (nextValue === undefined) return;
    if (mutableState[key] === nextValue) return;
    mutableState[key] = nextValue;
    changed = true;
  });

  if (!changed) return;
  persist();
  emit();
};

const emit = () => {
  snapshot = { ...state };
  listeners.forEach((l) => l());
};

const load = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as Partial<SettingsState>;
    if (typeof parsed.currency === "string") state.currency = normalizeCurrency(parsed.currency);
    if (parsed.projectName) state.projectName = parsed.projectName;
    if (typeof parsed.taxRate === "number") state.taxRate = parsed.taxRate;
    if (typeof parsed.taxIncluded === "boolean") state.taxIncluded = parsed.taxIncluded;
    if (typeof parsed.compactMode === "boolean") state.compactMode = parsed.compactMode;
    if (parsed.darkMode === "light" || parsed.darkMode === "dark" || parsed.darkMode === "system") state.darkMode = parsed.darkMode;
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
    if (typeof parsed.printTemplatesEnabled === "boolean") state.printTemplatesEnabled = parsed.printTemplatesEnabled;
    if (typeof parsed.defaultWarehouseId === "number") state.defaultWarehouseId = parsed.defaultWarehouseId;
  } catch {
    // ignore
  }
  snapshot = { ...state };
};

const persist = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event("bookstore-settings-changed"));
};

load();

export const settingsStore = {
  get: () => snapshot,
  setCurrency: (currency: Currency) => {
    updateState({ currency });
  },
  setProjectName: (projectName: string) => {
    updateState({ projectName });
  },
  setTaxRate: (taxRate: number) => {
    updateState({ taxRate });
  },
  setTaxIncluded: (taxIncluded: boolean) => {
    updateState({ taxIncluded });
  },
  setCompactMode: (compactMode: boolean) => {
    updateState({ compactMode });
  },
  setDarkMode: (darkMode: ThemeMode) => {
    updateState({ darkMode });
  },
  setStoreAddress: (storeAddress: string) => {
    updateState({ storeAddress });
  },
  setStorePhone: (storePhone: string) => {
    updateState({ storePhone });
  },
  setStoreTaxId: (storeTaxId: string) => {
    updateState({ storeTaxId });
  },
  setLogoUrl: (logoUrl: string) => {
    updateState({ logoUrl });
  },
  setPaymentMethods: (paymentMethods: string) => {
    updateState({ paymentMethods });
  },
  setInvoicePrefix: (invoicePrefix: string) => {
    updateState({ invoicePrefix });
  },
  setInvoiceNext: (invoiceNext: number) => {
    updateState({ invoiceNext });
  },
  setReceiptHeader: (receiptHeader: string) => {
    updateState({ receiptHeader });
  },
  setReceiptFooter: (receiptFooter: string) => {
    updateState({ receiptFooter });
  },
  setPaperWidthMm: (paperWidthMm: number) => {
    updateState({ paperWidthMm });
  },
  setPrintTemplatesEnabled: (printTemplatesEnabled: boolean) => {
    updateState({ printTemplatesEnabled });
  },
  setDefaultWarehouseId: (defaultWarehouseId: number | null) => {
    updateState({ defaultWarehouseId });
  },
  applyPublicSettings: (settings: PublicSettingsPatch) => {
    updateState({
      projectName: settings.project_name,
      currency: normalizeCurrency(settings.currency),
      taxRate: settings.tax_rate,
      taxIncluded: settings.tax_included,
      storeAddress: settings.store_address,
      storePhone: settings.store_phone,
      storeTaxId: settings.store_tax_id,
      logoUrl: settings.logo_url,
      paymentMethods: settings.payment_methods,
      invoicePrefix: settings.invoice_prefix,
      invoiceNext: settings.invoice_next,
      receiptHeader: settings.receipt_header,
      receiptFooter: settings.receipt_footer,
      paperWidthMm: settings.paper_width_mm,
      defaultWarehouseId: settings.default_warehouse_id ?? null,
    });
  },
  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getState: () => state,
};
