import React, { useState } from "react";
import { Box, Button, MenuItem, Paper, TextField, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { listProducts } from "../api/products";
import { listSuppliers } from "../api/suppliers";
import { createPurchaseOrder, receivePurchaseOrder, supplierPayment } from "../api/purchasing";
import { useToast } from "../components/ToastProvider";

const Purchases: React.FC = () => {
  const { data: products } = useQuery({ queryKey: ["products"], queryFn: () => listProducts() });
  const { data: suppliers } = useQuery({ queryKey: ["suppliers"], queryFn: () => listSuppliers() });
  const { showToast } = useToast();

  const [supplierId, setSupplierId] = useState<number | "">("");
  const [productId, setProductId] = useState<number | "">("");
  const [qty, setQty] = useState(1);
  const [unitCost, setUnitCost] = useState(0);
  const [items, setItems] = useState<{ product_id: number; qty: number; unit_cost: number }[]>([]);

  const [receiveOrderId, setReceiveOrderId] = useState("");
  const [receiveProductId, setReceiveProductId] = useState<number | "">("");
  const [receiveQty, setReceiveQty] = useState(0);

  const [paySupplierId, setPaySupplierId] = useState<number | "">("");
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState("TRANSFER");
  const [payRef, setPayRef] = useState("");

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
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Orden de compra</Typography>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", mt: 2 }}>
          <TextField select label="Proveedor" value={supplierId} onChange={(e) => setSupplierId(Number(e.target.value))}>
            {(suppliers || []).map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
          </TextField>
          <TextField select label="Producto" value={productId} onChange={(e) => setProductId(Number(e.target.value))}>
            {(products || []).map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
          </TextField>
          <TextField label="Cantidad" type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
          <TextField label="Costo" type="number" value={unitCost} onChange={(e) => setUnitCost(Number(e.target.value))} />
          <Button variant="outlined" onClick={addItem}>Agregar item</Button>
        </Box>
        <Button variant="contained" sx={{ mt: 2 }} onClick={handleCreateOC}>Crear OC</Button>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Recepcion parcial</Typography>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", mt: 2 }}>
          <TextField label="ID OC" value={receiveOrderId} onChange={(e) => setReceiveOrderId(e.target.value)} />
          <TextField select label="Producto" value={receiveProductId} onChange={(e) => setReceiveProductId(Number(e.target.value))}>
            {(products || []).map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
          </TextField>
          <TextField label="Cantidad" type="number" value={receiveQty} onChange={(e) => setReceiveQty(Number(e.target.value))} />
          <Button variant="contained" onClick={handleReceive}>Registrar</Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Pago a proveedor</Typography>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", mt: 2 }}>
          <TextField select label="Proveedor" value={paySupplierId} onChange={(e) => setPaySupplierId(Number(e.target.value))}>
            {(suppliers || []).map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
          </TextField>
          <TextField label="Monto" type="number" value={payAmount} onChange={(e) => setPayAmount(Number(e.target.value))} />
          <TextField label="Metodo" value={payMethod} onChange={(e) => setPayMethod(e.target.value)} />
          <TextField label="Referencia" value={payRef} onChange={(e) => setPayRef(e.target.value)} />
          <Button variant="contained" onClick={handlePay}>Pagar</Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default Purchases;
