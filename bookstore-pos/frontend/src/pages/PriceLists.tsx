import React, { useState } from "react";
import { Box, Button, Paper, TextField, Typography, MenuItem, Table, TableHead, TableRow, TableCell, TableBody } from "@mui/material";
import PriceChangeIcon from "@mui/icons-material/PriceChange";
import { PageHeader } from "../components/PageHeader";
import { EmptyState } from "../components/EmptyState";
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
      <PageHeader
        title="Listas de precio"
        subtitle="Gestion de precios por segmentos."
        icon={<PriceChangeIcon color="primary" />}
        chips={[`Listas: ${lists?.length ?? 0}`, `Productos: ${products?.length ?? 0}`]}
      />

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
          <Box sx={{ mt: 2 }}>
            <EmptyState title="Sin listas" description="No hay listas creadas." icon={<PriceChangeIcon color="disabled" />} />
          </Box>
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

        {selected && items.length === 0 ? (
          <Box sx={{ mt: 2 }}>
            <EmptyState title="Sin items" description="Agrega productos a esta lista de precio." icon={<PriceChangeIcon color="disabled" />} />
          </Box>
        ) : (
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
        )}
      </Paper>
    </Box>
  );
};

export default PriceLists;
