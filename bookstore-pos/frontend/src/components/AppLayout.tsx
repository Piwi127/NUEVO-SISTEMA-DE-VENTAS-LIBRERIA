import React, { useEffect, useState } from "react";
import {
  Box,
  Breadcrumbs,
  Chip,
  Divider,
  Drawer,
  IconButton,
  Link,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Tab,
  Tabs,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import StorefrontIcon from "@mui/icons-material/Storefront";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useSettings } from "@/app/store";
import { getPublicSettings } from "@/modules/admin/api";
import { api } from "@/modules/shared/api";
import { menuSections } from "@/modules/registry";

const NAV_WIDTH = 296;

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
  const compact = useMediaQuery("(max-width:900px)");
  const [healthOk, setHealthOk] = useState(true);
  const { role, username, logout } = useAuth();
  const {
    projectName,
    logoUrl,
    compactMode,
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

  const activeSection =
    filteredSections.find((section) => section.items.some((item) => matchesPath(location.pathname, item.path))) ||
    filteredSections[0];
  const activeItem =
    activeSection?.items
      .filter((item) => matchesPath(location.pathname, item.path))
      .sort((a, b) => b.path.length - a.path.length)[0] || activeSection?.items[0];
  const homePath = filteredSections[0]?.items[0]?.path || "/";
  const activeTab = activeItem?.path || false;
  const currentSectionPath = activeSection?.items[0]?.path || homePath;
  const projectLabel = projectName || "Sistema";
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

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navigationContent = (closeAfterNavigate: boolean) => (
    <Box sx={{ display: "grid", gridTemplateRows: "auto 1fr auto", height: "100%" }}>
      <Box sx={{ px: 1, pt: 1, pb: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          {logoUrl ? (
            <Box component="img" src={logoUrl} alt="logo" sx={{ width: 40, height: 40, borderRadius: 1.5, objectFit: "cover" }} />
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
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: "none", md: "block" },
          width: NAV_WIDTH,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: NAV_WIDTH,
            boxSizing: "border-box",
            p: 1.5,
          },
        }}
      >
        {navigationContent(false)}
      </Drawer>

      <Drawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: 286,
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
              minHeight: { xs: 72, md: 76 },
              px: { xs: 2, md: 3 },
              gap: 1.25,
              alignItems: "center",
              flexWrap: { xs: "wrap", md: "nowrap" },
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexGrow: 1, minWidth: 0 }}>
              {compact ? (
                <IconButton color="primary" onClick={() => setMobileOpen(true)} aria-label="Abrir navegacion">
                  <MenuIcon />
                </IconButton>
              ) : null}
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" sx={{ display: "block", color: "text.secondary", letterSpacing: 1.2, textTransform: "uppercase", mb: 0.35 }}>
                  Proyecto
                </Typography>
                <Typography variant="h6" sx={{ color: "text.primary", fontWeight: 800 }} noWrap>
                  {projectLabel}
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ justifyContent: "flex-end" }}>
              <Tooltip title="Fecha local">
                <Chip
                  icon={<CalendarMonthIcon sx={{ color: "inherit !important" }} />}
                  label={new Date().toLocaleDateString("es-PE")}
                  size="small"
                  sx={metaChipSx}
                />
              </Tooltip>
              <Chip label={username ?? "Usuario"} size="small" sx={metaChipSx} />
              <Chip label={formatRole(role)} size="small" sx={metaChipSx} />
              {!healthOk ? <Chip label="API offline" size="small" color="error" /> : null}
              {compactMode ? <Chip label="Compacta" size="small" sx={metaChipSx} /> : null}
              <Tooltip title="Cerrar sesion">
                <IconButton color="primary" onClick={handleLogout} aria-label="Cerrar sesion" sx={{ border: "1px solid rgba(18,53,90,0.08)", bgcolor: "rgba(255,255,255,0.72)" }}>
                  <LogoutIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Toolbar>
        </Paper>

        <Box sx={{ p: { xs: 1.5, md: 2.25 }, display: "grid", gap: 1.5 }}>
          <Paper
            sx={{
              p: { xs: 1.35, md: 1.5 },
              background: "rgba(255,255,255,0.72)",
              border: "1px solid rgba(18,53,90,0.08)",
              boxShadow: "0 10px 22px rgba(12,31,51,0.04)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
            }}
          >
            <Stack spacing={1.15}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "flex-start" }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" sx={{ display: "block", color: "text.secondary", letterSpacing: 1.1, textTransform: "uppercase", mb: 0.45 }}>
                    Navegacion del modulo
                  </Typography>
                  <Breadcrumbs
                    separator={<NavigateNextIcon fontSize="small" sx={{ color: "text.disabled" }} />}
                    aria-label="breadcrumb"
                    sx={{
                      "& .MuiBreadcrumbs-ol": { flexWrap: "wrap", rowGap: 0.5 },
                      "& .MuiBreadcrumbs-li": { alignItems: "center" },
                    }}
                  >
                    <Link component={RouterLink} to={homePath} underline="hover" color="inherit" sx={{ fontWeight: 600 }}>
                      Panel
                    </Link>
                    {activeSection ? (
                      <Link component={RouterLink} to={currentSectionPath} underline="hover" color="inherit" sx={{ fontWeight: 600 }}>
                        {activeSection.title}
                      </Link>
                    ) : null}
                    <Typography color="text.primary" sx={{ fontWeight: 700 }}>
                      {activeItem?.label || projectLabel}
                    </Typography>
                  </Breadcrumbs>
                </Box>

                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ justifyContent: { xs: "flex-start", md: "flex-end" } }}>
                  {activeSection ? (
                    <Chip
                      size="small"
                      label={`Area ${activeSection.title}`}
                      sx={{ bgcolor: "rgba(18,53,90,0.05)", color: "text.primary", border: "1px solid rgba(18,53,90,0.08)" }}
                    />
                  ) : null}
                  <Chip
                    size="small"
                    label={activeItem?.label || projectLabel}
                    sx={{ bgcolor: "rgba(255,255,255,0.7)", color: "text.secondary", border: "1px solid rgba(18,53,90,0.08)" }}
                  />
                </Stack>
              </Stack>

              {activeSection && activeSection.items.length > 1 ? (
                <Tabs
                  value={activeTab}
                  variant="scrollable"
                  allowScrollButtonsMobile
                  sx={{
                    minHeight: "auto",
                    "& .MuiTabs-indicator": { display: "none" },
                    "& .MuiTabs-flexContainer": { gap: 0.75 },
                  }}
                >
                  {activeSection.items.map((item) => {
                    const selected = activeItem?.path === item.path;

                    return (
                      <Tab
                        key={item.path}
                        value={item.path}
                        component={RouterLink}
                        to={item.path}
                        icon={React.isValidElement(item.icon) ? item.icon : undefined}
                        iconPosition={React.isValidElement(item.icon) ? "start" : undefined}
                        label={item.label}
                        sx={{
                          minHeight: 36,
                          px: 1.5,
                          py: 0.6,
                          borderRadius: 999,
                          minWidth: 0,
                          color: selected ? "primary.main" : "text.secondary",
                          bgcolor: selected ? "rgba(18,53,90,0.08)" : "transparent",
                          border: selected ? "1px solid rgba(18,53,90,0.12)" : "1px solid rgba(18,53,90,0.06)",
                          boxShadow: selected ? "0 8px 18px rgba(12,31,51,0.05)" : "none",
                          "& .MuiTab-iconWrapper": {
                            mr: 0.75,
                            mb: "0 !important",
                            "& .MuiSvgIcon-root": { fontSize: 18 },
                          },
                        }}
                      />
                    );
                  })}
                </Tabs>
              ) : null}
            </Stack>
          </Paper>

          {children}
        </Box>
      </Box>
    </Box>
  );
};
