/**
 * Cliente HTTP Axios configurado para la API del sistema POS.
 * 
 * Características:
 * - Interceptors para CSRF tokens
 * - Refresh automático de tokens JWT
 * - Manejo de errores 401 con redirección a login
 * - Credenciales (cookies) habilitadas
 */

import axios from "axios";
import { getApiBaseUrl, getApiHealthTimeoutMs, getApiTimeoutMs } from "@/modules/shared/api/runtime";

// Configuración base
const baseURL = getApiBaseUrl();
const apiTimeout = getApiTimeoutMs();
const healthTimeout = getApiHealthTimeoutMs();

// Clave para almacenar auth en localStorage
const AUTH_STORAGE_KEY = "bookstore_auth";

/**
 * Tipo para datos de autenticación almacenados
 */
type StoredAuth = {
  username?: string | null;
  role?: string | null;
  csrfToken?: string | null;
  csrf_token?: string | null;
};

/**
 * Instancia principal de API con configuración base
 * - timeout: Tiempo máximo de espera
 * - withCredentials: Habilita cookies
 */
export const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: apiTimeout,
});

/**
 * Instancia para health checks con timeout más corto
 */
export const apiHealth = axios.create({
  baseURL,
  withCredentials: true,
  timeout: healthTimeout,
});

/**
 * Obtiene el valor de una cookie por nombre.
 * 
 * @param name - Nombre de la cookie
 * @returns Valor de la cookie o null si no existe
 */
const getCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.split("=").slice(1).join("="));
};

/**
 * Lee los datos de autenticación desde localStorage.
 * 
 * @returns Datos almacenados o null si no existen
 */
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

/**
 * Persiste el token CSRF en localStorage.
 * 
 * @param csrfToken - Token CSRF a guardar
 */
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

/**
 * Resuelve el token CSRF actual.
 * Prioriza la cookie sobre localStorage.
 * 
 * @returns Token CSRF actual
 */
const resolveCsrfToken = (): string | null => {
  const cookieCsrf = getCookie("csrf_token");
  const auth = readStoredAuth();
  const storedCsrf = auth?.csrfToken ?? auth?.csrf_token ?? null;
  if (cookieCsrf) {
    if (storedCsrf !== cookieCsrf) {
      persistCsrfToken(cookieCsrf);
    }
    return cookieCsrf;
  }
  return storedCsrf;
};

// Interceptor de requests: agrega CSRF token
api.interceptors.request.use((config) => {
  const csrf = resolveCsrfToken();
  if (csrf) {
    config.headers = config.headers || {};
    config.headers["X-CSRF-Token"] = csrf;
  }
  return config;
});

// Variables para manejar refresh de tokens
let isRefreshing = false;
let refreshWaiters: Array<(ok: boolean) => void> = [];

/**
 * Notifica a todos los waiters que el refresh completó.
 * 
 * @param ok - Si el refresh fue exitoso
 */
const notifyRefreshWaiters = (ok: boolean) => {
  refreshWaiters.forEach((resolve) => resolve(ok));
  refreshWaiters = [];
};

// Interceptor de responses: maneja errores de autenticación
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config || {};
    const requestUrl = String(originalRequest?.url || "");
    const responseDataText = String(error?.response?.data || "").toLowerCase();

    // Manejo de errores CSRF (retry con nuevo token)
    if (status === 403 && typeof window !== "undefined") {
      const isCsrfError = responseDataText.includes("csrf token missing or invalid");
      const isRefreshCall = requestUrl.includes("/auth/refresh");
      if (isCsrfError && !isRefreshCall && !originalRequest._csrfRetry) {
        const csrfFromCookie = getCookie("csrf_token");
        if (csrfFromCookie) {
          persistCsrfToken(csrfFromCookie);
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers["X-CSRF-Token"] = csrfFromCookie;
          originalRequest._csrfRetry = true;
          return api(originalRequest);
        }
      }
    }

    // Si no es error 401, rechazar normalmente
    if (status !== 401 || typeof window === "undefined") {
      return Promise.reject(error);
    }

    // Si es login o refresh, limpiar y redirigir
    if (requestUrl.includes("/auth/login") || requestUrl.includes("/auth/refresh")) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }

    // Si ya se intentó refresh, no intentar de nuevo
    if (originalRequest._retry) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }

    // Si hay otro refresh en progreso, esperar
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

    // Iniciar refresh de token
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
