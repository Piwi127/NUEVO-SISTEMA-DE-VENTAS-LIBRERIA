import { api } from "@/modules/shared/api";

export type PrintTemplateVersion = {
  id: number;
  template_id: number;
  version: number;
  schema_json: string;
  checksum: string;
  is_published: boolean;
  created_by?: number | null;
  created_at: string;
};

export type PrintTemplate = {
  id: number;
  name: string;
  document_type: "TICKET" | "BOLETA" | "FACTURA" | string;
  paper_code: string;
  paper_width_mm: number;
  paper_height_mm?: number | null;
  margin_top_mm: number;
  margin_right_mm: number;
  margin_bottom_mm: number;
  margin_left_mm: number;
  scope_type: string;
  scope_ref_id?: number | null;
  is_active: boolean;
  is_default: boolean;
  created_by?: number | null;
  updated_by?: number | null;
  created_at: string;
  updated_at: string;
  latest_version?: PrintTemplateVersion | null;
};

export type PrintTemplateCreate = {
  name: string;
  document_type: string;
  paper_code: string;
  paper_width_mm: number;
  paper_height_mm?: number | null;
  margin_top_mm: number;
  margin_right_mm: number;
  margin_bottom_mm: number;
  margin_left_mm: number;
  scope_type: string;
  scope_ref_id?: number | null;
  is_active: boolean;
  is_default: boolean;
  schema_json: string;
};

export type PrintTemplateUpdate = Omit<PrintTemplateCreate, "document_type">;

export type PrintTemplatePreviewResponse = {
  html: string;
  text: string;
  warnings: string[];
};

export const listDocumentTemplates = async (documentType?: string): Promise<PrintTemplate[]> => {
  const res = await api.get("/document-templates", { params: documentType ? { document_type: documentType } : undefined });
  return res.data;
};

export const getDocumentTemplate = async (id: number): Promise<PrintTemplate> => {
  const res = await api.get(`/document-templates/${id}`);
  return res.data;
};

export const createDocumentTemplate = async (data: PrintTemplateCreate): Promise<PrintTemplate> => {
  const res = await api.post("/document-templates", data);
  return res.data;
};

export const updateDocumentTemplate = async (id: number, data: PrintTemplateUpdate): Promise<PrintTemplate> => {
  const res = await api.put(`/document-templates/${id}`, data);
  return res.data;
};

export const deleteDocumentTemplate = async (id: number): Promise<{ ok: boolean }> => {
  const res = await api.delete(`/document-templates/${id}`);
  return res.data;
};

export const duplicateDocumentTemplate = async (id: number, name?: string): Promise<PrintTemplate> => {
  const res = await api.post(`/document-templates/${id}/duplicate`, { name: name || null });
  return res.data;
};

export const setDefaultDocumentTemplate = async (id: number): Promise<PrintTemplate> => {
  const res = await api.post(`/document-templates/${id}/set-default`);
  return res.data;
};

export const restoreDefaultDocumentTemplate = async (id: number): Promise<PrintTemplate> => {
  const res = await api.post(`/document-templates/${id}/restore-default`);
  return res.data;
};

export const previewDocumentTemplate = async (payload: {
  document_type: string;
  schema_json: string;
  sale_id?: number;
}): Promise<PrintTemplatePreviewResponse> => {
  const res = await api.post("/document-templates/preview", payload);
  return res.data;
};
