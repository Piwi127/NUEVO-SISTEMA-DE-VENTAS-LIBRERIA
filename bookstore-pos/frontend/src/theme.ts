import { createTheme, responsiveFontSizes } from "@mui/material/styles";

// Declaracion de tipos para MuiDataGrid
declare module "@mui/material/styles" {
  interface Components {
    MuiDataGrid?: {
      styleOverrides?: {
        root?: any;
        columnHeaders?: any;
        row?: any;
        columnSeparator?: any;
        cell?: any;
        footerContainer?: any;
      };
    };
  }
}

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
      main: "#13293D",
      dark: "#0D1F2F",
      light: "#254B67",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#0F766E",
      dark: "#0B5E58",
      light: "#1F9D94",
      contrastText: "#ffffff",
    },
    info: { main: "#2563EB" },
    success: { main: "#16A34A" },
    warning: { main: "#D97706" },
    error: { main: "#DC2626" },
    background: {
      default: "#F4F0E8",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#13293D",
      secondary: "#4B5F73",
    },
    divider: "rgba(19, 41, 61, 0.12)",
  },
  shape: { borderRadius: 20 },
  typography: {
    fontFamily: "var(--font-ui), 'Segoe UI', sans-serif",
    h1: {
      fontFamily: "var(--font-display), var(--font-ui), sans-serif",
      fontWeight: 700,
      letterSpacing: "-0.04em",
      fontSize: "clamp(2.1rem, 1.9rem + 1.2vw, 3rem)",
    },
    h2: {
      fontFamily: "var(--font-display), var(--font-ui), sans-serif",
      fontWeight: 700,
      letterSpacing: "-0.035em",
      fontSize: "clamp(1.8rem, 1.6rem + 0.95vw, 2.55rem)",
    },
    h3: {
      fontFamily: "var(--font-display), var(--font-ui), sans-serif",
      fontWeight: 700,
      letterSpacing: "-0.03em",
      fontSize: "clamp(1.55rem, 1.38rem + 0.78vw, 2.1rem)",
    },
    h4: {
      fontFamily: "var(--font-display), var(--font-ui), sans-serif",
      fontWeight: 700,
      letterSpacing: "-0.03em",
      fontSize: "clamp(1.48rem, 1.2rem + 0.84vw, 2.02rem)",
    },
    h5: {
      fontFamily: "var(--font-display), var(--font-ui), sans-serif",
      fontWeight: 700,
      letterSpacing: "-0.02em",
      fontSize: "1.22rem",
    },
    h6: {
      fontFamily: "var(--font-display), var(--font-ui), sans-serif",
      fontWeight: 700,
      letterSpacing: "-0.02em",
      fontSize: "1.06rem",
    },
    subtitle1: { fontWeight: 700, fontSize: "0.96rem" },
    subtitle2: { fontWeight: 700, fontSize: "0.9rem" },
    body1: { lineHeight: 1.62, fontSize: "0.95rem" },
    body2: { lineHeight: 1.56, fontSize: "0.9rem" },
    button: { textTransform: "none", fontWeight: 800, letterSpacing: "0.01em", fontSize: "0.9rem" },
    overline: { letterSpacing: "0.1em", fontWeight: 700, fontSize: "0.72rem" },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ":root": {
          "--surface-border": "rgba(19, 41, 61, 0.12)",
          "--surface-highlight": "rgba(255,255,255,0.84)",
          "--surface-shadow": "0 14px 34px rgba(19, 41, 61, 0.1)",
          "--ui-primary": "#13293D",
          "--ui-accent": "#0F766E",
          "--ui-bg": "#F4F0E8",
        },
        "*": {
          boxSizing: "border-box",
        },
        html: {
          height: "100%",
          fontSize: "15px",
          WebkitTextSizeAdjust: "100%",
          backgroundColor: "#F4F0E8",
        },
        body: {
          minWidth: 320,
          minHeight: "100vh",
          overflowX: "hidden",
          backgroundColor: "#F4F0E8",
          backgroundImage:
            "radial-gradient(circle at top left, rgba(19,41,61,0.08) 0%, rgba(19,41,61,0) 28%), radial-gradient(circle at top right, rgba(15,118,110,0.1) 0%, rgba(15,118,110,0) 34%), linear-gradient(180deg, #FBF8F2 0%, #F4F0E8 52%, #EDE4D4 100%)",
          color: "#13293D",
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
          backgroundColor: "rgba(15, 118, 110, 0.24)",
          color: "#13293D",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          minWidth: 0,
          borderRadius: 18,
          background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,247,241,0.96) 100%)",
          border: "1px solid rgba(19, 41, 61, 0.08)",
          boxShadow: "var(--shadow-sm)",
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
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          minHeight: 42,
          borderRadius: 13,
          paddingInline: 16,
          transition: "transform 140ms ease, box-shadow 140ms ease, background-color 140ms ease, border-color 140ms ease",
          "&:hover": {
            transform: "translateY(-1px)",
          },
          "&.Mui-disabled": {
            transform: "none",
          },
        },
        containedPrimary: {
          background: "linear-gradient(135deg, #13293D 0%, #1F3D57 100%)",
          color: "#ffffff",
          boxShadow: "0 10px 20px rgba(19, 41, 61, 0.24)",
          "&:hover": {
            boxShadow: "0 14px 26px rgba(19, 41, 61, 0.28)",
          },
        },
        containedSecondary: {
          background: "linear-gradient(135deg, #0F766E 0%, #0B5E58 100%)",
          color: "#ffffff",
          boxShadow: "0 10px 20px rgba(15, 118, 110, 0.24)",
          "&:hover": {
            boxShadow: "0 14px 26px rgba(15, 118, 110, 0.28)",
          },
        },
        outlined: {
          borderColor: "rgba(19, 41, 61, 0.22)",
          background: "var(--bg-surface-glass)",
          backdropFilter: "blur(10px)",
          "&:hover": {
            background: "rgba(19, 41, 61, 0.04)",
            borderColor: "rgba(19, 41, 61, 0.34)",
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          maxWidth: "100%",
          minHeight: 40,
          padding: 4,
          borderRadius: 12,
          backgroundColor: "rgba(19, 41, 61, 0.05)",
          border: "1px solid rgba(19, 41, 61, 0.08)",
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
          minHeight: 32,
          paddingInline: 14,
          borderRadius: 8,
          fontWeight: 700,
          textTransform: "none",
          fontSize: "0.88rem",
          color: "#5B6D7F",
          transition: "background-color 140ms ease, color 140ms ease, box-shadow 140ms ease",
          "&.Mui-selected": {
            color: "#13293D",
            backgroundColor: "#FFFFFF",
            boxShadow: "0 4px 10px rgba(19, 41, 61, 0.1)",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          minHeight: 26,
          fontWeight: 700,
          maxWidth: "100%",
          borderRadius: 10,
          fontSize: "0.8rem",
          border: "1px solid rgba(19, 41, 61, 0.1)",
          backgroundColor: "rgba(19, 41, 61, 0.04)",
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          width: "calc(100% - 24px)",
          margin: 12,
          borderRadius: 20,
          background: "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(249,246,240,0.98) 100%)",
          boxShadow: "var(--shadow-lg)",
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
          border: "1px solid rgba(19, 41, 61, 0.1)",
          backgroundColor: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(10px)",
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          color: "#415668",
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          marginTop: 6,
          lineHeight: 1.4,
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
          minHeight: 44,
          borderRadius: 13,
          backgroundColor: "#FFFFFF",
          transition: "box-shadow 140ms ease, background-color 140ms ease, border-color 140ms ease",
          "& .MuiInputBase-input": {
            fontSize: "0.92rem",
            paddingTop: 10,
            paddingBottom: 10,
          },
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(19, 41, 61, 0.18)",
            transition: "border-color 140ms ease",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(19, 41, 61, 0.28)",
          },
          "&.Mui-focused": {
            boxShadow: "0 0 0 3px rgba(15, 118, 110, 0.18)",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#0F766E",
            borderWidth: 1,
          },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: "rgba(19, 41, 61, 0.56)",
          "&.Mui-checked": {
            color: "#13293D",
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
              backgroundColor: "#0F766E",
              opacity: 1,
            },
          },
        },
        track: {
          backgroundColor: "rgba(19, 41, 61, 0.26)",
          opacity: 1,
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 14,
          border: "1px solid rgba(19, 41, 61, 0.1)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(248,243,235,0.96) 100%)",
          boxShadow: "0 18px 36px rgba(19, 41, 61, 0.14)",
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
            backgroundColor: "rgba(19, 41, 61, 0.08)",
          },
          "&.Mui-selected:hover": {
            backgroundColor: "rgba(19, 41, 61, 0.12)",
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
          background: "#F8F4EC",
          borderBottom: "1px solid rgba(19, 41, 61, 0.12)",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          color: "#13293D",
          whiteSpace: "nowrap",
          fontSize: "0.84rem",
          paddingTop: 10,
          paddingBottom: 10,
        },
        body: {
          fontSize: "0.88rem",
          paddingTop: 8,
          paddingBottom: 8,
          color: "#324B61",
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          minWidth: 0,
          border: "1px solid rgba(19, 41, 61, 0.12)",
          borderRadius: 14,
          background: "#FFFFFF",
          boxShadow: "0 8px 18px rgba(19, 41, 61, 0.08)",
        },
        columnHeaders: {
          background: "#F8F4EC",
          fontWeight: 700,
          color: "#13293D",
          borderBottom: "1px solid rgba(19, 41, 61, 0.12)",
        },
        row: {
          "&:hover": {
            backgroundColor: "#F6F1E8",
          },
        },
        columnSeparator: {
          color: "rgba(19, 41, 61, 0.12)",
        },
        cell: {
          borderColor: "rgba(19, 41, 61, 0.08)",
        },
        footerContainer: {
          backgroundColor: "#F8F4EC",
          borderTopColor: "rgba(19, 41, 61, 0.12)",
        },
      },
    },
  },
});

theme = responsiveFontSizes(theme, { factor: 2 });

export { theme };
