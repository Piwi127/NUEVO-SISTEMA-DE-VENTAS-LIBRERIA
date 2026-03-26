// Punto de entrada principal de la aplicación React
// Configura los proveedores de autenticación, tema, notificaciones y rutas
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CssBaseline, ThemeProvider } from "@mui/material";

import App from "@/routes/App";
import { AuthProvider } from "@/auth/AuthProvider";
import { ToastProvider } from "@/app/components";
import { registerModuleLoadRecovery } from "@/app/utils/moduleLoadRecovery";
import { getTheme } from "@/theme";
import "./index.css";

const queryClient = new QueryClient();

registerModuleLoadRecovery();

const ThemedApp: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedMode = localStorage.getItem("bookstore_settings");
    if (savedMode) {
      try {
        const parsed = JSON.parse(savedMode);
        if (parsed.darkMode === "dark") {
          setMode("dark");
        } else if (parsed.darkMode === "system") {
          const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
          setMode(isDark ? "dark" : "light");
        }
      } catch {
        // ignore
      }
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      const savedMode = localStorage.getItem("bookstore_settings");
      if (savedMode) {
        try {
          const parsed = JSON.parse(savedMode);
          if (parsed.darkMode === "system") {
            setMode(e.matches ? "dark" : "light");
          }
        } catch {
          // ignore
        }
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    const handleStorage = () => {
      const savedMode = localStorage.getItem("bookstore_settings");
      if (savedMode) {
        try {
          const parsed = JSON.parse(savedMode);
          if (parsed.darkMode === "dark") {
            setMode("dark");
          } else if (parsed.darkMode === "light") {
            setMode("light");
          } else {
            const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            setMode(isDark ? "dark" : "light");
          }
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("bookstore-settings-changed", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("bookstore-settings-changed", handleStorage);
    };
  }, []);

  const theme = getTheme(mode);

  if (!mounted) {
    return null;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemedApp>
        <AuthProvider>
          <BrowserRouter>
            <ToastProvider>
              <App />
            </ToastProvider>
          </BrowserRouter>
        </AuthProvider>
      </ThemedApp>
    </QueryClientProvider>
  </React.StrictMode>
);
