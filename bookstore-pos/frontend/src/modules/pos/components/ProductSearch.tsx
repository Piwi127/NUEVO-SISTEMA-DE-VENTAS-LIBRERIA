import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
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
  ["libro", "libros", "novela", "novelas", "cuento", "cuentos", "texto", "diccionario", "agenda"],
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
  const author = normalize(product.author || "");
  const publisher = normalize(product.publisher || "");
  const isbn = normalize(product.isbn || "");
  const barcode = normalize(product.barcode || "");
  const shelfLocation = normalize(product.shelf_location || "");
  let score = 0;
  let strictHits = 0;

  rawTokens.forEach((token) => {
    let hit = false;
    if (isbn === token || barcode === token) {
      score += 170;
      hit = true;
    } else if (isbn.startsWith(token) || barcode.startsWith(token)) {
      score += 130;
      hit = true;
    }

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

    if (author.includes(token)) {
      score += 54;
      hit = true;
    }
    if (publisher.includes(token)) {
      score += 36;
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
    if (shelfLocation.includes(token)) {
      score += 20;
      hit = true;
    }
    if (!hit) {
      if (fuzzyIncludes(token, name) || fuzzyIncludes(token, author)) {
        score += 26;
        hit = true;
      } else if (fuzzyIncludes(token, category) || fuzzyIncludes(token, tags) || fuzzyIncludes(token, publisher)) {
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
    if (author.includes(token)) score += 18;
    if (publisher.includes(token)) score += 14;
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
  const author = normalize(product.author || "");
  const publisher = normalize(product.publisher || "");
  const isbn = normalize(product.isbn || "");
  const barcode = normalize(product.barcode || "");
  const shelfLocation = normalize(product.shelf_location || "");

  if (rawTokens.some((token) => isbn === token || barcode === token)) {
    return { label: "ISBN exacto", color: "success", isRelated: false };
  }
  if (rawTokens.some((token) => isbn.startsWith(token) || barcode.startsWith(token))) {
    return { label: "ISBN / Cod. Barras", color: "info", isRelated: false };
  }
  if (rawTokens.some((token) => sku === token)) {
    return { label: "SKU exacto", color: "success", isRelated: false };
  }
  if (rawTokens.some((token) => sku.startsWith(token))) {
    return { label: "SKU aproximado", color: "info", isRelated: false };
  }
  if (rawTokens.length > 0 && rawTokens.every((token) => name.includes(token))) {
    return { label: "Coincidencia Nombre", color: "primary", isRelated: false };
  }
  if (rawTokens.some((token) => author.includes(token) || publisher.includes(token))) {
    return { label: "Autor / Editorial", color: "secondary", isRelated: false };
  }
  if (rawTokens.some((token) => category.includes(token) || tags.includes(token) || shelfLocation.includes(token))) {
    return { label: "Categoría", color: "warning", isRelated: true };
  }
  if (expandedTokens.some((token) => name.includes(token) || category.includes(token) || tags.includes(token) || author.includes(token) || publisher.includes(token))) {
    return { label: "Semántico", color: "default", isRelated: true };
  }
  return { label: "Aproximación", color: "default", isRelated: false };
};

const getAppliedPrice = (product: Product, priceMap?: Record<number, number>) => {
  const baseSalePrice = product.sale_price ?? product.price;
  return priceMap?.[product.id] ?? baseSalePrice;
};

const buildProductMetaLine = (product: Product): string =>
  [
    product.sku ? `SKU: ${product.sku}` : "",
    product.author || product.publisher || product.category || "",
    product.isbn || product.barcode || "",
  ]
    .filter(Boolean)
    .join(" • ");

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
  const { compactMode } = useSettings();
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
    if (!canSearch) return minimal ? "Mín. 2 caracteres." : "Ingresa 2 caracteres o más. Presiona [Enter] para agregar el producto seleccionado al carrito.";
    if (productsQuery.isFetching || fallbackQuery.isFetching) return "Sincronizando con la base de datos de productos...";
    if (visibleResults.length > 0) {
      const highlighted = visibleResults[Math.min(highlightedIndex, visibleResults.length - 1)] || visibleResults[0];
      return `[Enter] para ingresar: ${highlighted.product.name}. Usa [↓] [↑] para cambiar la selección.`;
    }
    return "No existen coincidencias. Intenta buscando por atributos secundarios como el Editor u Origen.";
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
    <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", rowGap: 0.75, mt: 0.5 }}>
      <Chip size="small" label={entry.stockLabel} color={entry.stockColor} variant="outlined" sx={{ height: 20, fontSize: "0.7rem", fontWeight: 700 }} />
      <Chip size="small" label={entry.matchLabel} color={entry.matchColor} variant="outlined" sx={{ height: 20, fontSize: "0.7rem" }} />
      {entry.inCartQty > 0 ? <Chip size="small" label={`En cola: ${entry.inCartQty}`} color="secondary" sx={{ height: 20, fontSize: "0.7rem", fontWeight: 700 }} /> : null}
      {entry.hasSpecialPrice ? <Chip size="small" label="Rebaja Automática" color="secondary" variant="filled" sx={{ height: 20, fontSize: "0.7rem", fontWeight: 700 }} /> : null}
    </Stack>
  );

  const showSearchPanel = !usesSplitTabs || panelTab === "search";
  const showResultsPanel = view === "panel" && (!usesSplitTabs || panelTab === "results");

  return (
    <Box>
      {usesSplitTabs ? (
        <Paper className="glass-panel" sx={{ mb: 1.25, pb: 0 }}>
          <Tabs value={panelTab} onChange={(_, value) => setPanelTab(value)} variant="fullWidth" indicatorColor="primary" textColor="primary" sx={{ minHeight: 48, '& .MuiTab-root': { py: 1, minHeight: 48, fontWeight: 700 } }}>
            <Tab value="search" label="Motor de Búsqueda" />
            <Tab value="results" label={canSearch ? `Catálogo (${panelResults.length})` : "Catálogo y Resultados"} />
          </Tabs>
        </Paper>
      ) : null}

      {showSearchPanel ? (
        <Box sx={{ display: "grid", gap: 2, mb: usesSplitTabs ? 0 : 2 }}>
          <Box sx={{ position: "relative" }}>
            <TextField
              fullWidth
              variant="outlined"
              label={minimal ? "Añadir Item" : "Buscador Predictivo POS"}
              placeholder="Ej. 'libro calculo', '10931294', 'papel A4'"
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
                    <SearchIcon color="primary" sx={{ fontSize: 26 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  bgcolor: "rgba(255,255,255,0.8)",
                  backdropFilter: "blur(8px)",
                  borderRadius: 3,
                  fontWeight: 700,
                  fontSize: "1.1rem"
                }
              }}
            />

            {view === "dropdown" && canSearch && isDropdownOpen ? (
              <Paper
                className="glass-panel"
                sx={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  left: 0,
                  right: 0,
                  zIndex: 15,
                  maxHeight: 500,
                  overflowY: "auto",
                  borderRadius: 3,
                  boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
                }}
              >
                {productsQuery.isFetching || fallbackQuery.isFetching ? (
                  <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1.5, justifyContent: "center" }}>
                    <CircularProgress size={20} />
                    <Typography variant="body2" color="primary" fontWeight="700">
                      Evaluando matches en el inventario local...
                    </Typography>
                  </Box>
                ) : null}

                {!productsQuery.isFetching && !fallbackQuery.isFetching && visibleResults.length === 0 ? (
                  <Box sx={{ p: 3, textAlign: "center" }}>
                    <SearchIcon sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
                    <Typography variant="body2" color="text.secondary" fontWeight="600">
                      Sin coincidencias para los criterios proveídos. Reformule la consulta.
                    </Typography>
                  </Box>
                ) : null}

                {!productsQuery.isFetching && !fallbackQuery.isFetching && visibleResults.length > 0 ? (
                  <List disablePadding>
                    {visibleResults.map((entry, index) => (
                      <ListItem
                        key={entry.product.id}
                        disablePadding
                        secondaryAction={
                          <Button
                            variant="contained"
                            color="primary"
                            size="small"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => addProduct(entry.product)}
                            sx={{ display: { xs: "none", sm: "inline-flex" }, borderRadius: 2, fontWeight: 700 }}
                          >
                            + Add
                          </Button>
                        }
                      >
                        <ListItemButton
                          selected={index === highlightedIndex}
                          onMouseEnter={() => setHighlightedIndex(index)}
                          onClick={() => addProduct(entry.product)}
                          sx={{
                            pr: { xs: 2, sm: 12 },
                            py: 1.5,
                            borderBottom: index < visibleResults.length - 1 ? "1px dashed var(--border-subtle)" : "none",
                            "&.Mui-selected": { bgcolor: "primary.lighter" },
                            "&.Mui-selected:hover": { bgcolor: "primary.lighter" }
                          }}
                        >
                          <Box sx={{ display: "grid", gap: 0.5, width: "100%" }}>
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "flex-start" }}>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 800, fontSize: "1rem" }} noWrap>
                                  {entry.product.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                  {buildProductMetaLine(entry.product)}
                                </Typography>
                              </Box>
                              <Typography sx={{ fontWeight: 900, whiteSpace: "nowrap", color: "primary.main", fontSize: "1.1rem" }}>{formatMoney(entry.price)}</Typography>
                            </Stack>
                            {renderResultMeta(entry)}
                            <Button
                              variant="contained"
                              size="small"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => addProduct(entry.product)}
                              sx={{ display: { xs: "inline-flex", sm: "none" }, width: "100%", mt: 1 }}
                            >
                              Agregar
                            </Button>
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
              label="Filtro de Categoría"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              size={minimal ? "small" : "medium"}
              sx={{ width: { xs: "100%", md: compactMode ? "100%" : "auto" }, maxWidth: { md: minimal ? 200 : 240 }, minWidth: 0 }}
            >
              <MenuItem value="">Sin Filtro (Todas)</MenuItem>
              {categories.map((category) => (
                <MenuItem key={category} value={category}>{category}</MenuItem>
              ))}
            </TextField>
            <FormControlLabel
              control={<Switch checked={onlyStock} onChange={(event) => setOnlyStock(event.target.checked)} color="primary" />}
              label={<Typography variant="body2" fontWeight="600">Solo ítems con balance actual</Typography>}
            />

            {!minimal ? (
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", ml: { md: "auto !important" } }}>
                <Chip label={`Top ${canSearch ? rankedResults.length : 0}`} color="primary" size="small" variant="outlined" />
                <Chip label={`En Almacen ${canSearch ? stockCount : 0}`} size="small" variant="outlined" />
                {productsQuery.isFetching || fallbackQuery.isFetching ? (
                  <Chip icon={<CircularProgress size={12} />} label="Buscando..." size="small" />
                ) : null}
              </Stack>
            ) : canSearch ? (
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                <Chip label={`${rankedResults.length} Encontrados`} color="primary" size="small" variant="outlined" />
                {usesSplitTabs ? (
                  <Button size="small" variant="outlined" onClick={() => setPanelTab("results")} sx={{ borderRadius: 4, px: 2, height: 24, fontSize: "0.75rem" }}>
                    Desplegar Catalogo
                  </Button>
                ) : null}
              </Stack>
            ) : null}
          </Stack>

          {!minimal ? (
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: -0.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center", fontWeight: 700 }}>
                Etiquetas sugeridas:
              </Typography>
              {suggestionTerms.map((term) => (
                <Chip key={term} label={term} size="small" onClick={() => appendSuggestion(term)} sx={{ fontWeight: 600, "&:hover": { bgcolor: "primary.light", color: "white" } }} />
              ))}
            </Box>
          ) : null}

          {!canSearch ? (
            <Box sx={{ p: 3, border: "2px dashed var(--border-subtle)", borderRadius: 3, textAlign: "center", bgcolor: "rgba(255,255,255,0.4)" }}>
              <SearchIcon sx={{ fontSize: 32, color: "text.disabled", mb: 0.5 }} />
              <Typography variant="body2" color="text.secondary" fontWeight="600">
                El motor de búsqueda está en modo Standby.
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Ingresa datos arriba para activar el panel predictivo en tiempo real.
              </Typography>
            </Box>
          ) : null}
        </Box>
      ) : null}

      {view === "dropdown" && canSearch && !productsQuery.isFetching && !fallbackQuery.isFetching && rankedResults.length === 0 ? (
        <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: "rgba(244, 63, 94, 0.1)", border: "1px solid rgba(244, 63, 94, 0.2)" }}>
          <Typography variant="body2" color="error.main" fontWeight="600">
            La búsqueda no ha retornado ningún artículo activo.
          </Typography>
        </Box>
      ) : null}

      {smartHint ? (
        <Alert severity="info" variant="outlined" sx={{ mt: 1.5, py: 0, alignItems: "center", borderRadius: 2 }}>
          La consulta generó poca tracción. Quizás estás buscando:{" "}
          <Button size="small" variant="text" sx={{ fontWeight: 800, textTransform: "none" }} onClick={() => replaceSearch(smartHint)}>
            {smartHint}
          </Button>
        </Alert>
      ) : null}

      {showResultsPanel ? (
        <Box sx={{ mt: 2 }}>
          {usesSplitTabs ? (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ sm: "center" }} sx={{ mb: 1.5 }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                {canSearch ? `Insights actuales para: ${search.trim() || normalizedSearch}` : "Panel de exploración desconectado (No hay input)."}
              </Typography>
              {canSearch ? (
                <Button size="small" variant="outlined" onClick={() => setPanelTab("search")} sx={{ borderRadius: 3 }}>
                  Modificar Parámetros
                </Button>
              ) : null}
            </Stack>
          ) : null}

          {topResult && !minimal ? (
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                mb: 2,
                borderRadius: 3,
                background: "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
              }}
            >
              <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "center" }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="overline" sx={{ color: "success.main", letterSpacing: 1.5, fontWeight: 800, display: "flex", alignItems: "center", gap: 0.5 }}>
                    ⚡ GOLDEN MATCH
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5, mb: 0.25, color: "#064e3b" }} noWrap>
                    {topResult.product.name}
                  </Typography>
                  <Typography variant="body2" color="#059669" sx={{ mb: 1, fontWeight: 600 }}>
                    {buildProductMetaLine(topResult.product)}
                  </Typography>
                  {renderResultMeta(topResult)}
                  <Typography variant="caption" sx={{ display: "block", mt: 1.5, color: "#047857", fontWeight: 600 }}>
                    * Presionar ENTER sobre la barra principal añadirá inmediatamente este registro.
                  </Typography>
                </Box>
                <Stack direction={{ xs: "row", md: "column" }} spacing={1.5} alignItems={{ md: "flex-end" }}>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: "success.main", lineHeight: 1 }}>
                    {formatMoney(topResult.price)}
                  </Typography>
                  <Button variant="contained" color="success" startIcon={<AddIcon />} onClick={() => addProduct(topResult.product)} sx={{ width: { xs: "100%", md: "auto" }, fontWeight: 800, borderRadius: 2 }}>
                    AÑADIR A ORDEN
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          ) : null}

          {!minimal ? (
            <Paper className="glass-panel" sx={{ mb: 1, p: 0.5 }}>
              <Tabs value={resultTab} onChange={(_, value) => setResultTab(value)} variant="standard" textColor="primary" indicatorColor="primary">
                <Tab label={`Listado Universal (${rankedResults.length})`} value="all" sx={{ fontWeight: 700 }} />
                <Tab label={`Stock Optimizado (${stockCount})`} value="stock" sx={{ fontWeight: 700 }} />
                <Tab label={`Semántica & Relacionados (${relatedCount})`} value="suggested" sx={{ fontWeight: 700 }} />
              </Tabs>
            </Paper>
          ) : null}

          <Paper className="glass-panel" sx={{ border: "1px solid var(--border-subtle)", borderRadius: 3, maxHeight: 560, overflowY: "auto" }}>
            {!canSearch ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary" fontWeight="600">
                  {usesSplitTabs ? "Navega hacia 'Motor de Búsqueda' para establecer las condiciones del algoritmo." : "Ingresa requerimientos en la barra principal."}
                </Typography>
              </Box>
            ) : null}

            {canSearch && (productsQuery.isFetching || fallbackQuery.isFetching) ? (
              <Box sx={{ p: 4, display: "flex", flexDirection: "column", gap: 2, alignItems: "center", justifyContent: "center" }}>
                <CircularProgress size={32} thickness={5} />
                <Typography variant="body2" color="primary" fontWeight="700">
                  Compilando resultados dinámicos...
                </Typography>
              </Box>
            ) : null}

            {canSearch && !productsQuery.isFetching && !fallbackQuery.isFetching && panelResults.length === 0 ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary" fontWeight="700">
                  Cero artículos pasaron el corte de la colección.
                </Typography>
              </Box>
            ) : null}

            {canSearch && !productsQuery.isFetching && !fallbackQuery.isFetching ? (
              <List disablePadding>
                {panelResults.map((entry, index) => (
                  <ListItem
                    key={entry.product.id}
                    sx={{
                      borderBottom: index < panelResults.length - 1 ? "1px dashed var(--border-subtle)" : "none",
                      py: minimal ? 1.5 : 2,
                      px: minimal ? 2 : 3,
                      transition: "background-color 0.2s",
                      "&:hover": { bgcolor: "rgba(0,0,0,0.02)" }
                    }}
                    secondaryAction={
                      <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => addProduct(entry.product)} sx={{ display: { xs: "none", sm: "inline-flex" }, borderRadius: 2, fontWeight: 700 }}>
                        Mover a Caja
                      </Button>
                    }
                  >
                    <Box sx={{ display: "grid", gap: 1, width: "100%", pr: { xs: 0, sm: 16 } }}>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "flex-start" }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 800, fontSize: "1.05rem" }}>{entry.product.name}</Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                            {buildProductMetaLine(entry.product)}
                          </Typography>
                        </Box>
                        <Typography sx={{ fontWeight: 900, color: "primary.main", whiteSpace: "nowrap", fontSize: "1.1rem" }}>{formatMoney(entry.price)}</Typography>
                      </Stack>
                      {renderResultMeta(entry)}
                      <Button variant="outlined" startIcon={<AddIcon />} onClick={() => addProduct(entry.product)} sx={{ display: { xs: "inline-flex", sm: "none" }, width: "100%", mt: 1 }}>
                        Agregar
                      </Button>
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
