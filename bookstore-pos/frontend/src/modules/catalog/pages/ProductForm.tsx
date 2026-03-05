import React, { useEffect, useMemo, useState } from "react";
import { Box, Button, MenuItem, Paper, Tab, Tabs, TextField, Typography } from "@mui/material";
import CategoryIcon from "@mui/icons-material/Category";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader, ErrorState, LoadingState, useToast } from "@/app/components";
import { createProduct, getProduct, listProductCategories, updateProduct } from "@/modules/catalog/api";
import type { Product } from "@/modules/shared/types";

type ProductFormState = Omit<Product, "id">;

const emptyForm: ProductFormState = {
  sku: "",
  name: "",
  category: "",
  tags: "",
  price: 0,
  cost: 0,
  stock: 0,
  stock_min: 0,
};

const numberFields = new Set<keyof ProductFormState>(["price", "cost", "stock", "stock_min"]);

const ProductForm: React.FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { productId } = useParams();
  const parsedId = Number(productId);
  const isEditing = Number.isFinite(parsedId) && parsedId > 0;
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [categoryTab, setCategoryTab] = useState<"existing" | "new">("existing");
  const [newCategory, setNewCategory] = useState("");

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
    setForm({
      sku: source.sku || "",
      name: source.name || "",
      category: source.category || "",
      tags: source.tags || "",
      price: Number(source.price || 0),
      cost: Number(source.cost || 0),
      stock: Number(source.stock || 0),
      stock_min: Number(source.stock_min || 0),
    });
  }, [productQuery.data]);

  const fields = useMemo(
    () => [
      { key: "sku", label: "SKU", helper: "Unico" },
      { key: "name", label: "Nombre", helper: "" },
      { key: "tags", label: "Tags", helper: "Separar etiquetas con coma. Ej: hojas,cuaderno,rayado" },
      { key: "price", label: "Precio", helper: "" },
      { key: "cost", label: "Costo", helper: "" },
      { key: "stock", label: "Stock", helper: "" },
      { key: "stock_min", label: "Stock minimo", helper: "Nivel minimo" },
    ] as Array<{ key: keyof ProductFormState; label: string; helper: string }>,
    []
  );

  const handleFieldChange = (key: keyof ProductFormState, value: string) => {
    if (numberFields.has(key)) {
      setForm((prev) => ({ ...prev, [key]: Number(value) }));
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

  const handleSave = async (closeAfterSave: boolean) => {
    if (!form.sku.trim() || !form.name.trim()) {
      showToast({ message: "SKU y nombre son obligatorios", severity: "warning" });
      return;
    }
    setSaving(true);
    try {
      if (isEditing) {
        await updateProduct(parsedId, form);
        showToast({ message: "Producto actualizado", severity: "success" });
      } else {
        await createProduct(form);
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
        <Typography variant="h6" sx={{ mb: 2 }}>
          Datos del producto
        </Typography>
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
        <Box sx={{ mt: 3, display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={() => handleSave(false)} disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </Button>
          <Button variant="outlined" onClick={() => handleSave(true)} disabled={saving}>
            Guardar y cerrar
          </Button>
          <Button variant="text" color="inherit" startIcon={<ArrowBackIcon />} onClick={closeTabOrGoBack} disabled={saving}>
            Volver
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default ProductForm;
