import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Tab,
  Tabs,
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

const SEARCH_LIMIT = 120;

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

type ProductSearchView = "dropdown" | "panel";
type SearchChipColor = "default" | "primary" | "secondary" | "success" | "info" | "warning" | "error";

type RankedResult = {
  product: Product;
  score: number;
  price: number;
  matchLabel: string;
  matchColor: SearchChipColor;
  stockLabel: string;
  stockColor: SearchChipColor;
  inCartQty: number;
  hasSpecialPrice: boolean;
  isRelated: boolean;
};

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
      for (let index = 0; index < Math.min(known.length, base.length); index += 1) {
        if (known[index] !== base[index]) mismatches += 1;
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

const fuzzyIncludes = (token: string, value: string): boolean => {
  if (!token || !value) return false;
  if (value.includes(token)) return true;

  const words = value.split(/[^a-z0-9]+/).filter(Boolean);
  return words.some((word) => {
    if (Math.abs(word.length - token.length) > 1) return false;
    let mismatches = 0;
    for (let index = 0; index < Math.min(word.length, token.length); index += 1) {
      if (word[index] !== token[index]) mismatches += 1;
      if (mismatches > 1) return false;
    }
    mismatches += Math.abs(word.length - token.length);
    return mismatches <= 1;
  });
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

const getStockMeta = (product: Product): { label: string; color: SearchChipColor } => {
  if (product.stock <= 0) return { label: "Sin stock", color: "error" };
  if (product.stock_min > 0 && product.stock <= product.stock_min) {
    return { label: `Stock bajo ${product.stock}`, color: "warning" };
  }
  return { label: `Stock ${product.stock}`, color: "success" };
};

const getMatchMeta = (product: Product, rawTokens: string[], expandedTokens: string[]): { label: string; color: SearchChipColor; isRelated: boolean } => {
  const name = normalize(product.name || "");
  const category = normalize(product.category || "");
  const tags = normalize(product.tags || "");
  const sku = normalize(product.sku || "");

  if (rawTokens.some((token) => sku === token)) {
    return { label: "SKU exacto", color: "success", isRelated: false };
  }
  if (rawTokens.some((token) => sku.startsWith(token))) {
    return { label: "SKU similar", color: "info", isRelated: false };
  }
  if (rawTokens.length > 0 && rawTokens.every((token) => name.includes(token))) {
    return { label: "Nombre", color: "primary", isRelated: false };
  }
  if (rawTokens.some((token) => category.includes(token) || tags.includes(token))) {
    return { label: "Uso o categoria", color: "warning", isRelated: true };
  }
  if (expandedTokens.some((token) => name.includes(token) || category.includes(token) || tags.includes(token))) {
    return { label: "Relacionado", color: "default", isRelated: true };
  }
  return { label: "Coincidencia", color: "default", isRelated: false };
};

const getAppliedPrice = (product: Product, priceMap?: Record<number, number>) => {
  const baseSalePrice = product.sale_price ?? product.price;
  return priceMap?.[product.id] ?? baseSalePrice;
};

type ProductSearchProps = {
  priceMap?: Record<number, number>;
  inputRef?: React.Ref<HTMLInputElement>;
  view?: ProductSearchView;
  minimal?: boolean;
  splitTabs?: boolean;
};

export const ProductSearch: React.FC<ProductSearchProps> = ({
  priceMap,
  inputRef,
  view = "dropdown",
  minimal = false,
  splitTabs = false,
}) => {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [onlyStock, setOnlyStock] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [resultTab, setResultTab] = useState<"all" | "stock" | "suggested">("all");
  const [panelTab, setPanelTab] = useState<"search" | "results">("search");

  const cart = useCartStore();
  const { currency, compactMode } = useSettings();
  const internalInputRef = useRef<HTMLInputElement | null>(null);
  const usesSplitTabs = minimal && splitTabs && view === "panel";

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search), 260);
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
    queryFn: () => listProducts(normalizedSearch, SEARCH_LIMIT, 0, categoryFilter || undefined, onlyStock, true),
    staleTime: 30_000,
    enabled: canSearch,
  });

  const fallbackQuery = useQuery({
    queryKey: ["products-smart-search-corrected", correctedSearch, categoryFilter, onlyStock],
    queryFn: () => listProducts(correctedSearch, SEARCH_LIMIT, 0, categoryFilter || undefined, onlyStock, true),
    staleTime: 30_000,
    enabled: canSearch && correctedSearch.length >= 2 && correctedSearch !== normalizedSearch,
  });

  const products = productsQuery.data || [];
  const categories = categoriesQuery.data || [];

  const rawTokens = useMemo(
    () => tokenize(normalizedSearch).map(singularize).filter((token) => !STOP_WORDS.has(token)),
    [normalizedSearch]
  );
  const expandedTokens = useMemo(() => expandTokens(rawTokens), [rawTokens]);

  const suggestionTerms = useMemo(() => {
    if (!rawTokens.length) return DEFAULT_HINTS;
    const matchedGroups = TERM_GROUPS.filter((group) => group.some((term) => rawTokens.includes(term)));
    const related = Array.from(new Set(matchedGroups.flat())).filter((term) => !rawTokens.includes(term));
    return related.slice(0, 8);
  }, [rawTokens]);

  const cartQtyById = useMemo(() => {
    const next = new Map<number, number>();
    cart.items.forEach((item) => next.set(item.product_id, item.qty));
    return next;
  }, [cart.items]);

  const rankedResults = useMemo(() => {
    if (!canSearch) return [] as RankedResult[];

    const sourceProducts =
      products.length > 0 ? products : fallbackQuery.data && fallbackQuery.data.length > 0 ? fallbackQuery.data : products;

    return sourceProducts
      .map((product) => {
        const score = scoreProduct(product, rawTokens, expandedTokens);
        if (score <= 0) return null;
        const price = getAppliedPrice(product, priceMap);
        const basePrice = product.sale_price ?? product.price;
        const matchMeta = getMatchMeta(product, rawTokens, expandedTokens);
        const stockMeta = getStockMeta(product);
        return {
          product,
          score,
          price,
          matchLabel: matchMeta.label,
          matchColor: matchMeta.color,
          stockLabel: stockMeta.label,
          stockColor: stockMeta.color,
          inCartQty: cartQtyById.get(product.id) || 0,
          hasSpecialPrice: Math.abs(price - basePrice) > 0.001,
          isRelated: matchMeta.isRelated,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (!a || !b) return 0;
        return b.score - a.score || b.product.stock - a.product.stock || a.product.name.localeCompare(b.product.name);
      }) as RankedResult[];
  }, [products, fallbackQuery.data, canSearch, rawTokens, expandedTokens, priceMap, cartQtyById]);

  const visibleResults = useMemo(() => rankedResults.slice(0, 10), [rankedResults]);
  const topResult = rankedResults[0] || null;
  const stockCount = useMemo(() => rankedResults.filter((entry) => entry.product.stock > 0).length, [rankedResults]);
  const relatedCount = useMemo(() => rankedResults.filter((entry) => entry.isRelated).length, [rankedResults]);
  const panelResults = useMemo(() => {
    const source = rankedResults.slice(0, minimal ? 24 : 60);
    if (minimal) return source;
    if (resultTab === "stock") return source.filter((entry) => entry.product.stock > 0);
    if (resultTab === "suggested") return source.filter((entry) => entry.isRelated);
    return source;
  }, [rankedResults, resultTab, minimal]);

  const smartHint = useMemo(() => {
    if (!canSearch || correctedSearch === normalizedSearch) return null;
    if (products.length > 0) return null;
    if (!fallbackQuery.data || fallbackQuery.data.length === 0) return null;
    return correctedSearch;
  }, [canSearch, correctedSearch, normalizedSearch, products.length, fallbackQuery.data]);

  const searchHelperText = useMemo(() => {
    if (!canSearch) return minimal ? "2 caracteres minimo. Enter agrega la mejor coincidencia." : "Escribe al menos 2 caracteres. Enter agrega la mejor coincidencia.";
    if (productsQuery.isFetching || fallbackQuery.isFetching) return "Buscando productos y priorizando coincidencias.";
    if (visibleResults.length > 0) {
      const highlighted = visibleResults[Math.min(highlightedIndex, visibleResults.length - 1)] || visibleResults[0];
      return `Enter agrega ${highlighted.product.name}. Flechas arriba y abajo cambian la seleccion.`;
    }
    return "Sin coincidencias directas. Prueba por SKU, nombre o uso del producto.";
  }, [canSearch, productsQuery.isFetching, fallbackQuery.isFetching, visibleResults, highlightedIndex, minimal]);

  const handleInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      internalInputRef.current = node;
      if (!inputRef) return;
      if (typeof inputRef === "function") {
        inputRef(node);
        return;
      }
      (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
    },
    [inputRef]
  );

  const refocusSearch = useCallback(() => {
    const node = internalInputRef.current;
    if (!node) return;
    node.focus();
    if (node.value.length > 0) node.select();
  }, []);

  const addProduct = useCallback(
    (product: Product) => {
      const price = getAppliedPrice(product, priceMap);
      cart.addItem({ product_id: product.id, sku: product.sku, name: product.name, price });
      if (view === "dropdown") setIsDropdownOpen(false);
      window.setTimeout(refocusSearch, 0);
    },
    [cart, priceMap, view, refocusSearch]
  );

  const appendSuggestion = (term: string) => {
    setSearch((prev) => `${prev} ${term}`.trim());
    setIsDropdownOpen(true);
    window.setTimeout(refocusSearch, 0);
  };

  const replaceSearch = (value: string) => {
    setSearch(value);
    setIsDropdownOpen(true);
    window.setTimeout(refocusSearch, 0);
  };

  useEffect(() => {
    setHighlightedIndex(0);
  }, [normalizedSearch, categoryFilter, onlyStock]);

  useEffect(() => {
    if (!usesSplitTabs) return;
    if (!canSearch && panelTab !== "search") {
      setPanelTab("search");
    }
  }, [usesSplitTabs, canSearch, panelTab]);

  const renderResultMeta = (entry: RankedResult) => (
    <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", rowGap: 0.75 }}>
      <Chip size="small" label={entry.stockLabel} color={entry.stockColor} />
      <Chip size="small" label={entry.matchLabel} color={entry.matchColor} />
      {entry.inCartQty > 0 ? <Chip size="small" label={`En carrito x${entry.inCartQty}`} color="secondary" /> : null}
      {entry.hasSpecialPrice ? <Chip size="small" label={minimal ? "Especial" : "Precio especial"} color="secondary" variant="outlined" /> : null}
    </Stack>
  );

  const showSearchPanel = !usesSplitTabs || panelTab === "search";
  const showResultsPanel = view === "panel" && (!usesSplitTabs || panelTab === "results");

  return (
    <Box>
      {usesSplitTabs ? (
        <Paper sx={{ mb: 1.25, border: "1px solid #d9e2ec", bgcolor: "#f8fbff" }}>
          <Tabs value={panelTab} onChange={(_, value) => setPanelTab(value)} variant="fullWidth">
            <Tab value="search" label="Buscar" />
            <Tab value="results" label={canSearch ? `Resultados (${panelResults.length})` : "Resultados"} />
          </Tabs>
        </Paper>
      ) : null}

      {showSearchPanel ? (
        <Box sx={{ display: "grid", gap: minimal ? 1.25 : 1.5, mb: usesSplitTabs ? 0 : 2 }}>
          <Box sx={{ position: "relative" }}>
            <TextField
              fullWidth
              label={minimal ? "Buscar producto" : "Busqueda inteligente"}
              placeholder={minimal ? "SKU, nombre o uso" : "Escribe nombre, SKU o uso del producto (ej: tinta, hojas, imprimir)"}
              helperText={searchHelperText}
              autoComplete="off"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              onBlur={() => window.setTimeout(() => setIsDropdownOpen(false), 120)}
              inputRef={handleInputRef}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" && visibleResults.length > 0) {
                  event.preventDefault();
                  setIsDropdownOpen(true);
                  setHighlightedIndex((prev) => Math.min(prev + 1, visibleResults.length - 1));
                  return;
                }
                if (event.key === "ArrowUp" && visibleResults.length > 0) {
                  event.preventDefault();
                  setHighlightedIndex((prev) => Math.max(prev - 1, 0));
                  return;
                }
                if (event.key === "Escape") {
                  setIsDropdownOpen(false);
                  return;
                }
                if (event.key === "Enter" && visibleResults.length > 0) {
                  event.preventDefault();
                  const entry = visibleResults[Math.min(highlightedIndex, visibleResults.length - 1)] || visibleResults[0];
                  addProduct(entry.product);
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
                  maxHeight: 460,
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
                    {visibleResults.map((entry, index) => (
                      <ListItem
                        key={entry.product.id}
                        disablePadding
                        secondaryAction={
                          <Button
                            variant="contained"
                            size="small"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => addProduct(entry.product)}
                          >
                            Agregar
                          </Button>
                        }
                      >
                        <ListItemButton
                          selected={index === highlightedIndex}
                          onMouseEnter={() => setHighlightedIndex(index)}
                          onClick={() => addProduct(entry.product)}
                          sx={{ pr: 12, py: minimal ? 1 : 1.25 }}
                        >
                          <Box sx={{ display: "grid", gap: 0.75, width: "100%" }}>
                            <Stack direction="row" spacing={1.5} justifyContent="space-between" alignItems="flex-start">
                              <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 800 }} noWrap>
                                  {entry.product.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {entry.product.sku || "Sin SKU"} | {entry.product.category || "Sin categoria"}
                                </Typography>
                              </Box>
                              <Typography sx={{ fontWeight: 900, whiteSpace: "nowrap" }}>{formatMoney(entry.price)}</Typography>
                            </Stack>
                            {renderResultMeta(entry)}
                          </Box>
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                ) : null}
              </Paper>
            ) : null}
          </Box>

          <Stack direction={{ xs: "column", md: compactMode ? "column" : "row" }} spacing={1.5} alignItems={{ md: "center" }}>
            <TextField
              select
              label="Categoria"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              size={minimal ? "small" : "medium"}
              sx={{ minWidth: minimal ? 180 : 220, width: compactMode ? "100%" : "auto" }}
            >
              <MenuItem value="">Todas</MenuItem>
              {categories.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </TextField>
            <FormControlLabel control={<Switch checked={onlyStock} onChange={(event) => setOnlyStock(event.target.checked)} />} label="Solo con stock" />
            {!minimal ? (
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                <Chip label={`Resultados ${canSearch ? rankedResults.length : 0}`} color="primary" size="small" />
                <Chip label={`Disponibles ${canSearch ? stockCount : 0}`} size="small" />
                <Chip label={`Relacionados ${canSearch ? relatedCount : 0}`} size="small" />
                {productsQuery.isFetching || fallbackQuery.isFetching ? (
                  <Chip icon={<CircularProgress size={12} />} label="Buscando..." size="small" />
                ) : null}
              </Stack>
            ) : canSearch ? (
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                <Chip label={`${rankedResults.length} resultados`} color="primary" size="small" />
                {usesSplitTabs ? (
                  <Button size="small" variant="text" onClick={() => setPanelTab("results")}>
                    Ver lista
                  </Button>
                ) : null}
              </Stack>
            ) : null}
          </Stack>

          {!minimal ? (
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>
                Sugerencias:
              </Typography>
              {suggestionTerms.map((term) => (
                <Chip key={term} label={term} size="small" onClick={() => appendSuggestion(term)} />
              ))}
            </Box>
          ) : null}

          {!canSearch ? (
            <Box sx={{ p: 2, border: "1px dashed", borderColor: "divider", borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Escribe al menos 2 caracteres para buscar productos. No se mostrara el catalogo completo para evitar listas enormes.
              </Typography>
            </Box>
          ) : null}
        </Box>
      ) : null}

      {view === "dropdown" && canSearch && !productsQuery.isFetching && !fallbackQuery.isFetching && rankedResults.length === 0 ? (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            No se encontraron coincidencias. Prueba por nombre, SKU, categoria o por utilidad, por ejemplo: tinta, hojas o imprimir.
          </Typography>
        </Box>
      ) : null}

      {smartHint ? (
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            Quizas quisiste decir:{" "}
            <Button size="small" onClick={() => replaceSearch(smartHint)}>
              {smartHint}
            </Button>
          </Typography>
        </Box>
      ) : null}

      {showResultsPanel ? (
        <Box sx={{ mt: 1 }}>
          {usesSplitTabs ? (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ sm: "center" }} sx={{ mb: 1 }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                {canSearch ? `Busqueda actual: ${search.trim() || normalizedSearch}` : "Ve a la pestana Buscar para iniciar una busqueda."}
              </Typography>
              {canSearch ? (
                <Button size="small" variant="text" onClick={() => setPanelTab("search")}>
                  Editar busqueda
                </Button>
              ) : null}
            </Stack>
          ) : null}

          {topResult && !minimal ? (
            <Paper
              sx={{
                p: 2,
                mb: 1.25,
                background: "linear-gradient(155deg, rgba(18,53,90,0.06) 0%, rgba(18,53,90,0.02) 52%, rgba(154,123,47,0.08) 100%)",
                border: "1px solid rgba(18,53,90,0.1)",
              }}
            >
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ md: "center" }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: 1 }}>
                    Mejor coincidencia
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800 }} noWrap>
                    {topResult.product.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {topResult.product.sku || "Sin SKU"} | {topResult.product.category || "Sin categoria"}
                  </Typography>
                  {renderResultMeta(topResult)}
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                    Enter agrega este producto inmediatamente. Precio aplicado: {formatMoney(topResult.price)} {currency}.
                  </Typography>
                </Box>
                <Stack direction={{ xs: "row", md: "column" }} spacing={1} alignItems={{ md: "flex-end" }}>
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>
                    {formatMoney(topResult.price)}
                  </Typography>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => addProduct(topResult.product)}>
                    Agregar
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          ) : null}

          {!minimal ? (
            <Paper sx={{ bgcolor: "rgba(255,255,255,0.9)", border: "1px solid #d9e2ec" }}>
              <Tabs value={resultTab} onChange={(_, value) => setResultTab(value)} variant="fullWidth">
                <Tab label={`Todos (${rankedResults.length})`} value="all" />
                <Tab label={`Con stock (${stockCount})`} value="stock" />
                <Tab label={`Relacionados (${relatedCount})`} value="suggested" />
              </Tabs>
            </Paper>
          ) : null}

          <Paper sx={{ mt: 1, border: "1px solid #d9e2ec", maxHeight: 560, overflowY: "auto" }}>
            {!canSearch ? (
              <Box sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {usesSplitTabs ? "Ve a la pestana Buscar para escribir la consulta." : "Escribe para buscar y mostrar resultados."}
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
                {panelResults.map((entry) => (
                  <ListItem
                    key={entry.product.id}
                    sx={{ borderBottom: "1px solid #e4e7eb", py: minimal ? 1 : 1.25, px: minimal ? 1.25 : 1.5 }}
                    secondaryAction={
                      <Button variant="contained" startIcon={<AddIcon />} onClick={() => addProduct(entry.product)}>
                        Agregar
                      </Button>
                    }
                  >
                    <Box sx={{ display: "grid", gap: 0.8, width: "100%", pr: 14 }}>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ sm: "flex-start" }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 800, color: "#102a43" }}>{entry.product.name}</Typography>
                          <Typography variant="caption" sx={{ color: "#486581" }}>
                            {entry.product.sku || "Sin SKU"} | {entry.product.category || "Sin categoria"}
                          </Typography>
                        </Box>
                        <Typography sx={{ fontWeight: 900, color: "#243b53", whiteSpace: "nowrap" }}>{formatMoney(entry.price)}</Typography>
                      </Stack>
                      {renderResultMeta(entry)}
                    </Box>
                  </ListItem>
                ))}
              </List>
            ) : null}
          </Paper>
        </Box>
      ) : null}
    </Box>
  );
};