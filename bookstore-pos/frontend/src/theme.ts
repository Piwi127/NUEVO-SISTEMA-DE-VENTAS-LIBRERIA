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
    primary: {
      main: "#103a5f",
      dark: "#0a2742",
      light: "#dbe9f7",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#12746b",
      dark: "#0b564f",
      light: "#d7f1ee",
      contrastText: "#ffffff",
    },
    info: { main: "#2b6cb0" },
    success: { main: "#1b7f5b" },
    warning: { main: "#b7791f" },
    error: { main: "#c05666" },
    background: {
      default: "#edf3f8",
      paper: "#f8fbff",
    },
    text: {
      primary: "#13263a",
      secondary: "#617387",
    },
    divider: "rgba(19, 38, 58, 0.12)",
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif",
    h4: {
      fontWeight: 800,
      letterSpacing: "-0.035em",
      fontSize: "clamp(1.9rem, 1.45rem + 1.2vw, 2.55rem)",
    },
    h5: {
      fontWeight: 800,
      letterSpacing: "-0.03em",
      fontSize: "clamp(1.34rem, 1.12rem + 0.82vw, 1.88rem)",
    },
    h6: {
      fontWeight: 800,
      letterSpacing: "-0.02em",
      fontSize: "clamp(1.02rem, 0.95rem + 0.4vw, 1.28rem)",
    },
    subtitle1: { fontWeight: 700 },
    subtitle2: { fontWeight: 700 },
    body1: { lineHeight: 1.58 },
    body2: { lineHeight: 1.5 },
    button: { textTransform: "none", fontWeight: 800, letterSpacing: 0.08 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ":root": {
          "--surface-border": "rgba(19,38,58,0.12)",
          "--surface-highlight": "rgba(255,255,255,0.88)",
          "--surface-shadow": "0 18px 42px rgba(13, 32, 56, 0.08)",
          "--bank-navy": "#103a5f",
          "--bank-teal": "#12746b",
          "--bank-ice": "#edf3f8",
        },
        "*": {
          boxSizing: "border-box",
        },
        html: {
          height: "100%",
          WebkitTextSizeAdjust: "100%",
          backgroundColor: "#edf3f8",
        },
        body: {
          minWidth: 320,
          minHeight: "100vh",
          overflowX: "hidden",
          backgroundColor: "#edf3f8",
          backgroundImage:
            "radial-gradient(circle at top left, rgba(16,58,95,0.08) 0%, rgba(16,58,95,0) 24%), radial-gradient(circle at top right, rgba(18,116,107,0.08) 0%, rgba(18,116,107,0) 28%), linear-gradient(180deg, #f7fbff 0%, #edf3f8 48%, #e5edf6 100%)",
          color: "#13263a",
        },
        "#root": {
          minHeight: "100vh",
        },
        "img, svg, video, canvas": {
          display: "block",
          maxWidth: "100%",
          height: "auto",
        },
        "::selection": {
          backgroundColor: "rgba(43,108,176,0.22)",
          color: "#13263a",
        },
        "*::-webkit-scrollbar": {
          width: 10,
          height: 10,
        },
        "*::-webkit-scrollbar-thumb": {
          backgroundColor: "rgba(16,58,95,0.18)",
          borderRadius: 999,
          border: "2px solid rgba(255,255,255,0.7)",
        },
        "*::-webkit-scrollbar-track": {
          backgroundColor: "rgba(16,58,95,0.04)",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          minWidth: 0,
          borderRadius: 18,
          background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,250,255,0.95) 100%)",
          border: "1px solid rgba(19, 38, 58, 0.08)",
          boxShadow: "0 16px 34px rgba(13, 32, 56, 0.07), 0 2px 6px rgba(13, 32, 56, 0.04)",
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
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
          paddingInline: 16,
          transition: "transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease, border-color 160ms ease",
          "&:hover": {
            transform: "translateY(-1px)",
          },
          "&.Mui-disabled": {
            transform: "none",
          },
        },
        contained: {
          boxShadow: "0 14px 26px rgba(16, 58, 95, 0.16)",
        },
        containedPrimary: {
          background: "linear-gradient(135deg, #103a5f 0%, #174d7d 100%)",
          color: "#ffffff",
        },
        containedSecondary: {
          background: "linear-gradient(135deg, #12746b 0%, #159184 100%)",
          color: "#ffffff",
        },
        outlined: {
          borderColor: "rgba(16, 58, 95, 0.16)",
          background: "rgba(255,255,255,0.84)",
          backdropFilter: "blur(10px)",
          "&:hover": {
            background: "rgba(16, 58, 95, 0.05)",
            borderColor: "rgba(16, 58, 95, 0.28)",
          },
        },
        text: {
          color: "#103a5f",
          "&:hover": {
            background: "rgba(16,58,95,0.06)",
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          maxWidth: "100%",
          minHeight: 42,
          padding: 4,
          borderRadius: 999,
          backgroundColor: "rgba(16,58,95,0.05)",
          border: "1px solid rgba(16,58,95,0.08)",
        },
        indicator: {
          display: "none",
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minWidth: 0,
          minHeight: 34,
          paddingInline: 14,
          borderRadius: 999,
          fontWeight: 800,
          textTransform: "none",
          color: "#617387",
          transition: "background-color 160ms ease, color 160ms ease, box-shadow 160ms ease",
          "&.Mui-selected": {
            color: "#103a5f",
            background: "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(239,246,255,0.96) 100%)",
            boxShadow: "0 8px 18px rgba(13,32,56,0.08)",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 800,
          maxWidth: "100%",
          borderRadius: 999,
          border: "1px solid rgba(16,58,95,0.08)",
          backgroundColor: "rgba(239,246,255,0.86)",
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          width: "calc(100% - 24px)",
          margin: 12,
          borderRadius: 22,
          background: "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(244,249,255,0.97) 100%)",
          boxShadow: "0 24px 60px rgba(13,32,56,0.18)",
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          padding: "16px 18px 8px",
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: "12px 18px 18px",
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: "12px 18px 18px",
          gap: 10,
          flexWrap: "wrap",
          "@media (max-width:599.95px)": {
            "& .MuiButton-root": {
              flex: "1 1 100%",
              width: "100%",
            },
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          padding: "9px 12px",
          alignItems: "center",
          borderRadius: 14,
          border: "1px solid rgba(16,58,95,0.08)",
          backgroundColor: "rgba(255,255,255,0.82)",
          backdropFilter: "blur(10px)",
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          color: "#516274",
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          marginTop: 5,
          lineHeight: 1.3,
          fontSize: "0.72rem",
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
          borderRadius: 14,
          backgroundColor: "rgba(255,255,255,0.92)",
          transition: "box-shadow 160ms ease, background-color 160ms ease, border-color 160ms ease",
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(16,58,95,0.14)",
            transition: "border-color 160ms ease",
          },
          "&:hover": {
            backgroundColor: "#ffffff",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(16,58,95,0.26)",
          },
          "&.Mui-focused": {
            backgroundColor: "#ffffff",
            boxShadow: "0 0 0 4px rgba(43,108,176,0.14)",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(43,108,176,0.7)",
            borderWidth: 1,
          },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: "rgba(16,58,95,0.54)",
          "&.Mui-checked": {
            color: "#103a5f",
          },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          "&.Mui-checked": {
            color: "#ffffff",
            "& + .MuiSwitch-track": {
              backgroundColor: "#12746b",
              opacity: 1,
            },
          },
        },
        track: {
          backgroundColor: "rgba(16,58,95,0.22)",
          opacity: 1,
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 14,
          border: "1px solid rgba(16,58,95,0.08)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(244,249,255,0.96) 100%)",
          boxShadow: "0 18px 36px rgba(13,32,56,0.12)",
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          margin: 4,
          borderRadius: 10,
          minHeight: 36,
          "&.Mui-selected": {
            backgroundColor: "rgba(16,58,95,0.08)",
          },
          "&.Mui-selected:hover": {
            backgroundColor: "rgba(16,58,95,0.12)",
          },
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
          background: "linear-gradient(180deg, rgba(16,58,95,0.08) 0%, rgba(16,58,95,0.04) 100%)",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 800,
          color: "#103a5f",
          whiteSpace: "nowrap",
          paddingTop: 10,
          paddingBottom: 10,
        },
        body: {
          paddingTop: 9,
          paddingBottom: 9,
          overflowWrap: "anywhere",
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          minWidth: 0,
          border: "1px solid rgba(16, 58, 95, 0.12)",
          borderRadius: 16,
          background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(243,248,255,0.94) 100%)",
          boxShadow: "0 16px 32px rgba(13,32,56,0.06)",
        },
        columnHeaders: {
          background: "linear-gradient(180deg, rgba(16,58,95,0.08) 0%, rgba(16,58,95,0.04) 100%)",
          fontWeight: 800,
        },
        row: {
          "&:hover": {
            backgroundColor: "rgba(18,116,107,0.05)",
          },
        },
        columnSeparator: {
          color: "rgba(16, 58, 95, 0.18)",
        },
        cell: {
          borderColor: "rgba(16, 58, 95, 0.08)",
        },
        footerContainer: {
          backgroundColor: "rgba(16,58,95,0.03)",
          borderTopColor: "rgba(16,58,95,0.08)",
        },
      },
    },
  } as any,
});

theme = responsiveFontSizes(theme, { factor: 2.1 });

export { theme };
