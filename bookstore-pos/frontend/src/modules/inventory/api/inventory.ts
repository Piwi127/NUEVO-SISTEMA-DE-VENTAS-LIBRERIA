import { api } from "@/modules/shared/api";
import type {
  InventoryImportJob,
  InventoryImportJobErrorList,
  KardexPage,
  StockMovement,
} from "@/modules/shared/types";

export const createInventoryMovement = async (data: { product_id: number; type: string; qty: number; ref: string }) => {
  const res = await api.post("/inventory/movement", data);
  return res.data as StockMovement;
};

export const getKardex = async (
  product_id: number,
  options?: {
    limit?: number;
    cursor?: string | null;
    from?: string | null;
    to?: string | null;
    type?: string | null;
  }
): Promise<KardexPage> => {
  const params = {
    limit: options?.limit ?? 100,
    cursor: options?.cursor ?? undefined,
    from: options?.from ?? undefined,
    to: options?.to ?? undefined,
    type: options?.type ?? undefined,
  };
  const res = await api.get(`/inventory/kardex/${product_id}`, { params });
  return res.data as KardexPage;
};

export const uploadInventory = async (file: File) => {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post("/inventory/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data as { ok: boolean; count: number };
};

export const createInventoryImportJob = async (file: File, options?: { batch_size?: number }): Promise<InventoryImportJob> => {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post("/inventory/import-jobs", form, {
    params: { batch_size: options?.batch_size },
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data as InventoryImportJob;
};

export const getInventoryImportJob = async (jobId: number): Promise<InventoryImportJob> => {
  const res = await api.get(`/inventory/import-jobs/${jobId}`);
  return res.data as InventoryImportJob;
};

export const getInventoryImportJobErrors = async (
  jobId: number,
  options?: { limit?: number }
): Promise<InventoryImportJobErrorList> => {
  const res = await api.get(`/inventory/import-jobs/${jobId}/errors`, {
    params: { limit: options?.limit ?? 500, format: "json" },
  });
  return res.data as InventoryImportJobErrorList;
};

export const downloadInventoryImportJobErrors = async (jobId: number): Promise<Blob> => {
  const res = await api.get(`/inventory/import-jobs/${jobId}/errors`, {
    params: { format: "csv", limit: 5000 },
    responseType: "blob",
  });
  return res.data as Blob;
};

export const downloadInventoryTemplate = async (): Promise<Blob> => {
  const res = await api.get("/inventory/template", { responseType: "blob" });
  return res.data;
};

export const downloadInventoryTemplateXlsx = async (): Promise<Blob> => {
  const res = await api.get("/inventory/template/xlsx", { responseType: "blob" });
  return res.data;
};
