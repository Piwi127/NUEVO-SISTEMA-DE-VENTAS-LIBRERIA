import { expect, test } from "@playwright/test";
import { apiLogin, ensureDefaultWarehouse, ensureProduct, ensureSupplier } from "./helpers/api";
import { loginFromUi, selectMuiOption } from "./helpers/ui";

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

type PurchaseOrderResponse = {
  id: number;
};

type ReceivePurchaseResponse = {
  purchase_id: number;
};

test("compras: crea OC, registra recepcion, pago y aparece en historial", async ({ page, request }) => {
  test.setTimeout(120_000);

  const csrf = await apiLogin(request);
  await ensureDefaultWarehouse(request, csrf);

  const supplier = await ensureSupplier(request, csrf, `Proveedor E2E ${Date.now()}`);
  const product = await ensureProduct(request, csrf, `E2E-BUY-${Date.now()}`, {
    name: `Producto Compra ${Date.now()}`,
    stock: 0,
    stock_min: 1,
    price: 18,
    cost: 6,
  });

  await loginFromUi(page);
  await page.goto("/purchases");
  await expect(page.getByRole("heading", { name: /Compras/i })).toBeVisible();

  const orderForm = page.locator("form").filter({ hasText: /Agregar item/i }).first();
  await selectMuiOption(orderForm, /Proveedor/i, supplier.name);
  await selectMuiOption(orderForm, /Producto/i, product.name);
  await orderForm.getByLabel(/^Cantidad$/).fill("2");
  await orderForm.getByLabel(/^Costo$/).fill("6");
  await orderForm.getByRole("button", { name: /Agregar item/i }).click();
  await expect(page.getByRole("row", { name: new RegExp(escapeRegex(product.name)) })).toBeVisible();

  const createOrderPromise = page.waitForResponse((response) => {
    return response.url().includes("/purchasing/orders") && response.request().method() === "POST" && response.status() === 201;
  });
  await orderForm.getByRole("button", { name: /Crear OC/i }).click();
  const createdOrder = (await (await createOrderPromise).json()) as PurchaseOrderResponse;

  await expect(page.getByText(/OC creada/i)).toBeVisible();

  await page.getByRole("tab", { name: /Recepcion|Recepción/i }).click();
  const receiveForm = page.locator("form").filter({ hasText: /Registrar recepci/i }).first();
  await selectMuiOption(receiveForm, /Orden de compra/i, new RegExp(`OC #${createdOrder.id} - OPEN`));
  await expect(page.getByText(/Pendiente por recibir/i)).toBeVisible();
  await selectMuiOption(receiveForm, /^Producto$/i, new RegExp(escapeRegex(product.name)));
  await receiveForm.getByLabel(/^Cantidad$/).fill("2");
  await receiveForm.getByLabel(/Transporte/i).fill("1");
  await receiveForm.getByLabel(/Empaque/i).fill("0.5");
  await receiveForm.getByLabel(/Otros/i).fill("0");
  await receiveForm.getByLabel(/Delivery/i).fill("0");
  await receiveForm.getByLabel(/Prefijo lote/i).fill("E2E");

  const receivePromise = page.waitForResponse((response) => {
    return response.url().includes(`/purchasing/orders/${createdOrder.id}/receive`) && response.request().method() === "POST" && response.ok();
  });
  await receiveForm.getByRole("button", { name: /Registrar recepcion|Registrar recepción/i }).click();
  const receivedPurchase = (await (await receivePromise).json()) as ReceivePurchaseResponse;

  await expect(page.getByText(/Recepcion registrada|Recepción registrada/i)).toBeVisible();

  await page.getByRole("tab", { name: /Pagos/i }).click();
  const paymentForm = page.locator("form").filter({ hasText: /Registrar pago/i }).first();
  await selectMuiOption(paymentForm, /Proveedor/i, supplier.name);
  await paymentForm.getByLabel(/Monto/i).fill("13.5");
  await paymentForm.getByLabel(/Metodo|Método/i).fill("TRANSFER");
  await paymentForm.getByLabel(/Referencia/i).fill(`E2E-PAY-${createdOrder.id}`);

  const paymentPromise = page.waitForResponse((response) => {
    return response.url().includes("/purchasing/payments") && response.request().method() === "POST" && response.ok();
  });
  await paymentForm.getByRole("button", { name: /Registrar pago/i }).click();
  await paymentPromise;

  await expect(page.getByText(/Pago registrado/i)).toBeVisible();

  await page.getByRole("tab", { name: /Historial/i }).click();
  await expect(
    page.getByRole("row", {
      name: new RegExp(`${receivedPurchase.purchase_id}.*${escapeRegex(supplier.name)}.*13\\.50`),
    })
  ).toBeVisible({ timeout: 15_000 });
});
