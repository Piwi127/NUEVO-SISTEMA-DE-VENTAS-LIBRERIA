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
