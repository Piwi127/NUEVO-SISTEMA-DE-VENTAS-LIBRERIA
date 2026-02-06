import { APIRequestContext, expect } from "@playwright/test";

const USERNAME = process.env.E2E_USERNAME || "e2e_admin";
const PASSWORD = process.env.E2E_PASSWORD || "E2EAdmin1234";
const API_URL = process.env.E2E_API_URL || "http://127.0.0.1:8010";

type Product = {
  id: number;
  sku: string;
  name: string;
  category: string;
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
  const loginResp = await api.post(`${API_URL}/auth/login`, {
    data: { username: USERNAME, password: PASSWORD },
  });
  expect(loginResp.ok()).toBeTruthy();
  const body = await loginResp.json();
  return body.csrf_token as string;
};

export const ensureProduct = async (api: APIRequestContext, csrf: string, sku: string): Promise<Product> => {
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
      name: `Producto E2E ${sku}`,
      category: "E2E",
      tags: "e2e,test",
      price: 25,
      cost: 10,
      stock: 30,
      stock_min: 2,
    },
  });
  expect(createResp.ok()).toBeTruthy();
  return (await createResp.json()) as Product;
};

export const ensureCashOpen = async (api: APIRequestContext, csrf: string): Promise<void> => {
  const openResp = await api.post(`${API_URL}/cash/open`, {
    headers: { "X-CSRF-Token": csrf },
    data: { opening_amount: 100 },
  });
  expect([201, 409]).toContain(openResp.status());
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
