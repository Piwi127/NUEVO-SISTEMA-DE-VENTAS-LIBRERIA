import React, { useState } from "react";
import {
  Box,
  Button,
  MenuItem,
  Paper,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  useMediaQuery,
} from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import DownloadIcon from "@mui/icons-material/Download";
import { PageHeader } from "../components/PageHeader";
import { TableToolbar } from "../components/TableToolbar";
import { EmptyState } from "../components/EmptyState";
import { CardTable } from "../components/CardTable";
import { useQuery } from "@tanstack/react-query";
import { listProducts } from "../api/products";
import { listSuppliers } from "../api/suppliers";
import { createPurchaseOrder, receivePurchaseOrder, supplierPayment, listPurchaseOrders, listPurchaseOrderItems } from "../api/purchasing";
import { listPurchases, exportPurchases } from "../api/purchases";
import { useToast } from "../components/ToastProvider";
import { formatMoney } from "../utils/money";

const Purchases: React.FC = () => {
  const { data: products, isLoading: loadingProducts } = useQuery({ queryKey: ["products"], queryFn: () => listProducts() });
  const { data: suppliers, isLoading: loadingSuppliers } = useQuery({ queryKey: ["suppliers"], queryFn: () => listSuppliers() });
  const { data: orders, isLoading: loadingOrders } = useQuery({ queryKey: ["purchase-orders"], queryFn: () => listPurchaseOrders() });
  const { showToast } = useToast();
  const compact = useMediaQuery("(max-width:900px)");

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
  const { data: purchases, isLoading: loadingPurchases, refetch: refetchPurchases } = useQuery({
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
  const hasPurchases = (purchases || []).length > 0;

  const addItem = () => {
    if (!productId) return;
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

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <PageHeader
        title="Compras"
        subtitle="Ordenes, recepcion y pagos a proveedor."
        icon={<LocalShippingIcon color="primary" />}
        chips={[
          `OC abiertas: ${(orders || []).filter((o) => o.status === "OPEN").length}`,
          `Proveedores: ${suppliers?.length ?? 0}`,
        ]}
      />

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Orden de compra</Typography>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: compact ? "1fr" : "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <TextField
            select
            label="Proveedor"
            value={supplierId}
            onChange={(e) => setSupplierId(Number(e.target.value))}
            helperText="Seleccione proveedor"
          >
            {(suppliers || []).map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
          </TextField>
          <TextField
            select
            label="Producto"
            value={productId}
            onChange={(e) => setProductId(Number(e.target.value))}
            helperText="Producto a incluir"
          >
            {(products || []).map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
          </TextField>
          <TextField
            label="Cantidad"
            type="number"
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            error={qty <= 0}
            helperText={qty <= 0 ? "Cantidad debe ser mayor a 0" : "Unidades"}
          />
          <TextField
            label="Costo"
            type="number"
            value={unitCost}
            onChange={(e) => setUnitCost(Number(e.target.value))}
            error={unitCost < 0}
            helperText={unitCost < 0 ? "Costo invalido" : "Costo unitario"}
          />
          <Button variant="outlined" onClick={addItem} disabled={!productId || qty <= 0}>
            Agregar item
          </Button>
        </Box>
        {loadingSuppliers && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Cargando proveedores...
          </Typography>
        )}
        {loadingProducts && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Cargando productos...
          </Typography>
        )}

        {items.length > 0 && (
          compact ? (
            <Box sx={{ display: "grid", gap: 1, mt: 2 }}>
              {items.map((i, idx) => {
                const product = (products || []).find((p) => p.id === i.product_id);
                return (
                  <Paper key={idx} sx={{ p: 1.5 }}>
                    <Typography sx={{ fontWeight: 600 }}>{product?.name || i.product_id}</Typography>
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
        )}

        <Button fullWidth={compact} variant="contained" sx={{ mt: 2 }} onClick={handleCreateOC} disabled={!supplierId || items.length === 0}>
          Crear OC
        </Button>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Recepcion parcial</Typography>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: compact ? "1fr" : "repeat(auto-fit, minmax(200px, 1fr))" }}>
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
              const items = await listPurchaseOrderItems(v);
              setOrderItems(items);
            }}
          >
            <MenuItem value="">Seleccione</MenuItem>
            {(orders || []).map((o) => (
              <MenuItem key={o.id} value={o.id}>
                OC #{o.id} - {o.status}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Producto"
            value={receiveProductId}
            onChange={(e) => setReceiveProductId(Number(e.target.value))}
            helperText="Producto pendiente de recepcion"
          >
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
          <TextField
            label="Cantidad"
            type="number"
            value={receiveQty}
            onChange={(e) => setReceiveQty(Number(e.target.value))}
            error={receiveQty <= 0}
            helperText={receiveQty <= 0 ? "Cantidad debe ser mayor a 0" : "Unidades"}
          />
          <Button fullWidth={compact} variant="contained" onClick={handleReceive} disabled={!receiveOrderId || !receiveProductId || receiveQty <= 0}>
            Registrar
          </Button>
        </Box>
        {loadingOrders && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Cargando ordenes...
          </Typography>
        )}
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Pago a proveedor</Typography>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: compact ? "1fr" : "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <TextField select label="Proveedor" value={paySupplierId} onChange={(e) => setPaySupplierId(Number(e.target.value))} helperText="Proveedor a pagar">
            {(suppliers || []).map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
          </TextField>
          <TextField
            label="Monto"
            type="number"
            value={payAmount}
            onChange={(e) => setPayAmount(Number(e.target.value))}
            error={payAmount <= 0}
            helperText={payAmount <= 0 ? "Monto invalido" : "Importe total"}
          />
          <TextField label="Metodo" value={payMethod} onChange={(e) => setPayMethod(e.target.value)} helperText="CASH / CARD / TRANSFER" />
          <TextField label="Referencia" value={payRef} onChange={(e) => setPayRef(e.target.value)} helperText="Opcional" />
          <Button fullWidth={compact} variant="contained" onClick={handlePay} disabled={!paySupplierId || payAmount <= 0}>
            Pagar
          </Button>
        </Box>
      </Paper>

      <TableToolbar title="Historial de compras" subtitle="Filtros por fecha y proveedor.">
        <TextField type="date" label="Desde" value={histFrom} onChange={(e) => setHistFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField type="date" label="Hasta" value={histTo} onChange={(e) => setHistTo(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField select label="Proveedor" value={histSupplier} onChange={(e) => setHistSupplier(Number(e.target.value))} sx={{ minWidth: 200 }}>
          <MenuItem value="">Todos</MenuItem>
          {(suppliers || []).map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
        </TextField>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={async () => {
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
          }}
        >
          Exportar CSV
        </Button>
      </TableToolbar>

      <Paper sx={{ p: 2 }}>
        {loadingPurchases && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Cargando historial...
          </Typography>
        )}
        {!loadingPurchases && !hasPurchases ? (
          <EmptyState
            title="Sin compras"
            description="No hay compras en el rango seleccionado."
            actionLabel="Actualizar"
            onAction={() => refetchPurchases()}
            icon={<LocalShippingIcon color="disabled" />}
          />
        ) : compact ? (
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
    </Box>
  );
};

export default Purchases;
