import React, { useMemo, useState } from "react";
import { Box, Button, Paper, TextField, Typography, useMediaQuery, MenuItem } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createProduct, deleteProduct, listProducts, updateProduct } from "../api/products";
import { Product } from "../types/dto";
import { useToast } from "../components/ToastProvider";

const emptyForm: Omit<Product, "id"> = {
  sku: "",
  name: "",
  category: "",
  price: 0,
  cost: 0,
  stock: 0,
  stock_min: 0,
};

const Products: React.FC = () => {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { data } = useQuery({ queryKey: ["products"], queryFn: () => listProducts() });
  const [form, setForm] = useState<Omit<Product, "id">>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const compact = useMediaQuery("(max-width:900px)");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  const columns: GridColDef[] = useMemo(
    () => [
      { field: "id", headerName: "ID", width: 70 },
      { field: "sku", headerName: "SKU", width: 120 },
      { field: "name", headerName: "Nombre", flex: 1 },
      { field: "category", headerName: "Categoria", width: 140 },
      { field: "price", headerName: "Precio", width: 110 },
      { field: "cost", headerName: "Costo", width: 110 },
      { field: "stock", headerName: "Stock", width: 90 },
      { field: "stock_min", headerName: "Stock Min", width: 110 },
    ],
    []
  );

  const handleSubmit = async () => {
    try {
      if (editingId) {
        await updateProduct(editingId, form);
        showToast({ message: "Producto actualizado", severity: "success" });
      } else {
        await createProduct(form);
        showToast({ message: "Producto creado", severity: "success" });
      }
      setForm(emptyForm);
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ["products"] });
    } catch (err: any) {
      showToast({ message: err?.response?.data?.detail || "Error", severity: "error" });
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    await deleteProduct(editingId);
    showToast({ message: "Producto eliminado", severity: "success" });
    setForm(emptyForm);
    setEditingId(null);
    qc.invalidateQueries({ queryKey: ["products"] });
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    (data || []).forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [data]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (data || []).filter((p) => {
      if (category && p.category !== category) return false;
      if (!term) return true;
      return `${p.name} ${p.sku} ${p.category || ""}`.toLowerCase().includes(term);
    });
  }, [data, query, category]);

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Productos
        </Typography>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
          <TextField
            label="Buscar"
            size="small"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{ maxWidth: 320 }}
          />
          <TextField
            select
            label="Categoria"
            size="small"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">Todas</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </TextField>
        </Box>
        {compact ? (
          <Box sx={{ display: "grid", gap: 1 }}>
            {filtered.map((row) => (
              <Paper key={row.id} sx={{ p: 1.5 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography sx={{ fontWeight: 600 }}>{row.name}</Typography>
                  <Typography variant="body2">#{row.sku}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">{row.category}</Typography>
                <Typography variant="body2">Precio: {row.price} | Stock: {row.stock}</Typography>
                <Box sx={{ mt: 1 }}>
                  <Button size="small" onClick={() => { setEditingId(row.id); const { id, ...rest } = row as Product; setForm(rest); }}>Editar</Button>
                </Box>
              </Paper>
            ))}
          </Box>
        ) : (
          <div style={{ height: 320, width: "100%" }}>
            <DataGrid
              rows={filtered}
              columns={columns}
              pageSizeOptions={[5, 10, 25, 50, 100]}
              onRowClick={(params) => {
                setEditingId(params.row.id);
                const { id, ...rest } = params.row as Product;
                setForm(rest);
              }}
              sx={{
                border: "none",
                "& .MuiDataGrid-columnHeaders": { bgcolor: "#0f172a", color: "#fff" },
              }}
            />
          </div>
        )}
      </Paper>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {editingId ? `Editar #${editingId}` : "Nuevo producto"}
        </Typography>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          {Object.entries(form).map(([key, value]) => (
            <TextField
              key={key}
              label={key}
              type={typeof value === "number" ? "number" : "text"}
              value={value as any}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  [key]: typeof value === "number" ? Number(e.target.value) : e.target.value,
                }))
              }
            />
          ))}
        </Box>
        <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
          <Button variant="contained" onClick={handleSubmit}>
            Guardar
          </Button>
          {editingId && (
            <Button color="error" onClick={handleDelete}>
              Eliminar
            </Button>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default Products;
