import { api } from "@/modules/shared/api";

export const createPurchaseOrder = async (data: { supplier_id: number; items: { product_id: number; qty: number; unit_cost: number }[] }) => {
  const res = await api.post("/purchasing/orders", data);
  return res.data;
};

export const listPurchaseOrders = async (status?: string) => {
  const res = await api.get("/purchasing/orders", { params: status ? { status } : undefined });
  return res.data as any[];
};

export const listPurchaseOrderItems = async (orderId: number) => {
  const res = await api.get(`/purchasing/orders/${orderId}/items`);
  return res.data as any[];
};

export const receivePurchaseOrder = async (orderId: number, items: { product_id: number; qty: number }[]) => {
  const res = await api.post(`/purchasing/orders/${orderId}/receive`, { items });
  return res.data;
};

export const receivePurchaseOrderWithCosts = async (
  orderId: number,
  payload: {
    items: { product_id: number; qty: number }[];
    direct_costs_breakdown?: Record<string, number>;
    lot_prefix?: string;
  }
) => {
  const res = await api.post(`/purchasing/orders/${orderId}/receive`, payload);
  return res.data;
};

export const supplierPayment = async (data: { supplier_id: number; amount: number; method: string; reference: string }) => {
  const res = await api.post("/purchasing/payments", data);
  return res.data;
};
