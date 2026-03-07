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
    cardBg: isDark ? "rgba(255,255,255,0.08)" : "#ffffff",
    cardBorder: isDark ? "rgba(255,255,255,0.18)" : "#d9e2ec",
    subtleBg: isDark ? "rgba(255,255,255,0.08)" : "rgba(18,53,90,0.045)",
    inputBg: isDark ? "rgba(255,255,255,0.14)" : "#ffffff",
    inputBorder: isDark ? "rgba(255,255,255,0.3)" : "#cbd2d9",
    textMuted: isDark ? "rgba(255,255,255,0.78)" : "#486581",
    summaryBg: isDark ? "rgba(34,85,136,0.58)" : "linear-gradient(160deg, rgba(18,53,90,0.08) 0%, rgba(18,53,90,0.03) 60%, rgba(154,123,47,0.1) 100%)",
    summaryBorder: isDark ? "rgba(255,255,255,0.2)" : "rgba(18,53,90,0.12)",
    chipBg: isDark ? "rgba(255,255,255,0.12)" : "rgba(18,53,90,0.08)",
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
      base_total: baseTotal,
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
    { label: minimal ? "Items" : "Subtotal items", value: formatMoney(summary.subtotalAfterPacks), visible: true },
    { label: minimal ? "Packs" : "Descuento packs", value: `-${formatMoney(summary.packDiscount)}`, visible: !minimal || summary.packDiscount > 0 },
    {
      label: minimal ? "Promo/desc." : "Descuento manual o promo",
      value: `-${formatMoney(summary.promotionDiscount)}`,
      visible: !minimal || summary.promotionDiscount > 0,
    },
    { label: "Impuesto", value: formatMoney(summary.tax), visible: !minimal || summary.tax > 0 },
  ].filter((row) => row.visible);

  const fieldSx = {
    "& .MuiOutlinedInput-root": {
      bgcolor: palette.inputBg,
      borderRadius: 1.5,
      color: isDark ? "#ffffff" : "text.primary",
      "& fieldset": { borderColor: palette.inputBorder },
    },
    "& .MuiInputBase-input": {
      color: isDark ? "#ffffff" : "text.primary",
    },
    "& .MuiInputLabel-root": {
      color: isDark ? "rgba(255,255,255,0.82)" : undefined,
    },
    "& .MuiFormHelperText-root": {
      color: isDark ? "rgba(255,255,255,0.74)" : undefined,
    },
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
      <Stack spacing={minimal ? 1 : 1.25} sx={{ mb: 1.5 }}>
        {minimal ? (
          <Typography variant="caption" sx={{ color: palette.textMuted, fontWeight: 700 }}>
            {cart.items.length} productos | {totalUnits} uds.
            {selectedProductIds.length > 0 ? ` | ${selectedProductIds.length} seleccionados` : ""}
          </Typography>
        ) : (
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            <Chip size="small" label={`${cart.items.length} productos`} sx={{ bgcolor: palette.chipBg }} />
            <Chip size="small" label={`${totalUnits} unidades`} sx={{ bgcolor: palette.chipBg }} />
            {selectedProductIds.length > 0 ? (
              <Chip size="small" label={`${selectedProductIds.length} seleccionados`} sx={{ bgcolor: palette.chipBg }} />
            ) : null}
          </Stack>
        )}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button variant="outlined" size="small" onClick={toggleAllProducts} disabled={!cart.items.length}>
            {minimal ? (allSelected ? "Quitar" : "Seleccionar") : allSelected ? "Quitar seleccion" : "Seleccionar todo"}
          </Button>
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<DeleteIcon />}
            disabled={!selectedProductIds.length}
            onClick={removeSelectedProducts}
          >
            {minimal ? `Eliminar (${selectedProductIds.length})` : `Eliminar seleccionados (${selectedProductIds.length})`}
          </Button>
          <Button variant="outlined" size="small" disabled={!cart.items.length} onClick={cart.clear}>
            Vaciar carrito
          </Button>
        </Stack>
      </Stack>

      {!cart.items.length ? (
        <Paper
          sx={{
            p: minimal ? 1.5 : 2,
            borderRadius: 2,
            border: `1px solid ${palette.cardBorder}`,
            bgcolor: palette.cardBg,
            boxShadow: "none",
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Carrito vacio
          </Typography>
          <Typography variant="body2" sx={{ color: palette.textMuted }}>
            Agrega productos desde la busqueda para preparar una venta nueva.
          </Typography>
        </Paper>
      ) : isCompact ? (
        <Box sx={{ display: "grid", gap: minimal ? 1 : 1.25 }}>
          {cart.items.map((item) => {
            const linePricing = getLinePricing(item.product_id, item.qty, item.price);
            return (
              <Paper
                key={item.product_id}
                sx={{
                  p: minimal ? 1 : 1.5,
                  display: "grid",
                  gap: minimal ? 0.75 : 1.25,
                  bgcolor: palette.cardBg,
                  border: `1px solid ${palette.cardBorder}`,
                  boxShadow: "none",
                }}
              >
                {minimal ? (
                  <Stack direction="row" spacing={0.75} alignItems="flex-start">
                    <Checkbox
                      size="small"
                      checked={selectedSet.has(item.product_id)}
                      onChange={() => toggleProduct(item.product_id)}
                      sx={{ p: 0.25, color: isDark ? "rgba(255,255,255,0.9)" : undefined }}
                    />
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={0.75} justifyContent="space-between" alignItems="flex-start">
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>
                            {item.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: palette.textMuted }}>
                            {item.sku ? `SKU ${item.sku}` : `Codigo ${item.product_id}`}
                          </Typography>
                        </Box>
                        <IconButton size="small" onClick={() => cart.removeItem(item.product_id)} sx={{ bgcolor: palette.subtleBg }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>

                      <Stack
                        direction="row"
                        spacing={1}
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{ mt: 0.5, flexWrap: "wrap", rowGap: 0.5 }}
                      >
                        <Typography variant="caption" sx={{ color: palette.textMuted }}>
                          {formatMoney(item.price)} c/u
                        </Typography>
                        <Typography sx={{ fontWeight: 900 }}>{formatMoney(linePricing.final_total)}</Typography>
                      </Stack>

                      <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center" sx={{ mt: 0.75 }}>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <IconButton size="small" onClick={() => cart.setQty(item.product_id, normalizeQty(item.qty - 1))} sx={{ bgcolor: palette.chipBg }}>
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                          <TextField
                            size="small"
                            type="number"
                            value={item.qty}
                            onChange={(event) => {
                              const value = event.target.value;
                              cart.setQty(item.product_id, normalizeQty(value === "" ? 1 : Number(value)));
                            }}
                            inputProps={{ min: 1, inputMode: "numeric", style: { width: 52, textAlign: "center" } }}
                            sx={fieldSx}
                          />
                          <IconButton size="small" onClick={() => cart.setQty(item.product_id, item.qty + 1)} sx={{ bgcolor: palette.chipBg }}>
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                        <Typography variant="caption" sx={{ color: palette.textMuted, fontWeight: 700 }}>
                          {linePricing.pack_discount > 0 ? `Pack -${formatMoney(linePricing.pack_discount)}` : `${item.qty} uds.`}
                        </Typography>
                      </Stack>
                    </Box>
                  </Stack>
                ) : (
                  <>
                    <Stack direction="row" spacing={1} alignItems="flex-start">
                      <Checkbox
                        checked={selectedSet.has(item.product_id)}
                        onChange={() => toggleProduct(item.product_id)}
                        sx={{ p: 0.5, color: isDark ? "rgba(255,255,255,0.9)" : undefined }}
                      />
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="flex-start">
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 800 }} noWrap>
                              {item.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: palette.textMuted }}>
                              {item.sku ? `SKU ${item.sku}` : `Codigo ${item.product_id}`}
                            </Typography>
                          </Box>
                          <Chip size="small" label={formatMoney(linePricing.final_total)} sx={{ bgcolor: palette.chipBg, fontWeight: 800 }} />
                        </Stack>
                        {linePricing.pack_discount > 0 ? (
                          <Chip
                            size="small"
                            label={`Pack -${formatMoney(linePricing.pack_discount)}`}
                            sx={{ mt: 1, bgcolor: palette.subtleBg, color: isDark ? "#ffffff" : "text.primary" }}
                          />
                        ) : null}
                      </Box>
                      <IconButton onClick={() => cart.removeItem(item.product_id)} sx={{ bgcolor: palette.subtleBg }}>
                        <DeleteIcon />
                      </IconButton>
                    </Stack>

                    <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" } }}>
                      <Paper sx={{ p: 1.1, bgcolor: palette.subtleBg, boxShadow: "none" }}>
                        <Typography variant="caption" sx={{ color: palette.textMuted }}>
                          Precio unitario
                        </Typography>
                        <Typography sx={{ fontWeight: 800 }}>{formatMoney(item.price)}</Typography>
                      </Paper>
                      <Paper sx={{ p: 1.1, bgcolor: palette.subtleBg, boxShadow: "none" }}>
                        <Typography variant="caption" sx={{ color: palette.textMuted }}>
                          Total de linea
                        </Typography>
                        <Typography sx={{ fontWeight: 900 }}>{formatMoney(linePricing.final_total)}</Typography>
                      </Paper>
                    </Box>

                    <Paper sx={{ p: 1.1, bgcolor: palette.subtleBg, boxShadow: "none" }}>
                      <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="caption" sx={{ color: palette.textMuted }}>
                            Cantidad
                          </Typography>
                          <Typography sx={{ fontWeight: 800 }}>{item.qty} uds.</Typography>
                        </Box>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <IconButton size="small" onClick={() => cart.setQty(item.product_id, normalizeQty(item.qty - 1))} sx={{ bgcolor: palette.chipBg }}>
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                          <TextField
                            size="small"
                            type="number"
                            value={item.qty}
                            onChange={(event) => {
                              const value = event.target.value;
                              cart.setQty(item.product_id, normalizeQty(value === "" ? 1 : Number(value)));
                            }}
                            inputProps={{ min: 1, inputMode: "numeric", style: { width: 68, textAlign: "center" } }}
                            sx={fieldSx}
                          />
                          <IconButton size="small" onClick={() => cart.setQty(item.product_id, item.qty + 1)} sx={{ bgcolor: palette.chipBg }}>
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Stack>
                    </Paper>
                  </>
                )}
              </Paper>
            );
          })}
        </Box>
      ) : (
        <ResizableTable
          minHeight={250}
          sx={{
            borderRadius: 2,
            border: `1px solid ${palette.cardBorder}`,
            background: palette.cardBg,
            boxShadow: "none",
          }}
        >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow sx={{ bgcolor: palette.subtleBg }}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected && !allSelected}
                    onChange={toggleAllProducts}
                    sx={{ color: isDark ? "#fff" : undefined }}
                  />
                </TableCell>
                <TableCell>Producto</TableCell>
                <TableCell>Cant</TableCell>
                <TableCell>Precio</TableCell>
                <TableCell>Subtotal</TableCell>
                <TableCell></TableCell>
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
                        sx={{ color: isDark ? "#fff" : undefined }}
                      />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 220, fontWeight: 700 }}>
                      <Typography sx={{ fontWeight: 700 }}>{item.name}</Typography>
                      <Typography variant="caption" sx={{ color: palette.textMuted }}>
                        {item.sku ? `SKU ${item.sku}` : `Codigo ${item.product_id}`}
                      </Typography>
                      {linePricing.pack_discount > 0 ? (
                        <Typography variant="caption" sx={{ display: "block", color: palette.textMuted }}>
                          Pack -{formatMoney(linePricing.pack_discount)}
                        </Typography>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <IconButton size="small" onClick={() => cart.setQty(item.product_id, normalizeQty(item.qty - 1))} sx={{ bgcolor: palette.subtleBg }}>
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                        <TextField
                          size="small"
                          type="number"
                          value={item.qty}
                          onChange={(event) => {
                            const value = event.target.value;
                            cart.setQty(item.product_id, normalizeQty(value === "" ? 1 : Number(value)));
                          }}
                          inputProps={{ min: 1, inputMode: "numeric", style: { width: 56, textAlign: "center" } }}
                          sx={fieldSx}
                        />
                        <IconButton size="small" onClick={() => cart.setQty(item.product_id, item.qty + 1)} sx={{ bgcolor: palette.subtleBg }}>
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{formatMoney(item.price)}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{formatMoney(linePricing.final_total)}</TableCell>
                    <TableCell>
                      <IconButton onClick={() => cart.removeItem(item.product_id)} sx={{ bgcolor: palette.subtleBg }}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ResizableTable>
      )}

      <Box sx={{ mt: 2, display: "grid", gap: 1 }}>
        <TextField
          label={minimal ? "Descuento" : "Descuento manual"}
          helperText={minimal ? undefined : "Aplica un descuento adicional para esta venta."}
          size="small"
          type="number"
          value={Number.isFinite(discount) ? discount : 0}
          onChange={(event) => cart.setDiscount(event.target.value === "" ? 0 : Number(event.target.value))}
          sx={fieldSx}
        />
      </Box>

      <Box
        sx={{
          mt: 2,
          p: minimal ? 1.5 : 2,
          color: isDark ? "#fff" : "text.primary",
          borderRadius: 2,
          display: "grid",
          gap: 1,
          border: `1px solid ${palette.summaryBorder}`,
          bgcolor: palette.summaryBg,
        }}
      >
        {!minimal ? (
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
            Resumen de cobro
          </Typography>
        ) : null}
        {summaryRows.map((row) => (
          <Box key={row.label} sx={{ display: "flex", justifyContent: "space-between", gap: 2, fontSize: minimal ? 13 : undefined }}>
            <Box>{row.label}</Box>
            <Box>{row.value}</Box>
          </Box>
        ))}
        <Box sx={{ borderTop: `1px solid ${palette.summaryBorder}`, pt: 1, display: "flex", justifyContent: "space-between", fontWeight: 900, fontSize: 18 }}>
          <Box>Total</Box>
          <Box>{formatMoney(summary.total)}</Box>
        </Box>
      </Box>

      {!minimal ? (
        <Typography sx={{ mt: 1, fontSize: 12, color: palette.textMuted, fontWeight: 700 }}>
          Moneda de trabajo: {currency}
        </Typography>
      ) : null}
    </Box>
  );
};





