import { expect, Page } from "@playwright/test";

const USERNAME = process.env.E2E_USERNAME || "e2e_admin";
const PASSWORD = process.env.E2E_PASSWORD || "E2EAdmin1234";

export const loginFromUi = async (page: Page): Promise<void> => {
  await page.goto("/login");
  await page.getByLabel("Usuario").fill(USERNAME);
  await page.getByLabel("Contrasena").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/pos/);
};
