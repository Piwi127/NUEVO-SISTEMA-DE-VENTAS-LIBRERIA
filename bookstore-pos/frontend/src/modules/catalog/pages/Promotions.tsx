import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import CampaignIcon from "@mui/icons-material/Campaign";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CardTable, ConfirmDialog, EmptyState, ErrorState, PageHeader, ResizableTable, TableToolbar, useToast } from "@/app/components";
import {
  ProductPromotionRule,
  ProductPromotionRuleCreate,
  createProductPromotionRule,
  createPromotion,
  deleteProductPromotionRule,
  deletePromotion,
  listProductPromotionRules,
  listPromotions,
  updatePromotion,
  updateProductPromotionRule,
} from "@/modules/catalog/api";
import { listProducts } from "@/modules/catalog/api/products";
import { useSettings } from "@/app/store";

const promotionTypes = ["PERCENT", "AMOUNT"] as const;
const ruleTypes = ["BUNDLE_PRICE", "UNIT_PRICE_BY_QTY"] as const;

const globalPromotionSchema = z
  .object({
    name: z.string().trim().min(2, "Ingresa al menos 2 caracteres.").max(120, "El nombre es demasiado largo."),
    type: z.enum(promotionTypes),
    value: z.number().positive("El valor debe ser mayor que 0."),
    is_active: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.type === "PERCENT" && values.value > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: "El descuento porcentual no puede exceder 100.",
      });
    }
  });

const rulePromotionSchema = z
  .object({
    name: z.string().trim().min(2, "Ingresa al menos 2 caracteres.").max(120, "El nombre es demasiado largo."),
    product_id: z.number().int().positive("Selecciona un producto."),
    rule_type: z.enum(ruleTypes),
    bundle_qty: z.number().int("Ingresa un numero entero."),
    bundle_price: z.number(),
    min_qty: z.number().int("Ingresa un numero entero."),
    unit_price: z.number(),
    priority: z.number().int("La prioridad debe ser entera.").min(0, "La prioridad no puede ser negativa."),
    start_date: z.string().default(""),
    end_date: z.string().default(""),
    is_active: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.rule_type === "BUNDLE_PRICE") {
      if (values.bundle_qty < 2) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["bundle_qty"], message: "La cantidad del pack debe ser al menos 2." });
      }
      if (values.bundle_price <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["bundle_price"], message: "El precio del pack debe ser mayor a 0." });
      }
    }
    if (values.rule_type === "UNIT_PRICE_BY_QTY") {
      if (values.min_qty < 2) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["min_qty"], message: "La cantidad minima debe ser al menos 2." });
      }
      if (values.unit_price <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["unit_price"], message: "El precio unitario promocional debe ser mayor a 0." });
      }
    }
    if (values.start_date && values.end_date && values.end_date < values.start_date) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["end_date"], message: "La fecha fin no puede ser menor que la fecha inicio." });
    }
  });

type GlobalPromotionValues = z.infer<typeof globalPromotionSchema>;
type RulePromotionValues = z.infer<typeof rulePromotionSchema>;

const defaultGlobalValues: GlobalPromotionValues = {
  name: "",
  type: "PERCENT",
  value: 0,
  is_active: true,
};

const defaultRuleValues: RulePromotionValues = {
  name: "",
  product_id: 0,
  rule_type: "BUNDLE_PRICE",
  bundle_qty: 3,
  bundle_price: 0,
  min_qty: 3,
  unit_price: 0,
  priority: 0,
  start_date: "",
  end_date: "",
  is_active: true,
};

// Página de gestión de promociones
// Crea, edita y elimina promociones y descuentos
  const qc = useQueryClient();
  const { showToast } = useToast();
  const globalFormRef = useRef<HTMLDivElement | null>(null);
  const ruleFormRef = useRef<HTMLDivElement | null>(null);
  const compact = useMediaQuery("(max-width:900px)");
  const { compactMode } = useSettings();
  const isCompact = compactMode || compact;

  const promotionsQuery = useQuery({ queryKey: ["promotions"], queryFn: listPromotions, staleTime: 60_000 });
  const rulesQuery = useQuery({ queryKey: ["promotion-rules"], queryFn: () => listProductPromotionRules(), staleTime: 60_000 });
  const productsQuery = useQuery({
    queryKey: ["promotion-rule-products"],
    queryFn: () => listProducts(undefined, 500, 0, undefined, undefined, false),
    staleTime: 60_000,
  });

  const [editingPromotionId, setEditingPromotionId] = useState<number | null>(null);
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [deletingPromotionId, setDeletingPromotionId] = useState<number | null>(null);
  const [deletingRuleId, setDeletingRuleId] = useState<number | null>(null);
  const [globalSubmitError, setGlobalSubmitError] = useState("");
  const [ruleSubmitError, setRuleSubmitError] = useState("");

  const {
    control: globalControl,
    register: registerGlobal,
    reset: resetGlobal,
    handleSubmit: handleGlobalSubmit,
    formState: { errors: globalErrors, isDirty: isGlobalDirty, isSubmitting: isGlobalSubmitting, isValid: isGlobalValid },
  } = useForm<GlobalPromotionValues>({
    resolver: zodResolver(globalPromotionSchema),
    mode: "onChange",
    defaultValues: defaultGlobalValues,
  });

  const {
    control: ruleControl,
    register: registerRule,
    reset: resetRule,
    watch: watchRule,
    handleSubmit: handleRuleSubmit,
    formState: { errors: ruleErrors, isDirty: isRuleDirty, isSubmitting: isRuleSubmitting, isValid: isRuleValid },
  } = useForm<RulePromotionValues>({
    resolver: zodResolver(rulePromotionSchema),
    mode: "onChange",
    defaultValues: defaultRuleValues,
  });
  const selectedRuleType = watchRule("rule_type");

  const products = productsQuery.data || [];
  const productNameById = useMemo(() => {
    const map: Record<number, string> = {};
    products.forEach((product) => {
      map[product.id] = product.name;
    });
    return map;
  }, [products]);

  const formatDateTimeLocal = (value?: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (n: number) => `${n}`.padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const formatRuleSummary = (rule: ProductPromotionRule) => {
    if (rule.rule_type === "BUNDLE_PRICE") return `Pack: ${rule.bundle_qty} x ${rule.bundle_price.toFixed(2)}`;
    return `Desde ${rule.min_qty} uds -> ${rule.unit_price.toFixed(2)} c/u`;
  };

  const resetGlobalForm = () => {
    setEditingPromotionId(null);
    setGlobalSubmitError("");
    resetGlobal(defaultGlobalValues);
  };

  const resetRuleForm = () => {
    setEditingRuleId(null);
    setRuleSubmitError("");
    resetRule(defaultRuleValues);
  };

  const refreshRuleQueries = async () => {
    await qc.invalidateQueries({ queryKey: ["promotion-rules"] });
    await qc.invalidateQueries({ queryKey: ["promotion-pack-rules-active"] });
    await qc.invalidateQueries({ queryKey: ["promotion-rules-active"] });
  };

  const globalMutation = useMutation({
    mutationFn: async (values: GlobalPromotionValues) => {
      const payload = {
        name: values.name.trim(),
        type: values.type,
        value: Number(values.value),
        is_active: values.is_active,
      };
      if (editingPromotionId) return updatePromotion(editingPromotionId, payload);
      return createPromotion(payload);
    },
    onSuccess: async () => {
      showToast({ message: editingPromotionId ? "Promocion global actualizada" : "Promocion global creada", severity: "success" });
      resetGlobalForm();
      await qc.invalidateQueries({ queryKey: ["promotions"] });
      await qc.invalidateQueries({ queryKey: ["promotions-active"] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || "No se pudo guardar la promocion global";
      setGlobalSubmitError(message);
      showToast({ message, severity: "error" });
    },
  });

  const deleteGlobalMutation = useMutation({
    mutationFn: async (promotionId: number) => deletePromotion(promotionId),
    onSuccess: async (_result, promotionId) => {
      if (editingPromotionId === promotionId) resetGlobalForm();
      setDeletingPromotionId(null);
      await qc.invalidateQueries({ queryKey: ["promotions"] });
      await qc.invalidateQueries({ queryKey: ["promotions-active"] });
      showToast({ message: "Promocion global eliminada", severity: "success" });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || "No se pudo eliminar la promocion global";
      showToast({ message, severity: "error" });
    },
  });

  const ruleMutation = useMutation({
    mutationFn: async (values: RulePromotionValues) => {
      const commonPayload = {
        name: values.name.trim(),
        product_id: Number(values.product_id),
        priority: Number(values.priority || 0),
        start_date: values.start_date ? new Date(values.start_date).toISOString() : null,
        end_date: values.end_date ? new Date(values.end_date).toISOString() : null,
        is_active: values.is_active,
      };

      if (values.rule_type === "BUNDLE_PRICE") {
        const payload: ProductPromotionRuleCreate = {
          ...commonPayload,
          rule_type: "BUNDLE_PRICE",
          bundle_qty: Number(values.bundle_qty),
          bundle_price: Number(values.bundle_price),
        };
        if (editingRuleId) return updateProductPromotionRule(editingRuleId, payload);
        return createProductPromotionRule(payload);
      }

      const payload: ProductPromotionRuleCreate = {
        ...commonPayload,
        rule_type: "UNIT_PRICE_BY_QTY",
        min_qty: Number(values.min_qty),
        unit_price: Number(values.unit_price),
      };
      if (editingRuleId) return updateProductPromotionRule(editingRuleId, payload);
      return createProductPromotionRule(payload);
    },
    onSuccess: async () => {
      showToast({ message: editingRuleId ? "Regla promocional actualizada" : "Regla promocional creada", severity: "success" });
      resetRuleForm();
      await refreshRuleQueries();
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || "No se pudo guardar la regla promocional";
      setRuleSubmitError(message);
      showToast({ message, severity: "error" });
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async (rule: ProductPromotionRule) => updateProductPromotionRule(rule.id, { is_active: !rule.is_active }),
    onSuccess: async (_result, rule) => {
      await refreshRuleQueries();
      showToast({ message: rule.is_active ? "Regla desactivada" : "Regla activada", severity: "success" });
    },
    onError: (error: any) => {
      showToast({ message: error?.response?.data?.detail || "No se pudo cambiar el estado de la regla", severity: "error" });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (ruleId: number) => deleteProductPromotionRule(ruleId),
    onSuccess: async (_result, ruleId) => {
      if (editingRuleId === ruleId) resetRuleForm();
      setDeletingRuleId(null);
      await refreshRuleQueries();
      showToast({ message: "Regla promocional eliminada", severity: "success" });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || "No se pudo eliminar la regla promocional";
      showToast({ message, severity: "error" });
    },
  });

  const globalPromotions = promotionsQuery.data || [];
  const rules = rulesQuery.data || [];
  const loading = promotionsQuery.isLoading || rulesQuery.isLoading || productsQuery.isLoading;
  const hasLoadError = promotionsQuery.isError || rulesQuery.isError || productsQuery.isError;

  const loadGlobalForEdit = (promotion: (typeof globalPromotions)[number]) => {
    setEditingPromotionId(promotion.id);
    setGlobalSubmitError("");
    resetGlobal({
      name: promotion.name,
      type: promotion.type === "AMOUNT" ? "AMOUNT" : "PERCENT",
      value: Number(promotion.value),
      is_active: promotion.is_active,
    });
    window.setTimeout(() => {
      globalFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const renderGlobalActions = (promotion: (typeof globalPromotions)[number]) => (
    <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", justifyContent: "flex-end" }}>
      <Button size="small" variant="outlined" onClick={() => loadGlobalForEdit(promotion)}>
        Ver/Editar
      </Button>
      <Button size="small" variant="outlined" color="error" disabled={deleteGlobalMutation.isPending} onClick={() => setDeletingPromotionId(promotion.id)}>
        Eliminar
      </Button>
    </Box>
  );

  const globalCardRows = globalPromotions.map((promotion) => ({
    key: promotion.id,
    title: promotion.name,
    subtitle: promotion.type === "PERCENT" ? `${promotion.value}%` : `${promotion.value}`,
    right: (
      <Box sx={{ display: "grid", gap: 0.75, justifyItems: "end" }}>
        <Typography sx={{ fontWeight: 700 }}>{promotion.is_active ? "Activa" : "Inactiva"}</Typography>
        {renderGlobalActions(promotion)}
      </Box>
    ),
    fields: [{ label: "Tipo", value: promotion.type }],
  }));

  const loadRuleForEdit = (rule: ProductPromotionRule) => {
    setEditingRuleId(rule.id);
    setRuleSubmitError("");
    resetRule({
      name: rule.name,
      product_id: rule.product_id,
      rule_type: rule.rule_type,
      bundle_qty: rule.rule_type === "BUNDLE_PRICE" ? rule.bundle_qty : 3,
      bundle_price: rule.rule_type === "BUNDLE_PRICE" ? rule.bundle_price : 0,
      min_qty: rule.rule_type === "UNIT_PRICE_BY_QTY" ? rule.min_qty : 3,
      unit_price: rule.rule_type === "UNIT_PRICE_BY_QTY" ? rule.unit_price : 0,
      priority: rule.priority || 0,
      start_date: formatDateTimeLocal(rule.start_date),
      end_date: formatDateTimeLocal(rule.end_date),
      is_active: rule.is_active,
    });
    window.setTimeout(() => {
      ruleFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const renderRuleActions = (rule: ProductPromotionRule) => (
    <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", justifyContent: "flex-end" }}>
      <Button size="small" variant="outlined" onClick={() => loadRuleForEdit(rule)}>
        Ver/Editar
      </Button>
      <Button size="small" variant="outlined" color={rule.is_active ? "warning" : "success"} disabled={toggleRuleMutation.isPending} onClick={() => toggleRuleMutation.mutate(rule)}>
        {rule.is_active ? "Desactivar" : "Activar"}
      </Button>
      <Button size="small" variant="outlined" color="error" disabled={deleteRuleMutation.isPending} onClick={() => setDeletingRuleId(rule.id)}>
        Eliminar
      </Button>
    </Box>
  );

  const ruleCardRows = rules.map((rule) => ({
    key: rule.id,
    title: rule.name,
    subtitle: productNameById[rule.product_id] || `Producto #${rule.product_id}`,
    right: (
      <Box sx={{ display: "grid", gap: 0.75, justifyItems: "end" }}>
        <Typography sx={{ fontWeight: 700, color: rule.is_active ? "success.main" : "text.secondary" }}>
          {rule.is_active ? "Activa" : "Inactiva"}
        </Typography>
        {renderRuleActions(rule)}
      </Box>
    ),
    fields: [
      { label: "Regla", value: formatRuleSummary(rule) },
      { label: "Tipo", value: rule.rule_type },
      { label: "Prioridad", value: `${rule.priority || 0}` },
    ],
  }));

  const onSaveGlobal = async (values: GlobalPromotionValues) => {
    setGlobalSubmitError("");
    await globalMutation.mutateAsync(values);
  };

  const onSaveRule = async (values: RulePromotionValues) => {
    setRuleSubmitError("");
    await ruleMutation.mutateAsync(values);
  };

  if (hasLoadError) {
    return (
      <Box sx={{ display: "grid", gap: 2 }}>
        <PageHeader
          title="Promociones"
          subtitle="Gestiona promociones globales y reglas automaticas por producto."
          icon={<CampaignIcon color="primary" />}
        />
        <Paper sx={{ p: 2 }}>
          <ErrorState
            title="No se pudieron cargar las promociones"
            onRetry={() => {
              promotionsQuery.refetch();
              rulesQuery.refetch();
              productsQuery.refetch();
            }}
          />
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <PageHeader
        title="Promociones"
        subtitle="Gestiona promociones globales y reglas por producto (pack y precio unitario por cantidad)."
        icon={<CampaignIcon color="primary" />}
        chips={[`Globales: ${globalPromotions.length}`, `Reglas: ${rules.length}`]}
        loading={loading}
      />

      <Paper ref={globalFormRef} sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {editingPromotionId ? `Ver/Editar promocion global #${editingPromotionId}` : "Nueva promocion global"}
        </Typography>
        <Box component="form" onSubmit={handleGlobalSubmit(onSaveGlobal)} sx={{ display: "grid", gap: 2 }}>
          {globalSubmitError ? <Alert severity="error">{globalSubmitError}</Alert> : null}
          {isGlobalDirty ? (
            <Typography variant="caption" color="text.secondary">
              Hay cambios pendientes por guardar en la promocion global.
            </Typography>
          ) : null}
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: isCompact ? "1fr" : "repeat(auto-fit, minmax(200px, 1fr))" }}>
            <TextField
              label="Nombre"
              error={!!globalErrors.name}
              helperText={globalErrors.name?.message || "Nombre visible para la regla promocional."}
              {...registerGlobal("name", {
                onChange: () => setGlobalSubmitError(""),
              })}
            />
            <TextField
              select
              label="Tipo"
              error={!!globalErrors.type}
              helperText={globalErrors.type?.message || "Define si el descuento es porcentual o monto fijo."}
              {...registerGlobal("type", {
                onChange: () => setGlobalSubmitError(""),
              })}
            >
              <MenuItem value="PERCENT">% Descuento</MenuItem>
              <MenuItem value="AMOUNT">Monto fijo</MenuItem>
            </TextField>
            <TextField
              label="Valor"
              type="number"
              error={!!globalErrors.value}
              helperText={globalErrors.value?.message || "Ingresa el valor aplicado por la promocion."}
              inputProps={{ min: 0, step: "0.01" }}
              {...registerGlobal("value", {
                setValueAs: (value) => (value === "" ? 0 : Number(value)),
                onChange: () => setGlobalSubmitError(""),
              })}
            />
            <Controller
              control={globalControl}
              name="is_active"
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={field.value}
                      onChange={(event) => {
                        setGlobalSubmitError("");
                        field.onChange(event.target.checked);
                      }}
                    />
                  }
                  label="Activa"
                />
              )}
            />
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
              <Button type="submit" variant="contained" disabled={!isGlobalValid || isGlobalSubmitting}>
                {isGlobalSubmitting ? "Guardando..." : editingPromotionId ? "Actualizar promocion" : "Crear"}
              </Button>
              {editingPromotionId ? (
                <Button type="button" variant="outlined" onClick={resetGlobalForm} disabled={isGlobalSubmitting}>
                  Cancelar edicion
                </Button>
              ) : null}
            </Box>
          </Box>
        </Box>
      </Paper>

      <Paper ref={ruleFormRef} sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {editingRuleId ? `Ver/Editar regla #${editingRuleId}` : "Nueva regla por producto"}
        </Typography>
        <Box component="form" onSubmit={handleRuleSubmit(onSaveRule)} sx={{ display: "grid", gap: 2 }}>
          {ruleSubmitError ? <Alert severity="error">{ruleSubmitError}</Alert> : null}
          {isRuleDirty ? (
            <Typography variant="caption" color="text.secondary">
              Hay cambios pendientes por guardar en la regla promocional.
            </Typography>
          ) : null}
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: isCompact ? "1fr" : "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <TextField
              label="Nombre de regla"
              error={!!ruleErrors.name}
              helperText={ruleErrors.name?.message || "Nombre visible para caja y reportes."}
              {...registerRule("name", {
                onChange: () => setRuleSubmitError(""),
              })}
            />
            <Controller
              control={ruleControl}
              name="product_id"
              render={({ field }) => (
                <Autocomplete
                  options={products}
                  autoHighlight
                  value={products.find((product) => product.id === field.value) || null}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  getOptionLabel={(option) => `${option.sku} - ${option.name}`}
                  noOptionsText="No se encontraron productos"
                  loadingText="Cargando productos..."
                  onChange={(_event, selectedProduct) => {
                    setRuleSubmitError("");
                    field.onChange(selectedProduct?.id ?? 0);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Producto"
                      placeholder="Busca por SKU o nombre"
                      error={!!ruleErrors.product_id}
                      helperText={ruleErrors.product_id?.message || "Selecciona el producto al que aplica la regla."}
                      onBlur={field.onBlur}
                    />
                  )}
                />
              )}
            />
            <TextField
              select
              label="Tipo de regla"
              error={!!ruleErrors.rule_type}
              helperText={ruleErrors.rule_type?.message || "Selecciona Pack o Precio unitario por cantidad."}
              {...registerRule("rule_type", {
                onChange: () => setRuleSubmitError(""),
              })}
            >
              <MenuItem value="BUNDLE_PRICE">Pack (cantidad + precio total)</MenuItem>
              <MenuItem value="UNIT_PRICE_BY_QTY">Precio unitario por cantidad</MenuItem>
            </TextField>
            <TextField
              label="Prioridad"
              type="number"
              error={!!ruleErrors.priority}
              helperText={ruleErrors.priority?.message || "Mayor prioridad gana en empates de descuento."}
              inputProps={{ min: 0, step: 1 }}
              {...registerRule("priority", {
                setValueAs: (value) => (value === "" ? 0 : Number(value)),
                onChange: () => setRuleSubmitError(""),
              })}
            />
            {selectedRuleType === "BUNDLE_PRICE" ? (
              <>
                <TextField
                  label="Cantidad del pack"
                  type="number"
                  error={!!ruleErrors.bundle_qty}
                  helperText={ruleErrors.bundle_qty?.message || "Cantidad minima incluida en el pack."}
                  inputProps={{ min: 2, step: 1 }}
                  {...registerRule("bundle_qty", {
                    setValueAs: (value) => (value === "" ? 0 : Number(value)),
                    onChange: () => setRuleSubmitError(""),
                  })}
                />
                <TextField
                  label="Precio del pack"
                  type="number"
                  error={!!ruleErrors.bundle_price}
                  helperText={ruleErrors.bundle_price?.message || "Precio total del pack promocional."}
                  inputProps={{ min: 0, step: "0.01" }}
                  {...registerRule("bundle_price", {
                    setValueAs: (value) => (value === "" ? 0 : Number(value)),
                    onChange: () => setRuleSubmitError(""),
                  })}
                />
              </>
            ) : (
              <>
                <TextField
                  label="Cantidad minima"
                  type="number"
                  error={!!ruleErrors.min_qty}
                  helperText={ruleErrors.min_qty?.message || "Umbral desde el cual cambia el precio unitario."}
                  inputProps={{ min: 2, step: 1 }}
                  {...registerRule("min_qty", {
                    setValueAs: (value) => (value === "" ? 0 : Number(value)),
                    onChange: () => setRuleSubmitError(""),
                  })}
                />
                <TextField
                  label="Precio unitario promocional"
                  type="number"
                  error={!!ruleErrors.unit_price}
                  helperText={ruleErrors.unit_price?.message || "Nuevo precio por unidad al cumplir cantidad minima."}
                  inputProps={{ min: 0, step: "0.01" }}
                  {...registerRule("unit_price", {
                    setValueAs: (value) => (value === "" ? 0 : Number(value)),
                    onChange: () => setRuleSubmitError(""),
                  })}
                />
              </>
            )}
            <TextField
              label="Inicio de vigencia"
              type="datetime-local"
              error={!!ruleErrors.start_date}
              helperText={ruleErrors.start_date?.message || "Opcional. Si queda vacio aplica desde ahora."}
              InputLabelProps={{ shrink: true }}
              {...registerRule("start_date", {
                onChange: () => setRuleSubmitError(""),
              })}
            />
            <TextField
              label="Fin de vigencia"
              type="datetime-local"
              error={!!ruleErrors.end_date}
              helperText={ruleErrors.end_date?.message || "Opcional. Si queda vacio no tiene fecha fin."}
              InputLabelProps={{ shrink: true }}
              {...registerRule("end_date", {
                onChange: () => setRuleSubmitError(""),
              })}
            />
            <Controller
              control={ruleControl}
              name="is_active"
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={field.value}
                      onChange={(event) => {
                        setRuleSubmitError("");
                        field.onChange(event.target.checked);
                      }}
                    />
                  }
                  label="Activa"
                />
              )}
            />
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
              <Button type="submit" variant="contained" disabled={!isRuleValid || isRuleSubmitting}>
                {isRuleSubmitting ? "Guardando..." : editingRuleId ? "Actualizar regla" : "Crear regla"}
              </Button>
              {editingRuleId ? (
                <Button type="button" variant="outlined" onClick={resetRuleForm} disabled={isRuleSubmitting}>
                  Cancelar edicion
                </Button>
              ) : null}
            </Box>
          </Box>
        </Box>
      </Paper>

      <TableToolbar title="Promociones globales" subtitle="Descuentos generales por porcentaje o monto fijo." />
      <Paper sx={{ p: 2 }}>
        {promotionsQuery.isLoading ? (
          <Typography variant="body2" color="text.secondary">
            Cargando promociones...
          </Typography>
        ) : globalPromotions.length === 0 ? (
          <EmptyState title="Sin promociones globales" description="No hay promociones globales creadas." icon={<CampaignIcon color="disabled" />} />
        ) : isCompact ? (
          <CardTable rows={globalCardRows} />
        ) : (
          <ResizableTable minHeight={220}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Valor</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {globalPromotions.map((promotion) => (
                  <TableRow key={promotion.id}>
                    <TableCell>{promotion.name}</TableCell>
                    <TableCell>{promotion.type}</TableCell>
                    <TableCell>{promotion.type === "PERCENT" ? `${promotion.value}%` : promotion.value}</TableCell>
                    <TableCell>{promotion.is_active ? "Activa" : "Inactiva"}</TableCell>
                    <TableCell>{renderGlobalActions(promotion)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ResizableTable>
        )}
      </Paper>

      <TableToolbar title="Reglas por producto" subtitle="Promociones automaticas para pack y precio unitario por cantidad." />
      <Paper sx={{ p: 2 }}>
        {rulesQuery.isLoading ? (
          <Typography variant="body2" color="text.secondary">
            Cargando reglas promocionales...
          </Typography>
        ) : rules.length === 0 ? (
          <EmptyState title="Sin reglas" description="No hay reglas promocionales creadas." icon={<CampaignIcon color="disabled" />} />
        ) : isCompact ? (
          <CardTable rows={ruleCardRows} />
        ) : (
          <ResizableTable minHeight={220}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Producto</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Regla</TableCell>
                  <TableCell>Prioridad</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>{rule.name}</TableCell>
                    <TableCell>{productNameById[rule.product_id] || `Producto #${rule.product_id}`}</TableCell>
                    <TableCell>{rule.rule_type}</TableCell>
                    <TableCell>{formatRuleSummary(rule)}</TableCell>
                    <TableCell>{rule.priority || 0}</TableCell>
                    <TableCell>{rule.is_active ? "Activa" : "Inactiva"}</TableCell>
                    <TableCell>{renderRuleActions(rule)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ResizableTable>
        )}
      </Paper>

      <ConfirmDialog
        open={deletingPromotionId !== null}
        title="Eliminar promocion global"
        description="Esta accion eliminara la promocion global seleccionada. Si tiene ventas relacionadas, la eliminacion sera bloqueada."
        onCancel={() => setDeletingPromotionId(null)}
        onConfirm={() => {
          if (deletingPromotionId !== null) {
            deleteGlobalMutation.mutate(deletingPromotionId);
          }
        }}
        confirmText="Eliminar"
        confirmColor="error"
        loading={deleteGlobalMutation.isPending}
      />

      <ConfirmDialog
        open={deletingRuleId !== null}
        title="Eliminar regla promocional"
        description="Esta accion eliminara la regla seleccionada. Si tiene ventas relacionadas, la eliminacion sera bloqueada."
        onCancel={() => setDeletingRuleId(null)}
        onConfirm={() => {
          if (deletingRuleId !== null) {
            deleteRuleMutation.mutate(deletingRuleId);
          }
        }}
        confirmText="Eliminar"
        confirmColor="error"
        loading={deleteRuleMutation.isPending}
      />
    </Box>
  );
};

export default Promotions;


