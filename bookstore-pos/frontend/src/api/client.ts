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

api.interceptors.request.use((config) => {
  const raw = localStorage.getItem("bookstore_auth");
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { csrfToken?: string | null; csrf_token?: string | null };
      const csrf = parsed.csrfToken ?? parsed.csrf_token;
      if (csrf) {
        config.headers = config.headers || {};
        config.headers["X-CSRF-Token"] = csrf;
      }
    } catch {
      // ignore
    }
  }
  return config;
});
