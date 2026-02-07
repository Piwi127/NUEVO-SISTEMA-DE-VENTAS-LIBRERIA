import React from "react";
import { Box, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, useMediaQuery, Paper, Typography, Stack } from "@mui/material";
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

  return (
    <Box>
      {isCompact ? (
        <Box sx={{ display: "grid", gap: 1 }}>
          {cart.items.map((item) => (
            <Paper
              key={item.product_id}
              sx={{ p: 1.5, display: "grid", gap: 1, bgcolor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)" }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography sx={{ fontWeight: 600 }}>{item.name}</Typography>
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
