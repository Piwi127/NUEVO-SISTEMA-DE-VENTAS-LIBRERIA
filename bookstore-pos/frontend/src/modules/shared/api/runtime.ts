// Funciones de configuración del API
// getApiBaseUrl - retorna la URL base del API
// getWsBaseUrl - retorna la URL base para WebSocket
// getApiTimeoutMs - retorna el timeout del API
// getApiHealthTimeoutMs - retorna el timeout para health check

const parseTimeoutMs = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
};

export const getApiBaseUrl = (): string => {
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (configured) {
    return trimTrailingSlash(configured);
  }

  if (typeof window !== "undefined") {
    if (import.meta.env.DEV) {
      return `${window.location.origin}/api`;
    }
    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    return `${protocol}//${window.location.hostname}:8000`;
  }

  return "http://localhost:8000";
};

export const getWsBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const configured = import.meta.env.VITE_API_URL?.trim();
    if (configured) {
      return trimTrailingSlash(configured).replace(/^http:/, "ws:").replace(/^https:/, "wss:");
    }
    if (import.meta.env.DEV) {
      return `${wsProtocol}//${window.location.host}`;
    }
    return `${wsProtocol}//${window.location.hostname}:8000`;
  }
  return "ws://localhost:8000";
};

export const getApiTimeoutMs = (): number =>
  parseTimeoutMs(import.meta.env.VITE_API_TIMEOUT_MS, 8000);

export const getApiHealthTimeoutMs = (): number =>
  parseTimeoutMs(import.meta.env.VITE_API_HEALTH_TIMEOUT_MS, 3000);
