import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  useMediaQuery,
  Paper,
  Typography,
  Stack,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";
import { useCartStore } from "@/app/store";
import { formatMoney } from "@/app/utils";
import { useSettings } from "@/app/store";
import { calcTotals } from "@/app/utils";

export const Cart: React.FC = () => {
  const cart = useCartStore();
  const { currency, taxRate, taxIncluded, compactMode } = useSettings();
  const compact = useMediaQuery("(max-width:900px)");
  const isCompact = compactMode || compact;
  const discount = cart.discount;
  const { subtotal, total, tax } = calcTotals(cart.items, discount, taxRate, taxIncluded);
  const normalizeQty = (value: number) => (value < 1 ? 1 : value);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);

  useEffect(() => {
    const existingIds = new Set(cart.items.map((item) => item.product_id));
    setSelectedProductIds((prev) => prev.filter((id) => existingIds.has(id)));
  }, [cart.items]);

  const selectedSet = useMemo(() => new Set(selectedProductIds), [selectedProductIds]);
  const cartProductIds = useMemo(() => cart.items.map((item) => item.product_id), [cart.items]);
  const allSelected = cartProductIds.length > 0 && cartProductIds.every((id) => selectedSet.has(id));
  const someSelected = cartProductIds.some((id) => selectedSet.has(id));

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
      <Box sx={{ mb: 1.5, display: "flex", gap: 1, flexWrap: "wrap" }}>
        <Button variant="outlined" size="small" onClick={toggleAllProducts} disabled={!cart.items.length}>
          {allSelected ? "Quitar seleccion" : "Seleccionar todo"}
        </Button>
        <Button
          variant="outlined"
          color="error"
          size="small"
          startIcon={<DeleteIcon />}
          disabled={!selectedProductIds.length}
          onClick={removeSelectedProducts}
        >
          Eliminar seleccionados ({selectedProductIds.length})
        </Button>
      </Box>

      {isCompact ? (
        <Box sx={{ display: "grid", gap: 1 }}>
          {cart.items.map((item) => (
            <Paper
              key={item.product_id}
              sx={{ p: 1.5, display: "grid", gap: 1, bgcolor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)" }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Checkbox
                    checked={selectedSet.has(item.product_id)}
                    onChange={() => toggleProduct(item.product_id)}
                    sx={{ p: 0.5, color: "rgba(255,255,255,0.9)" }}
                  />
                  <Typography sx={{ fontWeight: 600 }}>{item.name}</Typography>
                </Box>
                <IconButton onClick={() => cart.removeItem(item.product_id)} sx={{ bgcolor: "rgba(255,255,255,0.12)" }}>
                  <DeleteIcon />
                </IconButton>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.9)", fontWeight: 700 }}>
                  Cantidad
                </Typography>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <IconButton size="small" onClick={() => cart.setQty(item.product_id, normalizeQty(item.qty - 1))} sx={{ bgcolor: "rgba(255,255,255,0.12)" }}>
                    <RemoveIcon fontSize="small" />
                  </IconButton>
                  <TextField
                    size="small"
                    type="number"
                    value={item.qty}
                    onChange={(e) => {
                      const v = e.target.value;
                      cart.setQty(item.product_id, normalizeQty(v === "" ? 1 : Number(v)));
                    }}
                    inputProps={{ min: 1, style: { width: 70, textAlign: "center" } }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        bgcolor: "rgba(255,255,255,0.16)",
                        borderRadius: 1.5,
                        "& fieldset": { borderColor: "rgba(255,255,255,0.34)" },
                      },
                    }}
                  />
                  <IconButton size="small" onClick={() => cart.setQty(item.product_id, item.qty + 1)} sx={{ bgcolor: "rgba(255,255,255,0.12)" }}>
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.9)", fontWeight: 700 }}>
                  Precio
                </Typography>
                <Typography>{formatMoney(item.price)}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.9)", fontWeight: 700 }}>
                  Subtotal
                </Typography>
                <Typography>{formatMoney(item.price * item.qty)}</Typography>
              </Box>
            </Paper>
          ))}
        </Box>
      ) : (
        <TableContainer sx={{ borderRadius: 2, border: "1px solid rgba(255,255,255,0.2)", bgcolor: "rgba(255,255,255,0.05)" }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "rgba(255,255,255,0.12)" }}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected && !allSelected}
                    onChange={toggleAllProducts}
                    sx={{ color: "#fff" }}
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
              {cart.items.map((item) => (
                <TableRow key={item.product_id} hover sx={{ "&:hover": { bgcolor: "rgba(255,255,255,0.08)" } }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedSet.has(item.product_id)}
                      onChange={() => toggleProduct(item.product_id)}
                      sx={{ color: "#fff" }}
                    />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 170, fontWeight: 700 }}>{item.name}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <IconButton size="small" onClick={() => cart.setQty(item.product_id, normalizeQty(item.qty - 1))} sx={{ bgcolor: "rgba(255,255,255,0.12)" }}>
                        <RemoveIcon fontSize="small" />
                      </IconButton>
                      <TextField
                        size="small"
                        type="number"
                        value={item.qty}
                        onChange={(e) => {
                          const v = e.target.value;
                          cart.setQty(item.product_id, normalizeQty(v === "" ? 1 : Number(v)));
                        }}
                        inputProps={{ min: 1, style: { width: 56, textAlign: "center" } }}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            bgcolor: "rgba(255,255,255,0.16)",
                            borderRadius: 1.5,
                            "& fieldset": { borderColor: "rgba(255,255,255,0.34)" },
                          },
                        }}
                      />
                      <IconButton size="small" onClick={() => cart.setQty(item.product_id, item.qty + 1)} sx={{ bgcolor: "rgba(255,255,255,0.12)" }}>
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{formatMoney(item.price)}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{formatMoney(item.price * item.qty)}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => cart.removeItem(item.product_id)} sx={{ bgcolor: "rgba(255,255,255,0.12)" }}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Box sx={{ mt: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
        <TextField
          label="Descuento"
          size="small"
          type="number"
          value={Number.isFinite(discount) ? discount : 0}
          onChange={(e) => cart.setDiscount(e.target.value === "" ? 0 : Number(e.target.value))}
          sx={{
            "& .MuiOutlinedInput-root": {
              bgcolor: "rgba(255,255,255,0.16)",
              borderRadius: 1.5,
              "& fieldset": { borderColor: "rgba(255,255,255,0.34)" },
            },
          }}
        />
      </Box>
      <Box
        sx={{
          mt: 2,
          p: 2,
          bgcolor: "rgba(34, 85, 136, 0.58)",
          color: "#fff",
          borderRadius: 2,
          display: "grid",
          gap: 1,
          border: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Box>Subtotal</Box>
          <Box>{formatMoney(subtotal)}</Box>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Box>Impuesto</Box>
          <Box>{formatMoney(tax)}</Box>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Box>Descuento</Box>
          <Box>-{formatMoney(discount)}</Box>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 18 }}>
          <Box>Total</Box>
          <Box>{formatMoney(total)}</Box>
        </Box>
      </Box>
      <Box sx={{ mt: 1, fontSize: 12, color: "rgba(255,255,255,0.82)", fontWeight: 700 }}>Moneda: {currency}</Box>
    </Box>
  );
};
