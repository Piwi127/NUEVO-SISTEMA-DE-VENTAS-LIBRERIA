import { api } from "@/modules/shared/api";
import {
  DailyReport,
  LowStockItem,
  ProfitabilityProductReport,
  ProfitabilitySummaryReport,
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
