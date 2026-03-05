import React, { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, MenuItem, Paper, Tab, Tabs, TextField, Typography } from "@mui/material";
import CategoryIcon from "@mui/icons-material/Category";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";
import CalculateIcon from "@mui/icons-material/Calculate";
import PriceCheckIcon from "@mui/icons-material/PriceCheck";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ErrorState, LoadingState, PageHeader, useToast } from "@/app/components";
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

type MainTab = "details" | "margin";
type CategoryTab = "existing" | "new";

const nonNegativeNumberSchema = z.number().min(0, "Debe ser mayor o igual a 0.");
const nonNegativeIntegerSchema = z.number().int("Ingresa un numero entero.").min(0, "Debe ser mayor o igual a 0.");
const positiveIntegerSchema = z.number().int("Ingresa un numero entero.").min(1, "Debe ser al menos 1.");

const decimalInputSchema = z
  .string()
  .trim()
  .min(1, "Ingresa un valor.")
  .refine((value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0;
  }, "Ingresa un monto valido.");

const marginPercentSchema = z
  .string()
  .trim()
  .min(1, "Ingresa el margen deseado.")
  .refine((value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 && parsed < 100;
  }, "Usa un porcentaje entre 0 y 99.99.");

const productFormSchema = z.object({
  sku: z.string().trim().min(1, "Ingresa el SKU.").max(60, "El SKU es demasiado largo."),
  name: z.string().trim().min(2, "Ingresa al menos 2 caracteres.").max(180, "El nombre es demasiado largo."),
  category: z.string().trim().max(80, "La categoria es demasiado larga."),
  tags: z.string().trim().max(200, "Las etiquetas son demasiado largas."),
  price: nonNegativeNumberSchema,
  cost: nonNegativeNumberSchema,
  sale_price: nonNegativeNumberSchema,
  cost_total: nonNegativeNumberSchema,
  cost_qty: positiveIntegerSchema,
  direct_costs_breakdown: z.string(),
  direct_costs_total: nonNegativeNumberSchema,
  desired_margin: z.number().min(0, "El margen no puede ser negativo.").max(0.9999, "El margen debe ser menor a 100%."),
  unit_cost: nonNegativeNumberSchema,
  stock: nonNegativeIntegerSchema,
  stock_min: nonNegativeIntegerSchema,
});

const pricingFormSchema = z.object({
  qty: positiveIntegerSchema,
  cost_total: decimalInputSchema,
  transport: decimalInputSchema,
  pack: decimalInputSchema,
  other: decimalInputSchema,
  delivery: decimalInputSchema,
  desired_margin_percent: marginPercentSchema,
});

type ProductFormValues = z.infer<typeof productFormSchema>;
type MarginInputs = z.infer<typeof pricingFormSchema>;

const emptyForm: ProductFormValues = {
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

const pricingBackedFields = new Set<keyof ProductFormValues>([
  "price",
  "sale_price",
  "cost",
  "unit_cost",
  "cost_total",
  "cost_qty",
  "direct_costs_breakdown",
  "direct_costs_total",
  "desired_margin",
]);

const parseBreakdown = (raw: string): Record<string, number> => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(Object.entries(parsed as Record<string, unknown>).map(([key, value]) => [key, Number(value || 0)]));
  } catch {
    return {};
  }
};

const toDecimalString = (value: string): string => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "0";
  return parsed.toString();
};

const errorMessage = (err: any, fallback: string) => err?.response?.data?.detail || fallback;

const ProductForm: React.FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { productId } = useParams();
  const parsedId = Number(productId);
  const isEditing = Number.isFinite(parsedId) && parsedId > 0;

  const [saving, setSaving] = useState(false);
  const [mainTab, setMainTab] = useState<MainTab>("details");
  const [categoryTab, setCategoryTab] = useState<CategoryTab>("existing");
  const [newCategory, setNewCategory] = useState("");
  const [preview, setPreview] = useState<PricingPreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [pricingError, setPricingError] = useState("");

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

  const {
    register: registerProduct,
    reset: resetProduct,
    setValue: setProductValue,
    getValues: getProductValues,
    watch: watchProduct,
    trigger: triggerProduct,
    formState: { errors: productErrors, isDirty: isProductDirty, dirtyFields: productDirtyFields, isValid: isProductValid },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    mode: "onChange",
    defaultValues: emptyForm,
  });

  const {
    register: registerPricing,
    reset: resetPricing,
    getValues: getPricingValues,
    trigger: triggerPricing,
    formState: { errors: pricingErrors, isDirty: isPricingDirty, isValid: isPricingValid },
  } = useForm<MarginInputs>({
    resolver: zodResolver(pricingFormSchema),
    mode: "onChange",
    defaultValues: emptyMarginInputs,
  });

  useEffect(() => {
    if (!productQuery.data) return;
    const source = productQuery.data;
    const breakdown = parseBreakdown(source.direct_costs_breakdown || "{}");
    resetProduct({
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
    resetPricing({
      qty: Number(source.cost_qty || 1),
      cost_total: String(Number(source.cost_total || source.cost || 0)),
      transport: String(Number(breakdown.transport || 0)),
      pack: String(Number(breakdown.pack || 0)),
      other: String(Number(breakdown.other || 0)),
      delivery: String(Number(breakdown.delivery || 0)),
      desired_margin_percent: String((Number(source.desired_margin || 0) * 100).toFixed(2)),
    });
    setPreview(null);
    setSubmitError("");
    setPricingError("");
  }, [productQuery.data, resetPricing, resetProduct]);

  const selectedCategory = watchProduct("category");

  const categoryOptions = useMemo(() => {
    const values = new Set((categoriesQuery.data || []).map((item) => item.trim()).filter(Boolean));
    const selected = selectedCategory.trim();
    if (selected) values.add(selected);
    return Array.from(values).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  }, [categoriesQuery.data, selectedCategory]);

  const handleCreateCategory = () => {
    const value = newCategory.trim();
    if (!value) {
      showToast({ message: "Escribe un nombre de categoria", severity: "warning" });
      return;
    }
    setSubmitError("");
    setProductValue("category", value, { shouldDirty: true, shouldValidate: true });
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

  const pricingPayload = (values: MarginInputs): PricingPreviewPayload => {
    const desiredMargin = Number(values.desired_margin_percent);
    return {
      qty: Number(values.qty || 0),
      cost_total: toDecimalString(values.cost_total),
      direct_costs_breakdown: {
        transport: toDecimalString(values.transport),
        pack: toDecimalString(values.pack),
        other: toDecimalString(values.other),
        delivery: toDecimalString(values.delivery),
      },
      desired_margin: (desiredMargin / 100).toString(),
    };
  };

  const handlePreviewPricing = async () => {
    setPricingError("");
    const valid = await triggerPricing();
    if (!valid) {
      setMainTab("margin");
      showToast({ message: "Revisa los campos del pricing antes de calcular.", severity: "warning" });
      return;
    }
    try {
      setPreviewLoading(true);
      const response = await previewProductPricing(pricingPayload(getPricingValues()));
      setPreview(response);
    } catch (err: any) {
      const message = errorMessage(err, "No se pudo calcular.");
      setPricingError(message);
      showToast({ message, severity: "error" });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleApplyPricing = async () => {
    if (!isEditing) {
      showToast({ message: "Primero guarda el producto para aplicar pricing", severity: "warning" });
      return;
    }
    setPricingError("");
    const valid = await triggerPricing();
    if (!valid) {
      setMainTab("margin");
      showToast({ message: "Revisa los campos del pricing antes de aplicar.", severity: "warning" });
      return;
    }
    try {
      setApplyLoading(true);
      const pricingValues = getPricingValues();
      const payload = pricingPayload(pricingValues);
      const result = await applyProductPricing(parsedId, payload);
      const breakdown = JSON.stringify(payload.direct_costs_breakdown);
      const currentProduct = getProductValues();
      const nextProduct: ProductFormValues = {
        ...currentProduct,
        price: result.sale_price,
        sale_price: result.sale_price,
        cost: result.unit_cost,
        unit_cost: result.unit_cost,
        cost_total: Number(payload.cost_total),
        cost_qty: payload.qty,
        direct_costs_breakdown: breakdown,
        direct_costs_total: result.direct_costs_total,
        desired_margin: Number(payload.desired_margin),
      };
      const hasNonPricingDirtyFields = Object.keys(productDirtyFields).some(
        (field) => !pricingBackedFields.has(field as keyof ProductFormValues)
      );

      if (hasNonPricingDirtyFields) {
        setProductValue("price", nextProduct.price, { shouldDirty: true, shouldValidate: true });
        setProductValue("sale_price", nextProduct.sale_price, { shouldDirty: true, shouldValidate: true });
        setProductValue("cost", nextProduct.cost, { shouldDirty: true, shouldValidate: true });
        setProductValue("unit_cost", nextProduct.unit_cost, { shouldDirty: true, shouldValidate: true });
        setProductValue("cost_total", nextProduct.cost_total, { shouldDirty: true, shouldValidate: true });
        setProductValue("cost_qty", nextProduct.cost_qty, { shouldDirty: true, shouldValidate: true });
        setProductValue("direct_costs_breakdown", nextProduct.direct_costs_breakdown, { shouldDirty: true, shouldValidate: true });
        setProductValue("direct_costs_total", nextProduct.direct_costs_total, { shouldDirty: true, shouldValidate: true });
        setProductValue("desired_margin", nextProduct.desired_margin, { shouldDirty: true, shouldValidate: true });
      } else {
        resetProduct(nextProduct);
      }

      resetPricing(pricingValues);
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
      showToast({
        message: hasNonPricingDirtyFields ? "Pricing aplicado. Aun hay cambios pendientes en datos del producto." : "Pricing aplicado al producto",
        severity: "success",
      });
    } catch (err: any) {
      const message = errorMessage(err, "No se pudo aplicar pricing.");
      setPricingError(message);
      showToast({ message, severity: "error" });
    } finally {
      setApplyLoading(false);
    }
  };

  const handleSave = async (closeAfterSave: boolean) => {
    setSubmitError("");
    const valid = await triggerProduct();
    if (!valid) {
      setMainTab("details");
      showToast({ message: "Revisa los campos del producto antes de guardar.", severity: "warning" });
      return;
    }

    setSaving(true);
    try {
      const values = getProductValues();
      const payload: Omit<Product, "id"> = {
        ...values,
        sku: values.sku.trim(),
        name: values.name.trim(),
        category: values.category.trim(),
        tags: values.tags.trim(),
        sale_price: Number(values.price || 0),
        price: Number(values.price || 0),
        unit_cost: Number(values.cost || 0),
        cost: Number(values.cost || 0),
        cost_qty: Number(values.cost_qty || 1),
        direct_costs_breakdown: values.direct_costs_breakdown || "{}",
      };
      if (isEditing) {
        await updateProduct(parsedId, payload);
        showToast({ message: "Producto actualizado", severity: "success" });
        resetProduct(payload);
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
        resetProduct(emptyForm);
        resetPricing(emptyMarginInputs);
        setCategoryTab("existing");
        setNewCategory("");
        setMainTab("details");
        setPreview(null);
      }
    } catch (err: any) {
      const message = errorMessage(err, "No se pudo guardar.");
      setSubmitError(message);
      showToast({ message, severity: "error" });
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
        subtitle="Completa los datos clave, valida pricing y guarda el producto en el catalogo."
        icon={<CategoryIcon color="primary" />}
      />

      <Paper sx={{ p: 2.5 }}>
        <Tabs value={mainTab} onChange={(_event, value) => setMainTab(value)} sx={{ mb: 2 }}>
          <Tab value="details" label="Datos del producto" />
          <Tab value="margin" label="Precio por margen" />
        </Tabs>

        {mainTab === "details" ? (
          <Box sx={{ display: "grid", gap: 2 }}>
            <Typography variant="h6">Datos del producto</Typography>
            {submitError ? <Alert severity="error">{submitError}</Alert> : null}
            {isProductDirty ? (
              <Typography variant="caption" color="text.secondary">
                Hay cambios pendientes por guardar en el producto.
              </Typography>
            ) : null}

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
                    error={!!productErrors.category}
                    helperText={
                      productErrors.category?.message ||
                      (categoriesQuery.isLoading
                        ? "Cargando categorias..."
                        : categoryOptions.length > 0
                          ? "Selecciona una categoria existente."
                          : "Aun no hay categorias. Puedes crear una nueva.")
                    }
                    fullWidth
                    {...registerProduct("category", {
                      onChange: () => setSubmitError(""),
                    })}
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
                      helperText="Crea y asigna la categoria a este producto."
                      fullWidth
                    />
                    <Button type="button" variant="outlined" onClick={handleCreateCategory} disabled={!newCategory.trim()}>
                      Crear categoria
                    </Button>
                  </Box>
                )}
              </Box>

              <TextField
                label="SKU"
                error={!!productErrors.sku}
                helperText={productErrors.sku?.message || "Codigo unico para ventas e inventario."}
                fullWidth
                {...registerProduct("sku", {
                  onChange: () => setSubmitError(""),
                })}
              />
              <TextField
                label="Nombre"
                error={!!productErrors.name}
                helperText={productErrors.name?.message || "Nombre visible en POS, catalogo y reportes."}
                fullWidth
                {...registerProduct("name", {
                  onChange: () => setSubmitError(""),
                })}
              />
              <TextField
                label="Tags"
                error={!!productErrors.tags}
                helperText={productErrors.tags?.message || "Separa etiquetas con coma. Ej: hojas, cuaderno, rayado."}
                fullWidth
                {...registerProduct("tags", {
                  onChange: () => setSubmitError(""),
                })}
              />
              <TextField
                label="Precio venta"
                type="number"
                error={!!productErrors.price}
                helperText={productErrors.price?.message || "Precio unitario usado por el POS."}
                inputProps={{ min: 0, step: "0.01" }}
                fullWidth
                {...registerProduct("price", {
                  setValueAs: (value) => (value === "" ? 0 : Number(value)),
                  onChange: (event) => {
                    setSubmitError("");
                    const next = event.target.value === "" ? 0 : Number(event.target.value);
                    setProductValue("sale_price", next, { shouldDirty: true, shouldValidate: true });
                  },
                })}
              />
              <TextField
                label="Costo unitario"
                type="number"
                error={!!productErrors.cost}
                helperText={productErrors.cost?.message || "Costo base unitario antes de margen."}
                inputProps={{ min: 0, step: "0.01" }}
                fullWidth
                {...registerProduct("cost", {
                  setValueAs: (value) => (value === "" ? 0 : Number(value)),
                  onChange: (event) => {
                    setSubmitError("");
                    const next = event.target.value === "" ? 0 : Number(event.target.value);
                    setProductValue("unit_cost", next, { shouldDirty: true, shouldValidate: true });
                  },
                })}
              />
              <TextField
                label="Stock"
                type="number"
                error={!!productErrors.stock}
                helperText={productErrors.stock?.message || "Existencia actual disponible."}
                inputProps={{ min: 0, step: 1 }}
                fullWidth
                {...registerProduct("stock", {
                  setValueAs: (value) => (value === "" ? 0 : Number(value)),
                  onChange: () => setSubmitError(""),
                })}
              />
              <TextField
                label="Stock minimo"
                type="number"
                error={!!productErrors.stock_min}
                helperText={productErrors.stock_min?.message || "Nivel minimo antes de reposicion."}
                inputProps={{ min: 0, step: 1 }}
                fullWidth
                {...registerProduct("stock_min", {
                  setValueAs: (value) => (value === "" ? 0 : Number(value)),
                  onChange: () => setSubmitError(""),
                })}
              />
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: "grid", gap: 2 }}>
            <Typography variant="h6">Precio por margen</Typography>
            <Typography variant="body2" color="text.secondary">
              Formula: ((costo total + costos directos) / (1 - margen)) / cantidad
            </Typography>
            {pricingError ? <Alert severity="error">{pricingError}</Alert> : null}
            {isPricingDirty ? (
              <Typography variant="caption" color="text.secondary">
                El calculo puede estar desactualizado. Vuelve a calcular o aplicar despues de cambiar cualquier valor.
              </Typography>
            ) : null}
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
              <TextField
                label="Cantidad"
                type="number"
                error={!!pricingErrors.qty}
                helperText={pricingErrors.qty?.message || "Cantidad de unidades en la compra."}
                inputProps={{ min: 1, step: 1 }}
                {...registerPricing("qty", {
                  setValueAs: (value) => (value === "" ? 0 : Number(value)),
                  onChange: () => {
                    setPricingError("");
                    setPreview(null);
                  },
                })}
              />
              <TextField
                label="Costo total compra"
                type="number"
                error={!!pricingErrors.cost_total}
                helperText={pricingErrors.cost_total?.message || "Monto total pagado por la compra."}
                inputProps={{ min: 0, step: "0.01" }}
                {...registerPricing("cost_total", {
                  onChange: () => {
                    setPricingError("");
                    setPreview(null);
                  },
                })}
              />
              <TextField
                label="Transporte"
                type="number"
                error={!!pricingErrors.transport}
                helperText={pricingErrors.transport?.message || "Costo logistica asociado."}
                inputProps={{ min: 0, step: "0.01" }}
                {...registerPricing("transport", {
                  onChange: () => {
                    setPricingError("");
                    setPreview(null);
                  },
                })}
              />
              <TextField
                label="Empaque"
                type="number"
                error={!!pricingErrors.pack}
                helperText={pricingErrors.pack?.message || "Costo de empaque por compra."}
                inputProps={{ min: 0, step: "0.01" }}
                {...registerPricing("pack", {
                  onChange: () => {
                    setPricingError("");
                    setPreview(null);
                  },
                })}
              />
              <TextField
                label="Otros"
                type="number"
                error={!!pricingErrors.other}
                helperText={pricingErrors.other?.message || "Costos directos adicionales."}
                inputProps={{ min: 0, step: "0.01" }}
                {...registerPricing("other", {
                  onChange: () => {
                    setPricingError("");
                    setPreview(null);
                  },
                })}
              />
              <TextField
                label="Delivery"
                type="number"
                error={!!pricingErrors.delivery}
                helperText={pricingErrors.delivery?.message || "Costo de entrega final."}
                inputProps={{ min: 0, step: "0.01" }}
                {...registerPricing("delivery", {
                  onChange: () => {
                    setPricingError("");
                    setPreview(null);
                  },
                })}
              />
              <TextField
                label="Margen deseado (%)"
                type="number"
                error={!!pricingErrors.desired_margin_percent}
                helperText={pricingErrors.desired_margin_percent?.message || "Usa un porcentaje menor a 100."}
                inputProps={{ min: 0, max: 99.99, step: "0.01" }}
                {...registerPricing("desired_margin_percent", {
                  onChange: () => {
                    setPricingError("");
                    setPreview(null);
                  },
                })}
              />
            </Box>

            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
              <Button
                type="button"
                variant="outlined"
                startIcon={<CalculateIcon />}
                onClick={handlePreviewPricing}
                disabled={previewLoading || applyLoading || !isPricingValid}
              >
                {previewLoading ? "Calculando..." : "Calcular"}
              </Button>
              <Button
                type="button"
                variant="contained"
                startIcon={<PriceCheckIcon />}
                onClick={handleApplyPricing}
                disabled={applyLoading || previewLoading || !isEditing || !isPricingValid}
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
                  Resultado del calculo
                </Typography>
                <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                  <Typography>Costos directos: {preview.direct_costs_total.toFixed(2)}</Typography>
                  <Typography>Costo total: {preview.cost_total_all.toFixed(2)}</Typography>
                  <Typography>Costo unitario: {preview.unit_cost.toFixed(2)}</Typography>
                  <Typography>PVP unitario: {preview.sale_price_unit.toFixed(2)}</Typography>
                  <Typography>Utilidad unitaria: {preview.profit_unit.toFixed(2)}</Typography>
                </Box>
              </Paper>
            ) : null}
          </Box>
        )}

        <Box sx={{ mt: 3, display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          <Button
            type="button"
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={() => handleSave(false)}
            disabled={saving || applyLoading || !isProductValid}
          >
            {saving ? "Guardando..." : "Guardar"}
          </Button>
          <Button type="button" variant="outlined" onClick={() => handleSave(true)} disabled={saving || applyLoading || !isProductValid}>
            Guardar y cerrar
          </Button>
          <Button type="button" variant="text" color="inherit" startIcon={<ArrowBackIcon />} onClick={closeTabOrGoBack} disabled={saving || applyLoading}>
            Volver
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default ProductForm;
