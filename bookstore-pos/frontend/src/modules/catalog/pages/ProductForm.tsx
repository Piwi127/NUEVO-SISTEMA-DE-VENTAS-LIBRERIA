import React, { useEffect, useMemo, useState } from "react";
import { Box, Button, MenuItem, Paper, Tab, Tabs, TextField, Typography } from "@mui/material";
import CategoryIcon from "@mui/icons-material/Category";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";
import CalculateIcon from "@mui/icons-material/Calculate";
import PriceCheckIcon from "@mui/icons-material/PriceCheck";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader, ErrorState, LoadingState, useToast } from "@/app/components";
import {
  applyProductPricing,
  createProduct,
  getProduct,
  listProductCategories,
  previewProductPricing,
  updateProduct,
  type PricingPreviewPayload,
  type PricingPreviewResponse,
} from "@/modules/catalog/api";
import type { Product } from "@/modules/shared/types";

type ProductFormState = Omit<Product, "id">;
type MainTab = "details" | "margin";
type CategoryTab = "existing" | "new";

type MarginInputs = {
  qty: number;
  cost_total: string;
  transport: string;
  pack: string;
  other: string;
  delivery: string;
  desired_margin_percent: string;
};

const emptyForm: ProductFormState = {
  sku: "",
  name: "",
  category: "",
  tags: "",
  price: 0,
  cost: 0,
  sale_price: 0,
  cost_total: 0,
  cost_qty: 1,
  direct_costs_breakdown: "{}",
  direct_costs_total: 0,
  desired_margin: 0,
  unit_cost: 0,
  stock: 0,
  stock_min: 0,
};

const emptyMarginInputs: MarginInputs = {
  qty: 1,
  cost_total: "0",
  transport: "0",
  pack: "0",
  other: "0",
  delivery: "0",
  desired_margin_percent: "35",
};

const numberFields = new Set<keyof ProductFormState>(["price", "cost", "stock", "stock_min"]);

const parseBreakdown = (raw: string): Record<string, number> => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).map(([key, value]) => [key, Number(value || 0)])
    );
  } catch {
    return {};
  }
};

const toDecimalString = (value: string): string => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "0";
  return parsed.toString();
};

const ProductForm: React.FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { productId } = useParams();
  const parsedId = Number(productId);
  const isEditing = Number.isFinite(parsedId) && parsedId > 0;

  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [mainTab, setMainTab] = useState<MainTab>("details");
  const [categoryTab, setCategoryTab] = useState<CategoryTab>("existing");
  const [newCategory, setNewCategory] = useState("");

  const [marginInputs, setMarginInputs] = useState<MarginInputs>(emptyMarginInputs);
  const [preview, setPreview] = useState<PricingPreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);

  const productQuery = useQuery({
    queryKey: ["product", parsedId],
    queryFn: () => getProduct(parsedId),
    enabled: isEditing,
    staleTime: 30_000,
  });
  const categoriesQuery = useQuery({
    queryKey: ["product-categories"],
    queryFn: listProductCategories,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (!productQuery.data) return;
    const source = productQuery.data;
    const breakdown = parseBreakdown(source.direct_costs_breakdown || "{}");
    setForm({
      sku: source.sku || "",
      name: source.name || "",
      category: source.category || "",
      tags: source.tags || "",
      price: Number(source.price || 0),
      cost: Number(source.cost || 0),
      sale_price: Number(source.sale_price ?? source.price ?? 0),
      cost_total: Number(source.cost_total || 0),
      cost_qty: Number(source.cost_qty || 1),
      direct_costs_breakdown: source.direct_costs_breakdown || "{}",
      direct_costs_total: Number(source.direct_costs_total || 0),
      desired_margin: Number(source.desired_margin || 0),
      unit_cost: Number(source.unit_cost || source.cost || 0),
      stock: Number(source.stock || 0),
      stock_min: Number(source.stock_min || 0),
    });
    setMarginInputs({
      qty: Number(source.cost_qty || 1),
      cost_total: String(Number(source.cost_total || source.cost || 0)),
      transport: String(Number(breakdown.transport || 0)),
      pack: String(Number(breakdown.pack || 0)),
      other: String(Number(breakdown.other || 0)),
      delivery: String(Number(breakdown.delivery || 0)),
      desired_margin_percent: String((Number(source.desired_margin || 0) * 100).toFixed(2)),
    });
    setPreview(null);
  }, [productQuery.data]);

  const fields = useMemo(
    () =>
      [
        { key: "sku", label: "SKU", helper: "Unico" },
        { key: "name", label: "Nombre", helper: "" },
        { key: "tags", label: "Tags", helper: "Separar etiquetas con coma. Ej: hojas,cuaderno,rayado" },
        { key: "price", label: "Precio venta", helper: "Precio unitario usado por el POS" },
        { key: "cost", label: "Costo unitario", helper: "" },
        { key: "stock", label: "Stock", helper: "" },
        { key: "stock_min", label: "Stock minimo", helper: "Nivel minimo" },
      ] as Array<{ key: keyof ProductFormState; label: string; helper: string }>,
    []
  );

  const handleFieldChange = (key: keyof ProductFormState, value: string) => {
    if (numberFields.has(key)) {
      const parsed = Number(value);
      setForm((prev) => {
        const next = { ...prev, [key]: parsed } as ProductFormState;
        if (key === "price") next.sale_price = parsed;
        if (key === "cost") next.unit_cost = parsed;
        return next;
      });
      return;
    }
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const categoryOptions = useMemo(() => {
    const values = new Set((categoriesQuery.data || []).map((item) => item.trim()).filter(Boolean));
    const selected = form.category.trim();
    if (selected) values.add(selected);
    return Array.from(values).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  }, [categoriesQuery.data, form.category]);

  const handleCreateCategory = () => {
    const value = newCategory.trim();
    if (!value) {
      showToast({ message: "Escribe un nombre de categoria", severity: "warning" });
      return;
    }
    setForm((prev) => ({ ...prev, category: value }));
    setNewCategory("");
    setCategoryTab("existing");
    showToast({ message: "Categoria agregada al producto", severity: "success" });
  };

  const closeTabOrGoBack = () => {
    if (typeof window !== "undefined" && window.opener && !window.opener.closed) {
      window.close();
      return;
    }
    navigate("/products");
  };

  const pricingPayload = (): PricingPreviewPayload => {
    const desiredMargin = Number(marginInputs.desired_margin_percent);
    return {
      qty: Number(marginInputs.qty || 0),
      cost_total: toDecimalString(marginInputs.cost_total),
      direct_costs_breakdown: {
        transport: toDecimalString(marginInputs.transport),
        pack: toDecimalString(marginInputs.pack),
        other: toDecimalString(marginInputs.other),
        delivery: toDecimalString(marginInputs.delivery),
      },
      desired_margin: (desiredMargin / 100).toString(),
    };
  };

  const handlePreviewPricing = async () => {
    try {
      setPreviewLoading(true);
      const payload = pricingPayload();
      const response = await previewProductPricing(payload);
      setPreview(response);
    } catch (err: any) {
      showToast({ message: err?.response?.data?.detail || "No se pudo calcular", severity: "error" });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleApplyPricing = async () => {
    if (!isEditing) {
      showToast({ message: "Primero guarda el producto para aplicar pricing", severity: "warning" });
      return;
    }
    try {
      setApplyLoading(true);
      const payload = pricingPayload();
      const result = await applyProductPricing(parsedId, payload);
      const breakdown = JSON.stringify(payload.direct_costs_breakdown);
      setForm((prev) => ({
        ...prev,
        price: result.sale_price,
        sale_price: result.sale_price,
        cost: result.unit_cost,
        unit_cost: result.unit_cost,
        cost_total: Number(payload.cost_total),
        cost_qty: payload.qty,
        direct_costs_breakdown: breakdown,
        direct_costs_total: result.direct_costs_total,
        desired_margin: Number(payload.desired_margin),
      }));
      setPreview({
        qty: payload.qty,
        desired_margin: Number(payload.desired_margin),
        direct_costs_total: result.direct_costs_total,
        cost_total_all: result.cost_total_all,
        unit_cost: result.unit_cost,
        sale_price_unit: result.sale_price,
        profit_unit: result.profit_unit,
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["product", parsedId] }),
        qc.invalidateQueries({ queryKey: ["products"] }),
        qc.invalidateQueries({ queryKey: ["products-smart-search"] }),
        qc.invalidateQueries({ queryKey: ["products-smart-search-corrected"] }),
      ]);
      showToast({ message: "Pricing aplicado al producto", severity: "success" });
    } catch (err: any) {
      showToast({ message: err?.response?.data?.detail || "No se pudo aplicar pricing", severity: "error" });
    } finally {
      setApplyLoading(false);
    }
  };

  const handleSave = async (closeAfterSave: boolean) => {
    if (!form.sku.trim() || !form.name.trim()) {
      showToast({ message: "SKU y nombre son obligatorios", severity: "warning" });
      return;
    }
    setSaving(true);
    try {
      const payload: Omit<Product, "id"> = {
        ...form,
        sale_price: Number(form.price || 0),
        price: Number(form.price || 0),
        unit_cost: Number(form.cost || 0),
        cost: Number(form.cost || 0),
        cost_qty: Number(form.cost_qty || 1),
        direct_costs_breakdown: form.direct_costs_breakdown || "{}",
      };
      if (isEditing) {
        await updateProduct(parsedId, payload);
        showToast({ message: "Producto actualizado", severity: "success" });
      } else {
        await createProduct(payload);
        showToast({ message: "Producto creado", severity: "success" });
      }
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["products"] }),
        qc.invalidateQueries({ queryKey: ["product-categories"] }),
        qc.invalidateQueries({ queryKey: ["products-smart-search"] }),
        qc.invalidateQueries({ queryKey: ["products-smart-search-corrected"] }),
      ]);
      if (closeAfterSave) {
        closeTabOrGoBack();
        return;
      }
      if (!isEditing) {
        setForm(emptyForm);
        setCategoryTab("existing");
        setNewCategory("");
        setMainTab("details");
        setMarginInputs(emptyMarginInputs);
        setPreview(null);
      }
    } catch (err: any) {
      showToast({ message: err?.response?.data?.detail || "No se pudo guardar", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (isEditing && productQuery.isLoading) {
    return (
      <Box sx={{ display: "grid", gap: 2 }}>
        <PageHeader title="Editar producto" subtitle="Cargando datos..." icon={<CategoryIcon color="primary" />} loading />
        <Paper sx={{ p: 2 }}>
          <LoadingState title="Cargando producto..." />
        </Paper>
      </Box>
    );
  }

  if (isEditing && productQuery.isError) {
    return (
      <Box sx={{ display: "grid", gap: 2 }}>
        <PageHeader title="Editar producto" subtitle="No se pudo cargar el producto." icon={<CategoryIcon color="primary" />} />
        <Paper sx={{ p: 2 }}>
          <ErrorState title="No se pudo cargar el producto" onRetry={() => productQuery.refetch()} />
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <PageHeader
        title={isEditing ? `Editar producto #${parsedId}` : "Agregar nuevo producto"}
        subtitle="Completa todos los campos para guardar el producto en el catalogo."
        icon={<CategoryIcon color="primary" />}
      />

      <Paper sx={{ p: 2.5 }}>
        <Tabs value={mainTab} onChange={(_event, value) => setMainTab(value)} sx={{ mb: 2 }}>
          <Tab value="details" label="Datos del producto" />
          <Tab value="margin" label="Precio por Margen (Excel)" />
        </Tabs>

        {mainTab === "details" ? (
          <Box sx={{ display: "grid", gap: 2 }}>
            <Typography variant="h6">Datos del producto</Typography>
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              <Box sx={{ display: "grid", gap: 1.25 }}>
                <Tabs value={categoryTab} onChange={(_event, value) => setCategoryTab(value)} variant="fullWidth">
                  <Tab value="existing" label="Categorias" />
                  <Tab value="new" label="Nueva categoria" />
                </Tabs>
                {categoryTab === "existing" ? (
                  <TextField
                    select
                    label="Categoria"
                    value={form.category}
                    onChange={(event) => handleFieldChange("category", event.target.value)}
                    helperText={
                      categoriesQuery.isLoading
                        ? "Cargando categorias..."
                        : categoryOptions.length > 0
                          ? "Selecciona una categoria existente"
                          : "Aun no hay categorias; crea una nueva"
                    }
                    fullWidth
                  >
                    <MenuItem value="">Sin categoria</MenuItem>
                    {categoryOptions.map((item) => (
                      <MenuItem key={item} value={item}>
                        {item}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : (
                  <Box sx={{ display: "grid", gap: 1 }}>
                    <TextField
                      label="Nueva categoria"
                      value={newCategory}
                      onChange={(event) => setNewCategory(event.target.value)}
                      helperText="Crea y asigna la categoria a este producto"
                      fullWidth
                    />
                    <Button variant="outlined" onClick={handleCreateCategory} disabled={!newCategory.trim()}>
                      Crear categoria
                    </Button>
                  </Box>
                )}
              </Box>

              {fields.map((field) => (
                <TextField
                  key={field.key}
                  label={field.label}
                  type={numberFields.has(field.key) ? "number" : "text"}
                  value={form[field.key] as string | number}
                  onChange={(event) => handleFieldChange(field.key, event.target.value)}
                  helperText={field.helper}
                  fullWidth
                />
              ))}
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: "grid", gap: 2 }}>
            <Typography variant="h6">Precio por Margen (Excel)</Typography>
            <Typography variant="body2" color="text.secondary">
              Formula: ((cost_total + costos directos) / (1 - margen)) / qty
            </Typography>
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
              <TextField
                label="Cantidad (qty)"
                type="number"
                value={marginInputs.qty}
                onChange={(event) => setMarginInputs((prev) => ({ ...prev, qty: Number(event.target.value || 0) }))}
              />
              <TextField
                label="Costo total compra"
                type="number"
                value={marginInputs.cost_total}
                onChange={(event) => setMarginInputs((prev) => ({ ...prev, cost_total: event.target.value }))}
              />
              <TextField
                label="Transporte"
                type="number"
                value={marginInputs.transport}
                onChange={(event) => setMarginInputs((prev) => ({ ...prev, transport: event.target.value }))}
              />
              <TextField
                label="Empaque"
                type="number"
                value={marginInputs.pack}
                onChange={(event) => setMarginInputs((prev) => ({ ...prev, pack: event.target.value }))}
              />
              <TextField
                label="Otros"
                type="number"
                value={marginInputs.other}
                onChange={(event) => setMarginInputs((prev) => ({ ...prev, other: event.target.value }))}
              />
              <TextField
                label="Delivery"
                type="number"
                value={marginInputs.delivery}
                onChange={(event) => setMarginInputs((prev) => ({ ...prev, delivery: event.target.value }))}
              />
              <TextField
                label="Margen deseado (%)"
                type="number"
                value={marginInputs.desired_margin_percent}
                onChange={(event) => setMarginInputs((prev) => ({ ...prev, desired_margin_percent: event.target.value }))}
              />
            </Box>

            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
              <Button
                variant="outlined"
                startIcon={<CalculateIcon />}
                onClick={handlePreviewPricing}
                disabled={previewLoading || applyLoading}
              >
                {previewLoading ? "Calculando..." : "Calcular"}
              </Button>
              <Button
                variant="contained"
                startIcon={<PriceCheckIcon />}
                onClick={handleApplyPricing}
                disabled={applyLoading || previewLoading || !isEditing}
              >
                {applyLoading ? "Aplicando..." : "Aplicar"}
              </Button>
            </Box>

            {!isEditing ? (
              <Typography variant="caption" color="warning.main">
                Para aplicar el pricing primero guarda el producto.
              </Typography>
            ) : null}

            {preview ? (
              <Paper sx={{ p: 2, bgcolor: "rgba(18,53,90,0.05)" }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  Resultado de calculo
                </Typography>
                <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                  <Typography>Costos directos: {preview.direct_costs_total.toFixed(2)}</Typography>
                  <Typography>Costo total all: {preview.cost_total_all.toFixed(2)}</Typography>
                  <Typography>Costo unitario: {preview.unit_cost.toFixed(2)}</Typography>
                  <Typography>PVP unitario: {preview.sale_price_unit.toFixed(2)}</Typography>
                  <Typography>Utilidad unitaria: {preview.profit_unit.toFixed(2)}</Typography>
                </Box>
              </Paper>
            ) : null}
          </Box>
        )}

        <Box sx={{ mt: 3, display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={() => handleSave(false)} disabled={saving || applyLoading}>
            {saving ? "Guardando..." : "Guardar"}
          </Button>
          <Button variant="outlined" onClick={() => handleSave(true)} disabled={saving || applyLoading}>
            Guardar y cerrar
          </Button>
          <Button variant="text" color="inherit" startIcon={<ArrowBackIcon />} onClick={closeTabOrGoBack} disabled={saving || applyLoading}>
            Volver
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default ProductForm;
