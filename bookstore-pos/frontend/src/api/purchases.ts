import { api } from "./client";
import { PurchaseResponse } from "../types/dto";

export const createPurchase = async (data: {
  supplier_id: number;
  items: { product_id: number; qty: number; unit_cost: number }[];
  total: number;
}): Promise<PurchaseResponse> => {
  const res = await api.post("/purchases", data);
  return res.data;
};

export const listPurchases = async (params: {
  from_date?: string;
  to?: string;
  supplier_id?: number;
  limit?: number;
}) => {
  const res = await api.get("/purchases", { params });
  return res.data as PurchaseResponse[];
};

export const exportPurchases = async (params: { from_date?: string; to?: string; supplier_id?: number }) => {
  const res = await api.get("/purchases/export", { params, responseType: "blob" });
  return res.data as Blob;
};
