import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import DownloadIcon from "@mui/icons-material/Download";
import PublishIcon from "@mui/icons-material/Publish";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ConfirmDialog, EmptyState, ErrorState, KpiCard, LoadingState, PageHeader, ResizableTable, useToast } from "@/app/components";
import { useAuth } from "@/auth/AuthProvider";
import { listProducts } from "@/modules/catalog/api";
import {
  createInventoryMovement,
  downloadInventoryTemplate,
  downloadInventoryTemplateXlsx,
  getKardex,
} from "@/modules/inventory/api";
import { createBatch, createTransfer, createWarehouse, listWarehouses } from "@/modules/inventory/api";
import { useSettings } from "@/app/store";
import { REQUIRED_COLUMNS, PREVIEW_LIMIT, useInventoryUpload } from "@/modules/inventory/hooks/useInventoryUpload";

const requiredSelectSchema = z.number().int().positive("Selecciona una opcion.");
const positiveIntegerSchema = z.number().int("Ingresa un numero entero.").min(1, "Debe ser al menos 1.");
const nonZeroNumberSchema = z.number().refine((value) => Number.isFinite(value) && value !== 0, "Ingresa una cantidad distinta de 0.");

const warehouseFormSchema = z.object({
  name: z.string().trim().min(2, "Ingresa al menos 2 caracteres.").max(80, "El nombre es demasiado largo."),
  location: z.string().trim().max(120, "La ubicacion es demasiado larga."),
});

const adjustmentFormSchema = z.object({
  product_id: requiredSelectSchema,
  qty: nonZeroNumberSchema,
  ref: z.string().trim().min(4, "Ingresa una referencia valida.").max(60, "La referencia es demasiado larga."),
});

const transferFormSchema = z
  .object({
    from_warehouse_id: requiredSelectSchema,
    to_warehouse_id: requiredSelectSchema,
    product_id: requiredSelectSchema,
    qty: positiveIntegerSchema,
  })
  .superRefine((values, ctx) => {
    if (values.from_warehouse_id === values.to_warehouse_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["to_warehouse_id"],
        message: "El almacen destino debe ser distinto al origen.",
      });
    }
  });

const batchFormSchema = z.object({
  warehouse_id: requiredSelectSchema,
  product_id: requiredSelectSchema,
  lot: z.string().trim().min(2, "Ingresa un lote valido.").max(40, "El lote es demasiado largo."),
  expiry_date: z.string().trim().max(20, "La fecha es demasiado larga."),
  qty: positiveIntegerSchema,
});

type WarehouseFormValues = z.infer<typeof warehouseFormSchema>;
type AdjustmentFormValues = z.infer<typeof adjustmentFormSchema>;
type TransferFormValues = z.infer<typeof transferFormSchema>;
type BatchFormValues = z.infer<typeof batchFormSchema>;

const defaultWarehouseValues: WarehouseFormValues = { name: "", location: "" };
const defaultAdjustmentValues: AdjustmentFormValues = { product_id: 0, qty: 0, ref: "ADJ:manual" };
const defaultTransferValues: TransferFormValues = { from_warehouse_id: 0, to_warehouse_id: 0, product_id: 0, qty: 1 };
const defaultBatchValues: BatchFormValues = { warehouse_id: 0, product_id: 0, lot: "", expiry_date: "", qty: 1 };


// Página de gestión de inventario
// Muestra stock, movimientos, kardex y permite subir inventario por Excel
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { role } = useAuth();
  const compact = useMediaQuery("(max-width:900px)");
  const { compactMode } = useSettings();
  const isCompact = compactMode || compact;

  const productsQuery = useQuery({ queryKey: ["products"], queryFn: () => listProducts(), staleTime: 30_000 });
  const warehousesQuery = useQuery({ queryKey: ["warehouses"], queryFn: () => listWarehouses(), staleTime: 5 * 60_000 });

  const products = productsQuery.data || [];
  const warehouses = warehousesQuery.data || [];
  const baseLoading = productsQuery.isLoading || warehousesQuery.isLoading;
  const baseError = productsQuery.isError || warehousesQuery.isError;

  const lowStockCount = products.filter((item) => Number(item.stock || 0) <= Number(item.stock_min || 0)).length;
  const criticalStockCount = products.filter((item) => Number(item.stock || 0) <= 0).length;
  const inventoryUnits = products.reduce((acc, item) => acc + Number(item.stock || 0), 0);
  const categoryCount = new Set(products.map((item) => item.category).filter(Boolean)).size;
  const coverageGap = products.reduce(
    (acc, item) => acc + Math.max(Number(item.stock_min || 0) - Number(item.stock || 0), 0),
    0
  );

  const [tab, setTab] = useState(0);
  const [kardexProductId, setKardexProductId] = useState(0);
  const [kardexCursor, setKardexCursor] = useState<string | null>(null);
  const [kardexCursorStack, setKardexCursorStack] = useState<string[]>([]);
  const [kardexLimit, setKardexLimit] = useState(50);
  const [kardexType, setKardexType] = useState("");
  const [kardexFrom, setKardexFrom] = useState("");
  const [kardexTo, setKardexTo] = useState("");

  const { data: kardex, isLoading: kardexLoading, isError: kardexError, refetch: refetchKardex } = useQuery({
    queryKey: ["kardex", kardexProductId, kardexCursor, kardexLimit, kardexType, kardexFrom, kardexTo],
    queryFn: () =>
      getKardex(kardexProductId, {
        cursor: kardexCursor,
        limit: kardexLimit,
        type: kardexType || null,
        from: kardexFrom || null,
        to: kardexTo || null,
      }),
    enabled: kardexProductId > 0,
  });

  const {
    file,
    preview,
    totalRows,
    confirmOpen,
    setConfirmOpen,
    uploadLoading,
    uploadError,
    job,
    jobActive,
    jobErrors,
    handleFileChange,
    handleUpload,
    confirmUpload,
    downloadErrors,
  } = useInventoryUpload();

  const {
    register: registerWarehouse,
    reset: resetWarehouse,
    handleSubmit: handleWarehouseSubmit,
    formState: { errors: warehouseErrors, isSubmitting: isWarehouseSubmitting, isValid: isWarehouseValid },
  } = useForm<WarehouseFormValues>({ resolver: zodResolver(warehouseFormSchema), mode: "onChange", defaultValues: defaultWarehouseValues });

  const {
    control: adjustmentControl,
    register: registerAdjustment,
    reset: resetAdjustment,
    handleSubmit: handleAdjustmentSubmit,
    formState: { errors: adjustmentErrors, isSubmitting: isAdjustmentSubmitting, isValid: isAdjustmentValid },
  } = useForm<AdjustmentFormValues>({ resolver: zodResolver(adjustmentFormSchema), mode: "onChange", defaultValues: defaultAdjustmentValues });

  const {
    control: transferControl,
    register: registerTransfer,
    reset: resetTransfer,
    handleSubmit: handleTransferSubmit,
    formState: { errors: transferErrors, isSubmitting: isTransferSubmitting, isValid: isTransferValid },
  } = useForm<TransferFormValues>({ resolver: zodResolver(transferFormSchema), mode: "onChange", defaultValues: defaultTransferValues });

  const {
    control: batchControl,
    register: registerBatch,
    reset: resetBatch,
    handleSubmit: handleBatchSubmit,
    formState: { errors: batchErrors, isSubmitting: isBatchSubmitting, isValid: isBatchValid },
  } = useForm<BatchFormValues>({ resolver: zodResolver(batchFormSchema), mode: "onChange", defaultValues: defaultBatchValues });

  const [warehouseSubmitError, setWarehouseSubmitError] = useState("");
  const [adjustmentSubmitError, setAdjustmentSubmitError] = useState("");
  const [transferSubmitError, setTransferSubmitError] = useState("");
  const [batchSubmitError, setBatchSubmitError] = useState("");

  const extractErrorDetail = (error: unknown, fallback: string) => {
    const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
    return typeof detail === "string" && detail.trim() ? detail : fallback;
  };

  const downloadBlob = async (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  };

  const resetKardexPagination = () => {
    setKardexCursor(null);
    setKardexCursorStack([]);
  };

  const handleKardexProductChange = (value: number) => {
    setKardexProductId(value);
    resetKardexPagination();
  };

  const handleKardexNextPage = () => {
    if (!kardex?.next_cursor) return;
    setKardexCursorStack((previous) => [...previous, kardexCursor || ""]);
    setKardexCursor(kardex.next_cursor);
  };

  const handleKardexPrevPage = () => {
    if (!kardexCursorStack.length) return;
    setKardexCursorStack((previous) => {
      const next = [...previous];
      const previousCursor = next.pop() ?? "";
      setKardexCursor(previousCursor || null);
      return next;
    });
  };

  const onCreateWarehouse = async (values: WarehouseFormValues) => {
    setWarehouseSubmitError("");
    try {
      await createWarehouse({ name: values.name.trim(), location: values.location.trim() });
      showToast({ message: "Almacen creado exitosamente", severity: "success" });
      resetWarehouse(defaultWarehouseValues);
      await qc.invalidateQueries({ queryKey: ["warehouses"] });
    } catch (error: unknown) {
      const message = extractErrorDetail(error, "No se pudo crear el almacen.");
      setWarehouseSubmitError(message);
      showToast({ message, severity: "error" });
    }
  };

  const onAdjust = async (values: AdjustmentFormValues) => {
    setAdjustmentSubmitError("");
    try {
      await createInventoryMovement({ product_id: values.product_id, type: "ADJ", qty: values.qty, ref: values.ref.trim() });
      showToast({ message: "Movimiento registrado exitosamente", severity: "success" });
      resetAdjustment(defaultAdjustmentValues);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["products"] }),
        qc.invalidateQueries({ queryKey: ["kardex"] }),
      ]);
    } catch (error: unknown) {
      const message = extractErrorDetail(error, "No se pudo registrar el ajuste.");
      setAdjustmentSubmitError(message);
      showToast({ message, severity: "error" });
    }
  };

  const onTransfer = async (values: TransferFormValues) => {
    setTransferSubmitError("");
    try {
      await createTransfer({
        from_warehouse_id: values.from_warehouse_id,
        to_warehouse_id: values.to_warehouse_id,
        items: [{ product_id: values.product_id, qty: values.qty }],
      });
      showToast({ message: "Transferencia realizada exitosamente", severity: "success" });
      resetTransfer(defaultTransferValues);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["products"] }),
        qc.invalidateQueries({ queryKey: ["kardex"] }),
      ]);
    } catch (error: unknown) {
      const message = extractErrorDetail(error, "No se pudo completar la transferencia.");
      setTransferSubmitError(message);
      showToast({ message, severity: "error" });
    }
  };

  const onBatch = async (values: BatchFormValues) => {
    setBatchSubmitError("");
    try {
      await createBatch({
        warehouse_id: values.warehouse_id,
        product_id: values.product_id,
        lot: values.lot.trim(),
        expiry_date: values.expiry_date.trim(),
        qty: values.qty,
      });
      showToast({ message: "Lote del producto registrado", severity: "success" });
      resetBatch(defaultBatchValues);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["products"] }),
        qc.invalidateQueries({ queryKey: ["kardex"] }),
      ]);
    } catch (error: unknown) {
      const message = extractErrorDetail(error, "No se pudo registrar el lote.");
      setBatchSubmitError(message);
      showToast({ message, severity: "error" });
    }
  };

  if (baseError) {
    return (
      <Box sx={{ display: "grid", gap: 1.5 }} className="fade-in">
        <PageHeader title="Inventario" subtitle="Gestión centralizada de stock" icon={<Inventory2Icon color="primary" />} />
        <Paper className="glass-panel" sx={{ p: 4 }}>
          <ErrorState
            title="Sincronización fallida al cargar inventario"
            onRetry={() => { productsQuery.refetch(); warehousesQuery.refetch(); }}
          />
        </Paper>
      </Box>
    );
  }

  if (baseLoading) {
    return (
      <Box sx={{ display: "grid", gap: 1.5 }} className="fade-in">
        <PageHeader title="Inventario" subtitle="Gestión centralizada de stock" icon={<Inventory2Icon color="primary" />} loading />
        <Paper className="glass-panel" sx={{ p: 4 }}>
          <LoadingState title="Inicializando inventario..." rows={3} />
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "grid", gap: 2 }} className="fade-in">
      <PageHeader
        title="Inventario"
        subtitle="Carga masiva, ajustes manuales y consulta de kardex."
        icon={<Inventory2Icon color="primary" />}
        chips={[`Rol: ${role}`, `Productos: ${products.length}`, `Almacenes: ${warehouses.length}`]}
      />

      <Paper
        className="glass-panel pulse-subtle"
        sx={{
          p: { xs: 2, md: 3 },
          background: "linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)",
          color: "common.white",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <Stack direction={{ xs: "column", lg: "row" }} spacing={2} alignItems={{ xs: "flex-start", lg: "center" }} justifyContent="space-between">
          <Box sx={{ maxWidth: 760 }}>
            <Typography variant="overline" sx={{ color: "primary.light", fontWeight: 700, letterSpacing: 1.5 }}>
              RADAR DE ABASTECIMIENTO
            </Typography>
            <Typography variant="h5" sx={{ mt: 0.5, fontWeight: 800, color: "white" }}>
              Control de stock integral
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, color: "rgba(255,255,255,0.7)", maxWidth: 600 }}>
              Anticipa quiebres de stock. Configura alertas y revisa el flujo de bienes en toda tu red de almacenes al instante.
            </Typography>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
              gap: 1.5,
              width: "100%",
              maxWidth: { md: 440 },
            }}
          >
            <Button
              variant="contained"
              color="primary"
              startIcon={<DownloadIcon />}
              onClick={async () => downloadBlob(await downloadInventoryTemplate(), "inventario_template.csv")}
            >
              Plantilla CSV
            </Button>
            <Button
              variant="outlined"
              sx={{ color: "white", borderColor: "rgba(255,255,255,0.3)", "&:hover": { borderColor: "white", bgcolor: "rgba(255,255,255,0.1)" } }}
              startIcon={<DownloadIcon />}
              onClick={async () => downloadBlob(await downloadInventoryTemplateXlsx(), "inventario_template.xlsx")}
            >
              Plantilla XLSX
            </Button>
          </Box>
        </Stack>

        <Box sx={{ mt: 3, display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(auto-fit, minmax(180px, 1fr))" } }}>
          <KpiCard label="Productos" value={`${products.length}`} accent="#60A5FA" />
          <KpiCard label="Categorías" value={`${categoryCount}`} accent="#818CF8" />
          <KpiCard label="Stock en alerta" value={`${lowStockCount}`} accent="#F59E0B" />
          <KpiCard label="Sin stock" value={`${criticalStockCount}`} accent="#EF4444" />
          <KpiCard label="Unidades totales" value={`${inventoryUnits}`} accent="#10B981" />
          <KpiCard label="Faltante estimado" value={`${coverageGap}`} accent="#FBBF24" />
        </Box>
      </Paper>

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", xl: "1.2fr 0.95fr" } }}>
        <Paper className="glass-panel" sx={{ p: { xs: 2, md: 3 } }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
            <Inventory2Icon color="primary" fontSize="small" />
            <Typography variant="h6" fontWeight="700">Notificaciones del Sistema</Typography>
          </Stack>
          <Stack spacing={1.5}>
            {criticalStockCount > 0 && (
              <Alert severity="error" variant="outlined" sx={{ borderRadius: 2 }}>
                Alerta Crítica: {criticalStockCount} producto(s) sin inventario disponible.
              </Alert>
            )}
            {lowStockCount > 0 && (
              <Alert severity="warning" variant="outlined" sx={{ borderRadius: 2 }}>
                Atención: {lowStockCount} producto(s) por debajo del stock mínimo.
              </Alert>
            )}
            {file && totalRows > 0 && (
              <Alert severity="info" variant="outlined" sx={{ borderRadius: 2 }}>
                Archivo escaneado: {file.name} - ({totalRows} filas detectadas). Completa la importación.
              </Alert>
            )}
            {criticalStockCount === 0 && lowStockCount === 0 && !file && (
              <Alert severity="success" variant="outlined" sx={{ borderRadius: 2 }}>
                Inventario general saludable. Todos los niveles óptimos.
              </Alert>
            )}
          </Stack>
        </Paper>

        <Paper className="glass-panel" sx={{ p: { xs: 2, md: 3 } }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
            <PublishIcon color="primary" fontSize="small" />
            <Typography variant="h6" fontWeight="700">Panel de control</Typography>
          </Stack>
          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" } }}>
            <Button variant={tab === 0 ? "contained" : "outlined"} onClick={() => setTab(0)}>Carga masiva (CSV/XLSX)</Button>
            <Button variant={tab === 1 ? "contained" : "outlined"} onClick={() => setTab(1)}>Operaciones manuales</Button>
            <Button variant={tab === 2 ? "contained" : "outlined"} onClick={() => setTab(2)}>Kardex</Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => handleKardexProductChange(products[0]?.id ?? 0)}
              disabled={!products.length}
            >
              Usar primer producto
            </Button>
          </Box>
        </Paper>
      </Box>

      <Paper className="glass-panel" sx={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
          sx={{ '& .MuiTab-root': { py: 2, fontWeight: 600 } }}
        >
          <Tab label="Importación masiva" />
          <Tab label="Ajustes y movimientos" />
          <Tab label="Movimientos Kardex" />
        </Tabs>
      </Paper>

      {/* TABS CONTENT */}
      {tab === 0 ? (
        role !== "admin" ? (
          <Paper className="glass-panel" sx={{ p: 4, textAlign: "center", borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
            <EmptyState title="Permiso Denegado" description="Se requieren privilegios de Administrador para subir inventario." icon={<Inventory2Icon color="disabled" />} />
          </Paper>
        ) : (
          <Paper className="glass-panel" sx={{ p: { xs: 2, md: 3 }, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Asistente de importación</Typography>
            {uploadError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{uploadError}</Alert>}
            {job && (
              <Alert
                severity={job.status === "success" ? "success" : job.status === "failed" ? "error" : job.status === "partial" ? "warning" : "info"}
                sx={{ mb: 2, borderRadius: 2 }}
              >
                Job #{job.id}: estado {job.status.toUpperCase()} - procesadas {job.processed_rows}/{job.total_rows} - errores {job.error_rows}
              </Alert>
            )}
            {jobErrors && jobErrors.items.length > 0 && (
              <Box sx={{ mb: 2, display: "grid", gap: 1 }}>
                <Alert severity="warning" sx={{ borderRadius: 2 }}>
                  Se detectaron {jobErrors.total_errors} errores en la importación. Puedes descargar el CSV para corregirlos.
                </Alert>
                <Button variant="outlined" startIcon={<DownloadIcon />} onClick={downloadErrors} sx={{ justifySelf: "start" }}>
                  Descargar errores CSV
                </Button>
              </Box>
            )}

            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center", p: 3, border: "2px dashed var(--border-subtle)", borderRadius: 3, bgcolor: "var(--bg-app)" }}>
              <Button variant="outlined" component="label" size="large" sx={{ px: 4 }}>
                Explorar Archivos locales
                <input hidden type="file" accept=".csv,.xlsx" onChange={(event) => handleFileChange(event.currentTarget.files?.[0] || null)} />
              </Button>
              <Button type="button" variant="contained" size="large" color="primary" onClick={handleUpload} disabled={!file || uploadLoading || jobActive} sx={{ px: 4 }}>
                {jobActive ? "Procesando job..." : uploadLoading ? "Sincronizando Sistema..." : "Iniciar Carga Datos"}
              </Button>
              {file && <Chip label={`Cargado en Ref: ${file.name}`} color="primary" variant="outlined" />}
              {job && <Chip label={`Job activo: #${job.id}`} color={jobActive ? "warning" : "success"} variant="outlined" />}
            </Box>

            {preview.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, color: "text.secondary" }}>
                  Muestra interactiva (Lim. a {PREVIEW_LIMIT} registros)
                </Typography>

                {isCompact ? (
                  <Box sx={{ display: "grid", gap: 1.5 }}>
                    {preview.map((row, index) => (
                      <Paper key={index} elevation={0} sx={{ p: 2, border: "1px solid var(--border-subtle)", borderRadius: 2 }}>
                        {REQUIRED_COLUMNS.map((col) => (
                          <Box key={col} sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">{col.toUpperCase()}</Typography>
                            <Typography variant="body2" fontWeight={600}>{String(row[col] ?? "—")}</Typography>
                          </Box>
                        ))}
                      </Paper>
                    ))}
                  </Box>
                ) : (
                  <ResizableTable minHeight={300}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          {REQUIRED_COLUMNS.map((column) => (
                            <TableCell key={column} sx={{ fontWeight: 800 }}>{column.toUpperCase()}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {preview.map((row, index) => (
                          <TableRow key={index} hover>
                            {REQUIRED_COLUMNS.map((column) => (
                              <TableCell key={column}>{String(row[column] || "—")}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ResizableTable>
                )}
              </Box>
            )}
          </Paper>
        )
      ) : null}

      {tab === 1 ? (
        <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", lg: "repeat(2, 1fr)" }, mt: 2 }}>
          <Paper className="glass-panel" sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 3, borderBottom: "1px solid var(--border-subtle)", pb: 1 }}>Almacenes</Typography>
            <Box component="form" onSubmit={handleWarehouseSubmit(onCreateWarehouse)} sx={{ display: "grid", gap: 2 }}>
              {warehouseSubmitError && <Alert severity="error">{warehouseSubmitError}</Alert>}
              <TextField label="Nombre del almacén" error={!!warehouseErrors.name} helperText={warehouseErrors.name?.message} fullWidth {...registerWarehouse("name", { onChange: () => setWarehouseSubmitError("") })} />
              <TextField label="Ubicación" error={!!warehouseErrors.location} helperText={warehouseErrors.location?.message} fullWidth {...registerWarehouse("location", { onChange: () => setWarehouseSubmitError("") })} />
              <Button type="submit" variant="contained" disabled={!isWarehouseValid || isWarehouseSubmitting}>
                {isWarehouseSubmitting ? "Guardando..." : "Guardar almacén"}
              </Button>
            </Box>
          </Paper>

          <Paper className="glass-panel" sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 3, borderBottom: "1px solid var(--border-subtle)", pb: 1 }}>Transferencias</Typography>
            <Box component="form" onSubmit={handleTransferSubmit(onTransfer)} sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(2, 1fr)" }}>
              {transferSubmitError && <Alert severity="error" sx={{ gridColumn: "1 / -1" }}>{transferSubmitError}</Alert>}
              <Controller
                control={transferControl} name="from_warehouse_id"
                render={({ field }) => (
                  <TextField select label="Almacén origen" value={field.value || ""} error={!!transferErrors.from_warehouse_id} helperText={transferErrors.from_warehouse_id?.message} onChange={(e) => { setTransferSubmitError(""); field.onChange(Number(e.target.value) || 0); }} fullWidth>
                    <MenuItem value="">Selecciona origen</MenuItem>
                    {warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
                  </TextField>
                )} />
              <Controller
                control={transferControl} name="to_warehouse_id"
                render={({ field }) => (
                  <TextField select label="Almacén destino" value={field.value || ""} error={!!transferErrors.to_warehouse_id} helperText={transferErrors.to_warehouse_id?.message} onChange={(e) => { setTransferSubmitError(""); field.onChange(Number(e.target.value) || 0); }} fullWidth>
                    <MenuItem value="">Selecciona destino</MenuItem>
                    {warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
                  </TextField>
                )} />
              <Controller
                control={transferControl} name="product_id"
                render={({ field }) => (
                  <TextField select label="Producto" sx={{ gridColumn: "1 / -1" }} value={field.value || ""} error={!!transferErrors.product_id} helperText={transferErrors.product_id?.message} onChange={(e) => { setTransferSubmitError(""); field.onChange(Number(e.target.value) || 0); }} fullWidth>
                    <MenuItem value="">Selecciona un producto</MenuItem>
                    {products.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                  </TextField>
                )} />
              <TextField label="Cantidad" type="number" sx={{ gridColumn: "1 / -1" }} error={!!transferErrors.qty} helperText={transferErrors.qty?.message} inputProps={{ min: 1, step: 1 }} fullWidth {...registerTransfer("qty", { setValueAs: (v) => Number(v) || "0", onChange: () => setTransferSubmitError("") })} />
              <Button type="submit" variant="contained" sx={{ gridColumn: "1 / -1" }} disabled={!isTransferValid || isTransferSubmitting}>
                Confirmar transferencia
              </Button>
            </Box>
          </Paper>

          <Paper className="glass-panel" sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 3, borderBottom: "1px solid var(--border-subtle)", pb: 1 }}>Ajustes de stock</Typography>
            <Box component="form" onSubmit={handleAdjustmentSubmit(onAdjust)} sx={{ display: "grid", gap: 2 }}>
              {adjustmentSubmitError && <Alert severity="error">{adjustmentSubmitError}</Alert>}
              <Controller
                control={adjustmentControl} name="product_id"
                render={({ field }) => (
                  <TextField select label="Producto" value={field.value || ""} error={!!adjustmentErrors.product_id} helperText={adjustmentErrors.product_id?.message} onChange={(e) => { setAdjustmentSubmitError(""); field.onChange(Number(e.target.value) || 0); }} fullWidth>
                    <MenuItem value="">Selecciona un producto</MenuItem>
                    {products.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                  </TextField>
                )} />
              <TextField label="Cantidad del ajuste (ej. -5 o 10)" type="number" error={!!adjustmentErrors.qty} helperText={adjustmentErrors.qty?.message} fullWidth {...registerAdjustment("qty", { setValueAs: (v) => Number(v) || "0", onChange: () => setAdjustmentSubmitError("") })} />
              <TextField label="Referencia" error={!!adjustmentErrors.ref} helperText={adjustmentErrors.ref?.message} fullWidth {...registerAdjustment("ref", { onChange: () => setAdjustmentSubmitError("") })} />
              <Button type="submit" variant="contained" disabled={!isAdjustmentValid || isAdjustmentSubmitting}>
                Guardar ajuste
              </Button>
            </Box>
          </Paper>

          <Paper className="glass-panel" sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 3, borderBottom: "1px solid var(--border-subtle)", pb: 1 }}>Lotes</Typography>
            <Box component="form" onSubmit={handleBatchSubmit(onBatch)} sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(2, 1fr)" }}>
              {batchSubmitError && <Alert severity="error" sx={{ gridColumn: "1 / -1" }}>{batchSubmitError}</Alert>}
              <Controller
                control={batchControl} name="warehouse_id"
                render={({ field }) => (
                  <TextField select label="Almacén" value={field.value || ""} error={!!batchErrors.warehouse_id} helperText={batchErrors.warehouse_id?.message} onChange={(e) => { setBatchSubmitError(""); field.onChange(Number(e.target.value) || 0); }} fullWidth>
                    <MenuItem value="">Selecciona</MenuItem>
                    {warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
                  </TextField>
                )} />
              <Controller
                control={batchControl} name="product_id"
                render={({ field }) => (
                  <TextField select label="Producto" value={field.value || ""} error={!!batchErrors.product_id} helperText={batchErrors.product_id?.message} onChange={(e) => { setBatchSubmitError(""); field.onChange(Number(e.target.value) || 0); }} fullWidth>
                    <MenuItem value="">Selecciona un producto</MenuItem>
                    {products.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                  </TextField>
                )} />
              <TextField label="Código de lote" sx={{ gridColumn: "1 / -1" }} error={!!batchErrors.lot} helperText={batchErrors.lot?.message} fullWidth {...registerBatch("lot", { onChange: () => setBatchSubmitError("") })} />
              <TextField label="Fecha de vencimiento" type="date" InputLabelProps={{ shrink: true }} error={!!batchErrors.expiry_date} helperText={batchErrors.expiry_date?.message} fullWidth {...registerBatch("expiry_date", { onChange: () => setBatchSubmitError("") })} />
              <TextField label="Unidades Iniciales" type="number" error={!!batchErrors.qty} helperText={batchErrors.qty?.message} inputProps={{ min: 1, step: 1 }} fullWidth {...registerBatch("qty", { setValueAs: (v) => Number(v) || "0", onChange: () => setBatchSubmitError("") })} />
              <Button type="submit" variant="contained" sx={{ gridColumn: "1 / -1" }} disabled={!isBatchValid || isBatchSubmitting}>
                Guardar lote
              </Button>
            </Box>
          </Paper>
        </Box>
      ) : null}

      {tab === 2 ? (
        <Paper className="glass-panel" sx={{ p: { xs: 2, md: 3 }, mt: 2 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>Kardex</Typography>
          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, mb: 3 }}>
            <TextField
              select
              label="Producto"
              value={kardexProductId || ""}
              onChange={(event) => handleKardexProductChange(event.target.value === "" ? 0 : Number(event.target.value))}
              helperText="Selecciona un ítem para revisar su movimiento histórico."
              fullWidth
            >
              <MenuItem value="">[ NO ESPECIFICADO ]</MenuItem>
              {products.map((product) => (
                <MenuItem key={product.id} value={product.id}>{product.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Tipo de movimiento"
              value={kardexType}
              onChange={(event) => {
                setKardexType(event.target.value);
                resetKardexPagination();
              }}
              fullWidth
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="IN">IN</MenuItem>
              <MenuItem value="OUT">OUT</MenuItem>
              <MenuItem value="ADJ">ADJ</MenuItem>
              <MenuItem value="TRF">TRF</MenuItem>
            </TextField>
            <TextField
              type="date"
              label="Desde"
              InputLabelProps={{ shrink: true }}
              value={kardexFrom}
              onChange={(event) => {
                setKardexFrom(event.target.value);
                resetKardexPagination();
              }}
            />
            <TextField
              type="date"
              label="Hasta"
              InputLabelProps={{ shrink: true }}
              value={kardexTo}
              onChange={(event) => {
                setKardexTo(event.target.value);
                resetKardexPagination();
              }}
            />
            <TextField
              type="number"
              label="Filas por página"
              value={kardexLimit}
              onChange={(event) => {
                const nextValue = Number(event.target.value || 50);
                setKardexLimit(Math.max(1, Math.min(500, nextValue)));
                resetKardexPagination();
              }}
              inputProps={{ min: 1, max: 500 }}
            />
            <Button variant="outlined" onClick={() => { setKardexFrom(""); setKardexTo(""); setKardexType(""); resetKardexPagination(); }}>
              Limpiar filtros
            </Button>
          </Box>

          {kardexProductId === 0 ? (
            <EmptyState title="Selecciona un producto" description="El kardex necesita un producto para mostrar sus movimientos." icon={<Inventory2Icon color="disabled" sx={{ fontSize: 40 }} />} />
          ) : kardexLoading ? (
            <LoadingState title="Cargando movimientos..." rows={4} />
          ) : kardexError ? (
            <ErrorState title="No se pudo cargar el kardex" onRetry={() => refetchKardex()} />
          ) : (kardex?.items || []).length === 0 ? (
            <EmptyState title="Sin movimientos" description="No hay movimientos con los filtros actuales." icon={<Inventory2Icon color="disabled" sx={{ fontSize: 40 }} />} />
          ) : (
            <>
              <ResizableTable minHeight={400}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Fecha y hora</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Tipo de operación</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Cantidad</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Comprobante</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(kardex?.items || []).map((movement) => (
                      <TableRow key={movement.id} hover>
                        <TableCell>{movement.created_at}</TableCell>
                        <TableCell>
                          <Chip size="small" label={movement.type} color={movement.type === "ADJ" ? "warning" : movement.type === "TRF" ? "info" : movement.qty > 0 ? "success" : "error"} variant="outlined" />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, color: movement.qty > 0 ? "success.main" : "error.main" }}>{movement.qty > 0 ? `+${movement.qty}` : movement.qty}</TableCell>
                        <TableCell sx={{ fontFamily: "monospace" }}>{movement.ref || "---"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ResizableTable>
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Button variant="outlined" onClick={handleKardexPrevPage} disabled={!kardexCursorStack.length}>
                  Anterior
                </Button>
                <Button variant="outlined" onClick={handleKardexNextPage} disabled={!kardex?.has_more || !kardex?.next_cursor}>
                  Siguiente
                </Button>
                <Chip size="small" label={`Mostrando ${kardex?.items.length || 0} registros`} />
              </Stack>
            </>
          )}
        </Paper>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        title="Procesar Importación"
        description={file ? `Se importaran permanentemente ${totalRows} registros del conjunto de datos asociado a ${file.name}. La acción puede generar demoras en base a volumetría.` : undefined}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmUpload}
        confirmText="Confirmar y Sobrescribir"
        loading={uploadLoading}
      />
    </Box>
  );
};

export default Inventory;
