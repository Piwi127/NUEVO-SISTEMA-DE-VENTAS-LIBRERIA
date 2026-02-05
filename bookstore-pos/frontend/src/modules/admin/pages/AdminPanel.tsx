import React, { useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  TextField,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Stack,
  Chip,
  Tabs,
  Tab,
  IconButton,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import SaveIcon from "@mui/icons-material/Save";
import SecurityIcon from "@mui/icons-material/Security";
import SettingsIcon from "@mui/icons-material/Settings";
import HistoryIcon from "@mui/icons-material/History";
import { PageHeader } from "../../../components/PageHeader";
import { LoadingState } from "../../../components/LoadingState";
import { ErrorState } from "../../../components/ErrorState";
import { EmptyState } from "../../../components/EmptyState";
import { useQuery } from "@tanstack/react-query";
import { useSettings } from "../../../store/useSettings";
import { getSettings, updateSettings, downloadBackup } from "../api";
import { getRolePermissions, updateRolePermissions } from "../api";
import { listAuditLogs } from "../api";
import { setup2fa, confirm2fa } from "../../auth/api";
import { listWarehouses } from "../../inventory/api";
import { useToast } from "../../../components/ToastProvider";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../auth/AuthProvider";
import * as QRCode from "qrcode";

const PERMISSION_GROUPS: {
  title: string;
  items: { key: string; label: string; description: string }[];
}[] = [
  {
    title: "Ventas / POS",
    items: [
      { key: "sales.read", label: "Ver ventas", description: "Acceso a historial y detalle de ventas." },
      { key: "sales.create", label: "Registrar ventas", description: "Permite crear ventas y cobrar." },
      { key: "returns.create", label: "Devoluciones", description: "Permite anular/retornar ventas." },
    ],
  },
  {
    title: "Caja",
    items: [
      { key: "cash.open", label: "Abrir caja", description: "Permite abrir caja y ver estado actual." },
      { key: "cash.close", label: "Cerrar caja", description: "Permite cierre y arqueo de caja." },
      { key: "cash.movement", label: "Movimientos", description: "Permite ingresos/egresos manuales." },
    ],
  },
  {
    title: "Clientes / Productos",
    items: [
      { key: "customers.read", label: "Ver clientes", description: "Acceso al listado de clientes." },
      { key: "customers.write", label: "Editar clientes", description: "Crear/editar/eliminar clientes." },
      { key: "products.read", label: "Ver productos", description: "Acceso al catálogo de productos." },
      { key: "products.write", label: "Editar productos", description: "Crear/editar/eliminar productos." },
    ],
  },
  {
    title: "Inventario / Compras",
    items: [
      { key: "inventory.read", label: "Ver inventario", description: "Acceso a stock y kardex." },
      { key: "inventory.write", label: "Operar inventario", description: "Movimientos, ajustes y conteos." },
      { key: "purchases.read", label: "Ver compras", description: "Acceso a OC e historial de compras." },
      { key: "purchases.create", label: "Registrar compras", description: "Crear OC, recepciones y pagos." },
    ],
  },
  {
    title: "Proveedores",
    items: [
      { key: "suppliers.read", label: "Ver proveedores", description: "Acceso al listado de proveedores." },
      { key: "suppliers.write", label: "Editar proveedores", description: "Crear/editar/eliminar proveedores." },
    ],
  },
  {
    title: "Reportes",
    items: [{ key: "reports.read", label: "Ver reportes", description: "Acceso a reportes y exportaciones." }],
  },
  {
    title: "Administración",
    items: [
      { key: "settings.read", label: "Ver configuración", description: "Acceso a parámetros del sistema." },
      { key: "settings.write", label: "Editar configuración", description: "Modificar parámetros y ajustes." },
      { key: "users.read", label: "Ver usuarios", description: "Acceso al listado de usuarios." },
      { key: "users.write", label: "Administrar usuarios", description: "Crear, editar, bloquear y resetear." },
      { key: "permissions.read", label: "Ver permisos", description: "Consultar permisos por rol." },
      { key: "permissions.write", label: "Editar permisos", description: "Modificar permisos por rol." },
      { key: "audit.read", label: "Ver auditoría", description: "Acceso a logs de auditoría." },
      { key: "admin.backup", label: "Backup", description: "Descargar respaldo de la base." },
    ],
  },
];

const AdminPanel: React.FC = () => {
  const {
    currency,
    setCurrency,
    projectName,
    setProjectName,
    taxRate,
    setTaxRate,
    taxIncluded,
    setTaxIncluded,
    compactMode,
    setCompactMode,
    storeAddress,
    setStoreAddress,
    storePhone,
    setStorePhone,
    storeTaxId,
    setStoreTaxId,
    logoUrl,
    setLogoUrl,
    paymentMethods,
    setPaymentMethods,
    invoicePrefix,
    setInvoicePrefix,
    invoiceNext,
    setInvoiceNext,
    receiptHeader,
    setReceiptHeader,
    receiptFooter,
    setReceiptFooter,
    paperWidthMm,
    setPaperWidthMm,
    defaultWarehouseId,
    setDefaultWarehouseId,
  } = useSettings();

  const [nameDraft, setNameDraft] = useState(projectName);
  const [addressDraft, setAddressDraft] = useState(storeAddress);
  const [phoneDraft, setPhoneDraft] = useState(storePhone);
  const [taxIdDraft, setTaxIdDraft] = useState(storeTaxId);
  const [logoDraft, setLogoDraft] = useState(logoUrl);
  const [taxDraft, setTaxDraft] = useState(taxRate);
  const [paymentDraft, setPaymentDraft] = useState(paymentMethods);
  const [invoicePrefixDraft, setInvoicePrefixDraft] = useState(invoicePrefix);
  const [invoiceNextDraft, setInvoiceNextDraft] = useState(invoiceNext);
  const [receiptHeaderDraft, setReceiptHeaderDraft] = useState(receiptHeader);
  const [receiptFooterDraft, setReceiptFooterDraft] = useState(receiptFooter);
  const [paperWidthDraft, setPaperWidthDraft] = useState(paperWidthMm);
  const [defaultWarehouseDraft, setDefaultWarehouseDraft] = useState<number | "">(defaultWarehouseId ?? "");

  const [role, setRole] = useState("cashier");
  const [rolePerms, setRolePerms] = useState<string[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [otpSecret, setOtpSecret] = useState("");
  const [otpUri, setOtpUri] = useState("");
  const [otpQr, setOtpQr] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [tab, setTab] = useState(0);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState(false);
  const [permsLoading, setPermsLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState(false);

  const { showToast } = useToast();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { data: warehouses } = useQuery({ queryKey: ["warehouses"], queryFn: listWarehouses, staleTime: 60_000 });

  React.useEffect(() => {
    const load = async () => {
      setSettingsLoading(true);
      setSettingsError(false);
      try {
        const s = await getSettings();
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

        setNameDraft(s.project_name);
        setAddressDraft(s.store_address);
        setPhoneDraft(s.store_phone);
        setTaxIdDraft(s.store_tax_id);
        setLogoDraft(s.logo_url);
        setTaxDraft(s.tax_rate);
        setPaymentDraft(s.payment_methods);
        setInvoicePrefixDraft(s.invoice_prefix);
        setInvoiceNextDraft(s.invoice_next);
        setReceiptHeaderDraft(s.receipt_header);
        setReceiptFooterDraft(s.receipt_footer);
        setPaperWidthDraft(s.paper_width_mm);
        setDefaultWarehouseDraft(s.default_warehouse_id ?? "");
        setSettingsLoading(false);
      } catch {
        setSettingsError(true);
        setSettingsLoading(false);
      }
    };
    load();
  }, []);

  React.useEffect(() => {
    const loadPerms = async () => {
      setPermsLoading(true);
      try {
        const res = await getRolePermissions(role);
        setRolePerms(res.permissions);
      } catch {
        setRolePerms([]);
      } finally {
        setPermsLoading(false);
      }
    };
    loadPerms();
  }, [role]);

  const togglePerm = (p: string) => {
    setRolePerms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const handleSavePerms = async () => {
    await updateRolePermissions(role, rolePerms);
    showToast({ message: "Permisos actualizados", severity: "success" });
  };

  const handleSave = async () => {
    const payload = {
      project_name: nameDraft.trim() || "Bookstore POS",
      currency,
      tax_rate: Number(taxDraft) || 0,
      tax_included: taxIncluded,
      store_address: addressDraft,
      store_phone: phoneDraft,
      store_tax_id: taxIdDraft,
      logo_url: logoDraft,
      payment_methods: paymentDraft,
      invoice_prefix: invoicePrefixDraft,
      invoice_next: Number(invoiceNextDraft) || 1,
      receipt_header: receiptHeaderDraft,
      receipt_footer: receiptFooterDraft,
      paper_width_mm: Number(paperWidthDraft) || 80,
      default_warehouse_id: defaultWarehouseDraft === "" ? null : Number(defaultWarehouseDraft),
    };
    try {
      const s = await updateSettings(payload);
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
      showToast({ message: "Configuracion guardada", severity: "success" });
    } catch (err: any) {
      showToast({ message: err?.response?.data?.detail || "Error guardando", severity: "error" });
    }
  };

  const handleBackup = async () => {
    try {
      const blob = await downloadBackup();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bookstore_backup.db";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      showToast({ message: err?.response?.data?.detail || "Error en backup", severity: "error" });
    }
  };

  const loadAudit = async () => {
    setAuditLoading(true);
    setAuditError(false);
    try {
      const res = await listAuditLogs();
      setAudit(res);
    } catch {
      setAuditError(true);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleSetup2fa = async () => {
    try {
      const res = await setup2fa();
      setOtpSecret(res.secret);
      setOtpUri(res.otpauth);
      try {
        const qr = await QRCode.toDataURL(res.otpauth);
        setOtpQr(qr);
      } catch {
        setOtpQr("");
      }
      showToast({ message: "Escanee el QR o use el secreto", severity: "info" });
    } catch (err: any) {
      if (err?.response?.status === 401) {
        showToast({ message: "Sesion invalida. Inicia sesion nuevamente.", severity: "error" });
        logout();
        navigate("/login");
        return;
      }
      showToast({ message: err?.response?.data?.detail || "Error al generar secreto 2FA", severity: "error" });
    }
  };

  const handleConfirm2fa = async () => {
    if (!otpCode.trim()) {
      showToast({ message: "Ingrese el codigo OTP", severity: "warning" });
      return;
    }
    try {
      await confirm2fa(otpCode);
      showToast({ message: "2FA activado", severity: "success" });
      setOtpCode("");
    } catch (err: any) {
      if (err?.response?.status === 401) {
        showToast({ message: "Sesion invalida. Inicia sesion nuevamente.", severity: "error" });
        logout();
        navigate("/login");
        return;
      }
      showToast({ message: err?.response?.data?.detail || "Error al activar 2FA", severity: "error" });
    }
  };

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <PageHeader
        title="Administracion"
        subtitle="Configuracion corporativa, seguridad y control operativo."
        icon={<SettingsIcon color="primary" />}
        loading={settingsLoading || permsLoading || auditLoading}
        right={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleBackup}>
              Backup
            </Button>
            <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}>
              Guardar cambios
            </Button>
          </Stack>
        }
      />

      {settingsError ? (
        <Paper sx={{ p: 2 }}>
          <ErrorState title="No se pudieron cargar configuraciones" onRetry={() => window.location.reload()} />
        </Paper>
      ) : null}

      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <SettingsIcon color="primary" />
          <Typography variant="h6">Panel de configuracion</Typography>
          <Chip size="small" label="Sistema" sx={{ ml: "auto" }} />
        </Stack>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="General" />
          <Tab label="Facturacion" />
          <Tab label="Operaciones" />
        </Tabs>

        {tab === 0 && (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Nombre del proyecto" value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Logo URL" value={logoDraft} onChange={(e) => setLogoDraft(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Direccion" value={addressDraft} onChange={(e) => setAddressDraft(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth label="Telefono" value={phoneDraft} onChange={(e) => setPhoneDraft(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth label="RUC" value={taxIdDraft} onChange={(e) => setTaxIdDraft(e.target.value)} />
            </Grid>
          </Grid>
        )}

        {tab === 1 && (
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField select fullWidth label="Moneda" value={currency} onChange={(e) => setCurrency(e.target.value as any)}>
                <MenuItem value="PEN">Soles (PEN)</MenuItem>
                <MenuItem value="USD">Dolar (USD)</MenuItem>
                <MenuItem value="EUR">Euro (EUR)</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Impuesto (%)" type="number" value={taxDraft} onChange={(e) => setTaxDraft(Number(e.target.value))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel control={<Checkbox checked={taxIncluded} onChange={(e) => setTaxIncluded(e.target.checked)} />} label="Impuesto incluido" />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Metodos de pago (CSV)" value={paymentDraft} onChange={(e) => setPaymentDraft(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Serie de boleta" value={invoicePrefixDraft} onChange={(e) => setInvoicePrefixDraft(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Correlativo" type="number" value={invoiceNextDraft} onChange={(e) => setInvoiceNextDraft(Number(e.target.value))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Ancho papel (mm)" type="number" value={paperWidthDraft} onChange={(e) => setPaperWidthDraft(Number(e.target.value))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label="Almacen por defecto"
                value={defaultWarehouseDraft}
                onChange={(e) => setDefaultWarehouseDraft(e.target.value === "" ? "" : Number(e.target.value))}
              >
                <MenuItem value="">Sin asignar</MenuItem>
                {(warehouses || []).map((w) => (
                  <MenuItem key={w.id} value={w.id}>
                    {w.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                minRows={3}
                label="Encabezado ticket"
                value={receiptHeaderDraft}
                onChange={(e) => setReceiptHeaderDraft(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                minRows={3}
                label="Pie de ticket"
                value={receiptFooterDraft}
                onChange={(e) => setReceiptFooterDraft(e.target.value)}
              />
            </Grid>
          </Grid>
        )}

        {tab === 2 && (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Notas internas" placeholder="Politicas, turnos, etc." />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Contacto de soporte" placeholder="support@empresa.com" />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={<Checkbox checked={compactMode} onChange={(e) => setCompactMode(e.target.checked)} />}
                label="Modo compacto forzado (UI)"
              />
            </Grid>
          </Grid>
        )}
      </Paper>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <SecurityIcon color="primary" />
              <Typography variant="h6">Seguridad</Typography>
            </Stack>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems="center">
              <Button variant="outlined" onClick={handleSetup2fa}>Generar secreto</Button>
              {otpSecret && <Chip label={`Secreto: ${otpSecret}`} size="small" />}
            </Stack>
            {otpUri ? (
              <TextField
                fullWidth
                label="URI (otpauth)"
                value={otpUri}
                InputProps={{ readOnly: true }}
                sx={{ mt: 2 }}
              />
            ) : null}
            {otpQr ? (
              <Box sx={{ mt: 2, display: "flex", justifyContent: "center" }}>
                <Box component="img" src={otpQr} alt="QR 2FA" sx={{ width: 180, height: 180, borderRadius: 1 }} />
              </Box>
            ) : null}
            <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mt: 2 }}>
              <TextField label="Codigo" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} />
              <Button variant="contained" onClick={handleConfirm2fa}>Activar 2FA</Button>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <SecurityIcon color="primary" />
              <Typography variant="h6">Permisos por rol</Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <TextField select label="Rol" value={role} onChange={(e) => setRole(e.target.value)}>
                <MenuItem value="cashier">cashier</MenuItem>
                <MenuItem value="stock">stock</MenuItem>
              </TextField>
              <Button variant="contained" onClick={handleSavePerms}>Guardar permisos</Button>
            </Stack>
            <Grid container spacing={2}>
              {PERMISSION_GROUPS.map((group) => (
                <Grid item xs={12} md={6} key={group.title}>
                  <Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, color: "text.secondary" }}>
                      {group.title}
                    </Typography>
                    <Grid container spacing={1}>
                      {group.items.map((p) => (
                        <Grid item xs={12} sm={6} key={p.key}>
                          <FormControlLabel
                            control={<Checkbox checked={rolePerms.includes(p.key)} onChange={() => togglePerm(p.key)} />}
                            label={p.label}
                          />
                          <Typography variant="caption" sx={{ display: "block", ml: 4, color: "text.secondary" }}>
                            {p.description}
                          </Typography>
                        </Grid>
                      ))}
                    </Grid>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <HistoryIcon color="primary" />
          <Typography variant="h6">Auditoria</Typography>
          <IconButton sx={{ ml: "auto" }} size="small" onClick={loadAudit}>
            <DownloadIcon fontSize="small" />
          </IconButton>
        </Stack>
        {auditLoading ? (
          <LoadingState title="Cargando auditoria..." />
        ) : auditError ? (
          <ErrorState title="No se pudo cargar auditoria" onRetry={loadAudit} />
        ) : audit.length === 0 ? (
          <EmptyState title="Sin registros" description="Ejecuta una acción o presiona recargar." icon={<HistoryIcon color="disabled" />} />
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Usuario</TableCell>
                <TableCell>Accion</TableCell>
                <TableCell>Entidad</TableCell>
                <TableCell>Detalle</TableCell>
                <TableCell>Fecha</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {audit.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.id}</TableCell>
                  <TableCell>{a.user_id ?? "-"}</TableCell>
                  <TableCell>{a.action}</TableCell>
                  <TableCell>{a.entity}#{a.entity_id}</TableCell>
                  <TableCell>{a.details}</TableCell>
                  <TableCell>{a.created_at}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
};

export default AdminPanel;
