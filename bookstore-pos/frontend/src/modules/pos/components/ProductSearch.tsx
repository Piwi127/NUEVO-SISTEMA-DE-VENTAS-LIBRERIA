import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  FormControlLabel,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useQuery } from "@tanstack/react-query";
import { listProducts } from "../../catalog/api";
import { Product } from "../../shared/types";
import { useCartStore } from "../../../store/useCartStore";
import { formatMoney } from "../../../utils/money";
import { useSettings } from "../../../store/useSettings";

const TERM_GROUPS: string[][] = [
  ["cuaderno", "cuadernos", "hoja", "hojas", "libreta", "notebook", "rayado", "cuadriculado"],
  ["lapiz", "lapices", "portaminas", "grafito", "hb"],
  ["lapicero", "lapiceros", "boligrafo", "boligrafos", "pluma", "tinta"],
  ["borrador", "borradores", "goma", "corrector"],
  ["resaltador", "resaltadores", "marcador", "marcadores", "fluorescente"],
  ["folder", "carpeta", "archivador", "funda", "micas"],
  ["papel", "papeles", "resma", "a4", "oficio", "bond"],
  ["regla", "escuadra", "transportador", "compas"],
  ["cartulina", "cartulinas", "carton", "cartonina", "manualidades"],
  ["pegamento", "goma", "silicona", "adhesivo"],
  ["tijera", "tijeras", "cutter", "cuchilla"],
  ["tempera", "acrilico", "pintura", "oleo", "acuarela", "pincel"],
  ["escolar", "utiles", "oficina", "papeleria"],
];

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const tokenize = (value: string): string[] => normalize(value).split(/[^a-z0-9]+/).filter(Boolean);

const expandTokens = (tokens: string[]): string[] => {
  const result = new Set(tokens);
  TERM_GROUPS.forEach((group) => {
    if (group.some((term) => result.has(term))) {
      group.forEach((term) => result.add(term));
    }
  });
  return Array.from(result);
};

const scoreProduct = (product: Product, rawTokens: string[], expandedTokens: string[]): number => {
  if (rawTokens.length === 0) return 1;

  const name = normalize(product.name);
  const category = normalize(product.category || "");
  const tags = normalize(product.tags || "");
  const sku = normalize(product.sku || "");
  let score = 0;
  let strictHits = 0;

  rawTokens.forEach((token) => {
    let hit = false;
    if (sku === token) {
      score += 120;
      hit = true;
    } else if (sku.startsWith(token)) {
      score += 90;
      hit = true;
    }

    if (name === token) {
      score += 80;
      hit = true;
    } else if (name.startsWith(token)) {
      score += 70;
      hit = true;
    } else if (name.includes(token)) {
      score += 55;
      hit = true;
    }

    if (category === token) {
      score += 60;
      hit = true;
    } else if (category.includes(token)) {
      score += 38;
      hit = true;
    }
    if (tags.includes(token)) {
      score += 44;
      hit = true;
    }

    if (hit) strictHits += 1;
  });

  expandedTokens.forEach((token) => {
    if (rawTokens.includes(token)) return;
    if (name.includes(token)) score += 16;
    if (category.includes(token)) score += 14;
    if (tags.includes(token)) score += 18;
  });

  if (strictHits === rawTokens.length && rawTokens.length > 0) score += 40;
  if (strictHits === 0) return 0;
  if (product.stock > 0) score += 2;

  return score;
};

export const ProductSearch: React.FC<{ priceMap?: Record<number, number>; inputRef?: React.Ref<HTMLInputElement> }> = ({ priceMap, inputRef }) => {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [onlyStock, setOnlyStock] = useState(true);

  const cart = useCartStore();
  const { currency, compactMode } = useSettings();

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const { data, isFetching } = useQuery({
    queryKey: ["products-smart-search"],
    queryFn: () => listProducts(undefined, 500, 0),
    staleTime: 60_000,
  });

  const products = data || [];

  const categories = useMemo(() => {
    const values = new Set<string>();
    products.forEach((p) => {
      if (p.category) values.add(p.category);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const rawTokens = useMemo(() => tokenize(debounced), [debounced]);
  const expanded = useMemo(() => expandTokens(rawTokens), [rawTokens]);

  const suggestionTerms = useMemo(() => {
    if (!rawTokens.length) return [] as string[];
    const matchedGroups = TERM_GROUPS.filter((group) => group.some((term) => rawTokens.includes(term)));
    return Array.from(new Set(matchedGroups.flat())).filter((t) => !rawTokens.includes(t)).slice(0, 6);
  }, [rawTokens]);

  const rankedProducts = useMemo(() => {
    const byCategory = categoryFilter ? products.filter((p) => p.category === categoryFilter) : products;

    const scored = byCategory
      .map((product) => ({
        product,
        score: scoreProduct(product, rawTokens, expanded),
      }))
      .filter((item) => item.score > 0)
      .filter((item) => (onlyStock ? item.product.stock > 0 : true))
      .sort((a, b) => b.score - a.score || b.product.stock - a.product.stock || a.product.name.localeCompare(b.product.name));

    return scored.map((s) => s.product);
  }, [products, categoryFilter, rawTokens, expanded, onlyStock]);

  const addProduct = (product: Product) => {
    const price = priceMap?.[product.id] ?? product.price;
    cart.addItem({ product_id: product.id, sku: product.sku, name: product.name, price });
  };

  return (
    <Box>
      <Box sx={{ display: "grid", gap: 1.5, mb: 2 }}>
        <TextField
          fullWidth
          label="Busqueda inteligente"
          placeholder="SKU, nombre, categoria o termino relacionado (ej. hojas)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          inputRef={inputRef}
          onKeyDown={(e) => {
            if (e.key === "Enter" && rankedProducts.length > 0) {
              e.preventDefault();
              addProduct(rankedProducts[0]);
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />

        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center", flexDirection: compactMode ? "column" : "row" }}>
          <TextField
            select
            label="Categoria"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            sx={{ minWidth: 220, width: compactMode ? "100%" : "auto" }}
          >
            <MenuItem value="">Todas</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </TextField>
          <FormControlLabel
            control={<Switch checked={onlyStock} onChange={(e) => setOnlyStock(e.target.checked)} />}
            label="Solo con stock"
          />
          <Chip label={`Resultados: ${rankedProducts.length}`} color="primary" size="small" />
          {isFetching ? <Chip label="Actualizando..." size="small" /> : null}
        </Box>

        {suggestionTerms.length > 0 ? (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>
              Terminos relacionados:
            </Typography>
            {suggestionTerms.map((term) => (
              <Chip key={term} label={term} size="small" onClick={() => setSearch((prev) => `${prev} ${term}`.trim())} />
            ))}
          </Box>
        ) : null}
      </Box>

      <List dense sx={{ bgcolor: "#fff", borderRadius: 2, p: 1 }}>
        {rankedProducts.slice(0, 120).map((p) => {
          const price = priceMap?.[p.id] ?? p.price;
          const tagsList = (p.tags || "")
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
            .slice(0, 3);
          return (
            <ListItem
              key={p.id}
              secondaryAction={
                <Button variant="contained" size={compactMode ? "small" : "medium"} onClick={() => addProduct(p)}>
                  Agregar
                </Button>
              }
            >
              <ListItemText
                primary={`${p.sku} - ${p.name}`}
                secondaryTypographyProps={{ component: "div" }}
                secondary={
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                    <Chip size="small" label={`Categoria: ${p.category || "-"}`} />
                    {tagsList.map((tag) => <Chip key={`${p.id}-${tag}`} size="small" label={`#${tag}`} />)}
                    <Chip size="small" label={`Stock: ${p.stock}`} color={p.stock > 0 ? "success" : "default"} />
                    <Chip size="small" label={`${formatMoney(price)}`} color="primary" />
                    <Chip size="small" label={currency} />
                  </Box>
                }
              />
            </ListItem>
          );
        })}
      </List>

      {!isFetching && rankedProducts.length === 0 ? (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            No se encontraron productos con ese criterio. Prueba con SKU, nombre, categoria o termino relacionado.
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
};
