export const useThemeMode = () => {
  return {
    mode: "light" as const,
    darkMode: "light" as const,
    toggleTheme: () => {},
    setThemeMode: () => {},
    isDark: false,
  };
};
