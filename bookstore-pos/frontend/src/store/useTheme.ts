import { useMemo } from "react";
import { useSettings } from "./useSettings";
import { ThemeMode, settingsStore } from "./settingsStore";

export const useThemeMode = () => {
  const { darkMode } = useSettings();

  const effectiveMode = useMemo((): "light" | "dark" => {
    if (darkMode === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return darkMode;
  }, [darkMode]);

  const toggleTheme = () => {
    if (darkMode === "light") {
      settingsStore.setDarkMode("dark");
    } else if (darkMode === "dark") {
      settingsStore.setDarkMode("system");
    } else {
      settingsStore.setDarkMode("light");
    }
  };

  const setThemeMode = (mode: ThemeMode) => {
    settingsStore.setDarkMode(mode);
  };

  return {
    mode: effectiveMode,
    darkMode,
    toggleTheme,
    setThemeMode,
    isDark: effectiveMode === "dark",
  };
};
