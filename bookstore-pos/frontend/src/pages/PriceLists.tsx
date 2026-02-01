import React, { useState } from "react";
import { Box, Button, Paper, TextField, Typography, MenuItem, Table, TableHead, TableRow, TableCell, TableBody } from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listPriceLists, createPriceList, getPriceListItems, replacePriceListItems } from "../api/priceLists";
import { listProducts } from "../api/products";
import { useToast } from "../components/ToastProvider";

const PriceLists: React.FC = () => {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { data: lists } = useQuery({ queryKey: ["price-lists"], queryFn: listPriceLists });
  const { data: products } = useQuery({ queryKey: ["products"], queryFn: () => listProducts() });

  const [name, setName] = useState("");
  const [selected, setSelected] = useState<number | "">("");
  const [itemProduct, setItemProduct] = useState<number | "">("");
  const [itemPrice, setItemPrice] = useState(0);
  const [items, setItems] = useState<{ product_id: number; price: number }[]>([]);

  const loadItems = async (id: number) => {
    const data = await getPriceListItems(id);
    setItems(data.map((d) => ({ product_id: d.product_id, price: d.price })));
  };

  const handleCreate = async () => {
    if (!name) return;
    await createPriceList({ name });
    setName("");
    qc.invalidateQueries({ queryKey: ["price-lists"] });
  };

  const addItem = () => {
    if (!itemProduct) return;
    setItems((prev) => [...prev, { product_id: Number(itemProduct), price: itemPrice }]);
    setItemProduct("");
    setItemPrice(0);
  };

  const saveItems = async () => {
    if (!selected) return;
    await replacePriceListItems(Number(selected), items);
    showToast({ message: "Lista actualizada", severity: "success" });
  };

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Listas de precio</Typography>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <TextField label="Nueva lista" value={name} onChange={(e) => setName(e.target.value)} />
          <Button variant="contained" onClick={handleCreate}>Crear</Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Editar items</Typography>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <TextField select label="Lista" value={selected} onChange={(e) => { const v = Number(e.target.value); setSelected(v); loadItems(v); }}>
            {(lists || []).map((l) => <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>)}
          </TextField>
          <TextField select label="Producto" value={itemProduct} onChange={(e) => setItemProduct(Number(e.target.value))}>
            {(products || []).map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
          </TextField>
          <TextField label="Precio" type="number" value={itemPrice} onChange={(e) => setItemPrice(Number(e.target.value))} />
          <Button variant="outlined" onClick={addItem}>Agregar</Button>
          <Button variant="contained" onClick={saveItems} disabled={!selected}>Guardar lista</Button>
        </Box>

        <Table size="small" sx={{ mt: 2 }}>
          <TableHead>
            <TableRow>
              <TableCell>Producto</TableCell>
              <TableCell>Precio</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((it, idx) => (
              <TableRow key={idx}>
                <TableCell>{it.product_id}</TableCell>
                <TableCell>{it.price}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

export default PriceLists;
