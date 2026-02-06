import { api } from "@/modules/shared/api";
import { DailyReport, TopProductReport, LowStockItem } from "@/modules/shared/types";

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
