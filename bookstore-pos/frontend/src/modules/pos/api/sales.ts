import { api } from "@/modules/shared/api";
import { SaleResponse, SaleListResponse } from "@/modules/shared/types";

export type SaleReceipt = {
  sale_id: number;
  invoice_number: string;
  document_type: string;
  created_at: string;
  subtotal: number;
  tax: number;
  discount: number;
  pack_discount?: number;
  promotion_discount?: number;
  loyalty_discount?: number;
  loyalty_points_earned?: number;
  loyalty_points_redeemed?: number;
  total: number;
  items: Array<{
    product_id: number;
    name: string;
    qty: number;
    unit_price: number;
    unit_cost_snapshot?: number;
    line_total: number;
    base_line_total?: number;
    discount?: number;
    final_total: number;
    applied_rule_id?: number | null;
    applied_rule_meta?: string | null;
  }>;
  payments?: Array<{
    method: string;
    amount: number;
  }>;
  customer?: {
    id: number;
    name: string;
    tax_id?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  store: {
    name: string;
    address: string;
    phone: string;
    tax_id: string;
  };
};

export const createSale = async (data: {
  customer_id?: number | null;
  items: { product_id: number; qty: number }[];
  payments: { method: string; amount: number }[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  promotion_id?: number | null;
  redeem_points?: number;
  document_type?: "TICKET" | "BOLETA" | "FACTURA";
}): Promise<SaleResponse> => {
  const res = await api.post("/sales", data);
  return res.data;
};

export const getReceipt = async (saleId: number): Promise<SaleReceipt> => {
  const res = await api.get(`/sales/${saleId}/receipt`);
  return res.data as SaleReceipt;
};

export const listSales = async (params: {
  search?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
  customer_id?: number;
  user_id?: number;
  limit?: number;
}): Promise<SaleListResponse[]> => {
  const res = await api.get("/sales", { params });
  return res.data as SaleListResponse[];
};
