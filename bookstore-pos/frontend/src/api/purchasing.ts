import { api } from "./client";

export const createPurchaseOrder = async (data: { supplier_id: number; items: { product_id: number; qty: number; unit_cost: number }[] }) => {
  const res = await api.post("/purchasing/orders", data);
  return res.data;
};

export const receivePurchaseOrder = async (orderId: number, items: { product_id: number; qty: number }[]) => {
  const res = await api.post(`/purchasing/orders/${orderId}/receive`, { items });
  return res.data;
};

export const supplierPayment = async (data: { supplier_id: number; amount: number; method: string; reference: string }) => {
  const res = await api.post("/purchasing/payments", data);
  return res.data;
};
