import React from "react";
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
import {
  CardTable,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  ResizablePanel,
  TableToolbar,
} from "@/app/components";
import { Product } from "@/modules/shared/types";
import { useSettings } from "@/app/store";
import { useProductsList } from "@/modules/catalog/hooks/useProductsList";
import { ProductsDataGrid } from "@/modules/catalog/components/ProductsDataGrid";
import { ProductFormModal } from "./ProductFormModal";

const Products: React.FC = () => {
  const compact = useMediaQuery("(max-width:900px)");
  const { compactMode } = useSettings();
  const isCompact = compactMode || compact;

  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);

  const {
    query,
    setQuery,
    normalizedQuery,
    category,
    setCategory,
    selectedIds,
    setSelectedIds,
    selectedSet,
    bulkOpen,
    setBulkOpen,
    bulkTarget,
    setBulkTarget,
    bulkCategory,
    setBulkCategory,
    bulkMarginPercent,
    setBulkMarginPercent,
    deleteTargetIds,
    setDeleteTargetIds,
    rows,
    displayRows,
    categories,
    isLoading,
    isError,
    productsQuery,
    deleteMutation,
    bulkPricingMutation,
    handleConfirmDelete,
    handleDeleteOne,
    handleDeleteSelected,
    handleBulkApply,
    MAX_PRODUCTS,
  } = useProductsList();

  const goToEdit = (id: number) => {
    setEditingId(id);
    setModalOpen(true);
  };

  const openNewProduct = () => {
    setEditingId(null);
    setModalOpen(true);
  };

  const cardRows = displayRows.map((row: Product) => ({
    key: row.id,
    title: row.name,
    subtitle: row.author ? `${row.author} • ${row.category || "Sin categoria"}` : row.category || "Sin categoria",
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
          <IconButton size="small" onClick={() => goToEdit(row.id)} title="Editar" className="hover-lift">
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            disabled={deleteMutation.isPending}
            onClick={() => handleDeleteOne(row.id)}
            title="Eliminar"
            className="hover-lift"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    ),
    fields: [
      { label: "Autor", value: row.author || "Sin autor" },
      { label: "ISBN", value: row.isbn || "Sin ISBN" },
      { label: "Precio", value: row.price },
      { label: "Stock", value: row.stock },
      { label: "Stock Min", value: row.stock_min },
    ],
  }));

  return (
    <Box sx={{ display: "grid", gap: 2 }} className="fade-in">
      <Paper className="glass-panel" sx={{ p: 2, mb: 1 }}>
        <PageHeader
          title="Productos"
          subtitle="Catálogo y control de stock."
          icon={<CategoryIcon color="primary" />}
          chips={[`Resultados: ${rows.length}`, `Categorías: ${categories.length}`, `Seleccionados: ${selectedIds.length}`]}
          loading={isLoading || productsQuery.isFetching}
          right={
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 1.5,
                justifyContent: "flex-end",
                width: "100%",
                "& .MuiButton-root": {
                  boxShadow: "var(--shadow-md)"
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
                {deleteMutation.isPending ? "Eliminando..." : `Eliminar (${selectedIds.length})`}
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
                Ajuste masivo
              </Button>
              <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={openNewProduct}>
                Agregar producto
              </Button>
            </Box>
          }
        />
      </Paper>

      <Paper className="glass-panel" sx={{ p: 2 }}>
        <TableToolbar title="Filtro rápido" subtitle="Busca por SKU, ISBN, autor, nombre o categoría.">
          <TextField
            label="Buscar..."
            size="small"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            sx={{ width: "100%", maxWidth: { sm: 340 } }}
            autoComplete="off"
            placeholder="Ejemplo: Harry Potter"
          />
          <TextField
            select
            label="Categoría"
            size="small"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            sx={{ width: "100%", maxWidth: { sm: 240 } }}
          >
            <MenuItem value="">Todas las categorías</MenuItem>
            {categories.map((item) => (
              <MenuItem key={item} value={item}>
                {item}
              </MenuItem>
            ))}
          </TextField>
        </TableToolbar>

        {isCompact ? (
          <Box sx={{ mt: 2 }}>
            {isLoading ? (
              <LoadingState title="Cargando catálogo..." />
            ) : isError ? (
              <ErrorState title="Error de conexión" onRetry={() => productsQuery.refetch()} />
            ) : rows.length === 0 ? (
              <EmptyState title="Sin coincidencias" description="Ajusta el término de búsqueda." icon={<CategoryIcon color="disabled" />} />
            ) : (
              <CardTable rows={cardRows} />
            )}
          </Box>
        ) : (
          <ResizablePanel
            resize="y"
            minHeight={340}
            defaultHeight={500}
            persistKey="products-grid"
            sx={{ p: 0, mt: 2, background: "transparent", border: "none" }}
            contentSx={{ p: 0, height: "100%" }}
          >
            {isError ? (
              <Box sx={{ p: 2 }}>
                <ErrorState title="Error en el servidor" onRetry={() => productsQuery.refetch()} />
              </Box>
            ) : rows.length === 0 && !isLoading ? (
              <Box sx={{ p: 2 }}>
                <EmptyState title="Catálogo vacío" description="No hay productos que coincidan." icon={<CategoryIcon color="disabled" />} />
              </Box>
            ) : (
              <ProductsDataGrid
                rows={displayRows}
                isLoading={isLoading}
                selectedIds={selectedIds}
                onSelectionModelChange={setSelectedIds}
                onEdit={goToEdit}
                onDelete={handleDeleteOne}
                isDeleting={deleteMutation.isPending}
              />
            )}
          </ResizablePanel>
        )}
      </Paper>

      {rows.length >= MAX_PRODUCTS && !normalizedQuery ? (
        <Paper className="glass-panel" sx={{ p: 2, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            Mostrando los {MAX_PRODUCTS} productos más recientes. Usa el buscador superior para encontrar más.
          </Typography>
        </Paper>
      ) : null}

      {/* Bulk Pricing Dialog */}
      <Dialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ className: "glass-panel", elevation: 0 }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Ajuste masivo de precios</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 3, pt: "16px !important" }}>
          <Typography variant="body2" color="text.secondary">
            Aplica un margen de beneficio uniforme a un conjunto de productos para actualizar sus precios de venta en base a su costo.
          </Typography>
          <TextField
            select
            label="Alcance del ajuste"
            value={bulkTarget}
            onChange={(event) => setBulkTarget(event.target.value as "selected" | "category" | "all")}
            fullWidth
          >
            <MenuItem value="selected">Solo seleccionados ({selectedIds.length})</MenuItem>
            <MenuItem value="category">Filtrar por categoría</MenuItem>
            <MenuItem value="all">Todo el catálogo completo</MenuItem>
          </TextField>

          {bulkTarget === "category" ? (
            <TextField select label="Categoría objetivo" value={bulkCategory} onChange={(event) => setBulkCategory(event.target.value)} fullWidth>
              <MenuItem value="">Seleccione una categoría</MenuItem>
              {categories.map((item) => (
                <MenuItem key={item} value={item}>
                  {item}
                </MenuItem>
              ))}
            </TextField>
          ) : null}

          <TextField
            label="Margen de beneficio (%)"
            type="number"
            value={bulkMarginPercent}
            onChange={(event) => setBulkMarginPercent(event.target.value)}
            helperText="Ejemplo: 35% de ganancia sobre el costo"
            fullWidth
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setBulkOpen(false)} disabled={bulkPricingMutation.isPending} sx={{ color: "text.secondary" }}>
            Cancelar
          </Button>
          <Button variant="contained" color="primary" onClick={handleBulkApply} disabled={bulkPricingMutation.isPending}>
            {bulkPricingMutation.isPending ? "Aplicando cambios..." : "Procesar precios"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteTargetIds.length > 0}
        title={deleteTargetIds.length === 1 ? "Eliminar producto" : "Eliminación múltiple"}
        description={
          deleteTargetIds.length === 1
            ? "Esta acción borrará el producto del catálogo permanentemente. ¿Deseas continuar?"
            : `Se eliminarán ${deleteTargetIds.length} productos de forma permanente. Esta acción no se puede deshacer.`
        }
        onCancel={() => setDeleteTargetIds([])}
        onConfirm={handleConfirmDelete}
        confirmText="Eliminar"
        confirmColor="error"
        loading={deleteMutation.isPending}
      />

      <ProductFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        productId={editingId}
      />
    </Box>
  );
};

export default Products;
