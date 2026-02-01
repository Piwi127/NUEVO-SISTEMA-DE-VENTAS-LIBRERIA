import React from "react";
import { Box, IconButton, Table, TableBody, TableCell, TableHead, TableRow, TextField } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useCartStore } from "../store/useCartStore";
import { formatMoney } from "../utils/money";
import { useSettings } from "../store/useSettings";

export const Cart: React.FC = () => {
  const cart = useCartStore();
  const { currency } = useSettings();
  const { subtotal, total, discount, tax } = cart.totals();

  return (
    <Box>
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
      <Box sx={{ mt: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
        <TextField
          label="Impuesto"
          size="small"
          type="number"
          value={Number.isFinite(tax) ? tax : 0}
          onChange={(e) => cart.setTax(e.target.value === "" ? 0 : Number(e.target.value))}
        />
        <TextField
          label="Descuento"
          size="small"
          type="number"
          value={Number.isFinite(discount) ? discount : 0}
          onChange={(e) => cart.setDiscount(e.target.value === "" ? 0 : Number(e.target.value))}
        />
      </Box>
      <Box sx={{ mt: 2, p: 2, bgcolor: "#0f172a", color: "#fff", borderRadius: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
        <Box>Subtotal: {formatMoney(subtotal)}</Box>
        <Box>Impuesto: {formatMoney(tax)}</Box>
        <Box>Descuento: {formatMoney(discount)}</Box>
        <Box sx={{ fontWeight: 700 }}>Total: {formatMoney(total)}</Box>
      </Box>
      <Box sx={{ mt: 1, fontSize: 12, color: "text.secondary" }}>Moneda: {currency}</Box>
    </Box>
  );
};
