import React, { useMemo, useState } from "react";
import {
  Alert,
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
import { CardTable, EmptyState, ErrorState, PageHeader, TableToolbar, useToast } from "@/app/components";
import {
  ProductPromotionRule,
  createProductPromotionRule,
  createPromotion,
  listProductPromotionRules,
  listPromotions,
  updateProductPromotionRule,
} from "@/modules/catalog/api";
import { listProducts } from "@/modules/catalog/api/products";
import { useSettings } from "@/app/store";

const promotionTypes = ["PERCENT", "AMOUNT"] as const;

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

const packPromotionSchema = z.object({
  name: z.string().trim().min(2, "Ingresa al menos 2 caracteres.").max(120, "El nombre es demasiado largo."),
  product_id: z.number().int().positive("Selecciona un producto."),
  bundle_qty: z.number().int("Ingresa un numero entero.").min(2, "La cantidad del pack debe ser al menos 2."),
  bundle_price: z.number().positive("El precio del pack debe ser mayor a 0."),
  is_active: z.boolean(),
});

type GlobalPromotionValues = z.infer<typeof globalPromotionSchema>;
type PackPromotionValues = z.infer<typeof packPromotionSchema>;

const defaultGlobalValues: GlobalPromotionValues = {
  name: "",
  type: "PERCENT",
  value: 0,
  is_active: true,
};

const defaultPackValues: PackPromotionValues = {
  name: "",
  product_id: 0,
  bundle_qty: 3,
  bundle_price: 0,
  is_active: true,
};

const Promotions: React.FC = () => {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const compact = useMediaQuery("(max-width:900px)");
  const { compactMode } = useSettings();
  const isCompact = compactMode || compact;

  const promotionsQuery = useQuery({ queryKey: ["promotions"], queryFn: listPromotions, staleTime: 60_000 });
  const packRulesQuery = useQuery({ queryKey: ["promotion-pack-rules"], queryFn: listProductPromotionRules, staleTime: 60_000 });
  const productsQuery = useQuery({
    queryKey: ["promotion-pack-products"],
    queryFn: () => listProducts(undefined, 500, 0, undefined, undefined, false),
    staleTime: 60_000,
  });

  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [globalSubmitError, setGlobalSubmitError] = useState("");
  const [packSubmitError, setPackSubmitError] = useState("");

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
    control: packControl,
    register: registerPack,
    reset: resetPack,
    handleSubmit: handlePackSubmit,
    formState: { errors: packErrors, isDirty: isPackDirty, isSubmitting: isPackSubmitting, isValid: isPackValid },
  } = useForm<PackPromotionValues>({
    resolver: zodResolver(packPromotionSchema),
    mode: "onChange",
    defaultValues: defaultPackValues,
  });

  const products = productsQuery.data || [];
  const productNameById = useMemo(() => {
    const map: Record<number, string> = {};
    products.forEach((product) => {
      map[product.id] = product.name;
    });
    return map;
  }, [products]);

  const resetPackForm = () => {
    setEditingRuleId(null);
    setPackSubmitError("");
    resetPack(defaultPackValues);
  };

  const globalMutation = useMutation({
    mutationFn: createPromotion,
    onSuccess: async () => {
      showToast({ message: "Promocion global creada", severity: "success" });
      resetGlobal(defaultGlobalValues);
      await qc.invalidateQueries({ queryKey: ["promotions"] });
      await qc.invalidateQueries({ queryKey: ["promotions-active"] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || "No se pudo crear la promocion global";
      setGlobalSubmitError(message);
      showToast({ message, severity: "error" });
    },
  });

  const packMutation = useMutation({
    mutationFn: async (values: PackPromotionValues) => {
      const payload = {
        name: values.name.trim(),
        product_id: Number(values.product_id),
        rule_type: "BUNDLE_PRICE" as const,
        bundle_qty: Number(values.bundle_qty),
        bundle_price: Number(values.bundle_price),
        is_active: values.is_active,
      };
      if (editingRuleId) {
        return updateProductPromotionRule(editingRuleId, payload);
      }
      return createProductPromotionRule(payload);
    },
    onSuccess: async () => {
      showToast({
        message: editingRuleId ? "Regla de pack actualizada" : "Regla de pack creada",
        severity: "success",
      });
      resetPackForm();
      await qc.invalidateQueries({ queryKey: ["promotion-pack-rules"] });
      await qc.invalidateQueries({ queryKey: ["promotion-pack-rules-active"] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || "No se pudo guardar la regla de pack";
      setPackSubmitError(message);
      showToast({ message, severity: "error" });
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async (rule: ProductPromotionRule) => updateProductPromotionRule(rule.id, { is_active: !rule.is_active }),
    onSuccess: async (_result, rule) => {
      await qc.invalidateQueries({ queryKey: ["promotion-pack-rules"] });
      await qc.invalidateQueries({ queryKey: ["promotion-pack-rules-active"] });
      showToast({ message: rule.is_active ? "Regla desactivada" : "Regla activada", severity: "success" });
    },
    onError: (error: any) => {
      showToast({ message: error?.response?.data?.detail || "No se pudo cambiar el estado de la regla", severity: "error" });
    },
  });

  const globalPromotions = promotionsQuery.data || [];
  const packRules = packRulesQuery.data || [];
  const loading = promotionsQuery.isLoading || packRulesQuery.isLoading || productsQuery.isLoading;
  const hasLoadError = promotionsQuery.isError || packRulesQuery.isError || productsQuery.isError;

  const globalCardRows = globalPromotions.map((promotion) => ({
    key: promotion.id,
    title: promotion.name,
    subtitle: promotion.type === "PERCENT" ? `${promotion.value}%` : `${promotion.value}`,
    right: <Typography sx={{ fontWeight: 700 }}>{promotion.is_active ? "Activa" : "Inactiva"}</Typography>,
    fields: [{ label: "Tipo", value: promotion.type }],
  }));

  const loadRuleForEdit = (rule: ProductPromotionRule) => {
    setEditingRuleId(rule.id);
    setPackSubmitError("");
    resetPack({
      name: rule.name,
      product_id: rule.product_id,
      bundle_qty: rule.bundle_qty,
      bundle_price: rule.bundle_price,
      is_active: rule.is_active,
    });
  };

  const packCardRows = packRules.map((rule) => ({
    key: rule.id,
    title: rule.name,
    subtitle: productNameById[rule.product_id] || `Producto #${rule.product_id}`,
    right: (
      <Box sx={{ display: "grid", gap: 0.75, justifyItems: "end" }}>
        <Typography sx={{ fontWeight: 700, color: rule.is_active ? "success.main" : "text.secondary" }}>
          {rule.is_active ? "Activa" : "Inactiva"}
        </Typography>
        <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Button size="small" variant="outlined" onClick={() => loadRuleForEdit(rule)}>
            Editar
          </Button>
          <Button
            size="small"
            variant="outlined"
            color={rule.is_active ? "warning" : "success"}
            disabled={toggleRuleMutation.isPending}
            onClick={() => toggleRuleMutation.mutate(rule)}
          >
            {rule.is_active ? "Desactivar" : "Activar"}
          </Button>
        </Box>
      </Box>
    ),
    fields: [
      { label: "Regla", value: `${rule.bundle_qty} x ${rule.bundle_price.toFixed(2)}` },
      { label: "Tipo", value: rule.rule_type },
    ],
  }));

  const onCreateGlobal = async (values: GlobalPromotionValues) => {
    setGlobalSubmitError("");
    await globalMutation.mutateAsync({
      name: values.name.trim(),
      type: values.type,
      value: Number(values.value),
      is_active: values.is_active,
    });
  };

  const onSavePack = async (values: PackPromotionValues) => {
    setPackSubmitError("");
    await packMutation.mutateAsync(values);
  };

  if (hasLoadError) {
    return (
      <Box sx={{ display: "grid", gap: 2 }}>
        <PageHeader
          title="Promociones"
          subtitle="Gestiona promociones globales y promociones por cantidad (packs)."
          icon={<CampaignIcon color="primary" />}
        />
        <Paper sx={{ p: 2 }}>
          <ErrorState
            title="No se pudieron cargar las promociones"
            onRetry={() => {
              promotionsQuery.refetch();
              packRulesQuery.refetch();
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
        subtitle="Gestiona promociones globales y promociones por cantidad (packs)."
        icon={<CampaignIcon color="primary" />}
        chips={[`Globales: ${globalPromotions.length}`, `Packs: ${packRules.length}`]}
        loading={loading}
      />

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Nueva promocion global
        </Typography>
        <Box component="form" onSubmit={handleGlobalSubmit(onCreateGlobal)} sx={{ display: "grid", gap: 2 }}>
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
            <Button type="submit" variant="contained" disabled={!isGlobalValid || isGlobalSubmitting}>
              {isGlobalSubmitting ? "Guardando..." : "Crear"}
            </Button>
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Promos por cantidad (packs)
        </Typography>
        <Box component="form" onSubmit={handlePackSubmit(onSavePack)} sx={{ display: "grid", gap: 2 }}>
          {packSubmitError ? <Alert severity="error">{packSubmitError}</Alert> : null}
          {isPackDirty ? (
            <Typography variant="caption" color="text.secondary">
              Hay cambios pendientes por guardar en la regla pack.
            </Typography>
          ) : null}
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: isCompact ? "1fr" : "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <TextField
              label="Nombre de regla"
              error={!!packErrors.name}
              helperText={packErrors.name?.message || "Nombre visible para la regla pack."}
              {...registerPack("name", {
                onChange: () => setPackSubmitError(""),
              })}
            />
            <Controller
              control={packControl}
              name="product_id"
              render={({ field }) => (
                <TextField
                  select
                    label="Producto"
                    value={field.value || ""}
                    error={!!packErrors.product_id}
                    helperText={packErrors.product_id?.message || "Selecciona el producto al que aplica el pack."}
                    onChange={(event) => {
                      setPackSubmitError("");
                      field.onChange(event.target.value === "" ? 0 : Number(event.target.value));
                    }}
                >
                  <MenuItem value="">Seleccionar producto</MenuItem>
                  {products.map((product) => (
                    <MenuItem key={product.id} value={product.id}>
                      {product.sku} - {product.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <TextField
              label="Cantidad del pack"
              type="number"
              error={!!packErrors.bundle_qty}
              helperText={packErrors.bundle_qty?.message || "Cantidad minima incluida en el pack."}
              inputProps={{ min: 2, step: 1 }}
              {...registerPack("bundle_qty", {
                setValueAs: (value) => (value === "" ? 0 : Number(value)),
                onChange: () => setPackSubmitError(""),
              })}
            />
            <TextField
              label="Precio del pack"
              type="number"
              error={!!packErrors.bundle_price}
              helperText={packErrors.bundle_price?.message || "Precio total del pack promocional."}
              inputProps={{ min: 0, step: "0.01" }}
              {...registerPack("bundle_price", {
                setValueAs: (value) => (value === "" ? 0 : Number(value)),
                onChange: () => setPackSubmitError(""),
              })}
            />
            <Controller
              control={packControl}
              name="is_active"
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={field.value}
                      onChange={(event) => {
                        setPackSubmitError("");
                        field.onChange(event.target.checked);
                      }}
                    />
                  }
                  label="Activa"
                />
              )}
            />
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
              <Button type="submit" variant="contained" disabled={!isPackValid || isPackSubmitting}>
                {isPackSubmitting ? "Guardando..." : editingRuleId ? "Actualizar pack" : "Crear pack"}
              </Button>
              {editingRuleId ? (
                <Button type="button" variant="outlined" onClick={resetPackForm} disabled={isPackSubmitting}>
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
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Valor</TableCell>
                <TableCell>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {globalPromotions.map((promotion) => (
                <TableRow key={promotion.id}>
                  <TableCell>{promotion.name}</TableCell>
                  <TableCell>{promotion.type}</TableCell>
                  <TableCell>{promotion.type === "PERCENT" ? `${promotion.value}%` : promotion.value}</TableCell>
                  <TableCell>{promotion.is_active ? "Activa" : "Inactiva"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <TableToolbar title="Reglas pack" subtitle="Promociones automaticas por cantidad asociadas a producto." />
      <Paper sx={{ p: 2 }}>
        {packRulesQuery.isLoading ? (
          <Typography variant="body2" color="text.secondary">
            Cargando reglas pack...
          </Typography>
        ) : packRules.length === 0 ? (
          <EmptyState title="Sin reglas pack" description="No hay promociones por cantidad creadas." icon={<CampaignIcon color="disabled" />} />
        ) : isCompact ? (
          <CardTable rows={packCardRows} />
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Producto</TableCell>
                <TableCell>Regla</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {packRules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>{rule.name}</TableCell>
                  <TableCell>{productNameById[rule.product_id] || `Producto #${rule.product_id}`}</TableCell>
                  <TableCell>
                    {rule.bundle_qty} x {rule.bundle_price.toFixed(2)}
                  </TableCell>
                  <TableCell>{rule.is_active ? "Activa" : "Inactiva"}</TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                      <Button size="small" variant="outlined" onClick={() => loadRuleForEdit(rule)}>
                        Editar
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color={rule.is_active ? "warning" : "success"}
                        disabled={toggleRuleMutation.isPending}
                        onClick={() => toggleRuleMutation.mutate(rule)}
                      >
                        {rule.is_active ? "Desactivar" : "Activar"}
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
};

export default Promotions;
