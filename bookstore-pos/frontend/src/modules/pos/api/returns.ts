import { api } from "../../shared/api";
import { SaleReturnListResponse } from "../../shared/types";

export const returnSale = async (saleId: number, reason: string) => {
  const res = await api.post(`/returns/${saleId}`, { reason });
  return res.data;
};

export const listReturns = async (limit = 100): Promise<SaleReturnListResponse[]> => {
  const res = await api.get("/returns", { params: { limit } });
  return res.data;
};
