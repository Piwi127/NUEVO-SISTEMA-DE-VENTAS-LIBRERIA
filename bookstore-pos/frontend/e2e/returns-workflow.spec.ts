import { expect, test } from "@playwright/test";
import { apiLogin, createSaleForProduct, ensureCashOpen, ensureProduct } from "./helpers/api";
import { loginFromUi } from "./helpers/ui";

test("devoluciones: valida venta, procesa devolucion y aparece en historial", async ({ page, request }) => {
  const csrf = await apiLogin(request);
  await ensureCashOpen(request, csrf);
  const sku = `E2E-RET-${Date.now()}`;
  const product = await ensureProduct(request, csrf, sku);
  const sale = await createSaleForProduct(request, csrf, product);

  await loginFromUi(page);
  await page.goto("/returns");

  await page.getByLabel("ID Venta").fill(String(sale.id));
  await page.getByRole("button", { name: "Validar venta" }).click();
  await expect(page.getByText(`Comprobante: ${sale.invoice_number}`)).toBeVisible();

  await page.getByLabel("Motivo").fill("Devolucion E2E");
  await page.getByRole("button", { name: "Procesar" }).click();
  await page.getByRole("button", { name: "Refrescar" }).click();

  await expect(page.getByRole("cell", { name: String(sale.id), exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: sale.invoice_number })).toBeVisible();
  await expect(page.getByText("Validado").first()).toBeVisible();
});
