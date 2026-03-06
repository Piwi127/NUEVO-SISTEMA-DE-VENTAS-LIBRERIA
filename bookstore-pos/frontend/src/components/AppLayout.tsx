import React, { useEffect, useState } from "react";
import {
  Box,
  Breadcrumbs,
  Chip,
  Divider,
  Drawer,
  IconButton,
<<<<<<< HEAD
  Link,
=======
>>>>>>> 9bb128ac (nuevos cambios)
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
<<<<<<< HEAD
  Paper,
  Stack,
  Tab,
  Tabs,
  Toolbar,
=======
  Stack,
>>>>>>> 9bb128ac (nuevos cambios)
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
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

<<<<<<< HEAD
const NAV_WIDTH = 296;

const getRoleLabel = (role: string | null | undefined) => {
  if (role === "admin") return "Administrador";
  if (role === "cashier") return "Caja";
  if (role === "stock") return "Inventario";
  return "Sin rol";
};

=======
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

>>>>>>> 9bb128ac (nuevos cambios)
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

<<<<<<< HEAD
  let activeSection = filteredSections[0];
  let activeItem = activeSection?.items[0];

  filteredSections.forEach((section) => {
    section.items.forEach((item) => {
      if (location.pathname.startsWith(item.path)) {
        if (!activeItem || item.path.length > activeItem.path.length) {
          activeSection = section;
          activeItem = item;
        }
      }
    });
  });

  const homePath = filteredSections[0]?.items[0]?.path || "/";
  const activeTab = activeItem?.path || false;
  const currentSectionPath = activeSection?.items[0]?.path || homePath;
=======
  const activeSection =
    filteredSections.find((section) => section.items.some((item) => matchesPath(location.pathname, item.path))) ||
    filteredSections[0];
  const activeItem =
    activeSection?.items
      .filter((item) => matchesPath(location.pathname, item.path))
      .sort((a, b) => b.path.length - a.path.length)[0] || activeSection?.items[0];
>>>>>>> 9bb128ac (nuevos cambios)

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

<<<<<<< HEAD
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
              {projectName}
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
=======
  const navigation = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        px: 1.5,
        py: 1.5,
        color: "white",
      }}
    >
      <Box
        sx={{
          p: 2.25,
          borderRadius: 3,
          background: "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)",
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(16px)",
        }}
      >
        <Typography
          variant="caption"
          sx={{ display: "block", color: "rgba(241,245,251,0.7)", letterSpacing: 1.2, textTransform: "uppercase", mb: 0.8 }}
        >
          Panel principal
        </Typography>
        <Stack direction="row" spacing={1.25} alignItems="center">
          {logoUrl ? (
            <Box
              component="img"
              src={logoUrl}
              alt="logo"
              sx={{ width: 38, height: 38, borderRadius: 2, objectFit: "cover", bgcolor: "rgba(255,255,255,0.1)" }}
            />
          ) : null}
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
              {projectName}
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(241,245,251,0.72)", mt: 0.5 }}>
              Flujo comercial claro, rapido y ordenado.
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
          <Chip
            label={healthOk ? "Sistema en linea" : "API offline"}
            size="small"
            color={healthOk ? "success" : "secondary"}
            sx={{ bgcolor: healthOk ? "rgba(31,122,77,0.22)" : "rgba(154,123,47,0.22)", color: "white" }}
          />
          <Chip
            label={`${filteredSections.reduce((total, section) => total + section.items.length, 0)} accesos`}
            size="small"
            sx={{ bgcolor: "rgba(255,255,255,0.1)", color: "white" }}
          />
        </Stack>
      </Box>

      <Box sx={{ mt: 2, display: "grid", gap: 1.25 }}>
        {filteredSections.map((section) => (
          <Box key={section.title}>
            <Typography
              variant="caption"
              sx={{
                px: 1.25,
                color: "rgba(241,245,251,0.56)",
                letterSpacing: 1,
>>>>>>> 9bb128ac (nuevos cambios)
                textTransform: "uppercase",
              }}
            >
              {section.title}
            </Typography>
<<<<<<< HEAD
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
=======
            <List disablePadding sx={{ display: "grid", gap: 0.5, mt: 0.75 }}>
              {section.items.map((item) => {
                const selected = activeItem?.path === item.path;

                return (
                  <ListItemButton
                    key={item.path}
                    component={RouterLink}
                    to={item.path}
                    selected={selected}
                    onClick={() => setOpen(false)}
                    sx={{
                      borderRadius: 2.5,
                      px: 1.4,
                      py: 1.1,
                      alignItems: "center",
                      border: selected ? "1px solid rgba(255,255,255,0.16)" : "1px solid transparent",
                      bgcolor: selected ? "rgba(255,255,255,0.14)" : "transparent",
                      "&:hover": {
                        bgcolor: selected ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.08)",
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 34 }}>{item.icon}</ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: 14,
                        fontWeight: selected ? 800 : 700,
                        color: selected ? "#ffffff" : "rgba(241,245,251,0.86)",
                      }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
>>>>>>> 9bb128ac (nuevos cambios)
          </Box>
        ))}
      </Box>

<<<<<<< HEAD
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
            Perfil: {getRoleLabel(role)}
          </Typography>
        </Paper>
=======
      <Box sx={{ mt: "auto", pt: 2 }}>
        <Divider sx={{ borderColor: "rgba(255,255,255,0.1)", mb: 1.5 }} />
        <Typography variant="body2" sx={{ px: 1.25, color: "rgba(241,245,251,0.72)" }}>
          {username || "Usuario"} conectado como {formatRole(role)}.
        </Typography>
>>>>>>> 9bb128ac (nuevos cambios)
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        bgcolor: "background.default",
<<<<<<< HEAD
        backgroundImage:
          "linear-gradient(180deg, rgba(18,53,90,0.06) 0%, rgba(18,53,90,0) 24%), radial-gradient(900px 360px at 100% -10%, rgba(154,123,47,0.12), transparent)",
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
            bgcolor: "rgba(248,250,252,0.88)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
          }}
        >
          <Toolbar
            sx={{
              minHeight: { xs: 76, md: 80 },
              px: { xs: 2, md: 3 },
              gap: 1.5,
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
                <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: 1 }}>
                  Panel principal
                </Typography>
                <Typography variant="h6" sx={{ color: "text.primary", fontWeight: 800 }} noWrap>
                  {projectName}
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", justifyContent: "flex-end" }}>
              <Tooltip title="Fecha local">
                <Chip
                  icon={<CalendarMonthIcon sx={{ color: "inherit !important" }} />}
                  label={new Date().toLocaleDateString("es-PE")}
                  size="small"
                  sx={{ bgcolor: "rgba(18,53,90,0.08)", color: "text.primary" }}
                />
              </Tooltip>
              <Chip label={username ?? "Usuario"} size="small" sx={{ bgcolor: "rgba(18,53,90,0.08)", color: "text.primary" }} />
              <Chip label={getRoleLabel(role)} size="small" sx={{ bgcolor: "rgba(18,53,90,0.08)", color: "text.primary" }} />
              {!healthOk ? <Chip label="API offline" size="small" color="error" /> : null}
              {compactMode ? <Chip label="Vista compacta" size="small" color="secondary" /> : null}
              <Tooltip title="Cerrar sesion">
                <IconButton color="primary" onClick={handleLogout} aria-label="Cerrar sesion">
                  <LogoutIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Toolbar>
        </Paper>

        <Box sx={{ p: { xs: 2, md: 3 }, display: "grid", gap: 2 }}>
          <Paper
            sx={{
              p: { xs: 2, md: 2.5 },
              background:
                "linear-gradient(160deg, rgba(18,53,90,0.045) 0%, rgba(18,53,90,0.018) 56%, rgba(154,123,47,0.08) 100%)",
            }}
          >
            <Stack spacing={1.75}>
              <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
                <Link component={RouterLink} to={homePath} underline="hover" color="inherit">
                  Panel
                </Link>
                {activeSection ? (
                  <Link component={RouterLink} to={currentSectionPath} underline="hover" color="inherit">
                    {activeSection.title}
                  </Link>
                ) : null}
                <Typography color="text.primary" sx={{ fontWeight: 700 }}>
                  {activeItem?.label || projectName}
                </Typography>
              </Breadcrumbs>

              <Box>
                <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: 1 }}>
                  Ubicacion actual
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {activeItem?.label || projectName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {activeSection ? `Area: ${activeSection.title}` : "Navegacion principal"}
                </Typography>
              </Box>

              {activeSection && activeSection.items.length > 1 ? (
                <Tabs value={activeTab} variant="scrollable" allowScrollButtonsMobile>
                  {activeSection.items.map((item) => (
                    <Tab
                      key={item.path}
                      value={item.path}
                      component={RouterLink}
                      to={item.path}
                      icon={React.isValidElement(item.icon) ? item.icon : undefined}
                      iconPosition={React.isValidElement(item.icon) ? "start" : undefined}
                      label={item.label}
                    />
                  ))}
                </Tabs>
              ) : null}
            </Stack>
          </Paper>

          {children}
=======
        backgroundImage: `
          radial-gradient(circle at top left, rgba(18,53,90,0.12) 0%, rgba(18,53,90,0) 34%),
          radial-gradient(circle at top right, rgba(154,123,47,0.14) 0%, rgba(154,123,47,0) 30%),
          linear-gradient(180deg, #f4f7fb 0%, #eef2f6 48%, #edf1f5 100%)
        `,
      }}
    >
      <Box sx={{ display: "flex", minHeight: "100vh" }}>
        {!compact ? (
          <Box
            sx={{
              width: 308,
              p: 2,
              pr: 0,
              flexShrink: 0,
            }}
          >
            <Box
              sx={{
                position: "sticky",
                top: 16,
                height: "calc(100vh - 32px)",
                borderRadius: 5,
                overflow: "hidden",
                background: "linear-gradient(180deg, #0c2847 0%, #12355a 42%, #163e68 100%)",
                boxShadow: "0 22px 42px rgba(8, 26, 45, 0.24)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {navigation}
            </Box>
          </Box>
        ) : null}

        <Drawer
          open={open}
          onClose={() => setOpen(false)}
          PaperProps={{
            sx: {
              width: 292,
              background: "linear-gradient(180deg, #0c2847 0%, #12355a 42%, #163e68 100%)",
            },
          }}
        >
          {navigation}
        </Drawer>

        <Box sx={{ flex: 1, minWidth: 0, p: { xs: 1.5, md: 2.5 } }}>
          <Box sx={{ display: "grid", gap: 2 }}>
            <Box
              sx={{
                position: "sticky",
                top: { xs: 12, md: 18 },
                zIndex: 10,
                p: { xs: 1.5, md: 2.25 },
                borderRadius: 4,
                border: "1px solid rgba(18,53,90,0.08)",
                background: "rgba(255,255,255,0.78)",
                boxShadow: "0 16px 34px rgba(12, 31, 51, 0.08)",
                backdropFilter: "blur(18px)",
              }}
            >
              <Stack
                direction={{ xs: "column", lg: "row" }}
                spacing={2}
                alignItems={{ xs: "flex-start", lg: "center" }}
              >
                <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ flex: 1, minWidth: 0, width: "100%" }}>
                  {compact ? (
                    <IconButton
                      onClick={() => setOpen(true)}
                      aria-label="Abrir menu"
                      sx={{
                        mt: 0.25,
                        border: "1px solid rgba(18,53,90,0.12)",
                        bgcolor: "rgba(255,255,255,0.65)",
                      }}
                    >
                      <MenuIcon />
                    </IconButton>
                  ) : null}

                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        display: "block",
                        color: "text.secondary",
                        letterSpacing: 1.2,
                        textTransform: "uppercase",
                        mb: 0.75,
                      }}
                    >
                      {activeSection?.title || "Panel"}
                    </Typography>
                    <Typography
                      variant="h4"
                      sx={{
                        fontSize: { xs: "1.5rem", md: "1.9rem" },
                        fontWeight: 800,
                        lineHeight: 1.05,
                        color: "text.primary",
                      }}
                    >
                      {activeItem?.label || projectName}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.7 }}>
                      Vista activa del sistema con accesos agrupados por area para trabajar con menos ruido visual.
                    </Typography>
                  </Box>
                </Stack>

                <Stack
                  direction="row"
                  spacing={1}
                  flexWrap="wrap"
                  useFlexGap
                  justifyContent={{ xs: "flex-start", lg: "flex-end" }}
                  sx={{ width: { xs: "100%", lg: "auto" } }}
                >
                  <Tooltip title="Fecha local">
                    <Chip
                      icon={<CalendarMonthIcon sx={{ color: "inherit !important" }} />}
                      label={new Date().toLocaleDateString("es-PE", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      sx={{
                        bgcolor: "rgba(18,53,90,0.06)",
                        color: "text.primary",
                        border: "1px solid rgba(18,53,90,0.08)",
                      }}
                    />
                  </Tooltip>
                  <Chip
                    label={username ?? "Usuario"}
                    sx={{
                      bgcolor: alpha("#12355a", 0.06),
                      color: "text.primary",
                      border: "1px solid rgba(18,53,90,0.08)",
                    }}
                  />
                  <Chip
                    label={formatRole(role)}
                    sx={{
                      bgcolor: alpha("#9a7b2f", 0.14),
                      color: "#6f5300",
                      border: "1px solid rgba(154,123,47,0.18)",
                    }}
                  />
                  {compactMode ? (
                    <Chip
                      label="Compacto"
                      sx={{
                        bgcolor: "rgba(18,53,90,0.06)",
                        color: "text.secondary",
                        border: "1px solid rgba(18,53,90,0.08)",
                      }}
                    />
                  ) : null}
                  <IconButton
                    onClick={() => {
                      logout();
                      navigate("/login");
                    }}
                    aria-label="Cerrar sesion"
                    sx={{
                      border: "1px solid rgba(18,53,90,0.12)",
                      bgcolor: "rgba(255,255,255,0.75)",
                    }}
                  >
                    <LogoutIcon />
                  </IconButton>
                </Stack>
              </Stack>

              {activeSection && activeSection.items.length > 1 ? (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2.25 }}>
                  {activeSection.items.map((item) => {
                    const selected = activeItem?.path === item.path;

                    return (
                      <Box
                        key={item.path}
                        component={RouterLink}
                        to={item.path}
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 1,
                          px: 1.5,
                          py: 1,
                          borderRadius: 999,
                          textDecoration: "none",
                          color: selected ? "#12355a" : "text.secondary",
                          bgcolor: selected ? "rgba(18,53,90,0.1)" : "rgba(255,255,255,0.6)",
                          border: selected ? "1px solid rgba(18,53,90,0.12)" : "1px solid rgba(18,53,90,0.06)",
                          boxShadow: selected ? "0 10px 24px rgba(18,53,90,0.08)" : "none",
                          transition: "all 160ms ease",
                          "&:hover": {
                            bgcolor: selected ? "rgba(18,53,90,0.12)" : "rgba(18,53,90,0.05)",
                          },
                        }}
                      >
                        <Box
                          sx={{
                            display: "grid",
                            placeItems: "center",
                            color: selected ? "primary.main" : "text.secondary",
                            "& .MuiSvgIcon-root": { fontSize: 18 },
                          }}
                        >
                          {item.icon}
                        </Box>
                        <Typography sx={{ fontSize: 14, fontWeight: selected ? 800 : 700 }}>{item.label}</Typography>
                      </Box>
                    );
                  })}
                </Stack>
              ) : null}
            </Box>

            <Box sx={{ pb: { xs: 2, md: 3 } }}>{children}</Box>
          </Box>
>>>>>>> 9bb128ac (nuevos cambios)
        </Box>
      </Box>
    </Box>
  );
};
