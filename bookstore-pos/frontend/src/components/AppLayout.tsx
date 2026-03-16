import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  ButtonBase,
  Chip,
  Divider,
  Drawer,
  IconButton,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import StorefrontIcon from "@mui/icons-material/Storefront";
import CircleIcon from "@mui/icons-material/Circle";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useSettings } from "@/app/store";
import { getPublicSettings } from "@/modules/admin/api";
import { api } from "@/modules/shared/api";
import { menuSections } from "@/modules/registry";
import type { MenuSection } from "@/modules/shared/registryTypes";

const matchesPath = (pathname: string, itemPath: string) => pathname === itemPath || pathname.startsWith(`${itemPath}/`);

type SectionMeta = {
  description: string;
  accent: string;
  surface: string;
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  cashier: "Caja",
  stock: "Inventario",
};

const SECTION_META: Record<string, SectionMeta> = {
  Operacion: {
    description: "Ventas, caja y atención en mostrador.",
    accent: "#1E3A5F",
    surface: "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
  },
  Catalogo: {
    description: "Productos, clientes, precios y promociones.",
    accent: "#0D9488",
    surface: "linear-gradient(180deg, #FFFFFF 0%, #F0FDFA 100%)",
  },
  "Inventario y compras": {
    description: "Stock, recepción y compras.",
    accent: "#6366F1",
    surface: "linear-gradient(180deg, #FFFFFF 0%, #EEF2FF 100%)",
  },
  Reportes: {
    description: "Indicadores y consultas de gestión.",
    accent: "#F59E0B",
    surface: "linear-gradient(180deg, #FFFFFF 0%, #FFFBEB 100%)",
  },
  Administracion: {
    description: "Usuarios, permisos y configuración general.",
    accent: "#EC4899",
    surface: "linear-gradient(180deg, #FFFFFF 0%, #FDF2F8 100%)",
  },
};

const DEFAULT_SECTION_META: SectionMeta = {
  description: "Opciones del sistema.",
  accent: "#1E3A5F",
  surface: "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
};

const getSectionMeta = (title?: string) => (title ? SECTION_META[title] ?? DEFAULT_SECTION_META : DEFAULT_SECTION_META);

export const AppLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const theme = useTheme();
  const useDrawerNavigation = useMediaQuery(theme.breakpoints.down("lg"));
  const [desktopNavOpen, setDesktopNavOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [healthOk, setHealthOk] = useState(true);

  const { role, username, logout } = useAuth();
  const {
    projectName,
    logoUrl,
    setProjectName,
    setCurrency,
    setTaxRate,
    setTaxIncluded,
    setStoreAddress,
    setStorePhone,
    setStoreTaxId,
    setLogoUrl,
    setPaymentMethods,
    setInvoicePrefix,
    setInvoiceNext,
    setReceiptHeader,
    setReceiptFooter,
    setPaperWidthMm,
    setDefaultWarehouseId,
  } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();

  const filteredSections = useMemo(
    () =>
      menuSections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => role && item.roles.includes(role)),
        }))
        .filter((section) => section.items.length > 0),
    [role]
  );

  const flatItems = useMemo(() => filteredSections.flatMap((section) => section.items), [filteredSections]);
  const activeItem =
    flatItems.filter((item) => matchesPath(location.pathname, item.path)).sort((a, b) => b.path.length - a.path.length)[0] ||
    flatItems[0];
  const activeSection =
    filteredSections.find((section) => section.items.some((item) => item.path === activeItem?.path)) || filteredSections[0];
  const activeMeta = getSectionMeta(activeSection?.title);
  const projectLabel = projectName || "Sistema";
  const roleLabel = role ? ROLE_LABELS[role] ?? role : "Usuario";

  useEffect(() => {
    const load = async () => {
      try {
        const settings = await getPublicSettings();
        setProjectName(settings.project_name);
        setCurrency(settings.currency as any);
        setTaxRate(settings.tax_rate);
        setTaxIncluded(settings.tax_included);
        setStoreAddress(settings.store_address);
        setStorePhone(settings.store_phone);
        setStoreTaxId(settings.store_tax_id);
        setLogoUrl(settings.logo_url);
        setPaymentMethods(settings.payment_methods);
        setInvoicePrefix(settings.invoice_prefix);
        setInvoiceNext(settings.invoice_next);
        setReceiptHeader(settings.receipt_header);
        setReceiptFooter(settings.receipt_footer);
        setPaperWidthMm(settings.paper_width_mm);
        setDefaultWarehouseId(settings.default_warehouse_id ?? null);
      } catch {
        // ignore
      }
    };

    load();
  }, [
    setCurrency,
    setDefaultWarehouseId,
    setInvoiceNext,
    setInvoicePrefix,
    setLogoUrl,
    setPaperWidthMm,
    setPaymentMethods,
    setProjectName,
    setReceiptFooter,
    setReceiptHeader,
    setStoreAddress,
    setStorePhone,
    setStoreTaxId,
    setTaxIncluded,
    setTaxRate,
  ]);

  useEffect(() => {
    let mounted = true;

    const checkHealth = async () => {
      try {
        await api.get("/healthz");
        if (mounted) setHealthOk(true);
      } catch {
        if (mounted) setHealthOk(false);
      }
    };

    checkHealth();
    const timer = window.setInterval(checkHealth, 30000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
    setDesktopNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (useDrawerNavigation) {
      setDesktopNavOpen(false);
    }
  }, [useDrawerNavigation]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleSelectItem = (path: string) => {
    navigate(path);
  };

  const handleDesktopNavOpen = () => {
    if (!useDrawerNavigation) {
      setDesktopNavOpen(true);
    }
  };

  const handleDesktopNavClose = () => {
    if (!useDrawerNavigation) {
      setDesktopNavOpen(false);
    }
  };

  const renderSection = (section: MenuSection) => {
    const meta = getSectionMeta(section.title);
    return (
      <Box key={section.title} sx={{ display: "grid", gap: 1.5 }}>
        <Box sx={{ px: 0.5 }}>
          <Typography 
            variant="overline" 
            sx={{ 
              color: meta.accent, 
              letterSpacing: 1.5, 
              lineHeight: 1,
              fontWeight: 600,
            }}
          >
            {section.title}
          </Typography>
        </Box>

        <Stack spacing={0.75}>
          {section.items.map((item) => {
            const selected = activeItem?.path === item.path;
            return (
              <ButtonBase
                key={item.path}
                onClick={() => handleSelectItem(item.path)}
                sx={{
                  width: "100%",
                  textAlign: "left",
                  justifyContent: "flex-start",
                  borderRadius: 2.5,
                  border: selected ? `1px solid ${alpha(meta.accent, 0.3)}` : "1px solid transparent",
                  bgcolor: selected ? alpha(meta.accent, 0.08) : "transparent",
                  transition: "all 150ms ease",
                  "&:hover": {
                    bgcolor: alpha(meta.accent, 0.06),
                    transform: "translateX(4px)",
                  },
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: "100%", px: 1.5, py: 1.25, minWidth: 0 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                      color: selected ? meta.accent : "#64748B",
                      bgcolor: selected ? alpha(meta.accent, 0.12) : "#F1F5F9",
                      transition: "all 150ms ease",
                    }}
                  >
                    {item.icon}
                  </Box>

                  <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                    <Typography 
                      sx={{ 
                        fontWeight: selected ? 700 : 500, 
                        lineHeight: 1.2, 
                        color: selected ? "#1E293B" : "#475569",
                        fontSize: "0.9375rem",
                      }}
                    >
                      {item.label}
                    </Typography>
                  </Box>

                  {selected && (
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: meta.accent,
                        flexShrink: 0,
                      }}
                    />
                  )}
                </Stack>
              </ButtonBase>
            );
          })}
        </Stack>
      </Box>
    );
  };

  const navigationContent = (
    <Box
      sx={{
        display: "grid",
        height: "100%",
        gridTemplateRows: "auto 1fr auto",
        gap: 2,
        p: { xs: 1.5, md: 2 },
        background: "#FFFFFF",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 3,
          border: "1px solid #E2E8F0",
          background: activeMeta.surface,
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            {logoUrl ? (
              <Box
                component="img"
                src={logoUrl}
                alt="logo"
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  objectFit: "cover",
                  border: "1px solid #E2E8F0",
                }}
              />
            ) : (
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  display: "grid",
                  placeItems: "center",
                  color: activeMeta.accent,
                  bgcolor: alpha(activeMeta.accent, 0.1),
                }}
              >
                <StorefrontIcon />
              </Box>
            )}

            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 700,
                  lineHeight: 1.2,
                  color: "#1E293B",
                  fontSize: "1rem",
                }}
              >
                {projectLabel}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                Sistema de gestión
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            <Chip 
              label={roleLabel} 
              size="small" 
              sx={{ 
                fontWeight: 600,
                bgcolor: alpha(activeMeta.accent, 0.1),
                color: activeMeta.accent,
              }} 
            />
            {username ? <Chip label={username} size="small" variant="outlined" sx={{ fontWeight: 500 }} /> : null}
            <Chip
              size="small"
              icon={<CircleIcon sx={{ fontSize: "0.5rem !important" }} />}
              label={healthOk ? "En línea" : "Sin conexión"}
              color={healthOk ? "success" : "error"}
              variant={healthOk ? "outlined" : "filled"}
              sx={{ fontWeight: 500 }}
            />
          </Stack>
        </Stack>
      </Paper>

      <Box sx={{ overflowY: "auto", pr: 0.5, display: "grid", alignContent: "start", gap: 2.5 }}>
        {filteredSections.map(renderSection)}
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          borderRadius: 3,
          border: "1px solid #E2E8F0",
          background: "#F8FAFC",
        }}
      >
        <Button
          variant="outlined"
          color="primary"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          sx={{ width: "100%", justifyContent: "flex-start", minHeight: 44 }}
        >
          Cerrar sesión
        </Button>
      </Paper>
    </Box>
  );

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        backgroundImage: "linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)",
      }}
    >
      {/* Trigger zone - aparece cuando el usuario pasa el mouse por el borde izquierdo */}
      {!useDrawerNavigation && (
        <Box
          onMouseEnter={handleDesktopNavOpen}
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            bottom: 0,
            width: 20,
            zIndex: (currentTheme) => currentTheme.zIndex.drawer + 1,
            cursor: "pointer",
            "&:hover": {
              width: 30,
            },
          }}
        />
      )}

      {/* Desktop Sidebar - Aparece al pasar el mouse por el borde */}
      {!useDrawerNavigation && (
        <Box
          component="aside"
          onMouseEnter={handleDesktopNavOpen}
          onMouseLeave={handleDesktopNavClose}
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            bottom: 0,
            width: 280,
            zIndex: (currentTheme) => currentTheme.zIndex.drawer + 3,
            transform: desktopNavOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 200ms ease",
            boxShadow: desktopNavOpen ? "var(--shadow-xl)" : "none",
            borderRight: "1px solid #E2E8F0",
            bgcolor: "#FFFFFF",
            overflow: "hidden",
          }}
        >
          {navigationContent}
        </Box>
      )}

      {/* Main Content */}
      <Box 
        sx={{ 
          minHeight: "100vh",
          ml: { xs: 0, lg: desktopNavOpen ? "280px" : 0 },
          transition: "margin-left 200ms ease",
        }}
      >
        <Box sx={{ minWidth: 0, display: "grid", gridTemplateRows: "auto 1fr" }}>
          <Paper
            component="header"
            elevation={0}
            sx={{
              position: "sticky",
              top: 0,
              zIndex: (currentTheme) => currentTheme.zIndex.appBar,
              borderRadius: 0,
              borderLeft: 0,
              borderRight: 0,
              borderTop: 0,
              borderBottom: "1px solid #E2E8F0",
              background: "#FFFFFF",
              boxShadow: "none",
            }}
          >
            <Box sx={{ px: { xs: 1.5, sm: 2, md: 3 }, py: { xs: 1.5, md: 1.5 } }}>
              <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0, flexGrow: 1 }}>
                  {useDrawerNavigation ? (
                    <IconButton
                      color="primary"
                      onClick={() => setMobileNavOpen(true)}
                      aria-label="Abrir menu principal"
                      sx={{
                        border: "1px solid #E2E8F0",
                        bgcolor: "#F8FAFC",
                      }}
                    >
                      <MenuIcon />
                    </IconButton>
                  ) : null}

                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="overline" sx={{ color: "#64748B", letterSpacing: 1.2, lineHeight: 1 }}>
                      {activeSection?.title || "Sistema"}
                    </Typography>
                    <Typography
                      variant="h5"
                      sx={{
                        mt: 0.25,
                        fontWeight: 700,
                        fontSize: { xs: "1.1rem", sm: "1.25rem", md: "1.375rem" },
                        lineHeight: 1.2,
                        color: "#1E293B",
                      }}
                    >
                      {activeItem?.label || "Inicio"}
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                  {!healthOk ? <Chip label="Sin conexión" size="small" color="error" /> : null}
                  {username ? (
                    <Chip
                      label={username}
                      size="small"
                      sx={{
                        display: { xs: "none", sm: "inline-flex" },
                        fontWeight: 600,
                        bgcolor: "#F1F5F9",
                      }}
                    />
                  ) : null}
                  {useDrawerNavigation ? (
                    <IconButton
                      color="primary"
                      onClick={handleLogout}
                      aria-label="Cerrar sesion"
                      sx={{
                        border: "1px solid #E2E8F0",
                        bgcolor: "#F8FAFC",
                      }}
                    >
                      <LogoutIcon />
                    </IconButton>
                  ) : null}
                </Stack>
              </Stack>
            </Box>
          </Paper>

          <Box sx={{ width: "100%", maxWidth: { xl: 1600 }, mx: "auto", p: { xs: 1.5, sm: 2, md: 3 }, pb: { xs: 3, md: 4 } }}>
            <Box sx={{ display: "grid", gap: { xs: 1.5, md: 2 } }}>{children}</Box>
          </Box>
        </Box>
      </Box>

      <Drawer
        anchor="left"
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        PaperProps={{
          sx: {
            width: "min(92vw, 320px)",
            borderRight: "1px solid #E2E8F0",
            background: "#FFFFFF",
          },
        }}
      >
        {navigationContent}
      </Drawer>
    </Box>
  );
};
