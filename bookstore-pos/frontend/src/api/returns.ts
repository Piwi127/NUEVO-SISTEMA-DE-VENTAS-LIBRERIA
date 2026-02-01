import { api } from "./client";

export const returnSale = async (saleId: number, reason: string) => {
  const res = await api.post(`/returns/${saleId}`, { reason });
  return res.data;
};
