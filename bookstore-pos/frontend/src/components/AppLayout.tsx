import React, { useEffect, useState } from "react";
import {
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import PushPinIcon from "@mui/icons-material/PushPin";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import StorefrontIcon from "@mui/icons-material/Storefront";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useSettings } from "@/app/store";
import { getPublicSettings } from "@/modules/admin/api";
import { api } from "@/modules/shared/api";
import { menuSections } from "@/modules/registry";

const NAV_WIDTH = 296;
const EDGE_TRIGGER_WIDTH = 24;
const DESKTOP_NAV_PIN_KEY = "bookstore-desktop-nav-pinned";

const formatRole = (role: string | null | undefined) => {
  if (!role) return "Sin rol";

  const labels: Record<string, string> = {
    admin: "Administrador",
    cashier: "Cajero",
    stock: "Inventario",
  };

  return labels[role] ?? role.charAt(0).toUpperCase() + role.slice(1);
};

const matchesPath = (pathname: string, itemPath: string) =>
  pathname === itemPath || pathname.startsWith(`${itemPath}/`);

export const AppLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopNavVisible, setDesktopNavVisible] = useState(false);
  const [desktopNavHovered, setDesktopNavHovered] = useState(false);
  const [desktopNavPinned, setDesktopNavPinned] = useState(() => {
    if (typeof window === "undefined") return false;

    try {
      return window.localStorage.getItem(DESKTOP_NAV_PIN_KEY) === "1";
    } catch {
      return false;
    }
  });
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down("md"));
  const shortViewport = useMediaQuery("(max-height:760px)");
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

  const filteredSections = menuSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => role && item.roles.includes(role)),
    }))
    .filter((section) => section.items.length > 0);

  const activeItem =
    filteredSections
      .flatMap((section) => section.items)
      .filter((item) => matchesPath(location.pathname, item.path))
      .sort((a, b) => b.path.length - a.path.length)[0] || filteredSections[0]?.items[0];
  const projectLabel = projectName || "Sistema";
  const isDesktopNavOpen = !compact && (desktopNavPinned || desktopNavVisible);
  const pinLabel = desktopNavPinned ? "Liberar menu lateral" : "Fijar menu lateral";
  const desktopNavWidth = shortViewport ? 272 : NAV_WIDTH;
  const metaChipSx = {
    bgcolor: "rgba(255,255,255,0.76)",
    color: "text.primary",
    border: "1px solid rgba(18,53,90,0.08)",
  };

  useEffect(() => {
    const load = async () => {
      try {
        const s = await getPublicSettings();
        setProjectName(s.project_name);
        setCurrency(s.currency as any);
        setTaxRate(s.tax_rate);
        setTaxIncluded(s.tax_included);
        setStoreAddress(s.store_address);
        setStorePhone(s.store_phone);
        setStoreTaxId(s.store_tax_id);
        setLogoUrl(s.logo_url);
        setPaymentMethods(s.payment_methods);
        setInvoicePrefix(s.invoice_prefix);
        setInvoiceNext(s.invoice_next);
        setReceiptHeader(s.receipt_header);
        setReceiptFooter(s.receipt_footer);
        setPaperWidthMm(s.paper_width_mm);
        setDefaultWarehouseId(s.default_warehouse_id ?? null);
      } catch {
        // ignore
      }
    };
    load();
  }, [
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
  ]);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        await api.get("/healthz");
        if (mounted) setHealthOk(true);
      } catch {
        if (mounted) setHealthOk(false);
      }
    };
    check();
    const timer = window.setInterval(check, 30000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(DESKTOP_NAV_PIN_KEY, desktopNavPinned ? "1" : "0");
    } catch {
      // ignore storage failures
    }
  }, [desktopNavPinned]);

  useEffect(() => {
    if (compact) {
      setDesktopNavVisible(false);
      setDesktopNavHovered(false);
      return;
    }

    if (desktopNavPinned) {
      setDesktopNavVisible(true);
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (event.clientX <= EDGE_TRIGGER_WIDTH) {
        setDesktopNavVisible(true);
        return;
      }

      if (!desktopNavHovered && event.clientX > desktopNavWidth + EDGE_TRIGGER_WIDTH) {
        setDesktopNavVisible(false);
      }
    };

    const handleWindowBlur = () => {
      if (!desktopNavHovered) {
        setDesktopNavVisible(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [compact, desktopNavHovered, desktopNavPinned, desktopNavWidth]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleToggleDesktopPin = () => {
    setDesktopNavPinned((current) => {
      const next = !current;
      setDesktopNavVisible(next);
      if (!next) {
        setDesktopNavHovered(false);
      }
      return next;
    });
  };

  const navigationContent = (closeAfterNavigate: boolean) => (
    <Box sx={{ display: "grid", gridTemplateRows: "auto 1fr auto", height: "100%" }}>
      <Box sx={{ px: 1, pt: shortViewport ? 0.75 : 1, pb: shortViewport ? 1.5 : 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          {logoUrl ? (
            <Box component="img" src={logoUrl} alt="logo" sx={{ width: shortViewport ? 36 : 40, height: shortViewport ? 36 : 40, borderRadius: 1.5, objectFit: "cover" }} />
          ) : (
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1.5,
                display: "grid",
                placeItems: "center",
                bgcolor: "rgba(255,255,255,0.12)",
                color: "#fff6dd",
              }}
            >
              <StorefrontIcon fontSize="small" />
            </Box>
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="overline" sx={{ color: "rgba(241,245,251,0.7)", letterSpacing: 1 }}>
              Operacion activa
            </Typography>
            <Typography variant="subtitle1" sx={{ color: "#f8fbff", fontWeight: 800 }} noWrap>
              {projectLabel}
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Box sx={{ overflowY: "auto", pb: 2 }}>
        {filteredSections.map((section) => (
          <Box key={section.title} sx={{ pb: 1.25 }}>
            <Typography
              variant="caption"
              sx={{
                px: 2,
                pb: 0.75,
                display: "block",
                color: "rgba(241,245,251,0.62)",
                letterSpacing: 0.9,
                textTransform: "uppercase",
              }}
            >
              {section.title}
            </Typography>
            <List disablePadding>
              {section.items.map((item) => (
                <ListItemButton
                  key={item.path}
                  component={RouterLink}
                  to={item.path}
                  selected={activeItem?.path === item.path}
                  onClick={() => {
                    if (closeAfterNavigate) setMobileOpen(false);
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14, fontWeight: 700 }} />
                </ListItemButton>
              ))}
            </List>
            <Divider sx={{ borderColor: "rgba(255,255,255,0.1)", mx: 2, mt: 1.25 }} />
          </Box>
        ))}
      </Box>

      <Box sx={{ px: 1, pb: 1 }}>
        <Paper
          sx={{
            p: 1.5,
            bgcolor: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "none",
          }}
        >
          <Typography variant="body2" sx={{ color: "#f8fbff", fontWeight: 700 }}>
            {username || "Usuario"}
          </Typography>
          <Typography variant="caption" sx={{ color: "rgba(241,245,251,0.74)" }}>
            Perfil: {formatRole(role)}
          </Typography>
        </Paper>
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        bgcolor: "background.default",
        backgroundImage:
          "radial-gradient(circle at top left, rgba(18,53,90,0.08) 0%, rgba(18,53,90,0) 28%), linear-gradient(180deg, #f5f7fa 0%, #eef2f6 100%)",
      }}
    >
      <Box
        onMouseEnter={() => setDesktopNavVisible(true)}
        sx={{
          display: { xs: "none", md: desktopNavPinned ? "none" : "block" },
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: EDGE_TRIGGER_WIDTH,
          zIndex: (theme) => theme.zIndex.drawer + 1,
          pointerEvents: isDesktopNavOpen ? "none" : "auto",
          opacity: isDesktopNavOpen ? 0 : 1,
          transition: "opacity 160ms ease",
          background: "linear-gradient(90deg, rgba(18,53,90,0.14) 0%, rgba(18,53,90,0) 100%)",
          "&::after": {
            content: '""',
            position: "absolute",
            top: "50%",
            left: 6,
            width: 3,
            height: 44,
            borderRadius: 999,
            background: "rgba(18,53,90,0.2)",
            transform: "translateY(-50%)",
          },
        }}
      />

      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: "none", md: "block" },
          width: isDesktopNavOpen ? desktopNavWidth : 0,
          flexShrink: 0,
          overflow: "visible",
          transition: "width 180ms ease",
          "& .MuiDrawer-paper": {
            width: desktopNavWidth,
            boxSizing: "border-box",
            p: 1.5,
            overflowX: "hidden",
            transform: isDesktopNavOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 180ms ease",
            pointerEvents: isDesktopNavOpen ? "auto" : "none",
          },
        }}
      >
        <Box
          sx={{ height: "100%" }}
          onMouseEnter={() => {
            setDesktopNavHovered(true);
            setDesktopNavVisible(true);
          }}
          onMouseLeave={(event) => {
            setDesktopNavHovered(false);
            if (!desktopNavPinned && event.clientX > EDGE_TRIGGER_WIDTH) {
              setDesktopNavVisible(false);
            }
          }}
        >
          {navigationContent(false)}
        </Box>
      </Drawer>

      <Drawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: "min(86vw, 320px)",
            boxSizing: "border-box",
            p: 1.5,
          },
        }}
      >
        {navigationContent(true)}
      </Drawer>

      <Box sx={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <Paper
          component="header"
          elevation={0}
          sx={{
            position: "sticky",
            top: 0,
            zIndex: (theme) => theme.zIndex.appBar,
            borderRadius: 0,
            borderLeft: 0,
            borderRight: 0,
            borderTop: 0,
            bgcolor: "rgba(250,252,253,0.84)",
            borderBottom: "1px solid rgba(18,53,90,0.08)",
            boxShadow: "0 8px 28px rgba(12,31,51,0.04)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          <Toolbar
            sx={{
              minHeight: { xs: 60, sm: 64, md: shortViewport ? 64 : 68 },
              px: { xs: 1, sm: 1.5, md: 2.5 },
              py: { xs: 0.75, sm: 0 },
              gap: { xs: 0.75, sm: 1 },
              alignItems: "center",
              flexWrap: { xs: "wrap", sm: "nowrap" },
            }}
          >
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ flexGrow: 1, minWidth: 0, width: { xs: "100%", sm: "auto" } }}>
              {compact ? (
                <IconButton color="primary" onClick={() => setMobileOpen(true)} aria-label="Abrir navegacion">
                  <MenuIcon />
                </IconButton>
              ) : null}
              <Typography variant="h6" sx={{ color: "text.primary", fontWeight: 800, fontSize: { xs: "1.02rem", sm: "1.1rem", md: "1.2rem" } }} noWrap>
                {projectLabel}
              </Typography>
              {!compact ? (
                <Tooltip title={pinLabel}>
                  <IconButton
                    color="primary"
                    onClick={handleToggleDesktopPin}
                    aria-label={pinLabel}
                    sx={{
                      border: "1px solid rgba(18,53,90,0.08)",
                      bgcolor: desktopNavPinned ? "rgba(18,53,90,0.1)" : "rgba(255,255,255,0.72)",
                    }}
                  >
                    {desktopNavPinned ? <PushPinIcon fontSize="small" /> : <PushPinOutlinedIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
              ) : null}
            </Stack>

            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ justifyContent: "flex-end", alignItems: "center", width: { xs: "100%", sm: "auto" } }}>
              <Chip
                label={username ?? "Usuario"}
                size="small"
                sx={{
                  ...metaChipSx,
                  display: { xs: "none", sm: "inline-flex" },
                }}
              />
              {!healthOk ? <Chip label="API offline" size="small" color="error" /> : null}
              <Tooltip title="Cerrar sesion">
                <IconButton color="primary" onClick={handleLogout} aria-label="Cerrar sesion" sx={{ border: "1px solid rgba(18,53,90,0.08)", bgcolor: "rgba(255,255,255,0.72)" }}>
                  <LogoutIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Toolbar>
        </Paper>

        <Box sx={{ width: "100%", maxWidth: { xl: 1680 }, mx: "auto", p: { xs: 1, sm: 1.5, md: 2.25 }, pb: { xs: 1.5, sm: 2, md: 3 }, display: "grid" }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};









