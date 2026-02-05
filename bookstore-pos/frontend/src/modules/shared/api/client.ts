import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

export const apiHealth = axios.create({
  baseURL,
  withCredentials: true,
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

api.interceptors.request.use((config) => {
  const raw = localStorage.getItem("bookstore_auth");
  let csrf: string | null = null;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { csrfToken?: string | null; csrf_token?: string | null };
      csrf = parsed.csrfToken ?? parsed.csrf_token ?? null;
    } catch {
      // ignore
    }
  }
  if (!csrf) {
    csrf = getCookie("csrf_token");
  }
  if (csrf) {
    config.headers = config.headers || {};
    config.headers["X-CSRF-Token"] = csrf;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("bookstore_auth");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
