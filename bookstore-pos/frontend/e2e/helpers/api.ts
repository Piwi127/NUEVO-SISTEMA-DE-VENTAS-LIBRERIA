import { APIRequestContext, expect } from "@playwright/test";

const USERNAME = process.env.E2E_USERNAME || "e2e_admin";
const PASSWORD = process.env.E2E_PASSWORD || "E2EAdmin1234";
const API_URL = process.env.E2E_API_URL || "http://127.0.0.1:8010";

type Product = {
  id: number;
  sku: string;
  name: string;
  category: string;
  tags?: string;
  price: number;
  cost: number;
  stock: number;
  stock_min: number;
};

type SaleResponse = {
  id: number;
  invoice_number: string;
};

export const apiLogin = async (api: APIRequestContext): Promise<string> => {
  let lastStatus = 0;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const loginResp = await api.post(`${API_URL}/auth/login`, {
      data: { username: USERNAME, password: PASSWORD },
    });
    lastStatus = loginResp.status();
    if (loginResp.ok()) {
      const body = await loginResp.json();
      return body.csrf_token as string;
    }
    if (lastStatus === 429 && attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      continue;
    }
    break;
  }
  expect(lastStatus, "API login should succeed").toBe(200);
  return "";
};

type EnsureProductOptions = Partial<{
  name: string;
  category: string;
  tags: string;
  price: number;
  cost: number;
  stock: number;
  stock_min: number;
}>;

export const ensureProduct = async (
  api: APIRequestContext,
  csrf: string,
  sku: string,
  options: EnsureProductOptions = {}
): Promise<Product> => {
  const searchResp = await api.get(`${API_URL}/products?search=${encodeURIComponent(sku)}&limit=20`);
  expect(searchResp.ok()).toBeTruthy();
  const existing = (await searchResp.json()) as Product[];
  const found = existing.find((p) => p.sku === sku);
  if (found) {
    return found;
  }

  const createResp = await api.post(`${API_URL}/products`, {
    headers: { "X-CSRF-Token": csrf },
    data: {
      sku,
      name: options.name || `Producto E2E ${sku}`,
      category: options.category || "E2E",
      tags: options.tags || "e2e,test",
      price: options.price ?? 25,
      cost: options.cost ?? 10,
      stock: options.stock ?? 30,
      stock_min: options.stock_min ?? 2,
    },
  });
  expect(createResp.ok()).toBeTruthy();
  return (await createResp.json()) as Product;
};

export const createPackRule = async (
  api: APIRequestContext,
  csrf: string,
  data: {
    name: string;
    product_id: number;
    bundle_qty: number;
    bundle_price: number;
    is_active?: boolean;
  }
): Promise<void> => {
  const resp = await api.post(`${API_URL}/promotions/pack-rules`, {
    headers: { "X-CSRF-Token": csrf },
    data: {
      ...data,
      rule_type: "BUNDLE_PRICE",
      is_active: data.is_active ?? true,
    },
  });
  expect(resp.ok()).toBeTruthy();
};

export const ensureCashOpen = async (api: APIRequestContext, csrf: string): Promise<void> => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const openResp = await api.post(`${API_URL}/cash/open`, {
      headers: { "X-CSRF-Token": csrf },
      data: { opening_amount: 100 },
    });
    if ([201, 409].includes(openResp.status())) {
      return;
    }
    if (openResp.status() === 429 && attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      continue;
    }
    expect([201, 409], "cash/open should return opened or already-open").toContain(openResp.status());
  }
};

export const createSaleForProduct = async (
  api: APIRequestContext,
  csrf: string,
  product: Product
): Promise<SaleResponse> => {
  const qty = 1;
  const total = Number(product.price) * qty;
  const saleResp = await api.post(`${API_URL}/sales`, {
    headers: { "X-CSRF-Token": csrf },
    data: {
      customer_id: null,
      items: [{ product_id: product.id, qty }],
      payments: [{ method: "CASH", amount: total }],
      subtotal: total,
      tax: 0,
      discount: 0,
      total,
      promotion_id: null,
    },
  });
  expect(saleResp.ok()).toBeTruthy();
  return (await saleResp.json()) as SaleResponse;
};
