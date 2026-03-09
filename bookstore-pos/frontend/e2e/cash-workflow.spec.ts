import { expect, test } from "@playwright/test";
import { loginFromUi } from "./helpers/ui";

test("flujo de caja: apertura, movimiento y arqueo Z visible en historial", async ({ page }) => {
  test.setTimeout(90_000);
  await loginFromUi(page);
  await page.goto("/cash");
  await expect(page.getByRole("heading", { name: /Gesti.*Caja/i })).toBeVisible();

  const openButton = page.getByRole("button", { name: /Autorizar Apertura/i });
  if (await openButton.isVisible().catch(() => false)) {
    await page.getByLabel(/Declaraci.*base/i).fill("100");
    await openButton.click();
  }
  await expect(page.getByRole("button", { name: /Inicia Cierre de Jornada \(Z\)/i })).toBeVisible({ timeout: 15_000 });

  await page.getByLabel(/Volumen a trasladar/i).fill("15");
  await page.getByLabel(/Causa u Origen del movimiento/i).fill("Movimiento E2E");
  await page.getByRole("button", { name: /Grabar en la Sesi/i }).click();

  const auditTypeSelect = page.getByLabel(/Modelo de Auditor/i);
  await auditTypeSelect.click();
  await page.getByRole("option", { name: /Arqueo Finalizador \(Z\)/i }).click();
  await page.getByLabel(/Conteo Total de Billetaje Local/i).fill("115");
  await page.getByRole("button", { name: /Fijar y Emitir Documento Z/i }).click();

  await page.getByRole("tab", { name: /Historial y Arqueos/i }).click();
  await expect(page.getByText(/Memoria de Arqueos e Informes/i)).toBeVisible();
  await expect(page.getByText(/Sesion de Caja #/i).first()).toBeVisible();
});
