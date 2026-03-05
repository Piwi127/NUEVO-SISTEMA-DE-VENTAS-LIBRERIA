import React, { useMemo, useState } from "react";
import {
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CardTable, EmptyState, PageHeader, TableToolbar, useToast } from "@/app/components";
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

  const [name, setName] = useState("");
  const [value, setValue] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [type, setType] = useState("PERCENT");

  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [packName, setPackName] = useState("");
  const [packProductId, setPackProductId] = useState<number | "">("");
  const [bundleQty, setBundleQty] = useState(3);
  const [bundlePrice, setBundlePrice] = useState(0);
  const [packIsActive, setPackIsActive] = useState(true);

  const products = productsQuery.data || [];
  const productNameById = useMemo(() => {
    const map: Record<number, string> = {};
    products.forEach((p) => {
      map[p.id] = p.name;
    });
    return map;
  }, [products]);

  const globalMutation = useMutation({
    mutationFn: createPromotion,
    onSuccess: async () => {
      showToast({ message: "Promocion global creada", severity: "success" });
      setName("");
      setValue(0);
      await qc.invalidateQueries({ queryKey: ["promotions"] });
      await qc.invalidateQueries({ queryKey: ["promotions-active"] });
    },
    onError: (error: any) => {
      showToast({ message: error?.response?.data?.detail || "No se pudo crear la promocion global", severity: "error" });
    },
  });

  const packMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: packName.trim(),
        product_id: Number(packProductId),
        rule_type: "BUNDLE_PRICE" as const,
        bundle_qty: Number(bundleQty),
        bundle_price: Number(bundlePrice),
        is_active: packIsActive,
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
      setEditingRuleId(null);
      setPackName("");
      setPackProductId("");
      setBundleQty(3);
      setBundlePrice(0);
      setPackIsActive(true);
      await qc.invalidateQueries({ queryKey: ["promotion-pack-rules"] });
      await qc.invalidateQueries({ queryKey: ["promotion-pack-rules-active"] });
    },
    onError: (error: any) => {
      showToast({ message: error?.response?.data?.detail || "No se pudo guardar la regla de pack", severity: "error" });
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async (rule: ProductPromotionRule) => {
      return updateProductPromotionRule(rule.id, { is_active: !rule.is_active });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["promotion-pack-rules"] });
      await qc.invalidateQueries({ queryKey: ["promotion-pack-rules-active"] });
    },
    onError: (error: any) => {
      showToast({ message: error?.response?.data?.detail || "No se pudo cambiar el estado de la regla", severity: "error" });
    },
  });

  const globalPromotions = promotionsQuery.data || [];
  const packRules = packRulesQuery.data || [];
  const loading = promotionsQuery.isLoading || packRulesQuery.isLoading || productsQuery.isLoading;

  const globalCardRows = globalPromotions.map((p) => ({
    key: p.id,
    title: p.name,
    subtitle: p.type === "PERCENT" ? `${p.value}%` : `${p.value}`,
    right: <Typography sx={{ fontWeight: 700 }}>{p.is_active ? "Activa" : "Inactiva"}</Typography>,
    fields: [{ label: "Tipo", value: p.type }],
  }));

  const packCardRows = packRules.map((rule) => ({
    key: rule.id,
    title: rule.name,
    subtitle: productNameById[rule.product_id] || `Producto #${rule.product_id}`,
    right: (
      <Typography sx={{ fontWeight: 700, color: rule.is_active ? "success.main" : "text.secondary" }}>
        {rule.is_active ? "Activa" : "Inactiva"}
      </Typography>
    ),
    fields: [
      { label: "Regla", value: `${rule.bundle_qty} x ${rule.bundle_price.toFixed(2)}` },
      { label: "Tipo", value: rule.rule_type },
    ],
  }));

  const handleCreateGlobal = async () => {
    if (!name.trim()) {
      showToast({ message: "Nombre de promocion requerido", severity: "warning" });
      return;
    }
    if (value <= 0) {
      showToast({ message: "El valor debe ser mayor que 0", severity: "warning" });
      return;
    }
    await globalMutation.mutateAsync({ id: 0, name, type, value, is_active: isActive });
  };

  const handleSavePack = async () => {
    if (!packName.trim()) {
      showToast({ message: "Nombre de regla requerido", severity: "warning" });
      return;
    }
    if (!packProductId) {
      showToast({ message: "Selecciona un producto", severity: "warning" });
      return;
    }
    if (bundleQty < 2) {
      showToast({ message: "La cantidad del pack debe ser al menos 2", severity: "warning" });
      return;
    }
    if (bundlePrice <= 0) {
      showToast({ message: "El precio del pack debe ser mayor a 0", severity: "warning" });
      return;
    }
    await packMutation.mutateAsync();
  };

  const loadRuleForEdit = (rule: ProductPromotionRule) => {
    setEditingRuleId(rule.id);
    setPackName(rule.name);
    setPackProductId(rule.product_id);
    setBundleQty(rule.bundle_qty);
    setBundlePrice(rule.bundle_price);
    setPackIsActive(rule.is_active);
  };

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
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: isCompact ? "1fr" : "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField select label="Tipo" value={type} onChange={(e) => setType(e.target.value)}>
            <MenuItem value="PERCENT">% Descuento</MenuItem>
            <MenuItem value="AMOUNT">Monto fijo</MenuItem>
          </TextField>
          <TextField label="Valor" type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} />
          <FormControlLabel control={<Checkbox checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />} label="Activa" />
          <Button variant="contained" onClick={handleCreateGlobal} disabled={globalMutation.isPending}>
            {globalMutation.isPending ? "Guardando..." : "Crear"}
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Promos por cantidad (packs)
        </Typography>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: isCompact ? "1fr" : "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <TextField label="Nombre de regla" value={packName} onChange={(e) => setPackName(e.target.value)} />
          <TextField
            select
            label="Producto"
            value={packProductId}
            onChange={(e) => setPackProductId(Number(e.target.value))}
            helperText="Selecciona el producto al que aplica el pack"
          >
            <MenuItem value="">Seleccionar producto</MenuItem>
            {products.map((product) => (
              <MenuItem key={product.id} value={product.id}>
                {product.sku} - {product.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField label="Cantidad del pack" type="number" value={bundleQty} onChange={(e) => setBundleQty(Number(e.target.value))} />
          <TextField label="Precio del pack" type="number" value={bundlePrice} onChange={(e) => setBundlePrice(Number(e.target.value))} />
          <FormControlLabel
            control={<Checkbox checked={packIsActive} onChange={(e) => setPackIsActive(e.target.checked)} />}
            label="Activa"
          />
          <Button variant="contained" onClick={handleSavePack} disabled={packMutation.isPending}>
            {packMutation.isPending ? "Guardando..." : editingRuleId ? "Actualizar pack" : "Crear pack"}
          </Button>
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

      <TableToolbar title="Reglas pack" subtitle="Promociones automáticas por cantidad asociadas a producto." />
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
