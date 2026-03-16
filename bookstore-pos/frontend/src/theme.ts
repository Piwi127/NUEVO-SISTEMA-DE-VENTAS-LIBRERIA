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

// Esquema de color diferenciado para la aplicación
const colors = {
  // Colores primarios
  primary: {
    main: "#1E40AF", // Azul más vibrante para mayor contraste
    dark: "#1E3A8A",
    light: "#3B82F6",
    lighter: "#60A5FA",
    lightest: "#DBEAFE",
    contrastText: "#FFFFFF",
  },
  // Colores secundarios/accent
  secondary: {
    main: "#059669", // Verde esmeralda
    dark: "#047857",
    light: "#10B981",
    lighter: "#34D399",
    lightest: "#D1FAE5",
    contrastText: "#FFFFFF",
  },
  // Colores neutros para backgrounds
  neutral: {
    50: "#F8FAFC", // Fondo principal
    100: "#F1F5F9", // Fondo secundario
    200: "#E2E8F0", // Bordes sutiles
    300: "#CBD5E1", // Bordes
    400: "#94A3B8", // Texto secundario
    500: "#64748B", // Texto placeholder
    600: "#475569", // Texto secundario
    700: "#334155", // Texto body
    800: "#1E293B", // Texto headings
    900: "#0F172A", // Texto principal
  },
  // Colores semánticos
  success: {
    main: "#059669",
    light: "#10B981",
    lightest: "#D1FAE5",
    dark: "#047857",
  },
  warning: {
    main: "#D97706",
    light: "#F59E0B",
    lightest: "#FEF3C7",
    dark: "#B45309",
  },
  error: {
    main: "#DC2626",
    light: "#EF4444",
    lightest: "#FEE2E2",
    dark: "#B91C1C",
  },
  info: {
    main: "#2563EB",
    light: "#3B82F6",
    lightest: "#DBEAFE",
    dark: "#1D4ED8",
  },
};

let theme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
    },
  },
  palette: {
    mode: "light",
    primary: {
      main: colors.primary.main,
      dark: colors.primary.dark,
      light: colors.primary.light,
      contrastText: colors.primary.contrastText,
    },
    secondary: {
      main: colors.secondary.main,
      dark: colors.secondary.dark,
      light: colors.secondary.light,
      contrastText: colors.secondary.contrastText,
    },
    info: { main: colors.info.main },
    success: { main: colors.success.main },
    warning: { main: colors.warning.main },
    error: { main: colors.error.main },
    background: {
      default: colors.neutral[50],
      paper: "#FFFFFF",
    },
    text: {
      primary: colors.neutral[900],
      secondary: colors.neutral[600],
    },
    divider: colors.neutral[200],
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    h1: {
      fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
      fontWeight: 700,
      letterSpacing: "-0.025em",
      fontSize: "2.25rem",
      lineHeight: 1.2,
    },
    h2: {
      fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
      fontWeight: 700,
      letterSpacing: "-0.02em",
      fontSize: "1.75rem",
      lineHeight: 1.3,
    },
    h3: {
      fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
      fontWeight: 600,
      letterSpacing: "-0.015em",
      fontSize: "1.375rem",
      lineHeight: 1.35,
    },
    h4: {
      fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
      fontWeight: 600,
      letterSpacing: "-0.01em",
      fontSize: "1.125rem",
      lineHeight: 1.4,
    },
    h5: {
      fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
      fontWeight: 600,
      fontSize: "1rem",
      lineHeight: 1.4,
    },
    h6: {
      fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
      fontWeight: 600,
      fontSize: "0.875rem",
      lineHeight: 1.4,
    },
    subtitle1: { fontWeight: 500, fontSize: "1rem", lineHeight: 1.5 },
    subtitle2: { fontWeight: 500, fontSize: "0.875rem", lineHeight: 1.5 },
    body1: { lineHeight: 1.6, fontSize: "0.9375rem" },
    body2: { lineHeight: 1.5, fontSize: "0.8125rem" },
    button: { textTransform: "none", fontWeight: 600, letterSpacing: "0.01em", fontSize: "0.875rem" },
    overline: { letterSpacing: "0.08em", fontWeight: 600, fontSize: "0.6875rem" },
    caption: { fontWeight: 500, fontSize: "0.75rem", lineHeight: 1.4 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ":root": {
          "--color-primary-50": colors.primary.lightest,
          "--color-primary-100": "#BFDBFE",
          "--color-primary-200": "#93C5FD",
          "--color-primary-300": colors.primary.lighter,
          "--color-primary-400": colors.primary.light,
          "--color-primary-500": colors.primary.main,
          "--color-primary-600": "#1D4ED8",
          "--color-primary-700": colors.primary.dark,
          "--color-primary-800": "#1E3A5F",
          "--color-primary-900": "#0F172A",
          "--color-primary-light": colors.primary.main,

          "--color-secondary-50": colors.secondary.lightest,
          "--color-secondary-100": "#A7F3D0",
          "--color-secondary-200": "#6EE7B7",
          "--color-secondary-300": colors.secondary.lighter,
          "--color-secondary-400": colors.secondary.light,
          "--color-secondary-500": colors.secondary.main,
          "--color-secondary-600": colors.secondary.dark,
          "--color-secondary-700": "#065F46",
          "--color-secondary-800": "#064E3B",
          "--color-secondary-900": "#022C22",

          "--color-neutral-0": "#FFFFFF",
          "--color-neutral-50": colors.neutral[50],
          "--color-neutral-100": colors.neutral[100],
          "--color-neutral-200": colors.neutral[200],
          "--color-neutral-300": colors.neutral[300],
          "--color-neutral-400": colors.neutral[400],
          "--color-neutral-500": colors.neutral[500],
          "--color-neutral-600": colors.neutral[600],
          "--color-neutral-700": colors.neutral[700],
          "--color-neutral-800": colors.neutral[800],
          "--color-neutral-900": colors.neutral[900],

          "--color-success": colors.success.main,
          "--color-success-light": colors.success.lightest,
          "--color-success-dark": colors.success.dark,
          "--color-warning": colors.warning.main,
          "--color-warning-light": colors.warning.lightest,
          "--color-warning-dark": colors.warning.dark,
          "--color-error": colors.error.main,
          "--color-error-light": colors.error.lightest,
          "--color-error-dark": colors.error.dark,
          "--color-info": colors.info.main,
          "--color-info-light": colors.info.lightest,
          "--color-info-dark": colors.info.dark,

          "--bg-app": colors.neutral[100],
          "--bg-primary": colors.neutral[50],
          "--bg-secondary": colors.neutral[100],
          "--bg-surface": "#FFFFFF",
          "--bg-surface-glass": "rgba(255, 255, 255, 0.72)",
          "--bg-elevated": "#FFFFFF",

          "--text-primary": colors.neutral[900],
          "--text-secondary": colors.neutral[600],
          "--text-tertiary": colors.neutral[500],

          "--border-subtle": colors.neutral[200],
          "--border-default": colors.neutral[300],
          "--border-focus": colors.primary.main,

          "--shadow-xs": "0 1px 2px rgba(0, 0, 0, 0.05)",
          "--shadow-sm": "0 2px 4px rgba(0, 0, 0, 0.06)",
          "--shadow-md": "0 4px 12px rgba(0, 0, 0, 0.08)",
          "--shadow-lg": "0 8px 24px rgba(0, 0, 0, 0.12)",
          "--shadow-xl": "0 16px 48px rgba(0, 0, 0, 0.16)",

          "--space-1": "4px",
          "--space-2": "8px",
          "--space-3": "12px",
          "--space-4": "16px",
          "--space-5": "20px",
          "--space-6": "24px",
          "--space-8": "32px",
          "--space-10": "40px",
          "--space-12": "48px",
          "--space-16": "64px",

          "--radius-sm": "6px",
          "--radius-md": "10px",
          "--radius-lg": "14px",
          "--radius-xl": "20px",
          "--radius-full": "9999px",

          "--transition-fast": "150ms cubic-bezier(0.4, 0, 0.2, 1)",
          "--transition-smooth": "300ms cubic-bezier(0.4, 0, 0.2, 1)",
          "--transition-bounce": "500ms cubic-bezier(0.34, 1.56, 0.64, 1)",

          "--font-primary": "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          "--font-display": "'Plus Jakarta Sans', 'Inter', sans-serif",
        },
        "*": {
          boxSizing: "border-box",
        },
        html: {
          height: "100%",
          fontSize: "15px",
          WebkitTextSizeAdjust: "100%",
          backgroundColor: "#F8FAFC",
        },
        body: {
          minWidth: 320,
          minHeight: "100vh",
          overflowX: "hidden",
          backgroundColor: "#F8FAFC",
          backgroundImage: "linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)",
          color: "#1E293B",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
          backgroundColor: "rgba(30, 58, 95, 0.2)",
          color: "#1E293B",
        },
        "a, button": {
          cursor: "pointer",
        },
        "input, button, textarea, select": {
          font: "inherit",
        },
        "button": {
          backgroundColor: "transparent",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          minWidth: 0,
          borderRadius: 20,
          background: "#FFFFFF",
          backgroundImage: "none",
          border: "1px solid #CBD5E1",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.06)",
          transition: "all var(--transition-smooth)",
          position: "relative",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "1px",
            background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.8) 50%, transparent 100%)",
          },
        },
        elevation1: {
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
        },
        elevation2: {
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
        },
        elevation3: {
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          border: "1px solid #CBD5E1",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
          transition: "all var(--transition-smooth)",
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "1px",
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
          },
          "&:hover": {
            boxShadow: "0 12px 40px rgba(0, 0, 0, 0.15)",
            transform: "translateY(-4px)",
            borderColor: "#94A3B8",
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          transition: "all var(--transition-smooth)",
          border: "1px solid transparent",
          position: "relative",
          "&::after": {
            content: '""',
            position: "absolute",
            inset: -2,
            borderRadius: 16,
            opacity: 0,
            background: "radial-gradient(circle, rgba(37, 99, 235, 0.15) 0%, transparent 70%)",
            transition: "opacity 0.3s ease",
          },
          "&:hover": {
            backgroundColor: "rgba(37, 99, 235, 0.1)",
            borderColor: "rgba(37, 99, 235, 0.2)",
            transform: "scale(1.1)",
            "&::after": {
              opacity: 1,
            },
          },
          "&:active": {
            transform: "scale(0.95)",
          },
        },
      },
    },
    MuiButton: {
      defaultProps: {
        size: "medium",
        disableElevation: false,
      },
      styleOverrides: {
        root: {
          minHeight: 44,
          borderRadius: 12,
          paddingInline: 24,
          paddingTop: 10,
          paddingBottom: 10,
          fontWeight: 600,
          letterSpacing: "0.01em",
          transition: "all var(--transition-smooth)",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.12)",
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: "-100%",
            width: "100%",
            height: "100%",
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
            transition: "left 0.5s ease",
          },
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: "0 8px 25px rgba(0, 0, 0, 0.18)",
            "&::before": {
              left: "100%",
            },
          },
          "&:active": {
            transform: "translateY(0)",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          },
        },
        sizeLarge: {
          minHeight: 52,
          borderRadius: 14,
          fontSize: "1rem",
          paddingInline: 32,
        },
        sizeSmall: {
          minHeight: 36,
          borderRadius: 10,
          fontSize: "0.8125rem",
        },
        containedPrimary: {
          background: "linear-gradient(135deg, #1E40AF 0%, #2563EB 50%, #3B82F6 100%)",
          backgroundSize: "200% 200%",
          color: "#FFFFFF",
          boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
          "&:hover": {
            background: "linear-gradient(135deg, #2563EB 0%, #3B82F6 50%, #60A5FA 100%)",
            boxShadow: "0 8px 25px rgba(37, 99, 235, 0.45)",
          },
        },
        containedSecondary: {
          background: "linear-gradient(135deg, #0D9488 0%, #14B8A6 50%, #2DD4BF 100%)",
          backgroundSize: "200% 200%",
          color: "#FFFFFF",
          boxShadow: "0 4px 14px rgba(13, 148, 136, 0.35)",
          "&:hover": {
            background: "linear-gradient(135deg, #14B8A6 0%, #2DD4BF 50%, #5EEAD4 100%)",
            boxShadow: "0 8px 25px rgba(13, 148, 136, 0.45)",
          },
        },
        containedSuccess: {
          background: "linear-gradient(135deg, #059669 0%, #10B981 50%, #34D399 100%)",
          backgroundSize: "200% 200%",
          color: "#FFFFFF",
          boxShadow: "0 4px 14px rgba(5, 150, 105, 0.35)",
          "&:hover": {
            background: "linear-gradient(135deg, #10B981 0%, #34D399 50%, #6EE7B7 100%)",
            boxShadow: "0 8px 25px rgba(5, 150, 105, 0.45)",
          },
        },
        containedError: {
          background: "linear-gradient(135deg, #DC2626 0%, #EF4444 50%, #F87171 100%)",
          backgroundSize: "200% 200%",
          color: "#FFFFFF",
          boxShadow: "0 4px 14px rgba(220, 38, 38, 0.35)",
          "&:hover": {
            background: "linear-gradient(135deg, #EF4444 0%, #F87171 50%, #FCA5A5 100%)",
            boxShadow: "0 8px 25px rgba(220, 38, 38, 0.45)",
          },
        },
        containedWarning: {
          background: "linear-gradient(135deg, #D97706 0%, #F59E0B 50%, #FBBF24 100%)",
          backgroundSize: "200% 200%",
          color: "#FFFFFF",
          boxShadow: "0 4px 14px rgba(217, 119, 6, 0.35)",
          "&:hover": {
            background: "linear-gradient(135deg, #F59E0B 0%, #FBBF24 50%, #FCD34D 100%)",
            boxShadow: "0 8px 25px rgba(217, 119, 6, 0.45)",
          },
        },
        outlined: {
          borderWidth: 2,
          borderColor: "#CBD5E1",
          color: "#1E293B",
          "&:hover": {
            backgroundColor: "#EFF6FF",
            borderColor: "#2563EB",
            transform: "translateY(-1px)",
            boxShadow: "0 4px 12px rgba(37, 99, 235, 0.15)",
          },
        },
        outlinedPrimary: {
          borderColor: "#1E3A5F",
          color: "#1E3A5F",
          "&:hover": {
            backgroundColor: "rgba(30, 58, 95, 0.08)",
            borderColor: "#1E3A5F",
          },
        },
        text: {
          color: "#1E293B",
          "&:hover": {
            backgroundColor: "#F1F5F9",
          },
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          boxShadow: "var(--shadow-md)",
          transition: "all var(--transition-fast)",
          "&:hover": {
            boxShadow: "var(--shadow-lg)",
            transform: "translateY(-2px)",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          minHeight: 28,
          fontWeight: 500,
          maxWidth: "100%",
          borderRadius: 8,
          fontSize: "0.8125rem",
          border: "1px solid #CBD5E1",
          backgroundColor: "#F8FAFC",
          transition: "all var(--transition-fast)",
          "&:hover": {
            backgroundColor: "#F1F5F9",
          },
        },
        filled: {
          backgroundColor: "#F1F5F9",
          "&:hover": {
            backgroundColor: "#E2E8F0",
          },
        },
        outlined: {
          borderColor: "#CBD5E1",
          "&:hover": {
            backgroundColor: "#F8FAFC",
          },
        },
        clickable: {
          "&:hover": {
            backgroundColor: "#EFF6FF",
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          width: "calc(100% - 32px)",
          margin: 16,
          borderRadius: 20,
          background: "#FFFFFF",
          backgroundImage: "none",
          boxShadow: "var(--shadow-xl)",
          border: "1px solid #E2E8F0",
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          padding: "20px 24px 12px",
          fontSize: "1.25rem",
          fontWeight: 600,
          color: "#1E293B",
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: "12px 24px 20px",
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: "12px 24px 20px",
          gap: 12,
          flexWrap: "wrap",
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          padding: "12px 16px",
          alignItems: "center",
          borderRadius: 12,
          border: "1px solid",
        },
        standardInfo: {
          backgroundColor: "#EFF6FF",
          borderColor: "#BFDBFE",
          color: "#1E40AF",
          "& .MuiAlert-icon": {
            color: "#2563EB",
          },
        },
        standardSuccess: {
          backgroundColor: "#ECFDF5",
          borderColor: "#A7F3D0",
          color: "#065F46",
          "& .MuiAlert-icon": {
            color: "#059669",
          },
        },
        standardError: {
          backgroundColor: "#FEF2F2",
          borderColor: "#FECACA",
          color: "#991B1B",
          "& .MuiAlert-icon": {
            color: "#EF4444",
          },
        },
        standardWarning: {
          backgroundColor: "#FFFBEB",
          borderColor: "#FDE68A",
          color: "#92400E",
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: "medium",
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          minHeight: 52,
          borderRadius: 14,
          backgroundColor: "#FFFFFF",
          transition: "all var(--transition-smooth)",
          border: "1px solid #CBD5E1",
          position: "relative",
          "&::before": {
            content: '""',
            position: "absolute",
            inset: -1,
            borderRadius: 15,
            background: "linear-gradient(135deg, #2563EB, #14B8A6)",
            opacity: 0,
            transition: "opacity 0.3s ease",
            zIndex: -1,
          },
          "& .MuiInputBase-input": {
            fontSize: "0.9375rem",
            paddingTop: 14,
            paddingBottom: 14,
            fontWeight: 500,
          },
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "transparent",
            transition: "all var(--transition-smooth)",
          },
          "&:hover": {
            borderColor: "#94A3B8",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "transparent",
          },
          "&.Mui-focused": {
            borderColor: "#2563EB",
            boxShadow: "0 0 0 4px rgba(37, 99, 235, 0.15), 0 4px 20px rgba(37, 99, 235, 0.15)",
            "&::before": {
              opacity: 0,
            },
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "transparent",
            borderWidth: 0,
          },
          "&.Mui-error": {
            borderColor: "#EF4444",
            "&.Mui-focused": {
              boxShadow: "0 0 0 4px rgba(239, 68, 68, 0.15), 0 4px 20px rgba(239, 68, 68, 0.15)",
            },
            "&:hover": {
              borderColor: "#DC2626",
            },
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          color: "#64748B",
          fontSize: "0.875rem",
          "&.Mui-focused": {
            color: "#2563EB",
          },
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          color: "#64748B",
          fontSize: "0.875rem",
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          marginTop: 6,
          lineHeight: 1.4,
          fontSize: "0.75rem",
          "&.Mui-error": {
            color: "#EF4444",
          },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: "#94A3B8",
          "&.Mui-checked": {
            color: "#2563EB",
          },
          "&:hover": {
            backgroundColor: "rgba(37, 99, 235, 0.08)",
          },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          width: 44,
          height: 26,
          padding: 0,
        },
        switchBase: {
          padding: 2,
          "&.Mui-checked": {
            color: "#FFFFFF",
            "& + .MuiSwitch-track": {
              backgroundColor: "#2563EB",
              opacity: 1,
            },
          },
        },
        thumb: {
          width: 22,
          height: 22,
        },
        track: {
          backgroundColor: "#CBD5E1",
          opacity: 1,
          borderRadius: 13,
        },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        popper: {
          "& .MuiPaper-root": {
            borderRadius: 12,
            border: "1px solid #E2E8F0",
            boxShadow: "var(--shadow-lg)",
          },
        },
        listbox: {
          padding: "6px",
          "& .MuiAutocomplete-option": {
            borderRadius: 8,
            padding: "8px 12px",
            margin: "2px 0",
            "&:hover": {
              backgroundColor: "#F1F5F9",
            },
            "&[aria-selected=true]": {
              backgroundColor: "#EFF6FF",
              "&:hover": {
                backgroundColor: "#DBEAFE",
              },
            },
          },
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          border: "1px solid #E2E8F0",
          background: "#FFFFFF",
          backgroundImage: "none",
          boxShadow: "var(--shadow-lg)",
          marginTop: 4,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          margin: "2px 6px",
          borderRadius: 8,
          minHeight: 40,
          padding: "8px 12px",
          fontSize: "0.875rem",
          "&.Mui-selected": {
            backgroundColor: "#EFF6FF",
            "&:hover": {
              backgroundColor: "#DBEAFE",
            },
          },
          "&:hover": {
            backgroundColor: "#F8FAFC",
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          margin: "2px 8px",
          "&.Mui-selected": {
            backgroundColor: "#EFF6FF",
            "&:hover": {
              backgroundColor: "#DBEAFE",
            },
          },
          "&:hover": {
            backgroundColor: "#F8FAFC",
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 44,
        },
        indicator: {
          height: 3,
          borderRadius: "3px 3px 0 0",
          backgroundColor: "#1E3A5F",
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minWidth: 0,
          minHeight: 44,
          paddingInline: 20,
          fontWeight: 600,
          textTransform: "none",
          fontSize: "0.9375rem",
          color: "#64748B",
          transition: "all var(--transition-fast)",
          "&.Mui-selected": {
            color: "#1E3A5F",
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
          borderRadius: 16,
          border: "1px solid #E2E8F0",
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          background: "#F8FAFC",
          borderBottom: "2px solid #E2E8F0",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          color: "#1E293B",
          whiteSpace: "nowrap",
          fontSize: "0.8125rem",
          paddingTop: 14,
          paddingBottom: 14,
          backgroundColor: "#F8FAFC",
        },
        body: {
          fontSize: "0.875rem",
          paddingTop: 12,
          paddingBottom: 12,
          color: "#334155",
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: "background-color var(--transition-fast)",
          "&:hover": {
            backgroundColor: "#F8FAFC",
          },
          "&:nth-of-type(even)": {
            backgroundColor: "#FAFBFC",
          },
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          minWidth: 0,
          border: "1px solid #E2E8F0",
          borderRadius: 16,
          background: "#FFFFFF",
          boxShadow: "var(--shadow-sm)",
          "& .MuiDataGrid-columnHeaders": {
            background: "#F8FAFC",
            fontWeight: 600,
            color: "#1E293B",
            borderBottom: "2px solid #E2E8F0",
          },
          "& .MuiDataGrid-row": {
            "&:hover": {
              backgroundColor: "#F8FAFC",
            },
            "&:nth-of-type(even)": {
              backgroundColor: "#FAFBFC",
            },
          },
          "& .MuiDataGrid-columnSeparator": {
            color: "#E2E8F0",
          },
          "& .MuiDataGrid-cell": {
            borderColor: "#F1F5F9",
          },
          "& .MuiDataGrid-footerContainer": {
            backgroundColor: "#F8FAFC",
            borderTopColor: "#E2E8F0",
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: "#1E293B",
          fontSize: "0.75rem",
          padding: "8px 12px",
          borderRadius: 8,
        },
        arrow: {
          color: "#1E293B",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "#FFFFFF",
          borderRight: "1px solid #E2E8F0",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#FFFFFF",
          color: "#1E293B",
          boxShadow: "var(--shadow-sm)",
          borderBottom: "1px solid #E2E8F0",
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height: 8,
          borderRadius: 4,
          backgroundColor: "#E2E8F0",
        },
        bar: {
          borderRadius: 4,
        },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: {
          backgroundColor: "#E2E8F0",
        },
      },
    },
    MuiBadge: {
      styleOverrides: {
        badge: {
          fontWeight: 600,
          fontSize: "0.6875rem",
        },
      },
    },
    MuiBreadcrumbs: {
      styleOverrides: {
        root: {
          fontSize: "0.875rem",
          "& .MuiBreadcrumbs-separator": {
            color: "#CBD5E1",
          },
        },
        li: {
          "& .MuiTypography-root": {
            color: "#64748B",
          },
          "&:last-child .MuiTypography-root": {
            color: "#1E293B",
          },
        },
      },
    },
  },
});

theme = responsiveFontSizes(theme, { factor: 2 });

export { theme };
