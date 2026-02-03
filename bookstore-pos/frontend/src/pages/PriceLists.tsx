import React, { useState } from "react";
import { Box, Button, Paper, TextField, Typography, MenuItem, Table, TableHead, TableRow, TableCell, TableBody, Stack, Chip } from "@mui/material";
import PriceChangeIcon from "@mui/icons-material/PriceChange";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listPriceLists, createPriceList, getPriceListItems, replacePriceListItems } from "../api/priceLists";
import { listProducts } from "../api/products";
import { useToast } from "../components/ToastProvider";

const PriceLists: React.FC = () => {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { data: lists, isLoading: loadingLists } = useQuery({ queryKey: ["price-lists"], queryFn: listPriceLists });
  const { data: products, isLoading: loadingProducts } = useQuery({ queryKey: ["products"], queryFn: () => listProducts() });

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
      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "flex-start", md: "center" }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <PriceChangeIcon color="primary" />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                Listas de precio
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Gestion de precios por segmentos.
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ ml: { md: "auto" } }}>
            <Chip label={`Listas: ${lists?.length ?? 0}`} size="small" />
            <Chip label={`Productos: ${products?.length ?? 0}`} size="small" />
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Nueva lista</Typography>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <TextField
            label="Nombre de lista"
            placeholder="Corporativo / Retail"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={!name.trim() && name.length > 0}
            helperText={!name.trim() && name.length > 0 ? "El nombre es requerido" : "Ej: Corporativo, Retail"}
          />
          <Button variant="contained" onClick={handleCreate} disabled={!name.trim()}>Crear</Button>
        </Box>
        {loadingLists && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Cargando listas...
          </Typography>
        )}
        {!loadingLists && (lists || []).length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            No hay listas creadas.
          </Typography>
        )}
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Editar items</Typography>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <TextField
            select
            label="Lista"
            value={selected}
            onChange={(e) => { const v = Number(e.target.value); setSelected(v); loadItems(v); }}
            helperText="Seleccione la lista a editar"
          >
            {(lists || []).map((l) => <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>)}
          </TextField>
          <TextField
            select
            label="Producto"
            value={itemProduct}
            onChange={(e) => setItemProduct(Number(e.target.value))}
            helperText="Producto a agregar"
          >
            {(products || []).map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
          </TextField>
          <TextField
            label="Precio"
            type="number"
            value={itemPrice}
            onChange={(e) => setItemPrice(Number(e.target.value))}
            helperText="Precio por unidad"
          />
          <Button variant="outlined" onClick={addItem} disabled={!itemProduct}>Agregar</Button>
          <Button variant="contained" onClick={saveItems} disabled={!selected}>Guardar lista</Button>
        </Box>
        {loadingProducts && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Cargando productos...
          </Typography>
        )}
        {!selected && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Seleccione una lista para editar sus items.
          </Typography>
        )}

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
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={2}>
                  <Typography variant="body2" color="text.secondary">
                    Sin items en la lista.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

export default PriceLists;
