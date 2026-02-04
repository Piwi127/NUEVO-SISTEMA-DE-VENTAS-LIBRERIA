import { api } from "../../shared/api";

export const login = async (username: string, password: string, otp?: string) => {
  const res = await api.post("/auth/login", { username, password, otp });
  return res.data as { role: string; username: string; csrf_token?: string };
};

export const me = async () => {
  const res = await api.get("/auth/me");
  return res.data as { username: string; role: string };
};

export const setup2fa = async () => {
  const res = await api.post("/auth/2fa/setup", {});
  return res.data as { secret: string; otpauth: string };
};

export const confirm2fa = async (code: string) => {
  const res = await api.post("/auth/2fa/confirm", null, { params: { code } });
  return res.data as { ok: boolean };
};

export const logout = async () => {
  const res = await api.post("/auth/logout", {});
  return res.data as { ok: boolean };
};
