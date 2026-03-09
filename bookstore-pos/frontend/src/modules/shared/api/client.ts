import axios from "axios";
import { getApiBaseUrl, getApiHealthTimeoutMs, getApiTimeoutMs } from "@/modules/shared/api/runtime";

const baseURL = getApiBaseUrl();
const apiTimeout = getApiTimeoutMs();
const healthTimeout = getApiHealthTimeoutMs();
const AUTH_STORAGE_KEY = "bookstore_auth";

type StoredAuth = {
  username?: string | null;
  role?: string | null;
  csrfToken?: string | null;
  csrf_token?: string | null;
};

export const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: apiTimeout,
});

export const apiHealth = axios.create({
  baseURL,
  withCredentials: true,
  timeout: healthTimeout,
});

const getCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.split("=").slice(1).join("="));
};

const readStoredAuth = (): StoredAuth | null => {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAuth;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

const persistCsrfToken = (csrfToken: string | null) => {
  const current = readStoredAuth();
  if (!current) return;
  const next: StoredAuth = {
    ...current,
    csrfToken,
    csrf_token: csrfToken,
  };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
};

api.interceptors.request.use((config) => {
  const auth = readStoredAuth();
  let csrf = auth?.csrfToken ?? auth?.csrf_token ?? null;
  if (!csrf) {
    csrf = getCookie("csrf_token");
  }
  if (csrf) {
    config.headers = config.headers || {};
    config.headers["X-CSRF-Token"] = csrf;
  }
  return config;
});

let isRefreshing = false;
let refreshWaiters: Array<(ok: boolean) => void> = [];

const notifyRefreshWaiters = (ok: boolean) => {
  refreshWaiters.forEach((resolve) => resolve(ok));
  refreshWaiters = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config || {};
    const requestUrl = String(originalRequest?.url || "");

    if (status !== 401 || typeof window === "undefined") {
      return Promise.reject(error);
    }

    if (requestUrl.includes("/auth/login") || requestUrl.includes("/auth/refresh")) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }

    if (isRefreshing) {
      const refreshed = await new Promise<boolean>((resolve) => {
        refreshWaiters.push(resolve);
      });
      if (!refreshed) {
        return Promise.reject(error);
      }
      originalRequest._retry = true;
      return api(originalRequest);
    }

    isRefreshing = true;
    try {
      const refreshResponse = await api.post("/auth/refresh", {});
      const nextCsrf = (refreshResponse?.data?.csrf_token as string | undefined) ?? null;
      persistCsrfToken(nextCsrf);
      notifyRefreshWaiters(true);
      originalRequest._retry = true;
      return api(originalRequest);
    } catch (refreshError) {
      notifyRefreshWaiters(false);
      localStorage.removeItem(AUTH_STORAGE_KEY);
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
