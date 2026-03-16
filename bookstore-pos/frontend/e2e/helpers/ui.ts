import { expect, Locator, Page } from "@playwright/test";

const USERNAME = process.env.E2E_USERNAME || "e2e_admin";
const PASSWORD = process.env.E2E_PASSWORD || "E2EAdmin1234";

export const loginFromUi = async (page: Page): Promise<void> => {
  await page.goto("/login");
  await page.getByLabel("Usuario").fill(USERNAME);
  await page.getByLabel("Contrasena").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/pos/);
};

export const getPosSearchInput = (page: Page) =>
  page.getByLabel(/Buscar producto|A.*adir Item/i);

export const selectMuiOption = async (target: Page | Locator, label: string | RegExp, option: string | RegExp): Promise<void> => {
  await target.getByLabel(label).click();
  const page = "waitForURL" in target ? target : target.page();
  await page.getByRole("option", { name: option }).click();
};
