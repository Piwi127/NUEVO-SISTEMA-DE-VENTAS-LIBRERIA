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
    description: "Ventas, caja y atencion en mostrador.",
    accent: "#B45309",
    surface: "linear-gradient(180deg, rgba(255,249,241,0.98) 0%, rgba(248,237,220,0.98) 100%)",
  },
  Catalogo: {
    description: "Productos, clientes, precios y promociones.",
    accent: "#1D4E89",
    surface: "linear-gradient(180deg, rgba(246,250,255,0.98) 0%, rgba(235,244,252,0.98) 100%)",
  },
  "Inventario y compras": {
    description: "Stock, recepcion y compras.",
    accent: "#0F766E",
    surface: "linear-gradient(180deg, rgba(241,251,248,0.98) 0%, rgba(229,245,240,0.98) 100%)",
  },
  Reportes: {
    description: "Indicadores y consultas de gestion.",
    accent: "#475569",
    surface: "linear-gradient(180deg, rgba(247,249,252,0.98) 0%, rgba(237,242,248,0.98) 100%)",
  },
  Administracion: {
    description: "Usuarios, permisos y configuracion general.",
    accent: "#6B4C2F",
    surface: "linear-gradient(180deg, rgba(251,248,242,0.98) 0%, rgba(242,236,226,0.98) 100%)",
  },
};

const DEFAULT_SECTION_META: SectionMeta = {
  description: "Opciones del sistema.",
  accent: "#13293D",
  surface: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(247,243,236,0.98) 100%)",
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
      <Box key={section.title} sx={{ display: "grid", gap: 1.1 }}>
        <Box sx={{ px: 0.35 }}>
          <Typography variant="overline" sx={{ color: alpha(meta.accent, 0.85), letterSpacing: 1.2, lineHeight: 1 }}>
            {section.title}
          </Typography>
          <Typography variant="caption" sx={{ display: "block", mt: 0.35, color: "text.secondary" }}>
            {meta.description}
          </Typography>
        </Box>

        <Stack spacing={0.9}>
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
                  borderRadius: 3,
                  border: `1px solid ${selected ? alpha(meta.accent, 0.28) : "rgba(19,41,61,0.08)"}`,
                  bgcolor: selected ? alpha(meta.accent, 0.12) : "rgba(255,255,255,0.9)",
                  boxShadow: selected ? `0 14px 28px ${alpha(meta.accent, 0.16)}` : "0 10px 24px rgba(19,41,61,0.06)",
                  transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
                  "&:hover": {
                    transform: "translateY(-1px)",
                    borderColor: alpha(meta.accent, 0.28),
                    boxShadow: `0 16px 30px ${alpha(meta.accent, 0.16)}`,
                  },
                }}
              >
                <Stack direction="row" spacing={1.1} alignItems="center" sx={{ width: "100%", p: 1.15, minWidth: 0 }}>
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: 2.5,
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                      color: meta.accent,
                      bgcolor: alpha(meta.accent, selected ? 0.18 : 0.1),
                      border: `1px solid ${alpha(meta.accent, 0.12)}`,
                    }}
                  >
                    {item.icon}
                  </Box>

                  <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                    <Typography sx={{ fontWeight: 800, lineHeight: 1.15, color: "text.primary" }}>{item.label}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                      {selected ? "Pantalla actual" : "Abrir modulo"}
                    </Typography>
                  </Box>

                  {selected ? (
                    <Chip
                      label="Aqui"
                      size="small"
                      sx={{
                        flexShrink: 0,
                        bgcolor: alpha(meta.accent, 0.14),
                        color: meta.accent,
                        fontWeight: 800,
                      }}
                    />
                  ) : (
                    <ChevronRightRoundedIcon sx={{ color: alpha(meta.accent, 0.65), flexShrink: 0 }} />
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
        p: { xs: 1.25, md: 1.5 },
        background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(247,242,234,0.98) 100%)",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          borderRadius: 4,
          border: `1px solid ${alpha("#13293D", 0.09)}`,
          background: activeMeta.surface,
          boxShadow: "0 18px 32px rgba(19,41,61,0.08)",
        }}
      >
        <Stack spacing={1.4}>
          <Stack direction="row" spacing={1.2} alignItems="center">
            {logoUrl ? (
              <Box
                component="img"
                src={logoUrl}
                alt="logo"
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: 3,
                  objectFit: "cover",
                  border: `1px solid ${alpha(activeMeta.accent, 0.16)}`,
                  boxShadow: "0 12px 24px rgba(19,41,61,0.12)",
                }}
              />
            ) : (
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: 3,
                  display: "grid",
                  placeItems: "center",
                  color: activeMeta.accent,
                  bgcolor: alpha(activeMeta.accent, 0.12),
                  border: `1px solid ${alpha(activeMeta.accent, 0.14)}`,
                }}
              >
                <StorefrontIcon />
              </Box>
            )}

            <Box sx={{ minWidth: 0 }}>
              <Typography variant="overline" sx={{ color: alpha("#13293D", 0.72), letterSpacing: 1.15, lineHeight: 1 }}>
                Centro de trabajo
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  mt: 0.35,
                  fontWeight: 800,
                  lineHeight: 1.08,
                  fontSize: { xs: "1.05rem", md: "1.15rem" },
                }}
              >
                {projectLabel}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.35 }}>
                Todo esta organizado por areas para que el uso sea mas claro.
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            <Chip label={roleLabel} size="small" sx={{ fontWeight: 800 }} />
            {username ? <Chip label={username} size="small" variant="outlined" sx={{ fontWeight: 700 }} /> : null}
            <Chip
              size="small"
              icon={<CircleIcon sx={{ fontSize: "0.55rem !important" }} />}
              label={healthOk ? "Sistema conectado" : "Sin conexion con API"}
              color={healthOk ? "success" : "error"}
              variant={healthOk ? "outlined" : "filled"}
              sx={{ fontWeight: 700 }}
            />
          </Stack>
        </Stack>
      </Paper>

      <Box sx={{ overflowY: "auto", pr: 0.3, display: "grid", alignContent: "start", gap: 1.75 }}>{filteredSections.map(renderSection)}</Box>

      <Paper
        elevation={0}
        sx={{
          p: 1.35,
          borderRadius: 4,
          border: `1px solid ${alpha(activeMeta.accent, 0.12)}`,
          background: "linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(248,244,237,0.96) 100%)",
        }}
      >
        <Stack spacing={1.25}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              {activeSection?.title || "Area actual"}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
              {activeMeta.description}
            </Typography>
          </Box>
          <Divider />
          <Button
            variant="contained"
            color="primary"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            sx={{ width: "100%", justifyContent: "center", minHeight: 46 }}
          >
            Cerrar sesion
          </Button>
        </Stack>
      </Paper>
    </Box>
  );

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        backgroundImage:
          "radial-gradient(circle at top left, rgba(19,41,61,0.08) 0%, rgba(19,41,61,0) 26%), radial-gradient(circle at top right, rgba(15,118,110,0.08) 0%, rgba(15,118,110,0) 30%), linear-gradient(180deg, #FBF8F2 0%, #F4F0E8 52%, #EDE4D4 100%)",
      }}
    >
      {!useDrawerNavigation ? (
        <>
          <Box
            onMouseEnter={handleDesktopNavOpen}
            sx={{
              position: "fixed",
              top: 0,
              left: 0,
              bottom: 0,
              width: 18,
              zIndex: (currentTheme) => currentTheme.zIndex.drawer + 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Box
              sx={{
                width: 6,
                height: 110,
                borderRadius: 999,
                background: `linear-gradient(180deg, ${alpha(activeMeta.accent, 0.18)} 0%, ${alpha(activeMeta.accent, 0.42)} 100%)`,
                boxShadow: `0 10px 28px ${alpha(activeMeta.accent, 0.18)}`,
              }}
            />
          </Box>

          <Box
            component="aside"
            onMouseEnter={handleDesktopNavOpen}
            onMouseLeave={handleDesktopNavClose}
            sx={{
              position: "fixed",
              top: 0,
              left: 0,
              bottom: 0,
              width: 308,
              zIndex: (currentTheme) => currentTheme.zIndex.drawer + 3,
              transform: desktopNavOpen ? "translateX(0)" : "translateX(-100%)",
              transition: "transform 220ms ease, box-shadow 220ms ease",
              boxShadow: desktopNavOpen ? "0 26px 50px rgba(19,41,61,0.18)" : "none",
              borderRight: `1px solid ${alpha("#13293D", 0.1)}`,
              bgcolor: "rgba(255,255,255,0.82)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              overflow: "hidden",
            }}
          >
            {navigationContent}
          </Box>
        </>
      ) : null}

      <Box sx={{ display: "grid", minHeight: "100vh", gridTemplateColumns: "1fr" }}>
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
              borderBottom: `1px solid ${alpha(activeMeta.accent, 0.16)}`,
              background: "linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(248,243,235,0.96) 100%)",
              boxShadow: "0 12px 28px rgba(19,41,61,0.08)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
            }}
          >
            <Box sx={{ px: { xs: 1.1, sm: 1.5, md: 2.2 }, py: { xs: 1, md: 1.15 } }}>
              <Stack direction="row" spacing={1.1} alignItems="center" justifyContent="space-between">
                <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, flexGrow: 1 }}>
                  {useDrawerNavigation ? (
                    <IconButton
                      color="primary"
                      onClick={() => setMobileNavOpen(true)}
                      aria-label="Abrir menu principal"
                      sx={{
                        border: `1px solid ${alpha(activeMeta.accent, 0.14)}`,
                        bgcolor: alpha(activeMeta.accent, 0.08),
                      }}
                    >
                      <MenuIcon />
                    </IconButton>
                  ) : null}

                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="overline" sx={{ color: alpha(activeMeta.accent, 0.82), letterSpacing: 1.2, lineHeight: 1 }}>
                      {activeSection?.title || "Sistema"}
                    </Typography>
                    <Typography
                      variant="h5"
                      sx={{
                        mt: 0.18,
                        fontWeight: 800,
                        fontSize: { xs: "1.08rem", sm: "1.2rem", md: "1.35rem" },
                        lineHeight: 1.08,
                        color: "text.primary",
                      }}
                    >
                      {activeItem?.label || "Inicio"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35, maxWidth: 820 }}>
                      {activeMeta.description}
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexShrink: 0 }}>
                  {!healthOk ? <Chip label="Sin conexion" size="small" color="error" /> : null}
                  {username ? (
                    <Chip
                      label={username}
                      size="small"
                      sx={{
                        display: { xs: "none", sm: "inline-flex" },
                        fontWeight: 800,
                        bgcolor: alpha("#13293D", 0.08),
                      }}
                    />
                  ) : null}
                  {useDrawerNavigation ? (
                    <IconButton
                      color="primary"
                      onClick={handleLogout}
                      aria-label="Cerrar sesion"
                      sx={{
                        border: `1px solid ${alpha("#13293D", 0.12)}`,
                        bgcolor: "rgba(255,255,255,0.9)",
                      }}
                    >
                      <LogoutIcon />
                    </IconButton>
                  ) : null}
                </Stack>
              </Stack>
            </Box>
          </Paper>

          <Box sx={{ width: "100%", maxWidth: { xl: 1680 }, mx: "auto", p: { xs: 1.1, sm: 1.5, md: 2.2 }, pb: { xs: 2, md: 3 } }}>
            <Box sx={{ display: "grid", gap: { xs: 1.1, md: 1.35 } }}>{children}</Box>
          </Box>
        </Box>
      </Box>

      <Drawer
        anchor="left"
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        PaperProps={{
          sx: {
            width: "min(92vw, 360px)",
            borderRight: `1px solid ${alpha("#13293D", 0.1)}`,
            background: "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(247,242,234,0.98) 100%)",
          },
        }}
      >
        {navigationContent}
      </Drawer>
    </Box>
  );
};
