import { expect, test } from "@playwright/test";
import { loginFromUi } from "./helpers/ui";

test("admin puede abrir la pestana de permisos por rol", async ({ page }) => {
  await loginFromUi(page);
  await page.goto("/admin/permissions");
  await expect(page.getByText("Permisos por rol")).toBeVisible();
  await expect(page.getByRole("button", { name: "Guardar permisos" })).toBeVisible();
});
