import { settingsStore } from "../store/settingsStore";

const mapLocale = (currency: string) => {
  if (currency === "PEN") return "es-PE";
  if (currency === "USD") return "en-US";
  if (currency === "EUR") return "es-ES";
  return "es-PE";
};

export const formatMoney = (value: number) => {
  const { currency } = settingsStore.get();
  const locale = mapLocale(currency);
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(value || 0);
};
