import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Button,
  ButtonBase,
  Chip,
  Drawer,
  IconButton,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import LogoutIcon from "@mui/icons-material/Logout";
import StorefrontIcon from "@mui/icons-material/Storefront";
import CircleIcon from "@mui/icons-material/Circle";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useSettings } from "@/app/store";
import { getPublicSettings } from "@/modules/admin/api";
import { api } from "@/modules/shared/api";
import { menuSections } from "@/modules/registry";
import type { MenuSection } from "@/modules/shared/registryTypes";

const DESKTOP_NAV_WIDTH = 296;
const EDGE_TRIGGER_WIDTH = 18;

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
  "Operación": {
    description: "Ventas, caja y atención en mostrador.",
    accent: "#1E3A5F",
    surface: "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
  },
  "Catálogo": {
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
  "Administración": {
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
  const closeTimerRef = useRef<number | null>(null);
  const [desktopNavOpen, setDesktopNavOpen] = useState(false);
  const [desktopNavPinned, setDesktopNavPinned] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [healthOk, setHealthOk] = useState(true);

  const { role, username, logout } = useAuth();
  const { projectName, logoUrl, applyPublicSettings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();

  const publicSettingsQuery = useQuery({
    queryKey: ["public-settings"],
    queryFn: getPublicSettings,
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!publicSettingsQuery.data) return;
    applyPublicSettings(publicSettingsQuery.data);
  }, [applyPublicSettings, publicSettingsQuery.data]);

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
    filteredSections.find((section) => section.items.some((item) => matchesPath(location.pathname, item.path))) ||
    filteredSections[0];
  const activeMeta = getSectionMeta(activeSection?.title);
  const projectLabel = projectName || "Sistema";
  const roleLabel = role ? ROLE_LABELS[role] ?? role : "Usuario";

  const clearDesktopCloseTimer = () => {
    if (closeTimerRef.current === null) return;
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  };

  const openDesktopNav = (pinned = false) => {
    if (useDrawerNavigation) return;
    clearDesktopCloseTimer();
    setDesktopNavOpen(true);
    if (pinned) setDesktopNavPinned(true);
  };

  const scheduleDesktopNavClose = () => {
    if (useDrawerNavigation || desktopNavPinned) return;
    clearDesktopCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setDesktopNavOpen(false);
    }, 140);
  };

  const closeDesktopNav = (force = false) => {
    clearDesktopCloseTimer();
    if (force || !desktopNavPinned) {
      setDesktopNavOpen(false);
      setDesktopNavPinned(false);
    }
  };

  useEffect(() => {
    return () => clearDesktopCloseTimer();
  }, []);

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
    setDesktopNavPinned(false);
    clearDesktopCloseTimer();
  }, [location.pathname]);

  useEffect(() => {
    if (!useDrawerNavigation) return;
    setDesktopNavOpen(false);
    setDesktopNavPinned(false);
    clearDesktopCloseTimer();
  }, [useDrawerNavigation]);

  useEffect(() => {
    if (useDrawerNavigation || !desktopNavOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setDesktopNavPinned(false);
      setDesktopNavOpen(false);
      clearDesktopCloseTimer();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [desktopNavOpen, useDrawerNavigation]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleSelectItem = (path: string) => {
    navigate(path);
  };

  const handleDesktopMenuToggle = () => {
    if (useDrawerNavigation) {
      setMobileNavOpen(true);
      return;
    }

    clearDesktopCloseTimer();

    if (desktopNavPinned) {
      setDesktopNavPinned(false);
      setDesktopNavOpen(false);
      return;
    }

    setDesktopNavPinned(true);
    setDesktopNavOpen(true);
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
              fontWeight: 700,
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
                  border: selected ? `1px solid ${alpha(meta.accent, 0.24)}` : "1px solid transparent",
                  bgcolor: selected ? alpha(meta.accent, 0.08) : "transparent",
                  transition: "all 150ms ease",
                  "&:hover": {
                    bgcolor: alpha(meta.accent, 0.06),
                    transform: "translateX(2px)",
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

                  {selected ? (
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: meta.accent,
                        flexShrink: 0,
                      }}
                    />
                  ) : null}
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
          <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0, flexGrow: 1 }}>
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
                    flexShrink: 0,
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
                    flexShrink: 0,
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

            {!useDrawerNavigation ? (
              <IconButton
                size="small"
                onClick={() => closeDesktopNav(true)}
                aria-label="Ocultar menú principal"
                sx={{
                  border: "1px solid #E2E8F0",
                  bgcolor: "#FFFFFF",
                  flexShrink: 0,
                }}
              >
                <CloseRoundedIcon fontSize="small" />
              </IconButton>
            ) : null}
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
      {!useDrawerNavigation ? (
        <Box
          onMouseEnter={() => openDesktopNav(false)}
          aria-hidden="true"
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            bottom: 0,
            width: EDGE_TRIGGER_WIDTH,
            zIndex: (currentTheme) => currentTheme.zIndex.drawer + 1,
            cursor: "pointer",
            "&::after": {
              content: '""',
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              width: 2,
              background: "linear-gradient(180deg, rgba(30,64,175,0) 0%, rgba(30,64,175,0.4) 50%, rgba(30,64,175,0) 100%)",
              opacity: desktopNavOpen ? 0 : 1,
              transition: "opacity 160ms ease",
            },
          }}
        />
      ) : null}

      {!useDrawerNavigation && desktopNavPinned ? (
        <Box
          onClick={() => closeDesktopNav(true)}
          sx={{
            position: "fixed",
            inset: 0,
            bgcolor: "rgba(15, 23, 42, 0.12)",
            backdropFilter: "blur(2px)",
            zIndex: (currentTheme) => currentTheme.zIndex.drawer + 1,
          }}
        />
      ) : null}

      {!useDrawerNavigation ? (
        <Box
          component="aside"
          onMouseEnter={() => openDesktopNav(desktopNavPinned)}
          onMouseLeave={scheduleDesktopNavClose}
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            bottom: 0,
            width: DESKTOP_NAV_WIDTH,
            zIndex: (currentTheme) => currentTheme.zIndex.drawer + 2,
            transform: desktopNavOpen ? "translateX(0)" : "translateX(calc(-100% - 12px))",
            opacity: desktopNavOpen ? 1 : 0,
            transition: "transform 180ms ease, opacity 180ms ease",
            boxShadow: desktopNavOpen ? "var(--shadow-xl)" : "none",
            borderRight: "1px solid #E2E8F0",
            bgcolor: "#FFFFFF",
            overflow: "hidden",
            pointerEvents: desktopNavOpen ? "auto" : "none",
          }}
        >
          {navigationContent}
        </Box>
      ) : null}

      <Box sx={{ minHeight: "100vh" }}>
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
                  <IconButton
                    color="primary"
                    onClick={handleDesktopMenuToggle}
                    aria-label={desktopNavOpen && !useDrawerNavigation ? "Ocultar menú principal" : "Abrir menú principal"}
                    aria-expanded={useDrawerNavigation ? mobileNavOpen : desktopNavOpen}
                    sx={{
                      border: "1px solid #E2E8F0",
                      bgcolor: "#F8FAFC",
                      flexShrink: 0,
                    }}
                  >
                    <MenuIcon />
                  </IconButton>

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
                    <Typography variant="body2" sx={{ mt: 0.25, color: "#64748B" }}>
                      {activeMeta.description}
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
                      aria-label="Cerrar sesión"
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
