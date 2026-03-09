from __future__ import annotations

from datetime import datetime, timezone
import json
import re
from html import escape

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.customer import Customer
from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.models.settings import SystemSettings
from app.models.user import User


_PLACEHOLDER_RE = re.compile(r"\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}")


class DocumentRenderService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def build_sale_context(self, sale_id: int) -> dict:
        sale_res = await self.db.execute(select(Sale).where(Sale.id == sale_id))
        sale = sale_res.scalar_one_or_none()
        if not sale:
            raise HTTPException(status_code=404, detail="Venta no encontrada")

        customer = None
        if sale.customer_id:
            customer_res = await self.db.execute(select(Customer).where(Customer.id == sale.customer_id))
            customer = customer_res.scalar_one_or_none()

        user_res = await self.db.execute(select(User).where(User.id == sale.user_id))
        user = user_res.scalar_one_or_none()

        settings_res = await self.db.execute(select(SystemSettings).limit(1))
        settings = settings_res.scalar_one_or_none()

        items_res = await self.db.execute(
            select(SaleItem, Product.name)
            .join(Product, Product.id == SaleItem.product_id)
            .where(SaleItem.sale_id == sale_id)
        )
        items = []
        for row in items_res.all():
            line_total = row.SaleItem.final_total if row.SaleItem.final_total is not None else row.SaleItem.line_total
            items.append(
                {
                    "product_id": row.SaleItem.product_id,
                    "name": row.name or f"Producto {row.SaleItem.product_id}",
                    "qty": row.SaleItem.qty,
                    "unit_price": float(row.SaleItem.unit_price),
                    "line_total": float(line_total),
                    "discount": float(row.SaleItem.discount or 0),
                }
            )

        return {
            "sale_id": sale.id,
            "document_type": sale.document_type or "TICKET",
            "document_number": sale.invoice_number or "",
            "issue_date": sale.created_at.isoformat() if sale.created_at else datetime.now(timezone.utc).isoformat(),
            "subtotal": float(sale.subtotal),
            "tax": float(sale.tax),
            "discount": float(sale.discount),
            "total": float(sale.total),
            "company_name": settings.project_name if settings else "",
            "company_address": settings.store_address if settings else "",
            "company_phone": settings.store_phone if settings else "",
            "company_tax_id": settings.store_tax_id if settings else "",
            "company_logo": settings.logo_url if settings else "",
            "receipt_header": settings.receipt_header if settings else "",
            "receipt_footer": settings.receipt_footer if settings else "Gracias por su compra",
            "customer_name": customer.name if customer else "",
            "customer_tax_id": customer.tax_id if customer else "",
            "customer_address": customer.address if customer else "",
            "customer_email": customer.email if customer else "",
            "seller_name": user.username if user else "",
            "items": items,
        }

    def render(self, schema_json: str, context: dict) -> tuple[str, str, list[str]]:
        try:
            schema = json.loads(schema_json or "{}")
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=422, detail=f"Schema JSON invalido: {exc.msg}")

        elements = schema.get("elements") or []
        warnings: list[str] = []
        html_parts: list[str] = []
        text_lines: list[str] = []

        paper = schema.get("paper") or {}
        width_mm = float(paper.get("width_mm") or 80)
        margins = paper.get("margins_mm") or {"top": 2, "right": 2, "bottom": 2, "left": 2}
        html_parts.append(
            (
                "<div class='receipt-root' style='font-family:Arial,sans-serif;"
                f"width:{width_mm}mm;padding:{margins.get('top', 2)}mm {margins.get('right', 2)}mm "
                f"{margins.get('bottom', 2)}mm {margins.get('left', 2)}mm;'>"
            )
        )

        for element in elements:
            if not element.get("visible", True):
                continue
            element_type = (element.get("type") or "").strip().lower()
            if element_type == "text":
                rendered = self._resolve_placeholders(str(element.get("content", "")), context)
                html_parts.append(f"<div>{escape(rendered).replace(chr(10), '<br/>')}</div>")
                text_lines.extend(rendered.splitlines() or [""])
                continue

            if element_type == "line":
                html_parts.append("<hr/>")
                text_lines.append("-" * 32)
                continue

            if element_type == "items_table":
                items = context.get("items") or []
                config = element.get("config") or {}
                show_header = bool(config.get("show_header", True))
                html_parts.append("<table style='width:100%;border-collapse:collapse;font-size:12px;'>")
                if show_header:
                    html_parts.append(
                        "<thead><tr>"
                        "<th style='text-align:left;border-bottom:1px solid #ccc;'>Producto</th>"
                        "<th style='text-align:right;border-bottom:1px solid #ccc;'>Cant</th>"
                        "<th style='text-align:right;border-bottom:1px solid #ccc;'>P.Unit</th>"
                        "<th style='text-align:right;border-bottom:1px solid #ccc;'>Total</th>"
                        "</tr></thead>"
                    )
                html_parts.append("<tbody>")
                text_lines.append("Items:")
                for item in items:
                    html_parts.append(
                        "<tr>"
                        f"<td>{escape(str(item.get('name', '')))}</td>"
                        f"<td style='text-align:right'>{int(item.get('qty', 0))}</td>"
                        f"<td style='text-align:right'>{float(item.get('unit_price', 0)):.2f}</td>"
                        f"<td style='text-align:right'>{float(item.get('line_total', 0)):.2f}</td>"
                        "</tr>"
                    )
                    text_lines.append(
                        f"{item.get('name', '')} | {int(item.get('qty', 0))} x {float(item.get('unit_price', 0)):.2f}"
                        f" = {float(item.get('line_total', 0)):.2f}"
                    )
                html_parts.append("</tbody></table>")
                continue

            if element_type == "totals_block":
                subtotal = float(context.get("subtotal", 0))
                tax = float(context.get("tax", 0))
                discount = float(context.get("discount", 0))
                total = float(context.get("total", 0))
                html_parts.append(
                    "<div style='margin-top:6px;text-align:right'>"
                    f"<div>Subtotal: {subtotal:.2f}</div>"
                    f"<div>Impuesto: {tax:.2f}</div>"
                    f"<div>Descuento: {discount:.2f}</div>"
                    f"<div style='font-weight:700'>Total: {total:.2f}</div>"
                    "</div>"
                )
                text_lines.extend(
                    [
                        f"Subtotal: {subtotal:.2f}",
                        f"Impuesto: {tax:.2f}",
                        f"Descuento: {discount:.2f}",
                        f"Total: {total:.2f}",
                    ]
                )
                continue

            if element_type in {"qr", "barcode"}:
                rendered = self._resolve_placeholders(str(element.get("content", "")), context)
                label = "QR" if element_type == "qr" else "BAR"
                html_parts.append(f"<div style='margin-top:4px'>{label}: {escape(rendered)}</div>")
                text_lines.append(f"{label}: {rendered}")
                continue

            if element_type == "image":
                src = self._resolve_placeholders(str(element.get("content", "")), context)
                if src:
                    html_parts.append(f"<img src='{escape(src)}' alt='image' style='max-width:100%;'/>")
                else:
                    warnings.append(f"Elemento image ({element.get('id')}) sin contenido")
                continue

            if element_type == "conditional_block":
                expr = str(element.get("content", "")).strip()
                key = expr.replace("{{", "").replace("}}", "").strip()
                value = str(context.get(key, "")).strip()
                if value:
                    html_parts.append(f"<div>{escape(value)}</div>")
                    text_lines.append(value)
                continue

            warnings.append(f"Tipo de elemento no soportado: {element_type or 'vacio'}")

        html_parts.append("</div>")
        return "\n".join(html_parts), "\n".join(text_lines), warnings

    def render_pdf_from_text(self, title: str, text: str) -> bytes:
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.pdfgen import canvas
        except Exception as exc:  # pragma: no cover
            raise HTTPException(
                status_code=500,
                detail=f"No se pudo generar PDF. Instala reportlab en backend. Error: {exc}",
            )

        import io

        buffer = io.BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=A4)
        pdf.setTitle(title[:100] or "document")
        y = 820
        for line in (text or "").splitlines():
            pdf.drawString(40, y, (line or "")[:120])
            y -= 14
            if y < 40:
                pdf.showPage()
                y = 820
        pdf.save()
        buffer.seek(0)
        return buffer.getvalue()

    def _resolve_placeholders(self, value: str, context: dict) -> str:
        def replacer(match: re.Match[str]) -> str:
            key = match.group(1)
            resolved = self._resolve_key(context, key)
            if resolved is None:
                return ""
            return str(resolved)

        return _PLACEHOLDER_RE.sub(replacer, value)

    def _resolve_key(self, context: dict, key: str):
        if "." not in key:
            return context.get(key)
        current = context
        for part in key.split("."):
            if isinstance(current, dict):
                current = current.get(part)
            else:
                return None
        return current
