import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";
import { ResizableTable } from "@/app/components";
import { useCartStore } from "@/app/store";
import { formatMoney } from "@/app/utils";
import { useSettings } from "@/app/store";
import { calcTotals } from "@/app/utils";
import type { PackPricingLine, PosTotalsSummary } from "@/modules/pos/utils/pricing";

type CartProps = {
  packPricingLines?: Record<number, PackPricingLine>;
  totalsSummary?: PosTotalsSummary;
  tone?: "light" | "dark";
  minimal?: boolean;
};

export const Cart: React.FC<CartProps> = ({ packPricingLines, totalsSummary, tone = "light", minimal = false }) => {
  const cart = useCartStore();
  const { currency, taxRate, taxIncluded, compactMode } = useSettings();
  const compact = useMediaQuery("(max-width:900px)");
  const isCompact = minimal || compactMode || compact;
  const isDark = tone === "dark";
  const discount = cart.discount;
  const fallbackTotals = calcTotals(cart.items, discount, taxRate, taxIncluded);
  const normalizeQty = (value: number) => (value < 1 ? 1 : value);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);

  const palette = {
    cardBg: isDark ? "rgba(255,255,255,0.05)" : "rgba(255, 255, 255, 0.7)",
    cardBorder: isDark ? "rgba(255,255,255,0.1)" : "rgba(18,53,90,0.08)",
    subtleBg: isDark ? "rgba(255,255,255,0.03)" : "rgba(18,53,90,0.03)",
    inputBg: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.9)",
    inputBorder: isDark ? "rgba(255,255,255,0.2)" : "rgba(18,53,90,0.15)",
    textMuted: isDark ? "rgba(255,255,255,0.6)" : "rgba(18,53,90,0.6)",
    summaryBg: isDark ? "rgba(15, 23, 42, 0.6)" : "rgba(248, 250, 252, 0.8)",
    summaryBorder: isDark ? "rgba(255,255,255,0.1)" : "rgba(18,53,90,0.1)",
    chipBg: isDark ? "rgba(255,255,255,0.1)" : "rgba(18,53,90,0.06)",
  };

  const summary: PosTotalsSummary = totalsSummary || {
    grossSubtotal: fallbackTotals.base,
    subtotalAfterPacks: fallbackTotals.base,
    subtotal: fallbackTotals.subtotal,
    tax: fallbackTotals.tax,
    total: fallbackTotals.total,
    packDiscount: 0,
    promotionDiscount: discount,
    totalDiscount: discount,
  };

  const getLinePricing = (productId: number, qty: number, unitPrice: number): PackPricingLine => {
    const line = packPricingLines?.[productId];
    if (line) return line;
    const baseTotal = qty * unitPrice;
    return {
      product_id: productId,
      quantity: qty,
      original_unit_price: unitPrice,
      final_unit_price: unitPrice,
      promotion_applied: false,
      base_total: baseTotal,
      line_subtotal: baseTotal,
      pack_discount: 0,
      final_total: baseTotal,
    };
  };

  useEffect(() => {
    const existingIds = new Set(cart.items.map((item) => item.product_id));
    setSelectedProductIds((prev) => prev.filter((id) => existingIds.has(id)));
  }, [cart.items]);

  const selectedSet = useMemo(() => new Set(selectedProductIds), [selectedProductIds]);
  const cartProductIds = useMemo(() => cart.items.map((item) => item.product_id), [cart.items]);
  const allSelected = cartProductIds.length > 0 && cartProductIds.every((id) => selectedSet.has(id));
  const someSelected = cartProductIds.some((id) => selectedSet.has(id));
  const totalUnits = useMemo(() => cart.items.reduce((acc, item) => acc + item.qty, 0), [cart.items]);

  const summaryRows = [
    { label: minimal ? "Items" : "Subtotal neto", value: formatMoney(summary.subtotalAfterPacks), visible: true },
    { label: minimal ? "Packs" : "Descuento por paquetes", value: `-${formatMoney(summary.packDiscount)}`, visible: !minimal || summary.packDiscount > 0 },
    {
      label: minimal ? "Promo/desc." : "Beneficio manual / promo",
      value: `-${formatMoney(summary.promotionDiscount)}`,
      visible: !minimal || summary.promotionDiscount > 0,
    },
    { label: minimal ? "Impuesto" : "Impuestos aplicados", value: formatMoney(summary.tax), visible: !minimal || summary.tax > 0 },
  ].filter((row) => row.visible);

  const fieldSx = {
    "& .MuiOutlinedInput-root": {
      bgcolor: palette.inputBg,
      borderRadius: 1.5,
      color: isDark ? "#ffffff" : "text.primary",
      "& fieldset": { borderColor: palette.inputBorder },
      "&:hover fieldset": { borderColor: isDark ? "rgba(255,255,255,0.4)" : "primary.main" },
      "&.Mui-focused fieldset": { borderColor: isDark ? "rgba(255,255,255,0.6)" : "primary.main" },
    },
    "& .MuiInputBase-input": { color: isDark ? "#ffffff" : "text.primary", fontWeight: 600 },
    "& .MuiInputLabel-root": { color: isDark ? "rgba(255,255,255,0.7)" : undefined },
  } as const;

  const toggleProduct = (productId: number) => {
    setSelectedProductIds((prev) => (prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]));
  };

  const toggleAllProducts = () => {
    setSelectedProductIds(allSelected ? [] : cartProductIds);
  };

  const removeSelectedProducts = () => {
    if (!selectedProductIds.length) return;
    cart.removeItems(selectedProductIds);
    setSelectedProductIds([]);
  };

  return (
    <Box>
      <Stack spacing={minimal ? 1.5 : 2} sx={{ mb: 2 }}>
        {minimal ? (
          <Typography variant="caption" sx={{ color: isDark ? "rgba(255,255,255,0.7)" : "text.secondary", fontWeight: 700 }}>
            {cart.items.length} productos | {totalUnits} uds.
            {selectedProductIds.length > 0 ? ` | ${selectedProductIds.length} selec.` : ""}
          </Typography>
        ) : (
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
            <Chip size="small" label={`${cart.items.length} productos`} sx={{ bgcolor: palette.chipBg, color: isDark ? "white" : "inherit" }} />
            <Chip size="small" label={`${totalUnits} unidades`} sx={{ bgcolor: palette.chipBg, color: isDark ? "white" : "inherit" }} />
            {selectedProductIds.length > 0 && (
              <Chip size="small" label={`${selectedProductIds.length} seleccionados`} color="primary" variant={isDark ? "filled" : "outlined"} />
            )}
          </Stack>
        )}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button variant="outlined" size="small" onClick={toggleAllProducts} disabled={!cart.items.length} sx={{ borderColor: palette.inputBorder, color: isDark ? "white" : "inherit" }}>
            {allSelected ? "Quitar selección" : "Seleccionar Todo"}
          </Button>
          <Button variant="outlined" color="error" size="small" startIcon={<DeleteIcon />} disabled={!selectedProductIds.length} onClick={removeSelectedProducts}>
            Descartar ({selectedProductIds.length})
          </Button>
          <Button variant="text" color="inherit" size="small" disabled={!cart.items.length} onClick={cart.clear} sx={{ color: isDark ? "rgba(255,255,255,0.7)" : "text.secondary" }}>
            Limpiar
          </Button>
        </Stack>
      </Stack>

      {!cart.items.length ? (
        <Paper
          className="glass-panel"
          sx={{
            p: minimal ? 2 : 3,
            borderRadius: 3,
            border: `1px dashed ${palette.cardBorder}`,
            bgcolor: "transparent",
            boxShadow: "none",
            textAlign: "center"
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: isDark ? "white" : "text.primary" }}>
            El carrito está vacío
          </Typography>
          <Typography variant="body2" sx={{ color: palette.textMuted, mt: 0.5 }}>
            Ingresa productos o escanea códigos para arrancar.
          </Typography>
        </Paper>
      ) : isCompact ? (
        <Box sx={{ display: "grid", gap: 1.5 }}>
          {cart.items.map((item) => {
            const linePricing = getLinePricing(item.product_id, item.qty, item.price);
            return (
              <Paper
                key={item.product_id}
                className="glass-panel"
                sx={{
                  p: minimal ? 1.5 : 2,
                  display: "grid",
                  gap: 1.5,
                  bgcolor: palette.cardBg,
                  border: `1px solid ${palette.cardBorder}`,
                  position: "relative",
                  overflow: "hidden"
                }}
              >
                {selectedSet.has(item.product_id) && (
                  <Box sx={{ position: "absolute", inset: 0, bgcolor: "primary.main", opacity: isDark ? 0.15 : 0.05, pointerEvents: "none" }} />
                )}

                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <Checkbox
                    size="small"
                    checked={selectedSet.has(item.product_id)}
                    onChange={() => toggleProduct(item.product_id)}
                    sx={{ p: 0.25, mt: -0.25, color: isDark ? "rgba(255,255,255,0.7)" : undefined }}
                  />
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="flex-start">
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.2, color: isDark ? "white" : "text.primary" }}>
                          {item.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: palette.textMuted, display: "block", mt: 0.25 }}>
                          {item.sku ? `SKU ${item.sku}` : `Cód ${item.product_id}`}
                        </Typography>
                      </Box>
                      <IconButton size="small" onClick={() => cart.removeItem(item.product_id)} sx={{ color: "error.main", opacity: 0.7, "&:hover": { opacity: 1, bgcolor: "error.lighter" } }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>

                    <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
                      <Box sx={{ display: "grid", justifyItems: "start" }}>
                        {linePricing.promotion_applied ? (
                          <Typography variant="caption" sx={{ color: palette.textMuted, fontWeight: 600, textDecoration: "line-through" }}>
                            {formatMoney(linePricing.original_unit_price)} u.
                          </Typography>
                        ) : null}
                        <Typography variant="caption" sx={{ color: linePricing.promotion_applied ? "success.main" : palette.textMuted, fontWeight: 700 }}>
                          {formatMoney(linePricing.final_unit_price)} u.
                        </Typography>
                      </Box>
                      <Typography sx={{ fontWeight: 900, color: isDark ? "white" : "text.primary", fontSize: "1.1rem" }}>
                        {formatMoney(linePricing.final_total)}
                      </Typography>
                    </Stack>

                    <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center" sx={{ mt: 1.5 }}>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <IconButton size="small" onClick={() => cart.setQty(item.product_id, normalizeQty(item.qty - 1))} sx={{ bgcolor: palette.subtleBg, color: isDark ? "white" : "inherit" }}>
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                        <TextField
                          size="small"
                          type="number"
                          value={item.qty}
                          onChange={(event) => cart.setQty(item.product_id, normalizeQty(event.target.value === "" ? 1 : Number(event.target.value)))}
                          inputProps={{ min: 1, inputMode: "numeric", style: { width: 44, textAlign: "center", padding: "4px" } }}
                          sx={fieldSx}
                        />
                        <IconButton size="small" onClick={() => cart.setQty(item.product_id, item.qty + 1)} sx={{ bgcolor: palette.subtleBg, color: isDark ? "white" : "inherit" }}>
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                      {linePricing.pack_discount > 0 && (
                        <Chip
                          size="small"
                          color="secondary"
                          label={`${linePricing.promotion_name || "Promo"} -${formatMoney(linePricing.pack_discount)}`}
                          variant="outlined"
                          sx={{ height: 24 }}
                        />
                      )}
                    </Stack>
                    {linePricing.promotion_applied && linePricing.promotion_name ? (
                      <Typography variant="caption" sx={{ color: "secondary.main", fontWeight: 700 }}>
                        {linePricing.promotion_name}
                      </Typography>
                    ) : null}
                  </Box>
                </Stack>
              </Paper>
            );
          })}
        </Box>
      ) : (
        <ResizableTable
          minHeight={300}
          sx={{
            borderRadius: 3,
            border: `1px solid ${palette.cardBorder}`,
            background: palette.cardBg,
            boxShadow: "none",
          }}
        >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" sx={{ bgcolor: palette.subtleBg }}>
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected && !allSelected}
                    onChange={toggleAllProducts}
                    sx={{ color: isDark ? "rgba(255,255,255,0.7)" : undefined }}
                  />
                </TableCell>
                <TableCell sx={{ bgcolor: palette.subtleBg, color: isDark ? "white" : "inherit" }}>Descripción</TableCell>
                <TableCell sx={{ bgcolor: palette.subtleBg, color: isDark ? "white" : "inherit" }}>Cantidad</TableCell>
                <TableCell sx={{ bgcolor: palette.subtleBg, color: isDark ? "white" : "inherit" }}>Unitario</TableCell>
                <TableCell sx={{ bgcolor: palette.subtleBg, color: isDark ? "white" : "inherit" }}>Importe</TableCell>
                <TableCell sx={{ bgcolor: palette.subtleBg }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cart.items.map((item) => {
                const linePricing = getLinePricing(item.product_id, item.qty, item.price);
                return (
                  <TableRow key={item.product_id} hover sx={{ "&:hover": { bgcolor: palette.subtleBg } }}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedSet.has(item.product_id)}
                        onChange={() => toggleProduct(item.product_id)}
                        sx={{ color: isDark ? "rgba(255,255,255,0.7)" : undefined }}
                      />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 260 }}>
                      <Typography sx={{ fontWeight: 700, color: isDark ? "white" : "text.primary" }}>{item.name}</Typography>
                      <Typography variant="caption" sx={{ color: palette.textMuted }}>
                        {item.sku ? `SKU ${item.sku}` : `Cód ${item.product_id}`}
                      </Typography>
                      {linePricing.pack_discount > 0 && (
                        <Typography variant="caption" sx={{ display: "block", color: "secondary.main", fontWeight: 600 }}>
                          {linePricing.promotion_name || "Promo"} -{formatMoney(linePricing.pack_discount)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <IconButton size="small" onClick={() => cart.setQty(item.product_id, normalizeQty(item.qty - 1))} sx={{ bgcolor: palette.subtleBg, color: isDark ? "white" : "inherit" }}>
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                        <TextField
                          size="small"
                          type="number"
                          value={item.qty}
                          onChange={(event) => cart.setQty(item.product_id, normalizeQty(event.target.value === "" ? 1 : Number(event.target.value)))}
                          inputProps={{ min: 1, inputMode: "numeric", style: { width: 48, textAlign: "center", padding: "4px" } }}
                          sx={fieldSx}
                        />
                        <IconButton size="small" onClick={() => cart.setQty(item.product_id, item.qty + 1)} sx={{ bgcolor: palette.subtleBg, color: isDark ? "white" : "inherit" }}>
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: isDark ? "rgba(255,255,255,0.8)" : "text.secondary" }}>
                      {linePricing.promotion_applied ? (
                        <Box sx={{ display: "grid", gap: 0.25 }}>
                          <Typography variant="caption" sx={{ textDecoration: "line-through", color: palette.textMuted }}>
                            {formatMoney(linePricing.original_unit_price)}
                          </Typography>
                          <Typography variant="body2" sx={{ color: "success.main", fontWeight: 700 }}>
                            {formatMoney(linePricing.final_unit_price)}
                          </Typography>
                        </Box>
                      ) : (
                        formatMoney(item.price)
                      )}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: isDark ? "white" : "text.primary" }}>{formatMoney(linePricing.final_total)}</TableCell>
                    <TableCell align="right">
                      <IconButton onClick={() => cart.removeItem(item.product_id)} sx={{ color: "error.main", opacity: 0.7, "&:hover": { opacity: 1 } }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ResizableTable>
      )}

      <Box sx={{ mt: 3 }}>
        <TextField
          fullWidth
          label={minimal ? "Descuento ($)" : "Descuento adicional a la orden"}
          size="small"
          type="number"
          value={Number.isFinite(discount) ? discount : 0}
          onChange={(event) => cart.setDiscount(event.target.value === "" ? 0 : Number(event.target.value))}
          sx={fieldSx}
        />
      </Box>

      <Paper
        className="glass-panel"
        sx={{
          mt: 2,
          p: minimal ? 2 : 2.5,
          color: isDark ? "#fff" : "text.primary",
          borderRadius: 3,
          border: `1px solid ${palette.summaryBorder}`,
          bgcolor: palette.summaryBg,
          backdropFilter: "blur(12px)"
        }}
      >
        {!minimal && (
          <Typography variant="overline" sx={{ fontWeight: 800, display: "block", mb: 1, color: isDark ? "rgba(255,255,255,0.7)" : "text.secondary", letterSpacing: 1 }}>
            TOTAL DE LIQUIDACIÓN
          </Typography>
        )}
        <Stack spacing={1}>
          {summaryRows.map((row) => (
            <Box key={row.label} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: minimal ? "0.85rem" : "0.95rem" }}>
              <Typography variant="body2" color={isDark ? "rgba(255,255,255,0.8)" : "text.secondary"} fontWeight="600">{row.label}</Typography>
              <Typography variant="body2" fontWeight="700">{row.value}</Typography>
            </Box>
          ))}
          <Box sx={{ borderTop: `1px dashed ${palette.summaryBorder}`, pt: 1.5, display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1 }}>
            <Typography variant="h6" fontWeight="900">Total a Pagar</Typography>
            <Typography variant="h5" fontWeight="900" color={isDark ? "white" : "primary.main"}>{formatMoney(summary.total)}</Typography>
          </Box>
        </Stack>
      </Paper>

      {!minimal && (
        <Typography sx={{ mt: 2, fontSize: 12, color: palette.textMuted, fontWeight: 700, textAlign: "right" }}>
          Moneda de liquidación: {currency}
        </Typography>
      )}
    </Box>
  );
};
