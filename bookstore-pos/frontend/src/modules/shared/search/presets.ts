import { Customer, Product, SaleListResponse, Supplier, User } from "@/modules/shared/types";
import { RankedSearchItem, runSmartSearch, SmartSearchOptions } from "@/utils/search";

export type SearchChipColor = "default" | "primary" | "secondary" | "success" | "info" | "warning" | "error";

const PRODUCT_TERM_GROUPS = [
  ["cuaderno", "cuadernos", "hoja", "hojas", "libreta", "notebook", "rayado", "cuadriculado", "apuntes"],
  ["lapiz", "lapices", "portaminas", "grafito", "hb", "dibujar"],
  ["lapicero", "lapiceros", "boligrafo", "boligrafos", "pluma", "tinta", "escribir"],
  ["borrador", "borradores", "goma", "corrector", "corregir"],
  ["resaltador", "resaltadores", "marcador", "marcadores", "fluorescente", "subrayar"],
  ["plumon", "plumones", "color", "colores", "marker", "markers", "punta", "delgado"],
  ["folder", "carpeta", "archivador", "funda", "micas", "archivar"],
  ["papel", "papeles", "resma", "a4", "oficio", "bond", "imprimir", "fotocopia"],
  ["regla", "escuadra", "transportador", "compas", "geometria"],
  ["cartulina", "cartulinas", "carton", "cartonina", "manualidades", "escolar"],
  ["pegamento", "goma", "silicona", "adhesivo", "pegar"],
  ["tijera", "tijeras", "cutter", "cuchilla", "cortar"],
  ["tempera", "acrilico", "pintura", "oleo", "acuarela", "pincel", "colorear"],
  ["oficina", "papeleria", "utiles", "utilidad", "funcion", "funcionamiento"],
  ["libro", "libros", "novela", "novelas", "cuento", "cuentos", "texto", "diccionario", "agenda"],
] as const;

const PRODUCT_HINTS = ["tinta", "hojas", "imprimir", "manualidades", "escribir", "archivar"];
const PRODUCT_STOP_WORDS = new Set(["con", "de", "del", "el", "en", "la", "para", "por", "y"]);

const productSearchOptions: SmartSearchOptions<Product> = {
  fields: [
    { key: "sku", weight: 95, type: "code", getValue: (product) => product.sku },
    { key: "name", weight: 90, getValue: (product) => product.name },
    { key: "author", weight: 60, getValue: (product) => product.author || "" },
    { key: "publisher", weight: 46, getValue: (product) => product.publisher || "" },
    { key: "isbn", weight: 108, type: "code", getValue: (product) => product.isbn || "" },
    { key: "barcode", weight: 105, type: "code", getValue: (product) => product.barcode || "" },
    { key: "shelf_location", weight: 28, type: "code", getValue: (product) => product.shelf_location || "" },
    { key: "category", weight: 42, getValue: (product) => product.category || "" },
    { key: "tags", weight: 48, getValue: (product) => product.tags || "" },
  ],
  synonymGroups: PRODUCT_TERM_GROUPS,
  stopWords: PRODUCT_STOP_WORDS,
  hints: PRODUCT_HINTS,
  minTokenLength: 2,
  allowRelatedMatches: true,
  boost: (product) => (product.stock > 0 ? 4 : 0),
  sortComparator: (left, right) => right.item.stock - left.item.stock || left.item.name.localeCompare(right.item.name),
};

const customerSearchOptions: SmartSearchOptions<Customer> = {
  fields: [
    { key: "name", weight: 95, getValue: (customer) => customer.name },
    { key: "tax_id", weight: 110, type: "code", getValue: (customer) => customer.tax_id || "" },
    { key: "phone", weight: 100, type: "code", getValue: (customer) => customer.phone || "" },
    { key: "email", weight: 56, getValue: (customer) => customer.email || "" },
    { key: "address", weight: 32, getValue: (customer) => customer.address || "" },
  ],
  synonymGroups: [
    ["cliente", "customer", "comprador"],
    ["telefono", "celular", "movil", "phone"],
    ["ruc", "dni", "documento", "tax"],
  ],
  hints: ["telefono", "ruc", "correo"],
  minTokenLength: 2,
  sortComparator: (left, right) => left.item.name.localeCompare(right.item.name),
};

const supplierSearchOptions: SmartSearchOptions<Supplier> = {
  fields: [
    { key: "name", weight: 100, getValue: (supplier) => supplier.name },
    { key: "phone", weight: 92, type: "code", getValue: (supplier) => supplier.phone || "" },
  ],
  synonymGroups: [
    ["proveedor", "supplier", "distribuidor", "mayorista"],
    ["telefono", "celular", "movil", "phone"],
  ],
  hints: ["telefono", "distribuidor", "mayorista"],
  minTokenLength: 2,
  sortComparator: (left, right) => left.item.name.localeCompare(right.item.name),
};

const userSearchOptions: SmartSearchOptions<User> = {
  fields: [
    { key: "username", weight: 100, getValue: (user) => user.username },
    { key: "role", weight: 48, getValue: (user) => user.role },
    { key: "status", weight: 34, getValue: (user) => (user.is_active ? "activo habilitado" : "inactivo deshabilitado") },
    { key: "security", weight: 22, getValue: (user) => (user.twofa_enabled ? "2fa activo" : "sin 2fa") },
  ],
  synonymGroups: [
    ["admin", "administrador"],
    ["cashier", "cajero", "caja", "ventas"],
    ["stock", "almacen", "inventario"],
    ["activo", "habilitado", "enabled"],
    ["inactivo", "deshabilitado", "disabled"],
  ],
  hints: ["cajero", "admin", "activo"],
  minTokenLength: 2,
  sortComparator: (left, right) => left.item.username.localeCompare(right.item.username),
};

const salesSearchOptions: SmartSearchOptions<SaleListResponse> = {
  fields: [
    { key: "invoice_number", weight: 112, type: "code", getValue: (sale) => sale.invoice_number || "" },
    { key: "sale_id", weight: 100, type: "code", getValue: (sale) => sale.id },
    { key: "customer_name", weight: 82, getValue: (sale) => sale.customer_name || "" },
    { key: "customer_tax_id", weight: 108, type: "code", getValue: (sale) => sale.customer_tax_id || "" },
    { key: "customer_phone", weight: 96, type: "code", getValue: (sale) => sale.customer_phone || "" },
    { key: "user_name", weight: 58, getValue: (sale) => sale.user_name || "" },
    { key: "status", weight: 40, getValue: (sale) => sale.status || "" },
    { key: "document_type", weight: 36, getValue: (sale) => sale.document_type || "" },
  ],
  synonymGroups: [
    ["paid", "pagado", "cobrado"],
    ["void", "anulado", "cancelado"],
    ["ticket", "comprobante"],
    ["boleta", "boleto"],
    ["factura", "invoice"],
  ],
  hints: ["ticket", "cliente", "cajero", "factura"],
  minTokenLength: 2,
  sortComparator: (left, right) => {
    const dateDelta = new Date(right.item.created_at).getTime() - new Date(left.item.created_at).getTime();
    if (dateDelta !== 0) return dateDelta;
    return right.item.id - left.item.id;
  },
};

export const searchProducts = (products: Product[], query: string) => runSmartSearch(products, query, productSearchOptions);

export const searchCustomers = (customers: Customer[], query: string) => runSmartSearch(customers, query, customerSearchOptions);

export const searchSuppliers = (suppliers: Supplier[], query: string) => runSmartSearch(suppliers, query, supplierSearchOptions);

export const searchUsers = (users: User[], query: string) => runSmartSearch(users, query, userSearchOptions);

export const searchSalesHistoryRows = (rows: SaleListResponse[], query: string) => runSmartSearch(rows, query, salesSearchOptions);

export const getProductSearchMatchMeta = (
  entry: RankedSearchItem<Product>
): { label: string; color: SearchChipColor; isRelated: boolean } => {
  const field = entry.primaryMatch?.field;
  const kind = entry.primaryMatch?.kind;

  if (entry.isRelated || kind === "related") {
    if (field === "category" || field === "tags" || field === "shelf_location") {
      return { label: "Categoria", color: "warning", isRelated: true };
    }
    return { label: "Relacionado", color: "default", isRelated: true };
  }

  if (field === "isbn" || field === "barcode") {
    return {
      label: kind === "exact" || kind === "phrase" ? "ISBN exacto" : "ISBN / Cod. Barras",
      color: kind === "contains" ? "info" : "success",
      isRelated: false,
    };
  }

  if (field === "sku") {
    return {
      label: kind === "exact" || kind === "phrase" ? "SKU exacto" : "SKU aproximado",
      color: kind === "contains" ? "info" : "success",
      isRelated: false,
    };
  }

  if (field === "name") {
    if (kind === "fuzzy") return { label: "Coincidencia cercana", color: "default", isRelated: false };
    return { label: "Coincidencia Nombre", color: "primary", isRelated: false };
  }

  if (field === "author" || field === "publisher") {
    return { label: "Autor / Editorial", color: "secondary", isRelated: false };
  }

  if (field === "category" || field === "tags" || field === "shelf_location") {
    return { label: "Categoria", color: "warning", isRelated: false };
  }

  return { label: "Coincidencia cercana", color: "default", isRelated: false };
};
