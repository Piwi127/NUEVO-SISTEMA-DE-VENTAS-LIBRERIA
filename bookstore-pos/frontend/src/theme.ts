import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#12355a" },
    secondary: { main: "#9a7b2f" },
    success: { main: "#1f7a4d" },
    warning: { main: "#a66a00" },
    background: { default: "#eef2f6", paper: "#ffffff" },
    text: { primary: "#0c1f33", secondary: "#5a6b7f" },
    divider: "rgba(18, 53, 90, 0.12)",
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif",
    h4: { fontWeight: 700, letterSpacing: 0.1 },
    h5: { fontWeight: 700, letterSpacing: 0.1 },
    h6: { fontWeight: 700, letterSpacing: 0.1 },
    subtitle1: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 700, letterSpacing: 0.2 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          boxShadow: "0 10px 24px rgba(12, 31, 51, 0.08)",
          border: "1px solid rgba(18, 53, 90, 0.08)",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: "linear-gradient(135deg, #0c2a4a 0%, #12355a 45%, #1a4675 100%)",
          boxShadow: "0 12px 30px rgba(10, 34, 60, 0.34)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.14)",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: "linear-gradient(180deg, #0d2c4e 0%, #11365f 100%)",
          color: "#f1f5fb",
          borderRight: "1px solid rgba(255, 255, 255, 0.08)",
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          margin: "4px 8px",
          borderRadius: 10,
          paddingTop: 10,
          paddingBottom: 10,
          color: "#f1f5fb",
          "& .MuiListItemIcon-root": {
            color: "rgba(241,245,251,0.82)",
          },
          "&.Mui-selected, &.Mui-selected:hover": {
            background: "rgba(154, 123, 47, 0.22)",
            color: "#fff6dd",
            "& .MuiListItemIcon-root": {
              color: "#fff6dd",
            },
          },
          "&:hover": {
            background: "rgba(255, 255, 255, 0.12)",
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
          borderRadius: 10,
        },
        contained: {
          boxShadow: "0 8px 18px rgba(12, 42, 74, 0.26)",
        },
        outlined: {
          borderColor: "rgba(18, 53, 90, 0.28)",
          background: "rgba(18, 53, 90, 0.05)",
          "&:hover": {
            background: "rgba(18, 53, 90, 0.09)",
          },
        },
        text: {
          color: "#12355a",
          background: "rgba(18, 53, 90, 0.07)",
          "&:hover": {
            background: "rgba(18, 53, 90, 0.12)",
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 40,
        },
        indicator: {
          height: 3,
          borderRadius: 3,
          backgroundColor: "#9a7b2f",
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 40,
          fontWeight: 700,
          textTransform: "none",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 700,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: "small",
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: "rgba(255,255,255,0.9)",
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          background: "rgba(18, 53, 90, 0.05)",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          color: "#12355a",
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: "1px solid rgba(18, 53, 90, 0.12)",
          borderRadius: 12,
        },
        columnHeaders: {
          background: "rgba(18, 53, 90, 0.06)",
          fontWeight: 700,
        },
      },
    },
  } as any,
});
