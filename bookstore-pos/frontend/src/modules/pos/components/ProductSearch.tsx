import React, { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Chip,
  FormControlLabel,
  InputAdornment,
  List,
  ListItemButton,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Tab,
  Tabs,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import { useQuery } from "@tanstack/react-query";
import { listProductCategories, listProducts } from "@/modules/catalog/api";
import { Product } from "@/modules/shared/types";
import { useCartStore, useSettings } from "@/app/store";
import { formatMoney } from "@/app/utils";

const TERM_GROUPS: string[][] = [
  ["cuaderno", "cuadernos", "hoja", "hojas", "libreta", "notebook", "rayado", "cuadriculado", "apuntes"],
  ["lapiz", "lapices", "portaminas", "grafito", "hb", "dibujar"],
  ["lapicero", "lapiceros", "boligrafo", "boligrafos", "pluma", "tinta", "escribir"],
  ["borrador", "borradores", "goma", "corrector", "corregir"],
  ["resaltador", "resaltadores", "marcador", "marcadores", "fluorescente", "subrayar"],
  ["folder", "carpeta", "archivador", "funda", "micas", "archivar"],
  ["papel", "papeles", "resma", "a4", "oficio", "bond", "imprimir", "fotocopia"],
  ["regla", "escuadra", "transportador", "compas", "geometria"],
  ["cartulina", "cartulinas", "carton", "cartonina", "manualidades", "escolar"],
  ["pegamento", "goma", "silicona", "adhesivo", "pegar"],
  ["tijera", "tijeras", "cutter", "cuchilla", "cortar"],
  ["tempera", "acrilico", "pintura", "oleo", "acuarela", "pincel", "colorear"],
  ["oficina", "papeleria", "utiles", "utilidad", "funcion", "funcionamiento"],
];

const DEFAULT_HINTS = ["tinta", "hojas", "imprimir", "manualidades", "escribir", "archivar"];
const STOP_WORDS = new Set(["de", "del", "la", "el", "y", "para", "con", "por", "en"]);

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const tokenize = (value: string): string[] => normalize(value).split(/[^a-z0-9]+/).filter(Boolean);

const singularize = (token: string): string => {
  if (token.length <= 3) return token;
  if (token.endsWith("es") && token.length > 4) return token.slice(0, -2);
  if (token.endsWith("s") && token.length > 3) return token.slice(0, -1);
  return token;
};

const buildCorrection = (value: string): string => {
  const knownTerms = Array.from(new Set(TERM_GROUPS.flat()));
  const tokens = tokenize(value);
  if (!tokens.length) return "";

  const corrected = tokens.map((token) => {
    const base = singularize(token);
    if (knownTerms.includes(base)) return base;

    let best = base;
    let bestDistance = Infinity;
    for (const known of knownTerms) {
      if (Math.abs(known.length - base.length) > 2) continue;
      let mismatches = 0;
      for (let i = 0; i < Math.min(known.length, base.length); i += 1) {
        if (known[i] !== base[i]) mismatches += 1;
        if (mismatches > 2) break;
      }
      const distance = mismatches + Math.abs(known.length - base.length);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = known;
      }
      if (bestDistance === 0) break;
    }
    return bestDistance <= 2 ? best : base;
  });

  return corrected.join(" ").trim();
};

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
  if (rawTokens.length === 0) return 0;

  const name = normalize(product.name);
  const category = normalize(product.category || "");
  const tags = normalize(product.tags || "");
  const sku = normalize(product.sku || "");
  let score = 0;
  let strictHits = 0;

  rawTokens.forEach((token) => {
    let hit = false;
    if (sku === token) {
      score += 140;
      hit = true;
    } else if (sku.startsWith(token)) {
      score += 95;
      hit = true;
    }

    if (name === token) {
      score += 90;
      hit = true;
    } else if (name.startsWith(token)) {
      score += 75;
      hit = true;
    } else if (name.includes(token)) {
      score += 58;
      hit = true;
    }

    if (category.includes(token)) {
      score += 40;
      hit = true;
    }
    if (tags.includes(token)) {
      score += 45;
      hit = true;
    }
    if (!hit) {
      if (fuzzyIncludes(token, name)) {
        score += 26;
        hit = true;
      } else if (fuzzyIncludes(token, category) || fuzzyIncludes(token, tags)) {
        score += 18;
        hit = true;
      }
    }

    if (hit) strictHits += 1;
  });

  expandedTokens.forEach((token) => {
    if (rawTokens.includes(token)) return;
    if (name.includes(token)) score += 17;
    if (category.includes(token)) score += 15;
    if (tags.includes(token)) score += 19;
  });

  if (strictHits === rawTokens.length && rawTokens.length > 0) score += 45;
  if (strictHits === 0) return 0;
  if (product.stock > 0) score += 3;

  return score;
};

const fuzzyIncludes = (token: string, value: string): boolean => {
  if (!token || !value) return false;
  if (value.includes(token)) return true;

  const words = value.split(/[^a-z0-9]+/).filter(Boolean);
  return words.some((word) => {
    if (Math.abs(word.length - token.length) > 1) return false;
    let mismatches = 0;
    for (let i = 0; i < Math.min(word.length, token.length); i += 1) {
      if (word[i] !== token[i]) mismatches += 1;
      if (mismatches > 1) return false;
    }
    mismatches += Math.abs(word.length - token.length);
    return mismatches <= 1;
  });
};

type ProductSearchView = "dropdown" | "panel";

export const ProductSearch: React.FC<{ priceMap?: Record<number, number>; inputRef?: React.Ref<HTMLInputElement>; view?: ProductSearchView }> = ({
  priceMap,
  inputRef,
  view = "dropdown",
}) => {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [onlyStock, setOnlyStock] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [resultTab, setResultTab] = useState<"all" | "stock" | "suggested">("all");

  const cart = useCartStore();
  const { currency, compactMode } = useSettings();

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search), 280);
    return () => window.clearTimeout(timer);
  }, [search]);

  const normalizedSearch = useMemo(() => normalize(debounced), [debounced]);
  const canSearch = normalizedSearch.length >= 2;
  const correctedSearch = useMemo(() => buildCorrection(normalizedSearch), [normalizedSearch]);

  const categoriesQuery = useQuery({
    queryKey: ["product-categories"],
    queryFn: listProductCategories,
    staleTime: 5 * 60_000,
  });

  const productsQuery = useQuery({
    queryKey: ["products-smart-search", normalizedSearch, categoryFilter, onlyStock],
    queryFn: () => listProducts(normalizedSearch, 250, 0, categoryFilter || undefined, onlyStock, true),
    staleTime: 30_000,
    enabled: canSearch,
  });

  const fallbackQuery = useQuery({
    queryKey: ["products-smart-search-corrected", correctedSearch, categoryFilter, onlyStock],
    queryFn: () => listProducts(correctedSearch, 250, 0, categoryFilter || undefined, onlyStock, true),
    staleTime: 30_000,
    enabled: canSearch && correctedSearch.length >= 2 && correctedSearch !== normalizedSearch,
  });

  const products = productsQuery.data || [];
  const categories = categoriesQuery.data || [];

  const rawTokens = useMemo(
    () => tokenize(normalizedSearch).map(singularize).filter((t) => !STOP_WORDS.has(t)),
    [normalizedSearch]
  );
  const expanded = useMemo(() => expandTokens(rawTokens), [rawTokens]);

  const suggestionTerms = useMemo(() => {
    if (!rawTokens.length) return DEFAULT_HINTS;
    const matchedGroups = TERM_GROUPS.filter((group) => group.some((term) => rawTokens.includes(term)));
    const related = Array.from(new Set(matchedGroups.flat())).filter((term) => !rawTokens.includes(term));
    return related.slice(0, 8);
  }, [rawTokens]);

  const rankedProducts = useMemo(() => {
    if (!canSearch) return [] as Product[];

    const sourceProducts =
      products.length > 0 ? products : fallbackQuery.data && fallbackQuery.data.length > 0 ? fallbackQuery.data : products;

    return sourceProducts
      .map((product) => ({ product, score: scoreProduct(product, rawTokens, expanded) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || b.product.stock - a.product.stock || a.product.name.localeCompare(b.product.name))
      .map((item) => item.product);
  }, [products, fallbackQuery.data, canSearch, rawTokens, expanded]);
  const visibleResults = useMemo(() => rankedProducts.slice(0, 15), [rankedProducts]);
  const panelResults = useMemo(() => {
    const source = rankedProducts.slice(0, 60);
    if (resultTab === "stock") return source.filter((p) => p.stock > 0);
    if (resultTab === "suggested") {
      const tokenSet = new Set(expanded);
      return source.filter((p) => {
        const haystack = normalize(`${p.name} ${p.category || ""} ${p.tags || ""}`);
        return Array.from(tokenSet).some((t) => haystack.includes(t));
      });
    }
    return source;
  }, [rankedProducts, resultTab, expanded]);

  const smartHint = useMemo(() => {
    if (!canSearch || correctedSearch === normalizedSearch) return null;
    if (products.length > 0) return null;
    if (!fallbackQuery.data || fallbackQuery.data.length === 0) return null;
    return correctedSearch;
  }, [canSearch, correctedSearch, normalizedSearch, products.length, fallbackQuery.data]);

  const addProduct = (product: Product) => {
    const price = priceMap?.[product.id] ?? product.price;
    cart.addItem({ product_id: product.id, sku: product.sku, name: product.name, price });
  };

  useEffect(() => {
    setHighlightedIndex(0);
  }, [normalizedSearch, categoryFilter, onlyStock]);

  return (
    <Box>
      <Box sx={{ display: "grid", gap: 1.5, mb: 2 }}>
        <Box sx={{ position: "relative" }}>
          <TextField
            fullWidth
            label="Busqueda inteligente"
            placeholder="Escribe nombre, SKU, utilidad o funcionamiento (ej: tinta, hojas, imprimir)"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
            onBlur={() => window.setTimeout(() => setIsDropdownOpen(false), 120)}
            inputRef={inputRef}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" && visibleResults.length > 0) {
                e.preventDefault();
                setIsDropdownOpen(true);
                setHighlightedIndex((prev) => Math.min(prev + 1, visibleResults.length - 1));
                return;
              }
              if (e.key === "ArrowUp" && visibleResults.length > 0) {
                e.preventDefault();
                setHighlightedIndex((prev) => Math.max(prev - 1, 0));
                return;
              }
              if (e.key === "Escape") {
                setIsDropdownOpen(false);
                return;
              }
              if (e.key === "Enter" && visibleResults.length > 0) {
                e.preventDefault();
                const product = visibleResults[Math.min(highlightedIndex, visibleResults.length - 1)] || visibleResults[0];
                addProduct(product);
                return;
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

          {view === "dropdown" && canSearch && isDropdownOpen ? (
            <Paper
              elevation={8}
              sx={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                right: 0,
                zIndex: 15,
                maxHeight: 420,
                overflowY: "auto",
                borderRadius: 2,
              }}
            >
              {productsQuery.isFetching || fallbackQuery.isFetching ? (
                <Box sx={{ p: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="text.secondary">
                    Buscando productos...
                  </Typography>
                </Box>
              ) : null}

              {!productsQuery.isFetching && !fallbackQuery.isFetching && visibleResults.length === 0 ? (
                <Box sx={{ p: 1.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    Sin coincidencias. Prueba por nombre, SKU o utilidad.
                  </Typography>
                </Box>
              ) : null}

              {!productsQuery.isFetching && !fallbackQuery.isFetching && visibleResults.length > 0 ? (
                <List dense disablePadding>
                  {visibleResults.map((product, index) => {
                    const price = priceMap?.[product.id] ?? product.price;
                    return (
                      <ListItem
                        key={product.id}
                        disablePadding
                        secondaryAction={
                          <Button
                            variant="contained"
                            size="small"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => addProduct(product)}
                          >
                            Agregar
                          </Button>
                        }
                      >
                        <ListItemButton
                          selected={index === highlightedIndex}
                          onMouseEnter={() => setHighlightedIndex(index)}
                          onClick={() => addProduct(product)}
                          sx={{ pr: 12 }}
                        >
                          <ListItemText
                            primary={`${product.sku} - ${product.name}`}
                            secondary={`Categoria: ${product.category || "-"} | Stock: ${product.stock} | ${formatMoney(price)} ${currency}`}
                          />
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </List>
              ) : null}
            </Paper>
          ) : null}
        </Box>

        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center", flexDirection: compactMode ? "column" : "row" }}>
          <TextField
            select
            label="Categoria"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            sx={{ minWidth: 220, width: compactMode ? "100%" : "auto" }}
          >
            <MenuItem value="">Todas</MenuItem>
            {categories.map((category) => (
              <MenuItem key={category} value={category}>
                {category}
              </MenuItem>
            ))}
          </TextField>
          <FormControlLabel control={<Switch checked={onlyStock} onChange={(e) => setOnlyStock(e.target.checked)} />} label="Solo con stock" />
          <Chip label={`Resultados: ${canSearch ? rankedProducts.length : 0}`} color="primary" size="small" />
          {productsQuery.isFetching || fallbackQuery.isFetching ? (
            <Chip icon={<CircularProgress size={12} />} label="Buscando..." size="small" />
          ) : null}
        </Box>

        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>
            Sugerencias:
          </Typography>
          {suggestionTerms.map((term) => (
            <Chip key={term} label={term} size="small" onClick={() => setSearch((prev) => `${prev} ${term}`.trim())} />
          ))}
        </Box>
      </Box>

      {!canSearch ? (
        <Box sx={{ mt: 1, p: 2, border: "1px dashed", borderColor: "divider", borderRadius: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Escribe al menos 2 caracteres para buscar productos. No se mostrara el catalogo completo para evitar listas enormes.
          </Typography>
        </Box>
      ) : null}

      {view === "dropdown" && canSearch && !productsQuery.isFetching && !fallbackQuery.isFetching && rankedProducts.length === 0 ? (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            No se encontraron coincidencias. Prueba por nombre, SKU, categoria o por utilidad (ej. tinta, hojas, imprimir).
          </Typography>
        </Box>
      ) : null}

      {smartHint ? (
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            Quizas quisiste decir:{" "}
            <Button size="small" onClick={() => setSearch(smartHint)}>
              {smartHint}
            </Button>
          </Typography>
        </Box>
      ) : null}

      {view === "panel" ? (
        <Box sx={{ mt: 1 }}>
          <Paper sx={{ bgcolor: "rgba(255,255,255,0.9)", border: "1px solid #d9e2ec" }}>
            <Tabs value={resultTab} onChange={(_, v) => setResultTab(v)} variant="fullWidth">
              <Tab label={`Todos (${rankedProducts.length})`} value="all" />
              <Tab label="Con stock" value="stock" />
              <Tab label="Relacionados" value="suggested" />
            </Tabs>
          </Paper>

          <Paper sx={{ mt: 1, border: "1px solid #d9e2ec", maxHeight: 560, overflowY: "auto" }}>
            {!canSearch ? (
              <Box sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Escribe para buscar y mostrar resultados.
                </Typography>
              </Box>
            ) : null}

            {canSearch && (productsQuery.isFetching || fallbackQuery.isFetching) ? (
              <Box sx={{ p: 2, display: "flex", gap: 1, alignItems: "center" }}>
                <CircularProgress size={18} />
                <Typography variant="body2" color="text.secondary">
                  Buscando productos...
                </Typography>
              </Box>
            ) : null}

            {canSearch && !productsQuery.isFetching && !fallbackQuery.isFetching && panelResults.length === 0 ? (
              <Box sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Sin resultados para los filtros seleccionados.
                </Typography>
              </Box>
            ) : null}

            {canSearch && !productsQuery.isFetching && !fallbackQuery.isFetching ? (
              <List disablePadding>
                {panelResults.map((product) => {
                  const price = priceMap?.[product.id] ?? product.price;
                  return (
                    <ListItem
                      key={product.id}
                      sx={{ borderBottom: "1px solid #e4e7eb", py: 1.2, pr: 1.5 }}
                      secondaryAction={
                        <Button
                          variant="contained"
                          color="success"
                          onClick={() => addProduct(product)}
                          sx={{ minWidth: 44, width: 44, height: 44, borderRadius: "50%", p: 0 }}
                        >
                          <AddIcon />
                        </Button>
                      }
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, width: "100%", pr: 7 }}>
                        <Avatar variant="rounded" sx={{ width: 56, height: 56, bgcolor: "#d9e2ec", color: "#486581", fontWeight: 700 }}>
                          {product.name.slice(0, 1).toUpperCase()}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 700, color: "#102a43" }}>{product.name}</Typography>
                          <Typography variant="caption" sx={{ color: "#486581" }}>
                            SKU: {product.sku} | Cat: {product.category || "-"} | Stock: {product.stock}
                          </Typography>
                        </Box>
                        <Typography sx={{ fontWeight: 800, color: "#243b53", minWidth: 92, textAlign: "right" }}>{formatMoney(price)}</Typography>
                      </Box>
                    </ListItem>
                  );
                })}
              </List>
            ) : null}
          </Paper>
        </Box>
      ) : null}
    </Box>
  );
};
