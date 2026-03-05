import { expect, test } from "@playwright/test";
import { loginFromUi } from "./helpers/ui";

test("flujo de caja: apertura, movimiento y arqueo Z visible en historial", async ({ page }) => {
  test.setTimeout(90_000);
  await loginFromUi(page);
  await page.goto("/cash");
  await expect(page.getByText("Caja y arqueos")).toBeVisible();

  const cashOpenText = page.getByText("Caja abierta desde:");
  const openButton = page.getByRole("button", { name: "Abrir caja" });
  const openingInput = page.getByLabel("Monto apertura");

  let alreadyOpen = true;
  try {
    await expect(cashOpenText).toBeVisible({ timeout: 4_000 });
  } catch {
    alreadyOpen = false;
  }

  if (!alreadyOpen) {
    await expect(openButton).toBeVisible({ timeout: 15_000 });
    let opened = false;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await expect(openingInput).toBeVisible({ timeout: 10_000 });
      await openingInput.fill("100");
      await openButton.click();

      try {
        await expect(cashOpenText).toBeVisible({ timeout: 5_000 });
        opened = true;
        break;
      } catch {
        await page.waitForTimeout(500);
      }
    }
    if (!opened) throw new Error("No se pudo abrir caja tras 3 intentos");
  }
  await expect(cashOpenText).toBeVisible({ timeout: 15_000 });

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
