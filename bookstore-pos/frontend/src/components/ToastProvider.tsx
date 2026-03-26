import React, { createContext, useContext, useMemo, useState } from "react";
import { Snackbar, Alert } from "@mui/material";

export type Toast = { message: string; severity?: "success" | "error" | "info" | "warning" };

type ToastContextValue = {
  showToast: (toast: Toast) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<Toast>({ message: "" });

  const showToast = (t: Toast) => {
    const message =
      typeof t.message === "string"
        ? t.message
        : (() => {
            try {
              return JSON.stringify(t.message);
            } catch {
              return String(t.message);
            }
          })();
    setToast({ ...t, message });
    setOpen(true);
  };

  const value = useMemo(() => ({ showToast }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Snackbar open={open} autoHideDuration={3000} onClose={() => setOpen(false)}>
        <Alert onClose={() => setOpen(false)} severity={toast.severity || "info"} sx={{ width: "100%" }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
};
