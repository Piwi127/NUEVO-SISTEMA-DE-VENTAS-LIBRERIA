import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import CategoryIcon from "@mui/icons-material/Category";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PriceChangeIcon from "@mui/icons-material/PriceChange";
import { useNavigate } from "react-router-dom";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CardTable, ConfirmDialog, EmptyState, ErrorState, LoadingState, PageHeader, TableToolbar, useToast } from "@/app/components";
import { applyBulkProductPricing, deleteProduct, listProductCategories, listProducts } from "@/modules/catalog/api";
import { Product } from "@/modules/shared/types";
import { useSettings } from "@/app/store";

const MAX_PRODUCTS = 500;

const Products: React.FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { showToast } = useToast();
  const compact = useMediaQuery("(max-width:900px)");
  const { compactMode } = useSettings();
  const isCompact = compactMode || compact;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkTarget, setBulkTarget] = useState<"selected" | "category" | "all">("selected");
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkMarginPercent, setBulkMarginPercent] = useState("35");
  const [deleteTargetIds, setDeleteTargetIds] = useState<number[]>([]);
  const normalizedQuery = query.trim();

  const productsQuery = useQuery({
    queryKey: ["products", normalizedQuery, category],
    queryFn: () => listProducts(normalizedQuery || undefined, MAX_PRODUCTS, 0, category || undefined, undefined, false),
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });

  const categoriesQuery = useQuery({
    queryKey: ["product-categories"],
    queryFn: listProductCategories,
    staleTime: 5 * 60_000,
  });

  const rows = productsQuery.data || [];
  const displayRows = useMemo(() => rows.map((row) => ({ ...row, price: row.sale_price ?? row.price })), [rows]);
  const categories = categoriesQuery.data || [];
  const isLoading = productsQuery.isLoading;
  const isError = productsQuery.isError;
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const deleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map((id) => deleteProduct(id)));
      return ids;
    },
    onSuccess: async (deletedIds) => {
      setSelectedIds((prev) => prev.filter((id) => !deletedIds.includes(id)));
      setDeleteTargetIds([]);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["products"] }),
        qc.invalidateQueries({ queryKey: ["product-categories"] }),
        qc.invalidateQueries({ queryKey: ["products-smart-search"] }),
        qc.invalidateQueries({ queryKey: ["products-smart-search-corrected"] }),
      ]);
      showToast({
        message: deletedIds.length === 1 ? "Producto eliminado" : `${deletedIds.length} productos eliminados`,
        severity: "success",
      });
    },
    onError: (error: any) => {
      showToast({ message: error?.response?.data?.detail || "No se pudo eliminar", severity: "error" });
    },
  });

  const bulkPricingMutation = useMutation({
    mutationFn: async () => {
      const parsedMargin = Number(bulkMarginPercent);
      if (!Number.isFinite(parsedMargin) || parsedMargin < 0 || parsedMargin >= 100) {
        throw new Error("Margen invalido. Debe estar entre 0 y 99.99");
      }
      const payload: { desired_margin: string; product_ids?: number[]; category?: string } = {
        desired_margin: (parsedMargin / 100).toString(),
      };
      if (bulkTarget === "selected") {
        if (!selectedIds.length) throw new Error("No hay productos seleccionados");
        payload.product_ids = selectedIds;
      } else if (bulkTarget === "category") {
        if (!bulkCategory) throw new Error("Selecciona una categoria");
        payload.category = bulkCategory;
      }
      return applyBulkProductPricing(payload);
    },
    onSuccess: async (result) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["products"] }),
        qc.invalidateQueries({ queryKey: ["products-smart-search"] }),
        qc.invalidateQueries({ queryKey: ["products-smart-search-corrected"] }),
      ]);
      showToast({
        message: `Ajuste masivo aplicado: ${result.updated_count} productos actualizados`,
        severity: "success",
      });
      setBulkOpen(false);
    },
    onError: (error: any) => {
      const detail = error?.response?.data?.detail || error?.message || "No se pudo aplicar el ajuste masivo";
      showToast({ message: detail, severity: "error" });
    },
  });

  useEffect(() => {
    const rowIds = new Set(rows.map((row) => row.id));
    setSelectedIds((prev) => prev.filter((id) => rowIds.has(id)));
  }, [rows]);

  const requestDeleteIds = (ids: number[]) => {
    if (!ids.length || deleteMutation.isPending) return;
    setDeleteTargetIds(ids);
  };

  const handleConfirmDelete = () => {
    if (!deleteTargetIds.length || deleteMutation.isPending) return;
    deleteMutation.mutate(deleteTargetIds);
  };

  const handleDeleteOne = (id: number) => requestDeleteIds([id]);
  const handleDeleteSelected = () => requestDeleteIds(selectedIds);

  const handleBulkApply = () => {
    if (bulkPricingMutation.isPending) return;
    bulkPricingMutation.mutate();
  };

  const goToEdit = (id: number) => {
    navigate(`/products/${id}/edit`);
  };

  const columns: GridColDef[] = useMemo(
    () => [
      { field: "id", headerName: "ID", width: 75 },
      { field: "sku", headerName: "SKU", width: 120 },
      { field: "name", headerName: "Nombre", flex: 1, minWidth: 240 },
      { field: "category", headerName: "Categoria", width: 150 },
      { field: "tags", headerName: "Tags", width: 220 },
      { field: "price", headerName: "Precio", width: 110 },
      { field: "cost", headerName: "Costo", width: 110 },
      { field: "stock", headerName: "Stock", width: 90 },
      { field: "stock_min", headerName: "Stock Min", width: 110 },
      {
        field: "actions",
        headerName: "Acciones",
        width: 170,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params) => (
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <IconButton
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                goToEdit(params.row.id as number);
              }}
              title="Editar"
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                event.stopPropagation();
                handleDeleteOne(params.row.id as number);
              }}
              title="Eliminar"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        ),
      },
    ],
    [deleteMutation.isPending]
  );

  const cardRows = displayRows.map((row: Product) => ({
    key: row.id,
    title: row.name,
    subtitle: row.category || "Sin categoria",
    right: (
      <Box sx={{ textAlign: "right", display: "grid", gap: 0.75, justifyItems: "end" }}>
        <Checkbox
          size="small"
          checked={selectedSet.has(row.id)}
          onChange={() =>
            setSelectedIds((prev) => (prev.includes(row.id) ? prev.filter((id) => id !== row.id) : [...prev, row.id]))
          }
        />
        <Typography variant="body2">#{row.sku}</Typography>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <IconButton size="small" onClick={() => goToEdit(row.id)} title="Editar">
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            disabled={deleteMutation.isPending}
            onClick={() => handleDeleteOne(row.id)}
            title="Eliminar"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    ),
    fields: [
      { label: "Precio", value: row.price },
      { label: "Stock", value: row.stock },
      { label: "Stock Min", value: row.stock_min },
    ],
  }));

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <PageHeader
        title="Productos"
        subtitle="Catalogo, precios y control de stock minimo."
        icon={<CategoryIcon color="primary" />}
        chips={[`Resultados: ${rows.length}`, `Categorias: ${categories.length}`, `Seleccionados: ${selectedIds.length}`]}
        loading={isLoading || productsQuery.isFetching}
        right={
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(auto-fit, minmax(210px, 1fr))" },
              gap: 1,
              width: "100%",
              maxWidth: { lg: 760 },
              "& .MuiButton-root": {
                width: "100%",
                minWidth: 0,
                justifyContent: "center",
              },
            }}
          >
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              disabled={selectedIds.length === 0 || deleteMutation.isPending}
              onClick={handleDeleteSelected}
            >
              {deleteMutation.isPending ? "Eliminando..." : `Eliminar seleccionados (${selectedIds.length})`}
            </Button>
            <Button
              variant="outlined"
              startIcon={<PriceChangeIcon />}
              onClick={() => {
                if (selectedIds.length > 0) {
                  setBulkTarget("selected");
                } else if (category) {
                  setBulkTarget("category");
                  setBulkCategory(category);
                } else {
                  setBulkTarget("all");
                }
                setBulkOpen(true);
              }}
            >
              Ajuste masivo de precios
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/products/new")}>
              Agregar nuevo producto
            </Button>
          </Box>
        }
      />

      <TableToolbar title="Filtro rapido" subtitle="Busca por SKU, nombre, tags o categoria.">
        <TextField
          label="Buscar"
          size="small"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          sx={{ maxWidth: 340 }}
          placeholder="SKU, nombre o tags"
        />
        <TextField
          select
          label="Categoria"
          size="small"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          sx={{ minWidth: 210 }}
          helperText="Filtra por categoria"
        >
          <MenuItem value="">Todas</MenuItem>
          {categories.map((item) => (
            <MenuItem key={item} value={item}>
              {item}
            </MenuItem>
          ))}
        </TextField>
      </TableToolbar>

      <Paper sx={{ p: 2 }}>
        {isLoading ? (
          <LoadingState title="Cargando productos..." />
        ) : isError ? (
          <ErrorState title="No se pudieron cargar productos" onRetry={() => productsQuery.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState title="Sin productos" description="No hay productos con ese filtro." icon={<CategoryIcon color="disabled" />} />
        ) : isCompact ? (
          <CardTable rows={cardRows} />
        ) : (
          <div style={{ height: 460, width: "100%" }}>
            <DataGrid
              rows={displayRows}
              columns={columns}
              pageSizeOptions={[10, 25, 50, 100]}
              checkboxSelection
              disableRowSelectionOnClick
              rowSelectionModel={selectedIds}
              onRowSelectionModelChange={(selection) =>
                setSelectedIds(selection.map((value) => Number(value)).filter((value) => Number.isFinite(value)))
              }
              onRowDoubleClick={(params) => goToEdit(params.row.id as number)}
              sx={{
                border: "none",
                "& .MuiDataGrid-columnHeaders": { bgcolor: "rgba(18,53,90,0.08)", color: "#12355a" },
              }}
            />
          </div>
        )}
      </Paper>

      {rows.length >= MAX_PRODUCTS && !normalizedQuery ? (
        <Paper sx={{ p: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            Mostrando los primeros {MAX_PRODUCTS} productos. Usa el buscador para encontrar productos especificos.
          </Typography>
        </Paper>
      ) : null}

      <Dialog open={bulkOpen} onClose={() => setBulkOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Ajuste masivo de precios por margen</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 2, pt: "12px !important" }}>
          <TextField
            select
            label="Alcance"
            value={bulkTarget}
            onChange={(event) => setBulkTarget(event.target.value as "selected" | "category" | "all")}
            fullWidth
          >
            <MenuItem value="selected">Productos seleccionados ({selectedIds.length})</MenuItem>
            <MenuItem value="category">Por categoria</MenuItem>
            <MenuItem value="all">Todo el catalogo</MenuItem>
          </TextField>
          {bulkTarget === "category" ? (
            <TextField select label="Categoria" value={bulkCategory} onChange={(event) => setBulkCategory(event.target.value)} fullWidth>
              <MenuItem value="">Seleccione</MenuItem>
              {categories.map((item) => (
                <MenuItem key={item} value={item}>
                  {item}
                </MenuItem>
              ))}
            </TextField>
          ) : null}
          <TextField
            label="Margen deseado (%)"
            type="number"
            value={bulkMarginPercent}
            onChange={(event) => setBulkMarginPercent(event.target.value)}
            helperText="Ejemplo: 35 para 35%"
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkOpen(false)} disabled={bulkPricingMutation.isPending}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleBulkApply} disabled={bulkPricingMutation.isPending}>
            {bulkPricingMutation.isPending ? "Aplicando..." : "Aplicar ajuste"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteTargetIds.length > 0}
        title={deleteTargetIds.length === 1 ? "Eliminar producto" : "Eliminar productos"}
        description={
          deleteTargetIds.length === 1
            ? "El producto seleccionado se eliminara del catalogo."
            : `Se eliminaran ${deleteTargetIds.length} productos del catalogo.`
        }
        onCancel={() => setDeleteTargetIds([])}
        onConfirm={handleConfirmDelete}
        confirmText="Eliminar"
        confirmColor="error"
        loading={deleteMutation.isPending}
      />
    </Box>
  );
};

export default Products;


