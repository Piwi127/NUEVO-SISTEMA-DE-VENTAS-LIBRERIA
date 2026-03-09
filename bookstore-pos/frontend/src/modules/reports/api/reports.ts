import { api } from "@/modules/shared/api";
import {
  DailyReport,
  LowStockItem,
  OperationalAlert,
  ProfitabilityProductReport,
  ProfitabilitySummaryReport,
  ReplenishmentSuggestionReport,
  StockRotationReport,
  TopProductReport,
} from "@/modules/shared/types";

let profitabilitySupportPromise: Promise<boolean> | null = null;

export const hasProfitabilitySupport = async (): Promise<boolean> => {
  if (!profitabilitySupportPromise) {
    profitabilitySupportPromise = api
      .get("/openapi.json", { timeout: 4000 })
      .then((res) => {
        const paths = res.data?.paths ?? {};
        return Boolean(paths["/reports/profitability"] && paths["/reports/profitability/products"]);
      })
      .catch(() => true);
  }
  return profitabilitySupportPromise;
};

export const getDailyReport = async (date: string): Promise<DailyReport> => {
  const res = await api.get("/reports/daily", { params: { date } });
  return res.data;
};

export const getTopProducts = async (from: string, to: string): Promise<TopProductReport[]> => {
  const res = await api.get("/reports/top-products", { params: { from_date: from, to } });
  return res.data;
};

export const getLowStock = async (): Promise<LowStockItem[]> => {
  const res = await api.get("/reports/low-stock");
  return res.data;
};

export const exportDaily = async (date: string): Promise<Blob> => {
  const res = await api.get("/reports/daily/export", { params: { date }, responseType: "blob" });
  return res.data;
};

export const exportTop = async (from: string, to: string): Promise<Blob> => {
  const res = await api.get("/reports/top-products/export", { params: { from_date: from, to }, responseType: "blob" });
  return res.data;
};

export const exportLow = async (): Promise<Blob> => {
  const res = await api.get("/reports/low-stock/export", { responseType: "blob" });
  return res.data;
};

export const getProfitabilitySummary = async (from: string, to: string): Promise<ProfitabilitySummaryReport> => {
  const res = await api.get("/reports/profitability", { params: { from_date: from, to } });
  return res.data;
};

export const getProfitabilityProducts = async (
  from: string,
  to: string,
  limit = 100
): Promise<ProfitabilityProductReport[]> => {
  const res = await api.get("/reports/profitability/products", { params: { from_date: from, to, limit } });
  return res.data;
};

export const exportProfitabilitySummary = async (from: string, to: string): Promise<Blob> => {
  const res = await api.get("/reports/profitability/export", {
    params: { from_date: from, to },
    responseType: "blob",
  });
  return res.data;
};

export const exportProfitabilityProducts = async (from: string, to: string, limit = 100): Promise<Blob> => {
  const res = await api.get("/reports/profitability/products/export", {
    params: { from_date: from, to, limit },
    responseType: "blob",
  });
  return res.data;
};

export const getStockRotation = async (from: string, to: string, limit = 100): Promise<StockRotationReport[]> => {
  const res = await api.get("/reports/rotation", { params: { from_date: from, to, limit } });
  return res.data;
};

export const exportStockRotation = async (from: string, to: string, limit = 100): Promise<Blob> => {
  const res = await api.get("/reports/rotation/export", {
    params: { from_date: from, to, limit },
    responseType: "blob",
  });
  return res.data;
};

export const getReplenishmentSuggestions = async (
  from: string,
  to: string,
  targetDays = 21,
  limit = 100
): Promise<ReplenishmentSuggestionReport[]> => {
  const res = await api.get("/reports/replenishment", {
    params: { from_date: from, to, target_days: targetDays, limit },
  });
  return res.data;
};

export const getOperationalAlerts = async (
  from: string,
  to: string,
  options?: { expiryDays?: number; stagnantDays?: number; limit?: number }
): Promise<OperationalAlert[]> => {
  const res = await api.get("/reports/alerts", {
    params: {
      from_date: from,
      to,
      expiry_days: options?.expiryDays ?? 14,
      stagnant_days: options?.stagnantDays ?? 30,
      limit: options?.limit ?? 200,
    },
  });
  return res.data;
};

export const exportReplenishmentSuggestions = async (
  from: string,
  to: string,
  targetDays = 21,
  limit = 100
): Promise<Blob> => {
  const res = await api.get("/reports/replenishment/export", {
    params: { from_date: from, to, target_days: targetDays, limit },
    responseType: "blob",
  });
  return res.data;
};
