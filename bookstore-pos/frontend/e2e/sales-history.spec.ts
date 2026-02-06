import { expect, test } from "@playwright/test";
import { apiLogin, createSaleForProduct, ensureCashOpen, ensureProduct } from "./helpers/api";
import { loginFromUi } from "./helpers/ui";

test("historial de ventas muestra venta registrada y comprobante", async ({ page, request }) => {
  const csrf = await apiLogin(request);
  await ensureCashOpen(request, csrf);
  const sku = `E2E-SH-${Date.now()}`;
  const product = await ensureProduct(request, csrf, sku);
  const sale = await createSaleForProduct(request, csrf, product);

  await loginFromUi(page);
  await page.goto("/sales-history");
  await page.getByRole("button", { name: "Consultar" }).click();

  await expect(page.getByText(sale.invoice_number)).toBeVisible();
});
