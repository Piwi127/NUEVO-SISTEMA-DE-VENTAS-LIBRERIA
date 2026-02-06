import { api } from "@/modules/shared/api";
import { User } from "@/modules/shared/types";

export const listUsers = async (): Promise<User[]> => {
  const res = await api.get("/users");
  return res.data;
};

export const createUser = async (data: { username: string; password: string; role: string; is_active: boolean }) => {
  const res = await api.post("/users", data);
  return res.data as User;
};

export const updateUser = async (id: number, data: { username: string; role: string; is_active: boolean }) => {
  const res = await api.put(`/users/${id}`, data);
  return res.data as User;
};

export const updateUserPassword = async (id: number, password: string) => {
  const res = await api.patch(`/users/${id}/password`, { password });
  return res.data;
};

export const updateUserStatus = async (id: number, is_active: boolean) => {
  const res = await api.patch(`/users/${id}/status`, { is_active });
  return res.data;
};

export const unlockUser = async (id: number) => {
  const res = await api.post(`/users/${id}/unlock`);
  return res.data;
};

export const setupUser2FA = async (id: number) => {
  const res = await api.post(`/users/${id}/2fa/setup`);
  return res.data as { secret: string; otpauth: string };
};

export const confirmUser2FA = async (id: number, code: string) => {
  const res = await api.post(`/users/${id}/2fa/confirm`, { code });
  return res.data;
};

export const resetUser2FA = async (id: number) => {
  const res = await api.post(`/users/${id}/2fa/reset`);
  return res.data;
};
