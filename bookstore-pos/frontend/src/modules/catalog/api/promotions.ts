import { api } from "@/modules/shared/api";

export type Promotion = { id: number; name: string; type: string; value: number; is_active: boolean };

export const listPromotions = async (): Promise<Promotion[]> => {
  const res = await api.get("/promotions");
  return res.data;
};

export const listActivePromotions = async (): Promise<Promotion[]> => {
  const res = await api.get("/promotions/active");
  return res.data;
};

export const createPromotion = async (data: Promotion) => {
  const res = await api.post("/promotions", data);
  return res.data as Promotion;
};
