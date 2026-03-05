import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  MenuItem,
  Paper,
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
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ConfirmDialog, EmptyState, ErrorState, LoadingState, PageHeader, useToast } from "@/app/components";
import { useAuth } from "@/auth/AuthProvider";
import { listProducts } from "@/modules/catalog/api";
import {
  createInventoryMovement,
  downloadInventoryTemplate,
  downloadInventoryTemplateXlsx,
  getKardex,
  uploadInventory,
} from "@/modules/inventory/api";
import { createBatch, createCount, createTransfer, createWarehouse, listWarehouses } from "@/modules/inventory/api";
import { useSettings } from "@/app/store";

const REQUIRED = ["sku", "name", "category", "price", "cost", "stock", "stock_min"];
const PREVIEW_LIMIT = 15;

type PreviewRow = Record<string, string | number>;

const requiredSelectSchema = z.number().int().positive("Selecciona una opcion.");
const positiveIntegerSchema = z.number().int("Ingresa un numero entero.").min(1, "Debe ser al menos 1.");
const nonNegativeIntegerSchema = z.number().int("Ingresa un numero entero.").min(0, "No puede ser negativo.");
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

const countFormSchema = z.object({
  warehouse_id: requiredSelectSchema,
  product_id: requiredSelectSchema,
  counted_qty: nonNegativeIntegerSchema,
});

type WarehouseFormValues = z.infer<typeof warehouseFormSchema>;
type AdjustmentFormValues = z.infer<typeof adjustmentFormSchema>;
type TransferFormValues = z.infer<typeof transferFormSchema>;
type BatchFormValues = z.infer<typeof batchFormSchema>;
type CountFormValues = z.infer<typeof countFormSchema>;

const defaultWarehouseValues: WarehouseFormValues = {
  name: "",
  location: "",
};

const defaultAdjustmentValues: AdjustmentFormValues = {
  product_id: 0,
  qty: 0,
  ref: "ADJ:manual",
};

const defaultTransferValues: TransferFormValues = {
  from_warehouse_id: 0,
  to_warehouse_id: 0,
  product_id: 0,
  qty: 1,
};

const defaultBatchValues: BatchFormValues = {
  warehouse_id: 0,
  product_id: 0,
  lot: "",
  expiry_date: "",
  qty: 1,
};

const defaultCountValues: CountFormValues = {
  warehouse_id: 0,
  product_id: 0,
  counted_qty: 0,
};

const parseCsvLine = (line: string) => {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  values.push(current.trim());
  return values;
};

const Inventory: React.FC = () => {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { role } = useAuth();
  const compact = useMediaQuery("(max-width:900px)");
  const { compactMode } = useSettings();
  const isCompact = compactMode || compact;

  const productsQuery = useQuery({ queryKey: ["products"], queryFn: () => listProducts() });
  const warehousesQuery = useQuery({ queryKey: ["warehouses"], queryFn: () => listWarehouses() });

  const products = productsQuery.data || [];
  const warehouses = warehousesQuery.data || [];
  const baseLoading = productsQuery.isLoading || warehousesQuery.isLoading;
  const baseError = productsQuery.isError || warehousesQuery.isError;

  const [tab, setTab] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [kardexProductId, setKardexProductId] = useState(0);

  const { data: kardex, isLoading: kardexLoading, isError: kardexError, refetch: refetchKardex } = useQuery({
    queryKey: ["kardex", kardexProductId],
    queryFn: () => getKardex(kardexProductId),
    enabled: kardexProductId > 0,
  });

  const {
    register: registerWarehouse,
    reset: resetWarehouse,
    handleSubmit: handleWarehouseSubmit,
    formState: { errors: warehouseErrors, isDirty: isWarehouseDirty, isSubmitting: isWarehouseSubmitting, isValid: isWarehouseValid },
  } = useForm<WarehouseFormValues>({ resolver: zodResolver(warehouseFormSchema), mode: "onChange", defaultValues: defaultWarehouseValues });

  const {
    control: adjustmentControl,
    register: registerAdjustment,
    reset: resetAdjustment,
    handleSubmit: handleAdjustmentSubmit,
    formState: { errors: adjustmentErrors, isDirty: isAdjustmentDirty, isSubmitting: isAdjustmentSubmitting, isValid: isAdjustmentValid },
  } = useForm<AdjustmentFormValues>({ resolver: zodResolver(adjustmentFormSchema), mode: "onChange", defaultValues: defaultAdjustmentValues });

  const {
    control: transferControl,
    register: registerTransfer,
    reset: resetTransfer,
    handleSubmit: handleTransferSubmit,
    formState: { errors: transferErrors, isDirty: isTransferDirty, isSubmitting: isTransferSubmitting, isValid: isTransferValid },
  } = useForm<TransferFormValues>({ resolver: zodResolver(transferFormSchema), mode: "onChange", defaultValues: defaultTransferValues });

  const {
    control: batchControl,
    register: registerBatch,
    reset: resetBatch,
    handleSubmit: handleBatchSubmit,
    formState: { errors: batchErrors, isDirty: isBatchDirty, isSubmitting: isBatchSubmitting, isValid: isBatchValid },
  } = useForm<BatchFormValues>({ resolver: zodResolver(batchFormSchema), mode: "onChange", defaultValues: defaultBatchValues });

  const {
    control: countControl,
    register: registerCount,
    reset: resetCount,
    handleSubmit: handleCountSubmit,
    formState: { errors: countErrors, isDirty: isCountDirty, isSubmitting: isCountSubmitting, isValid: isCountValid },
  } = useForm<CountFormValues>({ resolver: zodResolver(countFormSchema), mode: "onChange", defaultValues: defaultCountValues });

  const [warehouseSubmitError, setWarehouseSubmitError] = useState("");
  const [adjustmentSubmitError, setAdjustmentSubmitError] = useState("");
  const [transferSubmitError, setTransferSubmitError] = useState("");
  const [batchSubmitError, setBatchSubmitError] = useState("");
  const [countSubmitError, setCountSubmitError] = useState("");


  const extractErrorDetail = (error: unknown, fallback: string) => {
    const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
    return typeof detail === "string" && detail.trim() ? detail : fallback;
  };

  const downloadBlob = async (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const validateColumns = (header: string[]) => {
    const missing = REQUIRED.filter((column) => !header.includes(column));
    if (missing.length > 0) {
      const message = `Faltan columnas: ${missing.join(", ")}`;
      setUploadError(message);
      showToast({ message, severity: "error" });
      return false;
    }
    return true;
  };

  const buildPreview = (rows: PreviewRow[]) => {
    setTotalRows(rows.length);
    setPreview(rows.slice(0, PREVIEW_LIMIT));
  };

  const parseCsv = async (selectedFile: File) => {
    const text = await selectedFile.text();
    const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
    if (lines.length === 0) {
      setUploadError("El archivo esta vacio.");
      return false;
    }
    const header = parseCsvLine(lines[0]).map((value) => value.trim());
    if (!validateColumns(header)) return false;
    const rows = lines.slice(1).map((line) => {
      const values = parseCsvLine(line);
      const row: PreviewRow = {};
      header.forEach((column, index) => {
        row[column] = values[index] ?? "";
      });
      return row;
    });
    buildPreview(rows);
    return true;
  };

  const parseXlsx = async (selectedFile: File) => {
    const XLSX = await import("xlsx");
    const buffer = await selectedFile.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
    const header = (rows[0] || []).map((value) => String(value).trim());
    if (!validateColumns(header)) return false;
    const dataRows = rows.slice(1).map((rawRow) => {
      const row: PreviewRow = {};
      header.forEach((column, index) => {
        row[column] = rawRow[index] ?? "";
      });
      return row;
    });
    buildPreview(dataRows);
    return true;
  };

  const handleFileChange = async (selectedFile: File | null) => {
    setUploadError("");
    setPreview([]);
    setTotalRows(0);
    setFile(selectedFile);
    if (!selectedFile) return;

    const fileName = selectedFile.name.toLowerCase();
    const isValid = fileName.endsWith(".csv")
      ? await parseCsv(selectedFile)
      : fileName.endsWith(".xlsx")
        ? await parseXlsx(selectedFile)
        : false;

    if (!fileName.endsWith(".csv") && !fileName.endsWith(".xlsx")) {
      const message = "Formato no soportado. Usa CSV o XLSX.";
      setUploadError(message);
      showToast({ message, severity: "error" });
    }

    if (!isValid) {
      setFile(null);
      setPreview([]);
      setTotalRows(0);
    }
  };

  const handleUpload = () => {
    if (!file || totalRows === 0) {
      setUploadError("Selecciona un archivo valido antes de importar.");
      return;
    }
    setConfirmOpen(true);
  };
  const confirmUpload = async () => {
    if (!file) return;
    setConfirmOpen(false);
    setUploadLoading(true);
    try {
      const result = await uploadInventory(file);
      showToast({ message: `Carga masiva ok (${result.count})`, severity: "success" });
      await qc.invalidateQueries({ queryKey: ["products"] });
      setFile(null);
      setPreview([]);
      setTotalRows(0);
      setUploadError("");
    } catch (error: unknown) {
      const message = extractErrorDetail(error, "Error en la carga masiva.");
      setUploadError(message);
      showToast({ message, severity: "error" });
    } finally {
      setUploadLoading(false);
    }
  };

  const onCreateWarehouse = async (values: WarehouseFormValues) => {
    setWarehouseSubmitError("");
    try {
      await createWarehouse({ name: values.name.trim(), location: values.location.trim() });
      showToast({ message: "Almacen creado", severity: "success" });
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
      showToast({ message: "Movimiento registrado", severity: "success" });
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
      showToast({ message: "Transferencia realizada", severity: "success" });
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
      showToast({ message: "Lote registrado", severity: "success" });
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

  const onCount = async (values: CountFormValues) => {
    setCountSubmitError("");
    try {
      await createCount({ warehouse_id: values.warehouse_id, product_id: values.product_id, counted_qty: values.counted_qty });
      showToast({ message: "Conteo registrado", severity: "success" });
      resetCount(defaultCountValues);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["products"] }),
        qc.invalidateQueries({ queryKey: ["kardex"] }),
      ]);
    } catch (error: unknown) {
      const message = extractErrorDetail(error, "No se pudo registrar el conteo.");
      setCountSubmitError(message);
      showToast({ message, severity: "error" });
    }
  };

  if (baseError) {
    return (
      <Box sx={{ display: "grid", gap: 2 }}>
        <PageHeader
          title="Inventario"
          subtitle="Carga masiva, operaciones y kardex."
          icon={<Inventory2Icon color="primary" />}
          chips={[`Rol: ${role}`, `Productos: ${products.length}`]}
          loading={baseLoading}
        />
        <Paper sx={{ p: 2 }}>
          <ErrorState
            title="No se pudo cargar inventario"
            onRetry={() => {
              productsQuery.refetch();
              warehousesQuery.refetch();
            }}
          />
        </Paper>
      </Box>
    );
  }

  if (baseLoading) {
    return (
      <Box sx={{ display: "grid", gap: 2 }}>
        <PageHeader
          title="Inventario"
          subtitle="Carga masiva, operaciones y kardex."
          icon={<Inventory2Icon color="primary" />}
          chips={[`Rol: ${role}`, `Productos: ${products.length}`]}
          loading
        />
        <Paper sx={{ p: 2 }}>
          <LoadingState title="Cargando inventario..." rows={3} />
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <PageHeader
        title="Inventario"
        subtitle="Carga masiva, operaciones y kardex."
        icon={<Inventory2Icon color="primary" />}
        chips={[`Rol: ${role}`, `Productos: ${products.length}`, `Almacenes: ${warehouses.length}`]}
      />

      <Paper sx={{ p: 1 }}>
        <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" allowScrollButtonsMobile>
          <Tab label="Carga masiva" />
          <Tab label="Operaciones" />
          <Tab label="Kardex" />
        </Tabs>
      </Paper>

      {tab === 0 ? (
        role !== "admin" ? (
          <Paper sx={{ p: 2 }}>
            <EmptyState title="Sin acceso a carga masiva" description="Solo administradores pueden importar inventario." icon={<Inventory2Icon color="disabled" />} />
          </Paper>
        ) : (
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Carga masiva
            </Typography>
            {uploadError ? <Alert severity="error" sx={{ mb: 2 }}>{uploadError}</Alert> : null}
            {file ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                Archivo listo para importar: {file.name}
              </Typography>
            ) : null}
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
              <Button type="button" variant="outlined" startIcon={<DownloadIcon />} onClick={async () => downloadBlob(await downloadInventoryTemplate(), "inventario_template.csv")}>
                Plantilla CSV
              </Button>
              <Button type="button" variant="outlined" startIcon={<DownloadIcon />} onClick={async () => downloadBlob(await downloadInventoryTemplateXlsx(), "inventario_template.xlsx")}>
                Plantilla XLSX
              </Button>
              <Button variant="outlined" component="label">
                Seleccionar archivo
                <input hidden type="file" accept=".csv,.xlsx" onChange={(event) => handleFileChange(event.currentTarget.files?.[0] || null)} />
              </Button>
              <Button type="button" variant="contained" onClick={handleUpload} disabled={!file || uploadLoading}>
                {uploadLoading ? "Importando..." : "Subir archivo"}
              </Button>
              <Chip label={`Columnas: ${REQUIRED.join(", ")}`} size="small" />
            </Box>

            {preview.length > 0 ? (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  Vista previa (primeras {PREVIEW_LIMIT} filas)
                </Typography>
                {isCompact ? (
                  <Box sx={{ display: "grid", gap: 1 }}>
                    {preview.map((row, index) => (
                      <Paper key={index} sx={{ p: 1.5 }}>
                        {REQUIRED.map((column) => (
                          <Box key={column} sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                            <Typography variant="body2" color="text.secondary">{column}</Typography>
                            <Typography variant="body2">{String(row[column] ?? "")}</Typography>
                          </Box>
                        ))}
                      </Paper>
                    ))}
                  </Box>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {REQUIRED.map((column) => (
                          <TableCell key={column}>{column}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {preview.map((row, index) => (
                        <TableRow key={index}>
                          {REQUIRED.map((column) => (
                            <TableCell key={column}>{String(row[column] ?? "")}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
                  Total de filas detectadas: {totalRows}
                </Typography>
              </Box>
            ) : null}
          </Paper>
        )
      ) : null}

      {tab === 1 ? (
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "0.9fr 1.1fr" } }}>
          <Box sx={{ display: "grid", gap: 2 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Almacenes
              </Typography>
              <Box component="form" onSubmit={handleWarehouseSubmit(onCreateWarehouse)} sx={{ display: "grid", gap: 2 }}>
                {warehouseSubmitError ? <Alert severity="error">{warehouseSubmitError}</Alert> : null}
                {isWarehouseDirty ? <Typography variant="caption" color="text.secondary">Hay cambios pendientes en el almacen.</Typography> : null}
                <TextField
                  label="Nombre"
                  error={!!warehouseErrors.name}
                  helperText={warehouseErrors.name?.message || "Nombre visible del almacen."}
                  {...registerWarehouse("name", { onChange: () => setWarehouseSubmitError("") })}
                />
                <TextField
                  label="Ubicacion"
                  error={!!warehouseErrors.location}
                  helperText={warehouseErrors.location?.message || "Opcional. Direccion o referencia interna."}
                  {...registerWarehouse("location", { onChange: () => setWarehouseSubmitError("") })}
                />
                <Button type="submit" variant="contained" disabled={!isWarehouseValid || isWarehouseSubmitting}>
                  {isWarehouseSubmitting ? "Creando..." : "Crear almacen"}
                </Button>
              </Box>
            </Paper>

            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Ajuste de inventario
              </Typography>
              <Box component="form" onSubmit={handleAdjustmentSubmit(onAdjust)} sx={{ display: "grid", gap: 2 }}>
                {adjustmentSubmitError ? <Alert severity="error">{adjustmentSubmitError}</Alert> : null}
                {isAdjustmentDirty ? <Typography variant="caption" color="text.secondary">Hay cambios pendientes en el ajuste.</Typography> : null}
                <Controller
                  control={adjustmentControl}
                  name="product_id"
                  render={({ field }) => (
                    <TextField
                      select
                      label="Producto"
                      value={field.value || ""}
                      error={!!adjustmentErrors.product_id}
                      helperText={adjustmentErrors.product_id?.message || "Producto al que se aplicara el ajuste."}
                      onChange={(event) => {
                        setAdjustmentSubmitError("");
                        field.onChange(event.target.value === "" ? 0 : Number(event.target.value));
                      }}
                    >
                      <MenuItem value="">Seleccionar producto</MenuItem>
                      {products.map((product) => (
                        <MenuItem key={product.id} value={product.id}>{product.name}</MenuItem>
                      ))}
                    </TextField>
                  )}
                />
                <TextField
                  label="Cantidad"
                  type="number"
                  error={!!adjustmentErrors.qty}
                  helperText={adjustmentErrors.qty?.message || "Usa positivo o negativo segun el ajuste."}
                  inputProps={{ step: 1 }}
                  {...registerAdjustment("qty", {
                    setValueAs: (value) => (value === "" ? 0 : Number(value)),
                    onChange: () => setAdjustmentSubmitError(""),
                  })}
                />
                <TextField
                  label="Referencia"
                  error={!!adjustmentErrors.ref}
                  helperText={adjustmentErrors.ref?.message || "Motivo o referencia del ajuste."}
                  {...registerAdjustment("ref", { onChange: () => setAdjustmentSubmitError("") })}
                />
                <Button type="submit" variant="contained" disabled={!isAdjustmentValid || isAdjustmentSubmitting}>
                  {isAdjustmentSubmitting ? "Registrando..." : "Registrar ajuste"}
                </Button>
              </Box>
            </Paper>
          </Box>

          <Box sx={{ display: "grid", gap: 2 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Transferencias
              </Typography>
              <Box component="form" onSubmit={handleTransferSubmit(onTransfer)} sx={{ display: "grid", gap: 2, gridTemplateColumns: isCompact ? "1fr" : "repeat(auto-fit, minmax(200px, 1fr))" }}>
                {transferSubmitError ? <Alert severity="error" sx={{ gridColumn: "1 / -1" }}>{transferSubmitError}</Alert> : null}
                {isTransferDirty ? <Typography variant="caption" color="text.secondary" sx={{ gridColumn: "1 / -1" }}>Hay cambios pendientes en la transferencia.</Typography> : null}
                <Controller
                  control={transferControl}
                  name="from_warehouse_id"
                  render={({ field }) => (
                    <TextField
                      select
                      label="Almacen origen"
                      value={field.value || ""}
                      error={!!transferErrors.from_warehouse_id}
                      helperText={transferErrors.from_warehouse_id?.message || "Origen del stock."}
                      onChange={(event) => {
                        setTransferSubmitError("");
                        field.onChange(event.target.value === "" ? 0 : Number(event.target.value));
                      }}
                    >
                      <MenuItem value="">Seleccionar origen</MenuItem>
                      {warehouses.map((warehouse) => (
                        <MenuItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</MenuItem>
                      ))}
                    </TextField>
                  )}
                />
                <Controller
                  control={transferControl}
                  name="to_warehouse_id"
                  render={({ field }) => (
                    <TextField
                      select
                      label="Almacen destino"
                      value={field.value || ""}
                      error={!!transferErrors.to_warehouse_id}
                      helperText={transferErrors.to_warehouse_id?.message || "Destino del stock."}
                      onChange={(event) => {
                        setTransferSubmitError("");
                        field.onChange(event.target.value === "" ? 0 : Number(event.target.value));
                      }}
                    >
                      <MenuItem value="">Seleccionar destino</MenuItem>
                      {warehouses.map((warehouse) => (
                        <MenuItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</MenuItem>
                      ))}
                    </TextField>
                  )}
                />
                <Controller
                  control={transferControl}
                  name="product_id"
                  render={({ field }) => (
                    <TextField
                      select
                      label="Producto"
                      value={field.value || ""}
                      error={!!transferErrors.product_id}
                      helperText={transferErrors.product_id?.message || "Producto a transferir."}
                      onChange={(event) => {
                        setTransferSubmitError("");
                        field.onChange(event.target.value === "" ? 0 : Number(event.target.value));
                      }}
                    >
                      <MenuItem value="">Seleccionar producto</MenuItem>
                      {products.map((product) => (
                        <MenuItem key={product.id} value={product.id}>{product.name}</MenuItem>
                      ))}
                    </TextField>
                  )}
                />
                <TextField
                  label="Cantidad"
                  type="number"
                  error={!!transferErrors.qty}
                  helperText={transferErrors.qty?.message || "Cantidad total a mover."}
                  inputProps={{ min: 1, step: 1 }}
                  {...registerTransfer("qty", {
                    setValueAs: (value) => (value === "" ? 0 : Number(value)),
                    onChange: () => setTransferSubmitError(""),
                  })}
                />
                <Button type="submit" variant="contained" disabled={!isTransferValid || isTransferSubmitting} sx={{ gridColumn: isCompact ? "auto" : "1 / -1" }}>
                  {isTransferSubmitting ? "Transfiriendo..." : "Transferir"}
                </Button>
              </Box>
            </Paper>

            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Lotes
              </Typography>
              <Box component="form" onSubmit={handleBatchSubmit(onBatch)} sx={{ display: "grid", gap: 2, gridTemplateColumns: isCompact ? "1fr" : "repeat(auto-fit, minmax(200px, 1fr))" }}>
                {batchSubmitError ? <Alert severity="error" sx={{ gridColumn: "1 / -1" }}>{batchSubmitError}</Alert> : null}
                {isBatchDirty ? <Typography variant="caption" color="text.secondary" sx={{ gridColumn: "1 / -1" }}>Hay cambios pendientes en el lote.</Typography> : null}
                <Controller
                  control={batchControl}
                  name="warehouse_id"
                  render={({ field }) => (
                    <TextField
                      select
                      label="Almacen"
                      value={field.value || ""}
                      error={!!batchErrors.warehouse_id}
                      helperText={batchErrors.warehouse_id?.message || "Almacen donde se registra el lote."}
                      onChange={(event) => {
                        setBatchSubmitError("");
                        field.onChange(event.target.value === "" ? 0 : Number(event.target.value));
                      }}
                    >
                      <MenuItem value="">Seleccionar almacen</MenuItem>
                      {warehouses.map((warehouse) => (
                        <MenuItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</MenuItem>
                      ))}
                    </TextField>
                  )}
                />
                <Controller
                  control={batchControl}
                  name="product_id"
                  render={({ field }) => (
                    <TextField
                      select
                      label="Producto"
                      value={field.value || ""}
                      error={!!batchErrors.product_id}
                      helperText={batchErrors.product_id?.message || "Producto asociado al lote."}
                      onChange={(event) => {
                        setBatchSubmitError("");
                        field.onChange(event.target.value === "" ? 0 : Number(event.target.value));
                      }}
                    >
                      <MenuItem value="">Seleccionar producto</MenuItem>
                      {products.map((product) => (
                        <MenuItem key={product.id} value={product.id}>{product.name}</MenuItem>
                      ))}
                    </TextField>
                  )}
                />
                <TextField
                  label="Lote"
                  error={!!batchErrors.lot}
                  helperText={batchErrors.lot?.message || "Codigo interno del lote."}
                  {...registerBatch("lot", { onChange: () => setBatchSubmitError("") })}
                />
                <TextField
                  label="Vencimiento"
                  type="date"
                  error={!!batchErrors.expiry_date}
                  helperText={batchErrors.expiry_date?.message || "Opcional. Fecha de vencimiento."}
                  InputLabelProps={{ shrink: true }}
                  {...registerBatch("expiry_date", { onChange: () => setBatchSubmitError("") })}
                />
                <TextField
                  label="Cantidad"
                  type="number"
                  error={!!batchErrors.qty}
                  helperText={batchErrors.qty?.message || "Cantidad inicial del lote."}
                  inputProps={{ min: 1, step: 1 }}
                  {...registerBatch("qty", {
                    setValueAs: (value) => (value === "" ? 0 : Number(value)),
                    onChange: () => setBatchSubmitError(""),
                  })}
                />
                <Button type="submit" variant="contained" disabled={!isBatchValid || isBatchSubmitting} sx={{ gridColumn: isCompact ? "auto" : "1 / -1" }}>
                  {isBatchSubmitting ? "Registrando..." : "Registrar lote"}
                </Button>
              </Box>
            </Paper>

            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Conteo ciclico
              </Typography>
              <Box component="form" onSubmit={handleCountSubmit(onCount)} sx={{ display: "grid", gap: 2, gridTemplateColumns: isCompact ? "1fr" : "repeat(auto-fit, minmax(200px, 1fr))" }}>
                {countSubmitError ? <Alert severity="error" sx={{ gridColumn: "1 / -1" }}>{countSubmitError}</Alert> : null}
                {isCountDirty ? <Typography variant="caption" color="text.secondary" sx={{ gridColumn: "1 / -1" }}>Hay cambios pendientes en el conteo.</Typography> : null}
                <Controller
                  control={countControl}
                  name="warehouse_id"
                  render={({ field }) => (
                    <TextField
                      select
                      label="Almacen"
                      value={field.value || ""}
                      error={!!countErrors.warehouse_id}
                      helperText={countErrors.warehouse_id?.message || "Almacen donde se realiza el conteo."}
                      onChange={(event) => {
                        setCountSubmitError("");
                        field.onChange(event.target.value === "" ? 0 : Number(event.target.value));
                      }}
                    >
                      <MenuItem value="">Seleccionar almacen</MenuItem>
                      {warehouses.map((warehouse) => (
                        <MenuItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</MenuItem>
                      ))}
                    </TextField>
                  )}
                />
                <Controller
                  control={countControl}
                  name="product_id"
                  render={({ field }) => (
                    <TextField
                      select
                      label="Producto"
                      value={field.value || ""}
                      error={!!countErrors.product_id}
                      helperText={countErrors.product_id?.message || "Producto que se esta contando."}
                      onChange={(event) => {
                        setCountSubmitError("");
                        field.onChange(event.target.value === "" ? 0 : Number(event.target.value));
                      }}
                    >
                      <MenuItem value="">Seleccionar producto</MenuItem>
                      {products.map((product) => (
                        <MenuItem key={product.id} value={product.id}>{product.name}</MenuItem>
                      ))}
                    </TextField>
                  )}
                />
                <TextField
                  label="Cantidad contada"
                  type="number"
                  error={!!countErrors.counted_qty}
                  helperText={countErrors.counted_qty?.message || "Puede ser 0 si no hay unidades fisicas."}
                  inputProps={{ min: 0, step: 1 }}
                  {...registerCount("counted_qty", {
                    setValueAs: (value) => (value === "" ? 0 : Number(value)),
                    onChange: () => setCountSubmitError(""),
                  })}
                />
                <Button type="submit" variant="contained" disabled={!isCountValid || isCountSubmitting} sx={{ gridColumn: isCompact ? "auto" : "1 / -1" }}>
                  {isCountSubmitting ? "Registrando..." : "Registrar conteo"}
                </Button>
              </Box>
            </Paper>
          </Box>
        </Box>
      ) : null}

      {tab === 2 ? (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">Kardex</Typography>
          <Divider sx={{ my: 2 }} />
          <TextField
            select
            label="Producto"
            value={kardexProductId || ""}
            onChange={(event) => setKardexProductId(event.target.value === "" ? 0 : Number(event.target.value))}
            helperText="Selecciona un producto para ver su historial de movimientos."
            sx={{ minWidth: isCompact ? undefined : 320, mb: 2 }}
            fullWidth={isCompact}
          >
            <MenuItem value="">Seleccionar producto</MenuItem>
            {products.map((product) => (
              <MenuItem key={product.id} value={product.id}>{product.name}</MenuItem>
            ))}
          </TextField>

          {kardexProductId === 0 ? (
            <EmptyState title="Sin producto seleccionado" description="Elige un producto para cargar su kardex." icon={<Inventory2Icon color="disabled" />} />
          ) : kardexLoading ? (
            <LoadingState title="Cargando kardex..." />
          ) : kardexError ? (
            <ErrorState title="No se pudo cargar el kardex" onRetry={() => refetchKardex()} />
          ) : (kardex || []).length === 0 ? (
            <EmptyState title="Sin movimientos" description="Este producto no tiene movimientos registrados." icon={<Inventory2Icon color="disabled" />} />
          ) : isCompact ? (
            <Box sx={{ display: "grid", gap: 1, maxHeight: 360, overflow: "auto" }}>
              {(kardex || []).map((movement) => (
                <Paper key={movement.id} sx={{ p: 1.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {movement.type} | {movement.qty}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {movement.created_at}
                  </Typography>
                  <Typography variant="body2">{movement.ref}</Typography>
                </Paper>
              ))}
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Cantidad</TableCell>
                  <TableCell>Referencia</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(kardex || []).map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>{movement.created_at}</TableCell>
                    <TableCell>{movement.type}</TableCell>
                    <TableCell>{movement.qty}</TableCell>
                    <TableCell>{movement.ref}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        title="Confirmar importacion"
        description={file ? `Se importaran ${totalRows} registros desde ${file.name}.` : undefined}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmUpload}
        confirmText="Importar"
        loading={uploadLoading}
      />
    </Box>
  );
};

export default Inventory;


