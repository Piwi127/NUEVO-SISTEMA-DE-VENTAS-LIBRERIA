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
import { PageHeader } from "../../components/PageHeader";
import { useQuery } from "@tanstack/react-query";
import { useSettings } from "../../store/useSettings";
import { getSettings, updateSettings, downloadBackup } from "../../api/settings";
import { getRolePermissions, updateRolePermissions } from "../../api/permissions";
import { listAuditLogs } from "../../api/audit";
import { setup2fa, confirm2fa } from "../../api/auth";
import { listWarehouses } from "../../api/warehouses";
import { useToast } from "../../components/ToastProvider";

const PERMISSIONS = [
  "sales.read",
  "sales.create",
  "cash.open",
  "cash.close",
  "cash.movement",
  "customers.read",
  "customers.write",
  "products.read",
  "products.write",
  "inventory.read",
  "inventory.write",
  "purchases.create",
  "suppliers.write",
  "reports.read",
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
  const [otpCode, setOtpCode] = useState("");
  const [tab, setTab] = useState(0);

  const { showToast } = useToast();
  const { data: warehouses } = useQuery({ queryKey: ["warehouses"], queryFn: listWarehouses, staleTime: 60_000 });

  React.useEffect(() => {
    const load = async () => {
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
      } catch {
        // ignore
      }
    };
    load();
  }, []);

  React.useEffect(() => {
    const loadPerms = async () => {
      try {
        const res = await getRolePermissions(role);
        setRolePerms(res.permissions);
      } catch {
        setRolePerms([]);
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
    const res = await listAuditLogs();
    setAudit(res);
  };

  const handleSetup2fa = async () => {
    const res = await setup2fa();
    setOtpSecret(res.secret);
    showToast({ message: "Escanee el QR o use el secreto", severity: "info" });
  };

  const handleConfirm2fa = async () => {
    await confirm2fa(otpCode);
    showToast({ message: "2FA activado", severity: "success" });
    setOtpCode("");
  };

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <PageHeader
        title="Administracion"
        subtitle="Configuracion corporativa, seguridad y control operativo."
        icon={<SettingsIcon color="primary" />}
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
            <Grid container spacing={1}>
              {PERMISSIONS.map((p) => (
                <Grid item xs={12} md={4} key={p}>
                  <FormControlLabel control={<Checkbox checked={rolePerms.includes(p)} onChange={() => togglePerm(p)} />} label={p} />
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
      </Paper>
    </Box>
  );
};

export default AdminPanel;
