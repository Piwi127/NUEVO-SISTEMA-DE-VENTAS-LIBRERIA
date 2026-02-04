import React, { useState } from "react";
import {
  Box,
  Button,
  MenuItem,
  Paper,
  TextField,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Divider,
  Chip,
  Tabs,
  Tab,
  Grid,
  useMediaQuery,
  Stack,
} from "@mui/material";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import DownloadIcon from "@mui/icons-material/Download";
import { PageHeader } from "../../components/PageHeader";
import { LoadingState } from "../../components/LoadingState";
import { ErrorState } from "../../components/ErrorState";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { listProducts } from "../../api/products";
import { createInventoryMovement, getKardex, uploadInventory, downloadInventoryTemplate, downloadInventoryTemplateXlsx } from "../../api/inventory";
import { listWarehouses, createWarehouse, createTransfer, createBatch, createCount } from "../../api/warehouses";
import { useToast } from "../../components/ToastProvider";
import { useAuth } from "../../auth/AuthProvider";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { useSettings } from "../../store/useSettings";

const REQUIRED = ["sku", "name", "category", "price", "cost", "stock", "stock_min"];
const PREVIEW_LIMIT = 15;

type PreviewRow = Record<string, string | number>;

const Inventory: React.FC = () => {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { role } = useAuth();
  const productsQuery = useQuery({ queryKey: ["products"], queryFn: () => listProducts() });
  const warehousesQuery = useQuery({ queryKey: ["warehouses"], queryFn: () => listWarehouses() });
  const products = productsQuery.data;
  const warehouses = warehousesQuery.data;
  const baseLoading = productsQuery.isLoading || warehousesQuery.isLoading;
  const baseError = productsQuery.isError || warehousesQuery.isError;
  const compact = useMediaQuery("(max-width:900px)");
  const { compactMode } = useSettings();
  const isCompact = compactMode || compact;

  const [productId, setProductId] = useState<number | "">("");
  const [qty, setQty] = useState(0);
  const [ref, setRef] = useState("ADJ:manual");

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [whName, setWhName] = useState("");
  const [whLocation, setWhLocation] = useState("");

  const [fromWh, setFromWh] = useState<number | "">("");
  const [toWh, setToWh] = useState<number | "">("");
  const [transferProduct, setTransferProduct] = useState<number | "">("");
  const [transferQty, setTransferQty] = useState(0);

  const [batchWh, setBatchWh] = useState<number | "">("");
  const [batchProduct, setBatchProduct] = useState<number | "">("");
  const [batchLot, setBatchLot] = useState("");
  const [batchExpiry, setBatchExpiry] = useState("");
  const [batchQty, setBatchQty] = useState(0);

  const [countWh, setCountWh] = useState<number | "">("");
  const [countProduct, setCountProduct] = useState<number | "">("");
  const [countQty, setCountQty] = useState(0);

  const { data: kardex } = useQuery({
    queryKey: ["kardex", productId],
    queryFn: () => (productId ? getKardex(productId as number) : Promise.resolve([])),
  });

  const [tab, setTab] = useState(0);

  if (baseError) {
    return (
      <Box sx={{ display: "grid", gap: 2 }}>
        <PageHeader
          title="Inventario"
          subtitle="Carga masiva, operaciones y kardex."
          icon={<Inventory2Icon color="primary" />}
          chips={[`Rol: ${role}`, `Productos: ${products?.length ?? 0}`]}
          loading={baseLoading}
        />
        <Paper sx={{ p: 2 }}>
          <ErrorState title="No se pudo cargar inventario" onRetry={() => { productsQuery.refetch(); warehousesQuery.refetch(); }} />
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
          chips={[`Rol: ${role}`, `Productos: ${products?.length ?? 0}`]}
          loading={baseLoading}
        />
        <Paper sx={{ p: 2 }}>
          <LoadingState title="Cargando inventario..." rows={3} />
        </Paper>
      </Box>
    );
  }

  const handleSubmit = async () => {
    if (!productId) return;
    await createInventoryMovement({ product_id: Number(productId), type: "ADJ", qty, ref });
    showToast({ message: "Movimiento registrado", severity: "success" });
    qc.invalidateQueries({ queryKey: ["kardex", productId] });
    qc.invalidateQueries({ queryKey: ["products"] });
  };

  const handleDownload = async () => {
    const blob = await downloadInventoryTemplate();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventario_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadXlsx = async () => {
    const blob = await downloadInventoryTemplateXlsx();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventario_template.xlsx";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const validateColumns = (header: string[]) => {
    const missing = REQUIRED.filter((c) => !header.includes(c));
    if (missing.length) {
      showToast({ message: `Faltan columnas: ${missing.join(", ")}`, severity: "error" });
      return false;
    }
    return true;
  };

  const buildPreview = (rows: PreviewRow[]) => {
    setTotalRows(rows.length);
    setPreview(rows.slice(0, PREVIEW_LIMIT));
  };

  const parseCsv = async (f: File) => {
    const text = await f.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
    const header = lines[0].split(",").map((h) => h.trim());
    if (!validateColumns(header)) return false;
    const rows = lines.slice(1).map((line) => {
      const values = line.split(",");
      const obj: PreviewRow = {};
      header.forEach((h, i) => (obj[h] = values[i] ?? ""));
      return obj;
    });
    buildPreview(rows);
    return true;
  };

  const parseXlsx = async (f: File) => {
    const buf = await f.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
    const header = (rows[0] || []).map((h) => String(h).trim());
    if (!validateColumns(header)) return false;
    const dataRows = rows.slice(1).map((r) => {
      const obj: PreviewRow = {};
      header.forEach((h, i) => (obj[h] = r[i] ?? ""));
      return obj;
    });
    buildPreview(dataRows);
    return true;
  };

  const handleFileChange = async (f: File | null) => {
    setFile(f);
    setPreview([]);
    setTotalRows(0);
    if (!f) return;
    const name = f.name.toLowerCase();
    if (name.endsWith(".csv")) {
      await parseCsv(f);
    } else if (name.endsWith(".xlsx")) {
      await parseXlsx(f);
    } else {
      showToast({ message: "Formato no soportado", severity: "error" });
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setConfirmOpen(true);
  };

  const confirmUpload = async () => {
    if (!file) return;
    setConfirmOpen(false);
    try {
      const res = await uploadInventory(file);
      showToast({ message: `Carga masiva ok (${res.count})`, severity: "success" });
      qc.invalidateQueries({ queryKey: ["products"] });
      setFile(null);
      setPreview([]);
      setTotalRows(0);
    } catch (err: any) {
      showToast({ message: err?.response?.data?.detail || "Error en carga", severity: "error" });
    }
  };

  const handleCreateWarehouse = async () => {
    if (!whName) return;
    await createWarehouse({ name: whName, location: whLocation });
    showToast({ message: "Almacen creado", severity: "success" });
    setWhName("");
    setWhLocation("");
    qc.invalidateQueries({ queryKey: ["warehouses"] });
  };

  const handleTransfer = async () => {
    if (!fromWh || !toWh || !transferProduct || transferQty <= 0) return;
    await createTransfer({ from_warehouse_id: Number(fromWh), to_warehouse_id: Number(toWh), items: [{ product_id: Number(transferProduct), qty: transferQty }] });
    showToast({ message: "Transferencia realizada", severity: "success" });
  };

  const handleBatch = async () => {
    if (!batchWh || !batchProduct || !batchLot) return;
    await createBatch({ warehouse_id: Number(batchWh), product_id: Number(batchProduct), lot: batchLot, expiry_date: batchExpiry, qty: batchQty });
    showToast({ message: "Lote registrado", severity: "success" });
  };

  const handleCount = async () => {
    if (!countWh || !countProduct) return;
    await createCount({ warehouse_id: Number(countWh), product_id: Number(countProduct), counted_qty: countQty });
    showToast({ message: "Conteo registrado", severity: "success" });
  };

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <PageHeader
        title="Inventario"
        subtitle="Carga masiva, operaciones y kardex."
        icon={<Inventory2Icon color="primary" />}
        chips={[`Rol: ${role}`, `Productos: ${products?.length ?? 0}`]}
        loading={baseLoading}
      />

      <Paper sx={{ p: 1 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" allowScrollButtonsMobile>
          <Tab label="Carga masiva" />
          <Tab label="Operaciones" />
          <Tab label="Kardex" />
        </Tabs>
      </Paper>

      {tab === 0 && role === "admin" && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Carga masiva</Typography>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownload}>Plantilla CSV</Button>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownloadXlsx}>Plantilla XLSX</Button>
            <TextField type="file" inputProps={{ accept: ".csv,.xlsx" }} onChange={(e) => handleFileChange(e.target.files?.[0] || null)} />
            <Button variant="contained" onClick={handleUpload} disabled={!file}>Subir archivo</Button>
            <Chip label={`Columnas: ${REQUIRED.join(", ")}`} size="small" />
          </Box>

          {preview.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Vista previa (primeras {PREVIEW_LIMIT} filas)</Typography>
              {isCompact ? (
                <Box sx={{ display: "grid", gap: 1 }}>
                  {preview.map((row, idx) => (
                    <Paper key={idx} sx={{ p: 1.5 }}>
                      {REQUIRED.map((h) => (
                        <Box key={h} sx={{ display: "flex", justifyContent: "space-between" }}>
                          <Typography variant="body2" color="text.secondary">{h}</Typography>
                          <Typography variant="body2">{String(row[h] ?? "")}</Typography>
                        </Box>
                      ))}
                    </Paper>
                  ))}
                </Box>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {REQUIRED.map((h) => (
                        <TableCell key={h}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {preview.map((row, idx) => (
                      <TableRow key={idx}>
                        {REQUIRED.map((h) => (
                          <TableCell key={h}>{String(row[h] ?? "")}</TableCell>
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
          )}
        </Paper>
      )}

      {tab === 1 && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Almacenes</Typography>
              <Box sx={{ display: "grid", gap: 2 }}>
                <TextField label="Nombre" value={whName} onChange={(e) => setWhName(e.target.value)} />
                <TextField label="Ubicacion" value={whLocation} onChange={(e) => setWhLocation(e.target.value)} />
                <Button variant="contained" onClick={handleCreateWarehouse}>Crear almacen</Button>
              </Box>
            </Paper>

            <Paper sx={{ p: 2, mt: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Ajuste de inventario</Typography>
              <Box sx={{ display: "grid", gap: 2 }}>
                <TextField select label="Producto" value={productId} onChange={(e) => setProductId(Number(e.target.value))}>
                  {(products || []).map((p) => (
                    <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                  ))}
                </TextField>
                <TextField label="Cantidad" type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
                <TextField label="Referencia" value={ref} onChange={(e) => setRef(e.target.value)} />
                <Button variant="contained" onClick={handleSubmit}>Registrar</Button>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={7}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Transferencias</Typography>
              <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: isCompact ? "1fr" : "repeat(auto-fit, minmax(200px, 1fr))" }}>
                <TextField select label="Almacen origen" value={fromWh} onChange={(e) => setFromWh(Number(e.target.value))}>
                  {(warehouses || []).map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
                </TextField>
                <TextField select label="Almacen destino" value={toWh} onChange={(e) => setToWh(Number(e.target.value))}>
                  {(warehouses || []).map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
                </TextField>
                <TextField select label="Producto" value={transferProduct} onChange={(e) => setTransferProduct(Number(e.target.value))}>
                  {(products || []).map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                </TextField>
                <TextField label="Cantidad" type="number" value={transferQty} onChange={(e) => setTransferQty(Number(e.target.value))} />
                <Button variant="contained" onClick={handleTransfer}>Transferir</Button>
              </Box>
            </Paper>

            <Paper sx={{ p: 2, mt: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Lotes</Typography>
              <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: isCompact ? "1fr" : "repeat(auto-fit, minmax(200px, 1fr))" }}>
                <TextField select label="Almacen" value={batchWh} onChange={(e) => setBatchWh(Number(e.target.value))}>
                  {(warehouses || []).map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
                </TextField>
                <TextField select label="Producto" value={batchProduct} onChange={(e) => setBatchProduct(Number(e.target.value))}>
                  {(products || []).map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                </TextField>
                <TextField label="Lote" value={batchLot} onChange={(e) => setBatchLot(e.target.value)} />
                <TextField label="Vencimiento" value={batchExpiry} onChange={(e) => setBatchExpiry(e.target.value)} />
                <TextField label="Cantidad" type="number" value={batchQty} onChange={(e) => setBatchQty(Number(e.target.value))} />
                <Button variant="contained" onClick={handleBatch}>Registrar lote</Button>
              </Box>
            </Paper>

            <Paper sx={{ p: 2, mt: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Conteo ciclico</Typography>
              <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: isCompact ? "1fr" : "repeat(auto-fit, minmax(200px, 1fr))" }}>
                <TextField select label="Almacen" value={countWh} onChange={(e) => setCountWh(Number(e.target.value))}>
                  {(warehouses || []).map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
                </TextField>
                <TextField select label="Producto" value={countProduct} onChange={(e) => setCountProduct(Number(e.target.value))}>
                  {(products || []).map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                </TextField>
                <TextField label="Cantidad contada" type="number" value={countQty} onChange={(e) => setCountQty(Number(e.target.value))} />
                <Button variant="contained" onClick={handleCount}>Registrar conteo</Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {tab === 2 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">Kardex</Typography>
          <Divider sx={{ my: 2 }} />
          {isCompact ? (
            <Box sx={{ display: "grid", gap: 1, maxHeight: 320, overflow: "auto" }}>
              {(kardex || []).map((k) => (
                <Paper key={k.id} sx={{ p: 1.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{k.type} • {k.qty}</Typography>
                  <Typography variant="body2" color="text.secondary">{k.created_at}</Typography>
                  <Typography variant="body2">{k.ref}</Typography>
                </Paper>
              ))}
            </Box>
          ) : (
            <Box sx={{ maxHeight: 320, overflow: "auto" }}>
              {(kardex || []).map((k) => (
                <Typography key={k.id} variant="body2">{k.created_at} | {k.type} | {k.qty} | {k.ref}</Typography>
              ))}
            </Box>
          )}
        </Paper>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Confirmar importacion"
        content={<Box><Typography>?Desea importar {totalRows} registros?</Typography></Box>}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmUpload}
      />
    </Box>
  );
};

export default Inventory;
