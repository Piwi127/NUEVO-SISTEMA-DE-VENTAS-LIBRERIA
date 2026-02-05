import { api } from "../../shared/api";

export type PriceList = { id: number; name: string };
export type PriceListItem = { id: number; product_id: number; price: number };

export const listPriceLists = async (): Promise<PriceList[]> => {
  const res = await api.get("/price-lists");
  return res.data;
};

export const createPriceList = async (data: { name: string }): Promise<PriceList> => {
  const res = await api.post("/price-lists", data);
  return res.data;
};

export const getPriceListItems = async (id: number): Promise<PriceListItem[]> => {
  const res = await api.get(`/price-lists/${id}/items`);
  return res.data;
};

export const replacePriceListItems = async (id: number, items: { product_id: number; price: number }[]) => {
  const res = await api.put(`/price-lists/${id}/items`, items);
  return res.data as PriceListItem[];
};
