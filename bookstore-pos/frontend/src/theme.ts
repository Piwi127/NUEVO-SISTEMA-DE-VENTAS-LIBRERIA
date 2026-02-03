import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#0b1e3b" },
    secondary: { main: "#c9a227" },
    background: { default: "#f3f5f8", paper: "#ffffff" },
    text: { primary: "#0b1324", secondary: "#4b5563" },
    divider: "rgba(15, 23, 42, 0.08)",
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: "Manrope, system-ui, -apple-system, Segoe UI, sans-serif",
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700, letterSpacing: 0.2 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: "0 12px 32px rgba(11, 19, 36, 0.08)",
          border: "1px solid rgba(15, 23, 42, 0.06)",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: "linear-gradient(135deg, #0b1e3b 0%, #132d57 60%, #1b3a6d 100%)",
          boxShadow: "0 10px 24px rgba(11, 30, 59, 0.28)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        contained: {
          boxShadow: "0 10px 20px rgba(11, 30, 59, 0.2)",
        },
      },
    },
  },
});
