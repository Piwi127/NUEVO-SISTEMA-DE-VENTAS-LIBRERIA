import React, { useState } from "react";
import {
  Box,
  Button,
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
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import DownloadIcon from "@mui/icons-material/Download";
import { useQuery } from "@tanstack/react-query";
import { CardTable } from "@/app/components";
import { EmptyState } from "@/app/components";
import { ErrorState } from "@/app/components";
import { LoadingState } from "@/app/components";
import { PageHeader } from "@/app/components";
import { TableToolbar } from "@/app/components";
import { useToast } from "@/app/components";
import { listProducts, listSuppliers } from "@/modules/catalog/api";
import { createPurchaseOrder, exportPurchases, listPurchaseOrderItems, listPurchaseOrders, listPurchases, receivePurchaseOrder, supplierPayment } from "@/modules/inventory/api";
import { useSettings } from "@/app/store";
import { formatMoney } from "@/app/utils";

const Purchases: React.FC = () => {
  const { showToast } = useToast();
  const compact = useMediaQuery("(max-width:900px)");
  const { compactMode } = useSettings();
  const isCompact = compactMode || compact;
  const [tab, setTab] = useState(0);

  const { data: products, isLoading: loadingProducts } = useQuery({ queryKey: ["products"], queryFn: () => listProducts(), staleTime: 60_000 });
  const { data: suppliers, isLoading: loadingSuppliers } = useQuery({ queryKey: ["suppliers"], queryFn: () => listSuppliers(), staleTime: 60_000 });
  const { data: orders, isLoading: loadingOrders } = useQuery({ queryKey: ["purchase-orders"], queryFn: () => listPurchaseOrders(), staleTime: 30_000 });

  const [supplierId, setSupplierId] = useState<number | "">("");
  const [productId, setProductId] = useState<number | "">("");
  const [qty, setQty] = useState(1);
  const [unitCost, setUnitCost] = useState(0);
  const [items, setItems] = useState<{ product_id: number; qty: number; unit_cost: number }[]>([]);

  const [receiveOrderId, setReceiveOrderId] = useState<number | "">("");
  const [receiveProductId, setReceiveProductId] = useState<number | "">("");
  const [receiveQty, setReceiveQty] = useState(0);
  const [orderItems, setOrderItems] = useState<{ product_id: number; qty: number; unit_cost: number; received_qty: number }[]>([]);

  const [paySupplierId, setPaySupplierId] = useState<number | "">("");
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState("TRANSFER");
  const [payRef, setPayRef] = useState("");

  const [histFrom, setHistFrom] = useState("");
  const [histTo, setHistTo] = useState("");
  const [histSupplier, setHistSupplier] = useState<number | "">("");
  const { data: purchases, isLoading: loadingPurchases, isError: purchasesError, refetch: refetchPurchases } = useQuery({
    queryKey: ["purchases-history", histFrom, histTo, histSupplier],
    queryFn: () =>
      listPurchases({
        from_date: histFrom || undefined,
        to: histTo || undefined,
        supplier_id: histSupplier ? Number(histSupplier) : undefined,
      }),
  });

  const purchaseRows = (purchases || []).map((p) => ({
    key: p.id,
    title: `Compra #${p.id}`,
    subtitle: `Proveedor: ${p.supplier_id}`,
    right: <Typography sx={{ fontWeight: 700 }}>{formatMoney(p.total)}</Typography>,
    fields: [],
  }));

  const addItem = () => {
    if (!productId || qty <= 0) return;
    setItems((prev) => [...prev, { product_id: Number(productId), qty, unit_cost: unitCost }]);
    setQty(1);
    setUnitCost(0);
  };

  const handleCreateOC = async () => {
    if (!supplierId || items.length === 0) return;
    await createPurchaseOrder({ supplier_id: Number(supplierId), items });
    showToast({ message: "OC creada", severity: "success" });
    setItems([]);
  };

  const handleReceive = async () => {
    if (!receiveOrderId || !receiveProductId || receiveQty <= 0) return;
    await receivePurchaseOrder(Number(receiveOrderId), [{ product_id: Number(receiveProductId), qty: receiveQty }]);
    showToast({ message: "Recepcion registrada", severity: "success" });
  };

  const handlePay = async () => {
    if (!paySupplierId || payAmount <= 0) return;
    await supplierPayment({ supplier_id: Number(paySupplierId), amount: payAmount, method: payMethod, reference: payRef });
    showToast({ message: "Pago registrado", severity: "success" });
  };

  const handleExport = async () => {
    const blob = await exportPurchases({
      from_date: histFrom || undefined,
      to: histTo || undefined,
      supplier_id: histSupplier ? Number(histSupplier) : undefined,
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "compras.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <PageHeader
        title="Compras"
        subtitle="Ordenes, recepcion y pagos de proveedores."
        icon={<LocalShippingIcon color="primary" />}
        chips={[
          `OC abiertas: ${(orders || []).filter((o) => o.status === "OPEN").length}`,
          `Proveedores: ${suppliers?.length ?? 0}`,
        ]}
        loading={loadingProducts || loadingSuppliers || loadingOrders || loadingPurchases}
      />

      <Paper sx={{ p: 1.5 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" allowScrollButtonsMobile>
          <Tab label="Orden de compra" />
          <Tab label="Recepcion" />
          <Tab label="Pagos" />
          <Tab label="Historial" />
        </Tabs>
      </Paper>

      {tab === 0 ? (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Orden de compra</Typography>
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: isCompact ? "1fr" : "repeat(auto-fit, minmax(200px, 1fr))" }}>
            <TextField select label="Proveedor" value={supplierId} onChange={(e) => setSupplierId(Number(e.target.value))}>
              {(suppliers || []).map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
            </TextField>
            <TextField select label="Producto" value={productId} onChange={(e) => setProductId(Number(e.target.value))}>
              {(products || []).map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
            </TextField>
            <TextField label="Cantidad" type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
            <TextField label="Costo" type="number" value={unitCost} onChange={(e) => setUnitCost(Number(e.target.value))} />
            <Button variant="outlined" onClick={addItem} disabled={!productId || qty <= 0}>Agregar item</Button>
          </Box>

          {items.length > 0 ? (
            isCompact ? (
              <Box sx={{ display: "grid", gap: 1, mt: 2 }}>
                {items.map((i, idx) => {
                  const product = (products || []).find((p) => p.id === i.product_id);
                  return (
                    <Paper key={idx} variant="outlined" sx={{ p: 1.25 }}>
                      <Typography sx={{ fontWeight: 700 }}>{product?.name || i.product_id}</Typography>
                      <Typography variant="body2">Cantidad: {i.qty}</Typography>
                      <Typography variant="body2">Costo: {i.unit_cost}</Typography>
                    </Paper>
                  );
                })}
              </Box>
            ) : (
              <Table size="small" sx={{ mt: 2 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Producto</TableCell>
                    <TableCell>Cantidad</TableCell>
                    <TableCell>Costo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((i, idx) => {
                    const product = (products || []).find((p) => p.id === i.product_id);
                    return (
                      <TableRow key={idx}>
                        <TableCell>{product?.name || i.product_id}</TableCell>
                        <TableCell>{i.qty}</TableCell>
                        <TableCell>{i.unit_cost}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )
          ) : null}

          <Button fullWidth={isCompact} variant="contained" sx={{ mt: 2 }} onClick={handleCreateOC} disabled={!supplierId || items.length === 0}>
            Crear OC
          </Button>
        </Paper>
      ) : null}

      {tab === 1 ? (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Recepcion parcial</Typography>
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: isCompact ? "1fr" : "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <TextField
              select
              label="Orden de compra"
              value={receiveOrderId}
              onChange={async (e) => {
                const raw = e.target.value;
                if (raw === "") {
                  setReceiveOrderId("");
                  setOrderItems([]);
                  return;
                }
                const v = Number(raw);
                setReceiveOrderId(v);
                const loadedItems = await listPurchaseOrderItems(v);
                setOrderItems(loadedItems);
              }}
            >
              <MenuItem value="">Seleccione</MenuItem>
              {(orders || []).map((o) => (
                <MenuItem key={o.id} value={o.id}>OC #{o.id} - {o.status}</MenuItem>
              ))}
            </TextField>
            <TextField select label="Producto" value={receiveProductId} onChange={(e) => setReceiveProductId(Number(e.target.value))}>
              {orderItems.map((item) => {
                const product = (products || []).find((p) => p.id === item.product_id);
                const remaining = item.qty - item.received_qty;
                return (
                  <MenuItem key={item.product_id} value={item.product_id}>
                    {product?.name || `Producto ${item.product_id}`} (pendiente {remaining})
                  </MenuItem>
                );
              })}
            </TextField>
            <TextField label="Cantidad" type="number" value={receiveQty} onChange={(e) => setReceiveQty(Number(e.target.value))} />
            <Button variant="contained" onClick={handleReceive} disabled={!receiveOrderId || !receiveProductId || receiveQty <= 0}>
              Registrar recepcion
            </Button>
          </Box>
        </Paper>
      ) : null}

      {tab === 2 ? (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Pago a proveedor</Typography>
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: isCompact ? "1fr" : "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <TextField select label="Proveedor" value={paySupplierId} onChange={(e) => setPaySupplierId(Number(e.target.value))}>
              {(suppliers || []).map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
            </TextField>
            <TextField label="Monto" type="number" value={payAmount} onChange={(e) => setPayAmount(Number(e.target.value))} />
            <TextField label="Metodo" value={payMethod} onChange={(e) => setPayMethod(e.target.value)} />
            <TextField label="Referencia" value={payRef} onChange={(e) => setPayRef(e.target.value)} />
            <Button variant="contained" onClick={handlePay} disabled={!paySupplierId || payAmount <= 0}>Registrar pago</Button>
          </Box>
        </Paper>
      ) : null}

      {tab === 3 ? (
        <>
          <TableToolbar title="Historial de compras" subtitle="Consulta y exportacion por fecha/proveedor.">
            <TextField type="date" label="Desde" value={histFrom} onChange={(e) => setHistFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField type="date" label="Hasta" value={histTo} onChange={(e) => setHistTo(e.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField select label="Proveedor" value={histSupplier} onChange={(e) => setHistSupplier(Number(e.target.value))} sx={{ minWidth: 200 }}>
              <MenuItem value="">Todos</MenuItem>
              {(suppliers || []).map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
            </TextField>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport}>Exportar CSV</Button>
          </TableToolbar>

          <Paper sx={{ p: 2 }}>
            {loadingPurchases ? (
              <LoadingState title="Cargando historial..." />
            ) : purchasesError ? (
              <ErrorState title="No se pudo cargar historial" onRetry={() => refetchPurchases()} />
            ) : (purchases || []).length === 0 ? (
              <EmptyState title="Sin compras" description="No hay compras en el rango seleccionado." />
            ) : isCompact ? (
              <CardTable rows={purchaseRows} />
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Proveedor</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(purchases || []).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.id}</TableCell>
                      <TableCell>{p.supplier_id}</TableCell>
                      <TableCell align="right">{formatMoney(p.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </>
      ) : null}
    </Box>
  );
};

export default Purchases;
