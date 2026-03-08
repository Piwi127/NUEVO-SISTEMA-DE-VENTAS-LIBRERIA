import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CssBaseline, ThemeProvider } from "@mui/material";

import App from "@/routes/App";
import { AuthProvider } from "@/auth/AuthProvider";
import { ToastProvider } from "@/app/components";
import { theme } from "@/theme";
import "./index.css";

const queryClient = new QueryClient();
const PRELOAD_RELOAD_GUARD = "bookstore_preload_reload_guard";

if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    if (window.sessionStorage.getItem(PRELOAD_RELOAD_GUARD) === "1") {
      return;
    }
    window.sessionStorage.setItem(PRELOAD_RELOAD_GUARD, "1");
    window.location.reload();
  });
  window.addEventListener("load", () => {
    window.sessionStorage.removeItem(PRELOAD_RELOAD_GUARD);
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <AuthProvider>
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <CssBaseline />
            <ToastProvider>
              <App />
            </ToastProvider>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
