import { expect, Locator, Page } from "@playwright/test";

const TEST_USERNAMES = process.env.E2E_USERNAME
  ? [process.env.E2E_USERNAME]
  : (process.env.E2E_USERNAMES || "prueba,test")
      .split(",")
      .map((username) => username.trim())
      .filter(Boolean);
const PASSWORD = process.env.E2E_PASSWORD || "Prueba1234";

export const loginFromUi = async (page: Page): Promise<void> => {
  let lastError: unknown = null;
  for (const username of TEST_USERNAMES) {
    await page.goto("/login");
    await page.getByLabel("Usuario").fill(username);
    await page.getByLabel("Contrasena").fill(PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    try {
      await expect(page).toHaveURL(/\/pos/, { timeout: 5_000 });
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("No se pudo iniciar sesion con los usuarios de prueba.");
};

export const getPosSearchInput = (page: Page) =>
  page.getByLabel(/Buscar producto|A.*adir Item/i);

export const selectMuiOption = async (target: Page | Locator, label: string | RegExp, option: string | RegExp): Promise<void> => {
  await target.getByLabel(label).click();
  const page = "waitForURL" in target ? target : target.page();
  await page.getByRole("option", { name: option }).click();
};
