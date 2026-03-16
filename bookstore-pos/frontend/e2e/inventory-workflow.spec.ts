import { expect, test } from "@playwright/test";
import { apiLogin, ensureDefaultWarehouse, ensureProduct } from "./helpers/api";
import { loginFromUi, selectMuiOption } from "./helpers/ui";

test("inventario: registra un ajuste manual y lo muestra en kardex", async ({ page, request }) => {
  test.setTimeout(120_000);

  const csrf = await apiLogin(request);
  await ensureDefaultWarehouse(request, csrf);
  const sku = `E2E-INV-${Date.now()}`;
  const product = await ensureProduct(request, csrf, sku, {
    name: `Producto Inventario ${Date.now()}`,
    stock: 12,
    stock_min: 2,
  });
  const ref = `E2E-ADJ-${Date.now()}`;

  await loginFromUi(page);
  await page.goto("/inventory");
  await expect(page.getByRole("heading", { name: /Inventario|Gesti.*Inventario/i })).toBeVisible();

  await page.getByRole("tab", { name: /Operaciones de Bodega|Operaciones Manuales|Ajustes/i }).click();
  const adjustmentForm = page.locator("form").filter({ hasText: /Guardar ajuste/i }).first();
  await selectMuiOption(adjustmentForm, /^Producto$/i, product.name);
  await adjustmentForm.getByLabel(/Diferencial de Ajuste|Cantidad del ajuste/i).fill("4");
  await adjustmentForm.getByLabel(/Motivo|Referencia/i).fill(ref);

  const movementResponsePromise = page.waitForResponse((response) => {
    return response.url().includes("/inventory/movement") && response.request().method() === "POST" && response.ok();
  });
  await adjustmentForm.getByRole("button", { name: /Efectuar Ajuste|Guardar ajuste/i }).click();
  await movementResponsePromise;

  await expect(page.getByText(/Movimiento registrado exitosamente|Movimiento registrado/i)).toBeVisible();

  await page.getByRole("tab", { name: /Movimientos Kardex|Kardex/i }).click();
  await selectMuiOption(page, /Inspeccionar Producto Específico|Producto/i, product.name);
  await expect(page.getByText(ref)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/\+4/).first()).toBeVisible();
});
