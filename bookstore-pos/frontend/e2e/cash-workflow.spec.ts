import { expect, test } from "@playwright/test";
import { loginFromUi } from "./helpers/ui";

test("flujo de caja: apertura, movimiento y arqueo Z visible en historial", async ({ page }) => {
  await loginFromUi(page);
  await page.goto("/cash");
  await expect(page.getByText("Caja y arqueos")).toBeVisible();

  const openButton = page.getByRole("button", { name: "Abrir caja" });
  if (await openButton.isVisible()) {
    await page.getByLabel("Monto apertura").fill("100");
    await openButton.click();
    await expect(page.getByText("Caja abierta desde:")).toBeVisible();
  }

  await page.getByLabel("Monto", { exact: true }).fill("15");
  await page.getByLabel("Motivo").fill("Movimiento E2E");
  await page.getByRole("button", { name: "Registrar", exact: true }).click();

  const auditTypeSelect = page.getByLabel("Tipo").last();
  await auditTypeSelect.click();
  await page.getByRole("option", { name: "Z (cierre)" }).click();
  await page.getByLabel("Monto contado").fill("115");
  await page.getByRole("button", { name: "Registrar arqueo" }).click();

  await page.getByRole("tab", { name: "Historial" }).click();
  await expect(page.getByText("Historial de arqueos")).toBeVisible();
  await expect(page.getByText("Sesion #").first()).toBeVisible();
});
