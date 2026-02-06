import { api } from "../../shared/api";
import { CashSession, CashMovement, CashAudit, CashAuditValidation, CashSummary, CashSessionReport } from "../../shared/types";

export const getCurrentCash = async (): Promise<CashSession | null> => {
  const res = await api.get("/cash/current");
  return res.data;
};

export const openCash = async (opening_amount: number): Promise<CashSession> => {
  const res = await api.post("/cash/open", { opening_amount });
  return res.data;
};

export const closeCash = async () => {
  const res = await api.post("/cash/close", {});
  return res.data;
};

export const createCashMovement = async (data: { type: string; amount: number; reason: string }): Promise<CashMovement> => {
  const res = await api.post("/cash/movement", data);
  return res.data;
};

export const getCashSummary = async (): Promise<CashSummary> => {
  const res = await api.get("/cash/summary");
  return res.data;
};

export const createCashAudit = async (data: { type: string; counted_amount: number }): Promise<CashAudit> => {
  const res = await api.post("/cash/audit", data);
  return res.data;
};

export const listCashAudits = async (): Promise<CashAuditValidation[]> => {
  const res = await api.get("/cash/audits");
  return res.data;
};

export const forceCloseCash = async () => {
  const res = await api.post("/cash/force-close", {});
  return res.data;
};

export const getCashSessionReport = async (cashSessionId: number): Promise<CashSessionReport> => {
  const res = await api.get(`/cash/sessions/${cashSessionId}/report`);
  return res.data;
};

export const downloadCashSessionReport = async (cashSessionId: number): Promise<Blob> => {
  const res = await api.get(`/cash/sessions/${cashSessionId}/report/export`, { responseType: "blob" });
  return res.data;
};
