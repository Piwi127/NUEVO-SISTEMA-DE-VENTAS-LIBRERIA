import React from "react";
import { Box, IconButton, Table, TableBody, TableCell, TableHead, TableRow, TextField, useMediaQuery, Paper, Typography } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useCartStore } from "../store/useCartStore";
import { formatMoney } from "../utils/money";
import { useSettings } from "../store/useSettings";
import { calcTotals } from "../utils/totals";

export const Cart: React.FC = () => {
  const cart = useCartStore();
  const { currency, taxRate, taxIncluded, compactMode } = useSettings();
  const compact = useMediaQuery("(max-width:900px)");
  const isCompact = compactMode || compact;
  const discount = cart.discount;
  const { subtotal, total, tax } = calcTotals(cart.items, discount, taxRate, taxIncluded);

  return (
    <Box>
      {isCompact ? (
        <Box sx={{ display: "grid", gap: 1 }}>
          {cart.items.map((item) => (
            <Paper key={item.product_id} sx={{ p: 1.5, display: "grid", gap: 1 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography sx={{ fontWeight: 600 }}>{item.name}</Typography>
                <IconButton onClick={() => cart.removeItem(item.product_id)}>
                  <DeleteIcon />
                </IconButton>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="body2" color="text.secondary">Cantidad</Typography>
                <TextField
                  size="small"
                  type="number"
                  value={item.qty}
                  onChange={(e) => {
                    const v = e.target.value;
                    cart.setQty(item.product_id, v === "" ? 1 : Number(v));
                  }}
                  inputProps={{ min: 1, style: { width: 80 } }}
                />
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">Precio</Typography>
                <Typography>{formatMoney(item.price)}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
                <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                <Typography>{formatMoney(item.price * item.qty)}</Typography>
              </Box>
            </Paper>
          ))}
        </Box>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Producto</TableCell>
              <TableCell>Cant</TableCell>
              <TableCell>Precio</TableCell>
              <TableCell>Subtotal</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cart.items.map((item) => (
              <TableRow key={item.product_id}>
                <TableCell>{item.name}</TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    type="number"
                    value={item.qty}
                    onChange={(e) => {
                      const v = e.target.value;
                      cart.setQty(item.product_id, v === "" ? 1 : Number(v));
                    }}
                    inputProps={{ min: 1, style: { width: 60 } }}
                  />
                </TableCell>
                <TableCell>{formatMoney(item.price)}</TableCell>
                <TableCell>{formatMoney(item.price * item.qty)}</TableCell>
                <TableCell>
                  <IconButton onClick={() => cart.removeItem(item.product_id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Box sx={{ mt: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
        <TextField
          label="Descuento"
          size="small"
          type="number"
          value={Number.isFinite(discount) ? discount : 0}
          onChange={(e) => cart.setDiscount(e.target.value === "" ? 0 : Number(e.target.value))}
        />
      </Box>
      <Box
        sx={{
          mt: 2,
          p: 2,
          bgcolor: "primary.main",
          color: "#fff",
          borderRadius: 2,
          display: "grid",
          gap: 1,
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
      <Box sx={{ mt: 1, fontSize: 12, color: "text.secondary" }}>Moneda: {currency}</Box>
    </Box>
  );
};
