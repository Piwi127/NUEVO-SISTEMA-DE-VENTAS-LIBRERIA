import { expect, test } from "@playwright/test";
import { loginFromUi } from "./helpers/ui";

test("flujo de caja: apertura, movimiento y arqueo Z visible en historial", async ({ page }) => {
  await loginFromUi(page);
  await page.goto("/cash");
  await expect(page.getByText("Caja y arqueos")).toBeVisible();

  if (await page.getByRole("button", { name: "Abrir caja" }).isVisible()) {
    let opened = false;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const amountInput = page.getByLabel("Monto apertura");
        await amountInput.fill("100");
        await page.getByRole("button", { name: "Abrir caja" }).click();
        opened = true;
        break;
      } catch {
        await page.waitForTimeout(300);
      }
    }
    if (!opened) {
      throw new Error("No se pudo abrir caja: el formulario se recargo durante el llenado");
    }
  }
  await expect(page.getByText("Caja abierta desde:")).toBeVisible();

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
