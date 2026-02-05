import React, { useEffect, useState } from "react";
import { Box, TextField, Button, List, ListItem, ListItemText, InputAdornment, Chip } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useQuery } from "@tanstack/react-query";
import { listProducts } from "../../catalog/api";
import { useCartStore } from "../../../store/useCartStore";
import { formatMoney } from "../../../utils/money";
import { useSettings } from "../../../store/useSettings";

export const ProductSearch: React.FC<{ priceMap?: Record<number, number>; inputRef?: React.Ref<HTMLInputElement> }> = ({ priceMap, inputRef }) => {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const cart = useCartStore();
  const { currency, compactMode } = useSettings();
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const { data } = useQuery({
    queryKey: ["products", debounced],
    queryFn: () => listProducts(debounced),
    staleTime: 60_000,
  });

  return (
    <Box>
      <Box sx={{ display: "flex", gap: 2, mb: 2, flexDirection: compactMode ? "column" : "row" }}>
        <TextField
          fullWidth
          label="Buscar por SKU o nombre"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          inputRef={inputRef}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      <List dense sx={{ bgcolor: "#fff", borderRadius: 2, p: 1 }}>
        {(data || []).map((p) => {
          const price = priceMap?.[p.id] ?? p.price;
          return (
            <ListItem
              key={p.id}
              secondaryAction={
                <Button variant="contained" size={compactMode ? "small" : "medium"} onClick={() => cart.addItem({ product_id: p.id, sku: p.sku, name: p.name, price })}>
                  Agregar
                </Button>
              }
            >
              <ListItemText
                primary={`${p.sku} - ${p.name}`}
                secondaryTypographyProps={{ component: "div" }}
                secondary={
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                    <Chip size="small" label={`Stock: ${p.stock}`} />
                    <Chip size="small" label={`${formatMoney(price)}`} color="primary" />
                    <Chip size="small" label={currency} />
                  </Box>
                }
              />
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
};
