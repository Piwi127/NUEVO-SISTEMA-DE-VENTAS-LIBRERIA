import { api } from "@/modules/shared/api";

export const downloadEscpos = async (saleId: number): Promise<Blob> => {
  const res = await api.get(`/printing/escpos/${saleId}`, { responseType: "blob" });
  return res.data;
};

export const getReceiptText = async (saleId: number): Promise<string> => {
  const res = await api.get(`/printing/receipt-text/${saleId}`, { responseType: "text" });
  return res.data as string;
};

export const getRenderedDocumentHtml = async (saleId: number): Promise<string> => {
  const res = await api.get(`/printing/document/${saleId}/html`, { responseType: "text" });
  return res.data as string;
};

export const getRenderedDocumentText = async (saleId: number): Promise<string> => {
  const res = await api.get(`/printing/document/${saleId}/text`, { responseType: "text" });
  return res.data as string;
};

export const downloadRenderedDocumentPdf = async (saleId: number): Promise<Blob> => {
  const res = await api.get(`/printing/document/${saleId}/pdf`, { responseType: "blob" });
  return res.data;
};
