import { formatDateTimeRegional } from "../../../utils/datetime";

type ReceiptItem = {
  product_id: number;
  name: string;
  qty: number;
  unit_price: number;
  line_total: number;
};

type ReceiptData = {
  sale_id: number;
  invoice_number: string;
  created_at: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  items: ReceiptItem[];
  store?: {
    name?: string;
    address?: string;
    phone?: string;
    tax_id?: string;
  };
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const openReceiptWindow = (receipt: ReceiptData): boolean => {
  const popup = window.open("", "_blank", "width=520,height=760");
  if (!popup) return false;

  const storeName = escapeHtml(receipt.store?.name || "Bookstore POS");
  const address = escapeHtml(receipt.store?.address || "");
  const phone = escapeHtml(receipt.store?.phone || "");
  const taxId = escapeHtml(receipt.store?.tax_id || "");

  const itemsHtml = receipt.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.name || String(item.product_id))}</td>
          <td style="text-align:right">${item.qty}</td>
          <td style="text-align:right">${item.unit_price.toFixed(2)}</td>
          <td style="text-align:right">${item.line_total.toFixed(2)}</td>
        </tr>`
    )
    .join("");

  const html = `
    <html>
      <head>
        <title>Comprobante ${escapeHtml(receipt.invoice_number || String(receipt.sale_id))}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 16px; color: #111; }
          h2, h3 { margin: 0 0 8px; }
          .muted { color: #555; margin: 2px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border-bottom: 1px solid #ddd; padding: 6px; font-size: 13px; }
          .totals { margin-top: 12px; font-size: 14px; }
          .totals div { margin: 4px 0; text-align: right; }
          .strong { font-weight: 700; font-size: 16px; }
          .actions { margin-top: 14px; }
          @media print { .actions { display: none; } }
        </style>
      </head>
      <body>
        <h2>${storeName}</h2>
        ${address ? `<div class="muted">${address}</div>` : ""}
        ${phone ? `<div class="muted">Tel: ${phone}</div>` : ""}
        ${taxId ? `<div class="muted">RUC/NIT: ${taxId}</div>` : ""}
        <hr />
        <h3>Comprobante ${escapeHtml(receipt.invoice_number || "-")}</h3>
        <div class="muted">Venta ID: ${receipt.sale_id}</div>
        <div class="muted">Fecha: ${escapeHtml(formatDateTimeRegional(receipt.created_at))}</div>
        <table>
          <thead>
            <tr>
              <th style="text-align:left">Producto</th>
              <th style="text-align:right">Cant.</th>
              <th style="text-align:right">P. Unit</th>
              <th style="text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div class="totals">
          <div>Subtotal: ${receipt.subtotal.toFixed(2)}</div>
          <div>Impuesto: ${receipt.tax.toFixed(2)}</div>
          <div>Descuento: ${receipt.discount.toFixed(2)}</div>
          <div class="strong">Total: ${receipt.total.toFixed(2)}</div>
        </div>
        <div class="actions">
          <button onclick="window.print()">Imprimir</button>
        </div>
      </body>
    </html>
  `;

  popup.document.write(html);
  popup.document.close();
  popup.focus();
  return true;
};
