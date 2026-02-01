import { useSyncExternalStore } from "react";
import { settingsStore, Currency } from "./settingsStore";

export const useSettings = () => {
  const snapshot = useSyncExternalStore(settingsStore.subscribe, settingsStore.get, settingsStore.get);
  return {
    ...snapshot,
    setCurrency: settingsStore.setCurrency,
    setProjectName: settingsStore.setProjectName,
    setTaxRate: settingsStore.setTaxRate,
    setTaxIncluded: settingsStore.setTaxIncluded,
    setStoreAddress: settingsStore.setStoreAddress,
    setStorePhone: settingsStore.setStorePhone,
    setStoreTaxId: settingsStore.setStoreTaxId,
    setLogoUrl: settingsStore.setLogoUrl,
    setPaymentMethods: settingsStore.setPaymentMethods,
    setInvoicePrefix: settingsStore.setInvoicePrefix,
    setInvoiceNext: settingsStore.setInvoiceNext,
    setReceiptHeader: settingsStore.setReceiptHeader,
    setReceiptFooter: settingsStore.setReceiptFooter,
    setPaperWidthMm: settingsStore.setPaperWidthMm,
  } as {
    currency: Currency;
    projectName: string;
    taxRate: number;
    taxIncluded: boolean;
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
    setCurrency: (c: Currency) => void;
    setProjectName: (n: string) => void;
    setTaxRate: (n: number) => void;
    setTaxIncluded: (n: boolean) => void;
    setStoreAddress: (n: string) => void;
    setStorePhone: (n: string) => void;
    setStoreTaxId: (n: string) => void;
    setLogoUrl: (n: string) => void;
    setPaymentMethods: (n: string) => void;
    setInvoicePrefix: (n: string) => void;
    setInvoiceNext: (n: number) => void;
    setReceiptHeader: (n: string) => void;
    setReceiptFooter: (n: string) => void;
    setPaperWidthMm: (n: number) => void;
  };
};
