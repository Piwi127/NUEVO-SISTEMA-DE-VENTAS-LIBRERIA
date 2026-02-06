import React, { useState } from "react";
import { Box, Button, MenuItem, Paper, Table, TableBody, TableCell, TableHead, TableRow, Tab, Tabs, TextField, Typography, useMediaQuery } from "@mui/material";
import PriceChangeIcon from "@mui/icons-material/PriceChange";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CardTable } from "@/app/components";
import { EmptyState } from "@/app/components";
import { PageHeader } from "@/app/components";
import { useToast } from "@/app/components";
import { getPriceListItems, listPriceLists, replacePriceListItems, createPriceList } from "@/modules/catalog/api";
import { listProducts } from "@/modules/catalog/api";
import { useSettings } from "@/app/store";

const PriceLists: React.FC = () => {
  const qc = useQueryClient();
  const { showToast } = useToast();

  const { data: lists, isLoading: loadingLists } = useQuery({ queryKey: ["price-lists"], queryFn: listPriceLists, staleTime: 60_000 });
  const { data: products, isLoading: loadingProducts } = useQuery({ queryKey: ["products"], queryFn: () => listProducts(), staleTime: 60_000 });

  const [tab, setTab] = useState(0);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<number | "">("");
  const [itemProduct, setItemProduct] = useState<number | "">("");
  const [itemPrice, setItemPrice] = useState(0);
  const [items, setItems] = useState<{ product_id: number; price: number }[]>([]);

  const compact = useMediaQuery("(max-width:900px)");
  const { compactMode } = useSettings();
  const isCompact = compactMode || compact;

  const loadItems = async (id: number) => {
    const data = await getPriceListItems(id);
    setItems(data.map((d) => ({ product_id: d.product_id, price: d.price })));
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createPriceList({ name });
    setName("");
    qc.invalidateQueries({ queryKey: ["price-lists"] });
    showToast({ message: "Lista creada", severity: "success" });
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

  const cardRows = items.map((it, idx) => {
    const product = (products || []).find((p) => p.id === it.product_id);
    return {
      key: `${it.product_id}-${idx}`,
      title: product?.name || `Producto ${it.product_id}`,
      subtitle: `ID ${it.product_id}`,
      right: <Typography sx={{ fontWeight: 700 }}>{it.price}</Typography>,
      fields: [],
    };
  });

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <PageHeader
        title="Listas de precio"
        subtitle="Precios por segmento de cliente."
        icon={<PriceChangeIcon color="primary" />}
        chips={[`Listas: ${lists?.length ?? 0}`, `Productos: ${products?.length ?? 0}`]}
        loading={loadingLists || loadingProducts}
      />

      <Paper sx={{ p: 1.5 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Listas" />
          <Tab label="Items" />
        </Tabs>
      </Paper>

      {tab === 0 ? (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Nueva lista</Typography>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <TextField label="Nombre de lista" value={name} onChange={(e) => setName(e.target.value)} />
            <Button variant="contained" onClick={handleCreate} disabled={!name.trim()}>Crear</Button>
          </Box>
          {!loadingLists && (lists || []).length === 0 ? (
            <Box sx={{ mt: 2 }}>
              <EmptyState title="Sin listas" description="No hay listas creadas." icon={<PriceChangeIcon color="disabled" />} />
            </Box>
          ) : null}
        </Paper>
      ) : null}

      {tab === 1 ? (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Editar items</Typography>
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: isCompact ? "1fr" : "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <TextField
              select
              label="Lista"
              value={selected}
              onChange={(e) => {
                const v = Number(e.target.value);
                setSelected(v);
                loadItems(v);
              }}
            >
              {(lists || []).map((l) => <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>)}
            </TextField>
            <TextField select label="Producto" value={itemProduct} onChange={(e) => setItemProduct(Number(e.target.value))}>
              {(products || []).map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
            </TextField>
            <TextField label="Precio" type="number" value={itemPrice} onChange={(e) => setItemPrice(Number(e.target.value))} />
            <Button variant="outlined" onClick={addItem} disabled={!itemProduct}>Agregar</Button>
            <Button variant="contained" onClick={saveItems} disabled={!selected}>Guardar lista</Button>
          </Box>

          {selected && items.length === 0 ? (
            <Box sx={{ mt: 2 }}>
              <EmptyState title="Sin items" description="Agrega productos a esta lista." icon={<PriceChangeIcon color="disabled" />} />
            </Box>
          ) : isCompact ? (
            <Box sx={{ mt: 2 }}><CardTable rows={cardRows} /></Box>
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
      ) : null}
    </Box>
  );
};

export default PriceLists;
