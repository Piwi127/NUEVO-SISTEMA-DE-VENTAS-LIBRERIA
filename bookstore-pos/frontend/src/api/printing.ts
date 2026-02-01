import { api } from "./client";

export const downloadEscpos = async (saleId: number): Promise<Blob> => {
  const res = await api.get(`/printing/escpos/${saleId}`, { responseType: "blob" });
  return res.data;
};

export const getReceiptText = async (saleId: number): Promise<string> => {
  const res = await api.get(`/printing/receipt-text/${saleId}`, { responseType: "text" });
  return res.data as string;
};
