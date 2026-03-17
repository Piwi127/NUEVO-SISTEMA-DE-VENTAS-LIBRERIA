const MODULE_LOAD_RETRY_GUARD = "bookstore_module_load_retry_guard";

const recoverableImportErrorPatterns = [
  "failed to fetch dynamically imported module",
  "importing a module script failed",
  "error loading dynamically imported module",
  "outdated optimize dep",
];

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    const { message } = error as { message?: unknown };
    return typeof message === "string" ? message : "";
  }
  return "";
};

export const isRecoverableModuleLoadError = (error: unknown): boolean => {
  const message = getErrorMessage(error).toLowerCase();
  return recoverableImportErrorPatterns.some((pattern) => message.includes(pattern));
};

const reloadOnce = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }
  if (window.sessionStorage.getItem(MODULE_LOAD_RETRY_GUARD) === "1") {
    return false;
  }
  window.sessionStorage.setItem(MODULE_LOAD_RETRY_GUARD, "1");
  window.location.reload();
  return true;
};

export const recoverFromModuleLoadError = (error: unknown): boolean => {
  if (!isRecoverableModuleLoadError(error)) {
    return false;
  }
  return reloadOnce();
};

export const registerModuleLoadRecovery = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    reloadOnce();
  });

  window.addEventListener("load", () => {
    window.sessionStorage.removeItem(MODULE_LOAD_RETRY_GUARD);
  });
};
