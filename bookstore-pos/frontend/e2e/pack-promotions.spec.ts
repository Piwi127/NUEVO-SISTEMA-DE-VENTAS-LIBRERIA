import { expect, test } from "@playwright/test";
import { apiLogin, createPackRule, ensureCashOpen, ensureProduct } from "./helpers/api";
import { loginFromUi } from "./helpers/ui";

type ReceiptItem = {
  product_id: number;
  qty: number;
  line_total: number;
  base_line_total?: number;
  discount?: number;
  final_total?: number;
};

type ReceiptPayload = {
  subtotal: number;
  tax: number;
  total: number;
  pack_discount?: number;
  promotion_discount?: number;
  items: ReceiptItem[];
};

type CreatedSalePayload = {
  id: number;
};

test("promo pack 3x2.50: aplica en POS y persiste en venta", async ({ page, request }) => {
  test.setTimeout(120_000);

  const csrf = await apiLogin(request);
  const sku = `E2E-PACK-${Date.now()}`;
  const product = await ensureProduct(request, csrf, sku, {
    name: `Producto Pack ${Date.now()}`,
    price: 1,
    cost: 0.5,
    stock: 30,
    stock_min: 1,
  });
  await createPackRule(request, csrf, {
    name: "Pack 3x2.50 E2E",
    product_id: product.id,
    bundle_qty: 3,
    bundle_price: 2.5,
    is_active: true,
  });
  await ensureCashOpen(request, csrf);

  await loginFromUi(page);
  await page.goto("/pos");

  const searchInput = page.getByLabel(/A.*adir Item/i);
  await searchInput.fill(product.sku);
  const resultItem = page.locator("li").filter({ hasText: product.name }).first();
  await expect(resultItem).toBeVisible({ timeout: 15_000 });
  await resultItem.getByRole("button").click();
  await searchInput.press("Enter");
  await searchInput.press("Enter");

  const checkoutPanel = page.locator(".MuiPaper-root").filter({ hasText: /BOLETA EN CURSO/i }).first();
  await expect(checkoutPanel.getByText(/Pack 3x2\.50 E2E/i).first()).toBeVisible({ timeout: 15_000 });
  await expect(checkoutPanel.getByText(/2[.,]50/).first()).toBeVisible();

  await page.getByRole("button", { name: /Cobrar \/ Facturar/i }).first().click();
  await page.getByRole("button", { name: /Autocompletar Efectivo/i }).click();
  const saleResponsePromise = page.waitForResponse((response) => {
    return response.url().includes("/sales") && response.request().method() === "POST" && response.status() === 201;
  });
  await page.getByRole("button", { name: /Procesar Pago|Confirmar y Emitir/i }).click();

  const saleResponse = await saleResponsePromise;
  const createdSale = (await saleResponse.json()) as CreatedSalePayload;
  const saleId = Number(createdSale.id);
  expect(Number.isFinite(saleId) && saleId > 0).toBeTruthy();

  const apiUrl = process.env.E2E_API_URL || "http://127.0.0.1:8010";
  const receiptResp = await request.get(`${apiUrl}/sales/${saleId}/receipt`);
  expect(receiptResp.ok()).toBeTruthy();
  const receipt = (await receiptResp.json()) as ReceiptPayload;

  expect(receipt.pack_discount || 0).toBeCloseTo(0.5, 2);
  expect(receipt.promotion_discount || 0).toBeCloseTo(0, 2);

  const receiptItem = receipt.items.find((it) => it.product_id === product.id);
  expect(receiptItem).toBeTruthy();
  expect(receiptItem!.qty).toBe(3);
  expect(receiptItem!.base_line_total ?? receiptItem!.line_total).toBeCloseTo(3, 2);
  expect(receiptItem!.discount || 0).toBeCloseTo(0.5, 2);
  expect(receiptItem!.final_total ?? receiptItem!.line_total).toBeCloseTo(2.5, 2);

  const expectedTotal = Number(receipt.subtotal || 0) + Number(receipt.tax || 0) - Number(receipt.promotion_discount || 0);
  expect(receipt.total).toBeCloseTo(expectedTotal, 2);
});
