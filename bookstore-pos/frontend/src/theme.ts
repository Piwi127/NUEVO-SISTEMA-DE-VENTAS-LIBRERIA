import { createTheme, responsiveFontSizes } from "@mui/material/styles";

let theme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1280,
      xl: 1600,
    },
  },
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
    h4: {
      fontWeight: 800,
      letterSpacing: "-0.03em",
      fontSize: "clamp(1.85rem, 1.45rem + 1.2vw, 2.55rem)",
    },
    h5: {
      fontWeight: 800,
      letterSpacing: "-0.02em",
      fontSize: "clamp(1.35rem, 1.1rem + 0.8vw, 1.85rem)",
    },
    h6: {
      fontWeight: 800,
      letterSpacing: "-0.02em",
      fontSize: "clamp(1.05rem, 0.96rem + 0.45vw, 1.3rem)",
    },
    subtitle1: { fontWeight: 600 },
    body1: { lineHeight: 1.6 },
    body2: { lineHeight: 1.6 },
    button: { textTransform: "none", fontWeight: 700, letterSpacing: 0.2 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          height: "100%",
          WebkitTextSizeAdjust: "100%",
        },
        body: {
          minWidth: 320,
          minHeight: "100vh",
          overflowX: "hidden",
        },
        "#root": {
          minHeight: "100vh",
        },
        "img, svg, video, canvas": {
          display: "block",
          maxWidth: "100%",
          height: "auto",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          boxShadow: "0 10px 22px rgba(12, 31, 51, 0.07)",
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
          borderRadius: 9,
          paddingTop: 9,
          paddingBottom: 9,
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
          minHeight: 36,
          borderRadius: 9,
          paddingInline: 12,
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
          minHeight: 36,
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
          minHeight: 36,
          paddingInline: 12,
          fontWeight: 700,
          textTransform: "none",
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          marginTop: 4,
          lineHeight: 1.25,
          fontSize: "0.72rem",
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          padding: "12px 14px 6px",
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: "10px 14px 14px",
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: "10px 14px 14px",
          gap: 8,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          padding: "6px 10px",
          alignItems: "center",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          maxWidth: "100%",
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          width: "calc(100% - 24px)",
          margin: 12,
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
          borderRadius: 9,
          backgroundColor: "rgba(255,255,255,0.9)",
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          overflowX: "auto",
          overflowY: "auto",
          resize: "vertical",
          maxHeight: "72vh",
          minWidth: "100%",
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
          whiteSpace: "nowrap",
          paddingTop: 9,
          paddingBottom: 9,
        },
        body: {
          paddingTop: 8,
          paddingBottom: 8,
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: "1px solid rgba(18, 53, 90, 0.12)",
          borderRadius: 10,
          backgroundColor: "rgba(255,255,255,0.92)",
        },
        columnHeaders: {
          background: "rgba(18, 53, 90, 0.06)",
          fontWeight: 700,
        },
        row: {
          "&:hover": {
            backgroundColor: "rgba(18, 53, 90, 0.035)",
          },
        },
        columnSeparator: {
          color: "rgba(18, 53, 90, 0.22)",
        },
        cell: {
          borderColor: "rgba(18, 53, 90, 0.08)",
        },
      },
    },
  } as any,
});

theme = responsiveFontSizes(theme, { factor: 2.1 });

export { theme };
