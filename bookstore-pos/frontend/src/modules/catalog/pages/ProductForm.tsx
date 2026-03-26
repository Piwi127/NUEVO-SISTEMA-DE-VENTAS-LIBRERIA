import React from "react";
import { Alert, Box, Button, MenuItem, Paper, Tab, Tabs, TextField, Typography } from "@mui/material";
import CategoryIcon from "@mui/icons-material/Category";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";
import CalculateIcon from "@mui/icons-material/Calculate";
import PriceCheckIcon from "@mui/icons-material/PriceCheck";
import { Controller } from "react-hook-form";
import { ErrorState, LoadingState, PageHeader } from "@/app/components";
import { useProductForm, UseProductFormProps } from "@/modules/catalog/hooks/useProductForm";

export type ProductFormProps = UseProductFormProps & {
  isModal?: boolean;
};

const ProductForm: React.FC<ProductFormProps> = ({ productId, onComplete }) => {
  const {
    isEditing,
    parsedId,
    saving,
    categoryTab,
    setCategoryTab,
    newCategory,
    setNewCategory,
    preview,
    previewLoading,
    applyLoading,
    submitError,
    setSubmitError,
    pricingError,
    setPricingError,
    productQuery,
    categoriesQuery,
    productForm,
    pricingForm,
    categoryOptions,
    syncedValues,
    handleCreateCategory,
    closeTabOrGoBack,
    handlePreviewPricing,
    handleApplyPricing,
    handleSave,
  } = useProductForm({ productId, onComplete });

  const {
    control: productControl,
    register: registerProduct,
    formState: { errors: productErrors, isDirty: isProductDirty, isValid: isProductValid },
  } = productForm;

  const {
    register: registerPricing,
    formState: { errors: pricingErrors, isDirty: isPricingDirty, isValid: isPricingValid },
  } = pricingForm;

  const [syncedPrice, syncedCost, syncedCostTotal, syncedCostQty, syncedDirectCostsTotal, syncedDesiredMargin] = syncedValues;

  const pricingCards = preview
    ? [
      { label: "Precio venta", value: Number(syncedPrice || 0).toFixed(2) },
      { label: "Costo unitario", value: Number(syncedCost || 0).toFixed(2) },
      { label: "Costo total compra", value: Number(syncedCostTotal || 0).toFixed(2) },
      { label: "Cantidad", value: `${Number(syncedCostQty || 0)}` },
      { label: "Costos directos", value: Number(syncedDirectCostsTotal || 0).toFixed(2) },
      { label: "Margen guardado", value: `${(Number(syncedDesiredMargin || 0) * 100).toFixed(2)}%` },
      { label: "Costo total calculado", value: preview.cost_total_all.toFixed(2) },
      { label: "Utilidad unitaria", value: preview.profit_unit.toFixed(2) },
    ]
    : [];

  const pricingPanel = (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        p: 2.5,
        borderRadius: "16px",
        border: "1px solid var(--border-subtle)",
        background: "linear-gradient(135deg, rgba(59,130,246,0.03) 0%, rgba(59,130,246,0.01) 100%)",
      }}
    >
      <Box sx={{ display: "grid", gap: 0.5 }}>
        <Typography variant="overline" sx={{ color: "primary.main", letterSpacing: 1.2, fontWeight: 700 }}>
          Asistente de Precios Inteligente
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 800, color: "text.primary" }}>
          Calcula costos y precios al instante
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Fórmula: ((costo total + costos directos) / (1 - margen)) / cantidad
        </Typography>
      </Box>

      {pricingError ? <Alert severity="error" sx={{ borderRadius: 2 }}>{pricingError}</Alert> : null}
      {isPricingDirty ? (
        <Alert severity="info" variant="outlined" sx={{ borderRadius: 2, py: 0 }}>
          El cálculo debe ser actualizado después de realizar cambios.
        </Alert>
      ) : null}

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <TextField
          label="Cantidad"
          type="number"
          error={!!pricingErrors.qty}
          helperText={pricingErrors.qty?.message}
          inputProps={{ min: 1, step: 1 }}
          {...registerPricing("qty", {
            setValueAs: (value) => (value === "" ? 0 : Number(value)),
            onChange: () => {
              setPricingError("");
            },
          })}
        />
        <TextField
          label="Costo total compra"
          type="number"
          error={!!pricingErrors.cost_total}
          helperText={pricingErrors.cost_total?.message}
          inputProps={{ min: 0, step: "0.01" }}
          {...registerPricing("cost_total", {
            onChange: () => {
              setPricingError("");
            },
          })}
        />
        <TextField
          label="Transporte"
          type="number"
          error={!!pricingErrors.transport}
          helperText={pricingErrors.transport?.message}
          inputProps={{ min: 0, step: "0.01" }}
          {...registerPricing("transport", {
            onChange: () => {
              setPricingError("");
            },
          })}
        />
        <TextField
          label="Empaque"
          type="number"
          error={!!pricingErrors.pack}
          helperText={pricingErrors.pack?.message}
          inputProps={{ min: 0, step: "0.01" }}
          {...registerPricing("pack", {
            onChange: () => {
              setPricingError("");
            },
          })}
        />
        <TextField
          label="Otros Costos"
          type="number"
          error={!!pricingErrors.other}
          helperText={pricingErrors.other?.message}
          inputProps={{ min: 0, step: "0.01" }}
          {...registerPricing("other", {
            onChange: () => {
              setPricingError("");
            },
          })}
        />
        <TextField
          label="Delivery"
          type="number"
          error={!!pricingErrors.delivery}
          helperText={pricingErrors.delivery?.message}
          inputProps={{ min: 0, step: "0.01" }}
          {...registerPricing("delivery", {
            onChange: () => {
              setPricingError("");
            },
          })}
        />
        <TextField
          label="Margen deseado (%)"
          type="number"
          error={!!pricingErrors.desired_margin_percent}
          helperText={pricingErrors.desired_margin_percent?.message}
          inputProps={{ min: 0, max: 99.99, step: "0.01" }}
          {...registerPricing("desired_margin_percent", {
            onChange: () => {
              setPricingError("");
            },
          })}
        />
      </Box>

      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mt: 1 }}>
        <Button
          type="button"
          variant="contained"
          color="primary"
          startIcon={<CalculateIcon />}
          onClick={handlePreviewPricing}
          disabled={previewLoading || applyLoading || !isPricingValid}
        >
          {previewLoading ? "Calculando..." : "Calcular Precios"}
        </Button>
        <Button
          type="button"
          variant="outlined"
          color="secondary"
          startIcon={<PriceCheckIcon />}
          onClick={handleApplyPricing}
          disabled={applyLoading || previewLoading || !isEditing || !isPricingValid}
        >
          {applyLoading ? "Aplicando..." : "Aplicar al Inventario"}
        </Button>
      </Box>

      {preview ? (
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(auto-fit, minmax(160px, 1fr))" }, mt: 2 }}>
          {pricingCards.map((item) => (
            <Paper
              key={item.label}
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: 3,
                border: "1px solid var(--border-subtle)",
                bgcolor: "var(--bg-surface-glass)",
                backdropFilter: "blur(10px)",
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontWeight: 600 }}>
                {item.label}
              </Typography>
              <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 800, color: "text.primary" }}>
                {item.value}
              </Typography>
            </Paper>
          ))}
        </Box>
      ) : null}
    </Box>
  );

  if (isEditing && productQuery.isLoading) {
    return (
      <Box sx={{ display: "grid", gap: 2 }} className="fade-in">
        <PageHeader title="Editar producto" subtitle="Cargando datos..." icon={<CategoryIcon color="primary" />} loading />
        <Paper className="glass-panel" sx={{ p: 4, textAlign: "center" }}>
          <LoadingState title="Cargando información del producto..." />
        </Paper>
      </Box>
    );
  }

  if (isEditing && productQuery.isError) {
    return (
      <Box sx={{ display: "grid", gap: 2 }} className="fade-in">
        <PageHeader title="Editar producto" subtitle="No se pudo cargar el producto." icon={<CategoryIcon color="primary" />} />
        <Paper className="glass-panel" sx={{ p: 4 }}>
          <ErrorState title="Error de conexión" onRetry={() => productQuery.refetch()} />
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "grid", gap: 2 }} className="fade-in">
      <PageHeader
        title={isEditing ? `Editar Producto #${parsedId}` : "Nuevo Producto"}
        subtitle={isEditing ? "Modifica los detalles y el pricing." : "Ingresa los datos para registrar un nuevo artículo en el catálogo."}
        icon={<CategoryIcon color="primary" />}
      />

      <Paper className="glass-panel" sx={{ p: { xs: 2, md: 3 }, display: "grid", gap: 3 }}>
        {submitError ? <Alert severity="error" sx={{ borderRadius: 2 }}>{submitError}</Alert> : null}
        {isProductDirty ? (
          <Alert severity="warning" variant="outlined" sx={{ borderRadius: 2, py: 0 }}>
            Tienes cambios sin guardar.
          </Alert>
        ) : null}

        <Box sx={{ display: "grid", gap: 2.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: "text.primary", borderBottom: "1px solid var(--border-subtle)", pb: 1 }}>
            Información Principal
          </Typography>

          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                xl: "1fr 2fr repeat(2, minmax(140px, 1fr))",
              },
            }}
          >
            <TextField
              label="SKU (Código Interno)"
              error={!!productErrors.sku}
              helperText={productErrors.sku?.message}
              fullWidth
              {...registerProduct("sku", {
                onChange: () => setSubmitError(""),
              })}
            />
            <TextField
              label="Nombre del Producto"
              error={!!productErrors.name}
              helperText={productErrors.name?.message}
              fullWidth
              {...registerProduct("name", {
                onChange: () => setSubmitError(""),
              })}
            />
            <TextField
              label="Precio Venta Final"
              type="number"
              error={!!productErrors.price}
              helperText={productErrors.price?.message}
              inputProps={{ min: 0, step: "0.01" }}
              fullWidth
              {...registerProduct("price", {
                setValueAs: (value) => (value === "" ? 0 : Number(value)),
                onChange: (event) => {
                  setSubmitError("");
                  const next = event.target.value === "" ? 0 : Number(event.target.value);
                  productForm.setValue("sale_price", next, { shouldDirty: true, shouldValidate: true });
                },
              })}
            />
            <TextField
              label="Costo Unitario (Base)"
              type="number"
              error={!!productErrors.cost}
              helperText={productErrors.cost?.message}
              inputProps={{ min: 0, step: "0.01" }}
              fullWidth
              {...registerProduct("cost", {
                setValueAs: (value) => (value === "" ? 0 : Number(value)),
                onChange: (event) => {
                  setSubmitError("");
                  const next = event.target.value === "" ? 0 : Number(event.target.value);
                  productForm.setValue("unit_cost", next, { shouldDirty: true, shouldValidate: true });
                },
              })}
            />
          </Box>

          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" },
            }}
          >
            <TextField
              label="Autor / Creador"
              error={!!productErrors.author}
              helperText={productErrors.author?.message}
              fullWidth
              {...registerProduct("author", {
                onChange: () => setSubmitError(""),
              })}
            />
            <TextField
              label="Editorial / Marca"
              error={!!productErrors.publisher}
              helperText={productErrors.publisher?.message}
              fullWidth
              {...registerProduct("publisher", {
                onChange: () => setSubmitError(""),
              })}
            />
            <TextField
              label="ISBN / Código Universal"
              error={!!productErrors.isbn}
              helperText={productErrors.isbn?.message}
              fullWidth
              {...registerProduct("isbn", {
                onChange: () => setSubmitError(""),
              })}
            />
            <TextField
              label="Código de Barras Físico"
              error={!!productErrors.barcode}
              helperText={productErrors.barcode?.message}
              fullWidth
              {...registerProduct("barcode", {
                onChange: () => setSubmitError(""),
              })}
            />
          </Box>

          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr", lg: "minmax(300px, 1fr) minmax(0, 1fr) repeat(2, minmax(120px, 0.5fr))" },
            }}
          >
            <Paper elevation={0} sx={{ display: "grid", gap: 1, p: 1.5, borderRadius: 3, border: "1px solid var(--border-subtle)", bgcolor: "var(--bg-app)" }}>
              <Tabs
                value={categoryTab}
                onChange={(_event, value) => setCategoryTab(value)}
                variant="fullWidth"
                sx={{ minHeight: 40 }}
              >
                <Tab value="existing" label="Seleccionar Categoría" sx={{ minHeight: 40 }} />
                <Tab value="new" label="Crear Nueva" sx={{ minHeight: 40 }} />
              </Tabs>
              {categoryTab === "existing" ? (
                <Controller
                  control={productControl}
                  name="category"
                  render={({ field }) => (
                    <TextField
                      select
                      label="Categoría Actual"
                      error={!!productErrors.category}
                      helperText={productErrors.category?.message || (categoriesQuery.isLoading ? "Cargando..." : undefined)}
                      fullWidth
                      value={field.value ?? ""}
                      onChange={(event) => {
                        setSubmitError("");
                        field.onChange(event.target.value);
                      }}
                      onBlur={field.onBlur}
                      inputRef={field.ref}
                    >
                      <MenuItem value="">Sin categoría</MenuItem>
                      {categoryOptions.map((item) => (
                        <MenuItem key={item} value={item}>
                          {item}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              ) : (
                <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                  <TextField label="Nombre Categoría" value={newCategory} onChange={(event) => setNewCategory(event.target.value)} fullWidth />
                  <Button type="button" variant="contained" onClick={handleCreateCategory} disabled={!newCategory.trim()}>
                    Crear
                  </Button>
                </Box>
              )}
            </Paper>

            <TextField
              label="Ubicación Física (Estante/Fila)"
              error={!!productErrors.shelf_location}
              helperText={productErrors.shelf_location?.message}
              fullWidth
              sx={{ mt: { xs: 0, lg: 1.5 } }}
              {...registerProduct("shelf_location", {
                onChange: () => setSubmitError(""),
              })}
            />

            <TextField
              label="Stock Actual"
              type="number"
              error={!!productErrors.stock}
              helperText={productErrors.stock?.message}
              inputProps={{ min: 0, step: 1 }}
              fullWidth
              sx={{ mt: { xs: 0, lg: 1.5 } }}
              {...registerProduct("stock", {
                setValueAs: (value) => (value === "" ? 0 : Number(value)),
                onChange: () => setSubmitError(""),
              })}
            />
            <TextField
              label="Stock Mínimo"
              type="number"
              error={!!productErrors.stock_min}
              helperText={productErrors.stock_min?.message}
              inputProps={{ min: 0, step: 1 }}
              fullWidth
              sx={{ mt: { xs: 0, lg: 1.5 } }}
              {...registerProduct("stock_min", {
                setValueAs: (value) => (value === "" ? 0 : Number(value)),
                onChange: () => setSubmitError(""),
              })}
            />
          </Box>

          <TextField
            label="Etiquetas (separadas por coma)"
            error={!!productErrors.tags}
            helperText={productErrors.tags?.message}
            fullWidth
            {...registerProduct("tags", {
              onChange: () => setSubmitError(""),
            })}
          />
        </Box>

        <Box sx={{ mt: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: "text.primary", borderBottom: "1px solid var(--border-subtle)", pb: 1, mb: 2 }}>
            Cálculo de Precios y Márgenes
          </Typography>
          {pricingPanel}
        </Box>

        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", pt: 3, borderTop: "1px solid var(--border-subtle)" }}>
          <Button
            type="button"
            variant="contained"
            color="primary"
            size="large"
            startIcon={<SaveIcon />}
            onClick={() => handleSave(false)}
            disabled={saving || applyLoading || !isProductValid}
            sx={{ px: 4 }}
          >
            {saving ? "Guardando..." : "Guardar Producto"}
          </Button>
          <Button
            type="button"
            variant="contained"
            color="secondary"
            size="large"
            onClick={() => handleSave(true)}
            disabled={saving || applyLoading || !isProductValid}
            sx={{ px: 4 }}
          >
            Guardar y Regresar
          </Button>
          <Button
            type="button"
            variant="outlined"
            size="large"
            startIcon={<ArrowBackIcon />}
            onClick={closeTabOrGoBack}
            disabled={saving || applyLoading}
          >
            Cancelar
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default ProductForm;
