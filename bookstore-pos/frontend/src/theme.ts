import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#0b1e3b" },
    secondary: { main: "#c9a227" },
    background: { default: "#f2f4f8", paper: "#ffffff" },
    text: { primary: "#0b1324", secondary: "#4b5563" },
    divider: "rgba(15, 23, 42, 0.08)",
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: "Manrope, system-ui, -apple-system, Segoe UI, sans-serif",
    h4: { fontWeight: 700, letterSpacing: 0.2 },
    h5: { fontWeight: 700, letterSpacing: 0.2 },
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
          borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: "linear-gradient(180deg, #0b1e3b 0%, #102546 100%)",
          color: "#e6edf7",
          borderRight: "1px solid rgba(255, 255, 255, 0.06)",
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          margin: "4px 8px",
          borderRadius: 12,
          paddingTop: 10,
          paddingBottom: 10,
          "&.Mui-selected, &.Mui-selected:hover": {
            background: "rgba(201, 162, 39, 0.18)",
            color: "#f7e7b7",
          },
          "&:hover": {
            background: "rgba(255, 255, 255, 0.08)",
          },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          minWidth: 36,
          color: "inherit",
        },
      },
    },
    MuiButton: {
      defaultProps: {
        size: "medium",
      },
      styleOverrides: {
        root: {
          minHeight: 40,
          borderRadius: 12,
        },
        contained: {
          boxShadow: "0 10px 20px rgba(11, 30, 59, 0.2)",
        },
        outlined: {
          borderColor: "rgba(11, 30, 59, 0.25)",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          background: "rgba(11, 30, 59, 0.04)",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          color: "#0b1e3b",
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: "1px solid rgba(15, 23, 42, 0.08)",
          borderRadius: 14,
        },
        columnHeaders: {
          background: "rgba(11, 30, 59, 0.04)",
          fontWeight: 700,
        },
      },
    },
  },
});
