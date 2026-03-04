import { expect, test } from "@playwright/test";
import { apiLogin, ensureProduct } from "./helpers/api";
import { loginFromUi } from "./helpers/ui";

test("POS-Display: requiere auth y sincroniza carrito en pantalla dual", async ({ page, context, request }) => {
  await page.goto("/display/e2e-unauth");
  await expect(page).toHaveURL(/\/login/);

  const csrf = await apiLogin(request);
  const sku = `E2E-DISP-${Date.now()}`;
  const product = await ensureProduct(request, csrf, sku);

  await loginFromUi(page);

  const wsPromise = page.waitForEvent("websocket", {
    predicate: (socket) => socket.url().includes("/ws/display/"),
  });
  await page.goto("/pos");
  const ws = await wsPromise;
  const wsUrl = ws.url();
  const marker = "/ws/display/";
  const markerIndex = wsUrl.indexOf(marker);
  expect(markerIndex).toBeGreaterThan(-1);
  const sessionId = wsUrl.slice(markerIndex + marker.length).split("?")[0];
  expect(sessionId.length).toBeGreaterThan(10);

  const displayPage = await context.newPage();
  await displayPage.goto(`/display/${sessionId}`);
  await expect(displayPage.getByText("Total:")).toBeVisible();

  const searchInput = page.getByLabel("Busqueda inteligente");
  await searchInput.fill(product.sku);
  await expect(page.getByText(product.name)).toBeVisible({ timeout: 15_000 });
  await searchInput.press("Enter");

  await expect(displayPage.getByText(product.name)).toBeVisible({ timeout: 15_000 });
  await displayPage.close();
});
