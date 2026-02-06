import { api } from "@/modules/shared/api";
import { SaleResponse, SaleListResponse } from "@/modules/shared/types";

export const createSale = async (data: {
  customer_id?: number | null;
  items: { product_id: number; qty: number }[];
  payments: { method: string; amount: number }[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  promotion_id?: number | null;
}): Promise<SaleResponse> => {
  const res = await api.post("/sales", data);
  return res.data;
};

export const getReceipt = async (saleId: number) => {
  const res = await api.get(`/sales/${saleId}/receipt`);
  return res.data as any;
};

export const listSales = async (params: {
  status?: string;
  from_date?: string;
  to_date?: string;
  customer_id?: number;
  user_id?: number;
  limit?: number;
}) => {
  const res = await api.get("/sales", { params });
  return res.data as SaleListResponse[];
};
