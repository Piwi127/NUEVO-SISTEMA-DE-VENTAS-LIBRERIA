import { expect, test } from "@playwright/test";
import { apiLogin, createSaleForProduct, ensureCashOpen, ensureProduct } from "./helpers/api";
import { loginFromUi } from "./helpers/ui";

test("reportes: diario y top productos reflejan ventas", async ({ page, request }) => {
  const csrf = await apiLogin(request);
  await ensureCashOpen(request, csrf);
  const sku = `E2E-REP-${Date.now()}`;
  const product = await ensureProduct(request, csrf, sku);
  await createSaleForProduct(request, csrf, product);

  await loginFromUi(page);
  await page.goto("/reports");

  await expect(page.getByText("Reportes ejecutivos")).toBeVisible();

  await page.getByRole("button", { name: "Consultar" }).first().click();
  await expect(page.getByRole("heading", { name: "Reporte diario" })).toBeVisible();
  await expect(page.getByText("Ventas", { exact: true })).toBeVisible();

  await page.getByRole("tab", { name: "Top productos" }).click();
  await page.getByRole("button", { name: "Consultar" }).click();
  await expect(page.getByRole("heading", { name: "Top productos" })).toBeVisible();
  await expect(page.getByText(sku)).toBeVisible();
});
