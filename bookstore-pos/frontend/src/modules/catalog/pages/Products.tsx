import React, { useMemo, useState } from "react";
import { Box, Button, Paper, TextField, Typography, useMediaQuery, MenuItem } from "@mui/material";
import CategoryIcon from "@mui/icons-material/Category";
import { PageHeader } from "@/app/components";
import { TableToolbar } from "@/app/components";
import { EmptyState } from "@/app/components";
import { LoadingState } from "@/app/components";
import { ErrorState } from "@/app/components";
import { CardTable } from "@/app/components";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createProduct, deleteProduct, listProducts, updateProduct } from "@/modules/catalog/api";
import { Product } from "@/modules/shared/types";
import { useToast } from "@/app/components";
import { useSettings } from "@/app/store";

const emptyForm: Omit<Product, "id"> = {
  sku: "",
  name: "",
  category: "",
  tags: "",
  price: 0,
  cost: 0,
  stock: 0,
  stock_min: 0,
};

const Products: React.FC = () => {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["products"], queryFn: () => listProducts(), staleTime: 60_000 });
  const [form, setForm] = useState<Omit<Product, "id">>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const compact = useMediaQuery("(max-width:900px)");
  const { compactMode } = useSettings();
  const isCompact = compactMode || compact;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  const columns: GridColDef[] = useMemo(
    () => [
      { field: "id", headerName: "ID", width: 70 },
      { field: "sku", headerName: "SKU", width: 120 },
      { field: "name", headerName: "Nombre", flex: 1 },
      { field: "category", headerName: "Categoria", width: 140 },
      { field: "tags", headerName: "Tags", width: 200 },
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
    if (!window.confirm("Eliminar producto?")) return;
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
  const cardRows = filtered.map((row) => ({
    key: row.id,
    title: row.name,
    subtitle: row.category || "Sin categoria",
    right: (
      <Box sx={{ textAlign: "right" }}>
        <Typography variant="body2">#{row.sku}</Typography>
        <Button size="small" onClick={() => {
          setEditingId(row.id);
          const next = Object.fromEntries(
            Object.entries(row as Product).filter(([key]) => key !== "id")
          ) as Omit<Product, "id">;
          setForm(next as Omit<Product, "id">);
        }}>
          Editar
        </Button>
      </Box>
    ),
    fields: [
      { label: "Precio", value: row.price },
      { label: "Stock", value: row.stock },
    ],
  }));

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <PageHeader
        title="Productos"
        subtitle="Catalogo, precios y control de stock minimo."
        icon={<CategoryIcon color="primary" />}
        chips={[`Total: ${filtered.length}`, `Categorias: ${categories.length}`]}
        loading={isLoading}
      />

      <TableToolbar title="Filtro rapido" subtitle="Busca por SKU, nombre o categoria.">
        <TextField
          label="Buscar"
          size="small"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ maxWidth: 320 }}
          placeholder="SKU o nombre"
        />
        <TextField
          select
          label="Categoria"
          size="small"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          sx={{ minWidth: 200 }}
          helperText="Filtra por categoria"
        >
          <MenuItem value="">Todas</MenuItem>
          {categories.map((c) => (
            <MenuItem key={c} value={c}>{c}</MenuItem>
          ))}
        </TextField>
      </TableToolbar>

      <Paper sx={{ p: 2 }}>
        {isLoading ? (
          <LoadingState title="Cargando productos..." />
        ) : isError ? (
          <ErrorState title="No se pudieron cargar productos" onRetry={() => refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Sin productos"
            description="No hay productos con ese filtro."
            icon={<CategoryIcon color="disabled" />}
          />
        ) : isCompact ? (
          <CardTable rows={cardRows} />
        ) : (
          <div style={{ height: 320, width: "100%" }}>
            <DataGrid
              rows={filtered}
              columns={columns}
              pageSizeOptions={[5, 10, 25, 50, 100]}
              onRowClick={(params) => {
                setEditingId(params.row.id);
                const next = Object.fromEntries(
                  Object.entries(params.row as Product).filter(([key]) => key !== "id")
                ) as Omit<Product, "id">;
                setForm(next as Omit<Product, "id">);
              }}
              sx={{
                border: "none",
                "& .MuiDataGrid-columnHeaders": { bgcolor: "rgba(18,53,90,0.08)", color: "#12355a" },
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
              helperText={
                key === "sku"
                  ? "Unico"
                  : key === "stock_min"
                    ? "Nivel minimo"
                    : key === "tags"
                      ? "Separar etiquetas con coma. Ej: hojas,cuaderno,rayado"
                      : ""
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
